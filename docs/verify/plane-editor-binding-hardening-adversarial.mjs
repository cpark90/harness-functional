/**
 * vnv 적대 프로브 — N-1~N-4 **수정본을 겨냥해** 새로 창안한 우회 (H1~H5).
 *   node docs/verify/plane-editor-binding-hardening-adversarial.mjs
 *   (환경변수 VNV_SCRATCH 로 scratch 경로 지정)
 *
 * 이번 수정이 세운 방어를 표적으로 삼는다:
 *   H1 — 자리별 대응 검사(`captureCorrespondence`)를 **만족시키는** padding 위조.
 *        B4는 "다른 곳 문자 아무거나"로 채워서 걸렸다. 여기서는 자리마다 **그 자리의
 *        문자와 같은 글자**를 문서 다른 곳에서 골라 채운다 (내용 대응 통과 · 유일성 통과 ·
 *        순서 검사는 해소 범위 안 문자만 보므로 통과).
 *   H2 — 입양 금지를 **손으로** 우회: 옛(v1) 레코드에 스토어의 documentId를 사람이 써 넣는다.
 *        (자동 입양은 막혔다 — 사람이 써 넣는 경로도 막혔는가?)
 *   H3 — sticky 표식 손제거: `legacy` 표식을 지우거나 `anchors` 자체를 지운 레코드가
 *        편집기·검사기 양쪽에서 어떻게 취급되는가 (두 층이 어긋나면 그것이 구멍).
 *   H4 — 한 스토어 안 **중복 레코드 id**(미상 1건 + 정상 1건): 검사기는 어느 쪽을 쓰는가.
 *   H5 — 캡처 이벤트를 흉내 낸 합성 레코드: 같은 내용으로 새로 만든 문서에서 캡처해
 *        (진짜 captureAnchors 호출) 옛 문서의 레코드인 척한다.
 *
 * tools/plane-editor/ 는 읽기만 한다 (산출은 scratch 뿐).
 */
const ROOT = new URL('../../tools/plane-editor/', import.meta.url).pathname
const { openSession, buildTextIndex, posToOffset, locate } = await import(ROOT + 'src/session.mjs')
const { resolveAnchors, captureAnchors, captureEvidence, documentBinding, anchorStateOf } =
  await import(ROOT + 'src/anchors.mjs')
const { liveBlocks, rangeCharacterIds, characterIdCount, encodeStateVector } =
  await import(ROOT + 'src/blocks.mjs')
const { loadStore, saveStore, migrateRecord, STORE_VERSION } = await import(ROOT + 'src/store.mjs')
const { mkdirSync, writeFileSync, rmSync } = await import('node:fs')
const { join } = await import('node:path')
const { spawnSync } = await import('node:child_process')

const SCRATCH = process.env.VNV_SCRATCH || '/tmp/vnv-hardening-probe'
const say = (o) => console.log(JSON.stringify(o))
const para = (t) => ({ type: 'paragraph', content: [{ type: 'text', text: t }] })
const docOf = (...texts) => ({ type: 'doc', content: texts.map(para) })
const textOf = (s) => buildTextIndex(s.doc).text
const landedAt = (s, r) => (r.from === null ? null : posToOffset(buildTextIndex(s.doc), r.from))
const stringify = (v) => `${JSON.stringify(v, null, 2)}\n`
const attempt = (fn) => { try { return { ok: true, value: fn() } } catch (e) { return { ok: false, error: e.message } } }
const fresh = (name) => {
  const dir = join(SCRATCH, name)
  rmSync(dir, { recursive: true, force: true })
  mkdirSync(dir, { recursive: true })
  return dir
}
const writeDoc = (dir, s) => writeFileSync(join(dir, 'document.json'), stringify({
  fragment: 'prosemirror',
  documentId: s.documentId,
  yUpdateBase64: Buffer.from(s.encodeState()).toString('base64'),
  prosemirrorJSON: s.editor.getJSON(),
}))

const writeLinks = (dir, documentId, linkId) => {
  writeFileSync(join(dir, 'links.json'), stringify({
    version: 1,
    plane: 'link',
    links: [{
      id: linkId,
      from: { plane: 'annotation', ref: 'a1', document: documentId },
      to: { plane: 'graph', ref: 'id:c-traceability' },
      type: 'tagged',
      created_by: 'vnv hardening probe',
    }],
  }))
  writeFileSync(join(dir, 'decisions.json'), stringify({ version: 1, plane: 'decision', decisions: [] }))
}

/* ================================================================== *
 * H1 — 자리별 대응을 **만족시키는** padding 위조
 * ================================================================== */
{
  const EXACT = 'Critical failure'
  const LINE = `${EXACT} of the anchor engine hides in plain sight.`
  const s = openSession({ clientID: 1, docJSON: docOf('Opening block of the probe document.', LINE, 'Closing block.') })
  const t = locate(s, { quote: EXACT })
  const original = captureAnchors(s, t.from, t.to)

  // 제자리 교체 (B4와 같은 2단계). 정직한 레코드는 여기서 orphan 이어야 한다.
  s.dispatch((tr) => tr.delete(t.from, t.to))
  s.dispatch((tr) => tr.insertText('Cure', t.from))
  const honest = resolveAnchors(s, original)

  const { index, blocks } = liveBlocks(s)
  const at = index.text.indexOf('Cure')
  const inRange = rangeCharacterIds(blocks, at, at + 'Cure'.length)

  // 살아 있는 문자 -> 이름표 목록 (범위 밖만). 자리 k 의 padding 은 exact[k] 와 **같은 글자**로 고른다.
  const pool = new Map()
  const spread = []
  for (let offset = 0; offset < index.text.length; offset += 1) {
    const ids = rangeCharacterIds(blocks, offset, offset + 1)
    if (!ids || ids.length !== 1) continue
    if (offset >= at && offset < at + 'Cure'.length) continue
    const character = index.text[offset]
    if (!pool.has(character)) pool.set(character, [])
    pool.get(character).push({ client: ids[0].client, clock: ids[0].clock, length: 1 })
    spread.push({ character, offset })
  }
  const used = new Set()
  const takeFor = (character) => {
    const list = pool.get(character) || []
    for (const id of list) {
      const key = `${id.client}:${id.clock}`
      if (used.has(key)) continue
      used.add(key)
      return id
    }
    return null
  }

  // 범위 안 살아있는 문자('C','u','r','e')를 exact 안 자리에 **증가 수열**로 배치한다.
  const rangeChars = 'Cure'
  const slots = []
  let cursor = 0
  for (const character of rangeChars) {
    const found = EXACT.indexOf(character, cursor)
    slots.push(found)
    cursor = found + 1
  }
  const runs = new Array(EXACT.length).fill(null)
  let rangeCursor = 0
  const flatRange = []
  for (const run of inRange) {
    for (let offset = 0; offset < run.length; offset += 1) {
      flatRange.push({ client: run.client, clock: run.clock + offset, length: 1 })
    }
  }
  for (const slot of slots) {
    runs[slot] = flatRange[rangeCursor]
    used.add(`${flatRange[rangeCursor].client}:${flatRange[rangeCursor].clock}`)
    rangeCursor += 1
  }
  let unfilled = 0
  for (let position = 0; position < EXACT.length; position += 1) {
    if (runs[position]) continue
    const id = takeFor(EXACT[position])
    if (!id) { unfilled += 1; continue }
    runs[position] = id
  }

  const forged = {
    ...original,
    capture: { stateVector: encodeStateVector(s), characterIds: runs.filter(Boolean) },
  }
  const evidence = captureEvidence(forged)
  const migrated = migrateRecord({ id: 'x1', anchors: forged, body: 'b', status: 'open' }, STORE_VERSION)
  const r = resolveAnchors(s, migrated.anchors)
  say({
    probe: 'H1 padding forgery that SATISFIES the per-position correspondence check',
    storedExact: EXACT,
    subsequenceSlots: slots,
    unfilledPositions: unfilled,
    forgedRunChars: characterIdCount(forged.capture.characterIds),
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

  // H1b — 같은 위조를 스토어 왕복으로 (D6 경로) + 검사기까지.
  const dir = fresh('h1-forged')
  writeDoc(dir, s)
  writeFileSync(join(dir, 'annotations.json'), stringify({
    version: STORE_VERSION,
    document: 'document.json',
    documentId: s.documentId,
    annotations: [{ id: 'x1', anchors: forged, body: 'b', status: 'open', anchorState: 'bound' }],
  }))
  let loaded = null
  let loadError = null
  try { loaded = loadStore(dir) } catch (error) { loadError = error.message }
  let out = { probe: 'H1b the same forgery through the store round-trip', loadError, loadRejected: Boolean(loadError) }
  if (loaded) {
    const reload = openSession({ update: loaded.docUpdate, clientID: 77 })
    const rec = loaded.annotations[0]
    const rr = resolveAnchors(reload, rec.anchors, { counterfactuals: false })
    out = {
      ...out,
      degraded: Boolean(rec.anchors.legacy),
      method: rr.method,
      attachedText: rr.text,
      provenance: rr.guard ? rr.guard.provenance : null,
      misResolved: rr.method !== 'orphaned',
      wouldFlipUpgradePathExists: rr.method !== 'orphaned' && !rec.anchors.legacy,
      measuredAnchorState: anchorStateOf(reload, rec.anchors),
    }
    reload.close()
  }
  say(out)
  s.close()
}

/* ================================================================== *
 * H2 — 입양 금지를 **손으로** 우회 (사람이 documentId 를 써 넣는다)
 * ================================================================== */
for (const keepLegacyMark of [false, true]) {
  const dir = fresh(`h2-handstamp-${keepLegacyMark ? 'with-mark' : 'no-mark'}`)
  const DOC = () => docOf('Opening block of the probe document.',
    'The ledger records a disputed clause and then stops.', 'Closing block of A.')
  const a = openSession({ clientID: 1, docJSON: DOC() })
  const t = locate(a, { quote: 'disputed clause' })
  const aAnchors = captureAnchors(a, t.from, t.to)
  const aId = a.documentId
  a.close()

  const b = openSession({ clientID: 1, docJSON: DOC() })
  writeDoc(dir, b)
  const bId = b.documentId
  b.close()

  // 옛 v1 모양(문서 정체성 없음 · capture 없음)에 **사람이** 스토어의 문서 id 를 써 넣는다.
  const handStamped = { ...aAnchors, document: { id: bId } }
  delete handStamped.capture
  if (keepLegacyMark) handStamped.legacy = { storeVersion: 1, reason: 'legacy-v1-record' }

  writeFileSync(join(dir, 'annotations.json'), stringify({
    version: STORE_VERSION,
    document: 'document.json',
    documentId: bId,
    annotations: [{ id: 'a1', anchors: handStamped, body: 'from A', status: 'open', anchorState: 'bound' }],
  }))

  let loaded = null
  let loadError = null
  try { loaded = loadStore(dir) } catch (error) { loadError = error.message }
  let out = {
    probe: `H2 hand-written documentId on a legacy record (legacy mark kept: ${keepLegacyMark})`,
    documentIdA: aId, documentIdB: bId, loadError, loadRejected: Boolean(loadError),
  }
  if (loaded) {
    const session = openSession({ update: loaded.docUpdate, clientID: 9 })
    const rec = loaded.annotations[0]
    const r = resolveAnchors(session, rec.anchors, { counterfactuals: false })
    out = {
      ...out,
      ruleZeroBound: documentBinding(session, rec.anchors).bound,
      method: r.method,
      text: r.text,
      landedOffset: landedAt(session, r),
      provenance: r.guard ? r.guard.provenance : null,
      attachedToAnotherDocument: r.method !== 'orphaned',
      reason: r.reason,
    }
    // 검사기까지: 그 레코드를 겨냥한 링크가 통과하는가.
    writeLinks(dir, bId, 'ln-h2')
    const proc = spawnSync('/usr/bin/python3',
      [join(ROOT, 'check_links.py'), '--store', dir, '--annotations', join(dir, 'annotations.json'), '--format', 'json'],
      { encoding: 'utf8' })
    const verdict = proc.stdout ? JSON.parse(proc.stdout) : null
    out.checker = {
      exit: proc.status,
      pass: verdict ? verdict.pass : null,
      violations: verdict ? verdict.violations.map((v) => v.rule) : null,
      broken: verdict ? verdict.brokenEndpoints.length : null,
    }
    session.close()
  }
  say(out)
}

/* ================================================================== *
 * H3 — sticky 표식 손제거 / anchors 통째 제거
 * ================================================================== */
{
  const DOC = () => docOf('Opening block of the probe document.',
    'The ledger records a disputed clause and then stops.', 'Closing block of A.')
  const a = openSession({ clientID: 1, docJSON: DOC() })
  const t = locate(a, { quote: 'disputed clause' })
  const aAnchors = captureAnchors(a, t.from, t.to)
  a.close()

  const shapes = {
    // (i) 정체성 없음 + legacy 표식 **제거** — 계약 위반이어야 한다 (C-e).
    'identity-less, legacy mark stripped': (() => { const x = { ...aAnchors }; delete x.document; return x })(),
    // (ii) anchors 를 **통째로** 없앤 투영 모양 (id + anchorState 만).
    'anchors field removed entirely': undefined,
    // (iii) anchors: null
    'anchors null': null,
  }
  for (const [shape, anchors] of Object.entries(shapes)) {
    const dir = fresh(`h3-${shape.replace(/[^a-z]+/gi, '-')}`)
    const b = openSession({ clientID: 1, docJSON: DOC() })
    writeDoc(dir, b)
    const bId = b.documentId
    b.close()
    const record = { id: 'a1', body: 'b', status: 'open', anchorState: 'bound' }
    if (anchors !== undefined) record.anchors = anchors
    writeFileSync(join(dir, 'annotations.json'), stringify({
      version: STORE_VERSION, document: 'document.json', documentId: bId, annotations: [record],
    }))
    writeLinks(dir, bId, 'ln-h3')
    const load = attempt(() => loadStore(dir))
    const proc = spawnSync('/usr/bin/python3',
      [join(ROOT, 'check_links.py'), '--store', dir, '--annotations', join(dir, 'annotations.json'), '--format', 'json'],
      { encoding: 'utf8' })
    const verdict = proc.stdout ? JSON.parse(proc.stdout) : null
    say({
      probe: `H3 ${shape}`,
      editorLoad: load.ok ? 'accepted' : 'rejected',
      editorError: load.ok ? null : load.error,
      checker: {
        exit: proc.status,
        pass: verdict ? verdict.pass : null,
        violations: verdict ? verdict.violations.map((v) => v.rule) : null,
        broken: verdict ? verdict.brokenEndpoints.length : null,
      },
      divergence: load.ok !== Boolean(verdict && verdict.pass),
    })
  }
}

/* ================================================================== *
 * H4 — 한 스토어 안 중복 레코드 id (미상 + 정상)
 * ================================================================== */
for (const order of ['unbindable-first', 'bound-first']) {
  const DOC = () => docOf('Opening block of the probe document.',
    'The ledger records a disputed clause and then stops.', 'Closing block of A.')
  const dir = fresh(`h4-${order}`)
  const b = openSession({ clientID: 1, docJSON: DOC() })
  const t = locate(b, { quote: 'disputed clause' })
  const good = captureAnchors(b, t.from, t.to)
  writeDoc(dir, b)
  const bId = b.documentId
  b.close()
  const unbindable = { ...good, legacy: { storeVersion: 1, reason: 'legacy-v1-record' } }
  delete unbindable.document
  const records = [
    { id: 'a1', anchors: unbindable, body: 'laundered', status: 'open', anchorState: 'orphaned' },
    { id: 'a1', anchors: good, body: 'honest', status: 'open', anchorState: 'bound' },
  ]
  writeFileSync(join(dir, 'annotations.json'), stringify({
    version: STORE_VERSION, document: 'document.json', documentId: bId,
    annotations: order === 'unbindable-first' ? records : [records[1], records[0]],
  }))
  writeLinks(dir, bId, 'ln-h4')
  const load = attempt(() => loadStore(dir))
  const proc = spawnSync('/usr/bin/python3',
    [join(ROOT, 'check_links.py'), '--store', dir, '--annotations', join(dir, 'annotations.json'), '--format', 'json'],
    { encoding: 'utf8' })
  const verdict = proc.stdout ? JSON.parse(proc.stdout) : null
  // 편집기가 id 로 레코드를 찾으면 **어느 쪽**을 쥐는가 (검사기가 검증한 것과 같은 레코드인가).
  let editorPick = null
  if (load.ok) {
    const found = load.value.annotations.find((record) => record.id === 'a1')
    editorPick = {
      recordsLoaded: load.value.annotations.length,
      body: found ? found.body : null,
      anchorState: found ? found.anchorState ?? null : null,
      legacyMark: found && found.anchors ? Boolean(found.anchors.legacy) : null,
    }
  }
  say({
    probe: `H4 duplicate record id inside one store (${order})`,
    editorLoad: load.ok ? 'accepted' : 'rejected',
    editorError: load.ok ? null : load.error,
    editorPick,
    checker: {
      exit: proc.status,
      pass: verdict ? verdict.pass : null,
      violations: verdict ? verdict.violations.map((v) => v.rule) : null,
      broken: verdict ? verdict.brokenEndpoints.length : null,
    },
  })
}

/* ================================================================== *
 * H5 — 캡처 이벤트를 흉내 낸 합성 레코드 (진짜 captureAnchors 를 남의 문서에서 호출)
 * ================================================================== */
{
  const DOC = () => docOf('Opening block of the probe document.',
    'The ledger records a disputed clause and then stops.', 'Closing block of A.')
  // 문서 A: 진짜 문서. 텍스트를 편집해 앵커가 orphan 이 되어야 하는 상태로 만든다.
  const dir = fresh('h5-synthetic-capture')
  const a = openSession({ clientID: 1, docJSON: DOC() })
  const t = locate(a, { quote: 'disputed clause' })
  const honestAnchors = captureAnchors(a, t.from, t.to)
  a.dispatch((tr) => tr.delete(t.from, t.to))
  a.dispatch((tr) => tr.insertText('settled matter', t.from))
  const honest = resolveAnchors(a, honestAnchors, { counterfactuals: false })

  // 위조자: **현재 문서 상태만** 가지고 있다. 현재 텍스트에서 캡처 이벤트를 실제로 일으켜
  // ("합성 캡처") 그 이름표를 옛 exact 를 주장하는 레코드에 넣는다.
  const { index } = liveBlocks(a)
  const nowAt = index.text.indexOf('settled matter')
  const synthetic = captureAnchors(a, ...(() => {
    const from = a.editor.state.doc.resolve(1).pos + nowAt - (index.text.slice(0, nowAt).split('\n').length - 1)
    return [from, from + 'settled matter'.length]
  })())
  const disguised = { ...synthetic, textQuote: { ...honestAnchors.textQuote } }
  const evidence = captureEvidence(disguised)
  const r = resolveAnchors(a, disguised, { counterfactuals: false })
  say({
    probe: 'H5 synthetic capture event in the current document, disguised as the old record',
    honestRecord: { method: honest.method, provenance: honest.guard ? honest.guard.provenance : null },
    captureEvidence: { usable: evidence.usable, corrupt: evidence.corrupt, reason: evidence.reason },
    forgedRecord: {
      method: r.method, text: r.text, landedOffset: landedAt(a, r),
      provenance: r.guard ? r.guard.provenance : null,
      survivingChars: r.guard ? r.guard.survivingChars : null,
    },
    misResolved: r.method !== 'orphaned' && r.text !== null && r.text !== honestAnchors.textQuote.exact,
    docAfter: textOf(a),
  })
  a.close()
  rmSync(dir, { recursive: true, force: true })
}
