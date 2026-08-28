/**
 * The annotation plane — one ProseMirror plugin, zero schema footprint.
 *
 * [지킴] mark 금지 (tool_suggestion v0.2 §5.2): an annotation exists only as
 *   (a) a record in this plugin's state, and
 *   (b) an inline Decoration in this plugin's DecorationSet.
 * Nothing is written into the document. `addProseMirrorPlugins` is the ONLY
 * hook this Tiptap extension uses — no `addNodes`, no `addMarks`, no
 * `addAttributes` — which is what gate G1 checks differentially.
 *
 * Live re-anchoring is ProseMirror's own machinery: `DecorationSet.map(mapping,
 * doc)` moves every anchor across every Step. A decoration that collapses to an
 * empty range is dropped by ProseMirror itself; we read that as "orphaned"
 * rather than silently keeping a zero-width anchor.
 */
import './dom.mjs'
import { Plugin, PluginKey } from 'prosemirror-state'
import { Decoration, DecorationSet } from 'prosemirror-view'
import { Extension } from '@tiptap/core'

export const annotationPlaneKey = new PluginKey('hoAnnotationPlane')

export const STATUS = Object.freeze({ OPEN: 'open', RESOLVED: 'resolved' })

function decorationFor(record) {
  return Decoration.inline(
    record.from,
    record.to,
    { class: `ho-annotation ho-annotation-${record.status}` },
    { id: record.id, inclusiveStart: false, inclusiveEnd: false },
  )
}

function rebuildDecorations(doc, records) {
  const live = []
  for (const record of records.values()) {
    if (!record.orphaned && record.from !== null && record.to !== null && record.from < record.to) {
      live.push(decorationFor(record))
    }
  }
  return DecorationSet.create(doc, live)
}

function normalize(record) {
  return {
    id: record.id,
    from: record.from ?? null,
    to: record.to ?? null,
    body: record.body ?? '',
    status: record.status ?? STATUS.OPEN,
    orphaned: record.orphaned ?? false,
  }
}

function applyAction(records, action) {
  const next = new Map(records)
  switch (action.type) {
    case 'attach':
      next.set(action.record.id, normalize(action.record))
      break
    case 'setStatus': {
      const record = next.get(action.id)
      if (record) next.set(action.id, { ...record, status: action.status })
      break
    }
    case 'detach':
      next.delete(action.id)
      break
    case 'replaceAll':
      next.clear()
      for (const record of action.records) next.set(record.id, normalize(record))
      break
    default:
      throw new Error(`unknown annotation-plane action: ${action.type}`)
  }
  return next
}

export function annotationPlanePlugin() {
  return new Plugin({
    key: annotationPlaneKey,
    state: {
      init(_config, state) {
        const records = new Map()
        return { records, decorations: rebuildDecorations(state.doc, records) }
      },
      apply(tr, plane) {
        let { records, decorations } = plane

        if (tr.docChanged) {
          // ProseMirror re-anchors the whole plane in one call.
          decorations = decorations.map(tr.mapping, tr.doc)
          const alive = new Map()
          for (const deco of decorations.find()) alive.set(deco.spec.id, deco)

          const mapped = new Map()
          for (const [id, record] of records) {
            if (record.orphaned) {
              mapped.set(id, record)
              continue
            }
            const deco = alive.get(id)
            mapped.set(
              id,
              deco
                ? { ...record, from: deco.from, to: deco.to }
                : { ...record, from: null, to: null, orphaned: true },
            )
          }
          records = mapped
        }

        const action = tr.getMeta(annotationPlaneKey)
        if (action) {
          records = applyAction(records, action)
          decorations = rebuildDecorations(tr.doc, records)
        }

        return { records, decorations }
      },
    },
    props: {
      decorations(state) {
        return annotationPlaneKey.getState(state).decorations
      },
    },
  })
}

/** Tiptap wrapper: plugin only, so the schema stays untouched. */
export const AnnotationPlane = Extension.create({
  name: 'annotationPlane',
  addProseMirrorPlugins() {
    return [annotationPlanePlugin()]
  },
})

/* ---- read/write helpers (no doc mutation anywhere below) ---- */

export function planeState(state) {
  return annotationPlaneKey.getState(state)
}

export function annotationRecords(state) {
  return [...planeState(state).records.values()].map((record) => ({ ...record }))
}

export function annotationRecord(state, id) {
  const record = planeState(state).records.get(id)
  return record ? { ...record } : null
}

export function decoratedRanges(state) {
  return planeState(state)
    .decorations.find()
    .map((deco) => ({ id: deco.spec.id, from: deco.from, to: deco.to }))
}

function dispatchAction(view, action) {
  view.dispatch(view.state.tr.setMeta(annotationPlaneKey, action))
}

export function attachAnnotation(view, record) {
  dispatchAction(view, { type: 'attach', record })
}

export function setAnnotationStatus(view, id, status) {
  dispatchAction(view, { type: 'setStatus', id, status })
}

export function replaceAnnotations(view, records) {
  dispatchAction(view, { type: 'replaceAll', records })
}
