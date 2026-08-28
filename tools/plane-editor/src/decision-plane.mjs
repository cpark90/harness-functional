/**
 * The decision plane — design rationale as standoff records.
 *
 *   decision record : { id, title, body, status, supersedes?, decided_by }
 *   status          : open | accepted | superseded   (어휘는 계약 표면에서 읽는다)
 *
 * 주석 평면과 같은 **standoff 원칙**을 따른다: 레코드는 문서와 별개 파일에 살고, 문서·
 * 그래프·주석과의 결합은 인라인 인용이 아니라 링크 평면의 typed link으로만 일어난다.
 *
 * [판정 메커니즘의 차이 — v0.2 §검토 D] 이 평면은 다른 평면과 달리 **결정론적 판정이
 * 불가능하다**. 논증이 타당한지는 기계가 못 센다. 그래서 커밋 조건은 기계 검사가 아니라
 * **판정 주체 표기**(`decided_by`)이고, 검사기는 형식(필수 필드·상태 어휘·cap·supersedes
 * 순환)만 본다. 이 모듈도 같은 선을 지킨다 — 여기서 강제하는 것은 **크기 규율**뿐이다.
 *
 * [지킴] cap 상수를 여기에 박지 않는다 (브리프 §5). cap과 그 추정기의 유일 정의처는 도구
 * 층(`tools/lint_uniformity.py`)이고, 이 모듈은 `check_links.py --emit-contract`가 내보내는
 * **계약 표면의 소비자 1호**다. 도구 층에서 cap을 바꾸면 여기 판정이 따라 바뀌어야 한다 —
 * 값이 복제돼 있으면 안 바뀐다는 것이 그 성질의 시험법이다.
 */
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

import { DEFAULT_STORE_DIR, STORE_VERSION, loadPlaneContract } from './link-plane.mjs'

export const DECISIONS_FILE = 'decisions.json'

/* ---- records ---- */

/** 고정 키 순서 정규화 (직렬화 결정론). `supersedes`는 있을 때만 실린다. */
export function decisionRecord({
  id,
  title,
  body,
  status,
  supersedes,
  decided_by: decidedBy,
}) {
  const record = { id, title, body, status }
  if (supersedes !== undefined && supersedes !== null && supersedes !== '') {
    record.supersedes = supersedes
  }
  record.decided_by = decidedBy
  return record
}

export function sortDecisions(decisions) {
  return [...decisions].sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0))
}

export function decisionStore(decisions) {
  return {
    version: STORE_VERSION,
    plane: 'decision',
    decisions: sortDecisions(decisions.map(decisionRecord)),
  }
}

export function serializeDecisionStore(store) {
  return `${JSON.stringify(decisionStore(store.decisions ?? store), null, 2)}\n`
}

export function loadDecisionStore(dir = DEFAULT_STORE_DIR) {
  const raw = JSON.parse(readFileSync(join(dir, DECISIONS_FILE), 'utf8'))
  if (raw.version !== STORE_VERSION) {
    throw new Error(`unsupported decision-store version: ${raw.version}`)
  }
  return { version: raw.version, plane: raw.plane ?? 'decision', decisions: raw.decisions }
}

export function saveDecisionStore(dir, store) {
  mkdirSync(dir, { recursive: true })
  writeFileSync(join(dir, DECISIONS_FILE), serializeDecisionStore(store))
  return join(dir, DECISIONS_FILE)
}

/* ---- size discipline: the contract surface's first consumer ---- */

const ESTIMATOR_RE = /^chars-div-(\d+)$/

/**
 * 계약 표면이 알려준 추정기로 레코드의 텍스트 크기를 잰다. 추정기 종류는 **닫힌 집합**이라
 * 모르는 값이 오면 조용히 chars/4로 흘리지 않고 던진다 — 도구 층이 추정기를 바꾸면 편집기가
 * 말없이 갈라지는 대신 큰 소리로 멈추게 하는 장치다.
 */
export function textTokens(record, contract = loadPlaneContract()) {
  const { estimator, charsPerToken, fields } = contract.textCap
  const match = ESTIMATOR_RE.exec(estimator)
  if (!match || Number(match[1]) !== charsPerToken) {
    throw new Error(
      `unknown text estimator '${estimator}' in the tool-layer contract — the editor must ` +
        'not re-implement it; re-point the contract surface instead',
    )
  }
  const chars = fields.reduce(
    (sum, field) => sum + (typeof record[field] === 'string' ? record[field].length : 0),
    0,
  )
  return Math.floor(chars / charsPerToken)
}

/** { tokens, cap, estimator, withinCap } — cap 값은 언제나 도구 층에서 온다. */
export function capCheck(record, contract = loadPlaneContract()) {
  const tokens = textTokens(record, contract)
  const cap = contract.textCap.tokens
  return { tokens, cap, estimator: contract.textCap.estimator, withinCap: tokens <= cap }
}

export function assertWithinCap(record, contract = loadPlaneContract()) {
  const result = capCheck(record, contract)
  if (!result.withinCap) {
    throw new Error(
      `decision ${record.id}: ${contract.textCap.fields.join('+')} = ${result.tokens} tokens ` +
        `(${result.estimator}) > cap ${result.cap} — split the decision`,
    )
  }
  return record
}

export function decisionStatuses(contract = loadPlaneContract()) {
  return [...contract.decisionStatuses]
}

export function isKnownStatus(status, contract = loadPlaneContract()) {
  return decisionStatuses(contract).includes(status)
}
