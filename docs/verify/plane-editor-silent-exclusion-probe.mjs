/**
 * vnv 프로브 (11차) — "조용한 제외"를 닫았다는 주장이 **축으로** 닫혔는가.
 *   VNV_SCRATCH=<dir> [VNV_PE_ROOT=<tools/plane-editor/>] [VNV_ONLY=E1,E4] \
 *     node docs/verify/plane-editor-silent-exclusion-probe.mjs
 *
 *   E1  `.git` 안의 스토어 (10차가 잰 것은 `node_modules` 한 이름뿐이었다)
 *   E2  **중첩** 제외 이름 (`node_modules/pkg/node_modules/…`)
 *   E3  서로 다른 제외 이름의 중첩 (`node_modules/pkg/.git/…`)
 *   E4  **sniff 예산**(4KB)으로 제외 트리 안에서 다시 숨기 — 제외 트리 안에서는
 *       `annotations.json` 이라는 이름이 무조건 판정되지 않는다(밖과 비대칭)
 *   E5  **읽을 수 없는** 스토어로 숨기 (밖이면 exit 2 fail-closed, 안이면 침묵인가)
 *   E6  가려진 스토어가 판정 JSON 에서 **이름으로 불리는가** (흔적 = 수인가 이름인가)
 *   E7  두 스토어가 **각각 다른** 제외 트리에 있을 때 (아무도 답하지 않는가)
 *   E8  대가: 제외 트리를 훑는 비용 (junk json N개 · pnpm 식 심링크 트리)
 *
 * `VNV_PE_ROOT` 를 주면 그 트리의 도구로 같은 시험을 돌린다 (반사실용). tools/ 는 읽기만.
 */
const ROOT = process.env.VNV_PE_ROOT || new URL('../../tools/plane-editor/', import.meta.url).pathname
const { openSession, locate } = await import(ROOT + 'src/session.mjs')
const { captureAnchors, anchorStateOf } = await import(ROOT + 'src/anchors.mjs')
const { loadStore, saveStore } = await import(ROOT + 'src/store.mjs')
const { mkdirSync, writeFileSync, readFileSync, cpSync, symlinkSync, rmSync, chmodSync } =
  await import('node:fs')
const { join } = await import('node:path')
const { spawnSync } = await import('node:child_process')

const SCRATCH = process.env.VNV_SCRATCH || '/tmp/vnv-silent-exclusion'
const ONLY = (process.env.VNV_ONLY || '').split(',').filter(Boolean)
const runs = (name) => ONLY.length === 0 || ONLY.some((n) => name.startsWith(n))
const say = (o) => console.log(JSON.stringify(o))
const para = (t) => ({ type: 'paragraph', content: [{ type: 'text', text: t }] })
const docOf = (...texts) => ({ type: 'doc', content: texts.map(para) })
const stringify = (v) => `${JSON.stringify(v, null, 2)}\n`
const short = (p) => (p || '').replace(SCRATCH, '<scratch>')

const fresh = (name) => {
  const dir = join(SCRATCH, name)
  rmSync(dir, { recursive: true, force: true })
  mkdirSync(join(dir, '.git'), { recursive: true })
  return dir
}
const plain = (name) => {
  const dir = join(SCRATCH, name)
  rmSync(dir, { recursive: true, force: true })
  mkdirSync(dir, { recursive: true })
  return dir
}

const LINE = 'The disputed clause survives here.'

/** 실제 세션으로 만든 정직한 v3 스토어 (앞 프로브들과 같은 함수). */
const honestStore = (dir, clientID, line = LINE) => {
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

/** 같은 문서를 선언하되 **다른 문장**에 다시 앵커한 사본 (고르면 답이 갈리게 둔다). */
const reboundCopy = (fromDir, toDir, clientID, quote = 'Closing block') => {
  const store = loadStore(fromDir)
  const session = openSession({ update: store.docUpdate, clientID })
  const target = locate(session, { quote })
  const anchors = captureAnchors(session, target.from, target.to)
  saveStore(toDir, {
    fragment: 'prosemirror',
    documentId: store.documentId,
    docUpdate: store.docUpdate,
    docJSON: store.docJSON,
    annotations: store.annotations.map((r) => (r.id === 'a1'
      ? { ...r, anchors, body: 'REBOUND COPY', anchorState: anchorStateOf(session, anchors) }
      : r)),
  })
  session.close()
  return toDir
}

/** 링크는 **id 오름차순**으로 직렬화한다 (스토어 형식 규칙 `store-format`). */
const linkStoreAt = (dir, links) => {
  mkdirSync(dir, { recursive: true })
  writeFileSync(join(dir, 'links.json'), stringify({
    version: 1, plane: 'link',
    links: [...links].sort((a, b) => (a.id < b.id ? -1 : 1)),
  }))
  writeFileSync(join(dir, 'decisions.json'), stringify({ version: 1, plane: 'decision', decisions: [] }))
  return dir
}

const link = (id, documentId, ref, { anchor = 'textQuote', type = 'tagged' } = {}) => ({
  id,
  from: { plane: 'annotation', ref, document: documentId, anchor },
  to: { plane: 'graph', ref: 'id:c-traceability' },
  type,
  created_by: 'vnv silent-exclusion probe',
})

const gate = (storeDir, { raw = false } = {}) => {
  const started = Date.now()
  const proc = spawnSync(process.env.HO_PYTHON || '/usr/bin/python3',
    [ROOT + 'check_links.py', '--store', storeDir, '--format', 'json'], { encoding: 'utf8' })
  const ms = Date.now() - started
  let verdict = null
  try { verdict = JSON.parse(proc.stdout) } catch { verdict = null }
  return {
    exit: proc.status,
    ms,
    pass: verdict ? verdict.pass : null,
    violations: verdict ? [...new Set(verdict.violations.map((v) => v.rule))].sort() : null,
    stores: verdict ? verdict.annotationStores.map((s) => short(s.path)).sort() : null,
    scope: verdict ? {
      discovered: (verdict.annotationScope?.discovered ?? []).map(short).sort(),
      outOfScope: (verdict.annotationScope?.outOfScope ?? []).map((r) => short(r.path ?? r)).sort(),
      skipped: (verdict.annotationScope?.skipped ?? []).map(
        (r) => `${short(r.path)} excluded=${r.excluded}`).sort(),
      quarantined: (verdict.annotationScope?.quarantined ?? []).map(
        (r) => `${short(r.path)} excluded=${r.excluded}`).sort(),
      workspaceRoot: short(verdict.annotationScope?.workspaceRoot ?? null),
    } : null,
    // 판정 JSON **전문**에 그 경로가 한 번이라도 나오는가 (= 이름으로 불리는가).
    rawText: raw ? proc.stdout : null,
    stderrHead: (proc.stderr || '').trim().slice(0, 200),
  }
}

const binder = (storeDir) => {
  const proc = spawnSync('node', [ROOT + 'bind-links.mjs', '--store', storeDir, '--format', 'json'],
    { encoding: 'utf8' })
  let result = null
  try { result = JSON.parse(proc.stdout) } catch { result = null }
  return {
    exit: proc.status,
    pass: result ? result.pass : null,
    counts: result ? result.counts : null,
    bindings: result ? result.bindings.map((r) => ({
      link: r.link, state: r.state, from: r.from, to: r.to, text: r.text, store: short(r.store ?? ''),
    })) : null,
    unbound: result ? result.unbound.map((r) => ({ link: r.link, reason: r.reason })) : null,
    stderrHead: (proc.stderr || '').trim().slice(0, 200),
  }
}

/** 정직한 스토어를 `hidden` 경로에, 다시 앵커한 사본을 `<ws>/zzz-copy` 에 둔다. */
const hideUnder = (wsName, relative) => {
  const ws = fresh(wsName)
  const honest = join(ws, relative)
  const documentId = honestStore(honest, 201)
  cpSync(honest, join(ws, 'zzz-copy'), { recursive: true })
  reboundCopy(honest, join(ws, 'zzz-copy'), 202)
  const store = linkStoreAt(join(ws, 'link'), [link(`ln-${wsName}`, documentId, 'a1')])
  return { ws, honest, store, documentId }
}

/* ---- E1 `.git` 안 --------------------------------------------------------- */
if (runs('E1')) {
  const { store } = hideUnder('e1', '.git/honest')
  say({ probe: 'E1 the honest store lives under .git/ (the other SCAN_SKIP_DIRS name)',
    gate: gate(store), binder: binder(store) })
}

/* ---- E2 중첩 제외 이름 ---------------------------------------------------- */
if (runs('E2')) {
  const { store } = hideUnder('e2', 'node_modules/pkg/node_modules/honest')
  say({ probe: 'E2 nested skip name: node_modules/pkg/node_modules/honest',
    gate: gate(store), binder: binder(store) })
}

/* ---- E3 서로 다른 제외 이름의 중첩 ---------------------------------------- */
if (runs('E3')) {
  const { store } = hideUnder('e3', 'node_modules/pkg/.git/honest')
  say({ probe: 'E3 mixed nesting: node_modules/pkg/.git/honest',
    gate: gate(store), binder: binder(store) })
}

/* ---- E4 sniff 예산으로 제외 트리 안에서 다시 숨기 -------------------------- */
if (runs('E4')) {
  // 제외 트리 **밖**에서는 `annotations.json` 이라는 이름이 무조건 판정된다(sniff 없음).
  // 제외 트리 **안**에서는 `_stores_under` 가 sniff 를 요구한다 — 앞 4096 바이트에 두 키가
  // 보이지 않으면 후보조차 되지 않는다. 두 키 앞에 패딩 키 하나를 넣어 그 비대칭을 잰다.
  const { ws, honest, store } = hideUnder('e4', 'node_modules/honest')
  const payload = JSON.parse(readFileSync(join(honest, 'annotations.json'), 'utf8'))
  const padded = { _note: 'x'.repeat(5000), ...payload }
  writeFileSync(join(honest, 'annotations.json'), stringify(padded))
  let loads = null
  try {
    const loaded = loadStore(honest)
    loads = `loadStore OK (v${loaded.version}, ${loaded.annotations.length} record(s), document ${loaded.documentId})`
  } catch (error) { loads = `loadStore REFUSED: ${error.code ?? error.message}` }
  const verdict = gate(store, { raw: true })
  say({ probe: 'E4 a padded (>4KB before the keys) annotations.json under node_modules',
    editorStillLoadsTheHiddenStore: loads,
    hiddenPathNamedAnywhereInTheVerdict: (verdict.rawText || '').includes('node_modules/honest'),
    gate: { ...verdict, rawText: null }, binder: binder(store) })

  // 대조군: **같은 파일**이 제외 트리 밖에 있으면 이름만으로 판정된다.
  const outside = join(ws, 'outside-honest')
  cpSync(honest, outside, { recursive: true })
  say({ probe: "E4' control — the same padded store OUTSIDE a skipped tree",
    gate: gate(store) })
}

/* ---- E5 읽을 수 없는 스토어 ----------------------------------------------- */
if (runs('E5')) {
  const { honest, store } = hideUnder('e5', 'node_modules/honest')
  chmodSync(join(honest, 'annotations.json'), 0o000)
  const hidden = gate(store, { raw: true })
  say({ probe: 'E5 an UNREADABLE annotations.json under node_modules (outside it is exit 2)',
    hiddenPathNamedAnywhereInTheVerdict: (hidden.rawText || '').includes('node_modules/honest'),
    gate: { ...hidden, rawText: null }, binder: binder(store) })

  // 대조군: 같은 파일이 제외 트리 밖이면 읽지 못하는 순간 fail-closed 여야 한다.
  const { honest: honest2, store: store2 } = hideUnder('e5b', 'plain/honest')
  chmodSync(join(honest2, 'annotations.json'), 0o000)
  const control = gate(store2)
  chmodSync(join(honest2, 'annotations.json'), 0o644)
  say({ probe: "E5' control — the same unreadable store OUTSIDE a skipped tree", gate: control })
}

/* ---- E6 흔적은 수인가 이름인가 -------------------------------------------- */
if (runs('E6')) {
  // 제외 트리 안의 스토어가 **판정 밖 문서**를 선언하면 끌려오지 않는다. 그때 판정 JSON에
  // 남는 것이 경로 이름인지, 트리 하나에 대한 수인지를 본다.
  const ws = fresh('e6')
  const documentId = honestStore(join(ws, 'main'), 210)
  honestStore(join(ws, 'node_modules', 'unrelated'), 211, 'A wholly unrelated line here.')
  const store = linkStoreAt(join(ws, 'link'), [link('ln-e6', documentId, 'a1')])
  const verdict = gate(store, { raw: true })
  say({ probe: 'E6 an unrelated store under node_modules: is the trace a NAME or a COUNT',
    hiddenPathNamedAnywhereInTheVerdict: (verdict.rawText || '').includes('node_modules/unrelated'),
    gate: { ...verdict, rawText: null }, binder: binder(store) })
}

/* ---- E7 두 스토어가 각각 다른 제외 트리에 ---------------------------------- */
if (runs('E7')) {
  const ws = fresh('e7')
  const honest = join(ws, 'node_modules', 'honest')
  const documentId = honestStore(honest, 220)
  cpSync(honest, join(ws, '.git', 'copy'), { recursive: true })
  reboundCopy(honest, join(ws, '.git', 'copy'), 221)
  const store = linkStoreAt(join(ws, 'link'), [link('ln-e7', documentId, 'a1')])
  say({ probe: 'E7 BOTH stores hidden (node_modules + .git): does anyone answer',
    gate: gate(store), binder: binder(store) })
}

/* ---- E8 대가 -------------------------------------------------------------- */
if (runs('E8')) {
  const junk = (dir, n) => {
    mkdirSync(dir, { recursive: true })
    for (let i = 0; i < n; i += 1) {
      writeFileSync(join(dir, `pkg-${i}.json`), stringify({ name: `pkg-${i}`, version: '1.0.0' }))
    }
  }
  const ws = fresh('e8')
  const documentId = honestStore(join(ws, 'main'), 230)
  const store = linkStoreAt(join(ws, 'link'), [link('ln-e8', documentId, 'a1')])
  const before = [gate(store).ms, gate(store).ms]
  junk(join(ws, 'node_modules', 'lots'), 8000)
  const after = [gate(store).ms, gate(store).ms]
  // pnpm 식: `node_modules` 안의 이름이 **작업공간 밖** 트리를 가리키는 심링크다.
  const outside = plain('e8-outside')
  junk(join(outside, 'store'), 8000)
  const ws2 = fresh('e8b')
  const doc2 = honestStore(join(ws2, 'main'), 231)
  const store2 = linkStoreAt(join(ws2, 'link'), [link('ln-e8b', doc2, 'a1')])
  const beforeLink = [gate(store2).ms, gate(store2).ms]
  mkdirSync(join(ws2, 'node_modules'), { recursive: true })
  symlinkSync(join(outside, 'store'), join(ws2, 'node_modules', 'pnpm-store'))
  const afterLink = [gate(store2).ms, gate(store2).ms]
  say({ probe: 'E8 the cost of walking skipped trees (8000 junk json)',
    emptyNodeModulesMs: before, withJunkMs: after,
    noSymlinkMs: beforeLink, pnpmStyleSymlinkOutsideMs: afterLink,
    verdictStillGreen: gate(store).exit === 0 && gate(store2).exit === 0 })
}

/* ---- E9 `.git` 이 **파일**인 작업공간 (worktree · submodule) ----------------- */
if (runs('E9')) {
  // `workspace_root` 는 `.git` **디렉토리**를 가진 첫 조상을 찾는다. `git worktree add` 나
  // submodule 의 작업 트리는 `.git` 이 `gitdir: …` 한 줄을 담은 **파일**이므로 루트가 없다고
  // 판정된다 — 저장소 안인데도 훑기가 사라진다. 두 모양을 나란히 잰다.
  const build = (name, gitAsFile) => {
    const dir = join(SCRATCH, name)
    rmSync(dir, { recursive: true, force: true })
    mkdirSync(dir, { recursive: true })
    if (gitAsFile) writeFileSync(join(dir, '.git'), 'gitdir: /elsewhere/.git/worktrees/w1\n')
    else mkdirSync(join(dir, '.git'), { recursive: true })
    const honest = join(dir, 'main')
    const documentId = honestStore(honest, 240)
    // 사본은 **링크 스토어 자신의 디렉토리**에 둔다 (그 디렉토리는 언제나 훑는다).
    const store = join(dir, 'link')
    cpSync(honest, store, { recursive: true })
    reboundCopy(honest, store, 241)
    linkStoreAt(store, [link(`ln-${name}`, documentId, 'a1')])
    return store
  }
  const asDir = build('e9-git-dir', false)
  say({ probe: 'E9 control — .git is a real directory (ordinary clone)',
    gate: gate(asDir), binder: binder(asDir) })
  const asFile = build('e9-git-file', true)
  say({ probe: 'E9 .git is a FILE (git worktree / submodule): the workspace scan disappears',
    gate: gate(asFile), binder: binder(asFile) })
}
