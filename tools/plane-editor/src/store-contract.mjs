/**
 * 주석 스토어 **계약** — 편집기와 커밋 게이트가 **같은 답을 내야 하는** 규칙만 모아 둔 곳.
 *
 * ## 왜 따로 떼어 놓았나 (사례가 아니라 성질로 닫기)
 *
 * 결함의 모양은 매번 달랐지만 원인은 하나였다: **게이트는 자기가 완전히 해석하지 못한
 * 레코드를 조용히 건너뛰고, 편집기는 같은 레코드에서 스토어 전체를 거절한다.** 그러면
 * "게이트 통과 = 편집기가 연다"가 깨진다(실측: vnv H3 · H4 · X1 · X2a-c). 사례를 하나씩
 * 막으면 다음 라운드에 새 변종이 나오므로, 규칙을 **한 곳에 열거**하고 그 목록에 대해
 * `게이트 accept <-> 편집기 accept`를 스위트가 전수로 재게 한다
 * (`run-link-checks.mjs` C9 — fixture 디렉토리를 훑으므로 새 fixture는 자동 포함).
 *
 * 이 모듈은 **파일 시스템을 모른다**: 이미 읽어 온 payload와, 알고 있다면 **권위 있는 문서
 * 정체성**(CRDT 상태에서 읽은 값)만 받는다. 그래서 편집기(`loadStore`)와 성질 테스트가
 * 같은 함수를 부를 수 있다 — 규칙이 두 곳에 복제되면 그 순간부터 갈라지기 때문이다.
 *
 * ## 게이트(Python)와의 관계
 *
 * 커밋 게이트는 다른 언어라 이 함수를 부르지 못한다. 그래서 규칙마다 게이트가 같은 사실에
 * 매기는 **규칙 이름**을 `GATE_RULE_OF`에 적어 두고, 성질 테스트가 두 층의 판정을 대조한다.
 * 여기에 규칙을 더하면 게이트에도 같은 규칙을 더해야 하고, 대조가 그것을 강제한다.
 *
 * ## 스토어는 파일 하나가 아니라 **디렉토리**다 (문서 축)
 *
 * `loadStore`가 여는 것은 `annotations.json` 하나가 아니라 그 옆의 `document.json`까지
 * 포함한 디렉토리다. 그래서 계약도 두 축이다:
 *   - **payload 축** — `annotationStoreContract` (버전·레코드 모양·정체성 일치),
 *   - **문서 축** — `documentStateContract` (문서 상태 파일이 있는가·읽히는가·정체성을
 *     평문으로도 싣는가).
 * 한때 이 모듈은 payload 축만 알았고, 그래서 게이트의 문서 축이 **fail-open** 인 것을
 * 아무도 재지 못했다: 옆 `document.json`이 없거나·평문 `documentId`가 없거나·파싱되지
 * 않으면 게이트는 대조를 **건너뛰고** 종단점을 묶었는데(실측: vnv N1·N2·N6, 셋 다 파일을
 * 옮기는 것만으로 도달), 진짜 `loadStore`는 그 스토어를 열지 못한다. **평가할 수 없으면
 * 위반**이라는 이 wave의 규칙이 레코드 축에만 적용돼 있었던 것이다.
 *
 * 두 층이 문서 정체성에 대해 **공유하는 표면은 평문 필드**다(게이트는 CRDT를 해독하지
 * 않는다). 편집기는 그 평문을 CRDT 상태에 **못 박고**(`document-state-mismatch`), 평문이
 * 없으면 종단점을 묶는 스토어를 열지 않는다 — 그래서 게이트가 평문만 보고 내리는 판단이
 * 편집기의 판단과 같아진다. 남는 비대칭은 문서 상태 파일을 **손으로 쓰는** 경우뿐이며
 * (평문과 CRDT가 어긋나거나 `yUpdateBase64`의 내용이 유효한 업데이트가 아닌 경우),
 * 그것은 선언된 신뢰 경계 **바깥**이다(README "신뢰 경계" 표). 그 비대칭은 이제 문장이
 * 아니라 **측정값**이다: 그 두 모양이 `EXPECTED_DIVERGENCE_CODES` 부류의 fixture로 코퍼스에
 * 들어와 있고, 성질이 매 실행 그 수를 센다(부류 밖 divergence는 0이어야 한다).
 *
 * ## 계약 밖 (일부러 뺀 것)
 *
 * - **스토어 사이**의 사실(같은 documentId를 선언한 스토어가 둘)은 `loadStore` 하나가 볼 수
 *   없다. 게이트만 아는 사실이므로 계약에 넣지 않는다(`annotation-store-duplicate-document`).
 * - **링크 종단점**의 해소(끊김·미상)는 링크 평면의 판정이지 스토어 계약이 아니다.
 */

/**
 * **버전 3 — 의미가 바뀐 버전이다** (모양만 바뀐 것이 아니다). 세대별 신뢰 수준은
 * `store.mjs` 머리말에 적혀 있고, 이 모듈은 그 버전 집합을 **소유**한다 — 계약을 아는 곳이
 * 버전도 알아야 "읽을 수 있는 버전"이 계약과 어긋나지 않는다. 커밋 게이트의 드리프트 알람
 * (`check_links.py: ANNOTATION_PLANE_MODULE`)도 이 선언을 읽는다.
 */
export const STORE_VERSION = 3
export const SUPPORTED_STORE_VERSIONS = Object.freeze([1, 2, 3])
/** 이 버전부터 스토어가 링크 종단점을 묶는다 (= 자기 documentId를 싣는다). */
export const BINDING_STORE_VERSION = 3
export const DOCUMENT_FILE = 'document.json'
export const ANNOTATIONS_FILE = 'annotations.json'

/**
 * 계약 위반 코드 -> 커밋 게이트(`check_links.py`)가 같은 사실에 매기는 규칙 이름.
 * 성질 테스트가 이 표로 두 층을 대조한다. 표에 없는 코드는 대조할 수 없으므로 **없어야**
 * 한다 — 예외는 아래 `EXPECTED_DIVERGENCE_CODES`뿐이고, 그 부류는 조용히 넘어가는 대신
 * **매 실행 수를 세어** 성질이 측정한다(부류 밖 divergence는 0이어야 한다).
 */
export const GATE_RULE_OF = Object.freeze({
  'unsupported-version': 'annotation-store-unreadable',
  'annotations-not-an-array': 'annotation-store-unreadable',
  'store-identity-missing': 'annotation-store-unreadable',
  'document-state-absent': 'annotation-store-document-unreadable',
  'document-state-unparsable': 'annotation-store-document-unreadable',
  'document-state-unusable': 'annotation-store-document-unreadable',
  'document-state-unidentified': 'annotation-store-document-unreadable',
  'record-not-an-object': 'annotation-record-unloadable',
  'record-id-missing': 'annotation-record-unloadable',
  'duplicate-record-id': 'annotation-store-duplicate-record',
  'store-document-mismatch': 'annotation-store-document-mismatch',
  'record-no-anchors': 'annotation-record-unloadable',
  'record-unmarked-identity': 'annotation-record-unloadable',
  'record-foreign-document': 'annotation-record-document-mismatch',
})

/**
 * 게이트가 **원리적으로 볼 수 없는** 코드 = 편집기가 거절하는데 게이트는 초록을 주는 자리.
 *
 * 두 코드 다 **CRDT 상태의 내용**에 관한 사실이고, 게이트는 CRDT를 해독하지 않는다(선언된
 * 경계). 파일을 옮겨서는 도달하지 못하며 문서 상태 파일을 **손으로 써야** 도달한다.
 *   `document-state-mismatch`  : 평문 `documentId`와 CRDT 상태의 정체성이 다르다 (vnv M2)
 *   `document-state-unopenable`: `yUpdateBase64`의 **내용**이 편집기가 열 수 있는 업데이트가
 *                                아니다 (vnv M1·M1b). 필드가 **없는** 것은 게이트도 보므로
 *                                다른 코드다(`document-state-unusable`) — 두 뿌리를 한 코드로
 *                                묶으면 게이트 규칙이 퇴화해도 "예상된 어긋남"으로 가려진다.
 *
 * 한때 이 상수는 `GATE_BLIND_CODES`라는 이름으로 있었지만 **한 번도 발화하지 않았다**:
 * 성질은 `rejected` 불리언을 먼저 보므로 규칙 이름 매핑이 divergence를 막지 못했고, 그런
 * 스토어가 코퍼스에 하나도 없어서 측정된 적도 없었다(실측: vnv 7차 §7-1). 지금은 이름이
 * 말하는 대로 **부류**다: 이 코드로 거절되는 스토어는 fixture로 코퍼스에 들어와 있고,
 * 성질이 매 실행 그 수를 세며(`expectedDivergence` >= 3), **그 부류 밖의 divergence는 0**
 * 이어야 한다. 선언된 전제가 문장이 아니라 **측정값**이 되는 자리다.
 */
export const EXPECTED_DIVERGENCE_CODES = Object.freeze([
  'document-state-mismatch', 'document-state-unopenable',
])

/**
 * 스토어를 **통째로 읽을 수 없게** 만드는 코드. 게이트도 같은 자리에서 멈추므로
 * (`check_links.py _read_annotation_store`가 raise), 이 코드가 나오면 그 뒤의 축
 * (문서 상태·레코드)은 두 층 다 평가하지 않는다 — 순서까지 같아야 답이 같다.
 */
export const STORE_UNREADABLE_CODES = Object.freeze([
  'unsupported-version', 'annotations-not-an-array', 'store-identity-missing',
])

export const STORE_CONTRACT_CODES = Object.freeze([
  ...Object.keys(GATE_RULE_OF), ...EXPECTED_DIVERGENCE_CODES,
])

/** 게이트가 **스토어 하나**에 대해 낼 수 있는 규칙 (성질 테스트가 대조하는 집합). */
export const PER_STORE_GATE_RULES = Object.freeze([...new Set(Object.values(GATE_RULE_OF))])

const label = (position) => `#${position}`

/** 계약 위반으로 던지는 오류 — **어느 규칙**이었는지를 코드로 들고 다닌다(성질이 대조한다). */
export class StoreContractError extends Error {
  constructor(code, detail) {
    super(detail)
    this.name = 'StoreContractError'
    this.code = code
  }
}

/**
 * 이 payload가 링크 종단점을 묶는 스토어인가 = **자기 documentId를 실은 v3 이상**인가.
 * 게이트의 `_binds_endpoints`와 같은 판정이며, 문서 상태에 평문 정체성을 **요구할지**를
 * 두 층이 같은 기준으로 정하기 위해 여기 둔다.
 */
export function storeBindsEndpoints(payload) {
  return Boolean(payload) && typeof payload === 'object' && !Array.isArray(payload) &&
    typeof payload.version === 'number' && payload.version >= BINDING_STORE_VERSION &&
    typeof payload.documentId === 'string' && Boolean(payload.documentId)
}

/**
 * **문서 축**의 계약 — 스토어 옆 문서 상태 파일 하나가 계약을 지키는가.
 *
 * 이 모듈은 파일 시스템을 모르므로 호출자가 읽어 온 결과만 받는다:
 *   `{ found, parsed, payload }`  (found=파일이 있는가 · parsed=JSON으로 읽혔는가)
 * 그리고 그 스토어가 **종단점을 묶는지**(`bindsEndpoints`)를 함께 받는다 — 평문 정체성은
 * 종단점을 묶을 때만 필요하기 때문이다(v1·v2 문서는 애초에 정체성이 없다).
 *
 * 규칙은 전부 **fail-closed**다: 평가할 수 없으면 결과 없음이 아니라 위반이다. 게이트가
 * 같은 세 자리를 조용히 건너뛰던 것이 N1·N2·N6이었다.
 */
export function documentStateContract(state, { bindsEndpoints = false } = {}) {
  const problems = []
  const add = (code, detail) => problems.push({ code, record: `<${DOCUMENT_FILE}>`, detail })
  if (!state || !state.found) {
    add('document-state-absent',
      `store contract: no ${DOCUMENT_FILE} next to this store — an annotation store is a ` +
        'directory, not a file: without the document state next to it no editor can open the ' +
        'store, so a gate that signs its endpoints signs endpoints nobody can reach')
    return problems
  }
  if (!state.parsed || !state.payload || typeof state.payload !== 'object' ||
      Array.isArray(state.payload)) {
    add('document-state-unparsable',
      `store contract: the ${DOCUMENT_FILE} next to this store cannot be read as an object ` +
        '(truncated merge, half-written file) — a document state the checker cannot evaluate ' +
        'is not an absent fact, it is a violation')
    return problems
  }
  const payload = state.payload
  if (typeof payload.yUpdateBase64 !== 'string' || !payload.yUpdateBase64) {
    add('document-state-unusable',
      `store contract: the ${DOCUMENT_FILE} next to this store carries no 'yUpdateBase64' ` +
        'document state — the editor has nothing to open, so its records cannot be bound back')
  }
  const plain = typeof payload.documentId === 'string' && payload.documentId
    ? payload.documentId
    : null
  if (plain === null && bindsEndpoints) {
    add('document-state-unidentified',
      `store contract: the ${DOCUMENT_FILE} next to this store carries no plaintext ` +
        "'documentId' — that field is the only surface both layers share (the commit gate does " +
        'not decode CRDT state), so a store that binds endpoints cannot be checked without it')
  }
  return problems
}

/** 문서 상태가 평문으로 싣고 있는 정체성 (없으면 null). 두 층이 공유하는 표면. */
export function plaintextDocumentId(state) {
  const payload = state && state.parsed ? state.payload : null
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) return null
  return typeof payload.documentId === 'string' && payload.documentId ? payload.documentId : null
}

/**
 * 스토어 payload 하나가 계약을 지키는가. 반환은 위반 목록(빈 배열 = 계약 통과)이며
 * **파일 순서대로** 쌓인다 — 편집기는 첫 위반에서 던지고, 성질 테스트는 전부를 본다.
 *
 * @param payload  이미 파싱된 `annotations.json` 내용
 * @param documentId  **권위 있는** 문서 정체성 (편집기는 CRDT 상태에서, 게이트는 옆
 *   `document.json`의 평문 필드에서 얻는다). 모르면 null — 그러면 스토어가 스스로 선언한
 *   값을 레코드 대조의 기준으로만 쓴다(없는 사실을 지어내지 않는다).
 * @param storeFile  메시지에 쓸 파일 이름 (기본 `annotations.json`)
 */
export function annotationStoreContract(payload, { documentId = null, storeFile = ANNOTATIONS_FILE } = {}) {
  const problems = []
  const add = (code, record, detail) => {
    problems.push({ code, record, detail })
  }
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
    add('annotations-not-an-array', '<store>', `store contract: ${storeFile} is not an annotation store`)
    return problems
  }
  const version = payload.version
  if (!SUPPORTED_STORE_VERSIONS.includes(version)) {
    // 버전을 모르면 그 뒤의 규칙이 무엇을 뜻하는지도 모른다 — 해석을 이어 가지 않는다.
    add('unsupported-version', '<store>', `unsupported store version: ${version}`)
    return problems
  }
  const records = payload.annotations
  if (!Array.isArray(records)) {
    add('annotations-not-an-array', '<store>',
      `store contract: ${storeFile} carries no 'annotations' array`)
    return problems
  }
  const claimed = typeof payload.documentId === 'string' && payload.documentId ? payload.documentId : null
  if (claimed === null && version >= BINDING_STORE_VERSION) {
    // v3 스토어는 자기 문서를 **선언해야** 한다: 종단점은 (문서, 레코드) 쌍이므로 문서를
    // 말하지 않는 v3 스토어는 어느 종단점도 이름 지을 수 없다. 게이트도 같은 자리에서
    // 스토어를 읽지 못한 것으로 처리한다(`_read_annotation_store`).
    add('store-identity-missing', '<store>',
      `store contract: a version ${version} ${storeFile} must declare its 'documentId' — ` +
        'link endpoints are bound to (document, record)')
    return problems
  }
  if (claimed !== null && documentId !== null && claimed !== documentId) {
    // 파일을 옮기는 것만으로 도달한다(병합·rename·`git mv`): 정직한 스토어가 남의 문서 옆에
    // 앉으면 스토어의 선언과 그 자리의 문서가 어긋난다(실측: vnv X1).
    add('store-document-mismatch', '<store>',
      `store contract: ${storeFile} claims document ${JSON.stringify(claimed)} but the persisted ` +
        'document state says otherwise')
  }
  // 레코드 대조의 기준은 **그 레코드의 스토어가 선언한 값**이다. 스토어가 아무것도 선언하지
  // 않을 때만 권위 있는 값으로 내려간다. 이 순서가 중요하다: 스토어를 통째로 남의 문서 옆으로
  // 옮기면 어긋난 것은 **스토어의 자리**이지 레코드가 아니므로, 그 사실은 바로 위의
  // store-document-mismatch 한 건으로 보고돼야 한다(레코드마다 위반을 복제하지 않는다).
  const authority = claimed !== null ? claimed : documentId
  const seen = new Set()
  records.forEach((record, position) => {
    const at = label(position)
    if (!record || typeof record !== 'object' || Array.isArray(record)) {
      // 검사기가 **해석하지 못한** 레코드는 건너뛸 대상이 아니라 위반이다: 건너뛰는 순간
      // 게이트가 서명한 스토어를 편집기가 열지 못한다(실측: vnv X2c).
      add('record-not-an-object', at,
        `store contract: record ${at} is not an object — a store the editor cannot read is not a ` +
          'lighter store, it is a store whose endpoints nobody can name')
      return
    }
    if (typeof record.id !== 'string' || !record.id) {
      add('record-id-missing', at,
        `store contract: record ${at} carries no string id — one endpoint names exactly one ` +
          'record, and a record with no name cannot be named')
      return
    }
    const id = record.id
    if (seen.has(id)) {
      // 종단점 하나에 레코드 하나. 어느 쪽을 고를지 정하는 대신 양쪽 다 거절한다(vnv H4).
      add('duplicate-record-id', id,
        `store contract: two records share the id ${JSON.stringify(id)} — one endpoint ` +
          'names exactly one record, so a duplicated id is a conflict, not a choice')
      return
    }
    seen.add(id)
    if (version !== STORE_VERSION) return
    const anchors = record.anchors
    if (!anchors || typeof anchors !== 'object' || Array.isArray(anchors)) {
      add('record-no-anchors', id,
        `store contract: record ${id} carries no anchors object, so it cannot say whose it is`)
      return
    }
    const own = anchors.document && typeof anchors.document.id === 'string' && anchors.document.id
      ? anchors.document.id
      : null
    if (own === null) {
      // 강등 표시가 있는 미상 레코드는 그대로 읽는다(입양 금지의 sticky 쪽). 표시 없이
      // 정체성만 없는 레코드는 "왜 미상인지" 말하지 못하므로 계약 위반이다.
      if (anchors.legacy) return
      add('record-unmarked-identity', id, `store contract: record ${id} carries no document identity`)
      return
    }
    if (authority !== null && own !== authority) {
      add('record-foreign-document', id, `store contract: record ${id} belongs to another document`)
    }
  })
  return problems
}

/** 계약을 어기면 **첫 위반의 사유로** 던진다 — 편집기의 로드는 부분 수용이 없다. */
export function assertAnnotationStoreContract(payload, options = {}) {
  const [first] = annotationStoreContract(payload, options)
  if (first) throw new StoreContractError(first.code, first.detail)
  return payload
}
