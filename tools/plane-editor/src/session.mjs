/**
 * One headless editing session = 1 Y.Doc + 1 Tiptap editor + the annotation plane.
 *
 * Everything is deterministic on purpose: client IDs are assigned by the
 * caller (Yjs would otherwise randomise them, and a RelativePosition encodes
 * the client ID), and no wall-clock value ever enters the state.
 */
import './dom.mjs'
import { readFileSync } from 'node:fs'
import * as Y from 'yjs'
import { Editor, Extension } from '@tiptap/core'
import { ySyncPlugin, ySyncPluginKey, prosemirrorJSONToYXmlFragment } from 'y-prosemirror'
import { createHost } from './dom.mjs'
import { buildSchema, contentExtensions } from './schema.mjs'
import { AnnotationPlane, attachAnnotation, annotationRecord } from './annotation-plane.mjs'
import { buildTextIndex, posToOffset, offsetToPos } from './text-index.mjs'
import { captureAnchors } from './anchors.mjs'

export const FRAGMENT_NAME = 'prosemirror'

export const FIXTURE_DOC = JSON.parse(
  readFileSync(new URL('../fixtures/document.json', import.meta.url), 'utf8'),
)
export const FIXTURE_ANCHORS = JSON.parse(
  readFileSync(new URL('../fixtures/anchors.json', import.meta.url), 'utf8'),
)

const schema = buildSchema()

function yjsBridge(fragment) {
  return Extension.create({
    name: 'yjsBridge',
    addProseMirrorPlugins() {
      return [ySyncPlugin(fragment)]
    },
  })
}

export function openSession({ update = null, clientID, docJSON = FIXTURE_DOC }) {
  if (!Number.isInteger(clientID)) throw new Error('openSession needs an explicit integer clientID')

  const ydoc = new Y.Doc()
  ydoc.clientID = clientID
  const fragment = ydoc.getXmlFragment(FRAGMENT_NAME)
  if (update) {
    Y.applyUpdate(ydoc, update)
  } else {
    prosemirrorJSONToYXmlFragment(schema, docJSON, fragment)
  }

  const editor = new Editor({
    element: createHost(),
    injectCSS: false,
    extensions: [...contentExtensions(), AnnotationPlane, yjsBridge(fragment)],
  })

  const session = {
    ydoc,
    fragment,
    editor,
    schema,
    clientID,
    mapping() {
      const state = ySyncPluginKey.getState(editor.state)
      if (!state || !state.binding) throw new Error('y-prosemirror binding is not ready')
      return state.binding.mapping
    },
    get doc() {
      return editor.state.doc
    },
    text() {
      return buildTextIndex(editor.state.doc).text
    },
    encodeState() {
      return Y.encodeStateAsUpdate(ydoc)
    },
    dispatch(build) {
      const tr = build(editor.state.tr, editor.state)
      editor.view.dispatch(tr)
      return session
    },
    close() {
      editor.destroy()
      ydoc.destroy()
    },
  }
  return session
}

/** Find the PM range of a fixture anchor plus the bounds of its textblock. */
export function locate(session, { quote, occurrence = 0 }) {
  const doc = session.doc
  const index = buildTextIndex(doc)
  let at = -1
  for (let i = 0; i <= occurrence; i += 1) {
    at = index.text.indexOf(quote, at + 1)
    if (at === -1) throw new Error(`fixture quote not found (occurrence ${occurrence}): ${quote}`)
  }
  const from = offsetToPos(index, at)
  const to = offsetToPos(index, at + quote.length)
  if (from === null || to === null) throw new Error(`fixture quote spans a block gap: ${quote}`)

  const $from = doc.resolve(from)
  const depth = $from.depth
  return {
    from,
    to,
    exact: quote,
    textFrom: at,
    textTo: at + quote.length,
    blockIndex: $from.index(0),
    blockInnerFrom: $from.start(depth),
    blockInnerTo: $from.end(depth),
    blockOuterFrom: $from.before(depth),
    blockOuterTo: $from.after(depth),
  }
}

/** Inner start of the closest non-empty textblock before `blockIndex`, or null. */
export function previousTextblockStart(session, blockIndex) {
  const doc = session.doc
  let pos = 0
  const starts = []
  doc.forEach((node, offset) => {
    starts.push({ node, offset })
  })
  for (let i = blockIndex - 1; i >= 0; i -= 1) {
    const entry = starts[i]
    if (entry.node.isTextblock && entry.node.content.size > 0) {
      pos = entry.offset + 1
      return pos
    }
  }
  return null
}

/** Attach every fixture anchor to the session and return their captured records. */
export function attachFixtureAnnotations(session, specs = FIXTURE_ANCHORS) {
  const attached = []
  for (const spec of specs) {
    const target = locate(session, spec)
    attachAnnotation(session.editor.view, {
      id: spec.id,
      from: target.from,
      to: target.to,
      body: spec.body,
      status: 'open',
    })
    attached.push({
      id: spec.id,
      target,
      record: {
        id: spec.id,
        anchors: captureAnchors(session, target.from, target.to),
        body: spec.body,
        status: 'open',
      },
    })
  }
  return attached
}

export function liveRange(session, id) {
  return annotationRecord(session.editor.state, id)
}

export { posToOffset, offsetToPos, buildTextIndex }
