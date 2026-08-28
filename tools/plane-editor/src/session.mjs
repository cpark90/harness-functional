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

const readFixture = (name) =>
  JSON.parse(readFileSync(new URL(`../fixtures/${name}`, import.meta.url), 'utf8'))

export const FIXTURE_DOC = readFixture('document.json')
export const FIXTURE_ANCHORS = readFixture('anchors.json')

/**
 * fixture 2종.
 *   main — 편집 생존 시나리오 S1–S8용 (앵커 a6은 같은 문자열이 두 번 나오는 함정)
 *   twin — 파괴적 편집 S9·S10용. 앵커마다 "살아남는 쌍둥이"를 다르게 배치해
 *          (동일 문맥 / 다른 문맥 / 한쪽 affix만 맞는 문맥 / 쌍둥이 없음)
 *          오해소가 날 수 있는 경로를 전부 한 번씩 누른다.
 */
export const MAIN_FIXTURE = Object.freeze({
  id: 'main',
  title: '편집 생존 fixture',
  doc: FIXTURE_DOC,
  anchors: FIXTURE_ANCHORS,
})

export const TWIN_FIXTURE = Object.freeze({
  id: 'twin',
  title: '쌍둥이 문장 fixture (파괴적 편집용)',
  doc: readFixture('twin-document.json'),
  anchors: readFixture('twin-anchors.json'),
})

const blockText = (block) => (block.content ?? []).map((node) => node.text ?? '').join('')

/**
 * 앵커가 든 블록마다 **완전히 같은 텍스트의 쌍둥이 블록**이 하나씩 있는 문서를 만든다.
 * 이미 쌍둥이가 있는 블록은 건드리지 않고, 없는 블록만 복제해 문서 끝에 덧붙인다.
 */
function withTwinForEveryAnchor(doc, anchors) {
  const content = doc.content.map((block) => structuredClone(block))
  const duplicate = []
  for (const anchor of anchors) {
    const index = content.findIndex((block) => blockText(block).includes(anchor.quote))
    if (index === -1) throw new Error(`s11 fixture: no block carries the quote ${anchor.quote}`)
    const text = blockText(content[index])
    const existingTwins = content.filter((block) => blockText(block) === text).length
    if (existingTwins > 1 || duplicate.includes(index)) continue
    duplicate.push(index)
  }
  return {
    ...doc,
    content: [...content, ...duplicate.map((index) => structuredClone(content[index]))],
  }
}

/**
 * S11 fixture — "앵커 블록이 사라진 **뒤** 같은 텍스트의 블록이 새로 나타난다" 계열
 * (쌍둥이 이동 / 삭제 후 재타이핑 / 원격 피어 작성)을 재기 위한 문서.
 *
 * 이 계열을 앵커 6개 전부에서 누르려면 앵커마다 쌍둥이 블록이 하나씩 필요한데, twin
 * fixture는 b1의 블록에만 쌍둥이가 있다. 그래서 twin 문서에서 **쌍둥이가 없는 앵커
 * 블록만 복제**해 덧붙인 문서를 파생시킨다 (fixture 파일을 늘리지 않는 결정론적 파생).
 * 앵커 정의는 twin fixture와 같은 것을 쓰되 id만 `c*`로 바꿔, 리포트 표에서 twin 쪽
 * 시행(`b*`)과 섞이지 않게 한다.
 */
export const S11_FIXTURE = Object.freeze({
  id: 's11',
  title: '앵커마다 쌍둥이 블록이 있는 fixture (블록 사라짐 계열)',
  doc: withTwinForEveryAnchor(TWIN_FIXTURE.doc, TWIN_FIXTURE.anchors),
  anchors: TWIN_FIXTURE.anchors.map((anchor) => ({ ...anchor, id: anchor.id.replace(/^b/, 'c') })),
})

export const FIXTURES = Object.freeze([MAIN_FIXTURE, TWIN_FIXTURE, S11_FIXTURE])

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
