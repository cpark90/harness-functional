/**
 * Anchors = Selector 다중화 (tool_suggestion v0.2 §7).
 *
 * 저장되는 selector (v2 레코드):
 *   1. Yjs RelativePosition (start/end) — 주앵커. 편집·오프라인 병합을 견딘다.
 *   2. TextQuoteSelector (exact/prefix/suffix) — **보조 검증용**. 문자열 일치는
 *      동일성 증거가 아니므로 단독 복구 근거로 쓰지 않는다.
 *   3. capture.stateVector — 캡처 시점의 CRDT 기준점. 문자 출처·생성 판정의 원점이다.
 *      블록 경계를 걸친 앵커에도 **항상** 저장한다 (v1은 이걸 블록 문맥 안에 넣어
 *      두어서, 경계를 걸친 앵커는 출처를 아예 못 읽었다).
 *   4. blockContext (블록 텍스트·블록 안 오프셋·**블록 item id**) — 블록 정체성.
 *      앵커가 블록 경계를 걸치면 null.
 *
 * 해소 규칙 (오해소 0이 절대 기준 — 조용한 오부착보다 명시적 orphan이 항상 낫다):
 *
 *   A. 주앵커가 살아 돌아오면 **구조적 affix guard**를 통과해야 채택한다.
 *      두 조건을 함께 요구한다.
 *        (1) 문자열 구조 — 해소된 텍스트가 저장된 exact의 "앞 조각 + 뒤 조각"으로
 *            설명돼야 한다 (`head + tail >= min(길이)`, 최소 MIN_GUARD_EVIDENCE자).
 *            삽입으로 늘어난 범위·삭제로 줄어든 잔여 범위는 통과하고, 그 자리에
 *            새로 타이핑된 무관한 텍스트는 탈락한다.
 *        (2) 문자 출처 — 그 범위에 **캡처 시점부터 있던 문자**가 하나라도 남아야
 *            한다. 문자열만 보면 "가운데를 지운 잔여 텍스트"와 "그 자리에 새로 친
 *            짧은 텍스트"가 같아 보이지만(`Critical failure` -> `Cure`), CRDT는
 *            둘을 구분한다 (src/blocks.mjs `rangeOrigins`).
 *            **출처를 모르면 통과가 아니라 거절이다** (v1 레코드·증거 없는 범위).
 *            유일한 예외는 해소 텍스트가 exact와 **완전히 같을 때** — 그때는 문자가
 *            그대로이므로 추가 증거를 요구하지 않는다.
 *
 *   B. 주앵커가 실패한 방식이 **삭제 증거**면 복구를 돌리지 않고 orphan으로
 *      확정한다. 삭제 증거는 세 가지다:
 *        - `collapsed`        : 양끝이 한 점으로 모임 = CRDT가 문자 삭제를 증언
 *        - `resolved` + guard 거절 : 자리는 살아 있는데 내용이 딴 것 = 제자리 교체
 *        - `error`            : 판독 불가
 *      이때 quote 복구를 돌리면 같은 문자열의 **다른 출현**에 붙는다(측정된
 *      실패: S5/a6, S10 전 앵커).
 *
 *   C. `unresolved`(주앵커의 블록 자체가 사라짐)일 때는 **정체성이 증명될 때만**
 *      복구한다: 저장된 블록 item id가 지금 문서에서 **살아 있는 블록**으로 조회되고,
 *      그 블록 텍스트·오프셋의 exact까지 맞아야 한다. 텍스트 동일성은 보조 검증이지
 *      정체성 증거가 아니다 — D3가 재는 대로 **블록 이동(cut+paste)과 같은 문장
 *      재타이핑은 Yjs 업데이트가 byte 단위로 같다**. 그래서 "같은 텍스트 블록이 새로
 *      생겼다"로 복구하면 재타이핑(N4)·쌍둥이 이동(N1)·원격 피어 작성(N3)이 전부
 *      남의 문장에 붙는다. 정체성이 파괴된 뒤에는 **복구하지 않는다**.
 *      그 대가(이동 복구 상실)는 대조 정책 `textmove`로 매 실행 계량한다.
 *
 *   D. 어느 경로로도 못 채우면 orphaned를 **명시**한다 (조용한 소실 금지). 규칙이 실제로
 *      무언가를 막고 있음을 증명하려고, 막힌 자리마다 **더 약한 정책이었다면
 *      어디에 붙었을지**를 counterfactual로 같이 계산해 보고한다.
 */
import * as Y from 'yjs'
import {
  absolutePositionToRelativePosition,
  relativePositionToAbsolutePosition,
} from 'y-prosemirror'
import {
  buildTextIndex,
  posToOffset,
  offsetToPos,
  commonPrefixLength,
  commonSuffixLength,
} from './text-index.mjs'
import {
  CREATION,
  classifyCreation,
  encodeStateVector,
  itemFate,
  liveBlocks,
  rangeOrigins,
} from './blocks.mjs'

/** Characters of context stored on each side of the quote. */
export const QUOTE_CONTEXT = 32

/**
 * quote 후보에게 요구하는 최소 prefix/suffix 정합 (phase1 정책 전용).
 * 자연어에서 `" an "`·`" record"` 같은 조각은 4자를 넘겨도 우연히 맞는다 —
 * 그래서 이 값은 동일성 증거가 못 되고, strict 정책은 여기에 기대지 않는다.
 */
export const MIN_AFFIX = 4

/**
 * 구조적 affix guard의 절대 하한 (strict 정책).
 * 해소 텍스트와 exact가 공유해야 하는 최소 문자수. 한 글자·두 글자 겹침은
 * 자연어에서 우연이므로 증거로 인정하지 않는다. exact 자체가 이보다 짧으면
 * "완전 일치"만 통과한다.
 */
export const MIN_GUARD_EVIDENCE = 4

const toBase64 = (bytes) => Buffer.from(bytes).toString('base64')
const fromBase64 = (text) => new Uint8Array(Buffer.from(text, 'base64'))

/**
 * 정책 = 규칙 묶음. `strict`가 기본이고 나머지 둘은 **counterfactual 계측용**이다
 * (강화 규칙이 실제로 오부착을 막고 있는지 수치로 보이기 위한 대조군).
 *   - phase1 : Phase 1에서 실제로 돌던 규칙 (겹침 1자 guard + 문서 전역 quote 복구)
 *   - naive  : phase1에서 tombstone 규칙까지 뺀 것 (가장 순진한 fallback)
 */
export const POLICIES = Object.freeze({
  strict: Object.freeze({
    id: 'strict',
    guard: 'structural',
    recovery: 'block-identity',
    tombstone: true,
    label: '구조적 guard + 출처 증거 + 블록 item 정체성 (현행)',
  }),
  textmove: Object.freeze({
    id: 'textmove',
    guard: 'structural',
    recovery: 'text-block',
    tombstone: true,
    label: '블록 **텍스트** 동일성으로 이동을 추정하는 복구 (대조군 — 복구율 대가 계량용)',
  }),
  phase1: Object.freeze({
    id: 'phase1',
    guard: 'overlap',
    recovery: 'document-quote',
    tombstone: true,
    label: 'Phase 1 규칙 (겹침 1자 guard + 문서 전역 quote 복구)',
  }),
  naive: Object.freeze({
    id: 'naive',
    guard: 'overlap',
    recovery: 'document-quote',
    tombstone: false,
    label: 'naive fallback (tombstone 규칙 없음)',
  }),
})

/**
 * 대조군은 **두 방향**을 잰다: 더 약한 정책(phase1·naive)이었다면 어디에 붙었을지(=막은
 * 오해소), 그리고 텍스트 기반 이동 복구를 허용했다면 무엇을 더 살렸을지(=포기한 복구율).
 * `textmove`가 없으면 "안전하게 만들었다"만 남고 그 대가가 보고서에서 사라진다.
 */
const COUNTERFACTUAL_POLICIES = [POLICIES.textmove, POLICIES.phase1, POLICIES.naive]

function encodeRelative(session, pos) {
  return toBase64(
    Y.encodeRelativePosition(
      absolutePositionToRelativePosition(pos, session.fragment, session.mapping()),
    ),
  )
}

function decodeRelative(session, encoded) {
  return relativePositionToAbsolutePosition(
    session.ydoc,
    session.fragment,
    Y.decodeRelativePosition(fromBase64(encoded)),
    session.mapping(),
  )
}

/** Capture all three selectors for the range [from, to) of the session's current doc. */
export function captureAnchors(session, from, to) {
  const doc = session.editor.state.doc
  const index = buildTextIndex(doc)
  const textFrom = posToOffset(index, from)
  const textTo = posToOffset(index, to)
  const { blocks } = liveBlocks(session)
  const block = blocks.find((item) => textFrom >= item.textFrom && textTo <= item.textTo) ?? null

  return {
    relativePosition: {
      start: encodeRelative(session, from),
      end: encodeRelative(session, to),
    },
    textQuote: {
      exact: index.text.slice(textFrom, textTo),
      prefix: index.text.slice(Math.max(0, textFrom - QUOTE_CONTEXT), textFrom),
      suffix: index.text.slice(textTo, Math.min(index.text.length, textTo + QUOTE_CONTEXT)),
    },
    // 캡처 시점의 CRDT 기준점 — 블록 문맥이 없어도(경계를 걸친 앵커) 항상 남긴다.
    capture: { stateVector: encodeStateVector(session) },
    // 앵커가 블록 경계를 걸치면 블록 정체성을 쓸 수 없다 -> null (복구 금지 쪽으로 안전).
    blockContext: block
      ? {
          text: block.text,
          offset: textFrom - block.textFrom,
          itemId: block.itemId,
        }
      : null,
  }
}

/** 캡처 기준점. v1(강등된) 레코드는 null이라 이후 모든 출처 판정이 "미상"으로 흐른다. */
function captureStateVector(anchors) {
  const stateVector = anchors.capture ? anchors.capture.stateVector : null
  return typeof stateVector === 'string' ? stateVector : null
}

/** 출처 증거가 왜 없는지 — orphan 사유에 그대로 실어 "조용한 소실"을 막는다. */
function missingProvenance(anchors) {
  if (anchors.legacy) return anchors.legacy.reason ?? 'legacy-record'
  if (!captureStateVector(anchors)) return 'no-capture-state-vector'
  return 'no-origin-evidence'
}

function rangeText(doc, from, to) {
  return doc.textBetween(from, to, '\n', '\n')
}

/** Raw (unguarded) RelativePosition outcome — reported so the guard's effect is visible. */
function resolveRelativePosition(session, anchors) {
  const doc = session.editor.state.doc
  let start = null
  let end = null
  try {
    start = decodeRelative(session, anchors.relativePosition.start)
    end = decodeRelative(session, anchors.relativePosition.end)
  } catch (error) {
    return { status: 'error', from: null, to: null, text: null, error: String(error) }
  }
  if (start === null || end === null) {
    return { status: 'unresolved', from: start, to: end, text: null }
  }
  if (start >= end) {
    return { status: 'collapsed', from: start, to: end, text: '' }
  }
  const clampedTo = Math.min(end, doc.content.size)
  return { status: 'resolved', from: start, to: clampedTo, text: rangeText(doc, start, clampedTo) }
}

/**
 * 해소된 범위가 "저장된 exact의 앞 조각 + 뒤 조각"으로 설명되는가.
 *
 *   structural: head + tail >= min(해소 길이, exact 길이)  (+ 절대 하한)
 *              AND 범위 안에 캡처 때부터 있던 문자가 1자 이상
 *     - 범위 안 삽입 : exact 전체가 앞·뒤 조각으로 덮인다      -> 통과
 *     - 범위 축소    : 잔여 텍스트 전체가 exact의 조각이다     -> 통과
 *     - 제자리 교체  : 새 텍스트의 대부분이 설명되지 않는다    -> 탈락
 *                     (짧은 교체어가 우연히 조각처럼 보여도 문자 출처에서 탈락)
 *   overlap: head > 0 || tail > 0  (Phase 1 규칙 — 대조군으로만 남긴다)
 */
function affixGuard(session, anchors, raw, policy) {
  const resolvedText = raw.text
  const exact = anchors.textQuote.exact
  const head = commonPrefixLength(resolvedText, exact)
  const tail = commonSuffixLength(resolvedText, exact)
  if (policy.guard === 'overlap') {
    return {
      rule: 'overlap',
      accepted: head > 0 || tail > 0,
      head,
      tail,
      agreement: head + tail,
      required: 1,
      survivingChars: null,
    }
  }
  const identical = resolvedText === exact
  const required = Math.min(resolvedText.length, exact.length)
  const agreement = Math.min(head + tail, required)
  const structural = identical || (agreement >= required && agreement >= MIN_GUARD_EVIDENCE)

  // 문자열만으로는 "가운데를 지운 잔여 텍스트"와 "그 자리에 새로 친 짧은 텍스트"가
  // 구분되지 않는다. CRDT에게 물어 **캡처 때부터 있던 문자**가 남았는지 확인한다.
  // 출처를 모르면(옛 레코드·읽을 수 없는 범위) **통과가 아니라 거절**이다 — 다만
  // 해소 텍스트가 exact와 완전히 같으면 문자 자체가 그대로이므로 증거를 더 요구하지 않는다.
  const origins = originEvidence(session, anchors, raw)
  const provenance = origins.known
    ? origins.preexisting > 0
      ? 'surviving-characters'
      : 'all-characters-new'
    : identical
      ? 'unchanged-text'
      : `unknown/${missingProvenance(anchors)}`
  const survived = provenance === 'surviving-characters' || provenance === 'unchanged-text'
  return {
    rule: 'structural',
    accepted: structural && survived,
    structural,
    provenance,
    head,
    tail,
    agreement,
    required,
    survivingChars: origins.known ? origins.preexisting : null,
  }
}

/**
 * 해소된 범위 안에 캡처 시점부터 살아남은 문자가 몇 개인가 (모르면 known:false).
 * 범위가 블록 경계를 넘어도 센다 — 그래야 문단 분할·경계를 걸친 앵커가 "증거 없음"
 * 으로 떨어져 정상 편집까지 orphan이 되는 일이 없다 (src/blocks.mjs `rangeOrigins`).
 */
function originEvidence(session, anchors, raw) {
  const stateVector = captureStateVector(anchors)
  if (!stateVector || raw.from === null || raw.to === null) {
    return { known: false, preexisting: 0, fresh: 0 }
  }
  const { index, blocks } = liveBlocks(session)
  return rangeOrigins(blocks, posToOffset(index, raw.from), posToOffset(index, raw.to), stateVector)
}

/** All quote candidates in the current text, scored by prefix/suffix agreement. */
function quoteCandidates(index, quote) {
  const { exact, prefix, suffix } = quote
  if (!exact) return []
  const needPrefix = Math.min(MIN_AFFIX, prefix.length)
  const needSuffix = Math.min(MIN_AFFIX, suffix.length)
  const candidates = []
  let at = index.text.indexOf(exact)
  while (at !== -1) {
    const before = index.text.slice(Math.max(0, at - QUOTE_CONTEXT), at)
    const after = index.text.slice(at + exact.length, at + exact.length + QUOTE_CONTEXT)
    const prefixScore = commonSuffixLength(prefix, before)
    const suffixScore = commonPrefixLength(suffix, after)
    candidates.push({
      textFrom: at,
      textTo: at + exact.length,
      prefixScore,
      suffixScore,
      score: prefixScore + suffixScore,
      corroborated: prefixScore >= needPrefix && suffixScore >= needSuffix,
      oneSided: prefixScore >= needPrefix || suffixScore >= needSuffix,
    })
    at = index.text.indexOf(exact, at + 1)
  }
  return candidates
}

/** Phase 1의 문서 전역 quote 복구 — 지금은 counterfactual 대조군으로만 돈다. */
function resolveDocumentQuote(session, anchors) {
  const doc = session.editor.state.doc
  const index = buildTextIndex(doc)
  const candidates = quoteCandidates(index, anchors.textQuote)

  let usable = candidates.filter((candidate) => candidate.corroborated)
  let acceptance = 'both-affix'
  if (usable.length === 0 && candidates.length === 1 && candidates[0].oneSided) {
    usable = candidates
    acceptance = 'unique-one-affix'
  }

  if (usable.length === 0) {
    return { status: 'no-candidate', candidates: candidates.length, corroborated: 0, acceptance: null }
  }
  usable.sort((a, b) => b.score - a.score || a.textFrom - b.textFrom)
  if (usable.length > 1 && usable[0].score === usable[1].score) {
    return { status: 'ambiguous', candidates: candidates.length, corroborated: usable.length, acceptance }
  }
  const best = usable[0]
  const from = offsetToPos(index, best.textFrom)
  const to = offsetToPos(index, best.textTo)
  if (from === null || to === null || from >= to) {
    return { status: 'unmappable', candidates: candidates.length, corroborated: usable.length, acceptance }
  }
  return {
    status: 'resolved',
    from,
    to,
    text: rangeText(doc, from, to),
    candidates: candidates.length,
    corroborated: usable.length,
    acceptance,
    prefixScore: best.prefixScore,
    suffixScore: best.suffixScore,
  }
}

/** 후보 블록 안 저장 오프셋에 exact가 그대로 있는지 — 정체성의 **보조 검증**. */
function quoteAtStoredOffset(session, index, block, context, exact) {
  const textFrom = block.textFrom + context.offset
  const textTo = textFrom + exact.length
  if (textTo > block.textTo || index.text.slice(textFrom, textTo) !== exact) {
    return { status: 'quote-not-at-offset' }
  }
  const from = offsetToPos(index, textFrom)
  const to = offsetToPos(index, textTo)
  if (from === null || to === null || from >= to) return { status: 'unmappable' }
  return { status: 'resolved', from, to, text: rangeText(session.editor.state.doc, from, to) }
}

/**
 * 규칙 C (strict) — 블록이 사라졌을 때의 복구는 **정체성이 증명될 때만**.
 *
 * 저장된 블록 item id를 현재 문서의 CRDT store에 직접 물어본다.
 *   - store가 그 id를 모른다        -> 다른 문서/재임포트본 = 출처 미상 -> orphan
 *   - 그 item이 tombstone이다       -> 블록이 실제로 파괴됐다. 파괴 이후에는 "어디로
 *                                      갔는지"를 CRDT가 증언하지 못한다(D3: 이동과
 *                                      재타이핑의 업데이트가 byte 동일) -> orphan
 *   - 그 item이 살아 있고, 지금도 어떤 블록의 정체성이다 -> 텍스트·오프셋 보조 검증 후 복구
 *
 * 세 번째 갈래는 y-prosemirror의 현재 동작에서는 거의 발생하지 않는다(블록을 옮기면
 * 새 element를 만든다). 그래도 조건을 이렇게 적어 두는 이유는 두 가지다: 이것이 유일하게
 * **증명 가능한** 복구이고, 편집기·CRDT가 진짜 move 연산을 지원하면 그때 자동으로 살아난다.
 */
function resolveByBlockIdentity(session, anchors) {
  const context = anchors.blockContext
  const empty = { matches: 0, fresh: 0, acceptance: null }
  if (!context || typeof context.itemId !== 'string' || typeof context.offset !== 'number') {
    return { status: `no-provenance/${missingProvenance(anchors)}`, ...empty }
  }
  const { index, blocks } = liveBlocks(session)
  const fate = itemFate(session.ydoc, context.itemId)
  if (fate.state === 'unknown') return { status: 'stored-item-unknown', ...empty, itemState: fate.state }
  if (fate.state === 'deleted') {
    return { status: 'block-identity-destroyed', ...empty, itemState: fate.state }
  }
  const block = blocks.find((item) => item.itemId === context.itemId) ?? null
  if (!block) return { status: 'block-identity-not-a-textblock', ...empty, itemState: fate.state }
  if (block.text !== context.text) {
    return { status: 'block-identity-text-changed', matches: 1, fresh: 0, acceptance: null, itemState: fate.state }
  }
  const placed = quoteAtStoredOffset(session, index, block, context, anchors.textQuote.exact)
  if (placed.status !== 'resolved') return { status: placed.status, matches: 1, fresh: 0, acceptance: null }
  return {
    status: 'resolved',
    matches: 1,
    fresh: 0,
    acceptance: 'block-identity',
    blockItemId: block.itemId,
    from: placed.from,
    to: placed.to,
    text: placed.text,
  }
}

/**
 * 대조군 복구 (`textmove` 정책 전용) — "저장된 블록과 **같은 텍스트**이고 캡처 이후
 * 생긴 블록이 유일하면 이동으로 본다". C1에서 실제로 돌던 규칙에 원격 보정을 더한 것이다
 * (캡처가 모르는 client의 블록은 fresh로 세지 않는다 = vnv N3 보정).
 *
 * strict가 이 경로를 버린 대가(=S6형 이동 복구 상실)와, 이 경로를 남겼을 때 치를 값
 * (=N1 쌍둥이 이동·N4 재타이핑 오부착)을 **같은 실행에서 동시에** 보이기 위해 남긴다.
 */
function resolveByBlockText(session, anchors) {
  const context = anchors.blockContext
  const stateVector = captureStateVector(anchors)
  if (!context || typeof context.text !== 'string' || typeof context.offset !== 'number' || !stateVector) {
    return { status: `no-provenance/${missingProvenance(anchors)}`, matches: 0, fresh: 0, acceptance: null }
  }
  const { index, blocks } = liveBlocks(session)
  const matches = blocks.filter((block) => block.text === context.text)
  const fresh = matches.filter(
    (block) => classifyCreation(block.itemId, stateVector) === CREATION.CREATED_AFTER,
  )
  const counts = { matches: matches.length, fresh: fresh.length }
  const foreign = matches.filter(
    (block) => classifyCreation(block.itemId, stateVector) === CREATION.FOREIGN_CLIENT,
  ).length

  if (fresh.length === 0) {
    return {
      status: foreign > 0 ? 'matching-block-is-foreign' : matches.length === 0 ? 'no-matching-block' : 'matching-block-is-original',
      ...counts,
      acceptance: null,
    }
  }
  if (fresh.length > 1) return { status: 'ambiguous-blocks', ...counts, acceptance: null }
  const placed = quoteAtStoredOffset(session, index, fresh[0], context, anchors.textQuote.exact)
  if (placed.status !== 'resolved') return { status: placed.status, ...counts, acceptance: null }
  return {
    status: 'resolved',
    ...counts,
    acceptance: 'text-block',
    blockItemId: fresh[0].itemId,
    from: placed.from,
    to: placed.to,
    text: placed.text,
  }
}

function orphaned(raw, guard, reason, extra = {}) {
  return {
    method: 'orphaned',
    from: null,
    to: null,
    text: null,
    raw,
    guard,
    quote: null,
    recovery: null,
    reason,
    ...extra,
  }
}

function resolveWithPolicy(session, anchors, policy) {
  const raw = resolveRelativePosition(session, anchors)
  const guard =
    raw.status === 'resolved'
      ? affixGuard(session, anchors, raw, policy)
      : {
          rule: policy.guard,
          accepted: false,
          structural: false,
          provenance: 'not-evaluated',
          head: 0,
          tail: 0,
          agreement: 0,
          required: 0,
          survivingChars: null,
        }

  if (raw.status === 'resolved' && guard.accepted) {
    return {
      method: 'relative-position',
      from: raw.from,
      to: raw.to,
      text: raw.text,
      raw,
      guard,
      quote: null,
      recovery: null,
      reason: null,
      policy: policy.id,
    }
  }

  if (policy.recovery === 'block-identity' || policy.recovery === 'text-block') {
    // 규칙 B — 삭제 증거가 있으면 복구를 아예 돌리지 않는다.
    if (raw.status === 'collapsed') {
      return { ...orphaned(raw, guard, 'collapsed/tombstone-evidence'), policy: policy.id }
    }
    if (raw.status === 'resolved') {
      const reason = !guard.structural
        ? 'content-replaced/guard-rejected'
        : guard.provenance.startsWith('unknown')
          ? `content-replaced/${guard.provenance}`
          : 'content-replaced/no-surviving-characters'
      return { ...orphaned(raw, guard, reason), policy: policy.id }
    }
    if (raw.status === 'error') {
      return { ...orphaned(raw, guard, 'relative-position-error'), policy: policy.id }
    }
    // 규칙 C — 블록이 사라진 경우에만 복구를 따진다.
    const recovery =
      policy.recovery === 'block-identity'
        ? resolveByBlockIdentity(session, anchors)
        : resolveByBlockText(session, anchors)
    if (recovery.status === 'resolved') {
      return {
        method: recovery.acceptance,
        from: recovery.from,
        to: recovery.to,
        text: recovery.text,
        raw,
        guard,
        quote: null,
        recovery,
        reason: null,
        policy: policy.id,
      }
    }
    return {
      ...orphaned(raw, guard, `block-gone/${recovery.status}`, { recovery }),
      policy: policy.id,
    }
  }

  // ---- 대조군 정책 (phase1 / naive): 문서 전역 quote 복구 ----
  if (raw.status === 'collapsed' && policy.tombstone) {
    return { ...orphaned(raw, guard, 'collapsed/tombstone-evidence'), policy: policy.id }
  }
  const quote = resolveDocumentQuote(session, anchors)
  if (quote.status === 'resolved') {
    return {
      method: 'text-quote',
      from: quote.from,
      to: quote.to,
      text: quote.text,
      raw,
      guard,
      quote,
      recovery: null,
      reason: null,
      policy: policy.id,
    }
  }
  return {
    ...orphaned(raw, guard, raw.status === 'resolved' ? `guard-rejected/${quote.status}` : `${raw.status}/${quote.status}`, { quote }),
    policy: policy.id,
  }
}

/** counterfactual은 산출물에 실을 최소 필드만 남긴다 (JSON 비대화 방지). */
function counterfactualSlice(resolution) {
  return {
    policy: resolution.policy,
    method: resolution.method,
    from: resolution.from,
    to: resolution.to,
    text: resolution.text,
    guardAccepted: resolution.guard.accepted,
    quoteAcceptance: resolution.quote ? (resolution.quote.acceptance ?? null) : null,
    recoveryStatus: resolution.recovery ? resolution.recovery.status : null,
    reason: resolution.reason,
  }
}

/**
 * Resolve a stored annotation record against the session's current document.
 * Never throws, never guesses: the result always names its method.
 *
 * @param {object}  options.policy          POLICIES.* (기본 strict)
 * @param {boolean} options.quoteOnTombstone true면 naive 정책으로 돈다 (하위 호환).
 * @param {boolean} options.counterfactuals  false면 대조군 계산을 생략한다.
 */
export function resolveAnchors(session, anchors, options = {}) {
  const { quoteOnTombstone = false, counterfactuals = true } = options
  const policy = options.policy ?? (quoteOnTombstone ? POLICIES.naive : POLICIES.strict)
  const resolution = resolveWithPolicy(session, anchors, policy)

  if (policy.id === 'strict' && counterfactuals) {
    resolution.counterfactual = {}
    for (const alternative of COUNTERFACTUAL_POLICIES) {
      resolution.counterfactual[alternative.id] = counterfactualSlice(
        resolveWithPolicy(session, anchors, alternative),
      )
    }
  } else {
    resolution.counterfactual = null
  }
  return resolution
}
