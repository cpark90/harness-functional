#!/usr/bin/env node
/**
 * Phase 2 자체 실행 진입점 — 링크 평면 + 설계결정 평면.
 *
 *   node tools/plane-editor/run-link-checks.mjs
 *
 * 단일 명령·비대화형·결정론이며 종료 코드로 통과/실패를 낸다(재실행하면 stdout이 byte
 * 단위로 같다 — 시각·난수·절대경로를 찍지 않는다). Phase 1 앵커 스위트(`run-suite.mjs`)와는
 * **완전히 분리된 명령**이라 서로의 산출물을 건드리지 않는다.
 *
 * 무엇을 재나:
 *   C0  계약 표면      — cap·추정기·어휘를 도구 층에서 읽어온다(값 복제가 아님).
 *   C1  직렬화 결정론  — 저장된 스토어를 다시 직렬화하면 byte 동일(정렬·키 순서 고정).
 *   C2  cap 소비자     — 경계값 두 개(cap / cap+1)가 계약 표면의 값을 따라 판정된다.
 *   C3  정상 대조군    — 실제 스토어와 control fixture가 PASS(vacuous 배제용 대조군).
 *   C4  negative control — fixture별 **단 한 곳**만 망가뜨린 스토어가 기대한 사유로 FAIL.
 *   C5  판정 안정성    — 같은 스토어를 두 번 검사하면 판정 JSON이 동일.
 */
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

import {
  DEFAULT_STORE_DIR,
  LINKS_FILE,
  PLANE_EDITOR_DIR,
  checkLinkStore,
  linkTypes,
  loadLinkStore,
  loadPlaneContract,
  serializeLinkStore,
} from './src/link-plane.mjs'
import {
  DECISIONS_FILE,
  assertWithinCap,
  capCheck,
  loadDecisionStore,
  serializeDecisionStore,
} from './src/decision-plane.mjs'

const FIXTURES = join(PLANE_EDITOR_DIR, 'fixtures', 'link-plane')
const CONTROL = join(FIXTURES, 'control')

/** fixture = control에서 딱 한 곳만 망가뜨린 스토어. 기대 사유는 1건씩. */
const NEGATIVE_CONTROLS = [
  ['negative-missing-iri', 'graph-endpoint-missing', 'graph endpoint IRI that is not in the graph'],
  ['negative-missing-record', 'record-endpoint-missing', 'decision endpoint that has no record'],
  ['negative-bad-type', 'link-type-unknown', 'link type outside the reused ho: vocabulary'],
  ['negative-supersedes-graph', 'supersedes-boundary', 'supersedes aimed at a graph endpoint'],
  ['negative-orphan-link', 'orphan-link', 'both endpoints unresolvable'],
  ['negative-graph-source', 'direction-graph-source', 'graph endpoint used as the link source'],
  ['negative-tagged-range', 'link-type-range', 'tagged aimed outside its declared rdfs:range'],
  ['negative-supersedes-cycle', 'decision-supersedes-cycle', 'supersedes cycle in the decision plane'],
]

const results = []

function record(name, ok, detail) {
  results.push({ name, ok, detail })
  console.log(`${ok ? '  ok  ' : '  FAIL'}  ${name} — ${detail}`)
}

/* ---- C0 contract surface ---- */

console.log('== C0 contract surface (single definition place = the tool layer) ==')
const contract = loadPlaneContract()
record(
  'cap read from the tool layer',
  Number.isInteger(contract.textCap.tokens) && contract.textCap.tokens > 0,
  `${contract.source.toolsDir}/${contract.source.module}.py:${contract.source.capSymbol} = ` +
    `${contract.textCap.tokens} tokens [${contract.textCap.estimator}]`,
)
record(
  'link-type vocabulary read from the contract',
  linkTypes(contract).length === 6,
  `graph: ${contract.linkTypes.graphVocabulary.join(', ')} · decision-internal: ` +
    `${contract.linkTypes.decisionInternal.join(', ')}`,
)

/* ---- C1 serialisation determinism ---- */

console.log('\n== C1 serialisation determinism (sorted by id, fixed key order) ==')
for (const [label, dir] of [['link-store', DEFAULT_STORE_DIR], ['control fixture', CONTROL]]) {
  const linksOnDisk = readFileSync(join(dir, LINKS_FILE), 'utf8')
  const reserialised = serializeLinkStore(loadLinkStore(dir))
  record(
    `${label}: ${LINKS_FILE} round-trip`,
    reserialised === linksOnDisk,
    reserialised === linksOnDisk ? 'byte-identical' : 'serialiser output differs from disk',
  )
  const decisionsOnDisk = readFileSync(join(dir, DECISIONS_FILE), 'utf8')
  const reserialisedDecisions = serializeDecisionStore(loadDecisionStore(dir))
  record(
    `${label}: ${DECISIONS_FILE} round-trip`,
    reserialisedDecisions === decisionsOnDisk,
    reserialisedDecisions === decisionsOnDisk
      ? 'byte-identical'
      : 'serialiser output differs from disk',
  )
}

/* ---- C2 the cap contract's first consumer ---- */

console.log('\n== C2 decision-plane cap (value comes from the tool layer, not from code) ==')
const { tokens: cap, charsPerToken } = contract.textCap
const atCap = {
  id: 'dec-probe-at-cap',
  title: '',
  body: 'x'.repeat(cap * charsPerToken),
  status: 'open',
  decided_by: 'probe',
}
const overCap = { ...atCap, id: 'dec-probe-over-cap', body: 'x'.repeat((cap + 1) * charsPerToken) }
const atCapResult = capCheck(atCap, contract)
record(
  'a record exactly at the cap is accepted',
  atCapResult.withinCap && atCapResult.tokens === cap,
  `${atCapResult.tokens}/${cap} tokens (${atCapResult.estimator})`,
)
let rejected = false
let rejection = ''
try {
  assertWithinCap(overCap, contract)
} catch (error) {
  rejected = true
  rejection = error.message
}
record(
  'a record one token over the cap is rejected',
  rejected && rejection.includes(`> cap ${cap}`),
  rejected ? rejection : 'no rejection — the cap is not being applied',
)

/* ---- C3 positive controls ---- */

console.log('\n== C3 positive controls ==')
for (const [label, dir] of [['link-store', DEFAULT_STORE_DIR], ['control fixture', CONTROL]]) {
  const verdict = checkLinkStore({ storeDir: dir })
  record(
    `${label} passes the integrity checker`,
    verdict.pass && verdict.exitCode === 0,
    `${verdict.counts.links} link(s) · ${verdict.counts.decisions} decision(s) · ` +
      `${verdict.counts.annotationRecords} annotation record(s) · ` +
      `${verdict.violations.length} violation(s), exit ${verdict.exitCode}`,
  )
}

/* ---- C4 negative controls ---- */

console.log('\n== C4 negative controls (one mutation each) ==')
for (const [fixture, expected, description] of NEGATIVE_CONTROLS) {
  const verdict = checkLinkStore({ storeDir: join(FIXTURES, fixture) })
  const rules = verdict.violations.map((v) => v.rule)
  const ok = !verdict.pass && verdict.exitCode === 1 && rules.length === 1 && rules[0] === expected
  record(
    `${fixture} → ${expected}`,
    ok,
    ok
      ? `${description}; exit 1 with exactly this violation`
      : `expected exactly [${expected}], got [${rules.join(', ') || 'none'}] (exit ${verdict.exitCode})`,
  )
}

/* ---- C5 verdict stability ---- */

console.log('\n== C5 verdict stability ==')
const first = JSON.stringify(checkLinkStore({ storeDir: DEFAULT_STORE_DIR }))
const second = JSON.stringify(checkLinkStore({ storeDir: DEFAULT_STORE_DIR }))
record(
  'two consecutive checks of link-store agree',
  first === second,
  first === second ? 'identical verdict JSON' : 'verdict differs between runs',
)

/* ---- summary ---- */

const failed = results.filter((r) => !r.ok)
console.log(`\n${results.length - failed.length}/${results.length} checks ok`)
if (failed.length) {
  for (const f of failed) console.log(`  - ${f.name}: ${f.detail}`)
}
console.log(`\n${failed.length ? 'FAIL' : 'PASS'}`)
process.exit(failed.length ? 1 : 0)
