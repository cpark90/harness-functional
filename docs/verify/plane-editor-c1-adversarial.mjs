/**
 * vnv 독립 적대 프로브 (C1 판정) — 앵커 오해소 강화 규칙을 **우회**하는 케이스.
 *
 *   node docs/verify/plane-editor-c1-adversarial.mjs
 *
 * 대상: `tools/plane-editor/src/{anchors,blocks}.mjs`의 강화 3종
 *   (A) 구조적 affix guard = 문자열 구조 + **문자 출처**(캡처 시점부터 있던 Yjs 문자)
 *   (B) 삭제 증거(collapsed / resolved+guard 거절 / error)면 복구 금지
 *   (C) `unresolved`일 때만, "저장된 블록 텍스트와 같고 캡처 이후 새로 생긴 블록이
 *       유일할 때"만 moved-block 복구
 *
 * 스위트 S9·S10은 이 규칙들이 "지운 자리"를 막는지만 누른다. 이 프로브는 규칙의
 * **전제**를 무너뜨리는 편집을 주입한다: 블록 정체성이 다른 블록으로 옮겨가는 경우,
 * 문자 출처를 알 수 없는 경우, 같은 텍스트 블록이 새로 만들어지는 경우.
 *
 * 이 파일은 tools/plane-editor/ 를 읽기만 한다 (수정·생성 없음).
 */
const ROOT = new URL('../../tools/plane-editor/', import.meta.url).pathname
const { openSession, attachFixtureAnnotations, buildTextIndex, posToOffset, offsetToPos } =
  await import(ROOT + 'src/session.mjs')
const { resolveAnchors, captureAnchors } = await import(ROOT + 'src/anchors.mjs')

const say = (o) => console.log(JSON.stringify(o))
const para = (t) => ({ type: 'paragraph', content: [{ type: 'text', text: t }] })
const docOf = (...texts) => ({ type: 'doc', content: texts.map(para) })

const TWIN_SENTENCE = 'The ledger records a disputed clause and then stops.'
const QUOTE = 'disputed clause'

function offsetsOf(text, needle) {
  const out = []
  let at = text.indexOf(needle)
  while (at !== -1) { out.push(at); at = text.indexOf(needle, at + 1) }
  return out
}
const landedAt = (session, r) =>
  r.from === null ? null : posToOffset(buildTextIndex(session.doc), r.from)

/* ------------------------------------------------------------------ *
 * N1 — 앵커 블록은 삭제, **동일 텍스트 쌍둥이 블록은 이동**(cut+paste).
 *      규칙 C가 찾는 "캡처 이후 새로 생긴 동일 텍스트 블록"이 쌍둥이 쪽에서
 *      만들어진다 => 삭제된 앵커가 남의 블록으로 복구되는가?
 * ------------------------------------------------------------------ */
{
  const doc = docOf(
    'Opening block of the probe document.',
    TWIN_SENTENCE,                            // 1 = 앵커가 든 블록 (삭제 대상)
    'A neutral middle block of filler text.',
    TWIN_SENTENCE,                            // 3 = 쌍둥이 (이동 대상)
    'Closing block of the probe document.',
  )
  const session = openSession({ clientID: 1, docJSON: doc })
  const entry = attachFixtureAnnotations(session, [
    { id: 'n1', quote: QUOTE, occurrence: 0, body: 'anchored block is deleted; its twin moves' },
  ])[0]
  const t = entry.target

  // ① 쌍둥이 블록(index 3)을 잘라 문서 끝에 붙인다 = 새 Yjs item 생성
  const twinNode = session.doc.child(3)
  const twinFrom = session.doc.resolve(0).posAtIndex(3)
  session.dispatch((tr) => tr.delete(twinFrom, twinFrom + twinNode.nodeSize))
  session.dispatch((tr) => tr.insert(session.doc.content.size, twinNode))
  // ② 앵커가 든 블록을 통째로 삭제
  const t2 = session.doc.resolve(0).posAtIndex(1)
  session.dispatch((tr) => tr.delete(t2, t2 + session.doc.child(1).nodeSize))

  const merged = session.encodeState()
  session.close()
  const reload = openSession({ update: merged, clientID: 2, docJSON: doc })
  const r = resolveAnchors(reload, entry.record.anchors)
  const text = buildTextIndex(reload.doc).text
  say({
    probe: 'N1 anchored block deleted + identical twin block moved',
    method: r.method,
    rawStatus: r.raw.status,
    recovery: r.recovery,
    landedOffset: landedAt(reload, r),
    quoteOccurrences: offsetsOf(text, QUOTE),
    attachedTo: r.text,
    misResolved: r.method !== 'orphaned',
    docAfter: text,
    originalAnchorOffset: t.textFrom,
  })
  reload.close()
}

/* ------------------------------------------------------------------ *
 * N2 — **블록 경계를 걸치는 앵커**(문단 두 개에 걸친 선택) + 제자리 교체.
 *      captureAnchors는 이때 blockContext=null 을 저장한다 => 문자 출처 증거를
 *      쓸 수 없고(`known:false`), guard가 **문자열 구조만**으로 판정한다.
 *      S10(P4)에서 문자 출처가 잡아냈던 "짧은 교체어"가 여기서도 걸리는가?
 * ------------------------------------------------------------------ */
for (const replacement of ['stop', 'Zebra unrelated content']) {
  const A = 'The ledger records a disputed clause and then stops.'
  const B = 'Wrong resolution is worse than an honest orphan record.'
  const doc = docOf('Opening block of the probe document.', A, B, 'Closing block of the probe document.')
  const session = openSession({ clientID: 1, docJSON: doc })
  const index = buildTextIndex(session.doc)
  // 앵커 = "stops." + 블록 경계 + "Wrong"  (두 문단에 걸친 사용자 선택)
  const startOffset = index.text.indexOf('stops.')
  const endOffset = index.text.indexOf('Wrong') + 'Wrong'.length
  const from = offsetToPos(index, startOffset)
  const to = offsetToPos(index, endOffset)
  const anchors = captureAnchors(session, from, to)

  session.dispatch((tr) => tr.delete(from, to))
  session.dispatch((tr) => tr.insertText(replacement, from))
  const merged = session.encodeState()
  session.close()
  const reload = openSession({ update: merged, clientID: 2, docJSON: doc })
  const r = resolveAnchors(reload, anchors)
  say({
    probe: `N2 cross-block anchor + in-place replacement (${replacement.split(' ')[0]})`,
    storedExact: anchors.textQuote.exact,
    blockContextStored: anchors.blockContext,
    method: r.method,
    rawStatus: r.raw.status,
    guard: r.guard,
    attachedTo: r.text,
    misResolved: r.method !== 'orphaned',
  })
  reload.close()
}

/* ------------------------------------------------------------------ *
 * N3 — 원격 복제본(다른 clientID)이 **동일 텍스트 블록을 새로 만든 뒤** 병합.
 *      `isCreatedAfter`는 캡처 state vector에 없는 client의 clock 기준값을 0으로
 *      보므로 그 블록은 무조건 "fresh"다 => 삭제된 앵커가 남이 친 문장에 붙는가?
 * ------------------------------------------------------------------ */
{
  const doc = docOf('Opening block of the probe document.', TWIN_SENTENCE, 'Closing block of the probe document.')
  const author = openSession({ clientID: 1, docJSON: doc })
  const entry = attachFixtureAnnotations(author, [
    { id: 'n3', quote: QUOTE, occurrence: 0, body: 'remote peer types the same sentence' },
  ])[0]
  const base = author.encodeState()

  // 원격 피어(client 3)가 같은 문장을 새 문단으로 타이핑
  const peer = openSession({ update: base, clientID: 3, docJSON: doc })
  peer.dispatch((tr) => tr.insert(peer.doc.content.size, peer.doc.type.schema.node('paragraph', null, peer.doc.type.schema.text(TWIN_SENTENCE))))
  const peerState = peer.encodeState()
  peer.close()

  // 작성자는 앵커가 든 블록을 삭제
  const blockFrom = author.doc.resolve(0).posAtIndex(1)
  author.dispatch((tr) => tr.delete(blockFrom, blockFrom + author.doc.child(1).nodeSize))
  const authorState = author.encodeState()
  author.close()

  const reload = openSession({ update: authorState, clientID: 2, docJSON: doc })
  const Y = await import(ROOT + 'node_modules/yjs/dist/yjs.mjs')
  Y.applyUpdate(reload.ydoc, peerState)
  const r = resolveAnchors(reload, entry.record.anchors)
  const text = buildTextIndex(reload.doc).text
  say({
    probe: 'N3 remote peer creates an identical block; anchored block deleted',
    method: r.method,
    rawStatus: r.raw.status,
    recovery: r.recovery,
    attachedTo: r.text,
    landedOffset: landedAt(reload, r),
    misResolved: r.method !== 'orphaned',
    docAfter: text,
  })
  reload.close()
}

/* ------------------------------------------------------------------ *
 * N4 — 같은 세션에서 앵커 블록을 지우고 **똑같은 문장을 다시 타이핑**.
 *      "삭제 후 재작성"은 이동이 아니지만 규칙 C의 조건(동일 텍스트 + 캡처 이후
 *      생성 + 유일)을 그대로 만족한다.
 * ------------------------------------------------------------------ */
{
  const doc = docOf('Opening block of the probe document.', TWIN_SENTENCE, 'Closing block of the probe document.')
  const session = openSession({ clientID: 1, docJSON: doc })
  const entry = attachFixtureAnnotations(session, [
    { id: 'n4', quote: QUOTE, occurrence: 0, body: 'delete then retype the same sentence' },
  ])[0]
  const blockFrom = session.doc.resolve(0).posAtIndex(1)
  session.dispatch((tr) => tr.delete(blockFrom, blockFrom + session.doc.child(1).nodeSize))
  session.dispatch((tr) =>
    tr.insert(session.doc.content.size, session.doc.type.schema.node('paragraph', null, session.doc.type.schema.text(TWIN_SENTENCE))),
  )
  const merged = session.encodeState()
  session.close()
  const reload = openSession({ update: merged, clientID: 2, docJSON: doc })
  const r = resolveAnchors(reload, entry.record.anchors)
  say({
    probe: 'N4 delete block then retype identical sentence (same client)',
    method: r.method,
    rawStatus: r.raw.status,
    recovery: r.recovery,
    attachedTo: r.text,
    misResolved: r.method !== 'orphaned',
  })
  reload.close()
}

/* ------------------------------------------------------------------ *
 * N5 — 블록 정체성이 **정확 문자열 일치**라서 생기는 반대쪽 비용(false negative).
 *      이동 중 블록이 1자만 달라지거나 유니코드 정규화가 달라지면 S6형 복구가
 *      사라지는가? (오해소가 아니라 복구 상실 = 안전측 실패인지 확인)
 * ------------------------------------------------------------------ */
for (const [label, mutate] of [
  ['move + 1 char appended', (s, pos, node) => { s.dispatch((tr) => tr.insert(s.doc.content.size, node)); s.dispatch((tr) => tr.insertText('!', s.doc.content.size - 1)) }],
  ['move + NFD normalisation', null],
]) {
  const SENT = label.includes('NFD') ? 'The café records a disputed clause and then stops.' : TWIN_SENTENCE
  const doc = docOf('Opening block of the probe document.', SENT, 'Closing block of the probe document.')
  const session = openSession({ clientID: 1, docJSON: doc })
  const entry = attachFixtureAnnotations(session, [
    { id: 'n5', quote: QUOTE, occurrence: 0, body: 'moved block, mutated on arrival' },
  ])[0]
  const node = session.doc.child(1)
  const blockFrom = session.doc.resolve(0).posAtIndex(1)
  session.dispatch((tr) => tr.delete(blockFrom, blockFrom + node.nodeSize))
  if (mutate) {
    mutate(session, blockFrom, node)
  } else {
    const nfd = session.doc.type.schema.node('paragraph', null, session.doc.type.schema.text(SENT.normalize('NFD')))
    session.dispatch((tr) => tr.insert(session.doc.content.size, nfd))
  }
  const merged = session.encodeState()
  session.close()
  const reload = openSession({ update: merged, clientID: 2, docJSON: doc })
  const r = resolveAnchors(reload, entry.record.anchors)
  say({
    probe: `N5 ${label}`,
    method: r.method,
    recovery: r.recovery,
    attachedTo: r.text,
    misResolved: r.method !== 'orphaned',
    recoveryLost: r.method === 'orphaned',
  })
  reload.close()
}

/* ------------------------------------------------------------------ *
 * N6 — 대조군. 쌍둥이도 없고 새 블록도 없는 순수 블록 삭제는 orphan이어야 한다
 *      (위 프로브들의 결과가 "무조건 orphan"이 아님을 보이는 sanity).
 * ------------------------------------------------------------------ */
{
  const doc = docOf('Opening block of the probe document.', TWIN_SENTENCE, 'Closing block of the probe document.')
  const session = openSession({ clientID: 1, docJSON: doc })
  const entry = attachFixtureAnnotations(session, [
    { id: 'n6', quote: QUOTE, occurrence: 0, body: 'plain block delete' },
  ])[0]
  const blockFrom = session.doc.resolve(0).posAtIndex(1)
  session.dispatch((tr) => tr.delete(blockFrom, blockFrom + session.doc.child(1).nodeSize))
  const merged = session.encodeState()
  session.close()
  const reload = openSession({ update: merged, clientID: 2, docJSON: doc })
  const r = resolveAnchors(reload, entry.record.anchors)
  const moved = openSession({ update: merged, clientID: 4, docJSON: doc })
  say({
    probe: 'N6 control: plain block delete (no twin, no fresh block)',
    method: r.method,
    recovery: r.recovery,
    misResolved: r.method !== 'orphaned',
  })
  moved.close()
  reload.close()
}

/* ------------------------------------------------------------------ *
 * N7 — 강화의 **반대쪽 비용**: 앵커 범위 안에서 일어난 정상 편집이 이제 orphan이
 *      되는가. (구조적 guard는 "해소 텍스트 전체가 exact의 앞·뒤 조각으로 설명"을
 *      요구하므로, 범위 안 문단 분할·부분 교체가 걸릴 수 있다.)
 *      Phase 1(overlap guard)에서의 결과와 나란히 잰다.
 * ------------------------------------------------------------------ */
{
  const { POLICIES } = await import(ROOT + 'src/anchors.mjs')
  const SENT = 'Critical failure of the anchor engine hides in plain sight.'
  const cases = [
    ['split paragraph inside the anchor (Enter)', (s, t) => s.dispatch((tr) => tr.split(t.from + 'Critical'.length))],
    ['replace one word inside the anchor', (s, t) => {
      s.dispatch((tr) => tr.delete(t.from + 'Critical '.length, t.to))
      s.dispatch((tr) => tr.insertText('outage', t.from + 'Critical '.length))
    }],
    ['type extra word inside the anchor', (s, t) => s.dispatch((tr) => tr.insertText('safety ', t.from + 'Critical '.length))],
    ['delete a middle chunk of the anchor', (s, t) => s.dispatch((tr) => tr.delete(t.from + 5, t.from + 12))],
  ]
  for (const [label, edit] of cases) {
    const doc = docOf('Opening block of the probe document.', SENT, 'Closing block of the probe document.')
    const session = openSession({ clientID: 1, docJSON: doc })
    const entry = attachFixtureAnnotations(session, [
      { id: 'n7', quote: 'Critical failure', occurrence: 0, body: 'in-range legitimate edit' },
    ])[0]
    edit(session, entry.target)
    const merged = session.encodeState()
    session.close()
    const reload = openSession({ update: merged, clientID: 2, docJSON: doc })
    const strict = resolveAnchors(reload, entry.record.anchors)
    const phase1 = resolveAnchors(reload, entry.record.anchors, { policy: POLICIES.phase1, counterfactuals: false })
    say({
      probe: `N7 ${label}`,
      strictMethod: strict.method,
      strictText: strict.text,
      strictGuard: { agreement: strict.guard.agreement, required: strict.guard.required, surviving: strict.guard.survivingChars },
      phase1Method: phase1.method,
      phase1Text: phase1.text,
      lostBecauseOfHardening: strict.method === 'orphaned' && phase1.method !== 'orphaned',
    })
    reload.close()
  }
}

/* ------------------------------------------------------------------ *
 * N1b — N1의 편집 **순서**를 뒤집어(먼저 삭제, 나중에 쌍둥이 이동) 결과가
 *       순서 산물이 아님을 확인한다. + 쌍둥이를 "고쳐서" 옮기면 어떻게 되는지.
 * ------------------------------------------------------------------ */
for (const variant of ['delete-then-move', 'twin-edited-then-moved']) {
  const doc = docOf(
    'Opening block of the probe document.',
    TWIN_SENTENCE,
    'A neutral middle block of filler text.',
    TWIN_SENTENCE,
    'Closing block of the probe document.',
  )
  const session = openSession({ clientID: 1, docJSON: doc })
  const entry = attachFixtureAnnotations(session, [
    { id: 'n1b', quote: QUOTE, occurrence: 0, body: 'ordering variant' },
  ])[0]
  const anchoredFrom = session.doc.resolve(0).posAtIndex(1)
  session.dispatch((tr) => tr.delete(anchoredFrom, anchoredFrom + session.doc.child(1).nodeSize))
  // 삭제 뒤 쌍둥이는 index 2
  if (variant === 'twin-edited-then-moved') {
    const inner = session.doc.resolve(0).posAtIndex(2) + 1
    session.dispatch((tr) => tr.insertText('!', inner))
  }
  const twinNode = session.doc.child(2)
  const twinFrom = session.doc.resolve(0).posAtIndex(2)
  session.dispatch((tr) => tr.delete(twinFrom, twinFrom + twinNode.nodeSize))
  session.dispatch((tr) => tr.insert(session.doc.content.size, twinNode))
  const merged = session.encodeState()
  session.close()
  const reload = openSession({ update: merged, clientID: 2, docJSON: doc })
  const r = resolveAnchors(reload, entry.record.anchors)
  say({
    probe: `N1b ${variant}`,
    method: r.method,
    recovery: r.recovery,
    attachedTo: r.text,
    misResolved: r.method !== 'orphaned',
  })
  reload.close()
}

/* ------------------------------------------------------------------ *
 * N8 — **하위호환**: Phase 1이 저장한 레코드에는 `blockContext`가 없다
 *      (`STORE_VERSION`은 1 그대로라 그런 파일도 그냥 로드된다).
 *      그 레코드에는 문자 출처 증거를 쓸 수 없으므로 guard가 문자열 구조만으로
 *      판정한다 — S10의 `Critical failure` -> `Cure`가 다시 통과하는가?
 * ------------------------------------------------------------------ */
for (const [label, replacement] of [['Cure (short coincidence)', 'Cure'], ['Amazing… (1 char)', 'Amazing unrelated content here']]) {
  const SENT = 'Critical failure of the anchor engine hides in plain sight.'
  const doc = docOf('Opening block of the probe document.', SENT, 'Closing block of the probe document.')
  const session = openSession({ clientID: 1, docJSON: doc })
  const entry = attachFixtureAnnotations(session, [
    { id: 'n8', quote: replacement === 'Cure' ? 'Critical failure' : 'Critical failure', occurrence: 0, body: 'legacy record' },
  ])[0]
  // Phase 1 레코드 재현: 세 번째 selector가 없는 앵커
  const legacy = { relativePosition: entry.record.anchors.relativePosition, textQuote: entry.record.anchors.textQuote }
  const t = entry.target
  session.dispatch((tr) => tr.delete(t.from, t.to))
  session.dispatch((tr) => tr.insertText(replacement, t.from))
  const merged = session.encodeState()
  session.close()
  const reload = openSession({ update: merged, clientID: 2, docJSON: doc })
  const withCtx = resolveAnchors(reload, entry.record.anchors)
  const legacyRes = resolveAnchors(reload, legacy)
  say({
    probe: `N8 legacy record without blockContext — ${label}`,
    withBlockContext: { method: withCtx.method, text: withCtx.text, guard: withCtx.guard },
    legacyRecord: { method: legacyRes.method, text: legacyRes.text, guard: legacyRes.guard },
    misResolvedOnLegacy: legacyRes.method !== 'orphaned',
  })
  reload.close()
}
