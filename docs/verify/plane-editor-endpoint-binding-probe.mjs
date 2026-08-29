/**
 * vnv 적대 프로브 (8차) — **앵커 종단점이 문서 위치로 묶이는 경로**를 잰다.
 *   VNV_SCRATCH=<dir> node docs/verify/plane-editor-endpoint-binding-probe.mjs
 *
 * 7차 판정(`docs/verify/plane-editor-document-axis-verify.md` §8)이 바인딩 wave 에 건
 * 불변식 3개 중 I-1 을 실측으로 재고, 바인딩이 **진짜인지**(가리키는 텍스트가 맞는지) ·
 * **앵커가 두 벌로 갈리지 않았는지** · **오부착 0** 인지를 새 우회로 두드린다.
 *
 *   P0   대조군 — 정직한 스토어 + 앵커 종단점 (묶여야 한다)
 *   P1   M1  무수정 재사용(yUpdateBase64 가 깨진 base64) + 앵커 종단점  -> 바인딩 0 인가
 *   P1b  M1b 무수정 재사용(유효 base64, Yjs 업데이트 아님) + 앵커 종단점
 *   P2   M2  무수정 재사용(평문 일치, CRDT 만 남의 문서) + 앵커 종단점
 *   P3   실사용 link-store 의 바인딩을 **독립 경로**로 검증 (ProseMirror textBetween)
 *   P4   문서를 편집하면 바인딩이 따라 움직이는가 (링크가 selector 사본을 들고 있지 않음)
 *   P5   파괴적 편집 -> orphan 으로 보고되는가 (남의 텍스트에 붙지 않는가)
 *   V1   같은 문서를 선언한 스토어가 둘(디렉토리 백업 사본) -> 어느 쪽으로 묶는가
 *   V2   annotation 아닌 종단점(decision/graph)에 anchor 를 달면
 *   V3   계약에 없는 anchor 이름
 *   V4   레코드가 그 앵커 부분을 안 실은 종단점
 *   V5   종단점에 selector 사본 필드를 심으면
 *   V6   스토어에 없는 레코드를 가리키는 앵커 종단점
 *   V7   레코드의 anchors.document 가 남의 문서인 스토어
 *
 * tools/plane-editor/ 는 **읽기만** 한다 (산출은 scratch 뿐).
 */
const ROOT = new URL('../../tools/plane-editor/', import.meta.url).pathname
const { openSession, locate } = await import(ROOT + 'src/session.mjs')
const { captureAnchors, anchorStateOf } = await import(ROOT + 'src/anchors.mjs')
const { loadStore, saveStore } = await import(ROOT + 'src/store.mjs')
const { bindLinkStore } = await import(ROOT + 'src/link-binding.mjs')
const { buildTextIndex } = await import(ROOT + 'src/text-index.mjs')
const { mkdirSync, writeFileSync, readFileSync, cpSync, rmSync, existsSync } = await import('node:fs')
const { join } = await import('node:path')
const { spawnSync } = await import('node:child_process')

const SCRATCH = process.env.VNV_SCRATCH || '/tmp/vnv-endpoint-binding-probe'
const say = (o) => console.log(JSON.stringify(o))
const para = (t) => ({ type: 'paragraph', content: [{ type: 'text', text: t }] })
const docOf = (...texts) => ({ type: 'doc', content: texts.map(para) })
const stringify = (v) => `${JSON.stringify(v, null, 2)}\n`

const fresh = (name) => {
  const dir = join(SCRATCH, name)
  rmSync(dir, { recursive: true, force: true })
  mkdirSync(join(dir, '.git'), { recursive: true })
  return dir
}

/** 7차 프로브와 **같은 함수** (무수정 재사용). 실제 세션으로 만든 정직한 v3 스토어. */
const honestStore = (dir, clientID, line) => {
  const session = openSession({ clientID, docJSON: docOf('Opening block.', line, 'Closing block.') })
  const target = locate(session, { quote: line.slice(0, 12) })
  const anchors = captureAnchors(session, target.from, target.to)
  const state = anchorStateOf(session, anchors)
  saveStore(dir, {
    fragment: 'prosemirror',
    documentId: session.documentId,
    docUpdate: session.encodeState(),
    docJSON: session.editor.getJSON(),
    annotations: [{ id: 'a1', anchors, body: 'honest', status: 'open', anchorState: state }],
  })
  const { documentId } = session
  session.close()
  return documentId
}

/** 링크 스토어. 7차와 다른 점은 **anchor 를 실은 종단점**이라는 것뿐이다. */
const linkStoreAt = (dir, links) => {
  mkdirSync(dir, { recursive: true })
  writeFileSync(join(dir, 'links.json'), stringify({ version: 1, plane: 'link', links }))
  writeFileSync(join(dir, 'decisions.json'), stringify({ version: 1, plane: 'decision', decisions: [] }))
  return dir
}

const anchorLink = (id, documentId, ref = 'a1', anchor = 'textQuote', extra = {}) => ({
  id,
  from: { plane: 'annotation', ref, document: documentId, anchor, ...extra },
  to: { plane: 'graph', ref: 'id:c-traceability' },
  type: 'tagged',
  created_by: 'vnv endpoint-binding probe',
})

/** 게이트를 실제로 돌린다 (repo 의 check_links.py). */
const gate = (storeDir) => {
  const proc = spawnSync('/usr/bin/python3',
    [ROOT + 'check_links.py', '--store', storeDir, '--format', 'json'],
    { encoding: 'utf8', env: { ...process.env } })
  const verdict = proc.stdout ? JSON.parse(proc.stdout) : null
  return {
    exit: proc.status,
    pass: verdict ? verdict.pass : null,
    violations: verdict ? [...new Set(verdict.violations.map((v) => v.rule))].sort() : null,
    broken: verdict ? verdict.counts.brokenEndpoints : null,
    judged: verdict ? verdict.annotationStores.length : null,
  }
}

/** 바인더를 **명령줄로** 돌린다 (종료코드까지 재려면 프로세스로 돌려야 한다). */
const binderCli = (storeDir) => {
  const proc = spawnSync('node', [ROOT + 'bind-links.mjs', '--store', storeDir, '--format', 'json'],
    { encoding: 'utf8', env: { ...process.env } })
  let result = null
  try { result = JSON.parse(proc.stdout) } catch { result = null }
  return {
    exit: proc.status,
    pass: result ? result.pass : null,
    counts: result ? result.counts : null,
    bindings: result ? result.bindings.map((r) =>
      ({ link: r.link, state: r.state, from: r.from, to: r.to, text: r.text, reason: r.reason,
         method: r.method, store: r.store })) : null,
    unbound: result ? result.unbound.map((r) => ({ link: r.link, reason: r.reason, store: r.store ?? null })) : null,
    stores: result ? result.annotationStores.map((s) =>
      ({ path: s.path.replace(SCRATCH, '<scratch>'), documentId: s.documentId, opened: s.opened,
         refusal: s.refusal, bindings: s.bindings, gate: s.gate })) : null,
    stderr: (proc.stderr || '').trim().slice(0, 200),
  }
}

const writeDocState = (dir, patch) => {
  const path = join(dir, 'document.json')
  const payload = JSON.parse(readFileSync(path, 'utf8'))
  writeFileSync(path, stringify({ ...payload, ...patch }))
}

/* ---- P0 대조군 ----------------------------------------------------------- */
{
  const ws = fresh('p0')
  const documentId = honestStore(join(ws, 'main'), 90, 'The disputed clause survives here.')
  const link = linkStoreAt(join(ws, 'link'), [anchorLink('ln-p0', documentId)])
  say({ probe: 'P0 control — honest store, anchor endpoint', gate: gate(link), binder: binderCli(link) })
}

/* ---- P1 / P1b / P2 — 7차 M1·M1b·M2 무수정 + 앵커 종단점 ------------------ */
{
  const ws = fresh('p1')
  const documentId = honestStore(join(ws, 'main'), 91, 'The disputed clause survives here.')
  writeDocState(join(ws, 'main'), { yUpdateBase64: 'not-a-real-update!!!!' })
  const link = linkStoreAt(join(ws, 'link'), [anchorLink('ln-p1', documentId)])
  say({ probe: 'P1 = M1 (undecodable base64) + anchor endpoint', gate: gate(link), binder: binderCli(link) })
}
{
  const ws = fresh('p1b')
  const documentId = honestStore(join(ws, 'main'), 92, 'The disputed clause survives here.')
  writeDocState(join(ws, 'main'), {
    yUpdateBase64: Buffer.from('this is plain text, not a CRDT update').toString('base64'),
  })
  const link = linkStoreAt(join(ws, 'link'), [anchorLink('ln-p1b', documentId)])
  say({ probe: 'P1b = M1b (valid base64, not a Yjs update) + anchor endpoint', gate: gate(link), binder: binderCli(link) })
}
{
  const ws = fresh('p2')
  const documentA = honestStore(join(ws, 'a'), 93, 'The disputed clause survives here.')
  honestStore(join(ws, 'b'), 94, 'A different document with other words.')
  const foreign = JSON.parse(readFileSync(join(ws, 'b', 'document.json'), 'utf8'))
  writeDocState(join(ws, 'a'), { yUpdateBase64: foreign.yUpdateBase64 })
  rmSync(join(ws, 'b'), { recursive: true, force: true })
  const link = linkStoreAt(join(ws, 'link'), [anchorLink('ln-p2', documentA)])
  say({ probe: 'P2 = M2 (plaintext matches, CRDT is another document) + anchor endpoint', gate: gate(link), binder: binderCli(link) })
}

/* ---- P3 실사용 link-store 의 바인딩을 독립 경로로 확인 -------------------- */
{
  const store = loadStore(join(ROOT, 'sample-state'))
  const session = openSession({ update: store.docUpdate, clientID: 4242 })
  const doc = session.doc
  const index = buildTextIndex(doc)
  const result = bindLinkStore({ storeDir: join(ROOT, 'link-store') })
  const rows = result.bindings.map((row) => {
    // 독립 경로: ProseMirror 자신의 textBetween 으로 그 위치의 텍스트를 뜬다.
    const slice = doc.textBetween(row.from, row.to, '\n')
    const occurrences = []
    let at = index.text.indexOf(slice)
    while (at !== -1 && slice.length > 0) { occurrences.push(at); at = index.text.indexOf(slice, at + 1) }
    const record = store.annotations.find((r) => r.id === row.record)
    return {
      link: row.link,
      anchor: row.anchor,
      claimedText: row.text,
      textBetween: slice,
      agrees: slice === row.text,
      occurrencesOfThatTextInTheDocument: occurrences.length,
      capturedQuote: record?.anchors?.textQuote?.exact ?? null,
      capturedPrefix: record?.anchors?.textQuote?.prefix ?? null,
      capturedBlockText: record?.anchors?.blockContext?.text ?? null,
      capturedBlockItemId: record?.anchors?.blockContext?.itemId ?? null,
      boundBlockItemId: row.blockItemId,
      // 인용문이 문서에 두 번 나올 때 **어느 쪽**에 붙었나 (prefix 로 판정)
      textBefore: index.text.slice(Math.max(0, occurrences[0] ?? 0) - 0, 0) || null,
      contextAround: (() => {
        const start = row.from
        const from = Math.max(0, start - 32)
        return doc.textBetween(from, Math.min(doc.content.size, row.to + 12), '\n')
      })(),
    }
  })
  say({ probe: 'P3 the real link-store bindings, checked through ProseMirror textBetween', documentId: store.documentId, rows })
  session.close()
}

/* ---- P4 문서를 편집하면 바인딩이 따라가는가 (selector 사본 없음) ---------- */
{
  const ws = fresh('p4')
  cpSync(join(ROOT, 'sample-state'), join(ws, 'main'), { recursive: true })
  const store0 = loadStore(join(ws, 'main'))
  const link = linkStoreAt(join(ws, 'link'), [
    anchorLink('ln-p4-quote', store0.documentId, 'a6', 'textQuote'),
    anchorLink('ln-p4-block', store0.documentId, 'a5', 'blockContext'),
  ])
  const before = binderCli(link)
  // 문서 맨 앞에 28자를 끼워 넣는다 (앵커보다 **앞**이므로 위치가 그만큼 밀려야 한다).
  const session = openSession({ update: store0.docUpdate, clientID: 777 })
  session.dispatch((tr) => tr.insertText('Inserted preface, 28 chars.\n', 1))
  saveStore(join(ws, 'main'), {
    fragment: 'prosemirror',
    documentId: store0.documentId,
    docUpdate: session.encodeState(),
    docJSON: session.editor.getJSON(),
    annotations: store0.annotations,
  })
  session.close()
  const after = binderCli(link)
  say({
    probe: 'P4 editing the document moves the derived position (the link stores no selector copy)',
    before: before.bindings,
    after: after.bindings,
    gateAfter: gate(link),
  })
}

/* ---- P5 파괴적 편집 -> orphan (남의 텍스트에 붙지 않는다) ----------------- */
{
  const ws = fresh('p5')
  cpSync(join(ROOT, 'sample-state'), join(ws, 'main'), { recursive: true })
  const store0 = loadStore(join(ws, 'main'))
  const link = linkStoreAt(join(ws, 'link'), [
    anchorLink('ln-p5-quote', store0.documentId, 'a6', 'textQuote'),
    anchorLink('ln-p5-block', store0.documentId, 'a5', 'blockContext'),
  ])
  const session = openSession({ update: store0.docUpdate, clientID: 778 })
  // a6 이 든 블록을 통째로 지우고, **같은 문장을 다른 자리에 다시 타이핑**한다
  // (쌍둥이 함정: 텍스트만 보면 붙을 자리가 생긴다).
  const index = buildTextIndex(session.doc)
  const blockWithA6 = index.blocks.find((b) => b.text.includes('Wrong resolution is worse'))
  const blockWithA5 = index.blocks.find((b) => b.text.includes('Selector multiplexing'))
  session.dispatch((tr) => {
    const doc = tr.doc
    const from = blockWithA6.pmFrom
    const to = from + blockWithA6.node.nodeSize
    tr.delete(from, to)
    return tr
  })
  session.dispatch((tr) => tr.insertText(
    'Wrong resolution is worse than an honest orphan record.', tr.doc.content.size - 1))
  // a5 블록을 둘로 가른다 (blockContext 정체성이 바뀌는 자리)
  const index2 = buildTextIndex(session.doc)
  const a5now = index2.blocks.find((b) => b.text.includes('Selector multiplexing'))
  if (a5now) {
    session.dispatch((tr) => tr.split(a5now.pmInnerFrom + 21))
  }
  saveStore(join(ws, 'main'), {
    fragment: 'prosemirror',
    documentId: store0.documentId,
    docUpdate: session.encodeState(),
    docJSON: session.editor.getJSON(),
    annotations: store0.annotations,
  })
  session.close()
  say({
    probe: 'P5 destructive edit + retyped twin sentence: orphan or misattachment?',
    binder: binderCli(link),
    gate: gate(link),
  })
}

/* ---- V1 같은 문서를 선언한 스토어가 둘 (백업 사본) ------------------------ */
{
  const ws = fresh('v1')
  cpSync(join(ROOT, 'sample-state'), join(ws, 'main'), { recursive: true })
  const store0 = loadStore(join(ws, 'main'))
  // 백업 사본을 뜬 뒤, **사본 쪽의 a6 만 다른 문장에 다시 앵커**한다 (같은 문서의 합법적 앵커).
  cpSync(join(ws, 'main'), join(ws, 'backup'), { recursive: true })
  const session = openSession({ update: store0.docUpdate, clientID: 779 })
  const target = locate(session, { quote: 'standoff model' })
  const rebound = captureAnchors(session, target.from, target.to)
  saveStore(join(ws, 'backup'), {
    fragment: 'prosemirror',
    documentId: store0.documentId,
    docUpdate: store0.docUpdate,
    docJSON: store0.docJSON,
    annotations: store0.annotations.map((r) =>
      (r.id === 'a6' ? { ...r, anchors: rebound, body: 'REBOUND COPY' } : r)),
  })
  session.close()
  const link = linkStoreAt(join(ws, 'link'), [anchorLink('ln-v1', store0.documentId, 'a6', 'textQuote')])
  say({
    probe: 'V1 two stores declare the same document (a backup copy, one re-anchored)',
    gate: gate(link),
    binder: binderCli(link),
  })
}

/* ---- V2 annotation 이 아닌 종단점에 anchor -------------------------------- */
{
  const ws = fresh('v2')
  const documentId = honestStore(join(ws, 'main'), 95, 'The disputed clause survives here.')
  const link = linkStoreAt(join(ws, 'link'), [{
    id: 'ln-v2',
    from: { plane: 'decision', ref: 'dec-x', anchor: 'textQuote' },
    to: { plane: 'graph', ref: 'id:c-traceability', anchor: 'blockContext' },
    type: 'tagged',
    created_by: 'vnv endpoint-binding probe',
  }])
  writeFileSync(join(ws, 'link', 'decisions.json'), stringify({
    version: 1, plane: 'decision',
    decisions: [{ id: 'dec-x', title: 'probe', status: 'open', body: 'probe', created_by: 'vnv' }],
  }))
  say({ probe: 'V2 anchor on non-annotation endpoints (decision / graph)', gate: gate(link), binder: binderCli(link), documentId })
}

/* ---- V3 계약에 없는 anchor 이름 ------------------------------------------ */
{
  const ws = fresh('v3')
  const documentId = honestStore(join(ws, 'main'), 96, 'The disputed clause survives here.')
  const link = linkStoreAt(join(ws, 'link'), [
    anchorLink('ln-v3-a', documentId, 'a1', 'relativePosition'),
    anchorLink('ln-v3-b', documentId, 'a1', 'textQuote '),
    anchorLink('ln-v3-c', documentId, 'a1', 'constructor'),
  ])
  say({ probe: 'V3 anchor names outside the contract surface', gate: gate(link), binder: binderCli(link) })
}

/* ---- V4 레코드가 그 앵커 부분을 안 실은 종단점 --------------------------- */
{
  const ws = fresh('v4')
  const documentId = honestStore(join(ws, 'main'), 97, 'The disputed clause survives here.')
  // 레코드에서 blockContext 만 뺀다 (나머지 계약은 그대로).
  const path = join(ws, 'main', 'annotations.json')
  const payload = JSON.parse(readFileSync(path, 'utf8'))
  delete payload.annotations[0].anchors.blockContext
  writeFileSync(path, stringify(payload))
  const link = linkStoreAt(join(ws, 'link'), [anchorLink('ln-v4', documentId, 'a1', 'blockContext')])
  say({ probe: 'V4 endpoint names blockContext, the record no longer carries it', gate: gate(link), binder: binderCli(link) })
}

/* ---- V5 종단점에 selector 사본 필드 -------------------------------------- */
{
  const ws = fresh('v5')
  const documentId = honestStore(join(ws, 'main'), 98, 'The disputed clause survives here.')
  const link = linkStoreAt(join(ws, 'link'), [
    anchorLink('ln-v5-a', documentId, 'a1', 'textQuote', { from: 17, to: 29 }),
    anchorLink('ln-v5-b', documentId, 'a1', 'textQuote', {
      textQuote: { exact: 'The disputed', prefix: '', suffix: '' },
    }),
  ])
  say({ probe: 'V5 the endpoint carries its own selector copy', gate: gate(link), binder: binderCli(link) })
}

/* ---- V6 스토어에 없는 레코드 --------------------------------------------- */
{
  const ws = fresh('v6')
  const documentId = honestStore(join(ws, 'main'), 99, 'The disputed clause survives here.')
  const link = linkStoreAt(join(ws, 'link'), [anchorLink('ln-v6', documentId, 'zz', 'textQuote')])
  say({ probe: 'V6 anchor endpoint names a record that is not in the store', gate: gate(link), binder: binderCli(link) })
}

/* ---- V7 레코드의 anchors.document 가 남의 문서 --------------------------- */
{
  const ws = fresh('v7')
  const documentId = honestStore(join(ws, 'main'), 100, 'The disputed clause survives here.')
  const path = join(ws, 'main', 'annotations.json')
  const payload = JSON.parse(readFileSync(path, 'utf8'))
  payload.annotations[0].anchors.document = { id: 'doc-somebody-elses' }
  writeFileSync(path, stringify(payload))
  const link = linkStoreAt(join(ws, 'link'), [anchorLink('ln-v7', documentId, 'a1', 'textQuote')])
  say({ probe: 'V7 the record claims another document than the store it sits in', gate: gate(link), binder: binderCli(link) })
}

if (!existsSync(SCRATCH)) mkdirSync(SCRATCH, { recursive: true })
