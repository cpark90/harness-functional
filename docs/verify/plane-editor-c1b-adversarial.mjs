/**
 * vnv 독립 적대 프로브 (C1b 판정) — "앵커 정체성(itemId) 대조"를 우회·계량하는 케이스.
 *
 *   node docs/verify/plane-editor-c1b-adversarial.mjs
 *
 * C1b가 닫았다고 주장하는 구멍(N1/N1b·N3·N4·N8)은 `plane-editor-c1-adversarial.mjs`를
 * 무수정 재실행해 따로 확인한다. 이 파일은 **새 규칙의 전제**를 무너뜨리는 편집을 만든다:
 *
 *   규칙 C(strict) accept 조건 = 저장된 blockContext.itemId 가
 *     (1) 현재 store에서 live 이고 (2) 그 블록 텍스트가 저장값과 같고
 *     (3) 저장 오프셋에 exact 가 그대로 있을 때.
 *   규칙 A accept 조건 = 문자열 구조 + (출처가 known 이면 preexisting>0,
 *     출처가 unknown 이면 **해소 텍스트가 exact와 완전히 같을 때만**).
 *   규칙 B = raw 가 collapsed 면 복구를 **아예 돌리지 않는다**.
 *
 * 창안한 우회·계측 축:
 *   D3'  developer 진단 D3("이동과 재타이핑은 Yjs 업데이트가 byte 동일")의 독립 재현.
 *        이동을 **한 트랜잭션**으로 했을 때까지 잰다 (S6 복구 포기의 근거 검증).
 *   D3'' 1-tx 이동 뒤 **증명 가능한 정체성 증거가 남아 있는가**를 직접 조회한다.
 *   M1   블록 분할(split) — 원 element가 어느 쪽에 남는가 / 앵커 쪽을 지우면?
 *   M2   블록 병합(join/Backspace) — 살아남은 element에 남의 텍스트가 붙는가
 *   M3   undo 로 블록이 되살아남 — 정체성이 부활하는가 (복구인가 orphan인가)
 *   M4   v1 레코드를 v2로 **수동 승격**(파일 version만 2) / 마이그레이션이 캡처 SV를 새로 채움
 *   M5   문서 정체성 부재 — 같은 clientID로 만든 **다른 문서**에 레코드를 들이댐
 *   M6   출처 계산 커버리지 — 블록에 인라인 노드(hardBreak)·mark 가 있을 때
 *   M8   흔한 편집 조작의 recall 행렬 (strict / textmove / phase1 / naive 비교)
 *
 * 이 파일은 tools/plane-editor/ 를 **읽기만** 한다 (수정·생성 없음).
 */
const ROOT = new URL('../../tools/plane-editor/', import.meta.url).pathname
const { openSession, attachFixtureAnnotations, buildTextIndex, posToOffset } =
  await import(ROOT + 'src/session.mjs')
const { resolveAnchors, POLICIES } = await import(ROOT + 'src/anchors.mjs')
const { itemFate, liveBlocks } = await import(ROOT + 'src/blocks.mjs')
const { downgradeAnchors, annotationRecord, STORE_VERSION } = await import(ROOT + 'src/store.mjs')
const Y = await import(ROOT + 'node_modules/yjs/dist/yjs.mjs')
const { ySyncPluginKey } = await import(ROOT + 'node_modules/y-prosemirror/src/y-prosemirror.js')
const { createHash } = await import('node:crypto')

const say = (o) => console.log(JSON.stringify(o))
const para = (t) => ({ type: 'paragraph', content: [{ type: 'text', text: t }] })
const docOf = (...texts) => ({ type: 'doc', content: texts.map(para) })
const sha = (bytes) => createHash('sha256').update(Buffer.from(bytes)).digest('hex')

const TWIN = 'The ledger records a disputed clause and then stops.'
const QUOTE = 'disputed clause'

const textOf = (session) => buildTextIndex(session.doc).text
const landedAt = (session, r) =>
  r.from === null ? null : posToOffset(buildTextIndex(session.doc), r.from)
function offsetsOf(text, needle) {
  const out = []
  let at = text.indexOf(needle)
  while (at !== -1) { out.push(at); at = text.indexOf(needle, at + 1) }
  return out
}
const blockRange = (session, index) => {
  const from = session.doc.resolve(0).posAtIndex(index)
  return { from, to: from + session.doc.child(index).nodeSize }
}
const deleteBlock = (session, index) => {
  const { from, to } = blockRange(session, index)
  session.dispatch((tr) => tr.delete(from, to))
}
/**
 * y-prosemirror 는 자기 binding 을 트랜잭션 origin 으로 쓴다. 그 origin 을 추적하지
 * 않으면 UndoManager 가 **아무것도 되돌리지 않는다**(조용히 통과 = 가짜 undo 실험).
 */
const makeUndo = (session) => {
  // y-prosemirror 는 ySyncPluginKey 를 트랜잭션 origin 으로 쓴다(실측). 이 origin 을
  // 추적하지 않으면 UndoManager 가 **아무것도 되돌리지 않는다** = 가짜 undo 실험이 된다.
  const undo = new Y.UndoManager(session.fragment, { trackedOrigins: new Set([ySyncPluginKey]) })
  return undo
}
/** 편집 결과를 새 세션으로 다시 열어(= 저장 후 재로드 레인) 해소한다. */
function reopen(session, docJSON) {
  const merged = session.encodeState()
  session.close()
  return openSession({ update: merged, clientID: 99, docJSON })
}
const docFromUpdate = (update) => {
  const d = new Y.Doc()
  Y.applyUpdate(d, update)
  return d
}
const moveBlockTwoTx = (session, index) => {
  const node = session.doc.child(index)
  deleteBlock(session, index)
  session.dispatch((tr) => tr.insert(session.doc.content.size, node))
}
const moveBlockOneTx = (session, index) => {
  const node = session.doc.child(index)
  const { from, to } = blockRange(session, index)
  session.dispatch((tr) => {
    tr.delete(from, to)
    return tr.insert(tr.doc.content.size, node)
  })
}

/* ================================================================== *
 * D3' — developer 진단 D3의 독립 재현 + 확장.
 *   주장: "블록 이동(cut+paste)과 블록 삭제+같은 문장 재타이핑은 Yjs 업데이트가
 *   byte 단위로 같다" -> 그래서 S6 복구(6/6)는 **물리적으로 불가능**하다.
 *   이동을 **두 트랜잭션**(스위트 S6 헬퍼의 모양)과 **한 트랜잭션**(편집기의 블록
 *   이동 명령/드래그 모양) 둘 다로 만들어 비교한다.
 * ================================================================== */
{
  const doc = docOf('Opening block of the probe document.', TWIN, 'Closing block of the probe document.')
  const variants = {}
  const run = (label, edit) => {
    const session = openSession({ clientID: 7, docJSON: doc })
    const before = session.encodeState()
    const entry = attachFixtureAnnotations(session, [{ id: 'd3', quote: QUOTE, body: 'x' }])[0]
    edit(session)
    const after = session.encodeState()
    const delta = Y.encodeStateAsUpdate(session.ydoc, Y.encodeStateVector(docFromUpdate(before)))
    const fate = itemFate(session.ydoc, entry.record.anchors.blockContext?.itemId).state
    const reload = reopen(session, doc)
    const strict = resolveAnchors(reload, entry.record.anchors)
    const index = buildTextIndex(reload.doc)
    variants[label] = {
      storedItemId: entry.record.anchors.blockContext?.itemId ?? null,
      fullStateSha: sha(after),
      deltaSha: sha(delta),
      docText: index.text,
      storedItemFate: fate,
      strictMethod: strict.method,
      strictRawStatus: strict.raw.status,
      strictReason: strict.reason,
      strictLandedOffset: landedAt(reload, strict),
      correctOffset: index.text.indexOf(QUOTE),
      recoveryStatus: strict.recovery ? strict.recovery.status : null,
    }
    reload.close()
  }
  run('move-2tx: delete then insert (suite S6 helper shape)', (s) => moveBlockTwoTx(s, 1))
  run('move-1tx: delete+insert in ONE transaction (editor move/drag shape)', (s) => moveBlockOneTx(s, 1))
  run('retype: delete block then type the same sentence', (s) => {
    deleteBlock(s, 1)
    s.dispatch((tr) => {
      const { schema } = s.doc.type
      return tr.insert(s.doc.content.size, schema.node('paragraph', null, schema.text(TWIN)))
    })
  })
  run('control: delete only', (s) => deleteBlock(s, 1))

  const moveTwo = variants['move-2tx: delete then insert (suite S6 helper shape)']
  const moveOne = variants['move-1tx: delete+insert in ONE transaction (editor move/drag shape)']
  const retype = variants['retype: delete block then type the same sentence']
  say({
    probe: 'D3prime move vs retype — is a block move really indistinguishable?',
    variants,
    twoTxMoveEqualsRetype: moveTwo.deltaSha === retype.deltaSha,
    oneTxMoveEqualsRetype: moveOne.deltaSha === retype.deltaSha,
    sameDocTextForAllThree: moveTwo.docText === retype.docText && moveOne.docText === retype.docText,
    oneTxKeepsBlockIdentity: moveOne.storedItemFate === 'live',
    oneTxAnchorSurvives: moveOne.strictMethod !== 'orphaned',
    verdict:
      moveTwo.deltaSha === retype.deltaSha && moveOne.deltaSha !== retype.deltaSha
        ? 'PARTLY REFUTED: 2-tx 이동만 재타이핑과 byte 동일하다. 1-tx 이동은 업데이트가 다르고 블록 정체성이 살아남는다'
        : moveTwo.deltaSha === retype.deltaSha
          ? 'CONFIRMED: 두 이동 모양 모두 재타이핑과 구분 불가'
          : 'REFUTED',
  })
}

/* ================================================================== *
 * D3'' — 1-tx 이동 뒤 **증명 가능한 정체성 증거**가 남아 있는지 직접 조회한다.
 *   규칙 C가 요구하는 세 조건(저장 itemId가 live / 그 블록 텍스트가 같음 / 저장
 *   오프셋에 exact)이 전부 성립하는데도 orphan 이라면, 막고 있는 것은 정체성 부재가
 *   아니라 **규칙 B(collapsed면 복구 금지)의 우선순위**다.
 * ================================================================== */
for (const [label, move] of [['move-1tx', moveBlockOneTx], ['move-2tx', moveBlockTwoTx]]) {
  const doc = docOf('Opening block of the probe document.', TWIN, 'Closing block of the probe document.')
  const session = openSession({ clientID: 7, docJSON: doc })
  const entry = attachFixtureAnnotations(session, [{ id: 'd3b', quote: QUOTE, body: 'x' }])[0]
  const context = entry.record.anchors.blockContext
  move(session, 1)
  const reload = reopen(session, doc)
  const { index, blocks } = liveBlocks(reload)
  const match = blocks.find((b) => b.itemId === context.itemId) ?? null
  const strict = resolveAnchors(reload, entry.record.anchors)
  const quoteAtStoredOffset =
    match && index.text.slice(match.textFrom + context.offset, match.textFrom + context.offset + QUOTE.length)
  say({
    probe: `D3prime2 identity evidence available after ${label}`,
    storedItemId: context.itemId,
    storedBlockText: context.text,
    storedOffset: context.offset,
    itemFate: itemFate(reload.ydoc, context.itemId).state,
    liveBlockWithStoredItemId: match ? { itemId: match.itemId, text: match.text, textFrom: match.textFrom } : null,
    blockTextUnchanged: match ? match.text === context.text : false,
    quoteAtStoredOffset: quoteAtStoredOffset ?? null,
    identityEvidenceComplete:
      Boolean(match) && match.text === context.text && quoteAtStoredOffset === QUOTE,
    strictMethod: strict.method,
    strictRawStatus: strict.raw.status,
    strictReason: strict.reason,
    blockedBy: strict.method === 'orphaned' ? strict.reason : null,
    correctOffset: index.text.indexOf(QUOTE),
  })
  reload.close()
}

/* ================================================================== *
 * M1 — 블록 **분할**(split). 앵커가 든 블록을 둘로 쪼갠 뒤 앵커 쪽 절반을 지운다.
 * ================================================================== */
for (const where of ['before-anchor', 'after-anchor']) {
  const doc = docOf('Opening block of the probe document.', TWIN, 'Closing block of the probe document.')
  const session = openSession({ clientID: 1, docJSON: doc })
  const entry = attachFixtureAnnotations(session, [{ id: 'm1', quote: QUOTE, body: 'split' }])[0]
  const t = entry.target
  const storedItemId = entry.record.anchors.blockContext.itemId
  session.dispatch((tr) => tr.split(where === 'before-anchor' ? t.from : t.to))
  const halves = []
  session.doc.forEach((node) => halves.push(node.textContent))
  const anchorHalf = halves.findIndex((text) => text.includes(QUOTE))
  deleteBlock(session, anchorHalf)
  const reload = reopen(session, doc)
  const r = resolveAnchors(reload, entry.record.anchors)
  say({
    probe: `M1 split block (${where}) then delete the half that carried the anchor`,
    storedItemId,
    halvesAfterSplit: halves,
    storedItemFateAfterEdit: itemFate(reload.ydoc, storedItemId).state,
    method: r.method,
    rawStatus: r.raw.status,
    recovery: r.recovery,
    attachedTo: r.text,
    landedOffset: landedAt(reload, r),
    quoteOccurrences: offsetsOf(textOf(reload), QUOTE),
    docAfter: textOf(reload),
    misResolved: r.method !== 'orphaned',
  })
  reload.close()
}

/* ================================================================== *
 * M1b — 분할만 하는 **정상 편집**(문단 중간에서 Enter) = recall 축.
 * ================================================================== */
for (const where of ['at-anchor-start', 'five-chars-before-anchor', 'five-chars-after-anchor']) {
  const doc = docOf('Opening block of the probe document.', TWIN, 'Closing block of the probe document.')
  const session = openSession({ clientID: 1, docJSON: doc })
  const entry = attachFixtureAnnotations(session, [{ id: 'm1b', quote: QUOTE, body: 'split only' }])[0]
  const t = entry.target
  const storedItemId = entry.record.anchors.blockContext.itemId
  const at =
    where === 'at-anchor-start' ? t.from : where === 'five-chars-before-anchor' ? t.from - 5 : t.to + 5
  session.dispatch((tr) => tr.split(at))
  const reload = reopen(session, doc)
  const index = buildTextIndex(reload.doc)
  const out = {}
  for (const [name, policy] of Object.entries(POLICIES)) {
    const r = resolveAnchors(reload, entry.record.anchors, { policy, counterfactuals: false })
    out[name] = { method: r.method, landed: landedAt(reload, r), text: r.text }
  }
  say({
    probe: `M1b split the anchored block (${where}) — normal edit, recall axis`,
    storedItemId,
    storedItemFateAfterEdit: itemFate(reload.ydoc, storedItemId).state,
    rawStatusStrict: resolveAnchors(reload, entry.record.anchors).raw.status,
    policies: out,
    quoteOccurrences: offsetsOf(index.text, QUOTE),
    survivedStrict: out.strict.method !== 'orphaned',
    docAfter: index.text,
  })
  reload.close()
}

/* ================================================================== *
 * M2 — 블록 **병합**(join). 두 블록 사이 경계를 지운다 (Backspace/Delete).
 * ================================================================== */
for (const direction of ['anchor-block-absorbs-next', 'anchor-block-is-absorbed']) {
  const doc = docOf('Opening block of the probe document.', TWIN, 'Tail block that will be merged.', 'Closing block.')
  const session = openSession({ clientID: 1, docJSON: doc })
  const entry = attachFixtureAnnotations(session, [{ id: 'm2', quote: QUOTE, body: 'join' }])[0]
  const t = entry.target
  const storedItemId = entry.record.anchors.blockContext.itemId
  const boundary =
    direction === 'anchor-block-absorbs-next'
      ? blockRange(session, t.blockIndex).to
      : blockRange(session, t.blockIndex).from
  session.dispatch((tr) => tr.delete(boundary - 1, boundary + 1))
  const reload = reopen(session, doc)
  const r = resolveAnchors(reload, entry.record.anchors)
  const phase1 = resolveAnchors(reload, entry.record.anchors, { policy: POLICIES.phase1 })
  const index = buildTextIndex(reload.doc)
  say({
    probe: `M2 join blocks (${direction})`,
    storedItemId,
    storedItemFateAfterEdit: itemFate(reload.ydoc, storedItemId).state,
    method: r.method,
    rawStatus: r.raw.status,
    guard: r.guard,
    recovery: r.recovery,
    attachedTo: r.text,
    landedOffset: landedAt(reload, r),
    correctOffset: index.text.indexOf(QUOTE),
    misResolved: r.method !== 'orphaned' && landedAt(reload, r) !== index.text.indexOf(QUOTE),
    survived: r.method !== 'orphaned',
    phase1: { method: phase1.method, text: phase1.text, landedOffset: landedAt(reload, phase1) },
    lostBecauseOfHardening: r.method === 'orphaned' && phase1.method !== 'orphaned',
    docAfter: index.text,
  })
  reload.close()
}

/* ================================================================== *
 * M3 — undo. 앵커 블록을 지운 뒤 **되돌리면** 문서 텍스트는 원래대로 돌아온다.
 *      (a) 되살아난 블록에 앵커가 다시 붙는가 = recall
 *      (b) 쌍둥이가 있을 때 **되살아난 남의 블록**에 붙지는 않는가 = precision
 *      undo 가 실제로 되돌렸는지(가짜 실험이 아닌지)를 문서 텍스트로 검증한다.
 * ================================================================== */
for (const shape of ['delete-anchor-block-then-undo', 'delete-twin-block-then-undo', 'delete-anchor-text-then-undo']) {
  const doc = docOf('Opening block of the probe document.', TWIN, 'A neutral middle block of filler text.', TWIN, 'Closing block.')
  const session = openSession({ clientID: 1, docJSON: doc })
  const original = textOf(session)
  const entry = attachFixtureAnnotations(session, [{ id: 'm3', quote: QUOTE, occurrence: 0, body: 'undo' }])[0]
  const t = entry.target
  const storedItemId = entry.record.anchors.blockContext.itemId
  const undo = makeUndo(session)
  if (shape === 'delete-anchor-block-then-undo') deleteBlock(session, t.blockIndex)
  else if (shape === 'delete-twin-block-then-undo') deleteBlock(session, 3)
  else session.dispatch((tr) => tr.delete(t.from, t.to))
  const textAfterDelete = textOf(session)
  undo.undo()
  const textAfterUndo = textOf(session)
  const reload = reopen(session, doc)
  const index = buildTextIndex(reload.doc)
  const correct = offsetsOf(index.text, QUOTE)
  const out = {}
  for (const [name, policy] of Object.entries(POLICIES)) {
    const r = resolveAnchors(reload, entry.record.anchors, { policy, counterfactuals: false })
    out[name] = { method: r.method, landed: landedAt(reload, r) }
  }
  const strict = resolveAnchors(reload, entry.record.anchors)
  say({
    probe: `M3 undo (${shape})`,
    undoActuallyReverted: textAfterUndo === original,
    textAfterDeleteDiffered: textAfterDelete !== original,
    storedItemId,
    storedItemFateAfterUndo: itemFate(reload.ydoc, storedItemId).state,
    method: strict.method,
    rawStatus: strict.raw.status,
    recovery: strict.recovery,
    attachedTo: strict.text,
    landedOffset: landedAt(reload, strict),
    originalAnchorOffset: t.textFrom,
    quoteOccurrences: correct,
    policies: out,
    survived: strict.method !== 'orphaned',
    misResolved: strict.method !== 'orphaned' && landedAt(reload, strict) !== t.textFrom,
    docAfter: index.text,
  })
  reload.close()
}

/* ================================================================== *
 * M4 — v1 레코드를 v2로 **수동 승격**. 파일의 version 만 2로 바꾸면 migrateRecord가
 *      강등(downgradeAnchors)을 건너뛴다. 두 모양을 누른다.
 *        (a) blockContext 는 있는데 capture 가 없는 레코드 (2세대 v1)
 *        (b) 마이그레이션이 capture.stateVector 를 **지금 상태**로 새로 채운 레코드
 * ================================================================== */
for (const shape of ['v1-shaped-record-labelled-v2', 'capture-state-vector-refilled-at-migration']) {
  const doc = docOf('Opening block of the probe document.', 'Critical failure of the anchor engine hides in plain sight.', 'Closing block.')
  const session = openSession({ clientID: 1, docJSON: doc })
  const entry = attachFixtureAnnotations(session, [{ id: 'm4', quote: 'Critical failure', body: 'legacy' }])[0]
  const t = entry.target
  session.dispatch((tr) => tr.delete(t.from, t.to))
  session.dispatch((tr) => tr.insertText('Cure', t.from))
  const merged = session.encodeState()
  const refilledSV = Buffer.from(Y.encodeStateVector(session.ydoc)).toString('base64')
  session.close()
  const reload = openSession({ update: merged, clientID: 99, docJSON: doc })

  const stored = JSON.parse(JSON.stringify(annotationRecord(entry.record)))
  const anchors =
    shape === 'v1-shaped-record-labelled-v2'
      ? { ...stored.anchors, capture: null }
      : { ...stored.anchors, capture: { stateVector: refilledSV } }
  const r = resolveAnchors(reload, anchors)
  say({
    probe: `M4 hand-promoted record (${shape}) + in-place replacement "Critical failure" -> "Cure"`,
    storeVersionInCode: STORE_VERSION,
    hasCapture: Boolean(anchors.capture),
    hasBlockContext: Boolean(anchors.blockContext),
    method: r.method,
    rawStatus: r.raw.status,
    guard: r.guard,
    attachedTo: r.text,
    reason: r.reason,
    misResolved: r.method !== 'orphaned',
    docAfter: textOf(reload),
  })
  reload.close()
}

/* ================================================================== *
 * M4b — 정상 경로 대조: 같은 레코드를 v1 로 로드(loadStore 가 강등)했을 때.
 * ================================================================== */
{
  const doc = docOf('Opening block of the probe document.', 'Critical failure of the anchor engine hides in plain sight.', 'Closing block.')
  const session = openSession({ clientID: 1, docJSON: doc })
  const entry = attachFixtureAnnotations(session, [{ id: 'm4b', quote: 'Critical failure', body: 'legacy' }])[0]
  const t = entry.target
  session.dispatch((tr) => tr.delete(t.from, t.to))
  session.dispatch((tr) => tr.insertText('Cure', t.from))
  const reload = reopen(session, doc)
  const downgraded = downgradeAnchors(JSON.parse(JSON.stringify(annotationRecord(entry.record).anchors)), 1)
  const r = resolveAnchors(reload, downgraded)
  say({
    probe: 'M4b control: same record loaded as v1 (downgraded by loadStore)',
    legacy: downgraded.legacy,
    method: r.method,
    guard: r.guard,
    reason: r.reason,
    misResolved: r.method !== 'orphaned',
  })
  reload.close()
}

/* ================================================================== *
 * M5 — **문서 정체성 부재**. 레코드에는 "어느 문서의 앵커인가"가 없다.
 *      같은 clientID 로 만든 **다른 문서**에 레코드를 들이대면 어떻게 되는가?
 *      (이 프로토타입은 clientID 를 호출부가 고정 상수로 준다 = 충돌이 기본값이다.)
 * ================================================================== */
for (const shape of ['identical-reimport-same-clientID', 'forked-document-same-clientID', 'different-document-different-clientID']) {
  const docA = docOf('Opening block of the probe document.', TWIN, 'Closing block of document A.')
  const docB =
    shape === 'identical-reimport-same-clientID'
      ? docA
      : docOf('Opening block of the probe document.', TWIN, 'A completely different document B tail.', 'Another B-only block.')
  const a = openSession({ clientID: 1, docJSON: docA })
  const entry = attachFixtureAnnotations(a, [{ id: 'm5', quote: QUOTE, body: 'cross-doc' }])[0]
  a.close()
  const b = openSession({ clientID: shape === 'different-document-different-clientID' ? 4242 : 1, docJSON: docB })
  const r = resolveAnchors(b, entry.record.anchors)
  const index = buildTextIndex(b.doc)
  say({
    probe: `M5 apply a record from document A to ${shape}`,
    storedItemId: entry.record.anchors.blockContext.itemId,
    storedItemFateInB: itemFate(b.ydoc, entry.record.anchors.blockContext.itemId).state,
    method: r.method,
    rawStatus: r.raw.status,
    attachedTo: r.text,
    landedOffset: landedAt(b, r),
    attachedToAnotherDocument: r.method !== 'orphaned',
    reason: r.reason,
    docB: index.text,
  })
  b.close()
}

/* ================================================================== *
 * M6 — 출처 계산 커버리지. `characterOrigins` 는 블록의 문자 run 합이 블록 텍스트
 *      길이와 같을 때만 known 이다. 인라인 노드(hardBreak)·mark 가 섞이면 커버리지가
 *      깨질 수 있고, 그러면 규칙 A는 **거절**이 기본값이라 정상 편집이 orphan 이 된다.
 * ================================================================== */
for (const shape of ['hard-break-in-block', 'bold-mark-inside-anchor', 'plain-control']) {
  const sentence = 'Critical failure of the anchor engine hides in plain sight.'
  let blockJSON
  if (shape === 'hard-break-in-block') {
    blockJSON = {
      type: 'paragraph',
      content: [
        { type: 'text', text: 'Critical failure of the anchor engine' },
        { type: 'hardBreak' },
        { type: 'text', text: ' hides in plain sight.' },
      ],
    }
  } else if (shape === 'bold-mark-inside-anchor') {
    blockJSON = {
      type: 'paragraph',
      content: [
        { type: 'text', text: 'Critical ' },
        { type: 'text', marks: [{ type: 'bold' }], text: 'failure' },
        { type: 'text', text: ' of the anchor engine hides in plain sight.' },
      ],
    }
  } else {
    blockJSON = para(sentence)
  }
  const doc = { type: 'doc', content: [para('Opening block of the probe document.'), blockJSON, para('Closing block.')] }
  const session = openSession({ clientID: 1, docJSON: doc })
  const entry = attachFixtureAnnotations(session, [{ id: 'm6', quote: 'Critical failure', body: 'coverage' }])[0]
  const t = entry.target
  session.dispatch((tr) => tr.insertText(' safety', t.from + 'Critical'.length))
  const reload = reopen(session, doc)
  const strict = resolveAnchors(reload, entry.record.anchors)
  const phase1 = resolveAnchors(reload, entry.record.anchors, { policy: POLICIES.phase1 })
  say({
    probe: `M6 origin coverage (${shape}) + in-range insertion`,
    method: strict.method,
    guard: strict.guard,
    text: strict.text,
    phase1Text: phase1.text,
    survived: strict.method !== 'orphaned',
    lostBecauseOfHardening: strict.method === 'orphaned' && phase1.method !== 'orphaned',
    docAfter: textOf(reload),
  })
  reload.close()
}

/* ================================================================== *
 * M7 — 대조군: 정상 범위 안 삽입은 살아남고, 순수 블록 삭제는 orphan 이어야 한다.
 * ================================================================== */
{
  const doc = docOf('Opening block of the probe document.', TWIN, 'Closing block.')
  for (const [label, edit, expect] of [
    ['control in-range insertion (expect survive)', (s, t) => s.dispatch((tr) => tr.insertText('very ', t.from)), 'survive'],
    ['control plain block delete (expect orphan)', (s, t) => deleteBlock(s, t.blockIndex), 'orphan'],
  ]) {
    const session = openSession({ clientID: 1, docJSON: doc })
    const entry = attachFixtureAnnotations(session, [{ id: 'm7', quote: QUOTE, body: 'control' }])[0]
    edit(session, entry.target)
    const reload = reopen(session, doc)
    const r = resolveAnchors(reload, entry.record.anchors)
    say({
      probe: `M7 ${label}`,
      method: r.method,
      text: r.text,
      matchesExpectation: expect === 'survive' ? r.method !== 'orphaned' : r.method === 'orphaned',
    })
    reload.close()
  }
}

/* ================================================================== *
 * M8 — 흔한 편집 조작의 **recall 행렬**. 각 조작 뒤 앵커 텍스트가 문서에 그대로
 *      남아 있는데도 strict 가 orphan 을 내는지, 그리고 그때 대조 정책이 **옳은
 *      자리**에 붙는지(=포기한 복구가 실제로 옳았을 것인지)를 같이 잰다.
 *      쌍둥이가 **없는** 문서를 써서 "옳은 자리"가 유일하게 정해지게 한다.
 * ================================================================== */
{
  const ops = [
    ['move block (2 transactions = cut+paste)', (s, t) => moveBlockTwoTx(s, t.blockIndex)],
    ['move block (1 transaction = editor move command)', (s, t) => moveBlockOneTx(s, t.blockIndex)],
    ['join into previous block (Backspace at line start)', (s, t) => {
      const boundary = blockRange(s, t.blockIndex).from
      s.dispatch((tr) => tr.delete(boundary - 1, boundary + 1))
    }],
    ['delete block then undo', (s, t) => {
      const undo = makeUndo(s)
      deleteBlock(s, t.blockIndex)
      undo.undo()
    }],
    ['split at anchor start (Enter)', (s, t) => s.dispatch((tr) => tr.split(t.from))],
    ['insert a word inside the anchor', (s, t) => s.dispatch((tr) => tr.insertText('very ', t.from))],
  ]
  const rows = []
  for (const [label, edit] of ops) {
    const doc = docOf('Opening block of the probe document.', TWIN, 'A neutral middle block of filler text.', 'Closing block.')
    const session = openSession({ clientID: 1, docJSON: doc })
    const entry = attachFixtureAnnotations(session, [{ id: 'm8', quote: QUOTE, body: 'recall' }])[0]
    edit(session, entry.target)
    const reload = reopen(session, doc)
    const index = buildTextIndex(reload.doc)
    const occurrences = offsetsOf(index.text, QUOTE)
    const out = {}
    for (const [name, policy] of Object.entries(POLICIES)) {
      const r = resolveAnchors(reload, entry.record.anchors, { policy, counterfactuals: false })
      const landed = landedAt(reload, r)
      out[name] = {
        method: r.method,
        landed,
        correct: r.method !== 'orphaned' && occurrences.includes(landed),
      }
    }
    rows.push({
      op: label,
      quoteStillInDocument: occurrences.length > 0,
      occurrences,
      ...out,
      strictLostARecoveryThatWouldHaveBeenCorrect:
        out.strict.method === 'orphaned' && (out.textmove.correct || out.phase1.correct || out.naive.correct),
    })
    reload.close()
  }
  say({ probe: 'M8 recall matrix over common editing operations', rows })
  say({
    probe: 'M8 summary',
    operations: rows.length,
    strictSurvived: rows.filter((r) => r.strict.method !== 'orphaned').length,
    strictOrphanedWhileQuoteStillPresent: rows.filter(
      (r) => r.strict.method === 'orphaned' && r.quoteStillInDocument,
    ).length,
    lostRecoveriesThatWouldHaveBeenCorrect: rows.filter((r) => r.strictLostARecoveryThatWouldHaveBeenCorrect).length,
    strictMisResolutions: rows.filter((r) => r.strict.method !== 'orphaned' && !r.strict.correct).length,
  })
}

/* ================================================================== *
 * M9 — **element item 재사용(structural re-diff)**. y-prosemirror 는 트랜잭션마다
 *      PM 문서와 Y 트리를 diff 해 맞춘다. 블록 하나를 지우면 남은 이웃 블록이
 *      **지워진 블록의 element item 을 물려받고**, 두 블록이 앞부분을 공유하면
 *      **앵커의 문자 item 까지 그대로 살아남는다**. 그러면
 *        - 저장 itemId 는 live (규칙 C의 (1) 통과)
 *        - RelativePosition 은 resolved (규칙 C를 아예 안 탄다)
 *        - 범위 안 문자는 preexisting (규칙 A의 문자 출처 항 통과)
 *      셋이 동시에 성립해 **지워진 블록의 앵커가 살아남은 이웃 블록에 붙는다**.
 *      이것은 C1b가 닫았다고 주장하는 계열("블록이 사라지면 orphan")의 정면 반례다.
 * ================================================================== */
{
  const QUOTED = 'disputed clause'
  const A = 'The ledger records a disputed clause and then stops.'
  const cases = [
    {
      id: 'M9a',
      note: '앵커 블록 A 를 지운다. 바로 아래 이웃 B 는 A 와 앞부분(앵커 포함)을 공유한다',
      docTexts: ['Opening block of the probe document.', A, 'The ledger records a disputed clause and then continues elsewhere.', 'Closing block.'],
      anchorBlock: 1,
      deleteBlock: 1,
    },
    {
      id: 'M9b',
      note: '순서 반대 — 공유 이웃이 앵커 블록 **위**에 있다',
      docTexts: ['Opening block of the probe document.', 'The ledger records a disputed clause and then continues elsewhere.', A, 'Closing block.'],
      anchorBlock: 2,
      deleteBlock: 2,
    },
    {
      id: 'M9c',
      note: '대조군 — 이웃이 앵커 문구를 공유하지 않는다 (orphan 이어야 정상)',
      docTexts: ['Opening block of the probe document.', A, 'A completely unrelated neighbouring block.', 'Closing block.'],
      anchorBlock: 1,
      deleteBlock: 1,
    },
    {
      id: 'M9d',
      note: '대조군 — 이웃 블록을 지운다 (앵커는 제자리에서 살아남아야 정상)',
      docTexts: ['Opening block of the probe document.', A, 'The ledger records a disputed clause and then continues elsewhere.', 'Closing block.'],
      anchorBlock: 1,
      deleteBlock: 2,
    },
  ]
  for (const c of cases) {
    const doc = docOf(...c.docTexts)
    const session = openSession({ clientID: 1, docJSON: doc })
    const entry = attachFixtureAnnotations(session, [{ id: 'm9', quote: QUOTED, occurrence: c.anchorBlock === 2 ? 1 : 0, body: 'rediff' }])[0]
    const storedItemId = entry.record.anchors.blockContext.itemId
    const storedBlockText = entry.record.anchors.blockContext.text
    deleteBlock(session, c.deleteBlock)
    const reload = reopen(session, doc)
    const index = buildTextIndex(reload.doc)
    const { blocks } = liveBlocks(reload)
    const owner = blocks.find((b) => b.itemId === storedItemId) ?? null
    const r = resolveAnchors(reload, entry.record.anchors)
    const landed = landedAt(reload, r)
    // 앵커가 붙은 자리가 **저장된 블록 텍스트를 가진 블록**인지 (= 원래 블록인지)
    const landedBlock = landed === null ? null : blocks.find((b) => b.textFrom <= landed && landed < b.textTo) ?? null
    const anchorBlockSurvives = c.deleteBlock !== c.anchorBlock
    say({
      probe: `${c.id} delete a block whose neighbour shares the anchored prefix`,
      note: c.note,
      storedItemId,
      storedBlockText,
      itemFateAfterEdit: itemFate(reload.ydoc, storedItemId).state,
      elementNowHolds: owner ? owner.text : null,
      elementWasRepurposed: Boolean(owner) && owner.text !== storedBlockText,
      method: r.method,
      rawStatus: r.raw.status,
      guard: r.guard,
      attachedTo: r.text,
      landedOffset: landed,
      landedBlockText: landedBlock ? landedBlock.text : null,
      expectation: anchorBlockSurvives ? 'survive in the original block' : 'orphan (the annotated block was deleted)',
      misResolved: !anchorBlockSurvives && r.method !== 'orphaned',
      lostRecall: anchorBlockSurvives && r.method === 'orphaned',
      docAfter: index.text,
    })
    reload.close()
  }
}
