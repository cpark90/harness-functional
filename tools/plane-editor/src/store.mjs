/**
 * Standoff persistence: the annotation set lives in its OWN file, next to but
 * never inside the document. Reloading the document does not require the
 * annotations, and vice versa — that separation is the whole point.
 *
 *   <dir>/document.json     { fragment, documentId, yUpdateBase64, prosemirrorJSON }
 *   <dir>/annotations.json  { version, document, documentId,
 *                             annotations: [{id, anchors, body, status, anchorState}] }
 */
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { ANCHOR_STATES, captureEvidence } from './anchors.mjs'
import { documentIdFromUpdate } from './document-id.mjs'

/**
 * **버전 3 — 의미가 바뀐 버전이다** (모양만 바뀐 것이 아니다).
 *
 * 버전은 파일 모양이 아니라 **레코드를 얼마나 믿을 수 있는지**가 바뀔 때 올린다.
 *
 *   v1 : 세 번째 selector가 아예 없던 Phase 1 레코드와, `blockContext`를 쓰기 시작한
 *        다음 세대가 한 버전에 섞여 있다. 파일에 적힌 `1`만으로는 둘을 가릴 수 없다.
 *   v2 : 캡처 시점 state vector를 레코드 최상위에 따로 실었다. 그런데 그 값은 레코드가
 *        **스스로 주장하는 시점**이라, 마이그레이션이 현재 값으로 채워 넣으면 "모든
 *        문자가 옛 문자"로 뒤집혀 방어가 무력화된다 (실측된 회귀: vnv M4).
 *   v3 : (1) 레코드가 **어느 문서의 것인지**(`anchors.document`)를 싣는다 — 없으면 다른
 *        문서에 그대로 붙는다(실측: vnv M5). (2) 출처 증거를 시점이 아니라 **문자들의
 *        CRDT 이름표**(`capture.characterIds`)로 싣는다 — 저장된 `exact`와 길이가 맞아야
 *        하므로 현재 상태에서 베껴 넣을 수 없다. (3) 저장 시점의 종단점 상태
 *        (`anchorState`)를 남긴다 — orphan이 된 앵커를 링크가 조용히 가리키지 못하게.
 *
 * **옛 버전은 강등해서 읽는다(승격하지 않는다).** 로드는 하되(레코드를 잃지 않는다)
 * 출처 미상으로 표시해 이동 복구를 시도하지 않고, 내용이 바뀐 자리를 문자열 구조만으로
 * 통과시키지 않는다. 마이그레이션이 없는 증거를 **채워 넣는 경로는 존재하지 않는다** —
 * 그것이 v2에서 실측된 회귀의 원인이었다.
 *
 * **문서 정체성도 채워 넣지 않는다 — 입양 금지(sticky).** 한때 이 모듈은 "이 레코드가 이
 * document.json 옆에 있다"는 동거를 외부 사실로 보고 강등본에 스토어의 documentId를
 * 찍었다. 그 한 줄이 세탁 경로를 열었다(실측: vnv B3 -> B7). 문서 A의 옛 주석 파일을 문서
 * B 옆에 두면 B의 id가 찍히고, 규칙 0은 불일치가 없으니 통과하고, 편집기가 평범하게
 * load -> save 하면 v3 레코드가 되어 링크 종단점으로 바인딩됐다 — **위조가 전혀 필요 없다.**
 * 동거는 정체성의 증거가 아니다(파일은 옮길 수 있다). 그래서 지금은:
 *   - 자기 문서 id를 싣지 않은 레코드는 **로드해도 미상으로 남고**(어떤 문서에서도 규칙 0
 *     에서 멈춘다),
 *   - 저장을 거쳐도 **승격되지 않는다** — 저장된 v3 레코드는 `document: null` + 강등 표시를
 *     그대로 들고 나가고, 다시 로드해도 같은 상태다(sticky),
 *   - 정체성은 오직 **캡처 이벤트**에서 실린다(`captureAnchors`는 정체성 없는 문서에서
 *     캡처 자체를 거절한다).
 * 대가는 명시적이다: v1·v2 레코드는 하위호환으로 읽히되 링크 종단점이 되지 못한다.
 */
export const STORE_VERSION = 3
export const SUPPORTED_STORE_VERSIONS = Object.freeze([1, 2, 3])
export const DOCUMENT_FILE = 'document.json'
export const ANNOTATIONS_FILE = 'annotations.json'

/** 강등 사유 — 어느 세대의 레코드였는지를 orphan 사유에 그대로 싣는다. */
export const legacyReason = (version) => `legacy-v${version}-record`
export const LEGACY_PROVENANCE_REASON = legacyReason(1)

const stringify = (value) => `${JSON.stringify(value, null, 2)}\n`

const documentSelector = (anchors) =>
  anchors.document && typeof anchors.document.id === 'string' && anchors.document.id
    ? { id: anchors.document.id }
    : null

/**
 * Records are written in exactly the shape the brief fixes, plus the v3 selectors.
 *
 * 저장은 **승격 지점이 아니다**: 레코드가 정체성을 싣고 있지 않으면 `document: null`로
 * 쓰이고 강등 표시가 함께 나간다(입양 금지의 sticky 쪽). 표시 없이 정체성만 없는 레코드를
 * 쓰려는 시도는 거절한다 — "왜 미상인지"를 말하지 못하는 미상 레코드는 만들지 않는다.
 */
export function annotationRecord({ id, anchors, body, status, anchorState }) {
  if (anchorState !== undefined && !ANCHOR_STATES.includes(anchorState)) {
    throw new Error(
      `annotationRecord ${id}: anchorState must be one of ${ANCHOR_STATES.join(', ')} ` +
        `(got ${JSON.stringify(anchorState)})`,
    )
  }
  if (!documentSelector(anchors) && !anchors.legacy) {
    throw new Error(
      `annotationRecord ${id}: a record with no document identity must carry its provenance mark ` +
        '(anchors.legacy) — identity is minted at capture time and is never adopted from a store',
    )
  }
  const record = {
    id,
    anchors: {
      // 규칙 0의 selector — 어느 문서의 앵커인가.
      document: documentSelector(anchors),
      relativePosition: {
        start: anchors.relativePosition.start,
        end: anchors.relativePosition.end,
      },
      textQuote: {
        exact: anchors.textQuote.exact,
        prefix: anchors.textQuote.prefix,
        suffix: anchors.textQuote.suffix,
      },
      // 캡처 증거. characterIds가 strict의 근거이고 stateVector는 대조 정책 전용이다.
      capture: anchors.capture
        ? {
            stateVector: anchors.capture.stateVector,
            characterIds: Array.isArray(anchors.capture.characterIds)
              ? anchors.capture.characterIds.map((run) => ({
                  client: run.client,
                  clock: run.clock,
                  length: run.length,
                }))
              : null,
          }
        : null,
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
  if (anchorState !== undefined) record.anchorState = anchorState
  return record
}

/**
 * 옛 버전 레코드를 **출처 미상으로 강등**해 읽는다 (버리지 않는다).
 * 캡처 증거·블록 문맥을 비우고 사유를 박는다. 이 표시가 붙은 레코드는 해소 엔진에서
 * 이동 복구 대상이 아니며, 내용이 바뀐 범위는 명시적 orphan이 된다
 * (`src/anchors.mjs` 규칙 A·C).
 *
 * 문서 정체성은 **레코드가 스스로 싣고 있던 값만** 유지한다. 스토어가 자기 documentId를
 * 찍어 주지 않는다 — 동거는 정체성의 증거가 아니기 때문이다(입양 금지, 위 머리말).
 * 그래서 정체성 없는 옛 레코드는 강등본에서도 `document: null`이고, 어느 문서에서든
 * 규칙 0에서 멈춘다.
 */
export function downgradeAnchors(anchors, version) {
  return {
    document: documentSelector(anchors),
    relativePosition: anchors.relativePosition,
    textQuote: anchors.textQuote,
    capture: null,
    blockContext: null,
    legacy: { storeVersion: version, reason: legacyReason(version) },
  }
}

/**
 * 마이그레이션은 **강등 전용**이다 — 없는 증거를 채워 넣는 분기가 존재하지 않는다.
 * 현재 버전 레코드도 자기보고 캡처가 다른 selector와 어긋나면(계약 위반) 같은 강등
 * 경로로 흘린다: 손상된 증거는 "증거 없음"보다 위험하므로 절대 그대로 쓰지 않는다.
 */
export function migrateRecord(record, version) {
  if (version !== STORE_VERSION) {
    return { ...record, anchors: downgradeAnchors(record.anchors, version) }
  }
  const evidence = captureEvidence(record.anchors)
  if (evidence.corrupt) {
    return {
      ...record,
      anchors: {
        ...downgradeAnchors(record.anchors, version),
        legacy: { storeVersion: version, reason: evidence.reason },
      },
    }
  }
  return record
}

export function saveStore(dir, { fragment, documentId, docUpdate, docJSON, annotations }) {
  const stateIdentity = documentIdFromUpdate(docUpdate)
  if (!stateIdentity) {
    throw new Error('saveStore: this document state carries no identity — its records could not be bound back')
  }
  if (documentId && documentId !== stateIdentity) {
    throw new Error('saveStore: the given documentId is not the identity stored in the document state')
  }
  for (const annotation of annotations) {
    if (!ANCHOR_STATES.includes(annotation.anchorState)) {
      throw new Error(
        `saveStore: annotation ${annotation.id} must carry a measured anchorState ` +
          `(${ANCHOR_STATES.join(' | ')}) — a link endpoint may not silently assume it is bound`,
      )
    }
  }
  mkdirSync(dir, { recursive: true })
  writeFileSync(
    join(dir, DOCUMENT_FILE),
    stringify({
      fragment,
      documentId: stateIdentity,
      yUpdateBase64: Buffer.from(docUpdate).toString('base64'),
      prosemirrorJSON: docJSON,
    }),
  )
  writeFileSync(
    join(dir, ANNOTATIONS_FILE),
    stringify({
      version: STORE_VERSION,
      document: DOCUMENT_FILE,
      documentId: stateIdentity,
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
  const docUpdate = new Uint8Array(Buffer.from(document.yUpdateBase64, 'base64'))
  // 문서 정체성의 원본은 **CRDT 상태**다. 파일 필드는 사본이므로 어긋나면 계약 위반이다.
  const documentId = documentIdFromUpdate(docUpdate)
  for (const [where, claimed] of [
    [DOCUMENT_FILE, document.documentId],
    [ANNOTATIONS_FILE, annotations.documentId],
  ]) {
    if (typeof claimed === 'string' && claimed !== documentId) {
      throw new Error(
        `store contract: ${where} claims document ${JSON.stringify(claimed)} but the persisted ` +
          'document state says otherwise',
      )
    }
  }
  if (version === STORE_VERSION) {
    for (const record of annotations.annotations) {
      const claimed = record.anchors && record.anchors.document ? record.anchors.document.id : null
      if (typeof claimed !== 'string' || !claimed) {
        // 출처 미상은 **미상으로 남는다**: 강등 표시를 달고 저장된 레코드는 그 상태 그대로
        // 다시 읽힌다(입양 금지의 sticky 쪽). 표시 없이 정체성만 빠진 레코드는 계약 위반이다.
        if (record.anchors && record.anchors.legacy) continue
        throw new Error(`store contract: record ${record.id} carries no document identity`)
      }
      if (claimed !== documentId) {
        throw new Error(`store contract: record ${record.id} belongs to another document`)
      }
    }
  }
  return {
    fragment: document.fragment,
    docUpdate,
    docJSON: document.prosemirrorJSON,
    version,
    documentId,
    // 옛 버전은 읽되 출처 미상으로 강등한다 (조용히 승격시키지 않는다).
    annotations: annotations.annotations.map((record) => migrateRecord(record, version)),
  }
}
