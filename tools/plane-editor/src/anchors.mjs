/**
 * Anchors = Selector 다중화 (tool_suggestion v0.2 §7).
 *
 * 저장되는 selector 3종:
 *   1. Yjs RelativePosition (start/end) — 주앵커. 편집·오프라인 병합을 견딘다.
 *   2. TextQuoteSelector (exact/prefix/suffix) — 복구용. 1이 죽었을 때만 쓴다.
 *   3. BlockContext (블록 텍스트·블록 안 오프셋·블록 item id·캡처 시점 state
 *      vector) — **삭제와 이동을 가르는 증거**. 3이 없으면 1이 죽었을 때
 *      "지워졌다"와 "옮겨졌다"를 구분할 방법이 없다 (src/blocks.mjs 머리말).
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
 *            둘을 구분한다 (src/blocks.mjs `characterRuns`).
 *      Phase 1의 `head > 0 || tail > 0`은 **한 글자** 우연으로 통과해서
 *      무관한 텍스트에 붙었다 (vnv note 4 = 실측된 오해소).
 *
 *   B. 주앵커가 실패한 방식이 **삭제 증거**면 복구를 돌리지 않고 orphan으로
 *      확정한다. 삭제 증거는 세 가지다:
 *        - `collapsed`        : 양끝이 한 점으로 모임 = CRDT가 문자 삭제를 증언
 *        - `resolved` + guard 거절 : 자리는 살아 있는데 내용이 딴 것 = 제자리 교체
 *        - `error`            : 판독 불가
 *      이때 quote 복구를 돌리면 같은 문자열의 **다른 출현**에 붙는다(측정된
 *      실패: S5/a6, S10 전 앵커).
 *
 *   C. `unresolved`(주앵커의 블록 자체가 사라짐)일 때만 복구를 시도한다. 블록이
 *      사라지는 편집은 **삭제**와 **이동** 두 가지인데 CRDT는 둘을 구분하지
 *      못하므로(P7), 블록 정체성으로 가른다: 저장된 블록 텍스트와 **똑같은**
 *      블록이 지금 문서에 있고, 그 블록이 **캡처 이후에 새로 생겼고**(=붙여넣기),
 *      그런 블록이 **하나뿐**일 때만 그 블록 안의 저장된 오프셋으로 복구한다.
 *      하나라도 어긋나면 orphan (S9 블록 삭제는 전부 여기서 걸린다).
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
import { characterOrigins, encodeStateVector, isCreatedAfter, liveBlocks } from './blocks.mjs'

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
    recovery: 'moved-block',
    tombstone: true,
    label: '구조적 guard + 삭제 증거 + 블록 정체성 (현행)',
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

const COUNTERFACTUAL_POLICIES = [POLICIES.phase1, POLICIES.naive]

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
    // 앵커가 블록 경계를 걸치면 블록 정체성을 쓸 수 없다 -> null (복구 금지 쪽으로 안전).
    blockContext: block
      ? {
          text: block.text,
          offset: textFrom - block.textFrom,
          itemId: block.itemId,
          stateVector: encodeStateVector(session),
        }
      : null,
  }
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
  const required = Math.min(resolvedText.length, exact.length)
  const agreement = Math.min(head + tail, required)
  const structural = resolvedText === exact || (agreement >= required && agreement >= MIN_GUARD_EVIDENCE)

  // 문자열만으로는 "가운데를 지운 잔여 텍스트"와 "그 자리에 새로 친 짧은 텍스트"가
  // 구분되지 않는다. CRDT에게 물어 **캡처 때부터 있던 문자**가 남았는지 확인한다.
  const origins = originEvidence(session, anchors, raw)
  const survived = !origins.known || origins.preexisting > 0
  return {
    rule: 'structural',
    accepted: structural && survived,
    head,
    tail,
    agreement,
    required,
    survivingChars: origins.known ? origins.preexisting : null,
  }
}

/** 해소된 범위 안에 캡처 시점부터 살아남은 문자가 몇 개인가 (모르면 known:false). */
function originEvidence(session, anchors, raw) {
  const context = anchors.blockContext
  if (!context || typeof context.stateVector !== 'string' || raw.from === null || raw.to === null) {
    return { known: false, preexisting: 0, fresh: 0 }
  }
  const { index, blocks } = liveBlocks(session)
  const textFrom = posToOffset(index, raw.from)
  const textTo = posToOffset(index, raw.to)
  const block = blocks.find((item) => textFrom >= item.textFrom && textTo <= item.textTo) ?? null
  return characterOrigins(block, textFrom, textTo, context.stateVector)
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

/**
 * 블록이 통째로 사라졌을 때의 유일한 복구 경로 (규칙 C).
 * "저장된 블록과 **같은 텍스트**이고 **캡처 이후에 새로 생긴** 블록이 정확히
 * 하나"일 때만 복구한다. 이동(cut+paste)은 이 조건을 만족하고, 삭제는 만족하지
 * 못한다 — 살아남은 쌍둥이 블록은 캡처 시점에도 있던 **옛** 블록이기 때문이다.
 */
function resolveMovedBlock(session, anchors) {
  const context = anchors.blockContext
  if (!context || typeof context.text !== 'string' || typeof context.offset !== 'number') {
    return { status: 'no-block-context', matches: 0, fresh: 0, acceptance: null }
  }
  const { index, blocks } = liveBlocks(session)
  const matches = blocks.filter((block) => block.text === context.text)
  const fresh = matches.filter((block) => isCreatedAfter(block.itemId, context.stateVector))
  const counts = { matches: matches.length, fresh: fresh.length }

  if (fresh.length === 0) {
    // matches > 0 이면 "텍스트는 같지만 캡처 때도 있던 블록" = 이동이 아니라 삭제.
    return {
      status: matches.length === 0 ? 'no-matching-block' : 'matching-block-is-original',
      ...counts,
      acceptance: null,
    }
  }
  if (fresh.length > 1) return { status: 'ambiguous-blocks', ...counts, acceptance: null }

  const block = fresh[0]
  const exact = anchors.textQuote.exact
  const textFrom = block.textFrom + context.offset
  const textTo = textFrom + exact.length
  if (textTo > block.textTo || index.text.slice(textFrom, textTo) !== exact) {
    return { status: 'quote-not-at-offset', ...counts, acceptance: null }
  }
  const from = offsetToPos(index, textFrom)
  const to = offsetToPos(index, textTo)
  if (from === null || to === null || from >= to) {
    return { status: 'unmappable', ...counts, acceptance: null }
  }
  return {
    status: 'resolved',
    ...counts,
    acceptance: 'moved-block',
    blockItemId: block.itemId,
    from,
    to,
    text: rangeText(session.editor.state.doc, from, to),
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
      : { rule: policy.guard, accepted: false, head: 0, tail: 0, agreement: 0, required: 0, survivingChars: null }

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

  if (policy.recovery === 'moved-block') {
    // 규칙 B — 삭제 증거가 있으면 복구를 아예 돌리지 않는다.
    if (raw.status === 'collapsed') {
      return { ...orphaned(raw, guard, 'collapsed/tombstone-evidence'), policy: policy.id }
    }
    if (raw.status === 'resolved') {
      const reason =
        guard.survivingChars === 0
          ? 'content-replaced/no-surviving-characters'
          : 'content-replaced/guard-rejected'
      return { ...orphaned(raw, guard, reason), policy: policy.id }
    }
    if (raw.status === 'error') {
      return { ...orphaned(raw, guard, 'relative-position-error'), policy: policy.id }
    }
    // 규칙 C — 블록이 사라진 경우에만 이동 여부를 따진다.
    const recovery = resolveMovedBlock(session, anchors)
    if (recovery.status === 'resolved') {
      return {
        method: 'moved-block',
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
