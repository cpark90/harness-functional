/**
 * vnv 프로브 (9차) — 바인더 **단독** 판정이 정말 fail-closed 인가.
 *   VNV_SCRATCH=<dir> [VNV_PE_ROOT=<tools/plane-editor/>] [VNV_ONLY=X1,X2] \
 *     node docs/verify/plane-editor-binder-failclosed-probe.mjs
 *
 *   X1  같은 문서를 선언한 스토어가 둘/셋 — 이름을 **세 번째 사본**까지 바꿔 순서 의존이
 *       정말 사라졌는지 (앞 판정의 W3a·W3b 를 이름 축으로 넓힌다)
 *   X2  앵커 이름 새 모양 — 숫자 키·빈 문자열·비문자열·`prototype` 계열
 *   X4  문서를 편집하면 좌표가 따라 움직이는가 (앞 판정 P4 의 재수립: 링크를 **id 오름차순**
 *       으로 직렬화한다 — 정렬하지 않은 P4/P5 는 게이트가 `store-format` 으로 잡는다)
 *   X5  파괴적 편집 + 같은 문장 재타이핑 (앞 판정 P5 의 재수립)
 *   Y1  `--annotations` 로 정직한 스토어만 이름 대면 쌍둥이가 숨는가
 *   Y2  링크 9개 중 하나만 나쁠 때의 부수 피해 (전역 거절의 진단력 비용)
 *   Y4  심링크로 만든 쌍둥이 (같은 실경로가 두 이름으로 보일 때)
 *   Y5  `HO_PYTHON` 이 가짜 게이트를 가리킬 때 (환경 신뢰면)
 *
 * `VNV_PE_ROOT` 를 주면 그 트리의 도구로 같은 시험을 돌린다 (반사실용). tools/ 는 읽기만.
 */
const ROOT = process.env.VNV_PE_ROOT || new URL('../../tools/plane-editor/', import.meta.url).pathname
const { openSession, locate } = await import(ROOT + 'src/session.mjs')
const { captureAnchors, anchorStateOf } = await import(ROOT + 'src/anchors.mjs')
const { loadStore, saveStore } = await import(ROOT + 'src/store.mjs')
const { buildTextIndex } = await import(ROOT + 'src/text-index.mjs')
const { mkdirSync, writeFileSync, cpSync, symlinkSync, rmSync, chmodSync } = await import('node:fs')
const { join } = await import('node:path')
const { spawnSync } = await import('node:child_process')

const SCRATCH = process.env.VNV_SCRATCH || '/tmp/vnv-binder-failclosed'
const ONLY = (process.env.VNV_ONLY || '').split(',').filter(Boolean)
const runs = (name) => ONLY.length === 0 || ONLY.includes(name)
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

/** 실제 세션으로 만든 정직한 v3 스토어 (앞 프로브들과 같은 함수). */
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

const anchorLink = (id, documentId, ref, anchor, type = 'tagged') => ({
  id,
  from: { plane: 'annotation', ref, document: documentId, anchor },
  to: { plane: 'graph', ref: 'id:c-traceability' },
  type,
  created_by: 'vnv binder fail-closed probe',
})

const gate = (storeDir, extraEnv = {}) => {
  const proc = spawnSync(process.env.HO_PYTHON || '/usr/bin/python3',
    [ROOT + 'check_links.py', '--store', storeDir, '--format', 'json'],
    { encoding: 'utf8', env: { ...process.env, ...extraEnv } })
  let verdict = null
  try { verdict = JSON.parse(proc.stdout) } catch { verdict = null }
  return {
    exit: proc.status,
    pass: verdict ? verdict.pass : null,
    violations: verdict ? [...new Set(verdict.violations.map((v) => v.rule))].sort() : null,
  }
}

const binderCli = (storeDir, { args = [], env = {} } = {}) => {
  const proc = spawnSync('node', [ROOT + 'bind-links.mjs', '--store', storeDir, '--format', 'json', ...args],
    { encoding: 'utf8', env: { ...process.env, ...env } })
  let result = null
  try { result = JSON.parse(proc.stdout) } catch { result = null }
  return {
    exit: proc.status,
    pass: result ? result.pass : null,
    counts: result ? result.counts : null,
    gate: result ? result.gate : null,
    ambiguousDocuments: result ? result.ambiguousDocuments : null,
    // 위치 필드가 **없는** 바인딩을 드러내려면 부재를 눈에 보이게 찍어야 한다.
    bindings: result ? result.bindings.map((r) => ({
      link: r.link, anchor: r.anchor, state: r.state,
      from: Object.hasOwn(r, 'from') ? r.from : '<field absent>',
      to: Object.hasOwn(r, 'to') ? r.to : '<field absent>',
      text: Object.hasOwn(r, 'text') ? r.text : '<field absent>',
      reason: r.reason ?? null,
      store: (r.store ?? '').replace(SCRATCH, '<scratch>'),
    })) : null,
    unbound: result ? result.unbound.map((r) => ({ link: r.link, anchor: r.anchor, reason: r.reason })) : null,
    stderr: (proc.stderr || '').trim().slice(0, 240),
  }
}

/* ---- X1 같은 문서를 선언한 스토어 — 이름을 세 가지로 바꾼다 --------------- */
if (runs('X1')) {
  /** sample-state 를 복사하고, 사본의 a6 만 **같은 문서의 다른 문장**에 다시 앵커한다. */
  const buildCopies = (ws, copyNames) => {
    cpSync(join(ROOT, 'sample-state'), join(ws, 'main'), { recursive: true })
    const store0 = loadStore(join(ws, 'main'))
    const session = openSession({ update: store0.docUpdate, clientID: 811 })
    const target = locate(session, { quote: 'standoff model' })
    const rebound = captureAnchors(session, target.from, target.to)
    for (const name of copyNames) {
      cpSync(join(ws, 'main'), join(ws, name), { recursive: true })
      saveStore(join(ws, name), {
        fragment: 'prosemirror',
        documentId: store0.documentId,
        docUpdate: store0.docUpdate,
        docJSON: store0.docJSON,
        annotations: store0.annotations.map((r) =>
          (r.id === 'a6' ? { ...r, anchors: rebound, body: `REBOUND COPY ${name}` } : r)),
      })
    }
    session.close()
    return linkStoreAt(join(ws, 'link'), [anchorLink('ln-x1', store0.documentId, 'a6', 'textQuote')])
  }
  // 'aaa-copy' < 'main' < 'mmm-copy' < 'zzz-copy' (발견 순서를 이름으로 흔든다).
  for (const name of ['aaa-copy', 'mmm-copy', 'zzz-copy']) {
    const ws = fresh(`x1-${name}`)
    const link = buildCopies(ws, [name])
    say({ probe: `X1 duplicate store named \`${name}\``, gate: gate(link), binder: binderCli(link) })
  }
  {
    const ws = fresh('x1-triple')
    const link = buildCopies(ws, ['aaa-copy', 'zzz-copy'])
    say({ probe: 'X1d three stores declare the same document', gate: gate(link), binder: binderCli(link) })
  }
  {
    const ws = fresh('x1-control')
    cpSync(join(ROOT, 'sample-state'), join(ws, 'main'), { recursive: true })
    const store0 = loadStore(join(ws, 'main'))
    const link = linkStoreAt(join(ws, 'link'), [anchorLink('ln-x1', store0.documentId, 'a6', 'textQuote')])
    say({ probe: 'X1e control — only the honest store', gate: gate(link), binder: binderCli(link) })
  }
}

/* ---- X2 앵커 이름의 새 모양 (숫자 키·빈 문자열·비문자열) ------------------ */
if (runs('X2')) {
  const ws = fresh('x2')
  const documentId = honestStore(join(ws, 'main'), 812, 'The disputed clause survives here.')
  const shapes = [
    ['num-string', '0'],
    ['empty-string', ''],
    ['prototype', 'prototype'],
    ['define-getter', '__defineGetter__'],
    ['number', 0],
    ['boolean', true],
    ['array', ['textQuote']],
    ['object', { textQuote: true }],
  ]
  const link = linkStoreAt(join(ws, 'link'), shapes.map(([tag, anchor], i) => ({
    id: `ln-x2-${String(i).padStart(2, '0')}-${tag}`,
    from: { plane: 'annotation', ref: 'a1', document: documentId, anchor },
    to: { plane: 'graph', ref: 'id:c-traceability' },
    type: 'tagged',
    created_by: 'vnv binder fail-closed probe',
  })))
  say({
    probe: 'X2 new anchor-name shapes (numeric key, empty string, non-string values)',
    shapes: shapes.map(([tag, anchor]) => ({ tag, anchor })),
    gate: gate(link),
    binder: binderCli(link),
  })
}

/* ---- X4 문서를 편집하면 좌표가 따라 움직이는가 (P4 재수립) ---------------- */
if (runs('X4')) {
  const ws = fresh('x4')
  cpSync(join(ROOT, 'sample-state'), join(ws, 'main'), { recursive: true })
  const store0 = loadStore(join(ws, 'main'))
  const link = linkStoreAt(join(ws, 'link'), [
    anchorLink('ln-x4-block', store0.documentId, 'a5', 'blockContext'),
    anchorLink('ln-x4-quote', store0.documentId, 'a6', 'textQuote'),
  ])
  const before = binderCli(link)
  const session = openSession({ update: store0.docUpdate, clientID: 813 })
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
    probe: 'X4 editing the document moves the derived position (id-sorted link store)',
    before: before.bindings, beforeExit: before.exit,
    after: after.bindings, afterExit: after.exit,
    gateAfter: gate(link),
  })
}

/* ---- X5 파괴적 편집 + 같은 문장 재타이핑 (P5 재수립) ---------------------- */
if (runs('X5')) {
  const ws = fresh('x5')
  cpSync(join(ROOT, 'sample-state'), join(ws, 'main'), { recursive: true })
  const store0 = loadStore(join(ws, 'main'))
  const link = linkStoreAt(join(ws, 'link'), [
    anchorLink('ln-x5-block', store0.documentId, 'a5', 'blockContext'),
    anchorLink('ln-x5-quote', store0.documentId, 'a6', 'textQuote'),
  ])
  const session = openSession({ update: store0.docUpdate, clientID: 814 })
  const index = buildTextIndex(session.doc)
  const blockWithA6 = index.blocks.find((b) => b.text.includes('Wrong resolution is worse'))
  session.dispatch((tr) => {
    const from = blockWithA6.pmFrom
    return tr.delete(from, from + blockWithA6.node.nodeSize)
  })
  // 쌍둥이 함정: 같은 문장을 문서의 **다른 자리**에 다시 타이핑한다.
  session.dispatch((tr) => tr.insertText(
    'Wrong resolution is worse than an honest orphan record.', tr.doc.content.size - 1))
  const index2 = buildTextIndex(session.doc)
  const a5now = index2.blocks.find((b) => b.text.includes('Selector multiplexing'))
  if (a5now) session.dispatch((tr) => tr.split(a5now.pmInnerFrom + 21))
  saveStore(join(ws, 'main'), {
    fragment: 'prosemirror',
    documentId: store0.documentId,
    docUpdate: session.encodeState(),
    docJSON: session.editor.getJSON(),
    annotations: store0.annotations,
  })
  session.close()
  say({
    probe: 'X5 destructive edit + retyped twin sentence (id-sorted link store)',
    gate: gate(link), binder: binderCli(link),
  })
}

/* ---- Y1 `--annotations` 로 정직한 쪽만 이름 대면 쌍둥이가 숨는가 ----------- */
if (runs('Y1')) {
  const ws = fresh('y1')
  cpSync(join(ROOT, 'sample-state'), join(ws, 'main'), { recursive: true })
  const store0 = loadStore(join(ws, 'main'))
  cpSync(join(ws, 'main'), join(ws, 'backup'), { recursive: true })
  const link = linkStoreAt(join(ws, 'link'), [anchorLink('ln-y1', store0.documentId, 'a6', 'textQuote')])
  say({
    probe: 'Y1 naming only the honest store with --annotations while a twin sits next to it',
    binder: binderCli(link, { args: ['--annotations', join(ws, 'main', 'annotations.json')] }),
  })
}

/* ---- Y2 링크 9개 중 하나만 나쁠 때의 부수 피해 --------------------------- */
if (runs('Y2')) {
  const ws = fresh('y2')
  cpSync(join(ROOT, 'sample-state'), join(ws, 'main'), { recursive: true })
  const store0 = loadStore(join(ws, 'main'))
  const good = [
    anchorLink('ln-y2-a-block', store0.documentId, 'a5', 'blockContext'),
    anchorLink('ln-y2-b-quote', store0.documentId, 'a6', 'textQuote'),
  ]
  const clean = linkStoreAt(join(ws, 'clean'), good)
  const dirty = linkStoreAt(join(ws, 'dirty'), [
    ...good,
    // 이 링크 하나만 그래프 밖 타입이다 (주석 종단점도 아니다).
    { id: 'ln-y2-z-bad', from: { plane: 'decision', ref: 'd1' },
      to: { plane: 'graph', ref: 'id:c-traceability' }, type: 'inventedRelation',
      created_by: 'vnv binder fail-closed probe' },
  ])
  say({
    probe: 'Y2 one bad link among good ones: what happens to the good endpoints',
    clean: { gate: gate(clean), binder: binderCli(clean) },
    dirty: { gate: gate(dirty), binder: binderCli(dirty) },
  })
}

/* ---- Y4 심링크 쌍둥이 (같은 실경로가 두 이름) ---------------------------- */
if (runs('Y4')) {
  const ws = fresh('y4')
  cpSync(join(ROOT, 'sample-state'), join(ws, 'main'), { recursive: true })
  const store0 = loadStore(join(ws, 'main'))
  symlinkSync(join(ws, 'main'), join(ws, 'mirror'))
  const link = linkStoreAt(join(ws, 'link'), [anchorLink('ln-y4', store0.documentId, 'a6', 'textQuote')])
  say({ probe: 'Y4 a symlinked twin of the same store directory', gate: gate(link), binder: binderCli(link) })
}

/* ---- Y5 HO_PYTHON 이 가짜 게이트를 가리킬 때 ----------------------------- */
if (runs('Y5')) {
  const ws = fresh('y5')
  cpSync(join(ROOT, 'sample-state'), join(ws, 'main'), { recursive: true })
  const store0 = loadStore(join(ws, 'main'))
  cpSync(join(ws, 'main'), join(ws, 'backup'), { recursive: true })   // 쌍둥이 = 게이트 빨강
  const link = linkStoreAt(join(ws, 'link'), [anchorLink('ln-y5', store0.documentId, 'a6', 'textQuote')])
  // 진짜 게이트를 부르되, 판정 JSON 의 violations 를 비우고 exit 0 으로 돌려주는 가짜.
  const fake = join(ws, 'fake-python')
  writeFileSync(fake, [
    '#!/bin/sh',
    '# 계약 표면 요청(--emit-contract)은 그대로 통과시키고, 판정만 초록으로 바꾼다.',
    'for a in "$@"; do if [ "$a" = "--emit-contract" ]; then exec /usr/bin/python3 "$@"; fi; done',
    '/usr/bin/python3 "$@" | /usr/bin/python3 -c "import json,sys; d=json.load(sys.stdin); ' +
      'd[\'violations\']=[]; d[\'pass\']=True; print(json.dumps(d))"',
    'exit 0',
  ].join('\n'))
  chmodSync(fake, 0o755)
  say({
    probe: 'Y5 HO_PYTHON pointed at a gate wrapper that erases the violations',
    honestGate: gate(link),
    binder: binderCli(link, { env: { HO_PYTHON: fake } }),
  })
}

/* ---- X3 falsy 한 앵커 이름만 실은 스토어 (빈 문자열 · 숫자 0) -------------
 *
 * X2 에서 이 둘은 **종단점 목록에서 사라졌다**(`recordEndpoints` 로 셈). 바인더 단독
 * 성질을 보려면 이 모양만 실은 스토어가 필요하다 — 게이트를 무르게 한 트리에서 같은
 * 시험을 돌리면 "조용한 건너뜀"이 초록으로 나오는지가 드러난다.
 */
if (runs('X3')) {
  for (const [tag, anchor] of [['empty-string', ''], ['number-zero', 0]]) {
    const ws = fresh(`x3-${tag}`)
    const documentId = honestStore(join(ws, 'main'), 815, 'The disputed clause survives here.')
    const link = linkStoreAt(join(ws, 'link'), [{
      id: 'ln-x3',
      from: { plane: 'annotation', ref: 'a1', document: documentId, anchor },
      to: { plane: 'graph', ref: 'id:c-traceability' },
      type: 'tagged',
      created_by: 'vnv binder fail-closed probe',
    }])
    say({ probe: `X3 the only endpoint carries a falsy anchor (${tag})`, gate: gate(link), binder: binderCli(link) })
  }
}

/* ---- Y6 심링크로 워크스페이스 밖에 둔 정직한 스토어 (발견 전제의 구멍) ----
 *
 * C10 은 "격리 표식으로도, 이름을 바꿔도 스토어는 숨지 않는다"를 잰다. 심링크는?
 * 정직한 스토어를 워크스페이스 **밖**에 두고 이름만 링크로 들여오면, 발견은 실경로를
 * 따라가지 않으므로 사본 하나만 범위에 남는다 — 그때 답이 조용히 사본의 것이 되는가.
 */
if (runs('Y6')) {
  const ws = fresh('y6')
  const outside = fresh('y6-outside')
  cpSync(join(ROOT, 'sample-state'), join(outside, 'honest'), { recursive: true })
  const store0 = loadStore(join(outside, 'honest'))
  // 사본은 워크스페이스 **안**에 두고, a6 를 같은 문서의 다른 문장에 다시 앵커한다.
  cpSync(join(outside, 'honest'), join(ws, 'zzz-copy'), { recursive: true })
  const session = openSession({ update: store0.docUpdate, clientID: 816 })
  const target = locate(session, { quote: 'standoff model' })
  const rebound = captureAnchors(session, target.from, target.to)
  saveStore(join(ws, 'zzz-copy'), {
    fragment: 'prosemirror',
    documentId: store0.documentId,
    docUpdate: store0.docUpdate,
    docJSON: store0.docJSON,
    annotations: store0.annotations.map((r) =>
      (r.id === 'a6' ? { ...r, anchors: rebound, body: 'REBOUND COPY' } : r)),
  })
  session.close()
  symlinkSync(join(outside, 'honest'), join(ws, 'main'))   // 정직한 쪽은 심링크로만 보인다
  const link = linkStoreAt(join(ws, 'link'), [anchorLink('ln-y6', store0.documentId, 'a6', 'textQuote')])
  say({ probe: 'Y6 the honest store is only visible through a symlink (the copy is the real dir)',
    gate: gate(link), binder: binderCli(link) })
}

/* ---- Y7 가짜 게이트가 쌍둥이까지 지운다면 (환경 신뢰면의 끝) -------------- */
if (runs('Y7')) {
  const ws = fresh('y7')
  cpSync(join(ROOT, 'sample-state'), join(ws, 'main'), { recursive: true })
  const store0 = loadStore(join(ws, 'main'))
  cpSync(join(ws, 'main'), join(ws, 'backup'), { recursive: true })
  const link = linkStoreAt(join(ws, 'link'), [anchorLink('ln-y7', store0.documentId, 'a6', 'textQuote')])
  const fake = join(ws, 'fake-python')
  writeFileSync(fake, [
    '#!/bin/sh',
    'for a in "$@"; do if [ "$a" = "--emit-contract" ]; then exec /usr/bin/python3 "$@"; fi; done',
    '/usr/bin/python3 "$@" | /usr/bin/python3 -c "import json,sys; d=json.load(sys.stdin); ' +
      'd[\'violations\']=[]; d[\'pass\']=True; ' +
      'd[\'annotationStores\']=[s for s in d[\'annotationStores\'] if \'backup\' not in s[\'path\']]; ' +
      'print(json.dumps(d))"',
    'exit 0',
  ].join('\n'))
  chmodSync(fake, 0o755)
  say({ probe: 'Y7 a forged gate that erases both the violations and the twin store',
    honestGate: gate(link), binder: binderCli(link, { env: { HO_PYTHON: fake } }) })
}
