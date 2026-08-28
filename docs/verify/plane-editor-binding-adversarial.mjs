/**
 * vnv 독립 적대 프로브 (바인딩 준비 조건 판정) — C1b §8 조건 ①·②·③ 의 **전제**를 무너뜨린다.
 *
 *   node docs/verify/plane-editor-binding-adversarial.mjs
 *
 * 조건 ①(문서 정체성 바인딩)·②(저장소 계약 무결성)의 재측정은 기존 프로브
 * `plane-editor-c1b-adversarial.mjs`(M4·M5)를 **무수정 재실행**해 따로 한다. 이 파일은
 * 새 방어의 전제를 겨냥해 vnv 가 새로 창안한 우회 4종 + 조건 ③ 종단점 검증이다.
 *
 *   전제 ①-A "문서 id 는 문서마다 다르다"     -> B1 명시 id 파생본 / B2 상태복사 복제본
 *   전제 ①-B "규칙 0 이 모든 레코드에 걸린다" -> B3 v1 스토어(문서 id 없는 옛 레코드)
 *   전제 ②   "캡처 증거는 위조할 수 없다"     -> B4 캡처 통째 위조 / B5 남의 문서 capture 이식
 *   조건 ③   "끊긴 종단점이 보고된다"         -> B6 실제 파이프라인으로 orphan 종단점 생성
 *
 * 이 파일은 tools/plane-editor/ 를 **읽기만** 한다 (수정·생성 없음; 산출은 scratch 뿐).
 */
const ROOT = new URL('../../tools/plane-editor/', import.meta.url).pathname
const { openSession, attachFixtureAnnotations, buildTextIndex, posToOffset, locate } =
  await import(ROOT + 'src/session.mjs')
const { resolveAnchors, captureAnchors, captureEvidence, documentBinding, anchorStateOf, POLICIES } =
  await import(ROOT + 'src/anchors.mjs')
const { liveBlocks, rangeCharacterIds, characterIdCount, encodeStateVector, itemFate } =
  await import(ROOT + 'src/blocks.mjs')
const { loadStore, saveStore, migrateRecord, annotationRecord, STORE_VERSION } =
  await import(ROOT + 'src/store.mjs')
const { documentIdOf } = await import(ROOT + 'src/document-id.mjs')
const Y = await import(ROOT + 'node_modules/yjs/dist/yjs.mjs')
const { mkdirSync, writeFileSync, rmSync } = await import('node:fs')
const { join } = await import('node:path')
const { spawnSync } = await import('node:child_process')

const SCRATCH = process.env.VNV_SCRATCH || '/tmp/vnv-binding-probe'
const say = (o) => console.log(JSON.stringify(o))
const para = (t) => ({ type: 'paragraph', content: [{ type: 'text', text: t }] })
const docOf = (...texts) => ({ type: 'doc', content: texts.map(para) })
const textOf = (s) => buildTextIndex(s.doc).text
const landedAt = (s, r) => (r.from === null ? null : posToOffset(buildTextIndex(s.doc), r.from))
const offsetsOf = (text, needle) => {
  const out = []
  let at = text.indexOf(needle)
  while (at !== -1) { out.push(at); at = text.indexOf(needle, at + 1) }
  return out
}
const blockRange = (s, i) => {
  const from = s.doc.resolve(0).posAtIndex(i)
  return { from, to: from + s.doc.child(i).nodeSize }
}
const deleteBlock = (s, i) => {
  const { from, to } = blockRange(s, i)
  s.dispatch((tr) => tr.delete(from, to))
}
const stringify = (v) => `${JSON.stringify(v, null, 2)}\n`

const SENT = 'The ledger records a disputed clause and then stops.'
const QUOTE = 'disputed clause'
const DOC_A = () => docOf('Opening block of the probe document.', SENT, 'Closing block of A.')

/* ================================================================== *
 * B1 — 문서 id 를 **복사한** 파생본 (호출부가 명시 id 를 준다)
 * ================================================================== */
{
  const a = openSession({ clientID: 1, docJSON: DOC_A() })
  const t = locate(a, { quote: QUOTE })
  const record = captureAnchors(a, t.from, t.to)
  const aId = a.documentId

  // B는 **새 CRDT**지만 A의 id 를 그대로 요구한다 (module 머리말: "호출부가 명시 id 를 줄 수도 있다").
  const b = openSession({ clientID: 1, docJSON: DOC_A(), documentId: aId })
  const bound = documentBinding(b, record)
  const r = resolveAnchors(b, record)
  say({
    probe: 'B1 derivative document that copies the document id (identical content)',
    documentIdA: aId,
    documentIdB: b.documentId,
    sameIdDifferentCrdt: aId === b.documentId,
    ruleZeroBound: bound.bound,
    method: r.method,
    text: r.text,
    landedOffset: landedAt(b, r),
    correctOffsetInB: offsetsOf(textOf(b), QUOTE)[0] ?? null,
    attachedToAnotherDocument: r.method !== 'orphaned',
    reason: r.reason,
  })

  // 파생본이 **내용까지 다른** 경우 (파생 후 편집)
  const c = openSession({
    clientID: 1,
    docJSON: docOf('Opening block of the probe document.', SENT, 'A completely different tail block.'),
    documentId: aId,
  })
  const rc = resolveAnchors(c, record)
  say({
    probe: 'B1b derivative document that copies the document id (diverged content)',
    ruleZeroBound: documentBinding(c, record).bound,
    method: rc.method,
    text: rc.text,
    landedOffset: landedAt(c, rc),
    attachedToAnotherDocument: rc.method !== 'orphaned',
    reason: rc.reason,
  })
  a.close(); b.close(); c.close()
}

/* ================================================================== *
 * B2 — 상태 복사 복제본("문서 복제" 기능) 후 분기 편집
 * ================================================================== */
{
  const a = openSession({ clientID: 1, docJSON: DOC_A() })
  const t = locate(a, { quote: QUOTE })
  const record = captureAnchors(a, t.from, t.to)
  const state = a.encodeState()
  const aId = a.documentId
  a.close()

  // 복제본: 상태를 복사해 새 세션에서 연다 (실서비스 "duplicate document" 의 흔한 구현).
  const dup = openSession({ update: state, clientID: 7 })
  const idTravelled = dup.documentId === aId
  // 복제본을 **다른 문서로** 편집한다: 앵커 블록을 지우고 같은 문장을 끝에 다시 친다.
  const before = textOf(dup)
  deleteBlock(dup, 1)
  dup.dispatch((tr) => tr.insert(tr.doc.content.size - 1, dup.schema.nodes.paragraph.create(
    null, dup.schema.text(SENT))))
  const r = resolveAnchors(dup, record)
  say({
    probe: 'B2 duplicate made by copying CRDT state, then edited into another document',
    documentIdTravelledWithState: idTravelled,
    docBeforeDivergence: before,
    ruleZeroBound: documentBinding(dup, record).bound,
    method: r.method,
    text: r.text,
    landedOffset: landedAt(dup, r),
    quoteOccurrences: offsetsOf(textOf(dup), QUOTE),
    attachedInDuplicate: r.method !== 'orphaned',
    note: 'identity is state-borne: a state copy is the SAME document by construction',
    docAfter: textOf(dup),
  })
  dup.close()
}

/* ================================================================== *
 * B3 — 문서 id 필드가 없는 **옛 레코드**(v1/v2 스토어)를 남의 문서 옆에 둔다
 * ================================================================== */
for (const version of [1, 2]) {
  const dir = join(SCRATCH, `legacy-v${version}`)
  rmSync(dir, { recursive: true, force: true })
  mkdirSync(dir, { recursive: true })

  // 문서 A — 레코드의 진짜 출처
  const a = openSession({ clientID: 1, docJSON: DOC_A() })
  const t = locate(a, { quote: QUOTE })
  const aRecord = { id: 'a1', anchors: captureAnchors(a, t.from, t.to), body: 'from A', status: 'open' }
  const aId = a.documentId
  a.close()

  // 문서 B — **다른 문서**(자기 id). 같은 clientID·같은 조립 순서라 item id 가 겹친다.
  const b = openSession({ clientID: 1, docJSON: DOC_A() })
  const bId = b.documentId
  const bState = b.encodeState()
  const bJSON = b.editor.getJSON()
  b.close()

  writeFileSync(join(dir, 'document.json'), stringify({
    fragment: 'prosemirror',
    documentId: bId,
    yUpdateBase64: Buffer.from(bState).toString('base64'),
    prosemirrorJSON: bJSON,
  }))
  // 옛 스토어 모양: 레코드에 document 필드가 **없다**.
  const legacyAnchors = { ...aRecord.anchors }
  delete legacyAnchors.document
  if (version === 1) delete legacyAnchors.capture
  writeFileSync(join(dir, 'annotations.json'), stringify({
    version,
    document: 'document.json',
    annotations: [{ id: 'a1', anchors: legacyAnchors, body: 'from A', status: 'open' }],
  }))

  let loaded = null
  let loadError = null
  try { loaded = loadStore(dir) } catch (error) { loadError = error.message }
  let out = { probe: `B3 v${version} store: a record from document A placed beside document B`,
              documentIdA: aId, documentIdB: bId, loadError }
  if (loaded) {
    const session = openSession({ update: loaded.docUpdate, clientID: 9 })
    const migrated = loaded.annotations[0].anchors
    const r = resolveAnchors(session, migrated)
    out = {
      ...out,
      stampedDocumentId: migrated.document ? migrated.document.id : null,
      stampedWithForeignDocument: migrated.document ? migrated.document.id === bId : null,
      legacyMark: migrated.legacy ?? null,
      ruleZeroBound: documentBinding(session, migrated).bound,
      method: r.method,
      text: r.text,
      landedOffset: landedAt(session, r),
      correctOffsetInB: offsetsOf(textOf(session), QUOTE)[0] ?? null,
      guardProvenance: r.guard ? r.guard.provenance : null,
      attachedToAnotherDocument: r.method !== 'orphaned',
      reason: r.reason,
    }
    session.close()
  }
  say(out)
}

/* ================================================================== *
 * B4 — 캡처 증거 **통째 위조** (현재 상태만으로 정합한 capture 를 만든다)
 * ================================================================== */
{
  const EXACT = 'Critical failure'
  const LINE = `${EXACT} of the anchor engine hides in plain sight.`
  const s = openSession({ clientID: 1, docJSON: docOf('Opening block of the probe document.', LINE, 'Closing block.') })
  const t = locate(s, { quote: EXACT })
  const original = captureAnchors(s, t.from, t.to)

  // 제자리 교체 — 정직한 레코드라면 여기서 orphan 이어야 한다 (M4 계열).
  // 제자리 교체는 **삭제 후 삽입 2단계**로 한다 (한 번의 insertText 는 PM 이 공통
  // 접두·접미 문자를 보존해 원 문자가 살아남는다 = 정직한 레코드도 생존하는 대조 실패).
  s.dispatch((tr) => tr.delete(t.from, t.to))
  s.dispatch((tr) => tr.insertText('Cure', t.from))

  const honest = resolveAnchors(s, original)

  // 위조: 저장 exact 는 그대로 두고, characterIds 를 (a) 현재 범위의 살아있는 문자 +
  // (b) 문서 다른 곳의 문자 로 채워 길이를 맞추고, stateVector 는 **현재 값**으로 준다
  // (그래야 모든 런이 preexisting 으로 분류된다).
  const { index, blocks } = liveBlocks(s)
  const at = index.text.indexOf('Cure')
  const inRange = rangeCharacterIds(blocks, at, at + 'Cure'.length)
  const need = EXACT.length - characterIdCount(inRange)
  const fillerFrom = index.text.indexOf('Opening')
  const filler = rangeCharacterIds(blocks, fillerFrom, fillerFrom + need)
  const forged = {
    ...original,
    capture: {
      stateVector: encodeStateVector(s),
      characterIds: [...inRange, ...filler],
    },
  }
  const evidence = captureEvidence(forged)
  const migrated = migrateRecord({ id: 'x1', anchors: forged, body: 'b', status: 'open' }, STORE_VERSION,
    s.documentId)
  const r = resolveAnchors(s, migrated.anchors)
  say({
    probe: 'B4 whole-capture forgery — character ids taken from the CURRENT range + filler, SV = now',
    storedExact: EXACT,
    forgedRunChars: characterIdCount(forged.capture.characterIds),
    exactChars: EXACT.length,
    captureEvidence: { usable: evidence.usable, corrupt: evidence.corrupt, reason: evidence.reason },
    migrationDowngraded: Boolean(migrated.anchors.legacy),
    honestRecord: { method: honest.method, provenance: honest.guard ? honest.guard.provenance : null },
    forgedRecord: {
      method: r.method,
      text: r.text,
      landedOffset: landedAt(s, r),
      provenance: r.guard ? r.guard.provenance : null,
      survivingChars: r.guard ? r.guard.survivingChars : null,
      accepted: r.guard ? r.guard.accepted : null,
    },
    misResolved: r.method !== 'orphaned',
    docAfter: textOf(s),
  })

  // B4b — 같은 위조를 **스토어 왕복**으로 (D6 와 같은 경로: 파일 -> loadStore -> resolve).
  const dir = join(SCRATCH, 'forged-capture')
  rmSync(dir, { recursive: true, force: true })
  mkdirSync(dir, { recursive: true })
  writeFileSync(join(dir, 'document.json'), stringify({
    fragment: 'prosemirror',
    documentId: s.documentId,
    yUpdateBase64: Buffer.from(s.encodeState()).toString('base64'),
    prosemirrorJSON: s.editor.getJSON(),
  }))
  writeFileSync(join(dir, 'annotations.json'), stringify({
    version: STORE_VERSION,
    document: 'document.json',
    documentId: s.documentId,
    annotations: [{ id: 'x1', anchors: forged, body: 'b', status: 'open', anchorState: 'bound' }],
  }))
  let loaded4 = null
  let err4 = null
  try { loaded4 = loadStore(dir) } catch (error) { err4 = error.message }
  let out4 = { probe: 'B4b same forgery through the STORE round-trip (the D6 path)', loadError: err4 }
  if (loaded4) {
    const reload = openSession({ update: loaded4.docUpdate, clientID: 99 })
    const rec = loaded4.annotations[0]
    const rr = resolveAnchors(reload, rec.anchors, { counterfactuals: false })
    out4 = {
      ...out4,
      loadRejected: false,
      degraded: Boolean(rec.anchors.legacy),
      method: rr.method,
      attachedText: rr.text,
      provenance: rr.guard ? rr.guard.provenance : null,
      misResolved: rr.method !== 'orphaned',
      wouldFlipUpgradePathExists: rr.method !== 'orphaned' && !rec.anchors.legacy,
    }
    reload.close()
  }
  say(out4)
  s.close()
}

/* ================================================================== *
 * B5 — 남의 문서의 **유효한** capture 이식 (document 필드만 갈아끼운다)
 * ================================================================== */
{
  const a = openSession({ clientID: 1, docJSON: DOC_A() })
  const t = locate(a, { quote: QUOTE })
  const aAnchors = captureAnchors(a, t.from, t.to)
  const aId = a.documentId
  a.close()

  const b = openSession({ clientID: 1, docJSON: DOC_A() })
  const transplanted = { ...aAnchors, document: { id: b.documentId } }
  const evidence = captureEvidence(transplanted)
  const migrated = migrateRecord({ id: 'a1', anchors: transplanted, body: 'b', status: 'open' },
    STORE_VERSION, b.documentId)
  const r = resolveAnchors(b, migrated.anchors)
  say({
    probe: 'B5 transplant a VALID capture from document A into a record claiming document B',
    documentIdA: aId,
    documentIdB: b.documentId,
    captureEvidence: { usable: evidence.usable, corrupt: evidence.corrupt, reason: evidence.reason },
    migrationDowngraded: Boolean(migrated.anchors.legacy),
    ruleZeroBound: documentBinding(b, migrated.anchors).bound,
    method: r.method,
    text: r.text,
    landedOffset: landedAt(b, r),
    provenance: r.guard ? r.guard.provenance : null,
    survivingChars: r.guard ? r.guard.survivingChars : null,
    attachedToAnotherDocument: r.method !== 'orphaned',
    reason: r.reason,
  })
  b.close()
}

/* ================================================================== *
 * B6 — 조건 ③: 실제 파이프라인으로 끊긴 종단점을 만들어 검사기에 물린다
 * ================================================================== */
{
  const dir = join(SCRATCH, 'broken-endpoint')
  rmSync(dir, { recursive: true, force: true })
  mkdirSync(dir, { recursive: true })

  const s = openSession({ clientID: 1, docJSON: DOC_A() })
  const t = locate(s, { quote: QUOTE })
  const kept = { id: 'a1', anchors: captureAnchors(s, t.from, t.to), body: 'kept', status: 'open' }
  const t2 = locate(s, { quote: 'Closing block of A.' })
  const doomed = { id: 'a2', anchors: captureAnchors(s, t2.from, t2.to), body: 'doomed', status: 'open' }

  // 종단점을 실제로 끊는다 — 앵커 블록을 통째로 지운다.
  deleteBlock(s, 2)

  const states = {
    a1: anchorStateOf(s, kept.anchors),
    a2: anchorStateOf(s, doomed.anchors),
  }
  saveStore(dir, {
    fragment: 'prosemirror',
    documentId: s.documentId,
    docUpdate: s.encodeState(),
    docJSON: s.editor.getJSON(),
    annotations: [
      { ...kept, anchorState: states.a1 },
      { ...doomed, anchorState: states.a2 },
    ],
  })

  const linkDir = join(dir, 'link-store')
  mkdirSync(linkDir, { recursive: true })
  writeFileSync(join(linkDir, 'decisions.json'), stringify({ version: 1, plane: 'decision', decisions: [] }))
  writeFileSync(join(linkDir, 'links.json'), stringify({
    version: 1,
    plane: 'link',
    links: [
      { id: 'ln-broken-endpoint', from: { plane: 'annotation', ref: 'a2', document: s.documentId },
        to: { plane: 'graph', ref: 'id:c-traceability' }, type: 'tagged',
        created_by: 'vnv binding probe' },
      { id: 'ln-live-endpoint', from: { plane: 'annotation', ref: 'a1', document: s.documentId },
        to: { plane: 'graph', ref: 'id:c-traceability' }, type: 'tagged',
        created_by: 'vnv binding probe' },
    ],
  }))
  const python = process.env.HO_PYTHON || '/usr/bin/python3'
  const run = spawnSync(python, [join(ROOT, 'check_links.py'), '--store', linkDir,
    '--annotations', join(dir, 'annotations.json'), '--format', 'json'], { encoding: 'utf8' })
  const verdict = run.stdout ? JSON.parse(run.stdout) : null
  say({
    probe: 'B6 real pipeline: delete the anchored block, save measured anchorState, run the checker',
    measuredAnchorStates: states,
    checkerExit: run.status,
    pass: verdict ? verdict.pass : null,
    violations: verdict ? verdict.violations.map((v) => v.rule) : null,
    brokenEndpoints: verdict ? verdict.brokenEndpoints : null,
    stderr: (run.stderr || '').trim().slice(0, 300),
  })



  s.close()
}
