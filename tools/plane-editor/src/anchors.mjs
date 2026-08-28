/**
 * Anchors = Selector 다중화 (tool_suggestion v0.2 §7).
 *
 * 저장되는 selector 2종:
 *   1. Yjs RelativePosition (start/end) — 주앵커. 편집·오프라인 병합을 견딘다.
 *   2. TextQuoteSelector (exact/prefix/suffix) — 복구용. 1이 죽었을 때만 쓴다.
 *
 * 해소 규칙 (오해소 0이 절대 기준):
 *   - RelativePosition이 null이거나 범위가 비면 즉시 실패 처리한다.
 *   - 살아난 범위라도 **affix-agreement guard**를 통과해야 채택한다. 해소된
 *     텍스트가 저장된 exact와 앞뒤 어느 한쪽이라도 한 글자 이상 공유해야
 *     한다 (S2 확장·S4 축소는 통과, tombstone 자리의 엉뚱한 텍스트는 탈락).
 *   - **tombstone evidence 규칙**: RelativePosition이 `collapsed`로 해소되면
 *     (= 양끝이 한 점으로 모임) CRDT가 "이 앵커의 문자들은 이 문서 이력에서
 *     삭제됐다"고 적극적으로 증언한 것이다. 이때 quote 복구를 돌리면 같은
 *     문자열의 **다른 출현**에 붙을 수 있으므로(측정된 실패: S5/a6) 복구를
 *     돌리지 않고 orphaned로 확정한다. 대신 "돌렸다면 어디에 붙었을지"를
 *     `counterfactualQuote`로 함께 보고한다 — 규칙의 효과를 수치로 남긴다.
 *   - quote 복구(주앵커가 아예 해소 불가일 때만)는 prefix/suffix 정합을
 *     MIN_AFFIX 이상 요구하고, 최고점 후보가 유일할 때만 채택한다. exact가
 *     문서에 단 한 번 나오는 경우에 한해 한쪽 affix 정합만으로도 채택한다
 *     (`unique-one-affix`). 애매하면 붙이지 않고 orphaned로 둔다.
 *   - 둘 다 실패하면 orphaned를 **명시**한다 (조용한 소실 금지).
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

/** Characters of context stored on each side of the quote. */
export const QUOTE_CONTEXT = 32
/** Minimum prefix/suffix agreement (chars) demanded of a quote candidate. */
export const MIN_AFFIX = 4

const toBase64 = (bytes) => Buffer.from(bytes).toString('base64')
const fromBase64 = (text) => new Uint8Array(Buffer.from(text, 'base64'))

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

/** Capture both selectors for the range [from, to) of the session's current doc. */
export function captureAnchors(session, from, to) {
  const doc = session.editor.state.doc
  const index = buildTextIndex(doc)
  const textFrom = posToOffset(index, from)
  const textTo = posToOffset(index, to)

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

function affixGuard(resolvedText, exact) {
  const head = commonPrefixLength(resolvedText, exact)
  const tail = commonSuffixLength(resolvedText, exact)
  return { accepted: head > 0 || tail > 0, head, tail }
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

function resolveQuote(session, anchors) {
  const doc = session.editor.state.doc
  const index = buildTextIndex(doc)
  const candidates = quoteCandidates(index, anchors.textQuote)

  // 1순위: 양쪽 affix가 모두 맞는 후보. 2순위: exact가 문서에 단 하나뿐이고
  // 한쪽 affix가 맞는 경우 (블록 이동처럼 한쪽 문맥이 통째로 바뀌는 편집).
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
 * Resolve a stored annotation record against the session's current document.
 * Never throws, never guesses: the result always names its method.
 *
 * @param {object} options.quoteOnTombstone  true면 tombstone evidence 규칙을 끄고
 *   collapsed 앵커에도 quote 복구를 돌린다 (naive 정책의 오해소를 측정할 때만).
 */
export function resolveAnchors(session, anchors, { quoteOnTombstone = false } = {}) {
  const raw = resolveRelativePosition(session, anchors)
  const guard =
    raw.status === 'resolved'
      ? affixGuard(raw.text, anchors.textQuote.exact)
      : { accepted: false, head: 0, tail: 0 }

  if (raw.status === 'resolved' && guard.accepted) {
    return {
      method: 'relative-position',
      from: raw.from,
      to: raw.to,
      text: raw.text,
      raw,
      guard,
      quote: null,
      counterfactualQuote: null,
    }
  }

  if (raw.status === 'collapsed' && !quoteOnTombstone) {
    // CRDT가 삭제를 증언한 경우: 복구를 돌리지 않고 orphan으로 확정한다.
    const counterfactual = resolveQuote(session, anchors)
    return {
      method: 'orphaned',
      from: null,
      to: null,
      text: null,
      raw,
      guard,
      quote: { status: 'skipped-tombstone', candidates: counterfactual.candidates ?? 0 },
      counterfactualQuote: counterfactual,
      reason: 'collapsed/tombstone-evidence',
    }
  }

  const quote = resolveQuote(session, anchors)
  if (quote.status === 'resolved') {
    return {
      method: 'text-quote',
      from: quote.from,
      to: quote.to,
      text: quote.text,
      raw,
      guard,
      quote,
      counterfactualQuote: null,
    }
  }

  return {
    method: 'orphaned',
    from: null,
    to: null,
    text: null,
    raw,
    guard,
    quote,
    counterfactualQuote: null,
    reason: raw.status === 'resolved' ? `guard-rejected/${quote.status}` : `${raw.status}/${quote.status}`,
  }
}
