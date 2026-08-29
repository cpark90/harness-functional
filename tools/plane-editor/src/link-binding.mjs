/**
 * 링크 종단점 **바인딩** — 주석 종단점이 가리키는 문서 안의 자리를 실제로 계산한다.
 *
 * 링크 레코드는 위치를 저장하지 않는다. 저장하면 문서가 편집될 때 링크 쪽 사본만 낡아
 * 두 벌이 갈리고, 그 순간 링크는 아무도 편집하지 않은 옛 자리를 가리킨다. 그래서 종단점은
 * 레코드가 **이미 가진** 앵커 부분을 이름으로 참조하고(`anchor: textQuote | blockContext`),
 * 실제 좌표·텍스트는 필요할 때 여기서 파생한다.
 *
 * ## 왜 이 층이 편집기 쪽에 있나 (불변식 I-1)
 *
 * 커밋 게이트(`check_links.py`)는 CRDT를 해독하지 않는다 — 그것이 선언된 경계다. 그래서
 * 게이트는 종단점의 **형식**과 "레코드가 그 부분을 싣는가"까지만 보고, 위치로의 해소는
 * 문서 상태를 여는 이 층이 한다. 그리고 **게이트 exit 0은 바인딩의 필요조건이지 충분조건이
 * 아니다**: 문서 상태의 평문과 CRDT가 어긋나거나 `yUpdateBase64`의 내용이 유효한 업데이트가
 * 아니면 게이트는 초록을 주는데 `loadStore`는 그 스토어를 열지 못한다(실측: vnv M1·M1b·M2).
 * 그래서 규칙은 하나다:
 *
 *   **바인딩은 `loadStore`가 연 스토어에만 건다.** 스토어마다 `loadStore`를 정확히 한 번
 *   부르고(`counts.loadStoreCalls`가 그 사실을 판정 JSON에 싣는다), 게이트가 그 스토어를
 *   거절했거나 `loadStore`가 거절하면 그 스토어의 바인딩은 **0**이며 사유가 남는다.
 *   평가할 수 없는 종단점은 "결과 없음"이 아니라 **바인딩 실패**다(exit 1).
 *
 * ## 이 명령 **단독**으로도 fail-closed 여야 한다 (전제 셋)
 *
 * 위 규율은 "게이트와 함께 쓰면 안전하다"까지만 보장했고, 그래서 `bind-links`의 산출만 읽는
 * 소비자에게는 세 자리에서 조용한 초록이 나갔다(실측: vnv 8차 W1·W3·W4). 세 자리 다 바인더가
 * **자기 전제를 좁게 잡은** 탓이므로 전제를 명시적으로 확인한다:
 *
 *   1. **게이트의 전역 판정이 초록이어야 한다.** 스토어별 규칙(`PER_STORE_GATE_RULES`)만
 *      보면 스토어 **사이**의 사실(`annotation-store-duplicate-document`)과 링크 평면 전역
 *      위반(`link-type-unknown` 등)이 통째로 빠진다 — 게이트가 exit 1인데 바인더가 PASS를
 *      냈다(W4). 전역이 빨강이면 어떤 스토어도 **열지 않고** 종단점마다 사유를 남긴다.
 *   2. **한 문서를 선언한 스토어는 정확히 하나여야 한다.** 후보가 둘이면(백업 사본·export·
 *      두 번째 체크아웃) 예전 코드는 발견 순서로 한쪽을 골랐고, 그래서 사본 디렉토리 **이름**을
 *      바꾸면 같은 링크가 다른 문장을 가리켰다(W3a/W3b). 모호하면 고르지 않고 **거절한다** —
 *      오부착 불허 > 복구율.
 *   3. **앵커 이름은 해소표의 own key로만 조회한다.** 평범한 객체 리터럴은 `Object.prototype`을
 *      상속하므로 `anchor: "constructor"`가 함수로 조회돼 좌표 없는 "bound" 행이 나왔다(W1).
 *      이름의 출처는 링크 파일 = 신뢰하지 않는 입력이다.
 *
 * 종단점이 위치를 가리키는가는 **키의 존재**로 판정한다(`Object.hasOwn(ep, 'anchor')`) —
 * 값의 truthiness가 아니다. `if (!ep.anchor)`였던 동안 `anchor: ""`·`anchor: 0`·`anchor: null`
 * 은 앵커 종단점 집합에서 조용히 빠져 "레코드만 가리키는 종단점"으로 강등됐고, 그래서
 * `anchorEndpoints 0 · unbound 0`으로 **없던 일이 됐다**(실측: vnv 9차 X2·X3). 게이트를 무르게
 * 한 반사실에서는 그 자리가 `pass: true · exit 0`이었다 — "이 명령 단독으로도 fail-closed"의
 * 유일한 예외였다. 게이트는 처음부터 키의 존재로 판정하므로(`"anchor" in ep` -> 닫힌 집합
 * 밖이면 `link-endpoint-plane`), 이제 두 층이 **같은 종단점 집합**을 본다.
 *
 * 사유의 **우선순위**는 좁은 것 -> 넓은 것이다(앵커 이름 -> 문서 모호 -> 그 스토어에 대한
 * 게이트 위반 -> 게이트 전역 판정 -> `loadStore` -> 레코드 수준). 전역 거절을 먼저 놓으면
 * 좁은 가드가 전부 그 뒤에 가려져 다시는 측정되지 않는다. 대신 전역 거절이 개별 사유를
 * **덮지 않도록** 거절 행마다 사유를 두 층으로 싣는다: `reason`(위 순서가 정한 판정 사유,
 * 소비자의 계약)과 `reasons.{endpoint, plane}` + `gateViolations`(그 종단점 자신에 대해
 * 게이트가 낸 규칙). 링크 하나가 나빠 평면이 거절되면 나머지 종단점은 `reasons.endpoint:
 * null`로 "**게이트가 볼 수 있는** 잘못은 없다"를 말한다(실측: vnv 9차 Y2 — 좋은 링크 2개가
 * 평면 사유 하나로 덮였다). 그 `null`의 뜻을 "자기 잘못 없음"으로 넓혀 읽으면 안 된다:
 * 전역 거절 아래에서 이 층은 스토어를 **열지 않으므로**(전제 1) 편집기만 아는 축은 애초에
 * 평가되지 않는다(실측: vnv 10차 Z3d). 그 범위를 문장에 못 박은 것이 `NO_GATE_VISIBLE_FAULT`
 * 이고, 판정 자체는 그대로 fail-closed다 — exit 은 1이고 바인딩은 0이다.
 *
 * ## 해소는 기존 규칙을 그대로 탄다 (우회 경로 없음)
 *
 * 위치 계산은 `resolveAnchors`(strict) 한 번뿐이다 — 규칙 0(문서 정체성)·구조적 guard·
 * 출처 증거·블록 정체성이 전부 그대로 적용된다. 이 층은 **새 복구 경로를 만들지 않는다**:
 *   - `textQuote`    : strict 해소가 준 범위 그대로.
 *   - `blockContext` : 그 범위가 **지금 들어 있는 블록**. 그 블록의 CRDT item id가 레코드가
 *     캡처한 블록의 item id와 다르면 바인딩하지 않고 orphan으로 낸다(문단이 갈라지거나
 *     합쳐진 자리에서 남의 문단을 가리키지 않기 위해서다 — 오해소 불허 > 복구율).
 * 앵커가 orphan이면 그것은 **위반이 아니라 상태**다: 지우지도, 다른 곳에 다시 겨누지도
 * 않고 사유와 함께 보고한다(게이트의 `brokenEndpoints`와 같은 규율).
 */
import { basename, dirname, resolve } from 'node:path'

import { resolveAnchors } from './anchors.mjs'
import { liveBlocks } from './blocks.mjs'
import { openSession } from './session.mjs'
import { loadStore } from './store.mjs'
import { PER_STORE_GATE_RULES } from './store-contract.mjs'
import { offsetToPos, posToOffset } from './text-index.mjs'
import {
  DEFAULT_STORE_DIR,
  PLANE_EDITOR_DIR,
  checkLinkStore,
  loadLinkStore,
  loadPlaneContract,
} from './link-plane.mjs'

export const REPO_ROOT = resolve(PLANE_EDITOR_DIR, '..', '..')

/**
 * 바인더 세션의 clientID. 바인더는 문서를 **쓰지 않으므로** 이 값은 상태에 들어가지 않는다.
 * 그래도 고정 상수인 이유는 결정론이다 — Yjs가 난수 clientID를 고르면 같은 입력에서 다른
 * 산출이 나올 여지가 생긴다.
 */
export const BINDER_CLIENT_ID = 9001

/**
 * `reasons.endpoint === null`을 사람이 읽는 채널에서 뭐라 부를 것인가. **주장의 범위**를
 * 문장에 못 박는다: 이 층은 전역 거절 아래에서 스토어를 열지 않으므로(전제 1), 여기서 말할
 * 수 있는 것은 "게이트가 이 종단점에 대해 낸 규칙이 없다"뿐이다.
 *
 * 한때 이 문장은 "no violation of its own"(자기 잘못 없음)이었고 그것은 **과잉 안심**이었다:
 * 게이트가 원리적으로 못 보는 축(편집기만 아는 `loadStore` 거절 — 선언된 전제 두 줄)에서는
 * 자기 잘못이 있는 종단점도 같은 문장을 받았다(실측: vnv 10차 Z3d. 같은 스토어에서 나쁜
 * 링크를 빼면 그 종단점의 사유는 `store-refused:document-state-unopenable`이다). 판정·exit은
 * 어느 쪽이든 fail-closed였으므로 이것은 **문구가 곧 의미**인 자리다.
 */
export const NO_GATE_VISIBLE_FAULT =
  'no violation the gate can see — the plane was refused elsewhere; this layer never opened ' +
  'the store, so faults only the editor can see are unchecked'

/** 보고용 경로 — repo 안이면 상대 경로 (`check_links.py _repo_path`와 같은 규약). */
export function repoPath(path) {
  const absolute = resolve(path)
  const prefix = `${REPO_ROOT}/`
  return absolute.startsWith(prefix) ? absolute.slice(prefix.length) : absolute
}

/**
 * 앵커 부분 이름 -> 그 부분이 문서에서 차지하는 범위. **해소는 인자로 받은 것 하나뿐**이고
 * (`resolution` = strict `resolveAnchors`의 결과) 여기서 문서를 다시 뒤지지 않는다.
 *
 * 목록은 게이트의 계약 표면(`endpointAnchors`)이 소유한다. 여기 키가 그 목록과 어긋나면
 * 스위트가 그 자리에서 FAIL한다(한쪽만 늘리는 것을 막는 자리 — `run-link-checks.mjs` C12).
 *
 * 표에 **prototype이 없다**(`Object.create(null)`): 객체 리터럴이었을 때는 `Object.prototype`의
 * 이름 12개가 전부 조회에 걸려, `anchor: "constructor"`는 `Object`를 해소기로 받아 좌표 없는
 * "bound" 행을 만들고 `anchor: "toString"`은 `x resolver is not a function`으로 죽었다
 * (실측: vnv W1·W2). 선언한 이름만 조회되게 하는 것은 목록 대조(C12)로는 못 잡는다 —
 * `Object.keys`는 상속 키를 보지 않기 때문이다. 그래서 **표의 모양**으로 닫는다.
 */
export const ANCHOR_PART_RESOLVERS = Object.freeze(Object.assign(Object.create(null), {
  textQuote(session, anchors, resolution) {
    return {
      from: resolution.from,
      to: resolution.to,
      text: resolution.text,
      // 캡처 당시 인용문. 편집으로 달라졌으면 그 사실이 보여야 한다(조용한 동일시 금지).
      captured: anchors.textQuote ? anchors.textQuote.exact : null,
      blockItemId: null,
    }
  },
  blockContext(session, anchors, resolution) {
    const { index, blocks } = liveBlocks(session)
    const textFrom = posToOffset(index, resolution.from)
    const textTo = posToOffset(index, resolution.to)
    const block = blocks.find((item) => textFrom >= item.textFrom && textTo <= item.textTo) ?? null
    if (!block) {
      return { orphanReason: 'anchor-spans-more-than-one-block' }
    }
    const captured = anchors.blockContext ? anchors.blockContext.itemId : null
    if (captured !== null && block.itemId !== captured) {
      // 블록이 갈라지거나 합쳐져 앵커가 **다른 블록**에 들어갔다. 그 블록은 레코드가 캡처한
      // 문단이 아니므로 문단 단위 종단점으로 내주지 않는다 (조용한 오부착 금지).
      return { orphanReason: 'block-identity-changed' }
    }
    return {
      from: offsetToPos(index, block.textFrom),
      to: offsetToPos(index, block.textTo),
      text: block.text,
      captured: anchors.blockContext ? anchors.blockContext.text : null,
      blockItemId: block.itemId,
    }
  },
}))

/**
 * 이름 하나를 해소기로 바꾼다 — **표의 own key이고 함수일 때만**. 그 밖은 전부 `null`(거절)
 * 이며, 이름이 문자열이 아닌 경우도 여기서 걸린다. 조회를 이 함수 하나로 좁혀 두는 이유는
 * 위 표의 머리말과 같다: 상속 키가 "선언되지 않았는데 조회되는" 자리를 남기지 않기 위해서다.
 */
export function resolverFor(name) {
  if (typeof name !== 'string' || !Object.hasOwn(ANCHOR_PART_RESOLVERS, name)) return null
  const resolver = ANCHOR_PART_RESOLVERS[name]
  return typeof resolver === 'function' ? resolver : null
}

/** 게이트가 그 스토어 하나에 대해 낸 위반 (스토어 사이의 사실·종단점 해소는 제외). */
function gateRulesFor(verdict, shownPath) {
  return [...new Set(verdict.violations
    .filter((v) => PER_STORE_GATE_RULES.includes(v.rule) && v.detail.includes(shownPath))
    .map((v) => v.rule))].sort()
}

/**
 * 게이트가 **이 종단점**을 짚어 낸 위반. 링크 평면이 전역으로 거절되면 종단점마다의 사유가
 * 평면 사유 하나로 덮여 진단력이 떨어진다(실측: vnv 9차 Y2 — 좋은 링크 2개가 나쁜 링크 하나
 * 때문에 `link-plane-refused-by-the-gate:…`로 통일됐다). 그래서 전역 거절에서도 이 값을 함께
 * 실어 "이 종단점 자신에게 잘못이 있는가"를 남긴다 — 판정(exit)은 그대로 1이다.
 *
 * 짝짓기는 게이트가 **자기 판정 JSON에 실어 준 필드**로만 한다(`record` = 링크 id,
 * `endpoint` = `plane:ref`): detail 문자열을 뒤지면 게이트의 산문에 의존하게 된다.
 * `endpoint`가 빈 문자열인 위반은 링크 전체에 대한 것이므로 양쪽 종단점에 함께 붙인다.
 */
function gateViolationsFor(verdict, linkId, ep) {
  const shown = `${ep.plane}:${ep.ref}`
  return [...new Set(verdict.violations
    .filter((v) => v.record === linkId && (v.endpoint === '' || v.endpoint === shown))
    .map((v) => v.rule))].sort()
}

/**
 * 스토어를 **한 번만** 연다. 반환은 열림의 사실과 그 사유이며, 실패해도 던지지 않는다 —
 * 던지면 스토어 하나가 나머지 전부의 바인딩을 가린다.
 */
function openStore(entry) {
  const path = resolve(REPO_ROOT, entry.path)
  const dir = dirname(path)
  const storeFile = basename(path)
  try {
    const store = loadStore(dir, { storeFile })
    const session = openSession({ update: store.docUpdate, clientID: BINDER_CLIENT_ID })
    return { store, session, opened: true, refusal: null }
  } catch (error) {
    return { store: null, session: null, opened: false, refusal: error.code ?? '<threw>' }
  }
}

/**
 * 링크 스토어 하나의 주석 종단점을 문서 위치로 바인딩한다.
 *
 * 판정 범위(어떤 주석 스토어가 이 스토어의 종단점을 해소하는가)는 **게이트가 정한다** —
 * 발견 규칙(I-3)을 여기서 다시 구현하면 두 층이 다른 집합을 보게 되기 때문이다.
 */
export function bindLinkStore({ storeDir = DEFAULT_STORE_DIR, annotations = [], env = {} } = {}) {
  const links = loadLinkStore(storeDir).links
  const verdict = checkLinkStore({ storeDir, annotations, env })
  const contract = loadPlaneContract({ env })
  const parts = [...contract.endpointAnchors].sort()

  /**
   * ★ 전제 1 — 게이트의 **전역** 판정. 스토어별 규칙만 보면 스토어 사이의 사실과 링크 평면
   * 전역 위반이 빠져 빨간 게이트 위에 초록이 나갔다(vnv W4). 여기서 그 판정을 값으로 싣고,
   * 빨강이면 어떤 스토어도 열지 않는다 — 문서가 아니라 **링크 평면 자체**를 못 믿는 자리다.
   */
  const gate = {
    pass: verdict.pass === true && verdict.exitCode === 0,
    exitCode: verdict.exitCode,
    violations: [...new Set(verdict.violations.map((v) => v.rule))].sort(),
  }
  const planeRefusal = gate.pass
    ? null
    : `link-plane-refused-by-the-gate:${gate.violations.join(',') || `exit-${gate.exitCode}`}`

  const byDocument = new Map()
  const stores = []
  for (const entry of verdict.annotationStores) {
    const row = {
      path: entry.path,
      documentId: entry.documentId,
      records: entry.records,
      bindsEndpoints: entry.bindsEndpoints,
      gate: gateRulesFor(verdict, entry.path),
      // 같은 documentId 를 선언한 스토어가 또 있는가 (아래에서 채운다). 사람이 읽는 표가
      // 진 후보를 "아무 종단점도 필요로 하지 않음"으로 감추지 않게 하려는 값이기도 하다.
      ambiguous: false,
      // 아래 세 값은 실제로 열어 본 뒤에만 채워진다 (열지 않은 스토어는 null 로 남는다).
      opened: null,
      refusal: null,
      bindings: 0,
    }
    stores.push(row)
    if (entry.documentId !== null) {
      const found = byDocument.get(entry.documentId)
      if (found) found.push(row)
      else byDocument.set(entry.documentId, [row])
    }
  }

  /**
   * ★ 전제 2 — 한 문서를 선언한 스토어가 둘 이상이면 **고르지 않는다**. 예전에는 발견
   * 순서(first-wins)로 한쪽을 골랐고, 그래서 사본 디렉토리 이름을 바꾸는 것만으로 같은
   * 링크의 답이 뒤집혔다(vnv W3a/W3b). 모호한 문서는 종단점마다 사유를 남기고 거절한다.
   */
  const ambiguousDocuments = []
  for (const [documentId, rows] of byDocument) {
    if (rows.length < 2) continue
    for (const row of rows) row.ambiguous = true
    ambiguousDocuments.push({ documentId, stores: rows.map((row) => row.path).sort() })
  }
  ambiguousDocuments.sort((a, b) => (a.documentId < b.documentId ? -1 : 1))

  const sessions = new Map()
  let loadStoreCalls = 0
  const openFor = (row) => {
    if (sessions.has(row.path)) return sessions.get(row.path)
    loadStoreCalls += 1
    const handle = openStore(row)
    row.opened = handle.opened
    row.refusal = handle.refusal
    sessions.set(row.path, handle)
    return handle
  }

  const bindings = []
  const unbound = []
  /**
   * 평가하지 못한 종단점 하나. 사유는 **두 층**으로 싣는다 — 위 우선순위(좁은 것 -> 넓은 것)가
   * 정한 `reason`은 그대로 두고(그 배치가 곧 각 가드의 생사다), 전역 거절이 개별 사유를 덮지
   * 않도록 `reasons.endpoint`에 이 종단점 자신의 사유를 함께 남긴다. `null`의 뜻은 정확히
   * **"게이트가 이 종단점에 대해 낸 규칙이 없다"** 이지 "자기 잘못이 없다"가 아니다: 전역
   * 거절 아래에서는 스토어를 열지 않으므로 편집기만 아는 축은 평가되지 않는다(`NO_GATE_
   * VISIBLE_FAULT` 머리말 · vnv 10차 Z3d).
   */
  const refusal = (row, reason, gateViolations) => ({
    ...row,
    reason,
    // 게이트가 이 종단점(또는 그 링크)을 짚어 낸 규칙. 붙은 종단점에서는 언제나 비므로
    // (전역이 초록일 때만 연다) 거절 행에만 싣는다.
    gateViolations,
    reasons: {
      endpoint: reason !== planeRefusal
        ? reason
        : (gateViolations.length > 0
          ? `endpoint-refused-by-the-gate:${gateViolations.join(',')}`
          : null),
      plane: planeRefusal,
    },
  })
  let recordEndpoints = 0
  for (const link of links) {
    for (const side of ['from', 'to']) {
      const ep = link[side]
      if (!ep || ep.plane !== 'annotation') continue
      // 위치를 가리키는 종단점인가는 **키의 존재**로 정한다 (머리말): 값의 truthiness 로 보면
      // `anchor: ""`·`0`·`null` 이 종단점 집합에서 조용히 사라진다(vnv 9차 X2·X3). 게이트도
      // `"anchor" in ep` 로 보므로 이제 두 층이 같은 집합을 센다.
      if (!Object.hasOwn(ep, 'anchor')) {
        recordEndpoints += 1
        continue
      }
      const row = { link: link.id, side, document: ep.document ?? null, record: ep.ref, anchor: ep.anchor }
      const gateViolations = gateViolationsFor(verdict, link.id, ep)
      const refuse = (reason) => unbound.push(refusal(row, reason, gateViolations))
      // ★ 전제 3: 이름은 해소표의 **own key** 일 때만 해소기가 된다. 종단점 하나만 보면 되는
      //   사실이므로 스토어를 열기 전에 답한다 (상속 키는 여기서 전부 거절된다).
      const resolver = resolverFor(ep.anchor)
      if (!resolver) {
        refuse(`anchor-part-has-no-resolver:${ep.anchor}`)
        continue
      }
      const candidates = ep.document ? byDocument.get(ep.document) ?? [] : []
      if (candidates.length === 0) {
        refuse('no-store-in-scope-declares-this-document')
        continue
      }
      if (candidates.length > 1) {
        // ★ 전제 2: 후보가 둘이면 발견 순서가 답을 정한다 — 고르는 대신 거절한다.
        refuse(`document-declared-by-${candidates.length}-annotation-stores`)
        continue
      }
      const store = candidates[0]
      row.store = store.path
      if (store.gate.length > 0) {
        // 게이트가 **그 스토어 하나**에 대해 낸 위반. 전역 사유보다 좁으므로 먼저 답한다
        // (좁은 사유가 전역 사유에 가려지면 그 자리는 다시 측정되지 않는다).
        store.opened = false
        store.refusal = `gate:${store.gate.join(',')}`
        refuse(`store-refused:${store.refusal}`)
        continue
      }
      if (planeRefusal !== null) {
        // ★ 전제 1: 게이트가 링크 평면 전체를 거절했다 — 스토어를 열지 않는다.
        // 종단점별 사유는 `reasons.endpoint`에 함께 실린다 (exit 은 1 그대로).
        refuse(planeRefusal)
        continue
      }
      const handle = openFor(store)
      if (!handle.opened) {
        // ★ I-1: 게이트가 서명했더라도 편집기가 열지 못하면 바인딩은 0이고 사유가 남는다.
        refuse(`store-refused:${handle.refusal}`)
        continue
      }
      // 아래 두 사유(레코드 부재·앵커 부분 미실림)는 **게이트가 초록일 때만** 도달한다:
      // 같은 사실에 게이트도 규칙을 갖고 있으므로(`record-endpoint-missing` ·
      // `annotation-anchor-missing`) 보통은 위의 전제 1에서 먼저 걸린다. 그래도 남겨 두는
      // 이유는 이 층이 게이트의 규칙 집합이 완전하다는 가정 위에 서지 않기 위해서다 —
      // 게이트 규칙이 퇴화해도 여기서 묶이지 않는다.
      const record = handle.store.annotations.find((item) => item.id === ep.ref) ?? null
      if (record === null) {
        refuse('no-such-record-in-the-opened-store')
        continue
      }
      const anchors = record.anchors ?? null
      const carries = anchors !== null && (
        ep.anchor === 'textQuote'
          ? Boolean(anchors.textQuote && anchors.textQuote.exact)
          : Boolean(anchors.blockContext && anchors.blockContext.itemId))
      if (!carries) {
        // 게이트의 `annotation-anchor-missing`과 같은 자리 (두 층이 같은 답을 낸다).
        refuse('anchor-part-missing-from-the-record')
        continue
      }
      const resolution = resolveAnchors(handle.session, anchors, { counterfactuals: false })
      if (resolution.method === 'orphaned') {
        bindings.push({
          ...row,
          state: 'orphaned',
          recordState: record.anchorState ?? null,
          reason: resolution.reason,
          method: null,
          from: null,
          to: null,
          text: null,
          captured: null,
          blockItemId: null,
        })
        continue
      }
      const placed = resolver(handle.session, anchors, resolution)
      if (placed.orphanReason) {
        bindings.push({
          ...row,
          state: 'orphaned',
          recordState: record.anchorState ?? null,
          reason: placed.orphanReason,
          method: resolution.method,
          from: null,
          to: null,
          text: null,
          captured: null,
          blockItemId: null,
        })
        continue
      }
      store.bindings += 1
      bindings.push({
        ...row,
        state: 'bound',
        recordState: record.anchorState ?? null,
        reason: null,
        method: resolution.method,
        from: placed.from,
        to: placed.to,
        text: placed.text,
        captured: placed.captured,
        blockItemId: placed.blockItemId,
      })
    }
  }
  for (const handle of sessions.values()) {
    if (handle.session) handle.session.close()
  }

  const order = (a, b) => (a.link < b.link ? -1 : a.link > b.link ? 1 : a.side < b.side ? -1 : 1)
  bindings.sort(order)
  unbound.sort(order)
  const orphaned = bindings.filter((row) => row.state === 'orphaned')
  return {
    store: repoPath(storeDir),
    gate,
    anchorParts: parts,
    counts: {
      links: links.length,
      // 위치를 가리키는 종단점 / 레코드까지만 가리키는 주석 종단점. 가르는 것은 `anchor`
      // **키의 존재**다 (값이 falsy 여도 앵커 종단점이며, 해소되지 않으면 unbound 다).
      anchorEndpoints: bindings.length + unbound.length,
      recordEndpoints,
      bound: bindings.length - orphaned.length,
      orphaned: orphaned.length,
      unbound: unbound.length,
      annotationStores: stores.length,
      // 같은 documentId 를 선언한 스토어가 둘 이상인 문서의 수 (전부 거절된다).
      ambiguousDocuments: ambiguousDocuments.length,
      // 스토어당 한 번 (I-1). 열지 않은 스토어는 세지 않는다.
      loadStoreCalls,
      storesOpened: stores.filter((row) => row.opened === true).length,
    },
    ambiguousDocuments,
    annotationStores: stores,
    bindings,
    unbound,
    // 평가할 수 없는 종단점이 하나라도 있으면 실패다: 게이트가 서명한 위치를 편집기가 열지
    // 못한 것이므로, 조용한 초록이 아니라 사유 있는 빨강이어야 한다. 그리고 **게이트의 전역
    // 판정이 빨강이면 이 명령도 빨강이다** — 종단점이 하나도 없더라도(vnv W4·V2).
    pass: unbound.length === 0 && gate.pass,
  }
}

export { DEFAULT_STORE_DIR }
