/**
 * Document schema = pure content.
 *
 * The annotation plane contributes NOTHING here — no node type, no mark type.
 * `schemaFingerprint()` exists so that claim can be proven mechanically
 * (gate G1) instead of asserted in prose.
 */
import './dom.mjs'
import { getSchema } from '@tiptap/core'
import StarterKit from '@tiptap/starter-kit'

/** Content-only extension list (no annotation plane). */
export function contentExtensions() {
  // undoRedo off: history belongs to the Yjs layer, not to prosemirror-history.
  return [StarterKit.configure({ undoRedo: false })]
}

export function buildSchema(extensions = contentExtensions()) {
  return getSchema(extensions)
}

/** Canonical, order-stable description of everything a schema declares. */
export function schemaFingerprint(schema) {
  const describeAttrs = (attrs) =>
    Object.keys(attrs)
      .sort()
      .map((name) => ({ name, default: attrs[name].default ?? null }))

  return {
    topNode: schema.topNodeType.name,
    nodes: Object.keys(schema.nodes)
      .sort()
      .map((name) => {
        const type = schema.nodes[name]
        return {
          name,
          group: type.spec.group ?? null,
          content: type.spec.content ?? null,
          inline: type.isInline,
          attrs: describeAttrs(type.attrs),
        }
      }),
    marks: Object.keys(schema.marks)
      .sort()
      .map((name) => {
        const type = schema.marks[name]
        return {
          name,
          group: type.spec.group ?? null,
          attrs: describeAttrs(type.attrs),
        }
      }),
  }
}

/** Names that would betray an annotation leaking into the document schema. */
export const ANNOTATION_NAME_PATTERN = /annot|comment|thread|highlight|anchor|review|suggest/i

export function annotationNamedTypes(schema) {
  return [...Object.keys(schema.nodes), ...Object.keys(schema.marks)]
    .filter((name) => ANNOTATION_NAME_PATTERN.test(name))
    .sort()
}
