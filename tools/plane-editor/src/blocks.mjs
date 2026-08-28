/**
 * 블록 정체성 (block identity) — **삭제와 이동을 가르는 유일한 증거**.
 *
 * 왜 필요한가: CRDT 층만으로는 두 편집을 구분할 수 없다. 블록을 지워도, 블록을
 * 잘라 다른 자리에 붙여도 원래 Yjs item은 똑같이 tombstone이 된다(vnv P7 실측).
 * 그래서 "RelativePosition이 죽었다"는 사실만으로 quote 복구를 돌리면, 삭제된
 * 앵커가 살아남은 남의 문장에 붙는다(vnv P3 = 오해소).
 *
 * 이 모듈이 제공하는 증거는 두 가지다:
 *   1. **블록의 Yjs item id** (`client:clock`) — y-prosemirror 바인딩의 mapping
 *      (Y type -> PM node)을 뒤집어 얻는다. 문서에 아무것도 쓰지 않으므로 G1
 *      (스키마·문서 무오염)을 건드리지 않는다.
 *   2. **캡처 시점의 state vector** — 앵커 레코드에 함께 저장한다. item id의
 *      clock을 이 벡터와 비교하면 "이 블록의 내용이 캡처 이후에 새로 생겼는가"를
 *      판정할 수 있다. 이동(cut+paste)은 **새 item**을 만들고, 삭제는 만들지
 *      않는다 — 이것이 두 편집을 가르는 지점이다.
 *
 * 정체성을 알 수 없으면(mapping 미준비·비동기 노드) `null`을 돌려준다. 호출부는
 * null을 "증거 없음 = 복구 금지"로 다뤄야 한다 (의심스러우면 orphan).
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
 * 캡처 시점 이후에 만들어진 item인가.
 * state vector는 client -> "다음 clock"이므로, clock이 그 값 이상이면 캡처
 * 시점의 문서에는 없던 내용이다. 모르는 client(다른 프로세스가 새로 만든 내용)도
 * 기준값 0이 되어 "새 내용"으로 판정된다 — 의도된 동작이다.
 */
export function isCreatedAfter(itemId, stateVectorBase64) {
  const parsed = parseItemId(itemId)
  if (!parsed || typeof stateVectorBase64 !== 'string') return false
  const stateVector = decodeStateVector(stateVectorBase64)
  return parsed.clock >= (stateVector.get(parsed.client) ?? 0)
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
 * 구간 [textFrom, textTo) 안에 **캡처 시점부터 있던 문자**가 몇 개인가.
 * 판정할 수 없으면 `known: false`를 돌려준다 (그때는 호출부가 문자열 증거만으로
 * 결정한다 — 알 수 없다는 이유로 살아 있는 앵커를 죽이지는 않는다).
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
    if (isCreatedAfter(run.itemId, stateVectorBase64)) fresh += overlap
    else preexisting += overlap
  }
  return { known: true, preexisting, fresh }
}
