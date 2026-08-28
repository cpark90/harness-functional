/**
 * Standoff persistence: the annotation set lives in its OWN file, next to but
 * never inside the document. Reloading the document does not require the
 * annotations, and vice versa — that separation is the whole point.
 *
 *   <dir>/document.json     { fragment, documentId, yUpdateBase64, prosemirrorJSON }
 *   <dir>/annotations.json  { version, document, documentId,
 *                             annotations: [{id, anchors, body, status, anchorState}] }
 */
import { mkdirSync, readFileSync, statSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { ANCHOR_STATES, captureEvidence } from './anchors.mjs'
import { documentIdFromUpdate } from './document-id.mjs'
import {
  ANNOTATIONS_FILE,
  DOCUMENT_FILE,
  STORE_UNREADABLE_CODES,
  STORE_VERSION,
  StoreContractError,
  annotationStoreContract,
  documentStateContract,
  plaintextDocumentId,
  storeBindsEndpoints,
} from './store-contract.mjs'

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
 *        CRDT 이름표**(`capture.characterIds`)로 싣는다. 길이 합계만 맞추는 채워넣기는
 *        여기서 걸리지만 **다른 곳의 이름표로 길이를 채운 padding은 통과한다**(실측: vnv
 *        B4) — 그래서 해소 시점에 이름표와 `exact`의 자리별 대응을 한 겹 더 본다
 *        (`src/blocks.mjs captureCorrespondence`). (3) 저장 시점의 종단점 상태
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
 *
 * **로드가 무엇을 거절하는지는 이 파일이 아니라 `src/store-contract.mjs`가 정한다.** 그
 * 규칙 목록은 커밋 게이트(`check_links.py`)와 **같은 답을 내야 하는** 것들이고, 스위트가
 * fixture 전수로 그 동치를 잰다(`run-link-checks.mjs` C9). 버전 상수도 계약 모듈이
 * 소유한다 — 여기서는 하위호환을 위해 그대로 다시 내보낸다.
 *
 * **스토어는 파일 하나가 아니라 디렉토리다.** 로드는 `annotations.json` 옆의
 * `document.json`을 **먼저** 열고, 그 문서 상태가 없거나·읽히지 않거나·상태를 싣지 않았으면
 * 거절한다(문서 축의 계약 = `documentStateContract`). 그리고 종단점을 묶는 스토어는 그
 * 문서 상태가 정체성을 **평문으로도** 실어야 한다 — 그 평문 필드가 커밋 게이트와 공유하는
 * 유일한 표면이고(게이트는 CRDT를 해독하지 않는다), 편집기는 그것을 CRDT 상태에 못 박는다.
 * 이 축이 없던 동안 게이트는 문서 대조를 **건너뛰고** 종단점을 묶었고, 그 스토어는 어떤
 * 편집기도 열 수 없었다(실측: vnv N1·N2·N6).
 */
export {
  ANNOTATIONS_FILE,
  DOCUMENT_FILE,
  STORE_VERSION,
  SUPPORTED_STORE_VERSIONS,
} from './store-contract.mjs'

/** 강등 사유 — 어느 세대의 레코드였는지를 orphan 사유에 그대로 싣는다. */
export const legacyReason = (version) => `legacy-v${version}-record`
export const LEGACY_PROVENANCE_REASON = legacyReason(1)

const stringify = (value) => `${JSON.stringify(value, null, 2)}\n`

// v1 레코드는 selector 를 아예 싣지 않은 것도 있다(그 세대의 파일이다). 강등 경로는 그런
// 레코드에서도 **던지지 않아야** 한다 — 게이트가 읽는 모양을 편집기가 예외로 거절하면
// 두 층의 답이 갈린다(계약 위반이 아니라 프로그램 오류로).
const documentSelector = (anchors) =>
  anchors && anchors.document && typeof anchors.document.id === 'string' && anchors.document.id
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
    relativePosition: anchors ? anchors.relativePosition : null,
    textQuote: anchors ? anchors.textQuote : null,
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

/** 스토어 옆 문서 상태 파일을 읽는다 — 판정은 하지 않고 **읽힘의 사실만** 돌려준다. */
export function readDocumentState(dir) {
  const path = join(dir, DOCUMENT_FILE)
  let found = false
  try {
    found = statSync(path).isFile()
  } catch {
    found = false
  }
  if (!found) return { found: false, parsed: false, payload: null }
  try {
    return { found: true, parsed: true, payload: JSON.parse(readFileSync(path, 'utf8')) }
  } catch {
    return { found: true, parsed: false, payload: null }
  }
}

/**
 * **로드 경로 그대로** 스토어 디렉토리 하나를 평가하되, 첫 위반에서 던지지 않고 위반을
 * 전부 모아 돌려준다. `loadStore`가 이 함수 위에 서 있으므로 성질 테스트
 * (`run-link-checks.mjs` C9)는 계약 함수를 **재계산하지 않고** 진짜 편집기의 답을 잰다 —
 * 재계산하는 성질은 성질이 아니라 자기 자신의 그림자였다(실측: vnv 6차 판정 §3(5)).
 *
 * 평가 순서는 게이트와 같다:
 *   1. payload가 **통째로** 읽히는가 (버전·`annotations` 배열·v3의 자기 documentId).
 *      여기서 걸리면 게이트도 그 스토어를 읽지 못하므로 뒤 축은 두 층 다 평가하지 않는다.
 *   2. **문서 축** — 옆 `document.json`이 있는가·읽히는가·상태와 평문 정체성을 싣는가.
 *   3. **payload 축** — 레코드 모양·id 유일성·정체성 일치. 대조 기준(권위 있는 문서 id)은
 *      두 층이 공유하는 **평문 필드**이며, 편집기는 그 평문을 CRDT 상태에 못 박는다(2).
 */
export function inspectStore(dir, { storeFile = ANNOTATIONS_FILE } = {}) {
  const storePath = join(dir, storeFile)
  let payload
  try {
    payload = JSON.parse(readFileSync(storePath, 'utf8'))
  } catch (error) {
    throw new StoreContractError('store-unreadable',
      `store contract: ${storeFile} cannot be read: ${error.message}`)
  }
  const shape = annotationStoreContract(payload, { documentId: null, storeFile })
  if (shape.length > 0 && STORE_UNREADABLE_CODES.includes(shape[0].code)) {
    return { problems: shape, payload, document: null, documentId: null, docUpdate: null }
  }

  const state = readDocumentState(dir)
  const problems = documentStateContract(state, { bindsEndpoints: storeBindsEndpoints(payload) })
  const plain = plaintextDocumentId(state)
  let docUpdate = null
  let documentId = null
  if (state.parsed && state.payload && typeof state.payload.yUpdateBase64 === 'string' &&
      state.payload.yUpdateBase64) {
    try {
      docUpdate = new Uint8Array(Buffer.from(state.payload.yUpdateBase64, 'base64'))
      // 문서 정체성의 원본은 **CRDT 상태**다. 파일 필드는 사본이므로 어긋나면 계약 위반이다.
      documentId = documentIdFromUpdate(docUpdate)
    } catch {
      docUpdate = null
      documentId = null
      // 필드가 **없는** 것(`document-state-unusable`)과 내용이 **열리지 않는** 것은 다른
      // 사실이다: 앞은 게이트도 보고, 뒤는 게이트가 원리적으로 볼 수 없다(CRDT 미해독).
      // 두 뿌리를 한 코드로 묶으면 게이트 규칙이 퇴화해도 "예상된 어긋남"으로 가려진다.
      problems.push({
        code: 'document-state-unopenable',
        record: `<${DOCUMENT_FILE}>`,
        detail: `store contract: the ${DOCUMENT_FILE} next to this store carries a ` +
          "'yUpdateBase64' that is not a document state the editor can open",
      })
    }
  }
  if (docUpdate !== null && plain !== null && plain !== documentId) {
    problems.push({
      code: 'document-state-mismatch',
      record: `<${DOCUMENT_FILE}>`,
      detail: `store contract: ${DOCUMENT_FILE} claims document ${JSON.stringify(plain)} ` +
        'but the persisted document state says otherwise',
    })
  }
  // 스토어 계약은 **한 곳**에서 정한다 (`src/store-contract.mjs`): 버전 지원 · 레코드 모양 ·
  // 레코드 id 유일성 · 스토어와 문서의 정체성 일치 · v3 레코드의 자기 정체성. 커밋 게이트가
  // 같은 목록을 지키는지는 스위트가 fixture 전수로 대조한다(run-link-checks.mjs C9).
  problems.push(...annotationStoreContract(payload, { documentId: plain, storeFile }))
  return { problems, payload, document: state.payload, documentId, docUpdate }
}

export function loadStore(dir, options = {}) {
  const { problems, payload, document, documentId, docUpdate } = inspectStore(dir, options)
  const [first] = problems
  if (first) throw new StoreContractError(first.code, first.detail)
  const version = payload.version
  return {
    fragment: document.fragment,
    docUpdate,
    docJSON: document.prosemirrorJSON,
    version,
    documentId,
    // 옛 버전은 읽되 출처 미상으로 강등한다 (조용히 승격시키지 않는다).
    annotations: payload.annotations.map((record) => migrateRecord(record, version)),
  }
}
