/**
 * The link plane — typed edges between planes, stored OUTSIDE the knowledge graph.
 *
 * [지킴] 평면끼리는 서로를 인용하지 않는다 (tool_suggestion v0.2 §4.2 I1,
 *   id:pat-knowledge-plane-separation). 결합은 오직 이 평면의 typed link으로만 일어나고,
 *   링크 타입은 **그래프에 이미 있는 관계 어휘를 재사용**한다 — 신조어는 drift다. 그 어휘
 *   목록은 어디에도 박아 두지 않고 그래프에서 파생한다(`check_links.py` docstring 3):
 *   술어형 `tagged`(살아 있는 `ho:` ObjectProperty) 또는 종류형 `id:kind-overlap`
 *   (`ho:LinkKind` 개체 — 재설계 이후의 확장 지점).
 *
 * 이 모듈이 하는 일은 레코드를 만들고 **결정론적으로 직렬화**하는 것까지다. 판정(종단점
 * 실재·어휘·경계·고아)은 재구현하지 않고 `check_links.py`에 위임한다: 규칙이 두 언어에
 * 복제되면 그 순간부터 둘이 갈라지기 때문이다. 어휘·cap 같은 값도 같은 이유로 상수로 박지
 * 않고 도구 층의 **계약 표면**에서 읽어온다(브리프 §5 — Phase 4 예고 조항).
 *
 *   link record  : { id, from, to, type, evidence?, created_by }
 *   endpoint     : { plane, ref }   plane ∈ annotation | decision | graph
 *                  graph의 ref는 IRI 표기 `id:<slug>` (Phase 0 §4.2 P2)
 *                  annotation의 ref는 **(document, ref) 쌍**이다 — 레코드 id는 문서 안에서만
 *                  유일하므로(`a1`은 문서마다 있다) 문서를 빼면 종단점이 남의 문서를 가리킨다.
 *
 * **주석 종단점은 문서 안의 위치까지 가리킬 수 있다** (`{plane, ref, document, anchor}`):
 * `anchor`가 있으면 그 종단점은 레코드가 아니라 **그 레코드가 문서에서 차지하는 자리**를
 * 뜻한다 — "이 설계결정은 이 문서의 **이 문장**과 관련 있다". 값은 레코드가 **이미 가진**
 * 앵커 부분의 이름(`textQuote` = 인용 범위 · `blockContext` = 그 범위가 든 블록)이고,
 * 목록은 계약 표면(`endpointAnchors`)에서 온다 — 여기에 복제해 두지 않는다.
 *
 * 링크는 selector를 **복사하지 않는다**. 복사하면 문서가 편집될 때 링크 쪽 사본만 낡아 두
 * 벌이 갈리고, 그 순간 링크는 아무도 편집하지 않은 옛 위치를 가리키게 된다. 그래서 위치는
 * 언제나 레코드의 앵커에서 **파생**되며, 실제 좌표·텍스트는 저장하지 않고 필요할 때
 * `src/link-binding.mjs`가 `loadStore` + 기존 해소 엔진으로 계산한다.
 *
 * 방향은 **평면 → 그래프** 한 방향뿐이다(브리프 §3c). 그래프에서 평면을 되짚는 역방향
 * 인덱스는 만들지 않으며, 그런 링크는 검사기가 `direction-graph-source`로 잡는다.
 *
 * **끊긴 종단점(broken endpoint)** 은 링크의 정상적인 상태다. 종단점 앵커가 orphan이 되면
 * 링크를 지우지도(조용한 소실) 다른 곳에 다시 겨누지도(조용한 재지정) 않고, 검사기가
 * `brokenEndpoints`로 보고한다. 그 상태는 링크가 아니라 **주석 레코드의 측정값**
 * (`anchorState`)에서 오므로 여기에 복제해 두지 않는다 — 복제하면 그 순간부터 낡는다.
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { spawnSync } from 'node:child_process'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const HERE = dirname(fileURLToPath(import.meta.url))
export const PLANE_EDITOR_DIR = resolve(HERE, '..')
export const CHECKER = join(PLANE_EDITOR_DIR, 'check_links.py')
export const DEFAULT_STORE_DIR = join(PLANE_EDITOR_DIR, 'link-store')
export const LINKS_FILE = 'links.json'
export const STORE_VERSION = 1

/** rdflib/pyshacl/owlrl 를 가진 인터프리터 (CLAUDE.md의 환경 절). */
export function pythonBin() {
  if (process.env.HO_PYTHON) return process.env.HO_PYTHON
  return existsSync('/usr/bin/python3') ? '/usr/bin/python3' : 'python3'
}

/* ---- contract surface (the tool layer is the single definition place) ---- */

let contractCache = null

/**
 * cap·추정기·평면·링크 타입 어휘를 **도구 층에서** 읽어온다. 값을 복제하지 않는 것이
 * 요점이므로 실패는 조용히 기본값으로 흘리지 않고 그대로 던진다.
 */
export function loadPlaneContract({ refresh = false, env = {} } = {}) {
  if (contractCache && !refresh) return contractCache
  const run = spawnSync(pythonBin(), [CHECKER, '--emit-contract'], {
    encoding: 'utf8',
    env: { ...process.env, ...env },
  })
  if (run.status !== 0) {
    throw new Error(
      `cap/vocabulary contract surface unavailable (${CHECKER} --emit-contract exited ` +
        `${run.status}): ${(run.stderr || '').trim()}`,
    )
  }
  const contract = JSON.parse(run.stdout)
  if (!refresh) contractCache = contract
  return contract
}

/**
 * 링크 타입 어휘. 여기에 목록을 두지 않는 것이 요점이다 — 계약 표면이 **그래프에서 파생한**
 * 것을 그대로 돌려준다: 살아 있는 `ho:` 관계 술어(bare local name)와 `ho:LinkKind` 개체
 * (`id:<slug>`), 그리고 평면 내부 전용 타입. 그래프가 관계 종류를 하나 늘리면 편집기는
 * 코드 변경 없이 그것을 제시하고, 하나를 폐기하면 그 순간 제시하지 않는다.
 */
export function linkTypes(contract = loadPlaneContract()) {
  return [
    ...contract.linkTypes.graphVocabulary,
    ...contract.linkTypes.graphKinds,
    ...contract.linkTypes.decisionInternal,
  ]
}

/** 관계 **종류**만 (그래프의 확장 지점 = 새 관계는 여기로 는다). */
export function linkKinds(contract = loadPlaneContract()) {
  return [...contract.linkTypes.graphKinds]
}

/**
 * 주석 종단점이 이름으로 가리킬 수 있는 **레코드 앵커 부분**. 목록의 단일 정의처는 게이트
 * (`check_links.py ENDPOINT_ANCHORS`)이고 여기서는 계약 표면으로 받아 쓴다 — 값을 복제하면
 * 두 층이 다른 집합을 인정하게 되고, 그것이 이 평면이 어휘에서 이미 한 번 겪은 결함이다.
 */
export function endpointAnchors(contract = loadPlaneContract()) {
  return [...contract.endpointAnchors]
}

/* ---- records ---- */

/**
 * 종단점. 주석 평면은 문서 정체성을 **함께** 실어야 한다 (문서 없는 주석 종단점은
 * 검사기가 `endpoint-document-missing`으로 잡는다).
 *
 * `anchor`를 주면 종단점이 레코드가 아니라 **문서 안의 위치**를 가리킨다(위 머리말).
 * 값은 계약 표면의 `endpointAnchors` 중 하나여야 하며, 여기서 그 목록을 검사하지 않는
 * 이유는 판정을 재구현하지 않기 때문이다 — 검사기가 `link-endpoint-plane`으로 잡는다.
 */
export function endpoint(plane, ref, document = null, anchor = null) {
  return {
    plane,
    ref,
    ...(document ? { document } : {}),
    ...(anchor ? { anchor } : {}),
  }
}

/** 고정된 키 순서로 정규화한다 — 직렬화가 결정론적이려면 키 순서도 고정이어야 한다. */
export function linkRecord({ id, from, to, type, evidence, created_by: createdBy }) {
  const side = (value) => {
    const normalised = { plane: value?.plane, ref: value?.ref }
    if (value && value.document !== undefined && value.document !== null && value.document !== '') {
      normalised.document = value.document
    }
    // 위치를 가리키는 종단점은 `document` 다음에 온다 (문서 -> 레코드 -> 그 안의 자리 순서).
    if (value && value.anchor !== undefined && value.anchor !== null && value.anchor !== '') {
      normalised.anchor = value.anchor
    }
    return normalised
  }
  const record = {
    id,
    from: side(from),
    to: side(to),
    type,
  }
  if (evidence !== undefined && evidence !== null && evidence !== '') {
    record.evidence = evidence
  }
  record.created_by = createdBy
  return record
}

/**
 * 총순서 = id 오름차순. 내용 기반 복합키가 아니라 id 하나로 정한 이유는, 같은 규칙을
 * Python 검사기가 언어 독립적으로 다시 확인할 수 있어야 하기 때문이다(id는 유일하므로
 * 총순서가 보장된다).
 */
export function sortLinks(links) {
  return [...links].sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0))
}

export function linkStore(links) {
  return { version: STORE_VERSION, plane: 'link', links: sortLinks(links.map(linkRecord)) }
}

export function serializeLinkStore(store) {
  return `${JSON.stringify(linkStore(store.links ?? store), null, 2)}\n`
}

export function loadLinkStore(dir = DEFAULT_STORE_DIR) {
  const raw = JSON.parse(readFileSync(join(dir, LINKS_FILE), 'utf8'))
  if (raw.version !== STORE_VERSION) {
    throw new Error(`unsupported link-store version: ${raw.version}`)
  }
  return { version: raw.version, plane: raw.plane ?? 'link', links: raw.links }
}

export function saveLinkStore(dir, store) {
  mkdirSync(dir, { recursive: true })
  writeFileSync(join(dir, LINKS_FILE), serializeLinkStore(store))
  return join(dir, LINKS_FILE)
}

/* ---- verdicts are delegated, never re-implemented ---- */

/**
 * 무결성 판정은 검사기가 낸다. 여기서는 호출·파싱만 한다.
 * 반환: { pass, violations, counts, cap, store, exitCode }.
 */
export function checkLinkStore({ storeDir = DEFAULT_STORE_DIR, annotations = [], env = {} } = {}) {
  const args = [CHECKER, '--store', storeDir, '--format', 'json']
  for (const path of annotations) args.push('--annotations', path)
  const run = spawnSync(pythonBin(), args, {
    encoding: 'utf8',
    env: { ...process.env, ...env },
  })
  if (run.status !== 0 && run.status !== 1) {
    throw new Error(`check_links.py failed (${run.status}): ${(run.stderr || '').trim()}`)
  }
  return { ...JSON.parse(run.stdout), exitCode: run.status }
}
