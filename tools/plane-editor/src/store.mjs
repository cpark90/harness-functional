/**
 * Standoff persistence: the annotation set lives in its OWN file, next to but
 * never inside the document. Reloading the document does not require the
 * annotations, and vice versa — that separation is the whole point.
 *
 *   <dir>/document.json     { fragment, yUpdateBase64, prosemirrorJSON }
 *   <dir>/annotations.json  { version, document, annotations: [{id, anchors, body, status}] }
 */
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

export const STORE_VERSION = 1
export const DOCUMENT_FILE = 'document.json'
export const ANNOTATIONS_FILE = 'annotations.json'

const stringify = (value) => `${JSON.stringify(value, null, 2)}\n`

/** Records are written in exactly the shape the brief fixes: {id, anchors, body, status}. */
export function annotationRecord({ id, anchors, body, status }) {
  return {
    id,
    anchors: {
      relativePosition: {
        start: anchors.relativePosition.start,
        end: anchors.relativePosition.end,
      },
      textQuote: {
        exact: anchors.textQuote.exact,
        prefix: anchors.textQuote.prefix,
        suffix: anchors.textQuote.suffix,
      },
      // 삭제와 이동을 가르는 세 번째 selector (src/blocks.mjs). 없으면 null로 남는다.
      blockContext: anchors.blockContext
        ? {
            text: anchors.blockContext.text,
            offset: anchors.blockContext.offset,
            itemId: anchors.blockContext.itemId,
            stateVector: anchors.blockContext.stateVector,
          }
        : null,
    },
    body,
    status,
  }
}

export function saveStore(dir, { fragment, docUpdate, docJSON, annotations }) {
  mkdirSync(dir, { recursive: true })
  writeFileSync(
    join(dir, DOCUMENT_FILE),
    stringify({
      fragment,
      yUpdateBase64: Buffer.from(docUpdate).toString('base64'),
      prosemirrorJSON: docJSON,
    }),
  )
  writeFileSync(
    join(dir, ANNOTATIONS_FILE),
    stringify({
      version: STORE_VERSION,
      document: DOCUMENT_FILE,
      annotations: annotations.map(annotationRecord),
    }),
  )
  return dir
}

export function loadStore(dir) {
  const document = JSON.parse(readFileSync(join(dir, DOCUMENT_FILE), 'utf8'))
  const annotations = JSON.parse(readFileSync(join(dir, ANNOTATIONS_FILE), 'utf8'))
  if (annotations.version !== STORE_VERSION) {
    throw new Error(`unsupported store version: ${annotations.version}`)
  }
  return {
    fragment: document.fragment,
    docUpdate: new Uint8Array(Buffer.from(document.yUpdateBase64, 'base64')),
    docJSON: document.prosemirrorJSON,
    annotations: annotations.annotations,
  }
}
