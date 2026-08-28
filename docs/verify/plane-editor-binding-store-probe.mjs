/**
 * vnv 저장소 계약 + 세탁 경로 프로브 (바인딩 준비 조건 판정).
 *   node docs/verify/plane-editor-binding-store-probe.mjs <scratch-dir>
 * C-a~C-h = 쓰기/읽기 시점 거절 시험, B7 = 옛 스토어 입양 후 재저장 세탁 경로.
 * tools/plane-editor/ 는 읽기만 한다 (산출은 scratch 뿐).
 */
const ROOT = '/home/cpark/git/harness_ontology/tools/plane-editor/'
const { openSession, locate } = await import(ROOT + 'src/session.mjs')
const { captureAnchors, resolveAnchors, anchorStateOf } = await import(ROOT + 'src/anchors.mjs')
const { saveStore, loadStore, STORE_VERSION } = await import(ROOT + 'src/store.mjs')
const Y = await import(ROOT + 'node_modules/yjs/dist/yjs.mjs')
const { mkdirSync, writeFileSync, readFileSync, rmSync } = await import('node:fs')
const { join } = await import('node:path')
const { spawnSync } = await import('node:child_process')

const SCRATCH = process.argv[2] || process.env.VNV_SCRATCH || '/tmp/vnv-store-probe'
const say = (o) => console.log(JSON.stringify(o))
const para = (t) => ({ type: 'paragraph', content: [{ type: 'text', text: t }] })
const DOC = { type: 'doc', content: [para('Opening block.'), para('The ledger records a disputed clause and then stops.')] }
const attempt = (fn) => { try { return { ok: true, value: fn() } } catch (e) { return { ok: false, error: e.message } } }

const fresh = () => {
  const dir = join(SCRATCH, 'contract', String(Math.random()).slice(2))
  rmSync(dir, { recursive: true, force: true })
  mkdirSync(dir, { recursive: true })
  return dir
}

// C-a: 측정되지 않은 anchorState 로 저장
{
  const s = openSession({ clientID: 1, docJSON: DOC })
  const t = locate(s, { quote: 'disputed clause' })
  const anchors = captureAnchors(s, t.from, t.to)
  const dir = fresh()
  const base = { fragment: 'prosemirror', documentId: s.documentId, docUpdate: s.encodeState(), docJSON: s.editor.getJSON() }
  say({ probe: 'C-a saveStore without a measured anchorState',
        noState: attempt(() => saveStore(dir, { ...base, annotations: [{ id: 'a1', anchors, body: 'b', status: 'open' }] })),
        badState: attempt(() => saveStore(dir, { ...base, annotations: [{ id: 'a1', anchors, body: 'b', status: 'open', anchorState: 'Bound' }] })),
        measured: attempt(() => Boolean(saveStore(dir, { ...base, annotations: [{ id: 'a1', anchors, body: 'b', status: 'open', anchorState: anchorStateOf(s, anchors) }] }))) })
  s.close()
}

// C-b/C-c/C-d/C-e: 파일 필드 변조 -> loadStore 가 CRDT 상태와 대조하는가
{
  const s = openSession({ clientID: 1, docJSON: DOC })
  const t = locate(s, { quote: 'disputed clause' })
  const anchors = captureAnchors(s, t.from, t.to)
  const dir = fresh()
  saveStore(dir, { fragment: 'prosemirror', documentId: s.documentId, docUpdate: s.encodeState(),
                   docJSON: s.editor.getJSON(),
                   annotations: [{ id: 'a1', anchors, body: 'b', status: 'open', anchorState: anchorStateOf(s, anchors) }] })
  const readJSON = (f) => JSON.parse(readFileSync(join(dir, f), 'utf8'))
  const writeJSON = (f, v) => writeFileSync(join(dir, f), `${JSON.stringify(v, null, 2)}\n`)
  const pristineDoc = readJSON('document.json')
  const pristineAnn = readJSON('annotations.json')

  say({ probe: 'C-b saveStore with a documentId that is not the state identity',
        result: attempt(() => saveStore(fresh(), { fragment: 'prosemirror', documentId: 'doc-forged',
          docUpdate: s.encodeState(), docJSON: s.editor.getJSON(),
          annotations: [{ id: 'a1', anchors, body: 'b', status: 'open', anchorState: 'bound' }] })) })

  writeJSON('document.json', { ...pristineDoc, documentId: 'doc-tampered' })
  say({ probe: 'C-c document.json documentId tampered', result: attempt(() => Boolean(loadStore(dir))) })
  writeJSON('document.json', pristineDoc)

  writeJSON('annotations.json', { ...pristineAnn, documentId: 'doc-tampered' })
  say({ probe: 'C-d annotations.json documentId tampered', result: attempt(() => Boolean(loadStore(dir))) })

  const stripped = JSON.parse(JSON.stringify(pristineAnn))
  delete stripped.annotations[0].anchors.document
  writeJSON('annotations.json', stripped)
  say({ probe: 'C-e v3 record without its document selector', result: attempt(() => Boolean(loadStore(dir))) })

  const foreign = JSON.parse(JSON.stringify(pristineAnn))
  foreign.annotations[0].anchors.document = { id: 'doc-somewhere-else' }
  writeJSON('annotations.json', foreign)
  say({ probe: 'C-f v3 record claiming another document', result: attempt(() => Boolean(loadStore(dir))) })

  writeJSON('annotations.json', pristineAnn)
  say({ probe: 'C-g control: untouched store loads', result: attempt(() => Boolean(loadStore(dir))) })
  s.close()
}

// C-h: 정체성 없는 문서 상태
{
  const raw = new Y.Doc()
  const bare = openSession({ clientID: 1, docJSON: DOC })
  const state = bare.encodeState()
  bare.close()
  // 정체성 키를 지운 상태를 만든다 (meta 맵을 비운 새 문서에 텍스트만 옮길 수는 없으므로
  // 원 상태를 적용한 뒤 meta 키를 삭제한다 — CRDT 상 삭제라 documentIdOf 는 null 이 된다).
  Y.applyUpdate(raw, state)
  raw.getMap('meta').delete('documentId')
  const stripped = Y.encodeStateAsUpdate(raw)
  raw.destroy()
  const s = openSession({ update: stripped, clientID: 2 })
  const t = locate(s, { quote: 'disputed clause' })
  say({ probe: 'C-h a document state with no identity',
        sessionDocumentId: s.documentId,
        capture: attempt(() => captureAnchors(s, t.from, t.to)).ok,
        captureError: attempt(() => captureAnchors(s, t.from, t.to)).error,
        resolveForeignRecord: (() => {
          const r = resolveAnchors(s, { document: { id: 'doc-1' }, relativePosition: { start: 'AA==', end: 'AA==' },
            textQuote: { exact: 'x', prefix: '', suffix: '' }, capture: null, blockContext: null })
          return { method: r.method, reason: r.reason }
        })() })
  s.close()
}

/* ================= B7 세탁 경로 ================= */
{
const sayB7 = (o) => console.log(JSON.stringify(o, null, 1))
const para = (t) => ({ type: 'paragraph', content: [{ type: 'text', text: t }] })
const SENT = 'The ledger records a disputed clause and then stops.'
const DOC = { type: 'doc', content: [para('Opening block of the probe document.'), para(SENT), para('Closing block of A.')] }
const stringify = (v) => `${JSON.stringify(v, null, 2)}\n`

const dir = join(SCRATCH, 'launder')
rmSync(dir, { recursive: true, force: true })
mkdirSync(dir, { recursive: true })

// 문서 A — 레코드의 진짜 출처
const a = openSession({ clientID: 1, docJSON: DOC })
const t = locate(a, { quote: 'disputed clause' })
const aAnchors = captureAnchors(a, t.from, t.to)
const aId = a.documentId
a.close()

// 문서 B — 다른 문서. 그 옆에 A 의 v1 주석 파일을 둔다.
const b = openSession({ clientID: 1, docJSON: DOC })
const bId = b.documentId
writeFileSync(join(dir, 'document.json'), stringify({
  fragment: 'prosemirror', documentId: bId,
  yUpdateBase64: Buffer.from(b.encodeState()).toString('base64'),
  prosemirrorJSON: b.editor.getJSON(),
}))
const legacy = { ...aAnchors }
delete legacy.document
delete legacy.capture
writeFileSync(join(dir, 'annotations.json'), stringify({
  version: 1, document: 'document.json',
  annotations: [{ id: 'a1', anchors: legacy, body: 'from document A', status: 'open' }],
}))

// 1) 로드 -> 해소 (편집기가 여는 경로)
const loaded = loadStore(dir)
const session = openSession({ update: loaded.docUpdate, clientID: 9 })
const record = loaded.annotations[0]
const resolution = resolveAnchors(session, record.anchors, { counterfactuals: false })

// 2) 저장 (편집기가 닫히며 쓰는 경로) — 여기서 v3 로 다시 쓰인다
saveStore(dir, {
  fragment: loaded.fragment, documentId: session.documentId,
  docUpdate: session.encodeState(), docJSON: session.editor.getJSON(),
  annotations: [{ ...record, anchorState: anchorStateOf(session, record.anchors) }],
})
const after = JSON.parse(readFileSync(join(dir, 'annotations.json'), 'utf8'))

// 3) 링크 종단점으로 물린다
const linkDir = join(dir, 'link-store')
mkdirSync(linkDir, { recursive: true })
writeFileSync(join(linkDir, 'decisions.json'), stringify({ version: 1, plane: 'decision', decisions: [] }))
writeFileSync(join(linkDir, 'links.json'), stringify({
  version: 1, plane: 'link',
  links: [{ id: 'ln-laundered', from: { plane: 'annotation', ref: 'a1', document: bId },
            to: { plane: 'graph', ref: 'id:c-traceability' }, type: 'tagged', created_by: 'vnv launder probe' }],
}))
const run = spawnSync('/usr/bin/python3', [join(ROOT, 'check_links.py'), '--store', linkDir,
  '--annotations', join(dir, 'annotations.json'), '--format', 'json'], { encoding: 'utf8' })
const verdict = run.stdout ? JSON.parse(run.stdout) : null

sayB7({
  probe: 'B7 legacy store beside another document -> load -> save -> link endpoint',
  documentIdA: aId,
  documentIdB: bId,
  loadedRecordStampedWith: record.anchors.document,
  legacyMark: record.anchors.legacy,
  resolvedInB: { method: resolution.method, text: resolution.text, provenance: resolution.guard ? resolution.guard.provenance : null },
  savedStoreVersion: after.version,
  savedRecordDocument: after.annotations[0].anchors.document,
  savedLegacyMarkKept: Boolean(after.annotations[0].anchors.legacy),
  savedAnchorState: after.annotations[0].anchorState,
  checker: { exit: run.status, pass: verdict ? verdict.pass : null,
             violations: verdict ? verdict.violations.map((v) => v.rule) : null,
             broken: verdict ? verdict.brokenEndpoints.length : null,
             storeVersion: verdict ? verdict.annotationStores[0].version : null,
             binds: verdict ? verdict.annotationStores[0].bindsEndpoints : null },
  verdict: after.version === 3 && verdict && verdict.pass && resolution.method !== 'orphaned'
    ? "LAUNDERED: A 의 레코드가 B 의 v3 종단점이 됐다"
    : 'blocked somewhere',
})
session.close(); b.close()
}
