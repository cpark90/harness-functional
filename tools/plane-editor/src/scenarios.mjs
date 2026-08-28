/**
 * 편집 시나리오 스위트 S1–S8 (브리프 §4 고정) + 비게이팅 진단 D1.
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
import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { spawnSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import * as Y from 'yjs'
import {
  FIXTURE_ANCHORS,
  FRAGMENT_NAME,
  openSession,
  locate,
  previousTextblockStart,
  attachFixtureAnnotations,
  liveRange,
} from './session.mjs'
import { resolveAnchors, captureAnchors } from './anchors.mjs'
import { saveStore } from './store.mjs'

const CLIENT = Object.freeze({ AUTHOR: 1, RELOAD: 2, REPLICA_A: 3, REPLICA_B: 4, MERGED: 5 })
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

function counterfactualSummary(expected, resolution) {
  const quote = resolution.counterfactualQuote
  if (!quote) return null
  if (quote.status !== 'resolved') {
    return { status: quote.status, candidates: quote.candidates ?? 0, text: null, wouldMisResolve: false }
  }
  const wouldMisResolve = expected.kind === 'orphan' || quote.text !== expected.value
  return { status: quote.status, candidates: quote.candidates ?? 0, text: quote.text, wouldMisResolve }
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
    quoteStatus: resolution.quote ? resolution.quote.status : null,
    quoteCandidates: resolution.quote ? (resolution.quote.candidates ?? null) : null,
    quoteAcceptance: resolution.quote ? (resolution.quote.acceptance ?? null) : null,
    counterfactualQuote: counterfactualSummary(expected, resolution),
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
function bystanderReport(reload, attached, targetId) {
  const report = { total: 0, ok: 0, residual: 0, orphaned: 0, wrong: 0, notes: [] }
  for (const entry of attached) {
    if (entry.id === targetId) continue
    report.total += 1
    const resolution = resolveAnchors(reload, entry.record.anchors)
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

function runPerAnchor(scenario) {
  const trials = []
  for (const spec of FIXTURE_ANCHORS) {
    const session = openSession({ clientID: CLIENT.AUTHOR })
    const attached = attachFixtureAnnotations(session)
    const entry = attached.find((item) => item.id === spec.id)
    const target = entry.target
    const expected = scenario.expected(target)

    scenario.edit(session, target)

    const snapshot = liveSnapshot(session, spec.id)
    const saved = captureForSave(session, snapshot, entry.record.anchors)
    const merged = session.encodeState()
    const docText = session.text()
    session.close()

    const reload = openSession({ update: merged, clientID: CLIENT.RELOAD })
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
        extra: { docTextAfterEdit: docText },
      }),
    )
  }
  return trials
}

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
    target: '실측 보고 (quote 복구 포함)',
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
        docUpdate: author.encodeState(),
        docJSON: author.doc.toJSON(),
        annotations: attached.map((item) => item.record),
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
]

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

export function runScenario(scenario) {
  return scenario.run ? scenario.run(scenario) : runPerAnchor(scenario)
}
