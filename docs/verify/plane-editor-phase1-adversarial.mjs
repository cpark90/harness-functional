/**
 * vnv 독립 적대 케이스 프로브 — Phase 1 앵커 엔진 (증거 스크립트).
 *
 *   node docs/verify/plane-editor-phase1-adversarial.mjs
 *
 * 스위트(`tools/plane-editor/run-suite.mjs`)는 고정 시나리오 S1–S8만 돌리고,
 * 해소 결과를 **텍스트 동일성**으로만 채점한다. 이 프로브는 그 두 가지를 벗어나
 * ① 같은 문자열의 다른 출현에 붙었는지(= 위치로 채점) ② 스위트에 없는 편집 모양에서
 * 오해소가 나는지를 직접 잰다. 판정 근거는 `docs/verify/plane-editor-phase1-verify.md`.
 *
 * 이 파일은 tools/plane-editor/ 를 읽기만 한다 (수정·생성 없음).
 */
const ROOT = new URL('../../tools/plane-editor/', import.meta.url).pathname
const Y = await import(ROOT + 'node_modules/yjs/dist/yjs.mjs')
const { openSession, attachFixtureAnnotations, buildTextIndex, posToOffset } = await import(ROOT + 'src/session.mjs')
const { resolveAnchors } = await import(ROOT + 'src/anchors.mjs')

const say = (o) => console.log(JSON.stringify(o))
const para = (t) => ({ type: 'paragraph', content: [{ type: 'text', text: t }] })
const docOf = (...texts) => ({ type: 'doc', content: texts.map(para) })
const VICTIM = 'Wrong resolution is worse than an honest orphan record.'
const TWIN = 'Keeping an honest orphan record beats a silent mis-attachment.'

function offsets(text, needle) {
  const res = []
  let at = text.indexOf(needle)
  while (at !== -1) { res.push(at); at = text.indexOf(needle, at + 1) }
  return res
}
function resolvedOffset(session, resolution) {
  if (resolution.from === null) return null
  return posToOffset(buildTextIndex(session.doc), resolution.from)
}

/* P1 — 스위트의 S6(블록 이동)을 함정 앵커 a6로 재현하되 **위치**로 채점한다. */
{
  const session = openSession({ clientID: 1 })
  const entry = attachFixtureAnnotations(session).find((e) => e.id === 'a6')
  const t = entry.target
  const node = session.doc.child(t.blockIndex)
  session.dispatch((tr) => tr.delete(t.blockOuterFrom, t.blockOuterTo))
  session.dispatch((tr) => tr.insert(session.doc.content.size, node))
  const merged = session.encodeState()
  session.close()
  const reload = openSession({ update: merged, clientID: 2 })
  const r = resolveAnchors(reload, entry.record.anchors)
  const text = buildTextIndex(reload.doc).text
  const trueOffset = text.indexOf(VICTIM) + VICTIM.indexOf('honest orphan')
  const got = resolvedOffset(reload, r)
  say({ probe: 'P1 S6/a6 position-scored', method: r.method, occurrences: offsets(text, 'honest orphan'), trueOffset, got, correctOccurrence: got === trueOffset })
  reload.close()
}

/* P2 — 같은 문장이 두 번 나오는 문서에서 앵커 블록을 cut+paste (RelativePosition 사망). */
{
  const dup = 'The ledger records a disputed clause and then stops.'
  const doc = docOf('Opening block of the probe document.', dup, 'A neutral middle block of filler text.', dup, 'Closing block of the probe document.')
  const session = openSession({ clientID: 1, docJSON: doc })
  const entry = attachFixtureAnnotations(session, [{ id: 'x1', quote: 'disputed clause', occurrence: 0, body: 'dup-context anchor' }])[0]
  const t = entry.target
  const node = session.doc.child(t.blockIndex)
  session.dispatch((tr) => tr.delete(t.blockOuterFrom, t.blockOuterTo))
  session.dispatch((tr) => tr.insert(session.doc.content.size, node))
  const merged = session.encodeState()
  session.close()
  const reload = openSession({ update: merged, clientID: 2, docJSON: doc })
  const r = resolveAnchors(reload, entry.record.anchors)
  const text = buildTextIndex(reload.doc).text
  const occ = offsets(text, 'disputed clause')
  const got = resolvedOffset(reload, r)
  say({ probe: 'P2 duplicate quote + block move', method: r.method, rawStatus: r.raw.status, occurrences: occ, trueOffset: occ[occ.length - 1], got, correctOccurrence: got === occ[occ.length - 1] })
  reload.close()
}

/* P3 — [CONFIRMED 결함] 앵커가 든 블록을 **통째로 삭제**. 같은 문자열이 남아 있으면
 *       RelativePosition은 collapsed가 아니라 unresolved로 죽고, tombstone 규칙이
 *       발동하지 않아 quote 복구가 남의 문장에 붙는다. */
for (const [label, twin] of [['distinct-context', TWIN], ['identical-context', VICTIM]]) {
  const doc = docOf('Opening block of the probe document.', VICTIM, 'A neutral middle block of filler text.', twin)
  const session = openSession({ clientID: 1, docJSON: doc })
  const entry = attachFixtureAnnotations(session, [{ id: 'x2', quote: 'honest orphan', occurrence: 0, body: 'block-delete victim' }])[0]
  const t = entry.target
  session.dispatch((tr) => tr.delete(t.blockOuterFrom, t.blockOuterTo))
  const merged = session.encodeState()
  session.close()
  const reload = openSession({ update: merged, clientID: 2, docJSON: doc })
  const r = resolveAnchors(reload, entry.record.anchors)
  say({
    probe: `P3 block-delete + surviving twin (${label})`,
    method: r.method, rawStatus: r.raw.status, quote: r.quote,
    misResolved: r.method !== 'orphaned', attachedTo: r.text,
    docAfter: buildTextIndex(reload.doc).text,
  })
  reload.close()
}

/* P4 — [CONFIRMED 결함] 앵커 텍스트를 그 자리에서 무관한 텍스트로 교체.
 *       affixGuard는 `head > 0 || tail > 0` 이라 한 글자만 겹쳐도 통과한다. */
for (const replacement of ['Amazing unrelated content here', 'Zebra unrelated content here']) {
  const doc = docOf('Opening block of the probe document.', 'Alpha beta gamma delta epsilon zeta eta theta.', 'Closing block of the probe document.')
  const session = openSession({ clientID: 1, docJSON: doc })
  const entry = attachFixtureAnnotations(session, [{ id: 'x3', quote: 'Alpha beta', occurrence: 0, body: 'replaced-in-place anchor' }])[0]
  const t = entry.target
  session.dispatch((tr) => tr.delete(t.from, t.to))
  session.dispatch((tr) => tr.insertText(replacement, t.from))
  const merged = session.encodeState()
  session.close()
  const reload = openSession({ update: merged, clientID: 2, docJSON: doc })
  const r = resolveAnchors(reload, entry.record.anchors)
  say({
    probe: `P4 replace-in-place (${replacement.split(' ')[0]})`,
    method: r.method, rawStatus: r.raw.status, guard: r.guard,
    misResolved: r.method !== 'orphaned', attachedTo: r.text,
  })
  reload.close()
}

/* P5 — S5와 같은 텍스트 범위 삭제 + 문맥까지 똑같은 쌍둥이 문장. tombstone 규칙 확인. */
{
  const doc = docOf('Opening block of the probe document.', VICTIM, VICTIM)
  const session = openSession({ clientID: 1, docJSON: doc })
  const entry = attachFixtureAnnotations(session, [{ id: 'x4', quote: 'honest orphan', occurrence: 0, body: 'twin-context S5' }])[0]
  session.dispatch((tr) => tr.delete(entry.target.from, entry.target.to))
  const merged = session.encodeState()
  session.close()
  const reload = openSession({ update: merged, clientID: 2, docJSON: doc })
  const r = resolveAnchors(reload, entry.record.anchors)
  const naive = resolveAnchors(reload, entry.record.anchors, { quoteOnTombstone: true })
  say({ probe: 'P5 S5-delete + identical-context twin', method: r.method, rawStatus: r.raw.status, misResolved: r.method !== 'orphaned', naiveMethod: naive.method, naiveText: naive.text })
  reload.close()
}

/* P6 — 중첩 노드(list item / code block)에서도 앵커가 도는가 (스위트 fixture는 문단뿐). */
{
  const doc = {
    type: 'doc',
    content: [
      para('Opening block of the probe document.'),
      { type: 'bulletList', content: [
        { type: 'listItem', content: [para('First item mentions a disputed clause here.')] },
        { type: 'listItem', content: [para('Second item is plain filler text.')] },
      ] },
      { type: 'codeBlock', content: [{ type: 'text', text: 'const answer = computeValue(input)' }] },
    ],
  }
  for (const [label, quote, edit] of [
    ['list-item / insert-before', 'disputed clause', 'insert'],
    ['list-item / delete-anchor', 'disputed clause', 'delete'],
    ['code-block / insert-before', 'computeValue', 'insert'],
    ['code-block / delete-anchor', 'computeValue', 'delete'],
  ]) {
    const session = openSession({ clientID: 1, docJSON: doc })
    const entry = attachFixtureAnnotations(session, [{ id: 'n1', quote, occurrence: 0, body: 'nested anchor' }])[0]
    const t = entry.target
    if (edit === 'insert') session.dispatch((tr) => tr.insertText('[PRE] ', t.from))
    else session.dispatch((tr) => tr.delete(t.from, t.to))
    const merged = session.encodeState()
    session.close()
    const reload = openSession({ update: merged, clientID: 2, docJSON: doc })
    const r = resolveAnchors(reload, entry.record.anchors)
    say({ probe: `P6 ${label}`, method: r.method, resolved: r.text, ok: edit === 'insert' ? r.text === quote : r.method === 'orphaned' })
    reload.close()
  }
}

/* P7 — P3를 "Yjs delete set을 보면 되지 않나"로 고칠 수 있는지 확인.
 *       블록 삭제와 블록 이동 모두 원 item이 tombstone이 되므로 구분이 안 된다. */
for (const mode of ['block-delete', 'block-move']) {
  const doc = docOf('Opening block of the probe document.', VICTIM, TWIN)
  const session = openSession({ clientID: 1, docJSON: doc })
  const entry = attachFixtureAnnotations(session, [{ id: 'z1', quote: 'honest orphan', occurrence: 0, body: 'probe' }])[0]
  const t = entry.target
  const node = session.doc.child(t.blockIndex)
  session.dispatch((tr) => tr.delete(t.blockOuterFrom, t.blockOuterTo))
  if (mode === 'block-move') session.dispatch((tr) => tr.insert(session.doc.content.size, node))
  const merged = session.encodeState()
  session.close()
  const reload = openSession({ update: merged, clientID: 2, docJSON: doc })
  const r = resolveAnchors(reload, entry.record.anchors)
  const rp = Y.decodeRelativePosition(new Uint8Array(Buffer.from(entry.record.anchors.relativePosition.start, 'base64')))
  const ds = Y.createDeleteSetFromStructStore(reload.ydoc.store)
  say({ probe: `P7 ${mode}`, method: r.method, rawStatus: r.raw.status, yjsItemDeleted: rp.item ? Y.isDeleted(ds, rp.item) : null })
  reload.close()
}
