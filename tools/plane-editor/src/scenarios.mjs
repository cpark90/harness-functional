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
import {
  FRAGMENT_NAME,
  FIXTURE_ANCHORS,
  MAIN_FIXTURE,
  TWIN_FIXTURE,
  S11_FIXTURE,
  openSession,
  locate,
  previousTextblockStart,
  attachFixtureAnnotations,
  liveRange,
} from './session.mjs'
import { POLICIES, resolveAnchors, captureAnchors } from './anchors.mjs'
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
        extra: {
          docTextAfterEdit: docText,
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

/**
 * "블록을 옮겼다"와 "같은 문장을 지웠다 다시 쳤다"가 CRDT 층에서 구별되는지 직접 잰다.
 * 같은 문서 상태에 같은 앵커를 걸고 두 편집을 각각 가한 뒤, 결과 Yjs 업데이트의
 * sha256을 비교한다. 이 값이 같으면 **어떤 해소 규칙도 둘을 가를 수 없다** — 규칙 C가
 * 텍스트 동일성 대신 item 정체성만 믿는 이유가 여기서 나온다 (해석이 아니라 측정).
 */
export function runMoveIdentityDiagnostic() {
  const digest = (bytes) => createHash('sha256').update(Buffer.from(bytes)).digest('hex')
  const run = (label, edit) => {
    const session = openSession({ clientID: CLIENT.AUTHOR, docJSON: D3_DOC })
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
 * 읽고, 그 레코드가 (a) 버려지지 않고 로드되며 (b) 출처 미상으로 표시되고 (c) 제자리
 * 교체 편집에서 orphan이 되는지를 확인한다. 알 수 없는 버전은 여전히 거절해야 한다.
 */
export function runLegacyStoreDiagnostic() {
  const fixture = TWIN_FIXTURE
  const spec = fixture.anchors.find((anchor) => anchor.id === 'b4') ?? fixture.anchors[0]
  const session = openSession({ clientID: CLIENT.AUTHOR, docJSON: fixture.doc })
  const entry = attachFixtureAnnotations(session, [spec])[0]
  const target = entry.target
  session.dispatch((tr) => tr.delete(target.from, target.to))
  session.dispatch((tr) => tr.insertText(spec.replacement, target.from))
  const docUpdate = session.encodeState()
  const docJSON = session.doc.toJSON()
  session.close()

  const dir = mkdtempSync(join(tmpdir(), 'plane-editor-d4-'))
  const record = annotationRecord(entry.record)
  // Phase 1이 쓰던 파일 모양: version 1 + 세 번째 selector 없음. (store.mjs는 이제 v2만 쓴다.)
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
  reload.close()

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
  rmSync(dir, { recursive: true, force: true })

  return {
    id: 'D4',
    title: '옛 저장 파일(v1) 하위호환 — 로드는 되지만 출처는 미상',
    question: '옛 파일이 그대로 로드될 때, 출처 증거 없는 레코드가 문자열만으로 통과하는가?',
    currentVersion: STORE_VERSION,
    loadedVersion: store.version,
    recordsLoaded: store.annotations.length,
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
    rejectsUnknownVersion,
  }
}

/* ------------------------------------------------------------------ *
 * D5 — 문서 재임포트: 같은 텍스트를 **새 Y.Doc**으로 다시 만든 문서에 옛 레코드를 들이댄다
 * ------------------------------------------------------------------ */

/**
 * 협업 문서를 내보냈다 다시 들여오면(또는 백업에서 새로 만들면) 텍스트는 같아도 CRDT
 * 정체성은 전부 새것이다. 이 경로는 "캡처 이후 새로 생긴 블록"이 문서 전체가 되므로
 * 텍스트 기반 복구에 가장 위험하다. strict가 여기서 무엇을 하는지 명시적으로 잰다.
 */
export function runDocumentReimportDiagnostic() {
  const fixture = TWIN_FIXTURE
  const spec = fixture.anchors[0]
  const author = openSession({ clientID: CLIENT.AUTHOR, docJSON: fixture.doc })
  const entry = attachFixtureAnnotations(author, [spec])[0]
  author.close()

  // 같은 ProseMirror 문서를 새 Y.Doc으로 다시 만든다 (다른 client, 완전히 새 item).
  const reimported = openSession({ clientID: CLIENT.REPLICA_B, docJSON: fixture.doc })
  const measure = (policy) => {
    const resolution = resolveAnchors(reimported, entry.record.anchors, { policy, counterfactuals: false })
    return { method: resolution.method, text: resolution.text, reason: resolution.reason }
  }
  const strict = measure(undefined)
  const textmove = measure(POLICIES.textmove)
  const phase1 = measure(POLICIES.phase1)
  reimported.close()

  return {
    id: 'D5',
    title: '문서 재임포트 (같은 텍스트, 완전히 새 CRDT 정체성)',
    question: '텍스트가 같은 새 문서에 옛 앵커 레코드를 들이대면 어디에 붙는가?',
    pairs: [
      ['앵커', `\`${entry.target.exact}\` (문서 텍스트는 그대로, item은 전부 새것)`],
      ['strict (현행)', `${strict.method} — \`${strict.reason}\``],
      ['textmove (대조)', `${textmove.method}${textmove.text ? ` -> \`${textmove.text}\`` : ` — \`${textmove.reason}\``}`],
      ['phase1 (대조)', `${phase1.method}${phase1.text ? ` -> \`${phase1.text}\`` : ` — \`${phase1.reason}\``}`],
    ],
    orphaned: strict.method === 'orphaned',
    note:
      strict.method === 'orphaned'
        ? '재임포트본에서는 저장된 item id를 store가 아예 모른다(`stored-item-unknown`). 텍스트가 100% 같아도 ' +
          '복구하지 않는다 — 같은 문장이 여러 번 나오는 문서에서 "아무 데나" 붙는 경로가 이것이었다.'
        : '**재임포트본에 부착됐다** — 정체성 증거 없이 텍스트만으로 붙은 것이므로 규칙 C의 구멍이다.',
  }
}

export function runScenario(scenario) {
  return scenario.run ? scenario.run(scenario) : runPerAnchor(scenario)
}
