/**
 * 편집 시나리오 스위트 S1–S8 (브리프 §4 고정) + 파괴적 편집 S9·S10 + 블록 정체성
 * 계열 S11a–S11e + 진단 D1~D5.
 *
 * S9~S11은 전부 스위트 **밖**에서 실측된 오해소를 정식 시나리오로 들여온 것이다.
 * 스위트가 자기 모양 안에서만 초록인 것을 막는 유일한 방법은, 밖에서 재현된 실패를
 * 그때그때 안으로 들여오는 것이다.
 *   S9  블록 통째 삭제 — RelativePosition이 collapsed가 아니라 unresolved로 죽어
 *       tombstone 규칙을 우회했고, quote 복구가 살아남은 남의 문장에 붙었다.
 *       (`docs/verify/plane-editor-phase1-verify.md` note 3)
 *   S10 제자리 텍스트 교체 — affix guard가 한 글자 겹침으로 통과해 무관한 텍스트에
 *       붙었다. (같은 판정 note 4)
 *   S11 블록이 사라진 **뒤 같은 텍스트 블록이 새로 나타남** — 쌍둥이 이동(a·b)·
 *       재타이핑(c)·원격 작성(d)·v1 레코드(e). (`plane-editor-c1-verify.md` §5)
 * 전부 기대값은 **orphaned**다. 사용자가 앵커의 문자들을 지운 뒤이므로, 어딘가에
 * 붙이는 것은 전부 오부착이다 (조용한 오부착보다 명시적 orphan이 낫다).
 *
 * 각 시나리오는 **앵커 1개당 독립 시행(trial)** 으로 돌린다: 매번 새 세션을
 * 열어 6개 앵커를 전부 부착하고, 대상 앵커 기준으로 편집을 가한 뒤 **세 레인**을
 * 따로 측정한다. 레인을 나누는 이유는 브리프 §3의 파이프라인("저장 시 앵커 기록
 * → 로드 시 해소")과, 남이 편집한 문서에 옛 레코드를 들이대는 최악 경로가 서로
 * 다른 수치를 내기 때문이다. 하나로 합쳐 보고하면 어느 쪽 숫자인지 알 수 없다.
 *
 *   - live      : 편집이 일어난 세션 안에서 ProseMirror Decoration이 재정렬된 결과
 *                 (플러그인 상태 = 화면에 보이는 앵커)
 *   - pipeline  : 브리프 §3의 실제 저장 경로. 편집 후 살아있는 앵커는 저장 시점에
 *                 다시 캡처(`recaptured`)하고, 이미 orphan이면 원래 selector를 그대로
 *                 보존(`preserved`)해 저장한 뒤, 재로드 세션에서 해소한 결과
 *   - stale     : 편집 **전에** 캡처한 레코드를 편집 후 문서에 들이댄 결과
 *                 (오프라인 협업·다른 프로세스가 편집한 최악 경로)
 *
 * 기대 텍스트는 앵커 기계와 무관하게 시나리오 정의에서 문자열 연산으로 만든다.
 */
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { createHash } from 'node:crypto'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { spawnSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import * as Y from 'yjs'
import { ySyncPluginKey } from 'y-prosemirror'
import {
  FRAGMENT_NAME,
  FIXTURE_ANCHORS,
  MAIN_FIXTURE,
  TWIN_FIXTURE,
  S11_FIXTURE,
  buildTextIndex,
  offsetToPos,
  openSession,
  locate,
  posToOffset,
  previousTextblockStart,
  attachFixtureAnnotations,
  liveRange,
} from './session.mjs'
import { POLICIES, anchorStateOf, resolveAnchors, captureAnchors } from './anchors.mjs'
import { characterIdCount, itemFate, liveBlocks, rangeCharacterIds } from './blocks.mjs'
import {
  ANNOTATIONS_FILE,
  DOCUMENT_FILE,
  STORE_VERSION,
  annotationRecord,
  downgradeAnchors,
  loadStore,
  saveStore,
} from './store.mjs'

const CLIENT = Object.freeze({
  AUTHOR: 1,
  RELOAD: 2,
  REPLICA_A: 3,
  REPLICA_B: 4,
  MERGED: 5,
  REMOTE_PEER: 6,
})
const RELOAD_CHILD = fileURLToPath(new URL('./reload-child.mjs', import.meta.url))

const INSERT_BEFORE = '[PRE] '
const INSERT_INSIDE = '[IN]'
const INSERT_AFTER = '[END]'
const DELETE_BEFORE_CHARS = 8
const DELETE_HEAD_CHARS = 5
const DELETE_OVERRUN_CHARS = 6
const REPLICA_A_TEXT = '[A] '
const REPLICA_B_TEXT = ' [B]'

const textExpectation = (value) => ({ kind: 'text', value })
const orphanExpectation = () => ({ kind: 'orphan', value: null })
const half = (target) => Math.floor(target.exact.length / 2)

/* ------------------------------------------------------------------ *
 * classification — 4분류(생존/복구/orphan/오해소) + 경계 드리프트 분리
 * ------------------------------------------------------------------ */

/**
 * 기대 텍스트와 해소 텍스트가 **경계에서만** 어긋났는지 판정한다.
 * 한쪽이 다른 쪽의 prefix/suffix면 같은 자리에 붙되 경계가 밀린 것이고,
 * 그렇지 않으면 아예 다른 곳에 붙은 것이다(= 오해소).
 */
export function boundaryDrift(expectedText, actualText) {
  if (typeof expectedText !== 'string' || typeof actualText !== 'string') return null
  if (expectedText === actualText) return null
  const [shorter, longer] =
    actualText.length < expectedText.length ? [actualText, expectedText] : [expectedText, actualText]
  if (shorter.length === 0) return null
  if (longer.startsWith(shorter) || longer.endsWith(shorter)) {
    return { chars: longer.length - shorter.length }
  }
  return null
}

function classifyResolution(expected, resolution) {
  if (resolution.method === 'orphaned') return { outcome: 'orphaned', drift: null }
  if (expected.kind === 'orphan') return { outcome: 'wrong', drift: null }
  if (resolution.text === expected.value) {
    return { outcome: resolution.method === 'relative-position' ? 'survived' : 'recovered', drift: null }
  }
  const drift = boundaryDrift(expected.value, resolution.text)
  return drift ? { outcome: 'drifted', drift } : { outcome: 'wrong', drift: null }
}

function passed(expected, outcome) {
  return expected.kind === 'orphan'
    ? outcome === 'orphaned'
    : outcome === 'survived' || outcome === 'recovered'
}

/**
 * 반사실 계측: **더 약한 정책이었다면** 이 시행이 어디에 붙었을지를 같은 기준으로
 * 분류한다. 강화 규칙이 아무것도 막지 못하면(vacuous) 이 값이 전부 0으로 나오므로,
 * 리포트가 규칙의 값어치를 스스로 증명한다.
 */
function counterfactualSummary(expected, resolution) {
  const counterfactual = resolution.counterfactual
  if (!counterfactual) return null
  const summary = {}
  for (const [id, slice] of Object.entries(counterfactual)) {
    const { outcome } = classifyResolution(expected, slice)
    summary[id] = {
      method: slice.method,
      text: slice.text,
      outcome,
      wouldMisResolve: outcome === 'wrong',
      guardAccepted: slice.guardAccepted,
      quoteAcceptance: slice.quoteAcceptance,
      reason: slice.reason,
    }
  }
  return summary
}

function resolutionLane(name, expected, resolution, extra = {}) {
  const { outcome, drift } = classifyResolution(expected, resolution)
  return {
    lane: name,
    measured: true,
    outcome,
    pass: passed(expected, outcome),
    method: resolution.method,
    text: resolution.text,
    from: resolution.from,
    to: resolution.to,
    driftChars: drift ? drift.chars : 0,
    rawStatus: resolution.raw.status,
    rawText: resolution.raw.text,
    guardAccepted: resolution.guard.accepted,
    guardRule: resolution.guard.rule ?? null,
    guardAgreement: resolution.guard.agreement ?? 0,
    guardRequired: resolution.guard.required ?? 0,
    guardProvenance: resolution.guard.provenance ?? null,
    guardSurvivingChars: resolution.guard.survivingChars ?? null,
    recoveryStatus: resolution.recovery ? resolution.recovery.status : null,
    recoveryAcceptance: resolution.recovery ? (resolution.recovery.acceptance ?? null) : null,
    blockMatches: resolution.recovery ? (resolution.recovery.matches ?? null) : null,
    blockFresh: resolution.recovery ? (resolution.recovery.fresh ?? null) : null,
    counterfactual: counterfactualSummary(expected, resolution),
    reason: resolution.reason ?? null,
    ...extra,
  }
}

function liveLane(expected, snapshot) {
  if (snapshot === null) return { lane: 'live', measured: false }
  if (snapshot.orphaned) {
    return {
      lane: 'live',
      measured: true,
      outcome: 'orphaned',
      pass: passed(expected, 'orphaned'),
      text: null,
      driftChars: 0,
    }
  }
  if (expected.kind === 'orphan') {
    return { lane: 'live', measured: true, outcome: 'wrong', pass: false, text: snapshot.text, driftChars: 0 }
  }
  if (snapshot.text === expected.value) {
    return { lane: 'live', measured: true, outcome: 'survived', pass: true, text: snapshot.text, driftChars: 0 }
  }
  const drift = boundaryDrift(expected.value, snapshot.text)
  return {
    lane: 'live',
    measured: true,
    outcome: drift ? 'drifted' : 'wrong',
    pass: false,
    text: snapshot.text,
    driftChars: drift ? drift.chars : 0,
  }
}

function liveSnapshot(session, id) {
  const record = liveRange(session, id)
  if (!record) return null
  if (record.orphaned || record.from === null || record.to === null) {
    return { orphaned: true, from: null, to: null, text: null }
  }
  return {
    orphaned: false,
    from: record.from,
    to: record.to,
    text: session.doc.textBetween(record.from, record.to, '\n', '\n'),
  }
}

/**
 * 저장 시점의 앵커 = 살아있으면 현재 위치로 다시 캡처, orphan이면 원래 selector 보존.
 * (레코드를 지우지 않는다 — 나중에 quote로 되살아날 수 있어야 하므로.)
 */
function captureForSave(session, snapshot, fallbackAnchors) {
  if (snapshot && !snapshot.orphaned) {
    return { mode: 'recaptured', anchors: captureAnchors(session, snapshot.from, snapshot.to) }
  }
  return { mode: 'preserved', anchors: fallbackAnchors }
}

/**
 * 대상이 아닌 나머지 앵커들이 같은 편집을 어떻게 겪었는지.
 *   ok       : exact 그대로 해소 (편집이 안 닿음)
 *   residual : 편집이 범위에 걸쳐 잔여 범위로 축소/확장 (경계 일관 — 오류 아님)
 *   wrong    : 무관한 텍스트에 부착 (0이어야 함)
 *   orphaned : 명시적 orphan
 */
function bystanderReport(reload, attached, targetId, asStored = (anchors) => anchors) {
  const report = { total: 0, ok: 0, residual: 0, orphaned: 0, wrong: 0, notes: [] }
  for (const entry of attached) {
    if (entry.id === targetId) continue
    report.total += 1
    const resolution = resolveAnchors(reload, asStored(entry.record.anchors))
    if (resolution.method === 'orphaned') {
      report.orphaned += 1
      report.notes.push({ id: entry.id, outcome: 'orphaned', text: null })
      continue
    }
    if (resolution.text === entry.target.exact) {
      report.ok += 1
      continue
    }
    if (boundaryDrift(entry.target.exact, resolution.text)) {
      report.residual += 1
      report.notes.push({ id: entry.id, outcome: 'residual', text: resolution.text })
      continue
    }
    report.wrong += 1
    report.notes.push({ id: entry.id, outcome: 'wrong', text: resolution.text })
  }
  return report
}

function trialResult({ scenario, spec, target, expected, lanes, bystanders, extra }) {
  return {
    scenario: scenario.id,
    anchorId: spec.id,
    anchorQuote: target.exact,
    expected: { kind: expected.kind, text: expected.value },
    lanes,
    bystanders,
    ...(extra ? { extra } : {}),
  }
}

/* ------------------------------------------------------------------ *
 * generic per-anchor runner
 * ------------------------------------------------------------------ */

export const scenarioFixture = (scenario) => scenario.fixture ?? MAIN_FIXTURE

/**
 * 시나리오가 옛 저장 버전을 흉내 내면(`storeVersion: 1`), 레코드를 저장소가 로드할 때와
 * **같은 방식으로 강등**해서 들이댄다 (`store.mjs downgradeAnchors`). 이렇게 해야 "옛
 * 파일이 그대로 로드되는 경로"가 스위트 안에서 측정된다 — 하위호환 구멍은 여기서 난다.
 */
function storedAnchorsFor(scenario) {
  if (scenario.storeVersion === undefined || scenario.storeVersion === STORE_VERSION) {
    return (anchors) => anchors
  }
  return (anchors) => downgradeAnchors(anchors, scenario.storeVersion)
}

const offsetsOf = (text, needle) => {
  const out = []
  if (!needle) return out
  let at = text.indexOf(needle)
  while (at !== -1) {
    out.push(at)
    at = text.indexOf(needle, at + 1)
  }
  return out
}

/**
 * 텍스트 동일성만으로는 부착 **위치**를 검사하지 못한다 (같은 문장이 두 번 나오는 문서에서는
 * 남의 자리에 붙어도 "기대 텍스트와 같다"가 성립한다). 그래서 레인마다 실제로 붙은 오프셋과
 * 문서 안 exact 출현 위치를 같이 싣는다 — 어느 출현에도 해당하지 않으면 `atKnownOccurrence`
 * 가 false다 (집계는 run-suite의 `attachedOutsideQuote`).
 */
function placement(index, occurrences, resolution) {
  const landedOffset = resolution.from === null ? null : posToOffset(index, resolution.from)
  return {
    landedOffset,
    quoteOccurrences: occurrences,
    atKnownOccurrence: landedOffset === null ? null : occurrences.includes(landedOffset),
  }
}

function runPerAnchor(scenario) {
  const fixture = scenarioFixture(scenario)
  const asStored = storedAnchorsFor(scenario)
  const trials = []
  for (const spec of fixture.anchors) {
    const session = openSession({ clientID: CLIENT.AUTHOR, docJSON: fixture.doc })
    const attached = attachFixtureAnnotations(session, fixture.anchors)
    const entry = attached.find((item) => item.id === spec.id)
    const target = entry.target
    const expected = scenario.expected(target)

    scenario.edit(session, target, spec)

    const snapshot = liveSnapshot(session, spec.id)
    const saved = captureForSave(session, snapshot, entry.record.anchors)
    const merged = session.encodeState()
    const docText = session.text()
    session.close()

    const reload = openSession({ update: merged, clientID: CLIENT.RELOAD, docJSON: fixture.doc })
    const staleResolution = resolveAnchors(reload, asStored(entry.record.anchors))
    const pipelineResolution =
      saved.mode === 'recaptured' ? resolveAnchors(reload, asStored(saved.anchors)) : staleResolution
    const bystanders = bystanderReport(reload, attached, spec.id, asStored)
    const index = buildTextIndex(reload.doc)
    const occurrences = offsetsOf(index.text, target.exact)
    reload.close()

    trials.push(
      trialResult({
        scenario,
        spec,
        target,
        expected,
        lanes: {
          live: liveLane(expected, snapshot),
          pipeline: resolutionLane('pipeline', expected, pipelineResolution, {
            mode: saved.mode,
            ...placement(index, occurrences, pipelineResolution),
          }),
          stale: resolutionLane('stale', expected, staleResolution, {
            mode: 'as-attached',
            ...placement(index, occurrences, staleResolution),
          }),
        },
        bystanders,
        extra: {
          docTextAfterEdit: docText,
          quoteStillInDocument: occurrences.length > 0,
          ...(scenario.storeVersion === undefined ? {} : { recordStoreVersion: scenario.storeVersion }),
        },
      }),
    )
  }
  return trials
}

/* ------------------------------------------------------------------ *
 * S11 편집 헬퍼 — "블록이 사라지고 같은 텍스트 블록이 새로 나타난다" 계열
 * ------------------------------------------------------------------ */

const blockRange = (session, index) => {
  const from = session.doc.resolve(0).posAtIndex(index)
  return { from, to: from + session.doc.child(index).nodeSize }
}

const deleteBlock = (session, index) => {
  const { from, to } = blockRange(session, index)
  session.dispatch((tr) => tr.delete(from, to))
}

/** cut+paste = 블록을 잘라 문서 끝에 붙인다 (Yjs에서는 옛 element 삭제 + 새 element 삽입). */
const moveBlockToEnd = (session, index) => {
  const node = session.doc.child(index)
  deleteBlock(session, index)
  session.dispatch((tr) => tr.insert(session.doc.content.size, node))
}

/**
 * 문서 끝에 문단 하나를 새로 입력한다 = "같은 문장을 다시 타이핑".
 * 노드는 반드시 **문서 자신의 스키마**로 만든다 (모듈 스키마 인스턴스로 만들면 PM이
 * 그 트랜잭션을 조용히 버려서, 시나리오가 그냥 "블록 삭제"로 퇴화한다).
 */
const appendParagraph = (session, text) =>
  session.dispatch((tr) => {
    const { schema } = session.doc.type
    return tr.insert(session.doc.content.size, schema.node('paragraph', null, schema.text(text)))
  })

/** 앵커가 든 블록과 텍스트가 같은 **다른** 블록 (S11 fixture가 앵커마다 하나씩 보장한다). */
function twinBlockIndex(session, target) {
  const anchorText = session.doc.child(target.blockIndex).textContent
  for (let index = 0; index < session.doc.childCount; index += 1) {
    if (index !== target.blockIndex && session.doc.child(index).textContent === anchorText) return index
  }
  throw new Error(`S11: fixture has no twin block for block ${target.blockIndex}`)
}

/** 블록 하나를 지우면 그 뒤 블록들의 index가 하나씩 앞으로 당겨진다. */
const shiftAfterDelete = (index, deleted) => (index > deleted ? index - 1 : index)

/* ------------------------------------------------------------------ *
 * S12 편집 헬퍼 — "흔한 편집 조작" (orphan 예산 계측용)
 * ------------------------------------------------------------------ */

/** 편집기의 블록 이동 명령/드래그 = 삭제와 삽입이 **한 트랜잭션**. */
const moveBlockOneTransaction = (session, index) => {
  const node = session.doc.child(index)
  const { from, to } = blockRange(session, index)
  session.dispatch((tr) => {
    tr.delete(from, to)
    return tr.insert(tr.doc.content.size, node)
  })
}

/** 줄 처음에서 Backspace = 앞 블록과 병합 (경계 문자 두 개를 지운다). */
const joinWithPrevious = (session, blockIndex) => {
  if (blockIndex <= 0) throw new Error('S12: the anchored block has no previous block to join into')
  const boundary = blockRange(session, blockIndex).from
  session.dispatch((tr) => tr.delete(boundary - 1, boundary + 1))
}

/**
 * y-prosemirror는 자기 plugin key를 트랜잭션 origin으로 쓴다. 그 origin을 추적하지 않으면
 * UndoManager가 **아무것도 되돌리지 않아서** undo 시나리오가 조용히 "그냥 삭제"로 퇴화한다
 * (되돌아왔는지는 시나리오가 문서 텍스트로 검증한다).
 */
const undoManagerFor = (session) =>
  new Y.UndoManager(session.fragment, { trackedOrigins: new Set([ySyncPluginKey]) })

/* ------------------------------------------------------------------ *
 * scenario definitions
 * ------------------------------------------------------------------ */

export const SCENARIOS = [
  {
    id: 'S1',
    title: '앵커 앞에 텍스트 삽입',
    target: '생존 100%',
    gating: true,
    expected: (t) => textExpectation(t.exact),
    edit: (session, t) => session.dispatch((tr) => tr.insertText(INSERT_BEFORE, t.from)),
  },
  {
    id: 'S2',
    title: '앵커 범위 안에 삽입',
    target: '범위 확장 생존',
    gating: true,
    expected: (t) => textExpectation(t.exact.slice(0, half(t)) + INSERT_INSIDE + t.exact.slice(half(t))),
    edit: (session, t) => session.dispatch((tr) => tr.insertText(INSERT_INSIDE, t.from + half(t))),
  },
  {
    id: 'S3',
    title: '앵커 앞 텍스트 삭제',
    target: '생존 100%',
    gating: true,
    expected: (t) => textExpectation(t.exact),
    edit: (session, t) => {
      if (t.from > t.blockInnerFrom) {
        const from = Math.max(t.blockInnerFrom, t.from - DELETE_BEFORE_CHARS)
        return session.dispatch((tr) => tr.delete(from, t.from))
      }
      const previous = previousTextblockStart(session, t.blockIndex)
      if (previous === null) throw new Error(`S3: no preceding textblock for ${t.exact}`)
      return session.dispatch((tr) => tr.delete(previous, previous + DELETE_HEAD_CHARS))
    },
  },
  {
    id: 'S4',
    title: '앵커 범위 일부 겹쳐 삭제',
    target: '잔여 범위로 축소 생존',
    gating: true,
    expected: (t) => textExpectation(t.exact.slice(0, half(t))),
    edit: (session, t) => {
      const from = t.from + half(t)
      const to = Math.min(t.to + DELETE_OVERRUN_CHARS, t.blockInnerTo)
      return session.dispatch((tr) => tr.delete(from, to))
    },
  },
  {
    id: 'S5',
    title: '앵커 범위 전체 삭제',
    target: 'orphaned 판정 (오해소 0)',
    gating: true,
    expected: () => orphanExpectation(),
    edit: (session, t) => session.dispatch((tr) => tr.delete(t.from, t.to)),
  },
  {
    id: 'S6',
    title: '앵커 담은 블록 이동 (cut+paste)',
    // 기대값은 "이동을 따라간다"로 **그대로 둔다**. 지금 엔진은 여기서 복구하지 못하므로
    // 이 시나리오는 통과가 아니라 **복구율 손실의 계측**이 된다 (D3가 그 이유를 잰다).
    // 기대값을 orphan으로 낮추면 잃은 것이 표에서 사라진다.
    target: '복구율 손실 계측 (블록 정체성이 파괴되는 편집 — D3)',
    gating: false,
    expected: (t) => textExpectation(t.exact),
    edit: (session, t) => {
      const node = session.doc.child(t.blockIndex)
      session.dispatch((tr) => tr.delete(t.blockOuterFrom, t.blockOuterTo))
      session.dispatch((tr) => tr.insert(session.doc.content.size, node))
    },
  },
  {
    id: 'S7',
    title: 'Yjs 동시 편집 병합',
    target: '실측 보고 (RelativePosition 생존율)',
    gating: false,
    run: (scenario) => {
      const trials = []
      const author = openSession({ clientID: CLIENT.AUTHOR })
      const attached = attachFixtureAnnotations(author)
      const baseUpdate = author.encodeState()
      author.close()

      for (const spec of FIXTURE_ANCHORS) {
        const entry = attached.find((item) => item.id === spec.id)
        const target = entry.target
        const expected = textExpectation(target.exact)

        const replicaA = openSession({ update: baseUpdate, clientID: CLIENT.REPLICA_A })
        const replicaB = openSession({ update: baseUpdate, clientID: CLIENT.REPLICA_B })
        attachFixtureAnnotations(replicaA)
        const targetA = locate(replicaA, spec)
        const targetB = locate(replicaB, spec)

        // offline, concurrent, both inside the anchor's own block
        replicaA.dispatch((tr) => tr.insertText(REPLICA_A_TEXT, targetA.blockInnerFrom))
        replicaB.dispatch((tr) => tr.insertText(REPLICA_B_TEXT, targetB.blockInnerTo))

        Y.applyUpdate(replicaA.ydoc, Y.encodeStateAsUpdate(replicaB.ydoc))
        Y.applyUpdate(replicaB.ydoc, Y.encodeStateAsUpdate(replicaA.ydoc))
        const converged = replicaA.text() === replicaB.text()
        const mergedText = replicaA.text()
        const snapshot = liveSnapshot(replicaA, spec.id)
        const saved = captureForSave(replicaA, snapshot, entry.record.anchors)
        const merged = replicaA.encodeState()
        replicaA.close()
        replicaB.close()

        const reload = openSession({ update: merged, clientID: CLIENT.MERGED })
        const staleResolution = resolveAnchors(reload, entry.record.anchors)
        const pipelineResolution =
          saved.mode === 'recaptured' ? resolveAnchors(reload, saved.anchors) : staleResolution
        const bystanders = bystanderReport(reload, attached, spec.id)
        reload.close()

        trials.push(
          trialResult({
            scenario,
            spec,
            target,
            expected,
            lanes: {
              live: liveLane(expected, snapshot),
              pipeline: resolutionLane('pipeline', expected, pipelineResolution, { mode: saved.mode }),
              stale: resolutionLane('stale', expected, staleResolution, { mode: 'as-attached' }),
            },
            bystanders,
            extra: { converged, docTextAfterEdit: mergedText },
          }),
        )
      }
      return trials
    },
  },
  {
    id: 'S8',
    title: '저장 → 프로세스 재시작 → 재로드',
    target: '전 앵커 복원',
    gating: true,
    run: (scenario) => {
      const author = openSession({ clientID: CLIENT.AUTHOR })
      const attached = attachFixtureAnnotations(author)
      const dir = mkdtempSync(join(tmpdir(), 'plane-editor-s8-'))
      saveStore(dir, {
        fragment: FRAGMENT_NAME,
        documentId: author.documentId,
        docUpdate: author.encodeState(),
        docJSON: author.doc.toJSON(),
        annotations: attached.map((item) => ({
          ...item.record,
          anchorState: anchorStateOf(author, item.record.anchors),
        })),
      })
      author.close()

      const child = spawnSync(process.execPath, [RELOAD_CHILD, dir], { encoding: 'utf8' })
      rmSync(dir, { recursive: true, force: true })
      if (child.status !== 0) {
        throw new Error(`S8 reload child failed (${child.status}): ${child.stderr}`)
      }
      const payload = JSON.parse(child.stdout)
      const separateProcess = payload.pid !== process.pid

      return attached.map((entry) => {
        const resolved = payload.annotations.find((item) => item.id === entry.id)
        const expected = textExpectation(entry.target.exact)
        const resolution = resolved.resolution
        // 편집이 없는 round-trip이라 저장 앵커와 원본 앵커가 같다 = 두 레인이 동일.
        const lane = resolutionLane('pipeline', expected, resolution, { mode: 'round-trip' })
        return trialResult({
          scenario,
          spec: entry,
          target: entry.target,
          expected,
          lanes: {
            live: { lane: 'live', measured: false },
            pipeline: lane,
            stale: { ...resolutionLane('stale', expected, resolution, { mode: 'round-trip' }) },
          },
          bystanders: { total: 0, ok: 0, residual: 0, orphaned: 0, wrong: 0, notes: [] },
          extra: { separateProcess, storeVersion: payload.storeVersion, childPlaneRecords: payload.planeRecords },
        })
      })
    },
  },
  {
    id: 'S9',
    title: '앵커 담은 블록 통째 삭제',
    target: 'orphaned 판정 (오해소 0)',
    gating: true,
    fixture: TWIN_FIXTURE,
    expected: () => orphanExpectation(),
    edit: (session, t) => session.dispatch((tr) => tr.delete(t.blockOuterFrom, t.blockOuterTo)),
  },
  {
    id: 'S10',
    title: '앵커 텍스트 제자리 교체',
    target: 'orphaned 판정 (오해소 0)',
    gating: true,
    fixture: TWIN_FIXTURE,
    expected: () => orphanExpectation(),
    edit: (session, t, spec) => {
      // 선택 후 타이핑 = 삭제 직후 같은 자리에 삽입. 앵커의 문자들은 사라졌지만
      // RelativePosition은 살아 돌아온다 -> guard가 유일한 방어선인 경로.
      session.dispatch((tr) => tr.delete(t.from, t.to))
      session.dispatch((tr) => tr.insertText(spec.replacement, t.from))
    },
  },

  /* ---------------------------------------------------------------- *
   * S11 — 앵커 블록이 사라진 **뒤 같은 텍스트 블록이 새로 나타나는** 계열.
   *
   * vnv 적대 프로브(docs/verify/plane-editor-c1-adversarial.mjs)가 CONFIRMED로
   * 확정한 오해소 4종을 정식 시나리오로 들여온 것이다. 넷은 뿌리가 하나다:
   * "블록 텍스트가 같고 캡처 이후 생겼다"는 **이동의 증거가 아니다**. 기대값은 전부
   * orphaned이며, 어디에 붙든 오해소로 집계된다.
   *   S11a/S11b = N1/N1b (쌍둥이 블록이 이동, 순서 양쪽)
   *   S11c      = N4 (삭제 후 같은 문장 재타이핑)
   *   S11d      = N3 (원격 피어가 같은 문장 블록을 새로 작성)
   *   S11e      = N8 (v1 레코드 하위호환 — 출처 증거 없는 레코드가 문자열만으로 통과)
   * ---------------------------------------------------------------- */
  {
    id: 'S11a',
    title: '쌍둥이 블록 이동 후 앵커 블록 삭제',
    target: 'orphaned 판정 (오해소 0)',
    gating: true,
    fixture: S11_FIXTURE,
    expected: () => orphanExpectation(),
    edit: (session, t) => {
      const twin = twinBlockIndex(session, t)
      moveBlockToEnd(session, twin)
      deleteBlock(session, shiftAfterDelete(t.blockIndex, twin))
    },
  },
  {
    id: 'S11b',
    title: '앵커 블록 삭제 후 쌍둥이 블록 이동 (순서 반대)',
    target: 'orphaned 판정 (오해소 0 — 순서 산물이 아님)',
    gating: true,
    fixture: S11_FIXTURE,
    expected: () => orphanExpectation(),
    edit: (session, t) => {
      const twin = twinBlockIndex(session, t)
      deleteBlock(session, t.blockIndex)
      moveBlockToEnd(session, shiftAfterDelete(twin, t.blockIndex))
    },
  },
  {
    id: 'S11c',
    title: '앵커 블록 삭제 후 같은 문장 재타이핑',
    target: 'orphaned 판정 (오해소 0)',
    gating: true,
    fixture: S11_FIXTURE,
    expected: () => orphanExpectation(),
    edit: (session, t) => {
      const text = session.doc.child(t.blockIndex).textContent
      deleteBlock(session, t.blockIndex)
      appendParagraph(session, text)
    },
  },
  {
    id: 'S11d',
    title: '원격 피어가 같은 문장 블록 작성 + 앵커 블록 삭제',
    target: 'orphaned 판정 (오해소 0)',
    gating: true,
    fixture: S11_FIXTURE,
    expected: () => orphanExpectation(),
    edit: (session, t) => {
      // 다른 client가 오프라인에서 같은 문장을 새 문단으로 쓴 뒤 병합해 온다.
      // 캡처 시점 state vector는 이 client를 아예 모른다 -> 출처 미상.
      const text = session.doc.child(t.blockIndex).textContent
      const peer = openSession({ update: session.encodeState(), clientID: CLIENT.REMOTE_PEER })
      appendParagraph(peer, text)
      const peerUpdate = Y.encodeStateAsUpdate(peer.ydoc, Y.encodeStateVector(session.ydoc))
      peer.close()
      deleteBlock(session, t.blockIndex)
      Y.applyUpdate(session.ydoc, peerUpdate)
    },
  },
  {
    id: 'S11e',
    title: 'v1 레코드(출처 미상) + 앵커 텍스트 제자리 교체',
    target: 'orphaned 판정 (오해소 0 — 하위호환 경로)',
    gating: true,
    fixture: S11_FIXTURE,
    // 옛 저장소가 쓴 레코드를 로드했을 때와 같은 상태로 강등해서 해소한다.
    storeVersion: 1,
    expected: () => orphanExpectation(),
    edit: (session, t, spec) => {
      session.dispatch((tr) => tr.delete(t.from, t.to))
      session.dispatch((tr) => tr.insertText(spec.replacement, t.from))
    },
  },

  /* ---------------------------------------------------------------- *
   * S12 — **흔한 편집 조작의 orphan 예산**.
   *
   * S9~S11은 "앵커의 문자를 지운 뒤"라서 orphan이 정답인 계열이다. 여기 넷은 반대다:
   * 편집이 끝나도 앵커 텍스트가 문서에 **그대로 남아 있는데** 앵커가 끊긴다. 그래서
   * 기대값을 orphan으로 낮추지 않고 `textExpectation`으로 두어, 통과가 아니라 **손실이
   * 표에 남게** 한다 (S6와 같은 취급).
   *
   * 목표는 orphan을 줄이는 것이 아니라 **보이게 하는 것**이다. 정밀도(오해소 0)만 재는
   * 게이트는 재현율을 얼마든지 깎을 수 있으므로, 이 조작들의 orphan율을 REPORT에 게시해
   * 대가가 항상 같이 읽히게 한다 (`run-suite.mjs`의 orphan 예산 표).
   * ---------------------------------------------------------------- */
  {
    id: 'S12a',
    title: '앵커 담은 블록 이동 (한 트랜잭션 = 편집기 이동 명령)',
    target: 'orphan 예산 계측 (앵커 텍스트는 문서에 그대로 남는다)',
    gating: false,
    commonOperation: 'move-block-one-transaction',
    expected: (t) => textExpectation(t.exact),
    edit: (session, t) => moveBlockOneTransaction(session, t.blockIndex),
  },
  {
    id: 'S12b',
    title: '앞 블록과 병합 (줄 처음에서 Backspace)',
    target: 'orphan 예산 계측',
    gating: false,
    commonOperation: 'join-into-previous-block',
    expected: (t) => textExpectation(t.exact),
    edit: (session, t) => joinWithPrevious(session, t.blockIndex),
  },
  {
    id: 'S12c',
    title: '앵커 시작점에서 문단 분할 (Enter)',
    target: 'orphan 예산 계측',
    gating: false,
    commonOperation: 'split-at-anchor-start',
    expected: (t) => textExpectation(t.exact),
    edit: (session, t) => session.dispatch((tr) => tr.split(t.from)),
  },
  {
    id: 'S12d',
    title: '앵커 담은 블록 삭제 후 undo',
    target: 'orphan 예산 계측 (문서는 완전히 복원된다)',
    gating: false,
    commonOperation: 'delete-block-then-undo',
    expected: (t) => textExpectation(t.exact),
    edit: (session, t) => {
      const undo = undoManagerFor(session)
      const before = session.text()
      deleteBlock(session, t.blockIndex)
      undo.undo()
      if (session.text() !== before) {
        // undo가 실제로 되돌리지 않았다면 이 시나리오는 "그냥 삭제"의 다른 이름일 뿐이다.
        throw new Error('S12d: undo did not restore the document — the scenario would be vacuous')
      }
    },
  },
]

/**
 * orphan 예산 표의 대상 = 편집 후에도 앵커 텍스트가 문서에 남는 **흔한 조작**들.
 * S2(범위 안 삽입)는 살아남아야 하는 대조군이고, S6은 같은 이동의 2-트랜잭션 모양이다.
 */
export const COMMON_OPERATIONS = Object.freeze([
  { id: 'S2', operation: 'insert-inside-anchor', control: true },
  { id: 'S6', operation: 'move-block-two-transactions', control: false },
  { id: 'S12a', operation: 'move-block-one-transaction', control: false },
  { id: 'S12b', operation: 'join-into-previous-block', control: false },
  { id: 'S12c', operation: 'split-at-anchor-start', control: false },
  { id: 'S12d', operation: 'delete-block-then-undo', control: false },
])

/* ------------------------------------------------------------------ *
 * D1 — non-gating boundary diagnostic (Phase 2 design input)
 * ------------------------------------------------------------------ */

export function runBoundaryDiagnostic() {
  const rows = []
  for (const spec of FIXTURE_ANCHORS) {
    const session = openSession({ clientID: CLIENT.AUTHOR })
    const attached = attachFixtureAnnotations(session)
    const entry = attached.find((item) => item.id === spec.id)
    const target = entry.target

    session.dispatch((tr) => tr.insertText(INSERT_AFTER, target.to))
    const snapshot = liveSnapshot(session, spec.id)
    const merged = session.encodeState()
    session.close()

    const reload = openSession({ update: merged, clientID: CLIENT.RELOAD })
    const resolution = resolveAnchors(reload, entry.record.anchors)
    reload.close()

    rows.push({
      anchorId: spec.id,
      exact: target.exact,
      liveText: snapshot.text,
      staleText: resolution.text,
      liveKeptExact: snapshot.text === target.exact,
      staleKeptExact: resolution.text === target.exact,
      lanesAgree: snapshot.text === resolution.text,
    })
  }
  return {
    id: 'D1',
    title: '앵커 끝 경계에 삽입 (비게이팅 진단)',
    question: 'RelativePosition과 Decoration이 끝 경계 삽입을 같은 쪽으로 흡수하는가?',
    rows,
    lanesAgree: rows.every((row) => row.lanesAgree),
  }
}

/* ------------------------------------------------------------------ *
 * D2 — Yjs 삭제 정렬 진단: PM Step 범위 vs y-prosemirror가 Yjs에 넣은 삭제 범위
 * ------------------------------------------------------------------ */

export function runDeletionAlignmentDiagnostic() {
  const rows = []
  for (const spec of FIXTURE_ANCHORS) {
    const session = openSession({ clientID: CLIENT.AUTHOR })
    const attached = attachFixtureAnnotations(session)
    const entry = attached.find((item) => item.id === spec.id)
    const target = entry.target

    const before = session.text()
    const pmFrom = target.from + half(target)
    const pmTo = Math.min(target.to + DELETE_OVERRUN_CHARS, target.blockInnerTo)
    session.dispatch((tr) => tr.delete(pmFrom, pmTo))
    const after = session.text()

    // y-prosemirror는 PM step을 그대로 옮기지 않고 텍스트를 diff(lib0 simpleDiff)해
    // Yjs 삭제 범위를 정한다. 같은 문자가 경계에 있으면 정렬이 한 칸 밀린다.
    let common = 0
    while (common < after.length && before[common] === after[common]) common += 1
    const deletedChars = before.length - after.length
    const pmDeleteStart = target.textFrom + half(target)

    rows.push({
      anchorId: spec.id,
      exact: target.exact,
      pmDeleteStart,
      yjsDeleteStart: common,
      shift: common - pmDeleteStart,
      deletedChars,
    })
    session.close()
  }
  return {
    id: 'D2',
    title: '삭제 정렬 어긋남 (PM Step 대 y-prosemirror diff)',
    question: 'PM이 지운 범위와 y-prosemirror가 Yjs에 기록한 삭제 범위가 같은 자리인가?',
    rows,
    aligned: rows.every((row) => row.shift === 0),
  }
}

/* ------------------------------------------------------------------ *
 * D3 — 이동과 재타이핑을 CRDT가 구분하는가 (규칙 C의 근거 측정)
 * ------------------------------------------------------------------ */

const D3_SENTENCE = 'The ledger records a disputed clause and then stops.'
const D3_DOC = {
  type: 'doc',
  content: [
    'Opening block of the diagnostic document.',
    D3_SENTENCE,
    'Closing block of the diagnostic document.',
  ].map((text) => ({ type: 'paragraph', content: [{ type: 'text', text }] })),
}
const D3_ANCHOR = { id: 'd3', quote: 'disputed clause', occurrence: 0, body: 'identity diagnostic' }
const D3_DOCUMENT_ID = 'doc-move-identity-diagnostic'

/**
 * "블록을 옮겼다"와 "같은 문장을 지웠다 다시 쳤다"가 CRDT 층에서 구별되는지 직접 잰다.
 * 같은 문서 상태에 같은 앵커를 걸고 두 편집을 각각 가한 뒤, 결과 Yjs 업데이트의
 * sha256을 비교한다. 이 값이 같으면 **어떤 해소 규칙도 둘을 가를 수 없다** — 규칙 C가
 * 텍스트 동일성 대신 item 정체성만 믿는 이유가 여기서 나온다 (해석이 아니라 측정).
 */
export function runMoveIdentityDiagnostic() {
  const digest = (bytes) => createHash('sha256').update(Buffer.from(bytes)).digest('hex')
  const run = (label, edit) => {
    // 세 갈래는 **편집만** 달라야 하는 대조 실험이므로 문서 정체성도 같은 값으로 고정한다
    // (발급기에 맡기면 문서마다 다른 id가 상태에 섞여 업데이트 해시 비교가 무의미해진다).
    const session = openSession({ clientID: CLIENT.AUTHOR, docJSON: D3_DOC, documentId: D3_DOCUMENT_ID })
    const entry = attachFixtureAnnotations(session, [D3_ANCHOR])[0]
    edit(session)
    const update = digest(session.encodeState())
    const text = session.text()
    session.close()
    return {
      label,
      storedBlockItemId: entry.record.anchors.blockContext.itemId,
      updateSha256: update,
      docText: text,
    }
  }

  const moved = run('블록 이동 (같은 PM 노드를 잘라 문서 끝에 붙임)', (session) => moveBlockToEnd(session, 1))
  const retyped = run('같은 문장 재타이핑 (블록 삭제 후 같은 문장을 새로 입력)', (session) => {
    deleteBlock(session, 1)
    appendParagraph(session, D3_SENTENCE)
  })
  const deleted = run('대조군: 블록 삭제만', (session) => deleteBlock(session, 1))

  return {
    id: 'D3',
    title: '블록 이동 대 같은 문장 재타이핑 (규칙 C의 근거)',
    question: '"같은 텍스트 블록이 새로 생겼다"를 이동의 증거로 써도 되는가?',
    rows: [moved, retyped, deleted],
    moveIsDistinguishable: moved.updateSha256 !== retyped.updateSha256,
    sameDocumentText: moved.docText === retyped.docText,
    deleteIsDistinguishable: moved.updateSha256 !== deleted.updateSha256,
  }
}

/* ------------------------------------------------------------------ *
 * D4 — 옛 저장 파일(v1)이 실제로 어떻게 로드되는가 (하위호환 경로)
 * ------------------------------------------------------------------ */

/**
 * S11e는 강등 함수를 직접 불러 v1 레코드를 흉내 내지만, 실제 위험은 **디스크에 남아
 * 있는 파일**이다. 여기서는 Phase 1이 쓰던 모양 그대로 v1 파일을 만들어 `loadStore`로
 * 읽고, 그 레코드가 (a) 버려지지 않고 로드되며 (b) 출처 미상으로 표시되고 (c) 문서
 * 정체성을 **입양하지 않으며** (d) 어떤 편집에서도 부착되지 않는지를 확인한다.
 * 알 수 없는 버전은 여전히 거절해야 한다.
 *
 * (c)가 이 진단의 핵심축이다: 옛 파일이 스토어의 documentId를 찍어 받으면, 남의 문서
 * 옆에 놓인 주석 파일이 그 문서의 레코드가 되고 재저장으로 v3 종단점까지 승격된다
 * (실측: vnv B3 -> B7). 그래서 "동거는 정체성이 아니다"를 파일 경로에서 못 박는다.
 *
 * 대신 **vacuous 방지 대조군**을 같은 세션에 둔다: 같은 문서에서 정체성을 싣고 캡처된
 * 레코드는 정상 해소된다. 그것이 없으면 "전부 orphan"으로도 이 진단이 통과한다.
 */
export function runLegacyStoreDiagnostic() {
  const fixture = TWIN_FIXTURE
  const spec = fixture.anchors.find((anchor) => anchor.id === 'b4') ?? fixture.anchors[0]
  // 대조군 앵커: 편집이 닿지 않는 다른 앵커. 같은 문서·같은 세션에서 정상 해소돼야 한다.
  const controlSpec = fixture.anchors.find((anchor) => anchor.id !== spec.id)
  const session = openSession({ clientID: CLIENT.AUTHOR, docJSON: fixture.doc })
  const [entry, controlEntry] = attachFixtureAnnotations(session, [spec, controlSpec])
  const target = entry.target
  session.dispatch((tr) => tr.delete(target.from, target.to))
  session.dispatch((tr) => tr.insertText(spec.replacement, target.from))
  const docUpdate = session.encodeState()
  const docJSON = session.doc.toJSON()
  session.close()

  const dir = mkdtempSync(join(tmpdir(), 'plane-editor-d4-'))
  const record = annotationRecord(entry.record)
  // Phase 1이 쓰던 파일 모양: version 1 + 세 번째 selector 없음 + 문서 정체성 없음.
  const legacyRecord = {
    id: record.id,
    anchors: { relativePosition: record.anchors.relativePosition, textQuote: record.anchors.textQuote },
    body: record.body,
    status: record.status,
  }
  writeFileSync(
    join(dir, DOCUMENT_FILE),
    `${JSON.stringify({ fragment: FRAGMENT_NAME, yUpdateBase64: Buffer.from(docUpdate).toString('base64'), prosemirrorJSON: docJSON }, null, 2)}\n`,
  )
  writeFileSync(
    join(dir, ANNOTATIONS_FILE),
    `${JSON.stringify({ version: 1, document: DOCUMENT_FILE, annotations: [legacyRecord] }, null, 2)}\n`,
  )

  const store = loadStore(dir)
  const reload = openSession({ update: store.docUpdate, clientID: CLIENT.RELOAD, docJSON: fixture.doc })
  const loaded = store.annotations[0]
  const resolution = resolveAnchors(reload, loaded.anchors, { counterfactuals: false })
  // 대조군: 같은 문서·같은 세션에서 정체성을 실은 레코드는 정상 해소된다 (vacuous 방지).
  const control = resolveAnchors(reload, controlEntry.record.anchors, { counterfactuals: false })

  // ★ 세탁 경로: 편집기가 **평범하게** 하는 일(load -> save)이 이 레코드를 승격시키는가.
  // 여기가 열려 있으면 옛 파일이 저장 한 번에 v3 링크 종단점이 된다 (vnv B7).
  saveStore(dir, {
    fragment: store.fragment,
    documentId: reload.documentId,
    docUpdate: reload.encodeState(),
    docJSON: reload.doc.toJSON(),
    annotations: [{ ...loaded, anchorState: anchorStateOf(reload, loaded.anchors) }],
  })
  reload.close()
  const resaved = loadStore(dir)
  const resavedRecord = resaved.annotations[0]
  const promotedBySave = Boolean(resavedRecord.anchors.document)

  writeFileSync(
    join(dir, ANNOTATIONS_FILE),
    `${JSON.stringify({ version: 99, document: DOCUMENT_FILE, annotations: [legacyRecord] }, null, 2)}\n`,
  )
  let rejectsUnknownVersion = false
  try {
    loadStore(dir)
  } catch {
    rejectsUnknownVersion = true
  }

  // ★ 게이트와 편집기가 **같은 답을 내는가**(불변식 I-1·I-2). 커밋 게이트(check_links.py)가
  // 거절하는 두 모양을 편집기도 거절해야 한다 — 반대 방향(게이트 통과 + 편집기 거절)이
  // 실측된 결함이었다(vnv H3·H4). 여기서는 편집기 쪽만 잰다; 게이트 쪽은
  // `run-link-checks.mjs`의 negative control이 같은 모양으로 고정한다.
  const identityless = { id: record.id, body: record.body, status: record.status,
    anchorState: 'bound' }
  const refusals = {
    // (i) anchors 를 통째로 싣지 않은 v3 레코드.
    recordWithoutAnchors: [identityless],
    // (ii) 같은 id 레코드 둘 — 종단점 하나에 레코드 하나.
    duplicateRecordId: [record, { ...record, body: 'duplicate' }],
  }
  const editorRefuses = {}
  for (const [shape, annotations] of Object.entries(refusals)) {
    writeFileSync(
      join(dir, ANNOTATIONS_FILE),
      `${JSON.stringify({ version: STORE_VERSION, document: DOCUMENT_FILE,
        documentId: resaved.documentId, annotations }, null, 2)}\n`,
    )
    try {
      loadStore(dir)
      editorRefuses[shape] = false
    } catch {
      editorRefuses[shape] = true
    }
  }
  rmSync(dir, { recursive: true, force: true })

  return {
    id: 'D4',
    title: '옛 저장 파일(v1) 하위호환 — 로드는 되지만 출처는 미상이고, 정체성을 입양하지 않는다',
    question: '남의 문서 옆에 놓인 옛 주석 파일이 그 문서의 레코드가 되는가?',
    currentVersion: STORE_VERSION,
    loadedVersion: store.version,
    recordsLoaded: store.annotations.length,
    // 동거는 정체성의 증거가 아니다 — 스토어의 documentId를 찍어 주지 않는다(입양 금지).
    documentAdopted: Boolean(loaded.anchors.document),
    bindable: Boolean(loaded.anchors.document),
    markedLegacy: Boolean(loaded.anchors.legacy),
    legacyReason: loaded.anchors.legacy ? loaded.anchors.legacy.reason : null,
    blockContextDropped: loaded.anchors.blockContext === null,
    anchorQuote: entry.target.exact,
    replacement: spec.replacement,
    method: resolution.method,
    attachedText: resolution.text,
    reason: resolution.reason,
    guardProvenance: resolution.guard.provenance,
    orphaned: resolution.method === 'orphaned',
    // load -> save 를 거쳐도 승격되지 않는다(sticky). 저장된 레코드는 미상 표시를 그대로 들고
    // 나가고 종단점 상태는 측정값(orphaned)이다.
    promotedBySave,
    savedStoreVersion: resaved.version,
    savedRecordMarkedLegacy: Boolean(resavedRecord.anchors.legacy),
    savedAnchorState: resavedRecord.anchorState ?? null,
    // 대조군이 살아 있어야 위 orphan이 "전부 거절"의 산물이 아님을 말할 수 있다.
    controlResolved: control.method !== 'orphaned',
    controlMethod: control.method,
    rejectsUnknownVersion,
    // 게이트가 거절하는 모양을 편집기도 거절한다 (I-1·I-2의 편집기 쪽 절반).
    rejectsRecordWithoutAnchors: editorRefuses.recordWithoutAnchors,
    rejectsDuplicateRecordId: editorRefuses.duplicateRecordId,
  }
}

/* ------------------------------------------------------------------ *
 * D5 — 문서 재임포트: 같은 텍스트를 **새 Y.Doc**으로 다시 만든 문서에 옛 레코드를 들이댄다
 * ------------------------------------------------------------------ */

/**
 * 협업 문서를 내보냈다 다시 들여오거나(재임포트), 복사해 파생본을 만들면 텍스트는 같아도
 * **다른 문서**다. 이 프로토타입은 clientID를 호출부가 고정 상수로 주므로 두 문서의 item id
 * 공간이 통째로 겹친다 = 레코드가 남의 문서에서 "그냥 해소되는" 것이 기본값이다
 * (실측된 결함: vnv M5, 3케이스 중 2건 부착).
 *
 * 그래서 규칙 0(문서 정체성)이 있고, 이 진단이 그것을 **양방향으로** 잰다: 남의 문서 네 모양에
 * 부착 0 + 같은 문서(저장 후 재로드)에서는 정상 해소. 뒤쪽이 없으면 "전부 거절"로도 0을 만들 수
 * 있으므로 vacuous 방지에 반드시 필요하다.
 *
 * 값 자체(문서 id 문자열)는 싣지 않고 **관계**만 싣는다 — 발급 순서에 흔들리지 않는 결정론.
 */
export function runDocumentReimportDiagnostic() {
  const fixture = TWIN_FIXTURE
  const spec = fixture.anchors[0]
  const author = openSession({ clientID: CLIENT.AUTHOR, docJSON: fixture.doc })
  const entry = attachFixtureAnnotations(author, [spec])[0]
  const authored = author.encodeState()
  author.close()

  const forked = {
    ...fixture.doc,
    content: [
      ...fixture.doc.content,
      { type: 'paragraph', content: [{ type: 'text', text: 'A tail block that only the forked document has.' }] },
    ],
  }
  const shapes = [
    ['same document reloaded from its own state (control)', { update: authored, clientID: CLIENT.RELOAD }],
    ['identical re-import, same clientID', { clientID: CLIENT.AUTHOR, docJSON: fixture.doc }],
    ['forked document, same clientID', { clientID: CLIENT.AUTHOR, docJSON: forked }],
    ['different document, different clientID', { clientID: CLIENT.REPLICA_B, docJSON: forked }],
  ]

  const rows = []
  for (const [label, options] of shapes) {
    const session = openSession({ docJSON: fixture.doc, ...options })
    const sameDocument = session.documentId === entry.record.anchors.document.id
    const measure = (policy) => {
      const resolution = resolveAnchors(session, entry.record.anchors, { policy, counterfactuals: false })
      return { method: resolution.method, text: resolution.text, reason: resolution.reason }
    }
    const strict = measure(undefined)
    const storedItemState = itemFate(session.ydoc, entry.record.anchors.blockContext.itemId).state
    rows.push({
      shape: label,
      recordBelongsToThisDocument: sameDocument,
      storedItemStateInThisDocument: storedItemState,
      method: strict.method,
      attachedText: strict.text,
      reason: strict.reason,
      // 남의 문서에 붙었는가 (0이어야 한다) / 제 문서에서 살아났는가 (대조군)
      crossDocumentAttachment: !sameDocument && strict.method !== 'orphaned',
      sameDocumentResolved: sameDocument && strict.method !== 'orphaned',
    })
    session.close()
  }

  const crossDocumentAttachments = rows.filter((row) => row.crossDocumentAttachment).length
  const control = rows.find((row) => row.recordBelongsToThisDocument)
  return {
    id: 'D5',
    title: '문서 정체성 바인딩 (재임포트·파생본에 레코드를 들이댄다)',
    question: '같은 텍스트를 가진 **다른 문서**에 옛 앵커 레코드를 들이대면 어디에 붙는가?',
    rows,
    shapes: rows.length,
    crossDocumentShapes: rows.length - 1,
    crossDocumentAttachments,
    controlResolved: Boolean(control && control.sameDocumentResolved),
    note:
      crossDocumentAttachments === 0
        ? '남의 문서 세 모양 어디에도 붙지 않는다 — 레코드와 문서가 각자 지닌 정체성이 어긋나면 ' +
          'selector를 아예 읽지 않는다(`document-identity/mismatch`). 같은 문서를 저장 상태에서 다시 ' +
          '열었을 때는 정상 해소되므로 "전부 거절"로 얻은 0이 아니다.'
        : '**남의 문서에 부착됐다** — 문서 정체성 바인딩의 구멍이다.',
  }
}

/* ------------------------------------------------------------------ *
 * D6 — 저장소 계약: 마이그레이션은 **강등 전용**인가
 * ------------------------------------------------------------------ */

/**
 * v1을 v2로 올리면서 캡처 증거를 **현재 값으로 채워 넣는** 마이그레이션은 가장 자연스러운
 * 마이그레이션이고, 그 순간 강화된 guard가 통째로 무력화된다(vnv M4에서 실측). 파일 안 정수인
 * `version`은 방어가 아니다 — 그 값도 마이그레이션이 쓴다.
 *
 * 그래서 이 진단은 **실제 파일**을 만들어 `loadStore`로 읽는다:
 *   (a) 옛 버전 + 캡처 시점 값을 지금 것으로 채운 파일   -> 강등되어야 한다
 *   (b) 현재 버전인데 캡처 증거가 다른 selector와 어긋남 -> 강등되어야 한다 (계약 위반)
 *   (c) 현재 버전인데 이름표를 **다른 곳에서 padding**해 길이·SV를 맞춘 파일
 *                                                        -> 로드는 통과하지만 해소에서 걸린다
 *   (c2) 그 padding을 **그 자리의 글자와 같은 글자**로 골라 자리별 대응까지 만족시킨 파일
 *                                                        -> 문서 전역 순서 검사에서 걸린다
 *   (d) 현재 버전인데 레코드가 다른 문서를 주장           -> 로드 자체를 거절해야 한다
 *   (e) 알 수 없는 버전                                   -> 거절 (기존 D4와 같은 축)
 *   (f) 정상 파일                                         -> 그대로 로드되고 해소된다 (대조군)
 * 모든 갈래에서 "제자리 교체"된 텍스트에 부착되면 안 된다 (misResolutions 0).
 *
 * (c)는 vnv B4가, (c2)는 vnv H1이 만든 모양이다. 둘이 함께 있는 이유는 **어느 층이 막는지
 * 구분**하기 위해서다: 자기보고 정합 검사(길이·SV)는 둘 다 통과시키고, 해소 시점의 구조
 * 검사가 (c)는 내용 대응으로 (c2)는 문서 전역 순서로 잡는다. 두 값을 따로 보고한다
 * (`forgeriesPassingLoad` / `forgeriesCaughtAtResolve`).
 *
 * **여기 있는 모양은 고른 것이다** — `shapeSelection`이 그 목록이고, 값(`misResolutions`·
 * `upgradePathExists`)은 그 목록에 대한 참이다. 새 우회 모양이 나오면 그것을 여기에 넣어야
 * 매 실행 재측정된다(H1이 그렇게 들어왔다).
 */
export function runStoreContractDiagnostic() {
  const fixture = TWIN_FIXTURE
  const spec = fixture.anchors.find((anchor) => anchor.id === 'b4') ?? fixture.anchors[0]

  // 앵커를 걸고 그 자리를 다른 짧은 단어로 **제자리 교체**한다 (M4가 되살린 오해소 모양).
  const session = openSession({ clientID: CLIENT.AUTHOR, docJSON: fixture.doc })
  const entry = attachFixtureAnnotations(session, [spec])[0]
  const target = entry.target
  const pristine = annotationRecord({ ...entry.record, anchorState: 'bound' })
  session.dispatch((tr) => tr.delete(target.from, target.to))
  session.dispatch((tr) => tr.insertText(spec.replacement, target.from))
  const docUpdate = session.encodeState()
  const docJSON = session.doc.toJSON()
  const documentId = session.documentId
  // 마이그레이션이 볼 수 있는 것 = **편집 후 현재 상태**. 그 값으로 증거를 채워 본다.
  const refilledStateVector = Buffer.from(Y.encodeStateVector(session.ydoc)).toString('base64')
  const replacedAnchors = captureAnchors(
    session,
    target.from,
    target.from + spec.replacement.length,
  )
  // **padding 위조** (vnv B4): 지금 교체 범위의 살아있는 이름표에 문서 **다른 곳**의 이름표를
  // 붙여 저장된 exact 길이를 채우고, stateVector는 현재 값으로 준다. 두 자기보고 검사
  // (길이 합계·SV preexisting)를 **둘 다** 통과하므로 로드 시점에는 걸리지 않는다 —
  // 이름표가 exact와 자리별로 대응하는지 보는 해소 시점 검사만이 이 모양을 잡는다.
  const { index: forgedIndex, blocks: forgedBlocks } = liveBlocks(session)
  const replacedRuns = replacedAnchors.capture.characterIds ?? []
  const paddingRuns =
    rangeCharacterIds(forgedBlocks, 0, target.exact.length - characterIdCount(replacedRuns)) ?? []
  const paddedCapture = {
    stateVector: refilledStateVector,
    characterIds: [...replacedRuns, ...paddingRuns],
  }
  // **자리별 대응까지 만족시키는 padding 위조** (vnv H1). 위 모양은 (1) 내용 대응에서
  // 걸린다 — padding 문자가 그 자리의 글자가 아니기 때문이다. 그래서 위조자는 padding을
  // 아무 이름표가 아니라 **그 자리의 글자와 같은 글자**로 고르고, 살아남은 교체 범위 문자를
  // exact 안의 **부분수열 자리**에 놓는다. 그러면 내용·유일성·(범위 안) 순서가 전부 성립한다.
  // 이 모양을 잡는 것은 문서 전역 순서 검사뿐이다: 흩어진 padding 문자들의 문서 순서는
  // 캡처 순서와 어긋나고, 그 어긋남은 CRDT 불변식상 정직한 레코드에서 생길 수 없다.
  const correspondingCapture = (() => {
    const rangeAt = forgedIndex.text.indexOf(spec.replacement)
    const survivors = rangeAt === -1
      ? []
      : (rangeCharacterIds(forgedBlocks, rangeAt, rangeAt + spec.replacement.length) ?? [])
    const flatSurvivors = []
    for (const run of survivors) {
      for (let offset = 0; offset < run.length; offset += 1) {
        flatSurvivors.push({ client: run.client, clock: run.clock + offset, length: 1 })
      }
    }
    // exact 안에서 교체 텍스트의 글자들이 놓일 **증가 수열** 자리.
    const slots = []
    let cursor = 0
    for (const character of spec.replacement) {
      const found = target.exact.indexOf(character, cursor)
      if (found === -1) break
      slots.push(found)
      cursor = found + 1
    }
    // 범위 밖 살아있는 문자들을 글자별로 모은다 (문서 순서대로, 한 이름표는 한 번만).
    const pool = new Map()
    for (let offset = 0; offset < forgedIndex.text.length; offset += 1) {
      if (rangeAt !== -1 && offset >= rangeAt && offset < rangeAt + spec.replacement.length) continue
      const ids = rangeCharacterIds(forgedBlocks, offset, offset + 1)
      if (!ids || ids.length !== 1 || ids[0].length !== 1) continue
      const character = forgedIndex.text[offset]
      if (!pool.has(character)) pool.set(character, [])
      pool.get(character).push(ids[0])
    }
    const runs = new Array(target.exact.length).fill(null)
    slots.forEach((slot, position) => {
      if (flatSurvivors[position]) runs[slot] = flatSurvivors[position]
    })
    let unfilled = 0
    for (let position = 0; position < runs.length; position += 1) {
      if (runs[position]) continue
      const list = pool.get(target.exact[position]) ?? []
      const id = list.shift()
      if (id) runs[position] = id
      else unfilled += 1
    }
    return {
      capture: { stateVector: refilledStateVector, characterIds: runs.filter(Boolean) },
      // 구성이 실제로 "자리별 대응을 만족시키는" 모양인지. false면 fixture가 바뀐 것이므로
      // 이 행은 H1 계열을 대표하지 못한다 — 그래서 값을 진단에 그대로 싣는다.
      complete: slots.length === spec.replacement.length && unfilled === 0,
      slots,
    }
  })()
  // 길이까지 맞춘 위조: 캡처 **이후에** 입력된, 저장 exact와 **같은 길이**의 범위에서 이름표를
  // 베껴 온다. 길이 정합 검사만 있으면 통과하므로, state vector와의 교차 검증이 필요해진다.
  const decoyText = spec.replacement.padEnd(target.exact.length, ' ').slice(0, target.exact.length)
  appendParagraph(session, decoyText)
  const decoyIndex = buildTextIndex(session.doc)
  const decoyAt = decoyIndex.text.lastIndexOf(decoyText)
  const decoyAnchors = captureAnchors(
    session,
    offsetToPos(decoyIndex, decoyAt),
    offsetToPos(decoyIndex, decoyAt + decoyText.length),
  )
  session.close()

  const dir = mkdtempSync(join(tmpdir(), 'plane-editor-d6-'))
  writeFileSync(
    join(dir, DOCUMENT_FILE),
    `${JSON.stringify({ fragment: FRAGMENT_NAME, documentId, yUpdateBase64: Buffer.from(docUpdate).toString('base64'), prosemirrorJSON: docJSON }, null, 2)}\n`,
  )
  const writeAnnotations = (payload) =>
    writeFileSync(join(dir, ANNOTATIONS_FILE), `${JSON.stringify(payload, null, 2)}\n`)

  const cases = [
    {
      // 정체성은 일부러 **남겨 둔다**: 마이그레이션 실수(증거 채워넣기)가 규칙 0을 통과해
      // guard까지 가는 최악 경로를 재기 위해서다. 정체성이 아예 없는 옛 파일은 D4가 잰다.
      shape: 'older version, capture refilled with the current state vector',
      version: STORE_VERSION - 1,
      record: {
        ...pristine,
        anchors: { ...pristine.anchors, capture: { stateVector: refilledStateVector } },
      },
    },
    {
      shape: 'current version, capture character ids copied from the replaced range',
      version: STORE_VERSION,
      record: {
        ...pristine,
        anchors: { ...pristine.anchors, capture: { ...pristine.anchors.capture, characterIds: replacedAnchors.capture.characterIds } },
      },
    },
    {
      shape: 'current version, capture ids copied from a same-length range typed after capture',
      version: STORE_VERSION,
      record: {
        ...pristine,
        anchors: { ...pristine.anchors, capture: { ...pristine.anchors.capture, characterIds: decoyAnchors.capture.characterIds } },
      },
    },
    {
      shape: 'current version, capture ids padded from elsewhere to the stored exact length',
      version: STORE_VERSION,
      record: { ...pristine, anchors: { ...pristine.anchors, capture: paddedCapture } },
    },
    {
      shape: 'current version, padding chosen to satisfy the per-position correspondence check',
      version: STORE_VERSION,
      record: {
        ...pristine,
        anchors: { ...pristine.anchors, capture: correspondingCapture.capture },
      },
    },
    {
      shape: 'current version, record claims another document',
      version: STORE_VERSION,
      record: { ...pristine, anchors: { ...pristine.anchors, document: { id: `${documentId}-fork` } } },
    },
    { shape: 'unknown store version', version: 99, record: pristine },
    { shape: 'control: untouched current-version record', version: STORE_VERSION, record: pristine },
  ]

  const rows = []
  for (const testCase of cases) {
    writeAnnotations({
      version: testCase.version,
      document: DOCUMENT_FILE,
      ...(testCase.version === STORE_VERSION ? { documentId } : {}),
      annotations: [testCase.record],
    })
    let loaded = null
    let rejected = null
    try {
      loaded = loadStore(dir)
    } catch (error) {
      rejected = String(error.message)
    }
    if (loaded === null) {
      rows.push({
        shape: testCase.shape,
        storeVersion: testCase.version,
        loadRejected: true,
        rejection: rejected,
        degraded: null,
        method: null,
        attachedText: null,
        reason: null,
        misResolved: false,
      })
      continue
    }
    const record = loaded.annotations[0]
    const reload = openSession({ update: loaded.docUpdate, clientID: CLIENT.RELOAD, docJSON: fixture.doc })
    const resolution = resolveAnchors(reload, record.anchors, { counterfactuals: false })
    reload.close()
    rows.push({
      shape: testCase.shape,
      storeVersion: testCase.version,
      loadRejected: false,
      rejection: null,
      degraded: Boolean(record.anchors.legacy),
      degradeReason: record.anchors.legacy ? record.anchors.legacy.reason : null,
      captureKept: Boolean(record.anchors.capture),
      method: resolution.method,
      attachedText: resolution.text,
      reason: resolution.reason,
      misResolved: resolution.method !== 'orphaned',
    })
  }
  rmSync(dir, { recursive: true, force: true })

  const forged = rows.filter((row) => !row.shape.startsWith('control'))
  // 로드 시점(자기보고 정합)과 해소 시점(구조 대응)을 **가려서** 센다. padding 위조는
  // 로드에서 안 걸리고 해소에서 걸리므로, 한 숫자로 뭉치면 어느 층이 막았는지 사라진다.
  const passedLoad = forged.filter((row) => row.loadRejected === false && row.degraded === false)
  return {
    id: 'D6',
    title: '저장소 계약 — 마이그레이션은 강등 전용인가 (캡처 증거 채워넣기 시험)',
    question: '레코드가 스스로 주장하는 캡처 증거를 파일 버전만 보고 믿어도 되는가?',
    anchorQuote: target.exact,
    replacement: spec.replacement,
    rows,
    misResolutions: forged.filter((row) => row.misResolved).length,
    forgedShapes: forged.length,
    // 모양은 **고른 것**이다. 무엇을 골랐는지(선정 근거)를 값과 함께 실어야 "위조 0"이
    // 사정거리를 넘어 읽히지 않는다: 마이그레이션 채워넣기 2 + 이름표 베끼기 2 + 자리별
    // 대응까지 맞춘 padding 1 + 남의 문서 주장 1 + 읽을 수 없는 버전 1.
    shapeSelection: 'migration refill, copied ids, length padding, correspondence-satisfying '
      + 'padding (vnv H1), foreign document claim, unreadable version',
    // H1 계열 구성이 실제로 성립했는가 (false면 fixture 변화로 그 행이 대표성을 잃는다).
    correspondenceForgeryComplete: correspondingCapture.complete,
    // 로드 검사(길이·SV)를 통과한 위조 모양 — 0이 아니어도 된다. 잡는 층이 다를 뿐이다.
    forgeriesPassingLoad: passedLoad.length,
    forgeriesCaughtAtResolve: passedLoad.filter((row) => row.misResolved === false).length,
    // "승격 경로"는 위조 증거가 로드를 통과하고 **부착까지 간** 경우를 말한다.
    upgradePathExists: passedLoad.some((row) => row.misResolved),
    note:
      forged.every((row) => row.misResolved === false)
        ? '채워 넣은 증거는 **한 갈래도 부착되지 않는다**: 옛 버전은 강등되고, 현재 버전이어도 캡처 증거가 ' +
          '저장된 exact와 어긋나면 계약 위반으로 강등되며, 다른 문서를 주장하는 레코드는 로드 자체가 거절된다. ' +
          `길이·SV를 맞춘 padding 위조 ${passedLoad.length}모양은 로드를 통과하지만 이름표가 exact와 ` +
          '자리별로 대응하지 않아 해소 시점에 걸린다.'
        : '**채워 넣은 증거가 그대로 쓰였다** — 마이그레이션이 승격 경로를 갖고 있다는 뜻이다.',
  }
}

export function runScenario(scenario) {
  return scenario.run ? scenario.run(scenario) : runPerAnchor(scenario)
}
