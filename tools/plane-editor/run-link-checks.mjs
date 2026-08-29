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
 *   C10 발견의 **전제**를 실측한다: 격리 표식·파일 이름·**디렉토리 심링크**·**훑기에서 빼는
 *       이름**(`.git`·`node_modules`)으로 쌍둥이 스토어를 가릴 수 있는가(그리고 그 대가로 같은
 *       실체를 두 이름으로 보아 **가짜 중복**이 생기지는 않는가 · 무관한 스토어가 판정에 새어
 *       들지는 않는가), 작업공간 루트가 없으면 무엇이 달라지는가, 그리고 남의 문서 옆으로
 *       **옮겨진** 스토어에 대해 게이트와 **진짜 loadStore**가 같은 답을 내는가.
 *   C12 ★ 종단점 바인딩: 문서 **위치**를 가리키는 종단점이 실제로 그 위치의 텍스트로
 *       해소되는가(기대 문자열과 대조), 게이트가 초록을 줘도 `loadStore`가 거절하면 바인딩이
 *       **0 + 사유**인가, 앵커가 orphan이면 조용히 사라지지 않고 보고되는가, 게이트가
 *       인정하는 앵커 부분과 바인더가 해소할 수 있는 부분이 **같은 집합**인가, 평면이
 *       통째로 거절돼도 **종단점별 사유**가 남는가(전역 사유가 개별 진단을 덮지 않는다),
 *       그리고 그 사유가 **주장하는 범위**가 정확한가(게이트가 볼 수 있는 것까지만).
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
  symlinkSync,
  writeFileSync,
} from 'node:fs'
import { spawnSync } from 'node:child_process'
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
import { ANCHOR_PART_RESOLVERS, bindLinkStore, resolverFor } from './src/link-binding.mjs'

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

/**
 * 바인더 **단독** 판정의 negative control (C4b). 위 표가 커밋 게이트를 재는 자리라면, 이
 * 표는 `bind-links`의 산출만 읽는 소비자를 재는 자리다 — 네 모양 다 게이트는 exit 1로
 * 잡았는데 바인더는 초록을 냈었다(실측: vnv 8차 W1 · W3 · W4, 9차 X2·X3).
 *
 *   - 앵커 이름이 해소표가 **상속**하던 키 (`constructor`) -> 좌표 없는 "bound" 행
 *   - 같은 문서를 선언한 스토어가 둘 -> 발견 순서로 한쪽을 골라 **답이 이름 순서로 뒤집혔다**
 *   - 게이트의 **전역** 판정이 빨강 (`link-type-unknown`) -> 바인더는 PASS
 *   - 앵커 이름이 **falsy 값** (`""`) -> 종단점 집합에서 조용히 사라짐(`anchorEndpoints 0`)
 *
 * 기준은 C4와 같은 모양이다: 게이트 exit 1 + 위반 정확히 1건, 그리고 **바인더도** exit 1 +
 * 바인딩 0 + 사유 정확히 1건. 넷째 모양 때문에 기준을 하나 더 잰다 — **앵커 종단점으로 세어
 * 졌는가**(`anchorEndpoints 1 · recordEndpoints 0`): 사유 개수만 보면 "종단점이 아예 없어서
 * 사유도 없다"와 "사유 하나로 거절했다"를 가르지 못한다. fixture 디렉토리로 굳히지 못하는
 * 이유는 넷 다 실제 CRDT 문서 상태(또는 그 사본)를 요구하기 때문이다 — 그래서 임시 작업공간에
 * 실제 세션으로 짓는다.
 */
const SCRATCH_LINE = 'The disputed clause survives here.'
const BINDER_NEGATIVE_CONTROLS = [
  {
    name: 'an endpoint anchor spelled like a key the resolver table would INHERIT (`constructor`)',
    gateRule: 'link-endpoint-plane',
    reason: 'anchor-part-has-no-resolver:constructor',
    variants: ['single'],
    build: (ws, variant, clientID) => {
      const documentId = honestStore(join(ws, 'main'), clientID, SCRATCH_LINE)
      return linkStoreAt(join(ws, 'link'), documentId, 'ln-binder-inherited-anchor', 'constructor')
    },
  },
  {
    // 사본 이름이 원본(`main`)보다 앞서기도, 뒤서기도 한다. 발견 순서로 고르던 시절에는 이
    // 두 이름이 같은 링크에 **다른 문장**을 물렸다 — 이제 둘 다 거절이어야 한다.
    name: 'a second annotation store declaring the same document (backup copy, either name order)',
    gateRule: 'annotation-store-duplicate-document',
    reason: 'document-declared-by-2-annotation-stores',
    variants: ['aaa-copy', 'zzz-copy'],
    build: (ws, variant, clientID) => {
      const documentId = honestStore(join(ws, 'main'), clientID, SCRATCH_LINE)
      reboundCopy(join(ws, 'main'), join(ws, variant), clientID + 1, 'Closing block')
      return linkStoreAt(join(ws, 'link'), documentId, 'ln-binder-ambiguous-document', 'textQuote')
    },
  },
  {
    name: 'a link type outside the graph vocabulary (the gate refuses the whole link plane)',
    gateRule: 'link-type-unknown',
    reason: 'link-plane-refused-by-the-gate:link-type-unknown',
    variants: ['single'],
    build: (ws, variant, clientID) => {
      const documentId = honestStore(join(ws, 'main'), clientID, SCRATCH_LINE)
      return linkStoreAt(join(ws, 'link'), documentId, 'ln-binder-red-gate', 'textQuote',
        { type: 'inventedRelation' })
    },
  },
  {
    // 넷째 자리: 앵커 이름이 **falsy 값**이다. 바인더가 `if (!ep.anchor)`로 갈랐던 동안 이
    // 종단점은 앵커 종단점 집합에서 조용히 사라져(`anchorEndpoints 0 · unbound 0`) 게이트를
    // 무르게 한 반사실에서 `pass: true · exit 0`이 나왔다 — 단독 fail-closed의 유일한 예외였다
    // (실측: vnv 9차 X2·X3). 기대 사유의 접미사가 비어 있는 것은 **이름이 빈 문자열이기
    // 때문**이다(사유 형식은 `anchor-part-has-no-resolver:<파일에 적힌 이름 그대로>`이고,
    // 행 자체가 `anchor: ""`를 싣는다). 게이트는 처음부터 키의 존재로 판정했다("anchor" in ep).
    name: 'an endpoint whose anchor key carries a falsy value (the empty string)',
    gateRule: 'link-endpoint-plane',
    reason: 'anchor-part-has-no-resolver:',
    variants: ['single'],
    build: (ws, variant, clientID) => {
      const documentId = honestStore(join(ws, 'main'), clientID, SCRATCH_LINE)
      return linkStoreAt(join(ws, 'link'), documentId, 'ln-binder-falsy-anchor', '')
    },
  },
]
/** 코퍼스는 줄지 않는다 (게이트 30 + 바인더 4 = 34; 직전 바닥값은 33이었다). */
const NEGATIVE_CONTROL_FLOOR = 34

const ANNOTATION_STORES = join(FIXTURES, 'annotation-stores')
const SAMPLE_ANNOTATIONS = join(PLANE_EDITOR_DIR, 'sample-state', 'annotations.json')

const results = []

function record(name, ok, detail) {
  results.push({ name, ok, detail })
  console.log(`${ok ? '  ok  ' : '  FAIL'}  ${name} — ${detail}`)
}

/* ---- 실제 세션으로 스토어를 짓는 헬퍼 (C4b·C10·C12 공용) ----
 *
 * 여기 있는 것은 **fixture 디렉토리로 굳힐 수 없는** 모양을 위한 것이다: 문서 상태(CRDT)를
 * 실제로 만들어야 하거나(정직한 v3 스토어), 같은 문서를 선언한 스토어가 둘이어야 하는 경우.
 * 임시 작업공간은 검사가 끝나면 지우고, **경로를 출력에 찍지 않는다**(출력 결정론).
 */

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

/**
 * 같은 문서를 선언한 **사본** 스토어 — 백업·export·두 번째 체크아웃으로 일상에서 생긴다.
 * 사본의 레코드 `a1`은 같은 문서의 **다른 문장**에 다시 앵커된다: 두 스토어가 같은 답을
 * 냈다면 "고르지 않는다"는 성질이 공허해지므로, 고를 경우 답이 실제로 갈리게 만들어 둔다.
 */
const reboundCopy = (fromDir, toDir, clientID, quote) => {
  const store = loadStore(fromDir)
  const session = openSession({ update: store.docUpdate, clientID })
  const target = locate(session, { quote })
  const anchors = captureAnchors(session, target.from, target.to)
  saveStore(toDir, {
    fragment: 'prosemirror',
    documentId: store.documentId,
    docUpdate: store.docUpdate,
    docJSON: store.docJSON,
    annotations: store.annotations.map((item) => (item.id === 'a1'
      ? { ...item, anchors, body: 'rebound copy', anchorState: anchorStateOf(session, anchors) }
      : item)),
  })
  session.close()
  return toDir
}

/**
 * 링크 하나짜리 스토어. `anchor`를 주면 그 종단점이 문서 **위치**를 가리킨다.
 *
 * 키를 쓸지 말지는 `anchor !== null`로 정한다 — truthiness로 정하면 `''`·`0` 같은 falsy 값을
 * 실은 종단점을 **지을 수 없어** 그 자리를 대조군으로 잴 수 없다(두 층 다 키의 존재로 판정하는데
 * 대조군 생성기만 truthiness면 그 축이 영원히 비어 있다).
 */
const linkStoreAt = (dir, documentId, linkId, anchor = null, { type = 'tagged' } = {}) => {
  mkdirSync(dir, { recursive: true })
  writeFileSync(join(dir, LINKS_FILE), stringify({
    version: 1,
    plane: 'link',
    links: [{
      id: linkId,
      from: { plane: 'annotation', ref: 'a1', document: documentId, ...(anchor !== null ? { anchor } : {}) },
      to: { plane: 'graph', ref: 'id:c-traceability' },
      type,
      created_by: 'run-link-checks scratch workspace',
    }],
  }))
  writeFileSync(join(dir, DECISIONS_FILE), stringify({ version: 1, plane: 'decision', decisions: [] }))
  return dir
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

/* ---- C4b 바인더 negative control — `bind-links` **단독**으로도 빨간 자리 ---- */

console.log('\n== C4b binder negative controls (the binder ALONE must be red here) ==')
{
  const scratch = mkdtempSync(join(tmpdir(), 'plane-editor-binder-negative-'))
  let clientID = 70
  try {
    let index = 0
    for (const control of BINDER_NEGATIVE_CONTROLS) {
      index += 1
      const seen = []
      for (const variant of control.variants) {
        const ws = join(scratch, `c${index}-${variant}`)
        mkdirSync(join(ws, '.git'), { recursive: true })
        clientID += 2
        const linkDir = control.build(ws, variant, clientID)
        const verdict = checkLinkStore({ storeDir: linkDir })
        const bound = bindLinkStore({ storeDir: linkDir })
        const rules = verdict.violations.map((v) => v.rule)
        const reasons = bound.unbound.map((row) => row.reason)
        seen.push({
          variant,
          // 게이트 쪽 기준은 C4와 같다: exit 1 + 위반 **정확히 1건**.
          gateOk: !verdict.pass && verdict.exitCode === 1 && rules.length === 1 &&
            rules[0] === control.gateRule,
          // 바인더 쪽 기준: 바인딩 0 · 사유 **정확히 1건** · 그 사유가 기대한 것 (pass=false).
          // 그리고 그 종단점이 **앵커 종단점으로 세어졌는가** — falsy 앵커가 record 종단점으로
          // 조용히 강등되던 자리를 매 실행 잰다(넷째 대조군이 없으면 이 값은 늘 참이었다).
          binderOk: !bound.pass && bound.counts.bound === 0 && bound.counts.orphaned === 0 &&
            reasons.length === 1 && reasons[0] === control.reason &&
            bound.counts.anchorEndpoints === 1 && bound.counts.recordEndpoints === 0,
          rules: [...new Set(rules)].sort(),
          reasons: [...new Set(reasons)].sort(),
          bound: bound.counts.bound,
          endpoints: `${bound.counts.anchorEndpoints} anchor / ${bound.counts.recordEndpoints} record`,
        })
      }
      const ok = seen.every((row) => row.gateOk && row.binderOk)
      const orders = control.variants.length > 1
        ? ` · both discovery orders (${control.variants.join(', ')}) give the same answer`
        : ''
      record(
        `${control.name} → binder refuses: ${control.reason}`,
        ok,
        ok
          ? `gate exit 1 with exactly [${control.gateRule}]; binder exit 1 with 0 binding(s), ` +
            `1 anchor endpoint counted and exactly one reason${orders}`
          : seen.map((row) => `[${row.variant}] gate [${row.rules.join(', ') || 'none'}] · binder ` +
              `${row.bound} binding(s), ${row.endpoints}, reasons ` +
              `[${row.reasons.join(', ') || 'none'}]`).join(' ; '),
      )
    }
  } finally {
    rmSync(scratch, { recursive: true, force: true })
  }
  // 코퍼스가 줄지 않는지 매 실행 센다 (선언이 아니라 값).
  const corpus = NEGATIVE_CONTROLS.length + BINDER_NEGATIVE_CONTROLS.length
  record(
    'the negative-control corpus is counted every run, and it does not shrink',
    corpus >= NEGATIVE_CONTROL_FLOOR && BINDER_NEGATIVE_CONTROLS.length >= 4,
    `${NEGATIVE_CONTROLS.length} gate control(s) + ${BINDER_NEGATIVE_CONTROLS.length} binder ` +
      `control(s) = ${corpus} (floor ${NEGATIVE_CONTROL_FLOOR})`,
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

/* ---- C10 발견의 전제 (격리 표식 · 파일 이름 · 심링크 · 빼는 이름 · 작업공간 루트) ---- */

console.log('\n== C10 the premises of discovery, measured (quarantine marker, file name, ' +
  'symlink, skipped directory name, workspace root) ==')
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

    /* ---- (8)-(9) 심링크 축 — 발견은 이름 공간을 따라간다, 실체는 하나로 센다 ----
     *
     * 위 (1)·(2)는 격리 표식·파일 이름으로 스토어를 숨길 수 없음을 보인다. **심링크는?**
     * 정직한 스토어를 작업공간 밖에 두고 이름만 링크로 들여오면, 발견이 심링크를 따라가지
     * 않던 동안에는 사본 하나만 범위에 남아 **사본의 답**이 초록으로 나갔다(실측: vnv 9차 Y6).
     * 두 방향을 함께 잰다 — 숨을 수 없다(8)와, 그 대가로 **가짜 중복**이 생기지 않는다(9).
     */
    const hidden = join(scratch, 'symlink-ws')
    mkdirSync(join(hidden, '.git'), { recursive: true })
    const outsideStore = join(scratch, 'symlink-outside', 'honest')
    const hiddenDocument = honestStore(outsideStore, 45, 'The disputed clause survives here.')
    // 사본은 작업공간 **안의 실디렉토리**이고, 같은 문서를 선언하되 상태가 다르다(사본을 고른
    // 답과 정직한 답이 실제로 갈리게 해 둔다 — 갈리지 않으면 이 검사가 공허해진다).
    cpSync(outsideStore, join(hidden, 'zzz-copy'), { recursive: true })
    {
      const copy = JSON.parse(readFileSync(join(hidden, 'zzz-copy', 'annotations.json'), 'utf8'))
      copy.annotations[0].anchorState = 'orphaned'
      writeFileSync(join(hidden, 'zzz-copy', 'annotations.json'), stringify(copy))
    }
    symlinkSync(outsideStore, join(hidden, 'main'))  // 정직한 쪽은 심링크로만 보인다
    const hiddenLinks = linkStoreAt(join(hidden, 'link'), hiddenDocument, 'ln-symlink-hidden', 'textQuote')
    const hiddenVerdict = checkLinkStore({ storeDir: hiddenLinks })
    const hiddenBinding = bindLinkStore({ storeDir: hiddenLinks })
    record(
      'a store that is only visible through a directory symlink is still discovered (and judged)',
      !hiddenVerdict.pass && hiddenVerdict.exitCode === 1 &&
        hiddenVerdict.annotationStores.length === 2 &&
        hiddenVerdict.violations.some((v) => v.rule === 'annotation-store-duplicate-document') &&
        !hiddenBinding.pass && hiddenBinding.counts.bound === 0 &&
        hiddenBinding.unbound.length === 1 &&
        hiddenBinding.unbound[0].reason === 'document-declared-by-2-annotation-stores',
      `${hiddenVerdict.annotationStores.length} store(s) judged, ` +
        `[${hiddenVerdict.violations.map((v) => v.rule).join(', ') || 'none'}] (exit ` +
        `${hiddenVerdict.exitCode}); binder ${hiddenBinding.counts.bound} binding(s), ` +
        `[${hiddenBinding.unbound.map((row) => row.reason).join(', ') || 'none'}]`,
    )

    // (9) 반대 방향의 대가: 같은 실체를 **두 이름**(심링크와 그 대상)으로 보아도 스토어는
    //     하나다. 경로가 realpath로 정규화되지 않으면 심링크를 따라가는 순간 정직한 트리가
    //     전부 `annotation-store-duplicate-document`가 된다 — 이전 wave가 인자 중복에서 세운
    //     지점(vnv P1b 위양성)이 여기서도 유지되는지를 값으로 잰다. 심링크 이름을 원본보다
    //     **앞서게**(`aaa-mirror`) 두어 훑는 순서도 흔든다.
    const mirror = join(scratch, 'symlink-mirror')
    mkdirSync(join(mirror, '.git'), { recursive: true })
    const mirrorDocument = honestStore(join(mirror, 'main'), 46, 'The disputed clause survives here.')
    symlinkSync(join(mirror, 'main'), join(mirror, 'aaa-mirror'))
    const mirrorLinks = linkStoreAt(join(mirror, 'link'), mirrorDocument, 'ln-symlink-mirror', 'textQuote')
    const mirrorVerdict = checkLinkStore({
      storeDir: mirrorLinks,
      // 같은 파일을 두 경로로 **명시** 지목하기까지 한다 (인자 축의 정규화도 함께 잰다).
      annotations: [join(mirror, 'aaa-mirror', 'annotations.json'), join(mirror, 'main', 'annotations.json')],
    })
    const mirrorBinding = bindLinkStore({ storeDir: mirrorLinks })
    record(
      'the same store under two names (a symlink and its target) is ONE store, not a duplicate',
      mirrorVerdict.pass && mirrorVerdict.exitCode === 0 &&
        mirrorVerdict.annotationStores.length === 1 &&
        mirrorBinding.pass && mirrorBinding.counts.bound === 1 &&
        mirrorBinding.counts.ambiguousDocuments === 0 &&
        mirrorBinding.counts.annotationStores === 1,
      `${mirrorVerdict.annotationStores.length} store(s) judged, ` +
        `[${mirrorVerdict.violations.map((v) => v.rule).join(', ') || 'none'}] (exit ` +
        `${mirrorVerdict.exitCode}); binder ${mirrorBinding.counts.bound} binding(s) with ` +
        `${mirrorBinding.counts.ambiguousDocuments} ambiguous document(s)`,
    )

    /* ---- (10)-(12) 훑기에서 **이름으로** 빼는 트리 (`SCAN_SKIP_DIRS`) ----
     *
     * `.git`·`node_modules`는 판정 대상이 아니다 — 훑는 비용이 나머지 트리를 다 합친 것보다
     * 크기 때문이다(실측: 이 저장소에서 디렉토리 146 -> 1116 · 파일 697 -> 8992 · 게이트 왕복
     * 0.35s -> 0.39s). 그런데 그 이름이 **아무 흔적 없이** 스토어를 가리는 동안에는, 정직한
     * 스토어를 `<ws>/node_modules/` 에 두거나 그 이름의 심링크를 밖의 정직한 트리에 거는 것
     * 만으로 옆에 둔 **사본의 답**이 초록으로 나갔다(실측: vnv 10차 Z2e·Z2e'). 격리 표식은
     * `quarantined[].excluded`로 흔적을 남기는데 이 축만 남기지 않던 자리다.
     *
     * 지금 규율은 격리와 **같다**: 판정에서는 빼되 후보로는 모으고, 범위 안 문서를 선언하면
     * 끌려오며, 무엇이 얼마나 빠졌는지가 판정 JSON(`annotationScope.skipped`)에 실린다.
     * 세 방향을 함께 잰다 — 숨을 수 없다(10·11) + 무관한 것은 판정하지 않되 **흔적은 남는다**(12).
     */
    const skipped = join(scratch, 'skip-name-ws')
    mkdirSync(join(skipped, '.git'), { recursive: true })
    const skippedDocument = honestStore(join(skipped, 'node_modules', 'honest'), 47, SCRATCH_LINE)
    // 사본은 작업공간의 평범한 자리에 있고 같은 문서를 **다른 문장**에 다시 앵커했다
    // (고르면 답이 실제로 갈린다 — 갈리지 않으면 이 검사가 공허하다).
    reboundCopy(join(skipped, 'node_modules', 'honest'), join(skipped, 'zzz-copy'), 48, 'Closing block')
    const skippedLinks = linkStoreAt(join(skipped, 'link'), skippedDocument, 'ln-skip-name', 'textQuote')
    const skippedVerdict = checkLinkStore({ storeDir: skippedLinks })
    const skippedBinding = bindLinkStore({ storeDir: skippedLinks })
    record(
      'a store under a skipped directory name (node_modules) cannot hide a document under judgment',
      !skippedVerdict.pass && skippedVerdict.exitCode === 1 &&
        skippedVerdict.annotationStores.length === 2 &&
        skippedVerdict.violations.some((v) => v.rule === 'annotation-store-duplicate-document') &&
        !skippedBinding.pass && skippedBinding.counts.bound === 0 &&
        skippedBinding.unbound.length === 1 &&
        skippedBinding.unbound[0].reason === 'document-declared-by-2-annotation-stores',
      `${skippedVerdict.annotationStores.length} store(s) judged, ` +
        `[${skippedVerdict.violations.map((v) => v.rule).join(', ') || 'none'}] (exit ` +
        `${skippedVerdict.exitCode}); binder ${skippedBinding.counts.bound} binding(s), ` +
        `[${skippedBinding.unbound.map((row) => row.reason).join(', ') || 'none'}]`,
    )

    // (11) 같은 배치를 **심링크로**: 그 이름이 작업공간 밖의 정직한 트리를 가리킨다. 이름
    //      가지치기는 심링크를 따라가는 `_walk`보다 **먼저** 일어나므로, 닫은 축(심링크)이
    //      이름 한 줄로 다시 열리는지를 따로 잰다(vnv Z2e').
    const skipLink = join(scratch, 'skip-symlink-ws')
    mkdirSync(join(skipLink, '.git'), { recursive: true })
    const skipOutside = join(scratch, 'skip-symlink-outside')
    const skipLinkDocument = honestStore(join(skipOutside, 'honest'), 49, SCRATCH_LINE)
    symlinkSync(skipOutside, join(skipLink, 'node_modules'))
    reboundCopy(join(skipOutside, 'honest'), join(skipLink, 'zzz-copy'), 50, 'Closing block')
    const skipLinkLinks = linkStoreAt(join(skipLink, 'link'), skipLinkDocument, 'ln-skip-symlink', 'textQuote')
    const skipLinkVerdict = checkLinkStore({ storeDir: skipLinkLinks })
    const skipLinkBinding = bindLinkStore({ storeDir: skipLinkLinks })
    record(
      'a symlink NAMED node_modules does not reopen the axis the symlink walk closed',
      !skipLinkVerdict.pass && skipLinkVerdict.exitCode === 1 &&
        skipLinkVerdict.annotationStores.length === 2 &&
        skipLinkVerdict.violations.some((v) => v.rule === 'annotation-store-duplicate-document') &&
        !skipLinkBinding.pass && skipLinkBinding.counts.bound === 0,
      `${skipLinkVerdict.annotationStores.length} store(s) judged, ` +
        `[${skipLinkVerdict.violations.map((v) => v.rule).join(', ') || 'none'}] (exit ` +
        `${skipLinkVerdict.exitCode}); binder ${skipLinkBinding.counts.bound} binding(s)`,
    )

    // (12) 반대 방향의 대가: **무관한 문서**의 스토어가 그 트리 아래 있으면 판정하지 않는다
    //      (의존성 트리가 남의 결함을 내 판정으로 흘려보내면 위양성이다). 그러나 조용히
    //      빠지지는 않는다 — `annotationScope.skipped`가 트리와 **제외된 스토어 수**를 싣는다.
    const unrelated = join(scratch, 'skip-unrelated-ws')
    mkdirSync(join(unrelated, '.git'), { recursive: true })
    const unrelatedDocument = honestStore(join(unrelated, 'main'), 51, SCRATCH_LINE)
    honestStore(join(unrelated, 'node_modules', 'vendor'), 52, 'A different document with other words.')
    const unrelatedLinks = linkStoreAt(join(unrelated, 'link'), unrelatedDocument, 'ln-skip-unrelated', 'textQuote')
    const unrelatedVerdict = checkLinkStore({ storeDir: unrelatedLinks })
    const unrelatedBinding = bindLinkStore({ storeDir: unrelatedLinks })
    const skipRows = unrelatedVerdict.annotationScope.skipped ?? []
    const vendorRow = skipRows.find((row) => row.path.endsWith('node_modules')) ?? null
    record(
      'an unrelated store under that name is NOT judged, but the exclusion is recorded (no silent skip)',
      unrelatedVerdict.pass && unrelatedVerdict.exitCode === 0 &&
        unrelatedVerdict.annotationStores.length === 1 &&
        vendorRow !== null && vendorRow.excluded === 1 && Boolean(vendorRow.reason) &&
        unrelatedBinding.pass && unrelatedBinding.counts.bound === 1,
      `${unrelatedVerdict.annotationStores.length} store(s) judged (exit ` +
        `${unrelatedVerdict.exitCode}); skipped [` +
        `${skipRows.map((row) => `${basename(row.path)} keeps out ${row.excluded}`).join(', ') ||
          'nothing recorded'}]; binder ${unrelatedBinding.counts.bound} binding(s)`,
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

  // (1b) 그 대조는 **선언된** 이름만 본다(`Object.keys`는 상속 키를 보지 않는다). 표가
  //      `Object.prototype`을 상속하던 동안에는 선언되지 않은 이름 12개가 조회에서 인정됐다
  //      (vnv W1·W2). 그래서 목록이 아니라 **표의 모양**을 잰다.
  const inheritedNames = [...Object.getOwnPropertyNames(Object.prototype)].sort()
  const admittedInherited = inheritedNames.filter((name) => resolverFor(name) !== null)
  record(
    'the resolver table owns its names: nothing it would merely inherit is admitted',
    Object.getPrototypeOf(ANCHOR_PART_RESOLVERS) === null && admittedInherited.length === 0,
    `prototype ${Object.getPrototypeOf(ANCHOR_PART_RESOLVERS) === null ? 'null' : 'INHERITED'} · ` +
      `${inheritedNames.length} Object.prototype key(s) tried, ${admittedInherited.length} admitted`,
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

    // (6) ★ 계열을 사례가 아니라 **성질**로 닫는다: `Object.prototype`의 이름을 **전부** 앵커
    //     이름으로 실은 링크 스토어를 실제로 바인딩해 본다. 예전 표에서는 `constructor`가
    //     좌표 없는 "bound" 행을 만들고 `toString`은 `x resolver is not a function`으로
    //     죽었다(vnv W1·W2). 지금은 하나도 남김없이 사유 있는 unbound 여야 하고 크래시는 0이다.
    const inherited = join(scratch, 'inherited-anchor-names')
    mkdirSync(join(inherited, '.git'), { recursive: true })
    const inheritedDocument = honestStore(join(inherited, 'main'), 65, SCRATCH_LINE)
    const inheritedLinks = join(inherited, 'link')
    mkdirSync(inheritedLinks, { recursive: true })
    writeFileSync(join(inheritedLinks, LINKS_FILE), stringify({
      version: 1,
      plane: 'link',
      links: inheritedNames.map((name, position) => ({
        id: `ln-inherited-${String(position).padStart(2, '0')}`,
        from: { plane: 'annotation', ref: 'a1', document: inheritedDocument, anchor: name },
        to: { plane: 'graph', ref: 'id:c-traceability' },
        type: 'tagged',
        created_by: 'run-link-checks scratch workspace',
      })),
    }))
    writeFileSync(join(inheritedLinks, DECISIONS_FILE),
      stringify({ version: 1, plane: 'decision', decisions: [] }))
    let crash = null
    let inheritedBinding = null
    try {
      inheritedBinding = bindLinkStore({ storeDir: inheritedLinks })
    } catch (error) {
      crash = error.message
    }
    record(
      'every Object.prototype key used as an anchor name is refused with a reason, never bound',
      crash === null && inheritedBinding !== null && !inheritedBinding.pass &&
        inheritedBinding.counts.bound === 0 && inheritedBinding.counts.orphaned === 0 &&
        inheritedBinding.counts.unbound === inheritedNames.length &&
        inheritedBinding.unbound.every((row) =>
          row.reason.startsWith('anchor-part-has-no-resolver:')),
      crash !== null
        ? `the binder threw instead of refusing: ${crash}`
        : `${inheritedNames.length} name(s) tried · ${inheritedBinding.counts.bound} bound · ` +
          `${inheritedBinding.counts.unbound} unbound, all anchor-part-has-no-resolver · no crash`,
    )

    /* ---- (8) 전역 거절이 **개별 사유를 덮지 않는다** (진단력) ----
     *
     * 링크 하나가 나빠 게이트가 링크 평면을 통째로 거절하면, 예전에는 나머지 종단점의 사유가
     * 전부 그 평면 사유 하나로 통일됐다(실측: vnv 9차 Y2 — 좋은 링크 2개가 `link-plane-
     * refused-by-the-gate:…`로 덮였다). 스토어가 커질수록 "어디가 문제인지"를 바인더로 좁힐
     * 수 없게 되는 자리다. 지금은 사유가 두 층이고, 우선순위(좁은 것 -> 넓은 것)는 그대로다:
     * 세 종단점이 **세 가지 다른** 답을 내야 한다.
     *
     *   ln-a-clean          : 게이트가 볼 수 있는 잘못 없음 -> reasons.endpoint = null (아래 (9))
     *   ln-b-inherited-name : 좁은 가드가 먼저 답한다 -> anchor-part-has-no-resolver:constructor
     *   ln-c-bad-type       : 이 링크가 원인 -> endpoint-refused-by-the-gate:link-type-unknown
     *
     * 판정 자체는 fail-closed 그대로여야 한다: 바인딩 0 · unbound 3 · pass false.
     */
    const mixed = join(scratch, 'plane-refused-mixed')
    mkdirSync(join(mixed, '.git'), { recursive: true })
    const mixedDocument = honestStore(join(mixed, 'main'), 66, SCRATCH_LINE)
    const mixedLinks = join(mixed, 'link')
    mkdirSync(mixedLinks, { recursive: true })
    const mixedEndpoint = (anchor) => ({
      plane: 'annotation', ref: 'a1', document: mixedDocument, anchor,
    })
    writeFileSync(join(mixedLinks, LINKS_FILE), stringify({
      version: 1,
      plane: 'link',
      links: [
        // id 오름차순 (store-format). 셋 다 같은 레코드의 같은 문서를 가리킨다.
        { id: 'ln-a-clean', from: mixedEndpoint('textQuote'), to: { plane: 'graph', ref: 'id:c-traceability' }, type: 'tagged', created_by: 'run-link-checks scratch workspace' },
        { id: 'ln-b-inherited-name', from: mixedEndpoint('constructor'), to: { plane: 'graph', ref: 'id:c-traceability' }, type: 'tagged', created_by: 'run-link-checks scratch workspace' },
        { id: 'ln-c-bad-type', from: mixedEndpoint('textQuote'), to: { plane: 'graph', ref: 'id:c-traceability' }, type: 'inventedRelation', created_by: 'run-link-checks scratch workspace' },
      ],
    }))
    writeFileSync(join(mixedLinks, DECISIONS_FILE),
      stringify({ version: 1, plane: 'decision', decisions: [] }))
    const mixedBinding = bindLinkStore({ storeDir: mixedLinks })
    const reasonOf = (id) => mixedBinding.unbound.find((row) => row.link === id) ?? null
    const [clean, inheritedName, badType] = ['ln-a-clean', 'ln-b-inherited-name', 'ln-c-bad-type']
      .map(reasonOf)
    const layered = clean !== null && inheritedName !== null && badType !== null &&
      // 판정은 그대로 빨강이고 아무것도 열지 않는다.
      !mixedBinding.pass && mixedBinding.counts.bound === 0 && mixedBinding.counts.unbound === 3 &&
      mixedBinding.counts.storesOpened === 0 &&
      // 우선순위: 좁은 가드가 전역 사유에 가려지지 않는다.
      inheritedName.reason === 'anchor-part-has-no-resolver:constructor' &&
      // 나머지 둘의 판정 사유는 평면 사유 하나로 같다 (기존 배치 그대로)...
      clean.reason === badType.reason && clean.reason.startsWith('link-plane-refused-by-the-gate:') &&
      // ...그런데 종단점 층에서는 셋이 갈린다.
      clean.reasons.endpoint === null && clean.gateViolations.length === 0 &&
      badType.reasons.endpoint === 'endpoint-refused-by-the-gate:link-type-unknown' &&
      inheritedName.reasons.endpoint === inheritedName.reason &&
      new Set([clean, inheritedName, badType].map((row) => `${row.reasons.endpoint}`)).size === 3
    record(
      'a plane-wide refusal keeps each endpoint\'s own reason (three endpoints, three answers)',
      layered,
      [clean, inheritedName, badType].map((row, index) => (row === null
        ? `[${['ln-a-clean', 'ln-b-inherited-name', 'ln-c-bad-type'][index]}] no row at all`
        : `${row.link}: ${row.reason} / endpoint ${row.reasons.endpoint}`)).join(' · ') +
        ` (${mixedBinding.counts.bound} bound, ${mixedBinding.counts.storesOpened} store(s) opened)`,
    )

    /* ---- (9) `reasons.endpoint: null` 이 **주장하는 범위** ----
     *
     * 위 (8)에서 `ln-a-clean`은 `reasons.endpoint: null`을 받았고, 사람이 읽는 채널은 그것을
     * 한때 "자기 잘못 없음"이라 찍었다. 그 문장은 **과잉 안심**이다: 게이트가 원리적으로 못
     * 보는 축(편집기만 아는 `loadStore` 거절 — 선언된 전제 두 줄)에서는 자기 잘못이 있는
     * 종단점도 같은 문장을 받는다(실측: vnv 10차 Z3d). 여기서 그 모양을 실제로 만들어
     * **대조군과 나란히** 잰다 — 판정은 어느 쪽이든 fail-closed이므로 이것은 문구가 곧 의미인
     * 자리이고, 문구는 선언이 아니라 이 검사로 매 실행 측정된다.
     */
    const editorOnly = join(scratch, 'editor-only-fault')
    mkdirSync(join(editorOnly, '.git'), { recursive: true })
    const editorOnlyDocument = honestStore(join(editorOnly, 'main'), 67, SCRATCH_LINE)
    {
      // 평문 정체성은 그대로 두고 **내용만** 망가뜨린다 = 게이트가 볼 수 없는 축.
      const statePath = join(editorOnly, 'main', 'document.json')
      const state = JSON.parse(readFileSync(statePath, 'utf8'))
      state.yUpdateBase64 = 'not*valid*base64!!'
      writeFileSync(statePath, stringify(state))
    }
    // 대조군: 평면이 깨끗하면 같은 종단점의 사유는 **자기 스토어**의 거절이다 = 잘못이 있다.
    const aloneLinks = linkStoreAt(join(editorOnly, 'link-alone'), editorOnlyDocument,
      'ln-a-unopenable', 'textQuote')
    const aloneRow = bindLinkStore({ storeDir: aloneLinks }).unbound[0] ?? null
    // 시험군: 나쁜 타입 링크 하나가 평면을 통째로 빨갛게 만든다 (스토어는 열리지 않는다).
    const maskedLinks = join(editorOnly, 'link-masked')
    mkdirSync(maskedLinks, { recursive: true })
    const maskedEndpoint = { plane: 'annotation', ref: 'a1', document: editorOnlyDocument, anchor: 'textQuote' }
    writeFileSync(join(maskedLinks, LINKS_FILE), stringify({
      version: 1,
      plane: 'link',
      links: [
        { id: 'ln-a-unopenable', from: maskedEndpoint, to: { plane: 'graph', ref: 'id:c-traceability' }, type: 'tagged', created_by: 'run-link-checks scratch workspace' },
        { id: 'ln-z-bad-type', from: maskedEndpoint, to: { plane: 'graph', ref: 'id:c-traceability' }, type: 'inventedRelation', created_by: 'run-link-checks scratch workspace' },
      ],
    }))
    writeFileSync(join(maskedLinks, DECISIONS_FILE),
      stringify({ version: 1, plane: 'decision', decisions: [] }))
    const maskedBinding = bindLinkStore({ storeDir: maskedLinks })
    const maskedRow = maskedBinding.unbound.find((row) => row.link === 'ln-a-unopenable') ?? null
    // 사람이 읽는 채널을 **실제 명령**으로 잰다 (JSON 만 고치고 text 를 빠뜨리는 자리).
    const printed = spawnSync(process.execPath,
      [join(PLANE_EDITOR_DIR, 'bind-links.mjs'), '--store', maskedLinks], { encoding: 'utf8' })
    const claim = (printed.stdout || '').split('\n')
      .find((line) => line.includes('this endpoint itself:')) ?? ''
    record(
      'the null endpoint reason claims only what the gate can see (the editor axis stays unclaimed)',
      aloneRow !== null && aloneRow.reason === 'store-refused:document-state-unopenable' &&
        maskedRow !== null && maskedRow.reasons.endpoint === null &&
        maskedRow.reason.startsWith('link-plane-refused-by-the-gate:') &&
        maskedBinding.counts.storesOpened === 0 && maskedBinding.counts.bound === 0 &&
        claim.includes('no violation the gate can see') &&
        !claim.includes('no violation of its own'),
      `alone: ${aloneRow === null ? 'no row' : aloneRow.reason} · under a plane-wide refusal: ` +
        `${maskedRow === null ? 'no row' : `${maskedRow.reason} / endpoint ${maskedRow.reasons.endpoint}`}` +
        ` (${maskedBinding.counts.storesOpened} store(s) opened); the text says ` +
        `${JSON.stringify(claim.replace('        this endpoint itself: ', '').trim())}`,
    )

    // (7) 바인딩도 결정론이다 (좌표·텍스트를 저장하지 않으므로 매번 다시 계산한다).
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
