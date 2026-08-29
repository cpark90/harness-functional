/**
 * vnv 잔여 프로브 (8차) — 앞선 프로브가 연 두 자리를 좁혀서 다시 잰다.
 *   VNV_SCRATCH=<dir> node docs/verify/plane-editor-endpoint-binding-residual-probe.mjs
 *
 *   W1  anchor 이름이 Object.prototype 의 키일 때 (`constructor` 등) — 바인더 단독 판정
 *   W2  같은 계열 이름 전수 (`__proto__`·`toString`·`valueOf`·`hasOwnProperty`·`isPrototypeOf`)
 *   W3  같은 문서를 선언한 스토어가 둘일 때 **어느 쪽이 이기는가** (이름 순서로 뒤집히나)
 *   W4  게이트가 exit 1 인 링크 스토어에서 바인더가 그대로 초록을 내는가 (전역 판정 무시)
 *
 * tools/plane-editor/ 는 읽기만 한다.
 */
const ROOT = new URL('../../tools/plane-editor/', import.meta.url).pathname
const { openSession, locate } = await import(ROOT + 'src/session.mjs')
const { captureAnchors, anchorStateOf } = await import(ROOT + 'src/anchors.mjs')
const { loadStore, saveStore } = await import(ROOT + 'src/store.mjs')
const { ANCHOR_PART_RESOLVERS } = await import(ROOT + 'src/link-binding.mjs')
const { mkdirSync, writeFileSync, cpSync, renameSync, rmSync } = await import('node:fs')
const { join } = await import('node:path')
const { spawnSync } = await import('node:child_process')

const SCRATCH = process.env.VNV_SCRATCH || '/tmp/vnv-endpoint-binding-residual'
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

/** 링크는 id 오름차순으로 직렬화한다 (스토어 형식 규칙). */
const linkStoreAt = (dir, links) => {
  mkdirSync(dir, { recursive: true })
  writeFileSync(join(dir, 'links.json'), stringify({
    version: 1, plane: 'link',
    links: [...links].sort((a, b) => (a.id < b.id ? -1 : 1)),
  }))
  writeFileSync(join(dir, 'decisions.json'), stringify({ version: 1, plane: 'decision', decisions: [] }))
  return dir
}

const anchorLink = (id, documentId, ref, anchor, type = 'tagged') => ({
  id,
  from: { plane: 'annotation', ref, document: documentId, anchor },
  to: { plane: 'graph', ref: 'id:c-traceability' },
  type,
  created_by: 'vnv endpoint-binding residual probe',
})

const gate = (storeDir) => {
  const proc = spawnSync('/usr/bin/python3',
    [ROOT + 'check_links.py', '--store', storeDir, '--format', 'json'],
    { encoding: 'utf8', env: { ...process.env } })
  const verdict = proc.stdout ? JSON.parse(proc.stdout) : null
  return {
    exit: proc.status,
    pass: verdict ? verdict.pass : null,
    violations: verdict ? [...new Set(verdict.violations.map((v) => v.rule))].sort() : null,
  }
}

const binderCli = (storeDir) => {
  const proc = spawnSync('node', [ROOT + 'bind-links.mjs', '--store', storeDir, '--format', 'json'],
    { encoding: 'utf8', env: { ...process.env } })
  let result = null
  try { result = JSON.parse(proc.stdout) } catch { result = null }
  return {
    exit: proc.status,
    pass: result ? result.pass : null,
    counts: result ? result.counts : null,
    // 위치 필드가 **없는** 바인딩을 드러내려면 undefined 를 눈에 보이게 찍어야 한다.
    bindings: result ? result.bindings.map((r) => ({
      link: r.link, anchor: r.anchor, state: r.state,
      from: Object.hasOwn(r, 'from') ? r.from : '<field absent>',
      to: Object.hasOwn(r, 'to') ? r.to : '<field absent>',
      text: Object.hasOwn(r, 'text') ? r.text : '<field absent>',
      store: (r.store ?? '').replace(SCRATCH, '<scratch>'),
    })) : null,
    unbound: result ? result.unbound.map((r) => ({ link: r.link, reason: r.reason })) : null,
    stderr: (proc.stderr || '').trim().slice(0, 300),
  }
}

/* ---- W1 anchor 이름이 프로토타입 키 (`constructor`) ----------------------- */
{
  const ws = fresh('w1')
  const documentId = honestStore(join(ws, 'main'), 120, 'The disputed clause survives here.')
  const link = linkStoreAt(join(ws, 'link'), [anchorLink('ln-w1', documentId, 'a1', 'constructor')])
  say({
    probe: 'W1 a single anchor endpoint named `constructor` (a key the resolver table inherits)',
    declaredParts: Object.keys(ANCHOR_PART_RESOLVERS).sort(),
    lookupIsTruthy: typeof ANCHOR_PART_RESOLVERS.constructor,
    gate: gate(link),
    binder: binderCli(link),
  })
}

/* ---- W2 같은 계열 이름 전수 --------------------------------------------- */
{
  const ws = fresh('w2')
  const documentId = honestStore(join(ws, 'main'), 121, 'The disputed clause survives here.')
  const names = ['__proto__', 'toString', 'valueOf', 'hasOwnProperty', 'isPrototypeOf',
    'propertyIsEnumerable', 'toLocaleString']
  const link = linkStoreAt(join(ws, 'link'), names.map((name, i) =>
    anchorLink(`ln-w2-${String(i).padStart(2, '0')}`, documentId, 'a1', name)))
  say({
    probe: 'W2 every Object.prototype key as an anchor name',
    names,
    gate: gate(link),
    binder: binderCli(link),
  })
}

/* ---- W3 같은 문서를 선언한 스토어가 둘 — 이름 순서로 뒤집히는가 ---------- */
{
  const build = (ws, copyName) => {
    cpSync(join(ROOT, 'sample-state'), join(ws, 'main'), { recursive: true })
    const store0 = loadStore(join(ws, 'main'))
    cpSync(join(ws, 'main'), join(ws, copyName), { recursive: true })
    const session = openSession({ update: store0.docUpdate, clientID: 122 })
    const target = locate(session, { quote: 'standoff model' })
    const rebound = captureAnchors(session, target.from, target.to)
    saveStore(join(ws, copyName), {
      fragment: 'prosemirror',
      documentId: store0.documentId,
      docUpdate: store0.docUpdate,
      docJSON: store0.docJSON,
      annotations: store0.annotations.map((r) =>
        (r.id === 'a6' ? { ...r, anchors: rebound, body: 'REBOUND COPY' } : r)),
    })
    session.close()
    return linkStoreAt(join(ws, 'link'), [anchorLink('ln-w3', store0.documentId, 'a6', 'textQuote')])
  }
  {
    const ws = fresh('w3-backup-first')
    const link = build(ws, 'backup')   // 'backup' < 'main'
    say({
      probe: 'W3a duplicate store named `backup` (sorts before `main`)',
      gate: gate(link), binder: binderCli(link),
    })
  }
  {
    const ws = fresh('w3-zcopy-last')
    const link = build(ws, 'zcopy')    // 'main' < 'zcopy'
    say({
      probe: 'W3b the same duplicate renamed `zcopy` (sorts after `main`)',
      gate: gate(link), binder: binderCli(link),
    })
  }
  {
    // 사본을 지우면 남는 답은 무엇인가 (정답 대조군).
    const ws = fresh('w3-single')
    cpSync(join(ROOT, 'sample-state'), join(ws, 'main'), { recursive: true })
    const store0 = loadStore(join(ws, 'main'))
    const link = linkStoreAt(join(ws, 'link'), [anchorLink('ln-w3', store0.documentId, 'a6', 'textQuote')])
    say({ probe: 'W3c control — only the honest store is there', gate: gate(link), binder: binderCli(link) })
  }
}

/* ---- W4 게이트가 빨간 링크 스토어에서 바인더가 초록을 내는가 -------------- */
{
  const ws = fresh('w4')
  const documentId = honestStore(join(ws, 'main'), 123, 'The disputed clause survives here.')
  const link = linkStoreAt(join(ws, 'link'), [
    // 그래프에 없는 링크 타입 = 게이트가 확실히 거절하는 자리.
    anchorLink('ln-w4', documentId, 'a1', 'textQuote', 'inventedRelation'),
  ])
  say({
    probe: 'W4 the gate refuses the link store (unknown link type); does the binder still say PASS?',
    gate: gate(link),
    binder: binderCli(link),
  })
}
