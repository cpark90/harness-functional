/**
 * 블록 정체성 (block identity) — 앵커의 **출처(provenance)** 를 CRDT에 직접 묻는 층.
 *
 * 왜 필요한가: 문자열만 보면 "지운 자리"와 "같은 문장이 있는 남의 자리"가 똑같이
 * 생겼다. 그래서 "RelativePosition이 죽었다"는 사실만으로 quote 복구를 돌리면
 * 삭제된 앵커가 살아남은 남의 문장에 붙는다(vnv P3 = 실측된 오해소).
 *
 * 이 모듈이 제공하는 증거는 네 가지다:
 *   1. **블록의 Yjs item id** (`client:clock`) — y-prosemirror 바인딩의 mapping
 *      (Y type -> PM node)을 뒤집어 얻는다. 문서에 아무것도 쓰지 않으므로 G1
 *      (스키마·문서 무오염)을 건드리지 않는다.
 *   2. **저장된 item의 현재 운명** (`itemFate`) — 그 id가 지금 문서 store에
 *      살아 있는가·tombstone인가·아예 모르는 id인가. 앵커 레코드의 itemId를
 *      **현재 CRDT item과 실제로 대조**하는 통로다.
 *   3. **문자 하나하나의 CRDT 정체성** (`rangeCharacterIds`) — Yjs에서 문자열 item
 *      `{client, clock}`은 길이 L의 **clock 구간**이라(item이 쪼개져도 문자의 clock은
 *      그대로다 — 실측), 범위 안 문자 집합을 `{client, clock, length}` 런으로 적을 수
 *      있다. "캡처 때부터 있던 문자가 남았는가"를 시각·버전이 아니라 **그 문자 자신의
 *      정체성**으로 판정하는 근거다. 그 판정은 이름표를 세는 것이 아니라 저장된 `exact`와
 *      **자리별로 대응**시키는 구조 검사다 (`captureCorrespondence`) — 개수만 보면 다른 곳의
 *      이름표로 길이를 채운 위조가 통과한다(실측: vnv B4).
 *   4. **캡처 시점 state vector 기준의 생성 판정** (`classifyCreation`) — 한 item이
 *      캡처 때 이미 있었는지(`preexisting`), 캡처를 아는 client가 그 뒤에 만들었는지
 *      (`created-after`), 캡처 때 존재조차 몰랐던 client의 것인지(`foreign-client`).
 *      셋을 뭉뚱그리면 원격 피어가 새로 쓴 문장이 "이동한 내 블록"으로 둔갑한다.
 *      **이 증거는 자기보고 state vector에 의존**하므로 strict 정책은 쓰지 않는다
 *      (대조 정책 `textmove` 전용 — `src/anchors.mjs` 규칙 A 주석 참조).
 *
 * **이 층이 증명하지 못하는 것** (측정된 사실, `scenarios.mjs` D3):
 * 블록 이동(cut+paste)은 Yjs에서 "옛 element 삭제 + 새 element 삽입"이라, 같은 문장을
 * 지웠다 다시 타이핑한 편집과 **업데이트가 byte 단위로 같다**. 즉 "같은 텍스트 블록이
 * 새로 생겼다"는 이동의 증거가 될 수 없다. 정체성은 item id가 **살아남았을 때만**
 * 증명된다. 증거가 없으면 `null`/`unknown`을 돌려주고, 호출부는 그것을
 * "복구 금지"로 다뤄야 한다 (의심스러우면 orphan).
 */
import * as Y from 'yjs'
import { BLOCK_SEPARATOR, buildTextIndex } from './text-index.mjs'

const ITEM_ID_SEPARATOR = ':'

/** "client:clock" — 결정론적 문자열이라 레코드에 그대로 저장할 수 있다. */
export function formatItemId(item) {
  return item ? `${item.id.client}${ITEM_ID_SEPARATOR}${item.id.clock}` : null
}

export function parseItemId(itemId) {
  if (typeof itemId !== 'string') return null
  const [client, clock] = itemId.split(ITEM_ID_SEPARATOR).map(Number)
  if (!Number.isFinite(client) || !Number.isFinite(clock)) return null
  return { client, clock }
}

export const encodeStateVector = (session) =>
  Buffer.from(Y.encodeStateVector(session.ydoc)).toString('base64')

const decodeStateVector = (encoded) =>
  Y.decodeStateVector(new Uint8Array(Buffer.from(encoded, 'base64')))

/**
 * 한 item이 캡처 시점을 기준으로 어디서 왔는가. **세 값**을 구분한다.
 *
 *   preexisting     : 캡처 시점의 문서에 이미 있던 내용 (clock < sv[client])
 *   created-after   : 캡처를 아는 client가 그 **이후에** 만든 내용
 *   foreign-client  : 캡처 시점 state vector에 아예 없던 client의 내용.
 *                     "캡처 이후"인지조차 이 벡터로는 말할 수 없다 — 다른 복제본이
 *                     오프라인에서 만든 것일 수도, 문서를 통째로 재임포트한 것일
 *                     수도 있다. 출처 미상이므로 **이동 판정에 쓰면 안 된다**
 *                     (vnv N3: 원격 피어가 같은 문장을 쓰면 오해소가 났던 지점).
 *   unknown         : id나 state vector를 읽을 수 없음.
 *
 * 앵커 범위 안 문자를 셀 때는 preexisting만 "캡처 때부터 있던 문자"이고 나머지
 * 둘은 전부 새 문자다. 반면 블록 이동 후보를 고를 때는
 * created-after와 foreign-client를 **같이 놓으면 안 된다**.
 */
export const CREATION = Object.freeze({
  PREEXISTING: 'preexisting',
  CREATED_AFTER: 'created-after',
  FOREIGN_CLIENT: 'foreign-client',
  UNKNOWN: 'unknown',
})

export function classifyCreation(itemId, stateVectorBase64) {
  const parsed = parseItemId(itemId)
  if (!parsed || typeof stateVectorBase64 !== 'string') return CREATION.UNKNOWN
  const stateVector = decodeStateVector(stateVectorBase64)
  if (!stateVector.has(parsed.client)) return CREATION.FOREIGN_CLIENT
  return parsed.clock >= stateVector.get(parsed.client) ? CREATION.CREATED_AFTER : CREATION.PREEXISTING
}

/**
 * 저장된 item id가 **지금 문서에서 어떤 상태인가**. 앵커 레코드의 정체성을 현재
 * CRDT와 직접 대조하는 통로다 (규칙 C).
 *
 *   live     : 그 item이 살아 있다 (삭제되지 않음)
 *   deleted  : tombstone — 그 블록은 실제로 파괴됐다 (삭제든 이동이든)
 *   unknown  : store가 그 id를 모른다 (다른 문서·재임포트본을 들이댄 경우)
 */
export function itemFate(ydoc, itemId) {
  const parsed = parseItemId(itemId)
  if (!parsed || !ydoc) return { state: 'unknown', item: null }
  try {
    const clients = ydoc.store.clients.get(parsed.client)
    if (!clients || clients.length === 0) return { state: 'unknown', item: null }
    const last = clients[clients.length - 1]
    if (parsed.clock >= last.id.clock + last.length) return { state: 'unknown', item: null }
    const item = Y.getItem(ydoc.store, Y.createID(parsed.client, parsed.clock))
    if (!item) return { state: 'unknown', item: null }
    return { state: item.deleted ? 'deleted' : 'live', item }
  } catch {
    return { state: 'unknown', item: null }
  }
}

/**
 * 블록 안 문자들의 **출처**: 각 문자 구간이 어느 Yjs item에서 왔는가.
 * 문자열 비교만으로는 "가운데를 지운 잔여 텍스트"와 "그 자리에 새로 타이핑한
 * 짧은 텍스트"를 구분할 수 없다 (`Critical failure` -> `Cure`는 양쪽 다로 읽힌다).
 * CRDT는 구분할 수 있다 — 살아남은 문자는 **옛 item**이고, 새로 친 문자는 **새 item**이다.
 *
 * 반환은 블록 로컬 오프셋 기준 구간 목록이다. 삭제된 item은 보이지 않으므로 건너뛴다.
 */
export function characterRuns(ytype) {
  const runs = []
  const walk = (type, state) => {
    let item = type ? type._start : null
    while (item) {
      if (!item.deleted) {
        const content = item.content
        if (typeof content.str === 'string') {
          runs.push({ from: state.offset, to: state.offset + content.str.length, itemId: formatItemId(item) })
          state.offset += content.str.length
        } else if (content.type) {
          walk(content.type, state)
        }
      }
      item = item.right
    }
  }
  walk(ytype, { offset: 0 })
  return runs
}

/** PM node -> 그 노드를 담고 있는 Y type의 item id. 바인딩이 없으면 빈 Map. */
function ownerMap(session) {
  const owners = new Map()
  let mapping
  try {
    mapping = session.mapping()
  } catch {
    return owners
  }
  for (const [ytype, node] of mapping.entries()) {
    owners.set(node, ytype)
  }
  return owners
}

/**
 * 현재 문서의 textblock 목록 + 각 블록의 Yjs item id.
 * 반환된 index는 호출부가 그대로 오프셋 변환에 쓴다 (두 번 만들지 않는다).
 */
export function liveBlocks(session) {
  const doc = session.editor.state.doc
  const index = buildTextIndex(doc)
  const owners = ownerMap(session)
  const blocks = index.blocks.map((block) => {
    const ytype = owners.get(block.node) ?? null
    return {
      pmFrom: block.pmFrom,
      pmInnerFrom: block.pmInnerFrom,
      textFrom: block.textFrom,
      textTo: block.textTo,
      text: block.text,
      ytype,
      itemId: ytype ? formatItemId(ytype._item) : null,
    }
  })
  return { index, blocks }
}

/**
 * 구간 [textFrom, textTo) 안 **문자들의 CRDT 정체성**을 `{client, clock, length}` 런
 * 목록으로 돌려준다. 판정할 수 없으면 `null` (증거 없음 = 통과 금지).
 *
 * Yjs의 문자열 item은 id `{client, clock}`부터 시작하는 **길이만큼의 clock 구간**이고,
 * 나중에 그 item이 쪼개져도 각 문자의 clock은 변하지 않는다(실측: 52자 item에 삽입을
 * 하면 `1:18` -> `1:18`(21자) + `1:39`(31자)로 갈라지며 뒤쪽 문자의 clock이 보존된다).
 * 그래서 이 런 목록은 **"바로 그 문자들"의 이름표**이지 시각·버전 값이 아니다.
 *
 * 범위가 블록 경계를 넘어도 센다. 겹치는 블록 중 **하나라도** 문자 run이 블록 텍스트를
 * 전부 덮지 못하면(인라인 노드 등으로 오프셋을 믿을 수 없으면) 부분 증거로 통과시키지
 * 않고 `null`을 돌려준다.
 *
 * 블록 구분자(`\n`)는 문서 텍스트의 투영일 뿐 CRDT 문자가 아니므로 런에 포함되지
 * 않는다 — 그래서 런 길이 합은 "범위 문자수 - 범위 안 개행수"다.
 */
export function rangeCharacterIds(blocks, textFrom, textTo) {
  const touched = blocks.filter((block) => block.textTo > textFrom && block.textFrom < textTo)
  if (touched.length === 0) return null
  const runs = []
  for (const block of touched) {
    if (!block.ytype) return null
    const blockRuns = characterRuns(block.ytype)
    const covered = blockRuns.reduce((total, run) => total + (run.to - run.from), 0)
    if (covered !== block.text.length) return null
    const from = Math.max(textFrom, block.textFrom) - block.textFrom
    const to = Math.min(textTo, block.textTo) - block.textFrom
    for (const run of blockRuns) {
      const start = Math.max(run.from, from)
      const end = Math.min(run.to, to)
      if (end <= start) continue
      const parsed = parseItemId(run.itemId)
      if (!parsed) return null
      runs.push({ client: parsed.client, clock: parsed.clock + (start - run.from), length: end - start })
    }
  }
  return runs
}

/** 런 목록이 덮는 문자수. */
export const characterIdCount = (runs) =>
  Array.isArray(runs) ? runs.reduce((total, run) => total + run.length, 0) : 0

/** 블록 구분자는 문서 텍스트의 투영일 뿐 CRDT 문자가 아니다 — 이름표 시퀀스에서 뺀다. */
const withoutSeparators = (text) => text.split(BLOCK_SEPARATOR).join('')

/**
 * 지금 문서에 **살아 있는 문자들의 내용표**: `"client:clock" -> 문자`.
 * Yjs 문자열 item의 내용은 불변이므로, 어떤 이름표가 아직 살아 있다면 그 문자가 무엇인지
 * 지금 확인할 수 있다. 캡처 이름표를 **개수가 아니라 구조**로 검사하는 근거다.
 * 오프셋을 믿을 수 없는 블록(인라인 노드 등으로 run이 텍스트를 다 덮지 못함)은 건너뛴다.
 */
export function liveCharacterText(blocks) {
  const chars = new Map()
  for (const block of blocks) {
    if (!block.ytype) continue
    const runs = characterRuns(block.ytype)
    const covered = runs.reduce((total, run) => total + (run.to - run.from), 0)
    if (covered !== block.text.length) continue
    for (const run of runs) {
      const parsed = parseItemId(run.itemId)
      if (!parsed) continue
      for (let offset = 0; offset < run.to - run.from; offset += 1) {
        chars.set(`${parsed.client}${ITEM_ID_SEPARATOR}${parsed.clock + offset}`, block.text[run.from + offset])
      }
    }
  }
  return chars
}

/**
 * 캡처 이름표의 **구조 검사** — "몇 자냐"가 아니라 "무엇의 이름표냐"를 묻는다.
 *
 * 길이 합계만 보는 검사는 우회된다(실측: vnv B4). 현재 교체 범위의 살아있는 이름표에
 * 문서 다른 곳의 이름표를 **padding** 해 저장된 `exact` 길이에 맞추고 `stateVector`를
 * 현재 값으로 주면, 두 자기보고 검사(길이·SV)를 전부 통과한 채 "옛 문자가 살아남았다"로
 * 읽힌다. 그래서 이름표를 **저장된 exact와 자리별로 대응**시켜 검사한다.
 *
 * 캡처 런을 펼치면 k번째 이름표는 `exact`의 k번째 문자(구분자 제외)를 가리킨다. Yjs
 * 문자열 item의 내용은 불변이므로 이 대응은 **사후에도 반증 가능**하다.
 *   1. 내용 대응 — 캡처 이름표가 지금도 살아 있다면 그 문자는 `exact[k]`여야 한다.
 *      다른 곳에서 베껴 온 padding은 여기서 걸린다(그 자리의 문자가 아니다).
 *   2. 이름표 유일성 — 같은 이름표가 두 자리를 차지할 수 없다(런 겹침 = 위조 모양).
 *   3. 순서 보존 — CRDT는 살아남은 문자의 상대 순서를 바꾸지 않으므로, 해소 범위에서
 *      살아남은 문자들의 캡처 위치 k는 **증가 수열**이어야 한다.
 * 셋 중 하나라도 깨지면 `consistent:false`이고, 호출부는 그것을 "출처 증거 위조"로
 * 다뤄야 한다(통과 금지). 세 검사는 전부 **현재 문서에서 확인 가능한 사실**만 쓴다.
 */
export function captureCorrespondence(blocks, textFrom, textTo, capturedRuns, exact) {
  const unknown = { known: false, consistent: true, preexisting: 0, fresh: 0, reason: null }
  if (!Array.isArray(capturedRuns) || typeof exact !== 'string') return unknown
  const live = rangeCharacterIds(blocks, textFrom, textTo)
  if (live === null) return unknown

  const broken = (reason) => ({ known: true, consistent: false, preexisting: 0, fresh: 0, reason })
  const capturedChars = withoutSeparators(exact)
  if (characterIdCount(capturedRuns) !== capturedChars.length) return broken('capture-length-mismatch')

  // 캡처 시퀀스: 이름표 -> exact 안 자리.
  const capturedAt = new Map()
  let at = 0
  for (const run of capturedRuns) {
    for (let offset = 0; offset < run.length; offset += 1) {
      capturedAt.set(`${run.client}${ITEM_ID_SEPARATOR}${run.clock + offset}`, at)
      at += 1
    }
  }
  if (capturedAt.size !== capturedChars.length) return broken('capture-overlapping-runs')

  // (1) 내용 대응 — 문서 전역. 살아 있는 이름표는 저장된 exact의 그 자리 문자여야 한다.
  const liveText = liveCharacterText(blocks)
  for (const [id, position] of capturedAt) {
    const character = liveText.get(id)
    if (character !== undefined && character !== capturedChars[position]) {
      return broken('capture-content-mismatch')
    }
  }

  // (3) 순서 보존 + 살아남은 문자수.
  let preexisting = 0
  let previous = -1
  for (const run of live) {
    for (let offset = 0; offset < run.length; offset += 1) {
      const position = capturedAt.get(`${run.client}${ITEM_ID_SEPARATOR}${run.clock + offset}`)
      if (position === undefined) continue
      if (position <= previous) return broken('capture-order-mismatch')
      previous = position
      preexisting += 1
    }
  }
  return {
    known: true,
    consistent: true,
    preexisting,
    fresh: characterIdCount(live) - preexisting,
    reason: null,
  }
}
