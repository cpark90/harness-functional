#!/usr/bin/env node
/**
 * Phase 1 앵커 엔진 검증 스위트 — 단일 명령, 비대화형, 브라우저 없음.
 *
 *   node run-suite.mjs            # -> suite-result.json, REPORT.md, schema-dump.json, sample-state/
 *   node run-suite.mjs --schema-dump   # G1 근거만 stdout으로
 *
 * 종료 코드: 기계로 재는 게이트 G1·G2·G3·G5가 전부 통과하면 0, 아니면 1.
 * (G4는 repo root의 python 게이트 3종이라 이 스위트 밖에서 돌린다.)
 * 결과는 결정론적이다 (Yjs client ID 고정, 시각·난수 미포함).
 *
 * 수치는 **레인별로** 따로 낸다 (src/scenarios.mjs 머리말 참조). 브리프 §4의
 * "생존"은 한 숫자를 요구하지만, 저장 파이프라인(pipeline)과 옛 레코드 최악 경로
 * (stale)는 실제로 다른 값을 낸다 — 둘 다 적는다. 목표 미달을 감추지 않는다.
 */
import './src/dom.mjs'
import { createHash } from 'node:crypto'
import { readFileSync, writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { AnnotationPlane, annotationRecords, decoratedRanges, setAnnotationStatus } from './src/annotation-plane.mjs'
import {
  annotationNamedTypes,
  buildSchema,
  contentExtensions,
  schemaFingerprint,
} from './src/schema.mjs'
import {
  FIXTURE_ANCHORS,
  FIXTURE_DOC,
  FIXTURES,
  FRAGMENT_NAME,
  attachFixtureAnnotations,
  buildTextIndex,
  openSession,
} from './src/session.mjs'
import {
  SCENARIOS,
  runScenario,
  runBoundaryDiagnostic,
  runDeletionAlignmentDiagnostic,
  runDocumentReimportDiagnostic,
  runLegacyStoreDiagnostic,
  runMoveIdentityDiagnostic,
  scenarioFixture,
} from './src/scenarios.mjs'
import { checkLanguagePolicy } from './src/language.mjs'
import { saveStore } from './src/store.mjs'
import { renderReport } from './src/report.mjs'

const HERE = new URL('./', import.meta.url)
const PACKAGE = JSON.parse(readFileSync(new URL('./package.json', HERE), 'utf8'))
const GATING_SURVIVAL = ['S1', 'S2', 'S3', 'S4', 'S8']
/** C1 = 스위트 밖에서 실측된 오해소 2종을 정식 시나리오로 들여온 것 (전 레인 오해소 0). */
const ADVERSARIAL = ['S9', 'S10']
const C1_MIN_TRIALS = 12
/**
 * C1b = vnv 적대 프로브가 그 다음에 CONFIRMED한 오해소 4종(N1/N1b·N3·N4·N8)을 들여온 것.
 * 넷 다 "블록이 사라진 뒤 같은 텍스트 블록이 새로 나타난다"는 한 뿌리에서 나온다.
 */
const IDENTITY_ADVERSARIAL = ['S11a', 'S11b', 'S11c', 'S11d', 'S11e']
const C1B_MIN_TRIALS_PER_SCENARIO = 2
const COUNTERFACTUAL_POLICIES = ['textmove', 'phase1', 'naive']
const LANES = ['live', 'pipeline', 'stale']
const OUTCOMES = ['survived', 'recovered', 'drifted', 'orphaned', 'wrong']
const DETERMINISM_REPEATS = 2

const path = (name) => fileURLToPath(new URL(`./${name}`, HERE))

function canonical(value) {
  if (Array.isArray(value)) return value.map(canonical)
  if (value && typeof value === 'object') {
    return Object.keys(value)
      .sort()
      .reduce((acc, key) => {
        acc[key] = canonical(value[key])
        return acc
      }, {})
  }
  return value
}

const sha256 = (text) => createHash('sha256').update(text).digest('hex')

/* ------------------------------------------------------------------ *
 * G1 — schema purity, measured differentially
 * ------------------------------------------------------------------ */

function schemaPurityGate() {
  const contentOnly = buildSchema(contentExtensions())
  const withPlane = buildSchema([...contentExtensions(), AnnotationPlane])
  const contentFingerprint = schemaFingerprint(contentOnly)
  const planeFingerprint = schemaFingerprint(withPlane)
  const fingerprintIdentical =
    JSON.stringify(canonical(contentFingerprint)) === JSON.stringify(canonical(planeFingerprint))

  const session = openSession({ clientID: 1 })
  const docBefore = JSON.stringify(session.doc.toJSON())
  const yBefore = Buffer.from(session.encodeState()).toString('base64')

  attachFixtureAnnotations(session)
  setAnnotationStatus(session.editor.view, FIXTURE_ANCHORS[0].id, 'resolved')

  const docAfter = JSON.stringify(session.doc.toJSON())
  const yAfter = Buffer.from(session.encodeState()).toString('base64')
  const records = annotationRecords(session.editor.state)
  const decorations = decoratedRanges(session.editor.state)
  session.close()

  const namedTypes = annotationNamedTypes(withPlane)
  const pass =
    fingerprintIdentical &&
    namedTypes.length === 0 &&
    docBefore === docAfter &&
    yBefore === yAfter &&
    records.length === FIXTURE_ANCHORS.length &&
    decorations.length === FIXTURE_ANCHORS.length

  return {
    gate: {
      pass,
      fingerprintIdentical,
      annotationNamedTypes: namedTypes,
      documentUnchanged: docBefore === docAfter,
      yStateUnchanged: yBefore === yAfter,
      planeRecords: records.length,
      planeDecorations: decorations.length,
      markCount: Object.keys(withPlane.marks).length,
      nodeCount: Object.keys(withPlane.nodes).length,
    },
    fingerprint: planeFingerprint,
  }
}

/* ------------------------------------------------------------------ *
 * per-lane totals
 * ------------------------------------------------------------------ */

function emptyTotals(lane) {
  const totals = { lane, trials: 0, measured: 0, pass: 0, driftChars: 0 }
  for (const outcome of OUTCOMES) totals[outcome] = 0
  return totals
}

function laneTotals(trials, lane) {
  const totals = emptyTotals(lane)
  totals.trials = trials.length
  for (const trial of trials) {
    const result = trial.lanes[lane]
    if (!result.measured) continue
    totals.measured += 1
    totals[result.outcome] += 1
    if (result.pass) totals.pass += 1
    totals.driftChars += result.driftChars ?? 0
  }
  return totals
}

function addTotals(accumulator, totals) {
  for (const key of Object.keys(accumulator)) {
    if (key === 'lane') continue
    accumulator[key] += totals[key]
  }
  return accumulator
}

/**
 * 해소 정책의 실제 효과를 센다.
 *   methods        : strict 정책이 실제로 쓴 채택 경로별 건수
 *   orphanReasons  : orphan 확정 사유별 건수 (규칙이 어디서 걸었는지)
 *   guardRejections: 구조적 guard는 거절했는데 Phase 1 guard는 통과시켰을 건수
 *   blocked        : 더 약한 정책이었다면 **오해소가 났을** 건수 (반사실)
 *   forgone        : 그 정책이었다면 **살렸을** 복구 건수 = 안전을 택한 대가(recall 손실)
 * blocked가 0이면 강화가 아무것도 막지 못한 것(vacuous)이므로 리포트에 그대로 드러난다.
 * forgone은 그 반대 방향의 정직성 장치다 — 대가를 적지 않으면 "안전"만 자랑하게 된다.
 */
function policyCounts(scenarios) {
  const blocked = Object.fromEntries(COUNTERFACTUAL_POLICIES.map((id) => [id, 0]))
  const forgone = Object.fromEntries(COUNTERFACTUAL_POLICIES.map((id) => [id, 0]))
  const forgoneTrials = []
  const blockedTrials = []
  const methods = {}
  const orphanReasons = {}
  let guardRejections = 0
  let movedBlockRecoveries = 0

  for (const scenario of scenarios) {
    for (const trial of scenario.trials) {
      for (const lane of ['pipeline', 'stale']) {
        const result = trial.lanes[lane]
        if (!result.measured) continue
        methods[result.method] = (methods[result.method] ?? 0) + 1
        if (result.method === 'block-identity') movedBlockRecoveries += 1
        if (result.method === 'orphaned' && result.reason) {
          orphanReasons[result.reason] = (orphanReasons[result.reason] ?? 0) + 1
        }
        const counterfactual = result.counterfactual
        if (!counterfactual) continue
        if (result.guardAccepted === false && counterfactual.phase1.guardAccepted === true) {
          guardRejections += 1
        }
        for (const id of COUNTERFACTUAL_POLICIES) {
          const alternative = counterfactual[id]
          if (!alternative) continue
          if (alternative.wouldMisResolve && result.outcome !== 'wrong') {
            blocked[id] += 1
            blockedTrials.push({
              scenario: scenario.id,
              anchorId: trial.anchorId,
              lane,
              policy: id,
              strictOutcome: result.outcome,
              wouldAttachTo: alternative.text,
              via: alternative.method,
            })
          }
          const wouldResolveAsExpected =
            alternative.outcome === 'recovered' || alternative.outcome === 'survived'
          if (result.outcome === 'orphaned' && wouldResolveAsExpected) {
            forgone[id] += 1
            forgoneTrials.push({
              scenario: scenario.id,
              anchorId: trial.anchorId,
              lane,
              policy: id,
              wouldRecover: alternative.text,
              via: alternative.method,
              strictReason: result.reason,
            })
          }
        }
      }
    }
  }
  return {
    blocked,
    blockedTrials,
    forgone,
    forgoneTrials,
    methods,
    orphanReasons,
    guardRejections,
    movedBlockRecoveries,
  }
}

function bystanderCounts(scenarios) {
  const counts = { total: 0, ok: 0, residual: 0, orphaned: 0, wrong: 0 }
  for (const scenario of scenarios) {
    for (const trial of scenario.trials) {
      for (const key of Object.keys(counts)) counts[key] += trial.bystanders[key]
    }
  }
  return counts
}

/* ------------------------------------------------------------------ *
 * measurement payload (repeated for the determinism gate)
 * ------------------------------------------------------------------ */

function measure() {
  const purity = schemaPurityGate()
  const scenarios = SCENARIOS.map((scenario) => {
    const trials = runScenario(scenario)
    const fixture = scenarioFixture(scenario)
    const lanes = {}
    for (const lane of LANES) lanes[lane] = laneTotals(trials, lane)
    return {
      id: scenario.id,
      title: scenario.title,
      target: scenario.target,
      gating: Boolean(scenario.gating),
      fixtureId: fixture.id,
      anchorIds: fixture.anchors.map((anchor) => anchor.id),
      lanes,
      trials,
    }
  })
  return {
    schema: purity,
    scenarios,
    diagnostics: [
      runBoundaryDiagnostic(),
      runDeletionAlignmentDiagnostic(),
      runMoveIdentityDiagnostic(),
      runLegacyStoreDiagnostic(),
      runDocumentReimportDiagnostic(),
    ],
  }
}

/* ------------------------------------------------------------------ *
 * gate arithmetic
 * ------------------------------------------------------------------ */

function gateSlice(scenarios, lane, ids) {
  const scoped = scenarios.filter((scenario) => ids.includes(scenario.id))
  const totals = scoped.reduce((acc, scenario) => addTotals(acc, scenario.lanes[lane]), emptyTotals(lane))
  return {
    lane,
    scenarios: ids,
    trials: totals.trials,
    measured: totals.measured,
    survived: totals.survived,
    recovered: totals.recovered,
    resolvedAsExpected: totals.survived + totals.recovered,
    drifted: totals.drifted,
    orphaned: totals.orphaned,
    wrong: totals.wrong,
    pass: totals.pass,
    survivalRate: totals.measured === 0 ? null : totals.survived / totals.measured,
    passRate: totals.measured === 0 ? null : totals.pass / totals.measured,
  }
}

/* ------------------------------------------------------------------ *
 * findings — derived, never hand-written
 * ------------------------------------------------------------------ */

function deriveFindings(result) {
  const findings = []
  const byId = new Map(result.scenarios.map((scenario) => [scenario.id, scenario]))
  const rate = (part, total) => (total === 0 ? 'n/a' : `${((part / total) * 100).toFixed(1)}%`)
  const pipeline = result.gates.G2.pipeline
  const stale = result.gates.G2.stale

  findings.push(
    `G2 대상(S1–S4·S8) ${pipeline.measured}건 — pipeline 레인(저장 시 재캡처 → 재로드) 생존 ${pipeline.survived} ` +
      `(${rate(pipeline.survived, pipeline.measured)}), 드리프트 ${pipeline.drifted}, orphan ${pipeline.orphaned}, 오해소 ${pipeline.wrong}. ` +
      `같은 시행을 stale 레인(편집 전 레코드를 편집 후 문서에 들이댐)으로 재면 생존 ${stale.survived} ` +
      `(${rate(stale.survived, stale.measured)}), 드리프트 ${stale.drifted}, 오해소 ${stale.wrong}.`,
  )

  const s4 = byId.get('S4')
  findings.push(
    `S4(범위 일부 겹쳐 삭제): pipeline 생존 ${s4.lanes.pipeline.survived}/${s4.lanes.pipeline.measured}, ` +
      `stale 생존 ${s4.lanes.stale.survived}/${s4.lanes.stale.measured} + 드리프트 ${s4.lanes.stale.drifted}건(총 ${s4.lanes.stale.driftChars}자). ` +
      '드리프트는 "다른 곳에 붙음"이 아니라 삭제 경계가 한 칸 밀린 것이다 — 원인은 D2 참조.',
  )

  const s5 = byId.get('S5')
  findings.push(
    `S5(범위 전체 삭제) ${s5.lanes.pipeline.measured}건: orphaned ${s5.lanes.pipeline.orphaned}, 오해소 ${s5.lanes.pipeline.wrong}. ` +
      'collapsed = CRDT가 삭제를 증언한 경우라 복구를 돌리지 않는다. 이 규칙이 없었다면(naive 정책) ' +
      `스위트 전체에서 오해소가 ${result.policy.blockedMisResolutions.naive}건 났다 ` +
      '— a6은 같은 문자열이 문서에 두 번 나오는 함정 앵커다.',
  )

  const s6 = byId.get('S6')
  const identity = result.diagnostics.find((diagnostic) => diagnostic.id === 'D3')
  findings.push(
    `S6(블록 cut+paste) ${s6.lanes.stale.measured}건: 주앵커 생존 ${s6.lanes.stale.survived}, 복구 ${s6.lanes.stale.recovered}, ` +
      `orphan ${s6.lanes.stale.orphaned}, 오해소 ${s6.lanes.stale.wrong}. live 레인은 생존 ${s6.lanes.live.survived}/${s6.lanes.live.measured} ` +
      '— PM이 블록을 지웠다 새로 넣으면 Decoration은 전부 사라지고 Yjs RelativePosition도 null을 돌려준다. ' +
      `이때 블록 item 정체성은 **파괴**되고(D3: 이동과 재타이핑의 Yjs 업데이트가 byte 동일=${!identity.moveIsDistinguishable}), ` +
      '남는 단서는 "같은 텍스트 블록이 새로 생겼다"뿐인데 그것은 재타이핑·쌍둥이 이동·원격 작성과 구별되지 않는다. ' +
      `그래서 strict 정책은 여기서 복구하지 않는다 — 대조 정책 textmove였다면 살렸을 복구가 스위트 전체에서 ` +
      `${result.policy.forgoneRecoveries.textmove}건이고, 그 대가로 오해소가 ${result.policy.blockedMisResolutions.textmove}건 났다.`,
  )

  const s7 = byId.get('S7')
  const converged = s7.trials.filter((trial) => trial.extra && trial.extra.converged).length
  findings.push(
    `S7(오프라인 동시 편집 후 병합) ${s7.lanes.stale.measured}건: 저장 앵커 생존 ${s7.lanes.stale.survived}, 복구 ${s7.lanes.stale.recovered}, ` +
      `orphan ${s7.lanes.stale.orphaned}, 오해소 ${s7.lanes.stale.wrong}, 두 복제본 수렴 ${converged}/${s7.lanes.stale.measured}. ` +
      `반면 병합을 받은 세션의 live 레인은 생존 ${s7.lanes.live.survived}/${s7.lanes.live.measured} (orphan ${s7.lanes.live.orphaned}) — ` +
      'y-prosemirror는 원격 업데이트를 PM step으로 옮기지 않고 문서 전체를 replace하므로' +
      '(`sync-plugin.js` `_typeChanged`: `tr.replace(0, doc.content.size, …)`) Decoration이 전부 날아간다. ' +
      'Phase 2 필수 요구: 원격 업데이트(isChangeOrigin) 후에는 저장 앵커로 평면을 재수화(rehydrate)해야 한다.',
  )

  const c1 = result.gates.C1
  findings.push(
    `S9(블록 통째 삭제)·S10(제자리 교체) 합산 ${c1.trials}시행 — 전 레인 orphaned ${c1.orphanedAllLanes}, 오해소 ${c1.wrongAllLanes}. ` +
      `Phase 1 규칙이었다면 이 두 시나리오에서만 오해소가 ${c1.blockedMisResolutions.phase1}건 났다(반사실). ` +
      '두 시나리오는 vnv가 스위트 밖에서 재현한 실패를 그대로 시나리오화한 것이다.',
  )

  const c1b = result.gates.C1b
  const legacy = result.diagnostics.find((diagnostic) => diagnostic.id === 'D4')
  findings.push(
    `S11(블록이 사라진 뒤 같은 텍스트 블록이 새로 나타남) ${c1b.trials}시행 — 전 레인 orphaned ${c1b.orphanedAllLanes}, ` +
      `오해소 ${c1b.wrongAllLanes}. 같은 범위에서 대조 정책이었다면 오해소는 textmove ${c1b.blockedMisResolutions.textmove}건, ` +
      `phase1 ${c1b.blockedMisResolutions.phase1}건, naive ${c1b.blockedMisResolutions.naive}건이다. ` +
      `S11e(v1 레코드)는 저장 버전 ${legacy.currentVersion} 엔진이 옛 파일을 읽었을 때의 경로이며, D4가 실제 파일로 확인한다 ` +
      `(로드됨=${legacy.recordsLoaded}건, 출처 미상 표시=${legacy.markedLegacy}, 해소=${legacy.method}).`,
  )

  const reasons = Object.entries(result.policy.orphanReasons)
    .sort((a, b) => b[1] - a[1] || (a[0] < b[0] ? -1 : 1))
    .map(([reason, count]) => `${reason} ${count}`)
  findings.push(
    `복구 경로: 주앵커 채택 ${result.policy.resolutionMethods['relative-position'] ?? 0}건, ` +
      `블록 정체성 복구(block-identity) ${result.policy.movedBlockRecoveries}건, orphan ${result.policy.resolutionMethods.orphaned ?? 0}건. ` +
      `orphan 사유 내역: ${reasons.join(' / ')}. ` +
      `구조적 affix guard가 거절했는데 Phase 1 guard였다면 통과했을 시행 ${result.policy.guardRejections}건.`,
  )

  const failures = result.scenarios.flatMap((scenario) =>
    scenario.trials
      .filter((trial) => trial.lanes.pipeline.measured && !trial.lanes.pipeline.pass)
      .map((trial) => `${trial.scenario}/${trial.anchorId}=${trial.lanes.pipeline.outcome}`),
  )
  findings.push(
    failures.length === 0
      ? 'pipeline 레인에서 기대와 어긋난 시행은 없다.'
      : `pipeline 레인에서 기대와 어긋난 시행 ${failures.length}건: ${failures.join(', ')}.`,
  )

  const staleFailures = result.scenarios.flatMap((scenario) =>
    scenario.trials
      .filter((trial) => trial.lanes.stale.measured && !trial.lanes.stale.pass)
      .map((trial) => `${trial.scenario}/${trial.anchorId}=${trial.lanes.stale.outcome}`),
  )
  findings.push(
    staleFailures.length === 0
      ? 'stale 레인에서도 기대와 어긋난 시행은 없다.'
      : `stale 레인에서 기대와 어긋난 시행 ${staleFailures.length}건: ${staleFailures.join(', ')}.`,
  )

  findings.push(
    `bystander(같은 문서의 나머지 앵커) ${result.bystanders.total}건 중 exact 그대로 ${result.bystanders.ok}, ` +
      `편집에 걸려 잔여 범위 ${result.bystanders.residual}, orphan ${result.bystanders.orphaned}, 오해소 ${result.bystanders.wrong} — ` +
      '앵커 다수를 한 평면에 얹어도 서로를 밀어내지 않는지 확인한 값이다.',
  )

  return findings
}

/* ------------------------------------------------------------------ *
 * sample standoff store (committed artifact: 레코드 모양 공개)
 * ------------------------------------------------------------------ */

function writeSampleStore() {
  const session = openSession({ clientID: 1 })
  const attached = attachFixtureAnnotations(session)
  const dir = path('sample-state')
  saveStore(dir, {
    fragment: FRAGMENT_NAME,
    docUpdate: session.encodeState(),
    docJSON: session.doc.toJSON(),
    annotations: attached.map((entry) => entry.record),
  })
  session.close()
  return dir
}

/* ------------------------------------------------------------------ *
 * main
 * ------------------------------------------------------------------ */

const args = new Set(process.argv.slice(2))

if (args.has('--schema-dump')) {
  const purity = schemaPurityGate()
  process.stdout.write(`${JSON.stringify({ gate: purity.gate, schema: purity.fingerprint }, null, 2)}\n`)
  process.exit(purity.gate.pass ? 0 : 1)
}

const runs = []
for (let i = 0; i < DETERMINISM_REPEATS; i += 1) runs.push(measure())
const digests = runs.map((run) => sha256(JSON.stringify(canonical(run))))
const deterministic = digests.every((digest) => digest === digests[0])
const payload = runs[0]

const fixtures = FIXTURES.map((fixture) => {
  const session = openSession({ clientID: 1, docJSON: fixture.doc })
  const docChars = buildTextIndex(session.doc).text.length
  session.close()
  return {
    id: fixture.id,
    title: fixture.title,
    blocks: fixture.doc.content.length,
    docChars,
    anchors: fixture.anchors.length,
    anchorIds: fixture.anchors.map((anchor) => anchor.id),
  }
})

const totals = {}
for (const lane of LANES) {
  totals[lane] = payload.scenarios.reduce(
    (acc, scenario) => addTotals(acc, scenario.lanes[lane]),
    emptyTotals(lane),
  )
}
const policy = policyCounts(payload.scenarios)
const bystanders = bystanderCounts(payload.scenarios)

const language = checkLanguagePolicy(HERE)
const pipelineGate = gateSlice(payload.scenarios, 'pipeline', GATING_SURVIVAL)
const staleGate = gateSlice(payload.scenarios, 'stale', GATING_SURVIVAL)
const s5Pipeline = payload.scenarios.find((scenario) => scenario.id === 'S5').lanes.pipeline
const s5Stale = payload.scenarios.find((scenario) => scenario.id === 'S5').lanes.stale
const wrongTotal = totals.pipeline.wrong + totals.stale.wrong + totals.live.wrong

function adversarialSlice(ids) {
  const slice = {
    scenarios: ids,
    live: gateSlice(payload.scenarios, 'live', ids),
    pipeline: gateSlice(payload.scenarios, 'pipeline', ids),
    stale: gateSlice(payload.scenarios, 'stale', ids),
  }
  slice.trials = slice.pipeline.trials
  slice.wrongAllLanes = slice.live.wrong + slice.pipeline.wrong + slice.stale.wrong
  slice.orphanedAllLanes = slice.live.orphaned + slice.pipeline.orphaned + slice.stale.orphaned
  slice.trialsPerScenario = Object.fromEntries(
    ids.map((id) => [id, payload.scenarios.find((scenario) => scenario.id === id).trials.length]),
  )
  slice.blockedMisResolutions = Object.fromEntries(
    COUNTERFACTUAL_POLICIES.map((cf) => [
      cf,
      policy.blockedTrials.filter((row) => row.policy === cf && ids.includes(row.scenario)).length,
    ]),
  )
  return slice
}

const adversarial = adversarialSlice(ADVERSARIAL)
const identityAdversarial = adversarialSlice(IDENTITY_ADVERSARIAL)

const gates = {
  G1: payload.schema.gate,
  G2: {
    pass:
      pipelineGate.pass === pipelineGate.measured &&
      pipelineGate.measured === pipelineGate.trials &&
      s5Pipeline.wrong === 0 &&
      s5Stale.wrong === 0 &&
      wrongTotal === 0,
    gatingLane: 'pipeline',
    laneNote:
      'pipeline = 브리프 §3의 저장 경로(편집 후 살아있는 앵커를 저장 시 재캡처 → 재로드 후 해소). ' +
      'stale = 편집 전 레코드를 편집 후 문서에 들이대는 최악 경로. 두 값을 모두 싣는다.',
    pipeline: pipelineGate,
    stale: staleGate,
    staleMeetsTarget: staleGate.pass === staleGate.measured,
    s5: {
      pipeline: { trials: s5Pipeline.measured, orphaned: s5Pipeline.orphaned, wrong: s5Pipeline.wrong },
      stale: { trials: s5Stale.measured, orphaned: s5Stale.orphaned, wrong: s5Stale.wrong },
    },
    wrongTotalAllLanes: wrongTotal,
    blockedMisResolutions: policy.blocked,
  },
  C1: {
    pass:
      adversarial.wrongAllLanes === 0 &&
      adversarial.trials >= C1_MIN_TRIALS &&
      adversarial.pipeline.pass === adversarial.pipeline.measured &&
      adversarial.stale.pass === adversarial.stale.measured &&
      adversarial.live.pass === adversarial.live.measured,
    requirement: `S9·S10 전 레인 오해소 0, 합산 ${C1_MIN_TRIALS}시행 이상`,
    minTrials: C1_MIN_TRIALS,
    ...adversarial,
    note:
      '스위트 밖에서 실측된 오해소 2종(블록 통째 삭제 / 제자리 텍스트 교체)을 정식 시나리오로 ' +
      '들여온 것이다. 두 시나리오의 기대값은 orphaned이며, 어디든 붙으면 오해소로 집계된다.',
  },
  C1b: {
    pass:
      identityAdversarial.wrongAllLanes === 0 &&
      Object.values(identityAdversarial.trialsPerScenario).every(
        (count) => count >= C1B_MIN_TRIALS_PER_SCENARIO,
      ) &&
      identityAdversarial.pipeline.pass === identityAdversarial.pipeline.measured &&
      identityAdversarial.stale.pass === identityAdversarial.stale.measured &&
      identityAdversarial.live.pass === identityAdversarial.live.measured,
    requirement: `S11 전 레인 오해소 0, 시나리오마다 ${C1B_MIN_TRIALS_PER_SCENARIO}시행 이상`,
    minTrialsPerScenario: C1B_MIN_TRIALS_PER_SCENARIO,
    ...identityAdversarial,
    note:
      'vnv 적대 프로브가 CONFIRMED한 오해소 4종을 정식 시나리오로 들여온 것이다 ' +
      '(S11a/S11b=쌍둥이 블록 이동 양쪽 순서, S11c=삭제 후 재타이핑, S11d=원격 피어 작성, ' +
      'S11e=v1 레코드 하위호환). 넷의 뿌리는 하나다: "블록 텍스트가 같고 캡처 이후 생겼다"는 ' +
      '이동의 증거가 아니다 — D3가 그것을 byte 단위로 보인다.',
  },
  G3: {
    pass: deterministic,
    deterministic,
    repeats: DETERMINISM_REPEATS,
    payloadSha256: digests[0],
    command: 'node run-suite.mjs',
    interactive: false,
    browser: false,
  },
  G4: {
    status: 'external',
    note:
      '이 디렉토리는 순수 추가라 `ontology/`·기존 `tools/*.py` 경로를 건드리지 않는다. ' +
      '`/usr/bin/python3 tools/{validate,check_determinism,lint_uniformity}.py`를 repo root에서 별도 실행해 회귀를 확인한다.',
  },
  G5: {
    pass: language.pass,
    status: language.pass ? 'checked' : 'violation',
    filesScanned: language.filesScanned,
    asciiChars: language.asciiChars,
    hangulChars: language.hangulChars,
    violations: language.violations,
    note:
      '산문 한글 / 용어·식별자·문서 fixture 영어. 손으로 쓴 파일 전수를 스캔해 ASCII·한글·명시 허용 기호 ' +
      '밖의 문자가 0인지 기계적으로 확인한다 (gr-lang: Korean/English only).',
  },
}

const result = {
  suite: 'plane-editor phase 1 anchor probe',
  source: 'docs/feedback/inquiries/tool_suggestion-phase1-brief.md',
  fragment: FRAGMENT_NAME,
  environment: {
    tiptap: PACKAGE.dependencies['@tiptap/core'],
    tiptapPm: PACKAGE.dependencies['@tiptap/pm'],
    starterKit: PACKAGE.dependencies['@tiptap/starter-kit'],
    yjs: PACKAGE.dependencies.yjs,
    yProsemirror: PACKAGE.dependencies['y-prosemirror'],
    jsdom: PACKAGE.dependencies.jsdom,
  },
  fixtures,
  fixture: fixtures[0],
  lanes: {
    live: '편집이 일어난 세션 안의 ProseMirror Decoration (플러그인 상태)',
    pipeline: '저장 시 재캡처(또는 orphan이면 원 selector 보존) → 재로드 후 해소',
    stale: '편집 전 캡처한 레코드를 편집 후 문서에 그대로 들이댐 (최악 경로)',
  },
  totals,
  policy: {
    resolutionMethods: policy.methods,
    orphanReasons: policy.orphanReasons,
    guardRejections: policy.guardRejections,
    movedBlockRecoveries: policy.movedBlockRecoveries,
    blockedMisResolutions: policy.blocked,
    blockedTrials: policy.blockedTrials,
    forgoneRecoveries: policy.forgone,
    forgoneTrials: policy.forgoneTrials,
  },
  bystanders,
  gates,
  scenarios: payload.scenarios,
  diagnostics: payload.diagnostics,
  findings: [],
}
result.findings = deriveFindings(result)

const overallPass =
  gates.G1.pass && gates.G2.pass && gates.C1.pass && gates.C1b.pass && gates.G3.pass && gates.G5.pass

writeFileSync(path('schema-dump.json'), `${JSON.stringify(payload.schema.fingerprint, null, 2)}\n`)
writeFileSync(path('suite-result.json'), `${JSON.stringify(result, null, 2)}\n`)
writeFileSync(path('REPORT.md'), `${renderReport(result)}\n`)
writeSampleStore()

const lines = [
  `plane-editor phase 1 suite — trials ${totals.pipeline.trials}, lanes measured live/pipeline/stale = ` +
    `${totals.live.measured}/${totals.pipeline.measured}/${totals.stale.measured}, wrong(all lanes) ${wrongTotal}`,
  `  G1 schema purity     : ${gates.G1.pass ? 'PASS' : 'FAIL'} (annotation mark/node ${gates.G1.annotationNamedTypes.length}, fingerprint identical ${gates.G1.fingerprintIdentical})`,
  `  G2 survival/wrong    : ${gates.G2.pass ? 'PASS' : 'FAIL'} (gating lane=pipeline)`,
  `     pipeline S1-S4,S8 : survived ${pipelineGate.survived}/${pipelineGate.measured}, drifted ${pipelineGate.drifted}, orphan ${pipelineGate.orphaned}, wrong ${pipelineGate.wrong}`,
  `     stale    S1-S4,S8 : survived ${staleGate.survived}/${staleGate.measured}, drifted ${staleGate.drifted}, orphan ${staleGate.orphaned}, wrong ${staleGate.wrong}`,
  `     S5 orphan/wrong   : pipeline ${s5Pipeline.orphaned}/${s5Pipeline.wrong}, stale ${s5Stale.orphaned}/${s5Stale.wrong}`,
  `  C1 adversarial S9,S10: ${gates.C1.pass ? 'PASS' : 'FAIL'} (trials ${adversarial.trials}, orphan(all lanes) ${adversarial.orphanedAllLanes}, wrong(all lanes) ${adversarial.wrongAllLanes})`,
  `  C1b block identity S11: ${gates.C1b.pass ? 'PASS' : 'FAIL'} (trials ${identityAdversarial.trials}, orphan(all lanes) ${identityAdversarial.orphanedAllLanes}, wrong(all lanes) ${identityAdversarial.wrongAllLanes})`,
  `     blocked mis-resolutions: textmove ${policy.blocked.textmove}, phase1 ${policy.blocked.phase1}, naive ${policy.blocked.naive} (counterfactual, whole suite)`,
  `     recoveries forgone     : textmove ${policy.forgone.textmove} (safety cost — orphan instead of a guessed move)`,
  `  G3 determinism       : ${gates.G3.pass ? 'PASS' : 'FAIL'} (sha256 ${digests[0].slice(0, 16)}…)`,
  '  G4 python gates      : external (run from repo root)',
  `  G5 language policy   : ${gates.G5.pass ? 'PASS' : 'FAIL'} (authored files ${gates.G5.filesScanned}, out-of-policy chars ${gates.G5.violations.length})`,
  '  -> suite-result.json, REPORT.md, schema-dump.json, sample-state/',
]
process.stdout.write(`${lines.join('\n')}\n`)
process.exitCode = overallPass ? 0 : 1
