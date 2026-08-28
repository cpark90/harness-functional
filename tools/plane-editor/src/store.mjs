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

/**
 * **버전 2 — 의미가 바뀐 버전이다** (모양만 바뀐 것이 아니다).
 *
 * v1 파일은 두 세대가 섞여 있다: 세 번째 selector가 아예 없던 Phase 1 레코드와,
 * `blockContext`를 쓰기 시작한 그 다음 세대. 파일에 적힌 `1`만으로는 둘을 가릴 수
 * 없고, 후자도 캡처 시점 state vector를 블록 문맥 **안에** 넣어 두어 블록 경계를
 * 걸친 앵커는 출처를 못 읽었다. 그래서 v2 엔진은 v1 레코드를 **출처 미상**으로 본다:
 * 읽어들이기는 하되(레코드를 잃지 않는다) 블록 이동 복구를 시도하지 않고, 내용이
 * 바뀐 자리에서는 문자열 구조만으로 통과시키지 않는다 — orphan 사유를 명시한다.
 *
 * v2 레코드는 `anchors.capture.stateVector`(항상)와 `anchors.blockContext`(블록 경계를
 * 걸치면 null)를 나눠 싣는다. 캡처 시점은 **캡처 이벤트의 성질**이지 블록의 성질이 아니다.
 */
export const STORE_VERSION = 2
export const SUPPORTED_STORE_VERSIONS = Object.freeze([1, 2])
export const LEGACY_PROVENANCE_REASON = 'legacy-v1-record'
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
      // 캡처 시점의 CRDT 기준점 — 문자 출처·생성 판정의 원점 (v2).
      capture: anchors.capture ? { stateVector: anchors.capture.stateVector } : null,
      // 블록 정체성 selector. 앵커가 블록 경계를 걸치면 null (src/blocks.mjs).
      blockContext: anchors.blockContext
        ? {
            text: anchors.blockContext.text,
            offset: anchors.blockContext.offset,
            itemId: anchors.blockContext.itemId,
          }
        : null,
      ...(anchors.legacy ? { legacy: anchors.legacy } : {}),
    },
    body,
    status,
  }
}

/**
 * 옛 버전 레코드를 **출처 미상으로 강등**해 읽는다 (버리지 않는다).
 * v1은 캡처 기준점을 신뢰할 수 없으므로 `capture`·`blockContext`를 비우고 사유를 박는다.
 * 이 표시가 붙은 레코드는 해소 엔진에서 이동 복구 대상이 아니며, 내용이 바뀐 범위는
 * 명시적 orphan이 된다 (`src/anchors.mjs` 규칙 A·C).
 */
export function downgradeAnchors(anchors, version) {
  return {
    relativePosition: anchors.relativePosition,
    textQuote: anchors.textQuote,
    capture: null,
    blockContext: null,
    legacy: { storeVersion: version, reason: LEGACY_PROVENANCE_REASON },
  }
}

export function migrateRecord(record, version) {
  if (version === STORE_VERSION) return record
  return { ...record, anchors: downgradeAnchors(record.anchors, version) }
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
  const version = annotations.version
  if (!SUPPORTED_STORE_VERSIONS.includes(version)) {
    throw new Error(`unsupported store version: ${version}`)
  }
  return {
    fragment: document.fragment,
    docUpdate: new Uint8Array(Buffer.from(document.yUpdateBase64, 'base64')),
    docJSON: document.prosemirrorJSON,
    version,
    // 옛 버전은 읽되 출처 미상으로 강등한다 (조용히 승격시키지 않는다).
    annotations: annotations.annotations.map((record) => migrateRecord(record, version)),
  }
}
