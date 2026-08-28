/**
 * Anchors = Selector 다중화 (tool_suggestion v0.2 §7).
 *
 * 저장되는 selector (v3 레코드):
 *   0. document.id — **어느 문서의 앵커인가**. 레코드가 다른 문서에 부착되는 것을
 *      막는 유일한 장치다 (`src/document-id.mjs`; 실측된 결함 vnv M5).
 *   1. Yjs RelativePosition (start/end) — 주앵커. 편집·오프라인 병합을 견딘다.
 *   2. TextQuoteSelector (exact/prefix/suffix) — **보조 검증용**. 문자열 일치는
 *      동일성 증거가 아니므로 단독 복구 근거로 쓰지 않는다.
 *   3. capture.characterIds — 캡처 시점에 앵커 범위를 이루던 **문자들의 CRDT 정체성**
 *      (`{client, clock, length}` 런). "그때부터 있던 문자가 남았는가"를 이 이름표로
 *      직접 판정한다. capture.stateVector도 함께 싣지만 그것은 **대조 정책 전용**이다.
 *   4. blockContext (블록 텍스트·블록 안 오프셋·**블록 item id**) — 블록 정체성.
 *      앵커가 블록 경계를 걸치면 null.
 *
 * 해소 규칙 (오해소 0이 절대 기준 — 조용한 오부착보다 명시적 orphan이 항상 낫다):
 *
 *   0. **문서 정체성 바인딩** — 해소 진입점(`resolveAnchors`)은 먼저 "이 레코드가 이
 *      문서의 것인가"를 묻는다. 레코드의 문서 id와 세션의 문서 id가 **둘 다 있고
 *      같을 때만** 다음 규칙으로 넘어간다. 한쪽이 없거나 다르면 selector를 아예
 *      읽지 않고 orphan이다 — 다른 문서에서는 우연히 해소되는 것이 정상이기 때문에
 *      (같은 clientID로 만든 문서끼리는 item id 공간이 겹친다) 여기서 막지 않으면
 *      아래 규칙들은 애초에 잘못된 문서 위에서 계산된다.
 *      **정체성은 동거로 얻어지지 않는다**: 문서 id를 싣지 않은 레코드는 어떤 문서 옆에
 *      놓여도 미상으로 남는다(`src/store.mjs`의 입양 금지). 옛 주석 파일을 남의 문서
 *      옆에 두는 것만으로 그 문서의 레코드가 되던 경로가 실측됐다(vnv B3 -> B7).
 *
 *   A. 주앵커가 살아 돌아오면 **구조적 affix guard**를 통과해야 채택한다.
 *      두 조건을 함께 요구한다.
 *        (1) 문자열 구조 — 해소된 텍스트가 저장된 exact의 "앞 조각 + 뒤 조각"으로
 *            설명돼야 한다 (`head + tail >= min(길이)`, 최소 MIN_GUARD_EVIDENCE자).
 *            삽입으로 늘어난 범위·삭제로 줄어든 잔여 범위는 통과하고, 그 자리에
 *            새로 타이핑된 무관한 텍스트는 탈락한다.
 *        (2) 문자 출처 — 그 범위에 **캡처 때 앵커에 들어 있던 바로 그 문자**가
 *            하나라도 남아야 한다. 문자열만 보면 "가운데를 지운 잔여 텍스트"와 "그
 *            자리에 새로 친 짧은 텍스트"가 같아 보이지만(`Critical failure` -> `Cure`),
 *            CRDT는 둘을 구분한다 (src/blocks.mjs `captureCorrespondence`).
 *            **출처를 모르면 통과가 아니라 거절이다** (옛 레코드·증거 없는 범위).
 *            해소 텍스트가 exact와 **완전히 같을 때**는 문자가 그대로이므로 추가 증거를
 *            요구하지 않는다 — 단 출처 증거가 **위조로 반증된** 레코드에는 그 예외도
 *            주지 않는다.
 *            출처의 근거는 레코드가 스스로 주장하는 **시점**(state vector)이 아니라
 *            문자들의 **이름표**(characterIds)다. 시점 값은 마이그레이션이 현재 값으로
 *            채워 넣을 수 있어서 "모든 문자가 옛 문자"로 뒤집힌다(vnv M4).
 *            그런데 이름표도 **개수만 세면 우회된다**: 현재 교체 범위의 이름표에 문서
 *            다른 곳의 이름표를 padding 해 저장된 exact 길이에 맞추면 길이 검사와 SV
 *            검사를 함께 통과한다(실측: vnv B4). 그래서 이름표는 저장된 exact와
 *            **자리별로 대응**하는지까지 본다 — 살아 있는 이름표가 가리키는 문자는
 *            `exact[k]`여야 하고, 이름표는 유일해야 하며, 살아남은 문자의 캡처 위치는
 *            증가 수열이어야 한다 (`captureCorrespondence`).
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
  BLOCK_SEPARATOR,
  buildTextIndex,
  posToOffset,
  offsetToPos,
  commonPrefixLength,
  commonSuffixLength,
} from './text-index.mjs'
import {
  CREATION,
  captureCorrespondence,
  characterIdCount,
  classifyCreation,
  encodeStateVector,
  itemFate,
  liveBlocks,
  rangeCharacterIds,
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

/** Capture every selector for the range [from, to) of the session's current doc. */
export function captureAnchors(session, from, to) {
  if (typeof session.documentId !== 'string' || !session.documentId) {
    throw new Error(
      'captureAnchors: this document has no identity, so an anchor captured here could never be ' +
        'bound back to it — refusing to create an unbindable record',
    )
  }
  const { index, blocks } = liveBlocks(session)
  const textFrom = posToOffset(index, from)
  const textTo = posToOffset(index, to)
  const block = blocks.find((item) => textFrom >= item.textFrom && textTo <= item.textTo) ?? null

  return {
    // 규칙 0 — 이 앵커가 속한 문서.
    document: { id: session.documentId },
    relativePosition: {
      start: encodeRelative(session, from),
      end: encodeRelative(session, to),
    },
    textQuote: {
      exact: index.text.slice(textFrom, textTo),
      prefix: index.text.slice(Math.max(0, textFrom - QUOTE_CONTEXT), textFrom),
      suffix: index.text.slice(textTo, Math.min(index.text.length, textTo + QUOTE_CONTEXT)),
    },
    capture: {
      // 대조 정책(textmove) 전용 기준점. strict는 이 값을 신뢰하지 않는다.
      stateVector: encodeStateVector(session),
      // 캡처 범위를 이루던 문자들의 CRDT 이름표. 읽을 수 없으면 null = 증거 없음.
      characterIds: rangeCharacterIds(blocks, textFrom, textTo),
    },
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

/** 캡처 시점 기준점 (대조 정책 전용). 강등된 레코드는 null이다. */
function captureStateVector(anchors) {
  const stateVector = anchors.capture ? anchors.capture.stateVector : null
  return typeof stateVector === 'string' ? stateVector : null
}

/** 출처 증거가 왜 없는지 — orphan 사유에 그대로 실어 "조용한 소실"을 막는다. */
function missingProvenance(anchors) {
  if (anchors.legacy) return anchors.legacy.reason ?? 'legacy-record'
  return captureEvidence(anchors).reason ?? 'no-origin-evidence'
}

const isNonNegativeInt = (value) => Number.isInteger(value) && value >= 0

/**
 * 캡처 증거를 **쓰기 전에 검증한다** (저장소 계약의 이빨).
 *
 * 레코드는 자기 출처를 스스로 주장한다 — 그 주장을 검증 없이 쓰면, 마이그레이션이
 * 값을 현재 상태로 채워 넣는 순간 방어가 통째로 뒤집힌다(vnv M4에서 실측된 회귀).
 * 검증은 **다른 selector와의 내부 정합**으로 한다: 캡처 문자 이름표가 덮는 문자수는
 * 저장된 `exact`의 문자수(블록 구분자 제외)와 정확히 같아야 한다. 마이그레이션은
 * 현재 문서 상태는 볼 수 있어도 **이미 사라진 옛 문자들의 이름표**는 만들어낼 수 없고,
 * 현재 범위에서 베껴 오면 길이가 어긋나 여기서 걸린다.
 *
 * 반환의 `corrupt`는 "있는데 어긋난다"(= 계약 위반, 스토어가 강등해야 함)와 "아예
 * 없다"(= 증거 부재, 정상적으로 있을 수 있음)를 가른다.
 */
export function captureEvidence(anchors) {
  if (!anchors || typeof anchors !== 'object') {
    return { usable: false, corrupt: false, reason: 'no-anchors', runs: null }
  }
  if (anchors.legacy) {
    return { usable: false, corrupt: false, reason: anchors.legacy.reason ?? 'legacy-record', runs: null }
  }
  const capture = anchors.capture
  if (!capture) return { usable: false, corrupt: false, reason: 'no-capture', runs: null }
  const runs = capture.characterIds
  if (runs === null || runs === undefined) {
    return { usable: false, corrupt: false, reason: 'no-character-identity', runs: null }
  }
  if (
    !Array.isArray(runs) ||
    !runs.every(
      (run) =>
        run &&
        typeof run === 'object' &&
        isNonNegativeInt(run.client) &&
        isNonNegativeInt(run.clock) &&
        Number.isInteger(run.length) &&
        run.length > 0,
    )
  ) {
    return { usable: false, corrupt: true, reason: 'capture-malformed', runs: null }
  }
  const exact = anchors.textQuote && typeof anchors.textQuote.exact === 'string' ? anchors.textQuote.exact : null
  if (exact === null) return { usable: false, corrupt: true, reason: 'capture-malformed', runs: null }
  // 블록 구분자는 문서 텍스트의 투영일 뿐 CRDT 문자가 아니다 (src/blocks.mjs).
  const separators = exact.split(BLOCK_SEPARATOR).length - 1
  if (characterIdCount(runs) !== exact.length - separators) {
    return { usable: false, corrupt: true, reason: 'capture-inconsistent', runs: null }
  }
  // 두 자기보고 값은 서로도 맞아야 한다: 캡처 문자는 캡처 시점에 **이미 있던** 문자이므로
  // 캡처 state vector 기준으로 preexisting이어야 한다. 현재 범위에서 이름표만 베껴 오면
  // (마이그레이션의 가장 흔한 실수) 그 문자들은 캡처 이후 것이라 여기서 걸린다.
  const stateVector = captureStateVector(anchors)
  if (stateVector) {
    for (const run of runs) {
      const first = `${run.client}:${run.clock}`
      const last = `${run.client}:${run.clock + run.length - 1}`
      if (
        classifyCreation(first, stateVector) !== CREATION.PREEXISTING ||
        classifyCreation(last, stateVector) !== CREATION.PREEXISTING
      ) {
        return { usable: false, corrupt: true, reason: 'capture-inconsistent-with-state-vector', runs: null }
      }
    }
  }
  return { usable: true, corrupt: false, reason: null, runs }
}

/**
 * 규칙 0 — 이 레코드가 이 문서의 것인가. 셋 중 하나라도 어긋나면 selector를 읽지 않는다.
 * (`bound:false`의 사유는 값이 아니라 **관계**로만 적는다 — 리포트가 결정론적이어야 한다.)
 */
export function documentBinding(session, anchors) {
  const recordId = anchors && anchors.document ? anchors.document.id : null
  const sessionId = session ? session.documentId : null
  if (typeof recordId !== 'string' || !recordId) {
    return { bound: false, reason: 'record-has-no-document-identity' }
  }
  if (typeof sessionId !== 'string' || !sessionId) {
    return { bound: false, reason: 'document-has-no-identity' }
  }
  if (recordId !== sessionId) return { bound: false, reason: 'mismatch' }
  return { bound: true, reason: null }
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
  // 출처 증거가 **위조로 반증되면** 완전 일치 예외로도 통과시키지 않는다 (그 레코드의
  // 자기보고는 함께 선다 — 한 축이 거짓이면 나머지도 근거가 못 된다).
  const origins = originEvidence(session, anchors, raw)
  const provenance = !origins.consistent
    ? `forged/${origins.reason}`
    : origins.known
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
 * 해소된 범위 안에 **캡처 때 앵커에 들어 있던 바로 그 문자**가 몇 개 남았는가
 * (모르면 known:false). 범위가 블록 경계를 넘어도 센다 — 그래야 문단 분할·경계를
 * 걸친 앵커가 "증거 없음"으로 떨어져 정상 편집까지 orphan이 되는 일이 없다.
 *
 * 세는 것만으로는 부족하다: 이름표는 저장된 `exact`와 **자리별로 대응**해야 하고,
 * 살아남은 문자는 캡처 순서를 지켜야 한다(`captureCorrespondence`). 대응이 깨지면
 * `consistent:false` — 그 레코드의 출처 주장은 위조이므로 통과시키지 않는다.
 */
function originEvidence(session, anchors, raw) {
  const evidence = captureEvidence(anchors)
  if (!evidence.usable || raw.from === null || raw.to === null) {
    return { known: false, consistent: true, preexisting: 0, fresh: 0, reason: evidence.reason }
  }
  const { index, blocks } = liveBlocks(session)
  return captureCorrespondence(
    blocks,
    posToOffset(index, raw.from),
    posToOffset(index, raw.to),
    evidence.runs,
    anchors.textQuote.exact,
  )
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
  // 출처 증거가 깨진 레코드는 블록 문맥도 믿지 않는다 (한 레코드의 자기보고는 함께 선다).
  const evidence = captureEvidence(anchors)
  if (evidence.corrupt) return { status: `no-provenance/${evidence.reason}`, ...empty }
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
        : guard.provenance.startsWith('unknown') || guard.provenance.startsWith('forged')
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

/** 규칙 0에서 멈춘 결과 — selector를 한 번도 읽지 않았음을 모양으로 드러낸다. */
function unbound(policy, binding) {
  const raw = { status: 'not-evaluated', from: null, to: null, text: null }
  const guard = {
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
  return {
    ...orphaned(raw, guard, `document-identity/${binding.reason}`),
    policy: policy.id,
    document: binding,
    counterfactual: null,
  }
}

/**
 * Resolve a stored annotation record against the session's current document.
 * Never throws, never guesses: the result always names its method.
 *
 * 규칙 0(문서 정체성)은 **정책 밖**이다 — 어떤 해소 정책을 쓰든 남의 문서에 붙이는
 * 것은 답이 아니므로, 대조군 계산도 하지 않고 여기서 멈춘다.
 *
 * @param {object}  options.policy          POLICIES.* (기본 strict)
 * @param {boolean} options.quoteOnTombstone true면 naive 정책으로 돈다 (하위 호환).
 * @param {boolean} options.counterfactuals  false면 대조군 계산을 생략한다.
 */
export function resolveAnchors(session, anchors, options = {}) {
  const { quoteOnTombstone = false, counterfactuals = true } = options
  const policy = options.policy ?? (quoteOnTombstone ? POLICIES.naive : POLICIES.strict)

  const binding = documentBinding(session, anchors)
  if (!binding.bound) return unbound(policy, binding)

  const resolution = resolveWithPolicy(session, anchors, policy)
  resolution.document = binding

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

/** 종단점 상태의 닫힌 집합. 링크 평면이 "끊긴 종단점"을 볼 수 있게 하는 값이다. */
export const ANCHOR_STATES = Object.freeze(['bound', 'orphaned'])

/**
 * 저장 시 레코드에 실을 종단점 상태 — **측정값**이지 선언이 아니다(저장 시점에 실제로
 * 해소해 본 결과). orphan이 된 앵커를 링크가 조용히 가리키는 것을 막으려면, 그 사실이
 * 스토어에 남아야 한다 (`check_links.py`의 broken-endpoint 보고).
 */
export function anchorStateOf(session, anchors) {
  return resolveAnchors(session, anchors, { counterfactuals: false }).method === 'orphaned'
    ? 'orphaned'
    : 'bound'
}
