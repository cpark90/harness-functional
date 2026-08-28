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
 */
export const ANCHOR_PART_RESOLVERS = Object.freeze({
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
})

/** 게이트가 그 스토어 하나에 대해 낸 위반 (스토어 사이의 사실·종단점 해소는 제외). */
function gateRulesFor(verdict, shownPath) {
  return [...new Set(verdict.violations
    .filter((v) => PER_STORE_GATE_RULES.includes(v.rule) && v.detail.includes(shownPath))
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

  const byDocument = new Map()
  const stores = []
  for (const entry of verdict.annotationStores) {
    const row = {
      path: entry.path,
      documentId: entry.documentId,
      records: entry.records,
      bindsEndpoints: entry.bindsEndpoints,
      gate: gateRulesFor(verdict, entry.path),
      // 아래 세 값은 실제로 열어 본 뒤에만 채워진다 (열지 않은 스토어는 null 로 남는다).
      opened: null,
      refusal: null,
      bindings: 0,
    }
    stores.push(row)
    if (entry.documentId !== null && !byDocument.has(entry.documentId)) {
      byDocument.set(entry.documentId, row)
    }
  }

  const sessions = new Map()
  let loadStoreCalls = 0
  const openFor = (row) => {
    if (sessions.has(row.path)) return sessions.get(row.path)
    let handle
    if (row.gate.length > 0) {
      // 게이트가 거절한 스토어는 열지 않는다: 게이트 통과는 바인딩의 **필요조건**이다.
      handle = { store: null, session: null, opened: false, refusal: `gate:${row.gate.join(',')}` }
    } else {
      loadStoreCalls += 1
      handle = openStore(row)
    }
    row.opened = handle.opened
    row.refusal = handle.refusal
    sessions.set(row.path, handle)
    return handle
  }

  const bindings = []
  const unbound = []
  let recordEndpoints = 0
  for (const link of links) {
    for (const side of ['from', 'to']) {
      const ep = link[side]
      if (!ep || ep.plane !== 'annotation') continue
      if (!ep.anchor) {
        recordEndpoints += 1
        continue
      }
      const row = { link: link.id, side, document: ep.document ?? null, record: ep.ref, anchor: ep.anchor }
      const store = ep.document ? byDocument.get(ep.document) : undefined
      if (!store) {
        unbound.push({ ...row, reason: 'no-store-in-scope-declares-this-document' })
        continue
      }
      row.store = store.path
      const handle = openFor(store)
      if (!handle.opened) {
        // ★ I-1: 게이트가 서명했더라도 편집기가 열지 못하면 바인딩은 0이고 사유가 남는다.
        unbound.push({ ...row, reason: `store-refused:${handle.refusal}` })
        continue
      }
      const record = handle.store.annotations.find((item) => item.id === ep.ref) ?? null
      if (record === null) {
        unbound.push({ ...row, reason: 'no-such-record-in-the-opened-store' })
        continue
      }
      const resolver = ANCHOR_PART_RESOLVERS[ep.anchor]
      if (!resolver) {
        unbound.push({ ...row, reason: `anchor-part-has-no-resolver:${ep.anchor}` })
        continue
      }
      const anchors = record.anchors ?? null
      const carries = anchors !== null && (
        ep.anchor === 'textQuote'
          ? Boolean(anchors.textQuote && anchors.textQuote.exact)
          : Boolean(anchors.blockContext && anchors.blockContext.itemId))
      if (!carries) {
        // 게이트의 `annotation-anchor-missing`과 같은 자리 (두 층이 같은 답을 낸다).
        unbound.push({ ...row, reason: 'anchor-part-missing-from-the-record' })
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
    anchorParts: parts,
    counts: {
      links: links.length,
      // 위치를 가리키는 종단점 / 레코드까지만 가리키는 주석 종단점.
      anchorEndpoints: bindings.length + unbound.length,
      recordEndpoints,
      bound: bindings.length - orphaned.length,
      orphaned: orphaned.length,
      unbound: unbound.length,
      annotationStores: stores.length,
      // 스토어당 한 번 (I-1). 열지 않은 스토어는 세지 않는다.
      loadStoreCalls,
      storesOpened: stores.filter((row) => row.opened === true).length,
    },
    annotationStores: stores,
    bindings,
    unbound,
    // 평가할 수 없는 종단점이 하나라도 있으면 실패다: 게이트가 서명한 위치를 편집기가 열지
    // 못한 것이므로, 조용한 초록이 아니라 사유 있는 빨강이어야 한다.
    pass: unbound.length === 0,
  }
}

export { DEFAULT_STORE_DIR }
