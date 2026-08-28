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
 *   C6  주석 스토어 버전 협상 — 남의 평면이 소유한 버전을 강요하지 않고 읽되, 읽을 수 없는
 *       버전은 명시적 사유로 거절한다. **실제 sample-state 스토어**로 실측한다.
 *   C7  끊긴 종단점    — orphan이 된 앵커를 가리키는 링크가 조용히 사라지거나 다른 곳을
 *       가리키지 않고 broken-endpoint 상태로 보고된다.
 *   C8  판정 범위(불변식 I-3) — 스토어 집합은 **발견**으로 정해진다. 인자를 주지 않아도
 *       스토어를 찾고, 스토어 하나만 지목해도 그 디렉토리의 형제 스토어가 함께 판정되며,
 *       인자 순서를 바꿔도 판정 JSON이 byte 단위로 같다. 일부러 깨뜨린 fixture 트리는
 *       **표식으로 명시 격리**되며 그 사실이 판정에 실린다(조용한 제외 금지).
 *   C9  ★ **성질**: `게이트 accept <-> 편집기 accept`를 **모든 fixture 스토어**에 전수
 *       적용한다(디렉토리를 훑으므로 새 fixture는 자동 포함). 사례를 하나씩 막는 대신
 *       성질 하나를 세워 계열 전체를 닫는 자리다 — 불일치가 하나라도 있으면 FAIL.
 *   C11 ★ 링크 타입 어휘가 **그래프에서 파생**된다는 것을 그래프 사본을 변형해 실측한다:
 *       어휘를 하나 더하면 같은 스토어가 red -> green(새 어휘를 코드 변경 없이 인정), 하나
 *       지우면 green -> red(실재하지 않는 어휘는 여전히 위반). 원본 `ontology/`는 무수정이며
 *       그 사실도 byte 비교로 잰다.
 *   C10 발견의 **전제**를 실측한다: 격리 표식·파일 이름으로 쌍둥이 스토어를 가릴 수 있는가,
 *       작업공간 루트가 없으면 무엇이 달라지는가, 그리고 남의 문서 옆으로 **옮겨진** 스토어에
 *       대해 게이트와 **진짜 loadStore**가 같은 답을 내는가.
 *   C12 ★ 종단점 바인딩: 문서 **위치**를 가리키는 종단점이 실제로 그 위치의 텍스트로
 *       해소되는가(기대 문자열과 대조), 게이트가 초록을 줘도 `loadStore`가 거절하면 바인딩이
 *       **0 + 사유**인가, 앵커가 orphan이면 조용히 사라지지 않고 보고되는가, 그리고 게이트가
 *       인정하는 앵커 부분과 바인더가 해소할 수 있는 부분이 **같은 집합**인가.
 */
import {
  cpSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  renameSync,
  rmSync,
  writeFileSync,
} from 'node:fs'
import { tmpdir } from 'node:os'
import { basename, dirname, join, relative, resolve } from 'node:path'

import { anchorStateOf, captureAnchors } from './src/anchors.mjs'
import { locate, openSession } from './src/session.mjs'
import { inspectStore, loadStore, saveStore } from './src/store.mjs'
import {
  EXPECTED_DIVERGENCE_CODES,
  GATE_RULE_OF,
  PER_STORE_GATE_RULES,
} from './src/store-contract.mjs'
import { ANCHOR_PART_RESOLVERS, bindLinkStore } from './src/link-binding.mjs'

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

/**
 * fixture = control에서 딱 한 곳만 망가뜨린 스토어. 기대 사유는 1건씩.
 *
 * 뒤쪽 묶음은 링크 스토어가 아니라 **주석 스토어 쪽**을 한 곳만 망가뜨린다 (`--annotations`로
 * 물린다). 링크 스토어는 정상이므로, 위반이 1건이면 그 한 곳이 원인이다. 두 링크 fixture를
 * 쓰는 이유는 층을 가르기 위해서다:
 *   `annotation-record-live`   — 종단점을 실제로 겨냥한다 (레코드 해소 층의 사유를 잰다)
 *   `annotation-store-contract` — 링크가 하나도 없다 (**스토어 계약 층**만 남긴다). 스토어
 *       계약 위반이 종단점 위반까지 함께 터뜨리면 "위반 정확히 1건"이 깨져 대조군이 무의미해진다.
 */
const NEGATIVE_CONTROLS = [
  ['negative-missing-iri', 'graph-endpoint-missing', 'graph endpoint IRI that is not in the graph'],
  ['negative-missing-record', 'record-endpoint-missing', 'decision endpoint that has no record'],
  ['negative-bad-type', 'link-type-unknown', 'link type outside the reused ho: vocabulary'],
  ['negative-supersedes-graph', 'supersedes-boundary', 'supersedes aimed at a graph endpoint'],
  ['negative-orphan-link', 'orphan-link', 'both endpoints unresolvable'],
  ['negative-graph-source', 'direction-graph-source', 'graph endpoint used as the link source'],
  ['negative-tagged-range', 'link-type-range', 'tagged aimed outside its declared rdfs:range'],
  ['negative-supersedes-cycle', 'decision-supersedes-cycle', 'supersedes cycle in the decision plane'],
  ['negative-annotation-document-missing', 'endpoint-document-missing', 'annotation endpoint without its document'],
  ['negative-annotation-document-mismatch', 'endpoint-document-mismatch', 'annotation endpoint naming another document'],
  ['negative-annotation-state-unknown', 'annotation-anchor-state-unknown', 'annotation record with no measured anchorState'],
  // 종단점이 문서 **위치**를 가리킬 때의 두 자리 (2a): 이름이 닫힌 집합 밖이거나, 레코드가
  // 그 부분을 싣지 않았거나. 둘 다 링크가 selector 사본을 들지 않는다는 구조의 따름이다.
  ['negative-annotation-anchor-unknown', 'link-endpoint-plane', "an endpoint anchor spelled outside the closed set (the record's own anchor parts)"],
  ['negative-annotation-anchor-missing', 'annotation-anchor-missing', 'an endpoint naming a block position on a record that carries no blockContext'],
  ['annotation-record-live', 'annotation-record-unbound',
    'a record with no document identity of its own (identity is never adopted from a store)',
    ['unidentified-record/annotations.json']],
  ['annotation-record-live', 'annotation-record-document-mismatch',
    'a record claiming another document than the store it lives in',
    ['record-document-mismatch/annotations.json']],
  ['annotation-record-live', 'annotation-store-duplicate-document',
    'two annotation stores declaring the same documentId',
    ['duplicate-document/a.json', 'duplicate-document/b.json']],
  // I-3: 한쪽만 지목해도 그 디렉토리의 쌍둥이 스토어가 함께 판정된다 (P2b 재은폐 경로).
  ['annotation-record-live', 'annotation-store-duplicate-document',
    'naming only the bound store still judges the orphaned twin next to it (scope is discovered)',
    ['duplicate-document/b.json']],
  // I-2: 한 스토어 안 중복 레코드 id — 편집기와 게이트가 다른 레코드를 쥐는 자리.
  ['annotation-store-contract', 'annotation-store-duplicate-record',
    'two records sharing one id inside a single store',
    ['duplicate-record/annotations.json']],
  // I-1: 편집기 loadStore가 거절하는 세 모양은 커밋 게이트도 거절한다.
  ['annotation-store-contract', 'annotation-record-unloadable',
    'a version 3 record with no anchors object at all',
    ['no-anchors/annotations.json']],
  ['annotation-store-contract', 'annotation-record-unloadable',
    'the same shape spelled anchors: null',
    ['null-anchors/annotations.json']],
  ['annotation-store-contract', 'annotation-record-unloadable',
    'anchors without a document identity and without a provenance mark',
    ['unmarked-identity/annotations.json']],
  // fail-closed: 검사기가 **완전히 평가하지 못한** 레코드는 건너뛸 대상이 아니라 위반이다.
  ['annotation-store-contract', 'annotation-record-unloadable',
    'a record whose id is not a string (the checker used to skip it and sign the store)',
    ['record-id-not-a-string/annotations.json']],
  ['annotation-store-contract', 'annotation-record-unloadable',
    'a record with no id at all',
    ['record-id-missing/annotations.json']],
  ['annotation-store-contract', 'annotation-record-unloadable',
    'a record that is not an object',
    ['record-not-an-object/annotations.json']],
  // 정직한 스토어가 **남의 문서 옆으로** 옮겨졌다 (병합·rename·git mv 로 도달).
  ['annotation-store-contract', 'annotation-store-document-mismatch',
    'a store whose declared document is not the document state sitting next to it',
    ['document-mismatch/annotations.json']],
  // 문서 축의 fail-closed: 그 대조를 **할 수 없는** 네 모양도 위반이다. 셋(absent ·
  // unparsable · unidentified)은 파일을 옮기는 것만으로 도달하며, 예전에는 전부 게이트
  // exit 0 · 종단점 해소였다(실측: vnv N1 · N6 · N2).
  ['annotation-store-contract', 'annotation-store-document-unreadable',
    'a store whose directory holds no document.json at all (exported, partially checked out)',
    ['document-state-absent/annotations.json']],
  ['annotation-store-contract', 'annotation-store-document-unreadable',
    'a store next to a document.json truncated mid-merge (unparsable)',
    ['document-state-unparsable/annotations.json']],
  ['annotation-store-contract', 'annotation-store-document-unreadable',
    'a binding store next to a document.json that carries no plaintext documentId',
    ['document-state-unidentified/annotations.json']],
  ['annotation-store-contract', 'annotation-store-document-unreadable',
    'a store next to a document.json that carries no document state at all',
    ['document-state-missing/annotations.json']],
  // 발견된(지목하지 않은) 읽을 수 없는 스토어는 판정을 멈추지 않고 **보고**된다.
  ['annotation-store-contract', 'annotation-store-unreadable',
    'a store this checker cannot read, found next to a readable one (reported, not skipped, ' +
      'and it does not stop the judgment the way a NAMED unreadable store does)',
    ['unreadable-sibling/annotations.json']],
]

const ANNOTATION_STORES = join(FIXTURES, 'annotation-stores')
const SAMPLE_ANNOTATIONS = join(PLANE_EDITOR_DIR, 'sample-state', 'annotations.json')

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
// 어휘는 **파생**이므로 여기서 특정 이름(`tagged`·`id:kind-overlap`)을 기대하면 안 된다 —
// 그 기대가 바로 이 wave가 없앤 결함(그래프가 술어를 폐기하자 게이트가 red)이다. 구조만 잰다:
// 출처가 파생이고, 파생이 비어 있지 않으며, 두 형식의 표기 규약이 계약에 실려 있는가.
{
  const vocab = contract.linkTypes
  record(
    'link-type vocabulary is DERIVED from the graph, not a hard-coded list',
    vocab.source === 'derived-from-graph' &&
      Array.isArray(vocab.graphVocabulary) && vocab.graphVocabulary.length > 0 &&
      Array.isArray(vocab.graphKinds) &&
      vocab.predicateForm.declaredAs === 'owl:ObjectProperty' &&
      vocab.kindForm.declaredAs === 'ho:LinkKind' &&
      linkTypes(contract).length ===
        vocab.graphVocabulary.length + vocab.graphKinds.length + vocab.decisionInternal.length,
    `${vocab.graphVocabulary.length} live ho: predicate(s) spelled ${vocab.predicateForm.spelling} · ` +
      `${vocab.graphKinds.length} ho:LinkKind individual(s) spelled ${vocab.kindForm.spelling} ` +
      `[${vocab.graphKinds.join(', ') || 'none'}] · plane-internal: ${vocab.decisionInternal.join(', ')}`,
  )
}

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
for (const [fixture, expected, description, annotationFiles] of NEGATIVE_CONTROLS) {
  const verdict = checkLinkStore({
    storeDir: join(FIXTURES, fixture),
    ...(annotationFiles
      ? { annotations: annotationFiles.map((file) => join(ANNOTATION_STORES, file)) }
      : {}),
  })
  const rules = verdict.violations.map((v) => v.rule)
  const ok = !verdict.pass && verdict.exitCode === 1 && rules.length === 1 && rules[0] === expected
  record(
    `${annotationFiles ? annotationFiles.join('+') : fixture} → ${expected}`,
    ok,
    ok
      ? `${description}; exit 1 with exactly this violation`
      : `expected exactly [${expected}], got [${rules.join(', ') || 'none'}] (exit ${verdict.exitCode})`,
  )
}

/* ---- C6 annotation store version negotiation ---- */

console.log('\n== C6 annotation store version negotiation (the annotation plane owns its version) ==')
record(
  'the checker declares which annotation-store versions it can read',
  Array.isArray(contract.annotationStore.readableVersions) &&
    contract.annotationStore.readableVersions.includes(contract.annotationStore.bindingVersion) &&
    contract.annotationStore.readableVersions.includes(contract.annotationStore.planeVersion),
  `readable ${JSON.stringify(contract.annotationStore.readableVersions)} · binds endpoints from v` +
    `${contract.annotationStore.bindingVersion} · the plane (${contract.annotationStore.planeModule}) ` +
    `currently writes v${contract.annotationStore.planeVersion}`,
)

// ★ F1의 실측: **실제** 주석 스토어(run-suite.mjs가 쓴 sample-state)를 물려 PASS를 잰다.
if (!existsSync(SAMPLE_ANNOTATIONS)) {
  record('the real annotation store is present', false, `${SAMPLE_ANNOTATIONS} is missing — run node run-suite.mjs first`)
} else {
  const live = checkLinkStore({
    storeDir: join(FIXTURES, 'annotation-live'),
    annotations: [SAMPLE_ANNOTATIONS],
  })
  const store = live.annotationStores.find((entry) => entry.path.endsWith('sample-state/annotations.json'))
  record(
    'a link resolves against the REAL annotation store (sample-state)',
    live.pass && live.exitCode === 0 && store.bindsEndpoints && store.records > 0,
    live.pass
      ? `v${store.version} store ${store.path} (${store.records} record(s), document ${store.documentId}), ` +
        `${live.counts.links} link(s), ${live.violations.length} violation(s), exit ${live.exitCode}`
      : `expected PASS, got [${live.violations.map((v) => v.rule).join(', ')}] (exit ${live.exitCode})`,
  )
}

for (const [file, version] of [['legacy-v1/annotations.json', 1], ['legacy-v2/annotations.json', 2]]) {
  const legacy = checkLinkStore({
    storeDir: join(FIXTURES, 'annotation-legacy'),
    annotations: [join(ANNOTATION_STORES, file)],
  })
  const store = legacy.annotationStores.find((entry) => entry.path.includes('annotation-stores/'))
  const rules = legacy.violations.map((v) => v.rule)
  record(
    `a v${version} annotation store is read, but cannot bind endpoints`,
    store &&
      store.version === version &&
      store.bindsEndpoints === false &&
      legacy.exitCode === 1 &&
      rules.length > 0 &&
      rules.every((rule) => rule === 'annotation-store-unbound'),
    store
      ? `read ${store.records} record(s) at v${store.version}; endpoints refused with ` +
        `[${[...new Set(rules)].join(', ') || 'none'}] (exit ${legacy.exitCode})`
      : 'the store was not read at all',
  )
}

{
  // 읽을 수 없는 버전은 조용히 통과하지 않고 **사유와 함께** 멈춘다 (exit 2).
  let refused = false
  let message = ''
  try {
    checkLinkStore({
      storeDir: join(FIXTURES, 'annotation-legacy'),
      annotations: [join(ANNOTATION_STORES, 'unreadable-v99/annotations.json')],
    })
  } catch (error) {
    refused = true
    message = error.message
  }
  record(
    'an unreadable annotation-store version is refused with an explicit reason',
    refused && message.includes('outside the readable set'),
    refused ? message.split('\n')[0] : 'the checker accepted a version it cannot read',
  )
}

/* ---- C7 broken endpoints ---- */

console.log('\n== C7 broken endpoints (an orphaned anchor is a state, not a violation) ==')
{
  const verdict = checkLinkStore({
    storeDir: join(FIXTURES, 'annotation-broken'),
    annotations: [join(ANNOTATION_STORES, 'broken-endpoint/annotations.json')],
  })
  record(
    'a link pointing at an orphaned anchor is reported, not hidden and not re-pointed',
    verdict.pass &&
      verdict.exitCode === 0 &&
      verdict.counts.brokenEndpoints === 1 &&
      verdict.brokenEndpoints[0].state === 'orphaned',
    verdict.counts.brokenEndpoints === 1
      ? `${verdict.brokenEndpoints[0].link}: ${verdict.brokenEndpoints[0].side} -> ` +
        `${verdict.brokenEndpoints[0].endpoint} [${verdict.brokenEndpoints[0].state}], ` +
        `still ${verdict.violations.length} violation(s), exit ${verdict.exitCode}`
      : `expected exactly one broken endpoint, got ${verdict.counts.brokenEndpoints}`,
  )
  const control = checkLinkStore({ storeDir: CONTROL })
  record(
    'a store whose endpoints are all bound reports no broken endpoint (control)',
    control.counts.brokenEndpoints === 0 && control.pass,
    `${control.counts.brokenEndpoints} broken endpoint(s) in the control fixture`,
  )
}

/* ---- C8 판정 범위는 발견으로 정해진다 (불변식 I-3) ---- */

console.log('\n== C8 scope is discovered, not chosen (annotation stores) ==')
{
  // (1) 인자를 하나도 주지 않아도 스토어를 찾는다 — 그리고 무엇을 찾았는지 판정에 싣는다.
  const gate = checkLinkStore({ storeDir: DEFAULT_STORE_DIR })
  const scope = gate.annotationScope
  const found = scope.discovered.concat(scope.explicit)
  record(
    'the gate discovers annotation stores from the workspace root',
    scope.workspaceRoot !== null && found.some((path) => path.endsWith('sample-state/annotations.json')),
    `workspace root ${scope.workspaceRoot}; found ${found.length} store(s): ${found.join(', ') || 'none'}`,
  )
  // (2) 일부러 깨뜨린 fixture 트리는 **표식으로** 빠지고, 그 사실이 판정에 남는다.
  const quarantined = scope.quarantined.map((entry) => entry.path)
  record(
    'deliberately broken fixture stores are excluded by an explicit marker, not silently',
    quarantined.some((path) => path.endsWith('tools/plane-editor/fixtures')) &&
      scope.quarantined.every((entry) => entry.reason.length > 0),
    quarantined.length
      ? scope.quarantined.map((entry) => `${entry.path} — ${entry.reason}`).join(' · ')
      : 'nothing was quarantined — the fixture marker is missing',
  )
  // (3) 스토어 하나만 지목해도 그 디렉토리의 쌍둥이가 함께 판정된다 (P2b 재은폐 경로).
  const twin = checkLinkStore({
    storeDir: join(FIXTURES, 'annotation-record-live'),
    annotations: [join(ANNOTATION_STORES, 'duplicate-document/b.json')],
  })
  record(
    'naming one store of a duplicated document also judges its twin (broken endpoint stays visible)',
    !twin.pass && twin.exitCode === 1 && twin.counts.brokenEndpoints === 1 &&
      twin.annotationStores.filter((entry) => entry.documentId === 'doc-fixture-live').length === 2,
    `${twin.annotationStores.length} store(s) judged, ${twin.counts.brokenEndpoints} broken endpoint(s), ` +
      `[${twin.violations.map((v) => v.rule).join(', ') || 'none'}] (exit ${twin.exitCode})`,
  )
  // (3b) 반대편 — 형제가 **다른 문서**의 스토어면 판정에 끌려오지 않는다(위양성 금지).
  //      대신 조용히 사라지지도 않는다: 판정 JSON의 outOfScope에 남는다.
  const mixed = checkLinkStore({
    storeDir: join(FIXTURES, 'annotation-store-contract'),
    annotations: [join(ANNOTATION_STORES, 'mixed-documents/named.json')],
  })
  // 빠진 후보는 **사유와 함께** 남는다: 경로만 적으면 왜 빠졌는지가 판정 밖에 남는다.
  const outOfScope = mixed.annotationScope.outOfScope
  record(
    "a neighbour about another document is listed out of scope with its reason, not judged and not dropped",
    mixed.pass && mixed.exitCode === 0 &&
      outOfScope.some((entry) => entry.path.endsWith('mixed-documents/other-document.json') &&
        entry.reason === 'another-document') &&
      !mixed.annotationStores.some((entry) => entry.documentId === 'doc-fixture-other'),
    `${mixed.annotationStores.length} store(s) judged, out of scope ` +
      `[${outOfScope.map((entry) => `${entry.path} (${entry.reason})`).join(', ') || 'none'}]` +
      ` (exit ${mixed.exitCode})`,
  )
  // (4) 같은 파일을 두 번 물려도 "중복 선언"이 아니다 (정규화 — 위양성 금지).
  const twice = checkLinkStore({
    storeDir: join(FIXTURES, 'annotation-record-live'),
    annotations: [join(ANNOTATION_STORES, 'unidentified-record/annotations.json'),
      join(ANNOTATION_STORES, 'unidentified-record/annotations.json')],
  })
  const twiceRules = twice.violations.map((v) => v.rule)
  const namedTwice = twice.annotationStores
    .filter((entry) => entry.path.endsWith('unidentified-record/annotations.json'))
  record(
    'the same file named twice is one store, not a duplicate declaration',
    namedTwice.length === 1 && !twiceRules.includes('annotation-store-duplicate-document'),
    `the named store appears ${namedTwice.length} time(s) among ${twice.annotationStores.length} ` +
      `judged store(s), [${twiceRules.join(', ') || 'none'}]`,
  )
  // (5) 인자 순서는 판정에 새어 들어가지 않는다 (I-2/I-3의 순서 독립을 byte로 못 박는다).
  const files = ['duplicate-document/a.json', 'duplicate-document/b.json']
    .map((file) => join(ANNOTATION_STORES, file))
  const forward = JSON.stringify(checkLinkStore({
    storeDir: join(FIXTURES, 'annotation-record-live'), annotations: files,
  }))
  const reverse = JSON.stringify(checkLinkStore({
    storeDir: join(FIXTURES, 'annotation-record-live'), annotations: [...files].reverse(),
  }))
  record(
    'two argument orders produce the same verdict JSON',
    forward === reverse,
    forward === reverse ? 'identical verdict JSON' : 'the argument order leaked into the verdict',
  )
}

/* ---- C9 성질: 게이트와 편집기는 모든 fixture 스토어에서 같은 답을 낸다 ---- */

console.log('\n== C9 property: gate accepts <-> editor accepts (every store found under fixtures/) ==')

const REPO_ROOT = resolve(PLANE_EDITOR_DIR, '..', '..')
const CONTRACT_FIXTURE = join(FIXTURES, 'annotation-store-contract')

/**
 * 성질의 범위를 정직하게 적는다. 대조하는 것은 **스토어 디렉토리 하나에 대한 계약**이다:
 *   - 편집기 쪽 = **진짜 `loadStore`** 가 그 디렉토리에 대해 내는 답(`inspectStore`는 같은
 *     경로를 걸으며 첫 위반에서 던지는 대신 전부 모을 뿐이고, 매 스토어에서 `loadStore`의
 *     답과 일치하는지 함께 확인한다). 계약 함수를 성질이 **다시 계산하지 않는다** — 성질이
 *     자기 자신을 재계산하면 두 층의 입력이 갈리는 축이 구조적으로 보이지 않는다
 *     (실측: vnv 6차 §3(5) — 계약 함수에 게이트와 같은 평문 입력을 먹였더니 N2형 반례가
 *     divergence 0으로 통과했다).
 *   - 게이트 쪽 = 그 스토어 경로에 귀속되는 `PER_STORE_GATE_RULES` 위반 (+ 읽지 못해 멈춘 경우).
 *
 * **성질이 보는 것과 보지 못하는 것** (범위를 문언으로 적어 둔다):
 *   - 코퍼스 = `fixtures/**.json` 중 스토어 모양인 것 + 실사용 `sample-state`. 디렉토리를
 *     훑으므로 새 fixture는 자동 포함이지만, **fixtures 밖의 스토어는 보지 않는다**
 *     (그 축은 게이트의 발견이 맡고, C8·C10이 잰다).
 *   - 코퍼스 필터는 `annotations` 키와 `version` 키를 가진 JSON이다. `annotations`가 배열이
 *     아닌 모양까지 포함하도록 넓혔다 — 게이트의 발견 필터(배열일 때만 스토어)보다 넓고,
 *     계약의 첫 규칙(`annotations-not-an-array`)이 실제로 측정되게 하기 위해서다.
 *   - 대조는 **스토어 하나의 계약**이다. 스토어 **사이**의 사실(같은 documentId를 선언한
 *     스토어가 둘)과 링크 종단점 해소는 `loadStore` 하나가 볼 수 없으므로 제외한다 —
 *     그 축은 C4·C7·C8이 따로 고정한다.
 *   - 게이트가 **원리적으로 볼 수 없는** 코드(`EXPECTED_DIVERGENCE_CODES`: 평문과 CRDT
 *     상태의 어긋남 · `yUpdateBase64` 내용이 열리지 않음)는 divergence 를 **없애지 않고**
 *     별도 부류로 센다. 그 부류는 fixture 로 코퍼스에 들어와 있어 **매 실행 측정**되고,
 *     부류 **밖**의 divergence 는 0이어야 한다(선언된 전제가 조용히 넓어지는 것을 막는다).
 */
function jsonFilesUnder(directory) {
  const out = []
  for (const entry of readdirSync(directory, { withFileTypes: true })
    .sort((a, b) => (a.name < b.name ? -1 : a.name > b.name ? 1 : 0))) {
    const child = join(directory, entry.name)
    if (entry.isDirectory()) out.push(...jsonFilesUnder(child))
    else if (entry.name.endsWith('.json')) out.push(child)
  }
  return out
}

function readJSON(path) {
  try {
    return JSON.parse(readFileSync(path, 'utf8'))
  } catch {
    return null
  }
}

/**
 * 코퍼스 필터. 게이트의 발견 필터(`annotations`가 **배열**일 때만 스토어)보다 한 칸 넓다:
 * `annotations` 키가 있고 `version` 키가 있으면 후보로 본다. 계약의 첫 규칙
 * (`annotations-not-an-array`)이 겨냥하는 모양을 필터가 걸러 내면 그 규칙은 한 번도
 * 측정되지 않기 때문이다(실측 지적: vnv 6차 §3(2)).
 */
const looksLikeStore = (payload) =>
  Boolean(payload) && typeof payload === 'object' && !Array.isArray(payload) &&
  'annotations' in payload && 'version' in payload

/**
 * ★ 편집기 쪽 답 = **진짜 로드 경로**. `inspectStore`는 `loadStore`가 그대로 쓰는 함수이며
 * (파일을 읽고 · 문서 상태를 열고 · CRDT에서 정체성을 얻어 평문에 못 박고 · payload 계약을
 * 적용한다), 여기서는 첫 위반에서 던지는 대신 전부 모을 뿐이다. 그리고 같은 자리에서
 * **`loadStore` 자체**를 불러 두 답이 어긋나지 않는지 확인한다(성질이 자기 재계산이 아님을
 * 매 스토어에서 못 박는다).
 */
function editorVerdict(storePath) {
  const dir = dirname(storePath)
  const storeFile = basename(storePath)
  let problems
  try {
    problems = inspectStore(dir, { storeFile }).problems
  } catch (error) {
    problems = [{ code: error.code ?? '<threw>', detail: error.message }]
  }
  let opened = true
  let thrown = null
  try {
    loadStore(dir, { storeFile })
  } catch (error) {
    opened = false
    thrown = error.code ?? '<threw>'
  }
  const codes = problems.map((problem) => problem.code)
  const rules = [...new Set(codes.map(
    (code) => (EXPECTED_DIVERGENCE_CODES.includes(code)
      ? `<expected-divergence:${code}>`
      : GATE_RULE_OF[code] ?? `<unmapped:${code}>`),
  ))].sort()
  return {
    rejected: codes.length > 0,
    codes,
    rules,
    // loadStore 는 첫 위반으로 던진다: 두 답이 갈리면 성질의 편집기 쪽이 로드 경로가 아니다.
    agreesWithLoadStore: opened === (codes.length === 0) && (opened || thrown === codes[0]),
  }
}

function gateContractVerdict(storePath) {
  const shown = relative(REPO_ROOT, storePath)
  try {
    const verdict = checkLinkStore({ storeDir: CONTRACT_FIXTURE, annotations: [storePath] })
    const rules = verdict.violations
      .filter((v) => PER_STORE_GATE_RULES.includes(v.rule) && v.detail.includes(shown))
      .map((v) => v.rule)
    return { rejected: rules.length > 0, rules: [...new Set(rules)].sort(), stopped: false }
  } catch (error) {
    // 지목한 스토어를 읽지 못하면 게이트는 사유와 함께 **멈춘다**(exit 2) = 거절.
    return { rejected: true, rules: ['<stopped>'], stopped: true, reason: error.message }
  }
}

const storeFiles = [
  ...jsonFilesUnder(join(PLANE_EDITOR_DIR, 'fixtures')),
  SAMPLE_ANNOTATIONS,
].filter((path) => existsSync(path) && looksLikeStore(readJSON(path)))

/**
 * **선언된 전제는 매 실행 측정한다** (불변식 3). 게이트가 원리적으로 볼 수 없는 축(문서
 * 상태의 CRDT **내용**)에서는 게이트가 초록을 주고 편집기가 거절한다 — 그것은 결함이 아니라
 * 선언된 경계다. 그러나 문장으로만 두면 경계가 조용히 넓어지므로 **부류**로 다룬다:
 *   - 이 부류에 드는 divergence 는 세어서 보고하고(코퍼스에 fixture 로 들어와 있다),
 *   - **부류 밖의 divergence 는 0** 이어야 한다.
 * 부류 판정은 편집기 코드로만 한다: 게이트가 그 스토어를 **초록으로 서명**했고, 편집기의
 * 거절 코드가 전부 `EXPECTED_DIVERGENCE_CODES` 안일 때만 예상된 어긋남이다. 게이트가 규칙을
 * 가진 코드(예: `document-state-unusable`)는 이 부류에 없으므로, 그 규칙이 퇴화하면 예상
 * 부류로 가려지지 않고 그대로 FAIL 한다.
 */
const expectedDivergence = (editor, gate) =>
  !gate.rejected && editor.rejected &&
  editor.codes.every((code) => EXPECTED_DIVERGENCE_CODES.includes(code))

const divergences = []
const expected = []
const editorVerdicts = new Map()
const disagreements = []
for (const storePath of storeFiles) {
  const editor = editorVerdict(storePath)
  editorVerdicts.set(storePath, editor)
  if (!editor.agreesWithLoadStore) disagreements.push(relative(REPO_ROOT, storePath))
  const gate = gateContractVerdict(storePath)
  const sameRules = gate.stopped || `${editor.rules}` === `${gate.rules}`
  if (editor.rejected !== gate.rejected || !sameRules) {
    const row = {
      store: relative(REPO_ROOT, storePath),
      editor: editor.rejected ? editor.codes.join(', ') : 'accepted',
      gate: gate.rejected ? gate.rules.join(', ') : 'accepted',
    }
    if (expectedDivergence(editor, gate)) expected.push(row)
    else divergences.push(row)
  }
}
record(
  `every store the fixtures hold gets the same answer from both layers, outside the declared ` +
    `class (${storeFiles.length} store(s))`,
  divergences.length === 0 && storeFiles.length > 0,
  divergences.length === 0
    ? `${storeFiles.length} store(s) scanned through the real loadStore, 0 unexpected divergence ` +
      `(a store the gate signs is a store the editor opens), ${expected.length} in the declared ` +
      'class'
    : divergences.map((row) => `${row.store}: editor [${row.editor}] vs gate [${row.gate}]`).join(' · '),
)
// ★ 불변식 3 — 선언된 전제도 **매 실행 측정**한다. 이 부류가 비면 전제는 다시 주장으로
// 돌아가고, 부류가 넓어지면(부류 밖 divergence 를 부류 안으로 흡수하면) 위 검사가 잡는다.
record(
  'the premises the gate cannot see are MEASURED, not asserted (expectedDivergence class)',
  expected.length >= 3 &&
    expected.every((row) => row.gate === 'accepted') &&
    new Set(expected.flatMap((row) => row.editor.split(', '))).size === EXPECTED_DIVERGENCE_CODES.length,
  `${expected.length} store(s) in the class [${EXPECTED_DIVERGENCE_CODES.join(', ')}], every one ` +
    'signed green by the gate and refused by the editor: ' +
    `${expected.map((row) => `${basename(dirname(row.store))} [${row.editor}]`).join(' · ') || 'none'}`,
)
// ★ 편집기 쪽이 **진짜 로드 경로**인가. 이것이 깨지면 위 대조는 계약 함수의 자기 재계산이다.
record(
  'the editor side of the property IS the real loadStore (not a recomputation of the contract)',
  disagreements.length === 0 && storeFiles.length >= 3,
  disagreements.length === 0
    ? `${storeFiles.length} store(s) compared through loadStore(dir, {storeFile}); its refusal ` +
      'code equals the first problem of the load path on every one of them'
    : `loadStore disagrees with the inspected load path on: ${disagreements.join(', ')}`,
)
// 성질이 **거절 쪽에서도** 비어 있지 않은지 (전부 accept 여서 얻은 0이 아님을 보인다).
const refusedStores = storeFiles.filter((path) => editorVerdicts.get(path).rejected)
const documentAxis = storeFiles.filter((path) =>
  editorVerdicts.get(path).codes.some((code) => code.startsWith('document-state-')))
record(
  'the property is not vacuous: some of those stores are refused by both layers',
  refusedStores.length >= 4 && refusedStores.length < storeFiles.length,
  `${refusedStores.length} of ${storeFiles.length} store(s) are refused by both layers ` +
    `(${refusedStores.map((path) => relative(FIXTURES, path)).join(', ') || 'none'})`,
)
// 문서 축이 성질의 **안**에 있는가. 이 코퍼스가 비면 N1·N2·N6 계열은 다시 보이지 않는다.
record(
  'the document axis is inside the property, not just inside the case table',
  documentAxis.length >= 3,
  `${documentAxis.length} store(s) in the corpus are judged on the document axis ` +
    `(${documentAxis.map((path) => relative(FIXTURES, dirname(path))).join(', ') || 'none'}) — ` +
    'reverting the gate rule turns each of them into a divergence',
)
// 실사용 스토어(sample-state)는 **양쪽 accept** 대조군이다.
if (existsSync(SAMPLE_ANNOTATIONS)) {
  let loaded = null
  try {
    loaded = loadStore(dirname(SAMPLE_ANNOTATIONS))
  } catch {
    loaded = null
  }
  record(
    'the real store (sample-state) opens through that same path and both layers accept it',
    loaded !== null && !editorVerdicts.get(SAMPLE_ANNOTATIONS).rejected,
    loaded !== null
      ? `sample-state loads (v${loaded.version}, ${loaded.annotations.length} record(s), ` +
        `document ${loaded.documentId})`
      : 'the real store did not load',
  )
}

/* ---- C10 발견의 전제 (격리 표식 · 파일 이름 · 작업공간 루트) ---- */

/* ---- 실제 세션으로 스토어를 짓는 헬퍼 (C10·C12 공용) ---- */

const para = (text) => ({ type: 'paragraph', content: [{ type: 'text', text }] })
const docOf = (...texts) => ({ type: 'doc', content: texts.map(para) })
const stringify = (value) => `${JSON.stringify(value, null, 2)}\n`

/**
 * 실제 세션으로 만든 정직한 v3 스토어 (문서 상태 + 살아 있는 앵커 하나).
 * `destroy`를 주면 캡처 **뒤에** 그 블록을 지워 앵커를 orphan으로 만든다 — 저장되는
 * `anchorState`는 그때 **측정된** 값이다(선언이 아니다).
 */
const honestStore = (dir, clientID, line, { destroy = false } = {}) => {
  const session = openSession({ clientID, docJSON: docOf('Opening block.', line, 'Closing block.') })
  const target = locate(session, { quote: line.slice(0, 12) })
  const anchors = captureAnchors(session, target.from, target.to)
  if (destroy) session.dispatch((tr) => tr.delete(target.blockOuterFrom, target.blockOuterTo))
  saveStore(dir, {
    fragment: 'prosemirror',
    documentId: session.documentId,
    docUpdate: session.encodeState(),
    docJSON: session.editor.getJSON(),
    annotations: [{
      id: 'a1',
      anchors,
      body: 'honest',
      status: 'open',
      anchorState: anchorStateOf(session, anchors),
    }],
  })
  const { documentId } = session
  session.close()
  return documentId
}

/** 링크 하나짜리 스토어. `anchor`를 주면 그 종단점이 문서 **위치**를 가리킨다. */
const linkStoreAt = (dir, documentId, linkId, anchor = null) => {
  mkdirSync(dir, { recursive: true })
  writeFileSync(join(dir, LINKS_FILE), stringify({
    version: 1,
    plane: 'link',
    links: [{
      id: linkId,
      from: { plane: 'annotation', ref: 'a1', document: documentId, ...(anchor ? { anchor } : {}) },
      to: { plane: 'graph', ref: 'id:c-traceability' },
      type: 'tagged',
      created_by: 'run-link-checks scratch workspace',
    }],
  }))
  writeFileSync(join(dir, DECISIONS_FILE), stringify({ version: 1, plane: 'decision', decisions: [] }))
  return dir
}

console.log('\n== C10 the premises of discovery, measured (quarantine marker, file name, workspace root) ==')
{
  const scratch = mkdtempSync(join(tmpdir(), 'plane-editor-scope-'))
  try {
    const ws = join(scratch, 'ws')
    mkdirSync(join(ws, '.git'), { recursive: true })
    const documentId = honestStore(join(ws, 'main'), 41, 'The disputed clause survives here.')
    const linkDir = linkStoreAt(join(ws, 'link'), documentId, 'ln-scope-probe')

    const alone = checkLinkStore({ storeDir: linkDir })
    record(
      'control: one honest store in a workspace passes',
      alone.pass && alone.exitCode === 0 && alone.counts.brokenEndpoints === 0,
      `${alone.annotationStores.length} store(s) judged, ${alone.counts.brokenEndpoints} broken, ` +
        `[${alone.violations.map((v) => v.rule).join(', ') || 'none'}] (exit ${alone.exitCode})`,
    )

    // 문서를 복제하면 정체성도 복제된다: 같은 문서를 선언한 쌍둥이가 다른 디렉토리에 생긴다.
    // 그 쌍둥이에서 종단점은 끊겨 있으므로, 쌍둥이가 판정에서 빠지면 끊김이 은폐된다.
    const twin = JSON.parse(readFileSync(join(ws, 'main', 'annotations.json'), 'utf8'))
    twin.annotations[0].anchorState = 'orphaned'
    mkdirSync(join(ws, 'copy'), { recursive: true })
    writeFileSync(join(ws, 'copy', 'annotations.json'), stringify(twin))
    const twinFound = checkLinkStore({ storeDir: linkDir })
    record(
      'a twin store in another directory is found with no arguments at all',
      !twinFound.pass && twinFound.exitCode === 1 && twinFound.counts.brokenEndpoints === 1 &&
        twinFound.violations.some((v) => v.rule === 'annotation-store-duplicate-document'),
      `[${twinFound.violations.map((v) => v.rule).join(', ') || 'none'}], ` +
        `${twinFound.counts.brokenEndpoints} broken endpoint(s) (exit ${twinFound.exitCode})`,
    )

    // (1) 격리 표식으로 그 쌍둥이를 가릴 수 있는가 (실측된 우회: vnv Y2b).
    writeFileSync(join(ws, 'copy', '.annotation-store-quarantine'), 'work in progress\n')
    const quarantined = checkLinkStore({ storeDir: linkDir })
    record(
      'a quarantine marker cannot hide a store of a document judged outside it',
      !quarantined.pass && quarantined.exitCode === 1 && quarantined.counts.brokenEndpoints === 1,
      `[${quarantined.violations.map((v) => v.rule).join(', ') || 'none'}], ` +
        `${quarantined.counts.brokenEndpoints} broken endpoint(s) (exit ${quarantined.exitCode})`,
    )
    rmSync(join(ws, 'copy', '.annotation-store-quarantine'))

    // (2) 파일 이름을 바꿔 발견을 피할 수 있는가 (실측된 우회: vnv Y3).
    renameSync(join(ws, 'copy', 'annotations.json'), join(ws, 'copy', 'annotations-backup.json'))
    const renamed = checkLinkStore({ storeDir: linkDir })
    record(
      'renaming a store does not hide it either (it declares a document under judgment)',
      !renamed.pass && renamed.exitCode === 1 && renamed.counts.brokenEndpoints === 1 &&
        renamed.annotationStores.some((entry) => entry.path.endsWith('annotations-backup.json')),
      `${renamed.annotationStores.length} store(s) judged, ` +
        `[${renamed.violations.map((v) => v.rule).join(', ') || 'none'}], ` +
        `${renamed.counts.brokenEndpoints} broken endpoint(s) (exit ${renamed.exitCode})`,
    )

    // (3) 남는 전제: **작업공간 루트가 없으면** 발견은 인자와 스토어 디렉토리로 한정된다.
    //     닫힌 것이 아니라 **판정 JSON에 드러나는** 전제이므로, 그 사실 자체를 잰다.
    const outside = join(scratch, 'no-workspace')
    const outsideDocument = honestStore(join(outside, 'main'), 42, 'The disputed clause survives here.')
    const outsideLinks = linkStoreAt(join(outside, 'link'), outsideDocument, 'ln-scope-outside')
    const outsideTwin = JSON.parse(readFileSync(join(outside, 'main', 'annotations.json'), 'utf8'))
    outsideTwin.annotations[0].anchorState = 'orphaned'
    mkdirSync(join(outside, 'copy'), { recursive: true })
    writeFileSync(join(outside, 'copy', 'annotations.json'), stringify(outsideTwin))
    const noRoot = checkLinkStore({
      storeDir: outsideLinks,
      annotations: [join(outside, 'main', 'annotations.json')],
    })
    record(
      'outside a workspace the premise is visible in the verdict (workspaceRoot is null)',
      noRoot.annotationScope.workspaceRoot === null,
      `workspaceRoot ${noRoot.annotationScope.workspaceRoot === null ? 'null' : 'set'}; the twin ` +
        `next to it is ${noRoot.annotationStores.length === 1 ? 'NOT' : ''} judged ` +
        `(${noRoot.annotationStores.length} store(s), ${noRoot.counts.brokenEndpoints} broken, ` +
        `exit ${noRoot.exitCode}) - discovery needs a workspace root`,
    )

    // (4) 남의 문서 옆으로 **옮겨진** 스토어: 진짜 loadStore와 게이트가 같은 답을 내는가.
    //     (발견이 작동해야 하므로 자기 작업공간을 따로 만든다 — 위 (3)이 그 전제를 보였다.)
    const moved = join(scratch, 'moved-ws')
    mkdirSync(join(moved, '.git'), { recursive: true })
    honestStore(join(moved, 'a'), 43, 'The disputed clause survives here.')
    const documentB = honestStore(join(moved, 'b'), 44, 'A different document with other words.')
    writeFileSync(
      join(moved, 'b', 'annotations.json'),
      readFileSync(join(moved, 'a', 'annotations.json'), 'utf8'),
    )
    let editorOpened = true
    try {
      loadStore(join(moved, 'b'))
    } catch {
      editorOpened = false
    }
    const movedVerdict = checkLinkStore({ storeDir: linkStoreAt(join(moved, 'link'), documentB, 'ln-moved') })
    record(
      'a store moved next to another document: the gate refuses exactly what the editor refuses',
      !editorOpened && !movedVerdict.pass && movedVerdict.exitCode === 1 &&
        movedVerdict.violations.some((v) => v.rule === 'annotation-store-document-mismatch'),
      `editor ${editorOpened ? 'opened' : 'refused'} it; gate [` +
        `${movedVerdict.violations.map((v) => v.rule).join(', ') || 'none'}] (exit ${movedVerdict.exitCode})`,
    )

    /* ---- (5)-(7) 문서 축의 fail-closed — **파일을 옮기는 것만으로** 도달하는 세 모양 ----
     *
     * 셋 다 예전에는 게이트 exit 0 · pass true · broken 0 · 링크 해소였고, 진짜 loadStore는
     * 셋 다 거절했다(실측: vnv N1 · N2 · N6). 여기서는 fixture가 아니라 **실제 작업공간**에
     * 그 모양을 만들어 두 층의 답을 나란히 잰다.
     */
    let axisClient = 50
    const documentAxisCase = (label, name, build) => {
      const ws = join(scratch, name)
      mkdirSync(join(ws, '.git'), { recursive: true })
      axisClient += 1
      const { documentId, storeDir } = build(ws, axisClient)
      const verdict = checkLinkStore({ storeDir: linkStoreAt(join(ws, 'link'), documentId, `ln-${name}`) })
      let refusal = null
      try {
        loadStore(storeDir)
      } catch (error) {
        refusal = error.code ?? '<threw>'
      }
      const rules = verdict.violations.map((v) => v.rule)
      const rule = 'annotation-store-document-unreadable'
      record(
        label,
        !verdict.pass && verdict.exitCode === 1 && rules.includes(rule) &&
          refusal !== null && GATE_RULE_OF[refusal] === rule,
        `editor ${refusal === null ? 'OPENED it' : `refused [${refusal}]`}; gate [` +
          `${rules.join(', ') || 'none'}], ${verdict.counts.brokenEndpoints} broken endpoint(s) ` +
          `(exit ${verdict.exitCode})`,
      )
    }
    // (5) 스토어만 내보내진다 — 옆에 문서 상태가 아예 없다 (백업·부분 체크아웃·gitignore).
    documentAxisCase(
      'a store exported without its document.json: both layers refuse (not exit 0)',
      'axis-absent',
      (ws, clientID) => {
        const documentId = honestStore(join(ws, 'main'), clientID, 'The disputed clause survives here.')
        mkdirSync(join(ws, 'exported'), { recursive: true })
        writeFileSync(join(ws, 'exported', 'annotations.json'),
          readFileSync(join(ws, 'main', 'annotations.json'), 'utf8'))
        rmSync(join(ws, 'main'), { recursive: true, force: true })
        return { documentId, storeDir: join(ws, 'exported') }
      },
    )
    // (6) 남의 문서 옆으로 옮겨졌는데 그 자리의 문서 상태에 **평문 정체성이 없다**.
    documentAxisCase(
      'a store moved next to a document.json with no plaintext documentId: both layers refuse',
      'axis-unidentified',
      (ws, clientID) => {
        const documentId = honestStore(join(ws, 'a'), clientID, 'The disputed clause survives here.')
        honestStore(join(ws, 'b'), clientID + 100, 'A different document with other words.')
        writeFileSync(join(ws, 'b', 'annotations.json'),
          readFileSync(join(ws, 'a', 'annotations.json'), 'utf8'))
        rmSync(join(ws, 'a'), { recursive: true, force: true })
        const state = JSON.parse(readFileSync(join(ws, 'b', 'document.json'), 'utf8'))
        delete state.documentId
        writeFileSync(join(ws, 'b', 'document.json'), stringify(state))
        return { documentId, storeDir: join(ws, 'b') }
      },
    )
    // (7) 그 자리의 문서 상태가 **읽히지 않는다** (병합 중 잘림).
    documentAxisCase(
      'a store moved next to a truncated document.json: both layers refuse',
      'axis-unparsable',
      (ws, clientID) => {
        const documentId = honestStore(join(ws, 'a'), clientID, 'The disputed clause survives here.')
        honestStore(join(ws, 'b'), clientID + 100, 'A different document with other words.')
        writeFileSync(join(ws, 'b', 'annotations.json'),
          readFileSync(join(ws, 'a', 'annotations.json'), 'utf8'))
        rmSync(join(ws, 'a'), { recursive: true, force: true })
        const state = readFileSync(join(ws, 'b', 'document.json'), 'utf8')
        writeFileSync(join(ws, 'b', 'document.json'), state.slice(0, Math.floor(state.length / 2)))
        return { documentId, storeDir: join(ws, 'b') }
      },
    )
  } finally {
    rmSync(scratch, { recursive: true, force: true })
  }
}

/* ---- C11 어휘는 파생이다 — 그래프 **사본**을 바꾸면 판정이 따라간다 ---- */

console.log('\n== C11 the link vocabulary is derived: mutate a COPY of the graph, the verdict follows ==')
{
  // 예전에는 검사기가 관계 이름 다섯을 상수로 들고 있었고, 그래프가 둘을 폐기하자 게이트가
  // 통째로 red가 됐다(vocabulary-provenance 2건 -> 대조군 37개 붕괴). 목록을 지운 것만으로는
  // "이제 따라간다"를 증명하지 못한다 — 그래서 여기서 **그래프를 실제로 바꿔** 두 방향을 잰다:
  //   (1) 어휘를 하나 더하면 같은 스토어가 red -> green (새 어휘를 코드 변경 없이 인정한다)
  //   (2) 어휘를 하나 지우면 같은 스토어가 green -> red (실재하지 않는 어휘는 여전히 위반)
  // 변형은 **격리 사본**에만 한다: 도구 층 위치(HO_TOOLS_DIR)와 catalog를 사본으로 갈아끼우면
  // ontology_lib의 ROOT가 사본을 가리켜 TBox·ABox·shapes가 전부 사본에서 온다. 원본
  // `ontology/`는 읽기만 하며, 그 사실을 실행 끝에 byte 비교로 못 박는다.
  const scratch = mkdtempSync(join(tmpdir(), 'plane-editor-derivation-'))
  const TBOX = join('ontology', 'tbox', 'harness.ttl')
  const KINDS = join('ontology', 'abox', 'core', 'vocab', 'concepts.ttl')
  const originals = [TBOX, KINDS].map((relative) => readFileSync(join(REPO_ROOT, relative), 'utf8'))
  try {
    cpSync(join(REPO_ROOT, 'ontology'), join(scratch, 'ontology'), { recursive: true })
    cpSync(join(REPO_ROOT, 'catalog-v001.xml'), join(scratch, 'catalog-v001.xml'))
    mkdirSync(join(scratch, 'tools'), { recursive: true })
    for (const entry of readdirSync(join(REPO_ROOT, 'tools'))) {
      if (entry.endsWith('.py')) {
        cpSync(join(REPO_ROOT, 'tools', entry), join(scratch, 'tools', entry))
      }
    }
    const copyEnv = {
      HO_TOOLS_DIR: join(scratch, 'tools'),
      HARNESS_CATALOG: join(scratch, 'catalog-v001.xml'),
    }
    /** 링크 하나짜리 probe 스토어 (종단점은 그래프의 Concept 하나 + 자기 결정 레코드). */
    const probeStore = (name, type) => {
      const dir = join(scratch, name)
      mkdirSync(dir, { recursive: true })
      writeFileSync(join(dir, LINKS_FILE), stringify({
        version: 1,
        plane: 'link',
        links: [{
          id: 'ln-probe-derivation',
          from: { plane: 'decision', ref: 'dec-probe-derivation' },
          to: { plane: 'graph', ref: 'id:c-traceability' },
          type,
          created_by: 'run-link-checks C11 (derivation probe)',
        }],
      }))
      writeFileSync(join(dir, DECISIONS_FILE), stringify({
        version: 1,
        plane: 'decision',
        decisions: [{
          id: 'dec-probe-derivation',
          title: 'Derivation probe',
          body: 'Probe record: the link plane vocabulary is read from the graph, not from a list.',
          status: 'open',
          decided_by: 'run-link-checks C11',
        }],
      }))
      return dir
    }
    /** 사본의 파일 한 곳만 바꾼 뒤 게이트를 돌리고 되돌린다 (변형 하나 = 측정 하나). */
    const withMutation = (relative, mutate, storeDir) => {
      const path = join(scratch, relative)
      const before = readFileSync(path, 'utf8')
      writeFileSync(path, mutate(before))
      try {
        return checkLinkStore({ storeDir, env: copyEnv })
      } finally {
        writeFileSync(path, before)
      }
    }

    const kindProbe = probeStore('probe-kind', 'id:kind-derivation-probe')
    const predicateProbe = probeStore('probe-predicate', 'tagged')
    const baselineKind = checkLinkStore({ storeDir: kindProbe, env: copyEnv })
    const baselinePredicate = checkLinkStore({ storeDir: predicateProbe, env: copyEnv })
    const kindRules = baselineKind.violations.map((v) => v.rule)
    record(
      'a link claiming a kind the graph does not declare is a violation (the teeth stay)',
      !baselineKind.pass && baselineKind.exitCode === 1 &&
        kindRules.length === 1 && kindRules[0] === 'link-type-unknown',
      `[${kindRules.join(', ') || 'none'}] with ${baselineKind.counts.graphLinkKinds} kind(s) ` +
        `declared in the copied graph (exit ${baselineKind.exitCode})`,
    )

    // (1) 어휘를 **더한다**: ho:LinkKind 개체 하나가 사본에 늘 뿐, 코드는 그대로다.
    const added = withMutation(KINDS, (text) => `${text}
id:kind-derivation-probe a ho:LinkKind ;
    skos:prefLabel "Derivation probe kind" ;
    skos:definition "Probe individual written into a COPY of the graph by run-link-checks C11 to measure that the link plane reads its relation vocabulary from the graph." ;
    ho:traversalWeight 0.5 .
`, kindProbe)
    record(
      'declaring one more ho:LinkKind in the copy admits the same store with no code change',
      added.pass && added.exitCode === 0 &&
        added.counts.graphLinkKinds === baselineKind.counts.graphLinkKinds + 1 &&
        added.vocabulary.graphKinds.includes('id:kind-derivation-probe'),
      `${baselineKind.counts.graphLinkKinds} -> ${added.counts.graphLinkKinds} kind(s); the same ` +
        `store now [${added.violations.map((v) => v.rule).join(', ') || 'no violation'}] ` +
        `(exit ${baselineKind.exitCode} -> ${added.exitCode})`,
    )

    // (2) 어휘를 **지운다**: 살아 있던 술어의 선언을 사본에서 강등하면 그 술어를 쓰는 링크가
    //     그 자리에서 위반이 된다 (= 어휘는 목록이 아니라 그래프의 현재 선언이다).
    const removed = withMutation(TBOX, (text) => {
      const needle = 'ho:tagged a owl:ObjectProperty ;'
      if (!text.includes(needle)) {
        throw new Error('C11: the copied TBox no longer declares ho:tagged as an owl:ObjectProperty ' +
          '— re-point this experiment at a predicate the graph actually declares')
      }
      return text.replace(needle, 'ho:tagged a owl:AnnotationProperty ;')
    }, predicateProbe)
    const removedRules = removed.violations.map((v) => v.rule)
    record(
      'retiring a predicate in the copy turns the same store red (green -> red, one rule)',
      baselinePredicate.pass && baselinePredicate.exitCode === 0 &&
        !removed.pass && removed.exitCode === 1 &&
        removedRules.length === 1 && removedRules[0] === 'link-type-unknown' &&
        removed.counts.graphLinkPredicates === baselinePredicate.counts.graphLinkPredicates - 1,
      `${baselinePredicate.counts.graphLinkPredicates} -> ${removed.counts.graphLinkPredicates} ` +
        `predicate(s); the same store [${baselinePredicate.violations.length ? '?' : 'no violation'}]` +
        ` -> [${removedRules.join(', ') || 'none'}] (exit ${baselinePredicate.exitCode} -> ${removed.exitCode})`,
    )

    // (3) 실험은 원본을 건드리지 않는다. 이 줄이 없으면 "사본에서만 했다"가 주장으로만 남는다.
    const untouched = [TBOX, KINDS].every(
      (relative, index) => readFileSync(join(REPO_ROOT, relative), 'utf8') === originals[index],
    )
    record(
      'the experiment never writes to the real ontology/ (byte-identical before and after)',
      untouched,
      untouched
        ? 'ontology/tbox/harness.ttl and ontology/abox/core/vocab/concepts.ttl unchanged'
        : 'the real ontology changed during the experiment',
    )
  } finally {
    rmSync(scratch, { recursive: true, force: true })
  }
}

/* ---- C12 종단점 바인딩 — 링크가 문서의 **어디**를 가리키는지 실제로 해소한다 ---- */

console.log('\n== C12 anchor endpoints bind to a place in the document (derived, never stored) ==')
{
  // (1) 두 층이 **같은 앵커 부분 집합**을 안다. 게이트가 인정하는데 바인더가 해소하지 못하는
  //     이름이 있으면 게이트는 열 수 없는 위치를 서명하는 것이고, 반대면 바인더가 게이트
  //     밖의 어휘를 지어낸 것이다. 한쪽만 늘리는 것을 여기서 막는다.
  const declaredParts = [...contract.endpointAnchors].sort()
  const resolvableParts = Object.keys(ANCHOR_PART_RESOLVERS).sort()
  record(
    'the gate and the binder admit exactly the same anchor parts',
    declaredParts.length > 0 && `${declaredParts}` === `${resolvableParts}`,
    `gate [${declaredParts.join(', ')}] · binder [${resolvableParts.join(', ')}]`,
  )

  // (2) ★ 실사용 link-store: 종단점이 **문서의 그 문장**으로 해소되는가. 기대 문자열은 여기
  //     적어 둔다 — 바인더가 레코드의 사본을 되돌려 주는 것이 아니라 문서에서 읽어 온다는
  //     것을 독립적으로 못 박기 위해서다(문서 텍스트와 레코드의 캡처값도 함께 대조한다).
  const EXPECTED_BINDINGS = [
    ['ln-honest-orphan-quote-tagged-design-for-loss', 'textQuote', 'honest orphan'],
    ['ln-selector-multiplexing-block-tagged-graceful-fallback', 'blockContext',
      'Selector multiplexing recovers anchors after destructive edits.'],
  ]
  const bound = bindLinkStore({ storeDir: DEFAULT_STORE_DIR })
  for (const [linkId, anchor, expectedText] of EXPECTED_BINDINGS) {
    const row = bound.bindings.find((entry) => entry.link === linkId) ?? null
    const ok = row !== null && row.state === 'bound' && row.anchor === anchor &&
      row.text === expectedText && row.captured === expectedText &&
      Number.isInteger(row.from) && Number.isInteger(row.to) && row.from < row.to
    record(
      `${linkId} binds to the ${anchor} it names`,
      ok,
      row === null
        ? 'the link has no binding at all'
        : `${row.document}/${row.record} @${row.anchor} -> [${row.from},${row.to}) ` +
          `${JSON.stringify(row.text)} (captured ${JSON.stringify(row.captured)}, ` +
          `method ${row.method})`,
    )
  }
  record(
    'the real link-store binds every endpoint that names a position, through one loadStore per store',
    bound.pass && bound.counts.anchorEndpoints === EXPECTED_BINDINGS.length &&
      bound.counts.bound === EXPECTED_BINDINGS.length && bound.counts.unbound === 0 &&
      bound.counts.loadStoreCalls === bound.counts.storesOpened &&
      bound.counts.loadStoreCalls === 1,
    `${bound.counts.bound} bound · ${bound.counts.orphaned} orphaned · ${bound.counts.unbound} ` +
      `unbound · ${bound.counts.loadStoreCalls} loadStore call(s) for ` +
      `${bound.counts.storesOpened} opened store(s)`,
  )

  const scratch = mkdtempSync(join(tmpdir(), 'plane-editor-binding-'))
  try {
    // (3) ★ 불변식 1 — 게이트 exit 0 은 **충분조건이 아니다**. 게이트가 초록으로 서명해도
    //     `loadStore` 가 거절하는 스토어에서는 바인딩이 0이고 사유가 판정 JSON에 남는다.
    const blind = join(scratch, 'gate-blind')
    mkdirSync(join(blind, '.git'), { recursive: true })
    const blindDocument = honestStore(join(blind, 'main'), 61, 'The disputed clause survives here.')
    const statePath = join(blind, 'main', 'document.json')
    const state = JSON.parse(readFileSync(statePath, 'utf8'))
    // 평문 정체성은 그대로 두고 **내용만** 망가뜨린다 = 게이트가 볼 수 없는 축.
    state.yUpdateBase64 = 'not-base64:@@@'
    writeFileSync(statePath, stringify(state))
    const blindLinks = linkStoreAt(join(blind, 'link'), blindDocument, 'ln-gate-blind', 'textQuote')
    const blindGate = checkLinkStore({ storeDir: blindLinks })
    const blindBinding = bindLinkStore({ storeDir: blindLinks })
    const blindStore = blindBinding.annotationStores.find((row) => row.documentId === blindDocument)
    record(
      'a store the gate signs green but loadStore refuses gets ZERO bindings and a recorded reason',
      blindGate.pass && blindGate.exitCode === 0 &&
        !blindBinding.pass && blindBinding.counts.bound === 0 &&
        blindBinding.counts.unbound === 1 && blindStore.opened === false &&
        blindStore.bindings === 0 &&
        blindBinding.unbound[0].reason === 'store-refused:document-state-unopenable',
      `gate ${blindGate.pass ? 'PASS' : 'FAIL'} (exit ${blindGate.exitCode}); binder ` +
        `${blindBinding.counts.bound} binding(s), unbound [` +
        `${blindBinding.unbound.map((row) => row.reason).join(', ') || 'none'}]`,
    )

    // (4) 앵커가 orphan 이면 **보고**된다: 위반이 아니고, 조용히 사라지지도 다시 겨눠지지도
    //     않는다. 두 층이 같은 자리에서 같은 말을 한다 (게이트 brokenEndpoints / 바인더 상태).
    const gone = join(scratch, 'orphaned')
    mkdirSync(join(gone, '.git'), { recursive: true })
    const goneDocument = honestStore(join(gone, 'main'), 62, 'The disputed clause survives here.',
      { destroy: true })
    const goneLinks = linkStoreAt(join(gone, 'link'), goneDocument, 'ln-orphaned-anchor', 'textQuote')
    const goneGate = checkLinkStore({ storeDir: goneLinks })
    const goneBinding = bindLinkStore({ storeDir: goneLinks })
    const goneRow = goneBinding.bindings[0] ?? null
    record(
      'an endpoint whose anchor is orphaned is reported by both layers, never re-pointed',
      goneGate.pass && goneGate.exitCode === 0 && goneGate.counts.brokenEndpoints === 1 &&
        goneGate.brokenEndpoints[0].anchor === 'textQuote' &&
        goneBinding.pass && goneBinding.counts.orphaned === 1 && goneBinding.counts.bound === 0 &&
        goneRow !== null && goneRow.state === 'orphaned' && goneRow.from === null &&
        Boolean(goneRow.reason),
      goneRow === null
        ? 'the binder produced no row for the orphaned endpoint'
        : `gate reports ${goneGate.counts.brokenEndpoints} broken endpoint(s) ` +
          `[@${goneGate.brokenEndpoints[0].anchor}]; binder says ${goneRow.state} ` +
          `(${goneRow.reason}) with no position, exit ${goneGate.exitCode}`,
    )

    // (5) ★ 위치는 **파생**이지 저장값이 아니다: 문서를 편집하면 같은 링크의 좌표가 따라
    //     움직이고 가리키는 텍스트는 그대로다. 링크가 selector 사본을 들었다면 이 검사는
    //     둘 중 하나로 깨진다 — 좌표가 안 움직이거나(옛 자리), 텍스트가 달라지거나.
    const edited = join(scratch, 'edited')
    mkdirSync(join(edited, '.git'), { recursive: true })
    const editedDocument = honestStore(join(edited, 'main'), 63, 'The disputed clause survives here.')
    const editedLinks = linkStoreAt(join(edited, 'link'), editedDocument, 'ln-edited', 'textQuote')
    const before = bindLinkStore({ storeDir: editedLinks }).bindings[0]
    {
      const store = loadStore(join(edited, 'main'))
      const session = openSession({ update: store.docUpdate, clientID: 64 })
      const inserted = 'Inserted before everything. '
      session.dispatch((tr) => tr.insertText(inserted, 1))
      const stored = store.annotations[0]
      saveStore(join(edited, 'main'), {
        fragment: 'prosemirror',
        documentId: store.documentId,
        docUpdate: session.encodeState(),
        docJSON: session.editor.getJSON(),
        annotations: [{ ...stored, anchorState: anchorStateOf(session, stored.anchors) }],
      })
      session.close()
      const after = bindLinkStore({ storeDir: editedLinks }).bindings[0]
      record(
        'editing the document moves the binding: the position is derived, the text still matches',
        before.state === 'bound' && after.state === 'bound' &&
          after.from === before.from + inserted.length && after.text === before.text,
        `[${before.from},${before.to}) -> [${after.from},${after.to}) after inserting ` +
          `${inserted.length} characters ahead of it; text ${JSON.stringify(after.text)} ` +
          `(was ${JSON.stringify(before.text)})`,
      )
    }

    // (6) 바인딩도 결정론이다 (좌표·텍스트를 저장하지 않으므로 매번 다시 계산한다).
    const first = JSON.stringify(bindLinkStore({ storeDir: DEFAULT_STORE_DIR }))
    const second = JSON.stringify(bindLinkStore({ storeDir: DEFAULT_STORE_DIR }))
    record(
      'two consecutive bindings of link-store agree',
      first === second,
      first === second ? 'identical binding JSON' : 'the binding differs between runs',
    )
  } finally {
    rmSync(scratch, { recursive: true, force: true })
  }
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
