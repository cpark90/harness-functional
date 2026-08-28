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
  COMMON_OPERATIONS,
  SCENARIOS,
  runScenario,
  runBoundaryDiagnostic,
  runDeletionAlignmentDiagnostic,
  runDocumentReimportDiagnostic,
  runLegacyStoreDiagnostic,
  runMoveIdentityDiagnostic,
  runStoreContractDiagnostic,
  scenarioFixture,
} from './src/scenarios.mjs'
import { checkLanguagePolicy } from './src/language.mjs'
import { anchorStateOf } from './src/anchors.mjs'
import { documentMetaKeys } from './src/document-id.mjs'
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
/**
 * C2 = 차단 해제 조건 1·2 (문서 정체성 바인딩 / 저장소 계약 무결성),
 * C3 = 조건 3의 앞부분 (흔한 편집 조작의 orphan 예산 게시).
 * 근거: docs/verify/plane-editor-c1b-verify.md §8.
 */
const C2_MIN_CROSS_DOCUMENT_SHAPES = 3
// 위조 모양은 **고른 것**이다. 새 우회가 확인되면 D6에 모양을 더하고 이 값을 올린다 —
// 7번째는 vnv H1(자리별 대응까지 만족시키는 padding)이다.
const C2_MIN_FORGED_SHAPES = 7
const C3_MIN_OPERATIONS = 6
const COUNTERFACTUAL_POLICIES = ['textmove', 'phase1', 'naive']
/** 커밋되는 sample-state의 문서 정체성 (안정적이어야 하므로 발급기에 맡기지 않는다). */
const SAMPLE_DOCUMENT_ID = 'doc-sample-state'
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
  // 문서 메타는 **문서 자신의 식별자 하나뿐**이어야 한다. 주석·앵커 데이터가 문서 상태로
  // 새는 것을 여기서 기계적으로 막는다 (문서 정체성을 CRDT에 넣은 대가의 검사).
  const metaKeys = documentMetaKeys(session.ydoc)
  const metaIsIdentityOnly = metaKeys.length === 1 && metaKeys[0] === 'documentId'
  session.close()

  const namedTypes = annotationNamedTypes(withPlane)
  const pass =
    fingerprintIdentical &&
    namedTypes.length === 0 &&
    docBefore === docAfter &&
    yBefore === yAfter &&
    metaIsIdentityOnly &&
    records.length === FIXTURE_ANCHORS.length &&
    decorations.length === FIXTURE_ANCHORS.length

  return {
    gate: {
      pass,
      fingerprintIdentical,
      annotationNamedTypes: namedTypes,
      documentUnchanged: docBefore === docAfter,
      yStateUnchanged: yBefore === yAfter,
      documentMetaKeys: metaKeys,
      metaIsIdentityOnly,
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

/**
 * orphan 예산 — **흔한 편집 조작마다** 앵커가 얼마나 끊기는지. 정밀도(오해소 0)만 재는
 * 게이트는 재현율을 얼마든지 깎을 수 있으므로, 대가를 같은 리포트에 게시한다.
 * 목표는 orphan을 줄이는 것이 아니라 **보이게 하는 것**이라 값 자체는 게이트가 아니다.
 */
function orphanBudget(scenarios, policyRows) {
  const byId = new Map(scenarios.map((scenario) => [scenario.id, scenario]))
  const operations = COMMON_OPERATIONS.map(({ id, operation, control }) => {
    const scenario = byId.get(id)
    const lanes = {}
    for (const lane of ['pipeline', 'stale']) {
      const totals = scenario.lanes[lane]
      lanes[lane] = {
        measured: totals.measured,
        resolvedAsExpected: totals.survived + totals.recovered,
        orphaned: totals.orphaned,
        wrong: totals.wrong,
        orphanRate: totals.measured === 0 ? null : totals.orphaned / totals.measured,
      }
    }
    const forgoneRecoveries = Object.fromEntries(
      COUNTERFACTUAL_POLICIES.map((cf) => [
        cf,
        policyRows.forgoneTrials.filter((row) => row.scenario === id && row.policy === cf).length,
      ]),
    )
    return {
      id,
      operation,
      control,
      title: scenario.title,
      trials: scenario.trials.length,
      quoteStillInDocument: scenario.trials.filter(
        (trial) => trial.extra && trial.extra.quoteStillInDocument,
      ).length,
      lanes,
      forgoneRecoveries,
    }
  })
  const sum = (pick) =>
    operations.filter((op) => !op.control).reduce((total, op) => total + pick(op), 0)
  return {
    operations,
    measuredOperations: operations.length,
    controlResolved: operations
      .filter((op) => op.control)
      .every((op) => op.lanes.pipeline.resolvedAsExpected === op.lanes.pipeline.measured),
    orphanedLaneMeasurements: sum((op) => op.lanes.pipeline.orphaned + op.lanes.stale.orphaned),
    laneMeasurements: sum((op) => op.lanes.pipeline.measured + op.lanes.stale.measured),
    wrongLaneMeasurements: sum((op) => op.lanes.pipeline.wrong + op.lanes.stale.wrong),
  }
}

/**
 * 부착 **위치**의 정밀도 — 텍스트가 같아도 남의 자리면 오부착이다.
 *
 * 대상은 "앵커 텍스트가 편집에 **닿지 않았고**(기대 텍스트 = 원래 exact) 문서에 그대로
 * 남아 있는" 시행뿐이다. 범위 안 삽입(S2)·부분 삭제(S4)처럼 앵커 자신의 텍스트가 바뀌는
 * 편집은 "원래 문자열의 출현 자리"라는 기준 자체가 성립하지 않으므로 제외한다 (그 시행의
 * 정확성은 기대 텍스트 비교가 이미 판정한다).
 */
function placementCounts(scenarios) {
  const counts = { measured: 0, atKnownOccurrence: 0, attachedOutsideQuote: 0, outside: [] }
  for (const scenario of scenarios) {
    for (const trial of scenario.trials) {
      if (!trial.extra || !trial.extra.quoteStillInDocument) continue
      if (trial.expected.kind !== 'text' || trial.expected.text !== trial.anchorQuote) continue
      for (const lane of ['pipeline', 'stale']) {
        const result = trial.lanes[lane]
        if (!result.measured || result.atKnownOccurrence === null || result.atKnownOccurrence === undefined) continue
        counts.measured += 1
        if (result.atKnownOccurrence) counts.atKnownOccurrence += 1
        else {
          counts.attachedOutsideQuote += 1
          counts.outside.push({
            scenario: scenario.id,
            anchorId: trial.anchorId,
            lane,
            landedOffset: result.landedOffset,
            occurrences: result.quoteOccurrences,
          })
        }
      }
    }
  }
  return counts
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
      runStoreContractDiagnostic(),
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

  const c2 = result.gates.C2
  findings.push(
    `문서 정체성(C2): 같은 텍스트를 가진 다른 문서 ${c2.crossDocument.crossDocumentShapes}모양(동일 재임포트·파생본·다른 clientID)에 ` +
      `레코드를 들이대 부착 ${c2.crossDocument.attachments}건, 같은 문서를 저장 상태에서 다시 열었을 때는 정상 해소 ` +
      `${c2.crossDocument.controlResolved} — "전부 거절"로 얻은 0이 아니다. 저장소 계약: 캡처 증거를 채워 넣은 스토어 ` +
      `${c2.storeContract.forgedShapes}모양 중 부착된 것 ${c2.storeContract.misResolutions}건이고 승격 경로 자체가 ` +
      `${c2.storeContract.upgradePathExists ? '존재한다' : '없다'}(마이그레이션은 강등 전용). ` +
      `그중 ${c2.storeContract.forgeriesPassingLoad}모양은 자기보고 정합 검사(길이·SV)를 통과하지만 ` +
      `해소 시점의 구조 검사가 ${c2.storeContract.forgeriesCaughtAtResolve}모양을 잡는다(자리별 대응까지 ` +
      `만족시키는 padding 포함=${c2.storeContract.correspondenceForgeryComplete} — 문서 전역 순서에서 걸린다). ` +
      `옛 파일은 로드되되 문서 정체성 입양=${c2.legacyLoad.documentAdopted}(해소=${c2.legacyLoad.method}, ` +
      `같은 세션 대조군 해소=${c2.legacyLoad.controlResolved}), 알 수 없는 버전 거절=${c2.legacyLoad.rejectsUnknownVersion}. ` +
      `게이트와 편집기의 등가성: anchors 없는 v3 레코드 거절=${c2.legacyLoad.rejectsRecordWithoutAnchors}, ` +
      `중복 레코드 id 거절=${c2.legacyLoad.rejectsDuplicateRecordId} — 커밋 게이트가 거절하는 모양을 편집기도 거절한다.`,
  )

  const c3 = result.gates.C3
  const opRate = (op, lane) =>
    `${op.operation} ${op.lanes[lane].orphaned}/${op.lanes[lane].measured}`
  findings.push(
    `orphan 예산(C3): 앵커 텍스트가 편집 후에도 남는 흔한 조작 ${c3.measuredOperations}종을 정식 시나리오로 쟀다. ` +
      `pipeline 레인 orphan — ${c3.operations.map((op) => opRate(op, 'pipeline')).join(' · ')}. ` +
      `stale 레인 orphan — ${c3.operations.map((op) => opRate(op, 'stale')).join(' · ')}. ` +
      `대조군을 뺀 합계 ${c3.orphanedLaneMeasurements}/${c3.laneMeasurements} 레인측정이 orphan이고 오해소는 ` +
      `${c3.wrongLaneMeasurements}건이다. 앵커 텍스트가 편집에 닿지 않고 남은 시행 ${c3.placement.measured}건 중 ` +
      `제자리 밖에 붙은 것은 ${c3.placement.attachedOutsideQuote}건 — 살아남은 앵커가 남의 자리에 붙어서 만든 수치가 아니다.`,
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
  // 커밋되는 산출물이라 문서 정체성을 **명시**한다 (발급 순서에 흔들리지 않게).
  const session = openSession({ clientID: 1, documentId: SAMPLE_DOCUMENT_ID })
  const attached = attachFixtureAnnotations(session)
  const dir = path('sample-state')
  saveStore(dir, {
    fragment: FRAGMENT_NAME,
    documentId: session.documentId,
    docUpdate: session.encodeState(),
    docJSON: session.doc.toJSON(),
    annotations: attached.map((entry) => ({
      ...entry.record,
      // 선언이 아니라 **측정**: 저장 시점에 실제로 해소해 본 결과를 싣는다.
      anchorState: anchorStateOf(session, entry.record.anchors),
    })),
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
const budget = orphanBudget(payload.scenarios, policy)
const placements = placementCounts(payload.scenarios)
const diagnostic = (id) => payload.diagnostics.find((item) => item.id === id)
const reimport = diagnostic('D5')
const storeContract = diagnostic('D6')
const legacyStore = diagnostic('D4')

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
  C2: {
    pass:
      reimport.crossDocumentAttachments === 0 &&
      reimport.crossDocumentShapes >= C2_MIN_CROSS_DOCUMENT_SHAPES &&
      reimport.controlResolved &&
      storeContract.misResolutions === 0 &&
      storeContract.upgradePathExists === false &&
      storeContract.forgedShapes >= C2_MIN_FORGED_SHAPES &&
      legacyStore.documentAdopted === false &&
      legacyStore.promotedBySave === false &&
      legacyStore.orphaned &&
      legacyStore.controlResolved &&
      legacyStore.rejectsUnknownVersion &&
      storeContract.correspondenceForgeryComplete &&
      legacyStore.rejectsRecordWithoutAnchors &&
      legacyStore.rejectsDuplicateRecordId,
    requirement:
      `다른 문서 부착 0 (모양 ${C2_MIN_CROSS_DOCUMENT_SHAPES}종 이상, 같은 문서 대조군은 정상 해소) + ` +
      `채워 넣은 캡처 증거의 승격 경로 0 (위조 모양 ${C2_MIN_FORGED_SHAPES}종 이상 — 자리별 대응을 ` +
      '만족시키는 padding 포함, 오해소 0) + ' +
      '옛 파일이 스토어의 문서 정체성을 입양하지 않고 load->save 로도 승격되지 않을 것 ' +
      '(대조군은 같은 세션에서 정상 해소) + ' +
      '**게이트가 거절하는 레코드 모양을 편집기도 거절할 것** (anchors 없는 v3 레코드 · 중복 레코드 id)',
    crossDocument: {
      shapes: reimport.shapes,
      crossDocumentShapes: reimport.crossDocumentShapes,
      attachments: reimport.crossDocumentAttachments,
      controlResolved: reimport.controlResolved,
    },
    storeContract: {
      forgedShapes: storeContract.forgedShapes,
      shapeSelection: storeContract.shapeSelection,
      correspondenceForgeryComplete: storeContract.correspondenceForgeryComplete,
      misResolutions: storeContract.misResolutions,
      forgeriesPassingLoad: storeContract.forgeriesPassingLoad,
      forgeriesCaughtAtResolve: storeContract.forgeriesCaughtAtResolve,
      upgradePathExists: storeContract.upgradePathExists,
      rows: storeContract.rows.map((row) => ({
        shape: row.shape,
        storeVersion: row.storeVersion,
        loadRejected: row.loadRejected,
        degraded: row.degraded,
        method: row.method,
        misResolved: row.misResolved,
      })),
    },
    legacyLoad: {
      documentAdopted: legacyStore.documentAdopted,
      promotedBySave: legacyStore.promotedBySave,
      markedLegacy: legacyStore.markedLegacy,
      orphaned: legacyStore.orphaned,
      controlResolved: legacyStore.controlResolved,
      rejectsUnknownVersion: legacyStore.rejectsUnknownVersion,
      method: legacyStore.method,
      // 게이트와 편집기의 등가성의 편집기 쪽 (I-1·I-2). 게이트 쪽은 run-link-checks.mjs C4·C8.
      rejectsRecordWithoutAnchors: legacyStore.rejectsRecordWithoutAnchors,
      rejectsDuplicateRecordId: legacyStore.rejectsDuplicateRecordId,
    },
    note:
      '차단 해제 조건 1·2 (docs/verify/plane-editor-c1b-verify.md §8). 레코드는 자기가 어느 문서의 ' +
      '것인지 싣고 해소 진입점이 불일치를 거절하며(D5), 캡처 증거는 파일 버전이 아니라 **다른 selector와의 ' +
      '내부 정합 + 저장된 exact와의 자리별 대응 + 문서 전역 순서**로 검증되어 채워 넣기가 승격되지 ' +
      '않는다(D6). 마이그레이션 경로는 강등 전용이고, 정체성은 **입양되지 않는다** — 옛 파일은 남의 문서 ' +
      '옆에 놓여도 미상으로 남는다(D4, vnv B3->B7 경로 차단). 그리고 커밋 게이트가 거절하는 레코드 모양은 ' +
      '편집기도 거절한다 — 한쪽만 막으면 게이트가 통과시킨 파일이 편집기에서 터진다(vnv H3·H4).',
  },
  C3: {
    pass:
      budget.measuredOperations >= C3_MIN_OPERATIONS &&
      budget.controlResolved &&
      budget.wrongLaneMeasurements === 0 &&
      placements.attachedOutsideQuote === 0 &&
      budget.operations.every(
        (op) => op.lanes.pipeline.orphanRate !== null && op.lanes.stale.orphanRate !== null,
      ),
    requirement:
      `흔한 편집 조작 ${C3_MIN_OPERATIONS}종 이상을 정식 시나리오로 측정하고 조작별 orphan율을 게시 ` +
      '(값 자체는 기준이 아니다). 같은 범위에서 오해소 0 · 앵커 텍스트가 남은 시행의 부착 위치 오류 0 · ' +
      '대조군(범위 안 삽입)은 살아남을 것 — 전부 orphan으로 만들어 "0"을 얻는 길을 막는다.',
    minOperations: C3_MIN_OPERATIONS,
    ...budget,
    placement: {
      measured: placements.measured,
      atKnownOccurrence: placements.atKnownOccurrence,
      attachedOutsideQuote: placements.attachedOutsideQuote,
      outside: placements.outside,
    },
    note:
      '차단 해제 조건 3의 앞부분 (docs/verify/plane-editor-c1b-verify.md §8). 이동·병합·분할·undo는 ' +
      '앵커 텍스트가 문서에 그대로 남는데도 앵커가 끊기는 조작이라, 기대값을 orphan으로 낮추지 않고 ' +
      '손실이 표에 남게 둔다. 끊긴 종단점을 링크가 어떻게 보는지는 링크 평면 쪽(check_links.py의 ' +
      'broken-endpoint 보고)이 진다.',
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
  placement: placements,
  orphanBudget: budget,
  gates,
  scenarios: payload.scenarios,
  diagnostics: payload.diagnostics,
  findings: [],
}
result.findings = deriveFindings(result)

const overallPass =
  gates.G1.pass &&
  gates.G2.pass &&
  gates.C1.pass &&
  gates.C1b.pass &&
  gates.C2.pass &&
  gates.C3.pass &&
  gates.G3.pass &&
  gates.G5.pass

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
  `  C2 document binding  : ${gates.C2.pass ? 'PASS' : 'FAIL'} (cross-document attachments ${reimport.crossDocumentAttachments}/${reimport.crossDocumentShapes} shapes, ` +
    `store-contract forgeries promoted ${storeContract.misResolutions}/${storeContract.forgedShapes})`,
  `  C3 orphan budget     : ${gates.C3.pass ? 'PASS' : 'FAIL'} (common operations ${budget.measuredOperations}, ` +
    `orphaned ${budget.orphanedLaneMeasurements}/${budget.laneMeasurements} lane measurements, wrong ${budget.wrongLaneMeasurements}, ` +
    `attached outside the quote ${placements.attachedOutsideQuote}/${placements.measured})`,
  `     blocked mis-resolutions: textmove ${policy.blocked.textmove}, phase1 ${policy.blocked.phase1}, naive ${policy.blocked.naive} (counterfactual, whole suite)`,
  `     recoveries forgone     : textmove ${policy.forgone.textmove} (safety cost — orphan instead of a guessed move)`,
  `  G3 determinism       : ${gates.G3.pass ? 'PASS' : 'FAIL'} (sha256 ${digests[0].slice(0, 16)}…)`,
  '  G4 python gates      : external (run from repo root)',
  `  G5 language policy   : ${gates.G5.pass ? 'PASS' : 'FAIL'} (authored files ${gates.G5.filesScanned}, out-of-policy chars ${gates.G5.violations.length})`,
  '  -> suite-result.json, REPORT.md, schema-dump.json, sample-state/',
]
process.stdout.write(`${lines.join('\n')}\n`)
process.exitCode = overallPass ? 0 : 1
