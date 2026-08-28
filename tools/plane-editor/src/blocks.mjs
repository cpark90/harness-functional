/**
 * 블록 정체성 (block identity) — 앵커의 **출처(provenance)** 를 CRDT에 직접 묻는 층.
 *
 * 왜 필요한가: 문자열만 보면 "지운 자리"와 "같은 문장이 있는 남의 자리"가 똑같이
 * 생겼다. 그래서 "RelativePosition이 죽었다"는 사실만으로 quote 복구를 돌리면
 * 삭제된 앵커가 살아남은 남의 문장에 붙는다(vnv P3 = 실측된 오해소).
 *
 * 이 모듈이 제공하는 증거는 세 가지다:
 *   1. **블록의 Yjs item id** (`client:clock`) — y-prosemirror 바인딩의 mapping
 *      (Y type -> PM node)을 뒤집어 얻는다. 문서에 아무것도 쓰지 않으므로 G1
 *      (스키마·문서 무오염)을 건드리지 않는다.
 *   2. **저장된 item의 현재 운명** (`itemFate`) — 그 id가 지금 문서 store에
 *      살아 있는가·tombstone인가·아예 모르는 id인가. 앵커 레코드의 itemId를
 *      **현재 CRDT item과 실제로 대조**하는 통로다.
 *   3. **캡처 시점 state vector 기준의 생성 판정** (`classifyCreation`) — 한 item이
 *      캡처 때 이미 있었는지(`preexisting`), 캡처를 아는 client가 그 뒤에 만들었는지
 *      (`created-after`), 캡처 때 존재조차 몰랐던 client의 것인지(`foreign-client`).
 *      셋을 뭉뚱그리면 원격 피어가 새로 쓴 문장이 "이동한 내 블록"으로 둔갑한다.
 *
 * **이 층이 증명하지 못하는 것** (측정된 사실, `scenarios.mjs` D3):
 * 블록 이동(cut+paste)은 Yjs에서 "옛 element 삭제 + 새 element 삽입"이라, 같은 문장을
 * 지웠다 다시 타이핑한 편집과 **업데이트가 byte 단위로 같다**. 즉 "같은 텍스트 블록이
 * 새로 생겼다"는 이동의 증거가 될 수 없다. 정체성은 item id가 **살아남았을 때만**
 * 증명된다. 증거가 없으면 `null`/`unknown`을 돌려주고, 호출부는 그것을
 * "복구 금지"로 다뤄야 한다 (의심스러우면 orphan).
 */
import * as Y from 'yjs'
import { buildTextIndex } from './text-index.mjs'

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
 * 둘은 전부 새 문자다 (`characterOrigins`). 반면 블록 이동 후보를 고를 때는
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

/** 캡처 시점의 문서에 없던 내용인가 (문자 출처 계산용 — 두 종류의 "새 문자"를 합친다). */
export function isNewSinceCapture(itemId, stateVectorBase64) {
  const creation = classifyCreation(itemId, stateVectorBase64)
  return creation === CREATION.CREATED_AFTER || creation === CREATION.FOREIGN_CLIENT
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
 * 한 블록 안 구간 [textFrom, textTo) 의 문자 출처. 판정할 수 없으면 `known:false`.
 * 호출부는 `known:false`를 **증거 없음 = 통과 금지**로 다뤄야 한다 (의심스러우면 orphan).
 */
export function characterOrigins(block, textFrom, textTo, stateVectorBase64) {
  const unknown = { known: false, preexisting: 0, fresh: 0 }
  if (!block || !block.ytype || typeof stateVectorBase64 !== 'string') return unknown
  const runs = characterRuns(block.ytype)
  const covered = runs.reduce((total, run) => total + (run.to - run.from), 0)
  if (covered !== block.text.length) return unknown

  const from = textFrom - block.textFrom
  const to = textTo - block.textFrom
  let preexisting = 0
  let fresh = 0
  for (const run of runs) {
    const overlap = Math.min(run.to, to) - Math.max(run.from, from)
    if (overlap <= 0) continue
    if (isNewSinceCapture(run.itemId, stateVectorBase64)) fresh += overlap
    else preexisting += overlap
  }
  return { known: true, preexisting, fresh }
}

/**
 * 구간 [textFrom, textTo) 안에 **캡처 시점부터 있던 문자**가 몇 개인가 —
 * 범위가 **블록 경계를 넘어도** 센다. (블록 하나만 보던 판이 옛 버전인데, 그러면
 * 문단 분할·블록 경계를 걸친 앵커가 전부 "증거 없음"으로 떨어져서, 출처 미상을
 * 거절하도록 뒤집은 뒤에는 정상 편집까지 orphan이 된다.)
 *
 * 겹치는 블록 중 **하나라도** 출처를 못 읽으면 known:false다 (부분 증거로 통과시키지 않는다).
 */
export function rangeOrigins(blocks, textFrom, textTo, stateVectorBase64) {
  if (typeof stateVectorBase64 !== 'string') return { known: false, preexisting: 0, fresh: 0, blocks: 0 }
  const touched = blocks.filter((block) => block.textTo > textFrom && block.textFrom < textTo)
  if (touched.length === 0) return { known: false, preexisting: 0, fresh: 0, blocks: 0 }
  let preexisting = 0
  let fresh = 0
  for (const block of touched) {
    const origins = characterOrigins(
      block,
      Math.max(textFrom, block.textFrom),
      Math.min(textTo, block.textTo),
      stateVectorBase64,
    )
    if (!origins.known) return { known: false, preexisting: 0, fresh: 0, blocks: touched.length }
    preexisting += origins.preexisting
    fresh += origins.fresh
  }
  return { known: true, preexisting, fresh, blocks: touched.length }
}
