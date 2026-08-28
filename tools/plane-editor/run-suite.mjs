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
  FRAGMENT_NAME,
  attachFixtureAnnotations,
  buildTextIndex,
  openSession,
} from './src/session.mjs'
import { SCENARIOS, runScenario, runBoundaryDiagnostic, runDeletionAlignmentDiagnostic } from './src/scenarios.mjs'
import { checkLanguagePolicy } from './src/language.mjs'
import { saveStore } from './src/store.mjs'
import { renderReport } from './src/report.mjs'

const HERE = new URL('./', import.meta.url)
const PACKAGE = JSON.parse(readFileSync(new URL('./package.json', HERE), 'utf8'))
const GATING_SURVIVAL = ['S1', 'S2', 'S3', 'S4', 'S8']
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

function policyCounts(scenarios) {
  let tombstoneSkips = 0
  let counterfactualMisResolves = 0
  let quoteUniqueOneAffix = 0
  const counterfactualTrials = []
  for (const scenario of scenarios) {
    for (const trial of scenario.trials) {
      for (const lane of ['pipeline', 'stale']) {
        const result = trial.lanes[lane]
        if (!result.measured) continue
        if (result.quoteStatus === 'skipped-tombstone') tombstoneSkips += 1
        if (result.quoteAcceptance === 'unique-one-affix' && result.method === 'text-quote') {
          quoteUniqueOneAffix += 1
        }
        if (result.counterfactualQuote && result.counterfactualQuote.wouldMisResolve) {
          counterfactualMisResolves += 1
          counterfactualTrials.push({
            scenario: scenario.id,
            anchorId: trial.anchorId,
            lane,
            wouldAttachTo: result.counterfactualQuote.text,
          })
        }
      }
    }
  }
  return { tombstoneSkips, counterfactualMisResolves, quoteUniqueOneAffix, counterfactualTrials }
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
    const lanes = {}
    for (const lane of LANES) lanes[lane] = laneTotals(trials, lane)
    return {
      id: scenario.id,
      title: scenario.title,
      target: scenario.target,
      gating: Boolean(scenario.gating),
      lanes,
      trials,
    }
  })
  return {
    schema: purity,
    scenarios,
    diagnostics: [runBoundaryDiagnostic(), runDeletionAlignmentDiagnostic()],
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
      `tombstone evidence 규칙으로 quote 복구를 막은 건수 ${result.policy.tombstoneSkips}건이고, ` +
      `그 규칙이 없었다면(naive fallback) 오해소가 ${result.policy.counterfactualMisResolves}건 났다 ` +
      '— a6은 같은 문자열이 문서에 두 번 나오는 함정 앵커다.',
  )

  const s6 = byId.get('S6')
  findings.push(
    `S6(블록 cut+paste) ${s6.lanes.stale.measured}건: 주앵커 생존 ${s6.lanes.stale.survived}, quote 복구 ${s6.lanes.stale.recovered}, ` +
      `orphan ${s6.lanes.stale.orphaned}, 오해소 ${s6.lanes.stale.wrong}. live 레인은 생존 ${s6.lanes.live.survived}/${s6.lanes.live.measured} ` +
      '— PM이 블록을 지웠다 새로 넣으면 Decoration은 전부 사라지고, Yjs RelativePosition도 null을 돌려주므로 복구 부담이 전부 quote selector로 간다.',
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

  findings.push(
    `quote 복구 채택 정책: 양쪽 affix 일치가 원칙이고, exact가 문서에 유일할 때만 한쪽 affix로 채택했다(${result.policy.quoteUniqueOneAffix}건). ` +
      '이 완화가 없으면 S6의 블록-머리 앵커는 앞 문맥이 통째로 바뀌어 전부 orphan이 된다.',
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

const fixtureDoc = openSession({ clientID: 1 })
const fixtureText = buildTextIndex(fixtureDoc.doc).text
fixtureDoc.close()

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
    counterfactualMisResolves: policy.counterfactualMisResolves,
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
  fixture: {
    blocks: FIXTURE_DOC.content.length,
    docChars: fixtureText.length,
    anchors: FIXTURE_ANCHORS.length,
    anchorIds: FIXTURE_ANCHORS.map((anchor) => anchor.id),
  },
  lanes: {
    live: '편집이 일어난 세션 안의 ProseMirror Decoration (플러그인 상태)',
    pipeline: '저장 시 재캡처(또는 orphan이면 원 selector 보존) → 재로드 후 해소',
    stale: '편집 전 캡처한 레코드를 편집 후 문서에 그대로 들이댐 (최악 경로)',
  },
  totals,
  policy: {
    tombstoneSkips: policy.tombstoneSkips,
    counterfactualMisResolves: policy.counterfactualMisResolves,
    quoteUniqueOneAffix: policy.quoteUniqueOneAffix,
    counterfactualTrials: policy.counterfactualTrials,
  },
  bystanders,
  gates,
  scenarios: payload.scenarios,
  diagnostics: payload.diagnostics,
  findings: [],
}
result.findings = deriveFindings(result)

const overallPass = gates.G1.pass && gates.G2.pass && gates.G3.pass && gates.G5.pass

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
  `     S5 orphan/wrong   : pipeline ${s5Pipeline.orphaned}/${s5Pipeline.wrong}, stale ${s5Stale.orphaned}/${s5Stale.wrong} (naive fallback would mis-resolve ${policy.counterfactualMisResolves})`,
  `  G3 determinism       : ${gates.G3.pass ? 'PASS' : 'FAIL'} (sha256 ${digests[0].slice(0, 16)}…)`,
  '  G4 python gates      : external (run from repo root)',
  `  G5 language policy   : ${gates.G5.pass ? 'PASS' : 'FAIL'} (authored files ${gates.G5.filesScanned}, out-of-policy chars ${gates.G5.violations.length})`,
  '  -> suite-result.json, REPORT.md, schema-dump.json, sample-state/',
]
process.stdout.write(`${lines.join('\n')}\n`)
process.exitCode = overallPass ? 0 : 1
