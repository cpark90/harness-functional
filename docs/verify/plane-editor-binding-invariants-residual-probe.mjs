/**
 * vnv 프로브 — README 신뢰 경계 **바깥쪽 3행**("죽었거나 이 문서가 모르는 이름표로 채운
 * padding")이 실제로 남아 있는 잔여인지 실측한다.
 *   node docs/verify/plane-editor-binding-invariants-residual-probe.mjs
 *
 * 경계 문단이 방어 실패를 숨기려고 넓혀진 것인지, 아니면 정말 반증할 사실이 없는 계열인지는
 * **그 모양이 실제로 부착되는지**로만 갈린다. H1(살아있는 이름표 padding)은 검사 (4)로 막혔다.
 * 여기서는 같은 위조를 **죽은 이름표**로 만들어(원래 캡처된, 지금은 삭제된 문자들의 이름표)
 * 부착되는지 본다. 부착되면 그 행은 정직한 선언이고(막지 않는다고 적었고 실제로 막히지 않음),
 * 부착되지 않으면 경계가 필요 이상으로 넓게 그려진 것이다.
 *
 * tools/plane-editor/ 는 읽기만 한다.
 */
const ROOT = new URL('../../tools/plane-editor/', import.meta.url).pathname
const { openSession, buildTextIndex, posToOffset, locate } = await import(ROOT + 'src/session.mjs')
const { resolveAnchors, captureAnchors, captureEvidence } = await import(ROOT + 'src/anchors.mjs')
const { liveBlocks, rangeCharacterIds, characterIdCount, encodeStateVector } =
  await import(ROOT + 'src/blocks.mjs')

const say = (o) => console.log(JSON.stringify(o))
const para = (t) => ({ type: 'paragraph', content: [{ type: 'text', text: t }] })
const docOf = (...texts) => ({ type: 'doc', content: texts.map(para) })
const landedAt = (s, r) => (r.from === null ? null : posToOffset(buildTextIndex(s.doc), r.from))

const EXACT = 'Critical failure'
const LINE = `${EXACT} of the anchor engine hides in plain sight.`
const s = openSession({ clientID: 1, docJSON: docOf('Opening block of the probe document.', LINE, 'Closing block.') })
const t = locate(s, { quote: EXACT })
const original = captureAnchors(s, t.from, t.to)

// H1 과 같은 제자리 교체.
s.dispatch((tr) => tr.delete(t.from, t.to))
s.dispatch((tr) => tr.insertText('Cure', t.from))

const { index, blocks } = liveBlocks(s)
const at = index.text.indexOf('Cure')
const inRange = rangeCharacterIds(blocks, at, at + 'Cure'.length)

// 살아남은 범위 문자 'C','u','r','e' 를 exact 안 부분수열 자리에 놓는다 (H1 과 동일).
const slots = []
let cursor = 0
for (const character of 'Cure') {
  const found = EXACT.indexOf(character, cursor)
  slots.push(found)
  cursor = found + 1
}
const flatRange = []
for (const run of inRange) {
  for (let offset = 0; offset < run.length; offset += 1) {
    flatRange.push({ client: run.client, clock: run.clock + offset, length: 1 })
  }
}

// padding = **죽은 이름표**: 원래 캡처된(=지금 삭제된) 문자들의 이름표를 그대로 쓴다.
const dead = []
for (const run of original.capture.characterIds) {
  for (let offset = 0; offset < run.length; offset += 1) {
    dead.push({ client: run.client, clock: run.clock + offset, length: 1 })
  }
}
const runs = new Array(EXACT.length).fill(null)
slots.forEach((slot, i) => { runs[slot] = flatRange[i] })
let deadCursor = 0
let unfilled = 0
for (let position = 0; position < EXACT.length; position += 1) {
  if (runs[position]) continue
  const id = dead[deadCursor]
  deadCursor += 1
  if (!id) { unfilled += 1; continue }
  runs[position] = id
}

const forged = {
  ...original,
  capture: { stateVector: encodeStateVector(s), characterIds: runs.filter(Boolean) },
}
const evidence = captureEvidence(forged)
const r = resolveAnchors(s, forged)
say({
  probe: 'Z1 padding forgery built from DEAD character ids (README boundary row 3)',
  storedExact: EXACT,
  subsequenceSlots: slots,
  unfilledPositions: unfilled,
  forgedRunChars: characterIdCount(forged.capture.characterIds),
  captureEvidence: { usable: evidence.usable, corrupt: evidence.corrupt, reason: evidence.reason },
  forgedRecord: {
    method: r.method,
    text: r.text,
    landedOffset: landedAt(s, r),
    provenance: r.guard ? r.guard.provenance : null,
    survivingChars: r.guard ? r.guard.survivingChars : null,
    accepted: r.guard ? r.guard.accepted : null,
  },
  misResolved: r.method !== 'orphaned',
  boundaryRowHonest: r.method !== 'orphaned',
})
s.close()
