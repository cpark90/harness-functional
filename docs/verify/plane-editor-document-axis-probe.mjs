/**
 * vnv 적대 프로브 (7차) — 문서 축이 fail-closed 로 닫힌 뒤 **새로 창안한** 우회를 잰다.
 *   VNV_SCRATCH=<dir> node docs/verify/plane-editor-document-axis-probe.mjs
 *
 * 6차에서 닫힌 것은 "옆 document.json 을 **읽을 수 없다**"(부재·파싱불가·상태없음·정체성없음)
 * 계열이다. 게이트는 CRDT 를 해독하지 않으므로 그 뒤의 축 — **실려 있는 상태가 진짜 열리는
 * 문서인가** — 은 여전히 평문 모양 검사(`isinstance(state, str) and state`)에서 멈춘다.
 * 그 틈을 겨냥한다.
 *
 *   M0  대조군    — 정직한 스토어 (양쪽 accept).
 *   M1  document.json 의 yUpdateBase64 가 **깨진 base64**(JSON 은 멀쩡, 평문 id 는 일치).
 *   M1b 같은 자리, yUpdateBase64 가 **유효한 base64 이지만 Yjs 업데이트가 아님**.
 *   M2  평문 documentId 는 스토어와 일치하는데 **CRDT 상태만 남의 문서**(스플라이스).
 *   M3  document.json 이 **디렉토리**(파일이 아님) — fail-closed 가 모양까지 닫혔는가.
 *   M4  document.json 이 **끊어진 심링크**.
 *   M5  document.json 이 JSON **배열**(객체가 아님).
 *   M6  v1 스토어를 document.json 없이 옮김 — 종단점을 안 묶는 스토어에도 문서 축이 도나.
 *
 * tools/plane-editor/ 는 읽기만 한다 (산출은 scratch 뿐).
 */
const ROOT = new URL('../../tools/plane-editor/', import.meta.url).pathname
const { openSession, locate } = await import(ROOT + 'src/session.mjs')
const { captureAnchors, anchorStateOf } = await import(ROOT + 'src/anchors.mjs')
const { loadStore, saveStore } = await import(ROOT + 'src/store.mjs')
const { mkdirSync, writeFileSync, readFileSync, rmSync, symlinkSync, existsSync } =
  await import('node:fs')
const { join } = await import('node:path')
const { spawnSync } = await import('node:child_process')

const SCRATCH = process.env.VNV_SCRATCH || '/tmp/vnv-document-axis-probe'
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

/** 실제 세션으로 만든 정직한 v3 스토어. 반환은 documentId. */
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

const linkStoreAt = (dir, documentId, linkId, ref = 'a1') => {
  mkdirSync(dir, { recursive: true })
  writeFileSync(join(dir, 'links.json'), stringify({
    version: 1,
    plane: 'link',
    links: [{
      id: linkId,
      from: { plane: 'annotation', ref, document: documentId },
      to: { plane: 'graph', ref: 'id:c-traceability' },
      type: 'tagged',
      created_by: 'vnv document-axis probe',
    }],
  }))
  writeFileSync(join(dir, 'decisions.json'), stringify({ version: 1, plane: 'decision', decisions: [] }))
  return dir
}

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
    documentStates: verdict ? verdict.annotationStores.map((s) => s.documentState) : null,
    recordsRead: verdict && verdict.counts ? verdict.counts.annotationRecordsRead : null,
  }
}

/** 진짜 편집기 로드 경로. */
const editor = (storeDir, storeFile) => {
  try {
    loadStore(storeDir, storeFile ? { storeFile } : {})
    return { load: 'accepted', code: null }
  } catch (error) {
    return { load: 'rejected', code: error.code ?? '<threw>' }
  }
}

const writeDocState = (dir, patch) => {
  const path = join(dir, 'document.json')
  const payload = JSON.parse(readFileSync(path, 'utf8'))
  writeFileSync(path, stringify({ ...payload, ...patch }))
}

/* ---- M0 대조군 --------------------------------------------------------- */
{
  const ws = fresh('m0')
  const documentId = honestStore(join(ws, 'main'), 90, 'The disputed clause survives here.')
  const link = linkStoreAt(join(ws, 'link'), documentId, 'ln-m0')
  say({ probe: 'M0 control — an honest store', gate: gate(link), editor: editor(join(ws, 'main')) })
}

/* ---- M1 yUpdateBase64 가 깨진 base64 ------------------------------------ */
{
  const ws = fresh('m1')
  const documentId = honestStore(join(ws, 'main'), 91, 'The disputed clause survives here.')
  writeDocState(join(ws, 'main'), { yUpdateBase64: 'not-a-real-update!!!!' })
  const link = linkStoreAt(join(ws, 'link'), documentId, 'ln-m1')
  say({
    probe: 'M1 document.json carries a yUpdateBase64 that is not decodable (JSON stays valid)',
    gate: gate(link),
    editor: editor(join(ws, 'main')),
  })
}

/* ---- M1b 유효 base64 이지만 Yjs 업데이트가 아님 -------------------------- */
{
  const ws = fresh('m1b')
  const documentId = honestStore(join(ws, 'main'), 92, 'The disputed clause survives here.')
  writeDocState(join(ws, 'main'), {
    yUpdateBase64: Buffer.from('this is plain text, not a CRDT update').toString('base64'),
  })
  const link = linkStoreAt(join(ws, 'link'), documentId, 'ln-m1b')
  say({
    probe: 'M1b valid base64 that decodes to bytes which are not a Yjs update',
    gate: gate(link),
    editor: editor(join(ws, 'main')),
  })
}

/* ---- M2 평문은 일치, CRDT 상태만 남의 문서 (스플라이스) ------------------ */
{
  const ws = fresh('m2')
  const documentA = honestStore(join(ws, 'a'), 93, 'The disputed clause survives here.')
  honestStore(join(ws, 'b'), 94, 'A different document with other words.')
  const foreign = JSON.parse(readFileSync(join(ws, 'b', 'document.json'), 'utf8'))
  writeDocState(join(ws, 'a'), { yUpdateBase64: foreign.yUpdateBase64 })
  rmSync(join(ws, 'b'), { recursive: true, force: true })
  const link = linkStoreAt(join(ws, 'link'), documentA, 'ln-m2')
  say({
    probe: 'M2 plaintext documentId still matches the store, but the CRDT state is another document',
    gate: gate(link),
    editor: editor(join(ws, 'a')),
  })
}

/* ---- M3 document.json 이 디렉토리 --------------------------------------- */
{
  const ws = fresh('m3')
  const documentId = honestStore(join(ws, 'main'), 95, 'The disputed clause survives here.')
  rmSync(join(ws, 'main', 'document.json'))
  mkdirSync(join(ws, 'main', 'document.json'))
  const link = linkStoreAt(join(ws, 'link'), documentId, 'ln-m3')
  say({
    probe: 'M3 document.json is a directory, not a file',
    gate: gate(link),
    editor: editor(join(ws, 'main')),
  })
}

/* ---- M4 document.json 이 끊어진 심링크 ---------------------------------- */
{
  const ws = fresh('m4')
  const documentId = honestStore(join(ws, 'main'), 96, 'The disputed clause survives here.')
  rmSync(join(ws, 'main', 'document.json'))
  symlinkSync(join(ws, 'main', 'nowhere.json'), join(ws, 'main', 'document.json'))
  const link = linkStoreAt(join(ws, 'link'), documentId, 'ln-m4')
  say({
    probe: 'M4 document.json is a dangling symlink',
    gate: gate(link),
    editor: editor(join(ws, 'main')),
  })
}

/* ---- M5 document.json 이 JSON 배열 -------------------------------------- */
{
  const ws = fresh('m5')
  const documentId = honestStore(join(ws, 'main'), 97, 'The disputed clause survives here.')
  writeFileSync(join(ws, 'main', 'document.json'), stringify([{ documentId }]))
  const link = linkStoreAt(join(ws, 'link'), documentId, 'ln-m5')
  say({
    probe: 'M5 document.json parses but is a JSON array, not an object',
    gate: gate(link),
    editor: editor(join(ws, 'main')),
  })
}

/* ---- M6 v1 스토어를 document.json 없이 옮김 ------------------------------ */
{
  const ws = fresh('m6')
  const documentId = honestStore(join(ws, 'main'), 98, 'The disputed clause survives here.')
  const payload = JSON.parse(readFileSync(join(ws, 'main', 'annotations.json'), 'utf8'))
  mkdirSync(join(ws, 'exported'), { recursive: true })
  writeFileSync(join(ws, 'exported', 'annotations.json'), stringify({
    version: 1,
    annotations: payload.annotations.map((r) => ({ ...r, anchors: { legacy: r.anchors } })),
  }))
  rmSync(join(ws, 'main'), { recursive: true, force: true })
  const link = linkStoreAt(join(ws, 'link'), documentId, 'ln-m6')
  say({
    probe: 'M6 a v1 store (binds no endpoints) exported without its document.json',
    gate: gate(link),
    editor: editor(join(ws, 'exported')),
  })
}

if (!existsSync(SCRATCH)) mkdirSync(SCRATCH, { recursive: true })
