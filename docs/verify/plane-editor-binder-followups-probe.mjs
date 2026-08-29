/**
 * vnv 프로브 (10차) — 바인더 후속 3건이 정말 닫혔는가.
 *   VNV_SCRATCH=<dir> [VNV_PE_ROOT=<tools/plane-editor/>] [VNV_ONLY=Z1,Z2] \
 *     node docs/verify/plane-editor-binder-followups-probe.mjs
 *
 *   Z1  falsy 앵커의 **새 모양**: `false` · `null` (9차 프로브에는 없던 값) + 종단점 집합의
 *       분할이 정확히 `anchor` **키의 존재**에서 갈리는가 (record 종단점과 섞어 잰다)
 *   Z2  심링크 축: 사슬 · 상대경로 · 사이클 · 세 이름 · `SCAN_SKIP_DIRS` · 깨진 심링크 ·
 *       심링크 뒤의 격리 표식
 *   Z3  전역 거절에서의 종단점별 사유: 네 종단점 -> 네 답 · 좁은 사유(per-store)가 전역
 *       사유에 가려지지 않는가 · 모든 거절 행이 두 층 스키마를 싣는가
 *
 * `VNV_PE_ROOT` 를 주면 그 트리의 도구로 같은 시험을 돌린다 (반사실용). tools/ 는 읽기만.
 */
const ROOT = process.env.VNV_PE_ROOT || new URL('../../tools/plane-editor/', import.meta.url).pathname
const { openSession, locate } = await import(ROOT + 'src/session.mjs')
const { captureAnchors, anchorStateOf } = await import(ROOT + 'src/anchors.mjs')
const { loadStore, saveStore } = await import(ROOT + 'src/store.mjs')
const { mkdirSync, writeFileSync, readFileSync, cpSync, symlinkSync, rmSync } = await import('node:fs')
const { join, relative, dirname } = await import('node:path')
const { spawnSync } = await import('node:child_process')

const SCRATCH = process.env.VNV_SCRATCH || '/tmp/vnv-binder-followups'
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

/** 앵커 키를 **싣는** 종단점. `anchor` 를 생략하려면 `omit: true` 로 명시한다. */
const link = (id, documentId, ref, { anchor, omit = false, type = 'tagged' } = {}) => ({
  id,
  from: {
    plane: 'annotation', ref, document: documentId,
    ...(omit ? {} : { anchor }),
  },
  to: { plane: 'graph', ref: 'id:c-traceability' },
  type,
  created_by: 'vnv binder follow-ups probe',
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
    stores: verdict ? verdict.annotationStores.map((s) => short(s.path)).sort() : null,
    scope: verdict ? {
      discovered: (verdict.annotationScope?.discovered ?? []).map(short).sort(),
      outOfScope: (verdict.annotationScope?.outOfScope ?? []).map((r) => short(r.path ?? r)).sort(),
      workspaceRoot: short(verdict.annotationScope?.workspaceRoot ?? null),
    } : null,
    stderrHead: (proc.stderr || '').trim().slice(0, 200),
  }
}

const binder = (storeDir, { args = [], env = {} } = {}) => {
  const proc = spawnSync('node', [ROOT + 'bind-links.mjs', '--store', storeDir, '--format', 'json', ...args],
    { encoding: 'utf8', env: { ...process.env, ...env } })
  let result = null
  try { result = JSON.parse(proc.stdout) } catch { result = null }
  return {
    exit: proc.status,
    pass: result ? result.pass : null,
    counts: result ? result.counts : null,
    gate: result ? result.gate : null,
    bindings: result ? result.bindings.map((r) => ({
      link: r.link, anchor: r.anchor, state: r.state, from: r.from, to: r.to, text: r.text,
      store: short(r.store ?? ''),
    })) : null,
    unbound: result ? result.unbound.map((r) => ({
      link: r.link, anchor: r.anchor, reason: r.reason,
      // 두 층 스키마가 **모든** 거절 행에 실리는가를 부재까지 눈에 보이게 찍는다.
      reasons: Object.hasOwn(r, 'reasons') ? r.reasons : '<field absent>',
      gateViolations: Object.hasOwn(r, 'gateViolations') ? r.gateViolations : '<field absent>',
      store: short(r.store ?? ''),
    })) : null,
    stderrHead: (proc.stderr || '').trim().slice(0, 200),
  }
}

/* ---- Z1 falsy 앵커의 새 모양 + 종단점 집합의 분할 ------------------------- */
if (runs('Z1')) {
  // Z1a: `false` · `null` — 9차 프로브가 재지 않은 두 값.
  const ws = fresh('z1a')
  const documentId = honestStore(join(ws, 'main'), 101)
  const store = linkStoreAt(join(ws, 'link'), [
    link('ln-z1-0-false', documentId, 'a1', { anchor: false }),
    link('ln-z1-1-null', documentId, 'a1', { anchor: null }),
    link('ln-z1-2-empty', documentId, 'a1', { anchor: '' }),
    link('ln-z1-3-zero', documentId, 'a1', { anchor: 0 }),
  ])
  say({ probe: 'Z1a falsy anchor values: false / null / "" / 0', gate: gate(store), binder: binder(store) })

  // Z1b: 같은 스토어에 **키가 없는** 종단점(진짜 record 종단점)과 falsy 앵커를 섞는다.
  //      분할이 정확히 키의 존재에서 갈리면 anchor 2 / record 1 이어야 한다.
  const ws2 = fresh('z1b')
  const doc2 = honestStore(join(ws2, 'main'), 103)
  const store2 = linkStoreAt(join(ws2, 'link'), [
    link('ln-z1b-0-norecord', doc2, 'a1', { omit: true }),      // 키 없음 = record 종단점
    link('ln-z1b-1-false', doc2, 'a1', { anchor: false }),      // 키 있음 = anchor 종단점
    link('ln-z1b-2-null', doc2, 'a1', { anchor: null }),        // 키 있음 = anchor 종단점
  ])
  say({ probe: 'Z1b the split is exactly at key presence (1 record + 2 falsy anchors)', gate: gate(store2), binder: binder(store2) })
}

/* ---- Z2 심링크 축 -------------------------------------------------------- */
if (runs('Z2')) {
  // Z2a 사슬: 작업공간의 이름 -> 심링크 -> 심링크 -> 진짜 디렉토리(작업공간 밖).
  const outside = plain('z2a-outside')
  const doc = honestStore(join(outside, 'honest'), 110)
  const ws = fresh('z2a')
  symlinkSync(join(outside, 'honest'), join(outside, 'hop'))       // 심링크 -> 진짜
  symlinkSync(join(outside, 'hop'), join(ws, 'main'))              // 심링크 -> 심링크
  cpSync(join(outside, 'honest'), join(ws, 'zzz-copy'), { recursive: true })
  reboundCopy(join(outside, 'honest'), join(ws, 'zzz-copy'), 111)
  const s = linkStoreAt(join(ws, 'link'), [link('ln-z2a', doc, 'a1', { anchor: 'textQuote' })])
  say({ probe: 'Z2a a symlink CHAIN (link -> link -> real dir outside the workspace)', gate: gate(s), binder: binder(s) })

  // Z2b 상대경로 심링크.
  const outsideB = plain('z2b-outside')
  const docB = honestStore(join(outsideB, 'honest'), 112)
  const wsB = fresh('z2b')
  symlinkSync(relative(wsB, join(outsideB, 'honest')), join(wsB, 'main'))
  cpSync(join(outsideB, 'honest'), join(wsB, 'zzz-copy'), { recursive: true })
  reboundCopy(join(outsideB, 'honest'), join(wsB, 'zzz-copy'), 113)
  const sB = linkStoreAt(join(wsB, 'link'), [link('ln-z2b', docB, 'a1', { anchor: 'textQuote' })])
  say({ probe: 'Z2b a RELATIVE symlink to an honest store outside the workspace', gate: gate(sB), binder: binder(sB) })

  // Z2c 사이클: a -> b, b -> a, 그리고 정직한 스토어 하나. 훑기가 끝나야 하고 답이 나와야 한다.
  const wsC = fresh('z2c')
  const docC = honestStore(join(wsC, 'main'), 114)
  mkdirSync(join(wsC, 'ring'), { recursive: true })
  symlinkSync(join(wsC, 'ring'), join(wsC, 'ring', 'self'))        // 자기 자신
  mkdirSync(join(wsC, 'ping'), { recursive: true })
  mkdirSync(join(wsC, 'pong'), { recursive: true })
  symlinkSync(join(wsC, 'pong'), join(wsC, 'ping', 'to-pong'))
  symlinkSync(join(wsC, 'ping'), join(wsC, 'pong', 'to-ping'))     // 두 디렉토리 사이의 고리
  const sC = linkStoreAt(join(wsC, 'link'), [link('ln-z2c', docC, 'a1', { anchor: 'textQuote' })])
  const t0 = Date.now()
  const gC = gate(sC)
  say({ probe: 'Z2c symlink CYCLES (self-loop + two-directory ring): does the walk terminate', ms: Date.now() - t0, gate: gC, binder: binder(sC) })

  // Z2d 같은 실체의 **세 이름** (진짜 + 심링크 2개) — 가짜 중복이 생기는가.
  const wsD = fresh('z2d')
  const docD = honestStore(join(wsD, 'main'), 115)
  symlinkSync(join(wsD, 'main'), join(wsD, 'aaa-mirror'))
  symlinkSync(join(wsD, 'aaa-mirror'), join(wsD, 'zzz-mirror'))    // 심링크의 심링크
  const sD = linkStoreAt(join(wsD, 'link'), [link('ln-z2d', docD, 'a1', { anchor: 'textQuote' })])
  say({
    probe: 'Z2d the same store under THREE names (real + two symlinks) is still ONE store',
    gate: gate(sD),
    binder: binder(sD, { args: ['--annotations', join(wsD, 'zzz-mirror', 'annotations.json'), '--annotations', join(wsD, 'main', 'annotations.json')] }),
  })

  // Z2e `SCAN_SKIP_DIRS` 안에 정직한 스토어를 두고, 옆에 사본을 둔다.
  const wsE = fresh('z2e')
  const docE = honestStore(join(wsE, 'node_modules', 'honest'), 116)
  cpSync(join(wsE, 'node_modules', 'honest'), join(wsE, 'zzz-copy'), { recursive: true })
  reboundCopy(join(wsE, 'node_modules', 'honest'), join(wsE, 'zzz-copy'), 117)
  const sE = linkStoreAt(join(wsE, 'link'), [link('ln-z2e', docE, 'a1', { anchor: 'textQuote' })])
  say({ probe: 'Z2e the honest store lives under node_modules/ (SCAN_SKIP_DIRS); a copy sits next to it', gate: gate(sE), binder: binder(sE) })

  // Z2e' 같은 배치를 **심링크로**: ws/node_modules -> 작업공간 밖의 진짜 트리.
  const outsideE = plain('z2e2-outside')
  const docE2 = honestStore(join(outsideE, 'honest'), 118)
  const wsE2 = fresh('z2e2')
  symlinkSync(outsideE, join(wsE2, 'node_modules'))
  cpSync(join(outsideE, 'honest'), join(wsE2, 'zzz-copy'), { recursive: true })
  reboundCopy(join(outsideE, 'honest'), join(wsE2, 'zzz-copy'), 119)
  const sE2 = linkStoreAt(join(wsE2, 'link'), [link('ln-z2e2', docE2, 'a1', { anchor: 'textQuote' })])
  say({ probe: "Z2e' a symlink NAMED node_modules points at the honest tree outside", gate: gate(sE2), binder: binder(sE2) })

  // Z2f 깨진 심링크가 `annotations.json` 이라는 이름을 쓴다 — fail-closed 인가.
  const wsF = fresh('z2f')
  const docF = honestStore(join(wsF, 'main'), 120)
  mkdirSync(join(wsF, 'dangling'), { recursive: true })
  symlinkSync(join(wsF, 'nowhere', 'annotations.json'), join(wsF, 'dangling', 'annotations.json'))
  const sF = linkStoreAt(join(wsF, 'link'), [link('ln-z2f', docF, 'a1', { anchor: 'textQuote' })])
  say({ probe: 'Z2f a DANGLING symlink named annotations.json (does discovery stay fail-closed)', gate: gate(sF), binder: binder(sF) })

  // Z2g 심링크 뒤의 격리 표식 — 표식이 다시 스토어를 가리는가.
  const outsideG = plain('z2g-outside')
  const docG = honestStore(join(outsideG, 'honest'), 121)
  writeFileSync(join(outsideG, 'honest', '.annotation-store-quarantine'),
    'vnv probe: does a marker behind a symlink hide the honest store again?\n')
  const wsG = fresh('z2g')
  symlinkSync(join(outsideG, 'honest'), join(wsG, 'main'))
  cpSync(join(outsideG, 'honest'), join(wsG, 'zzz-copy'), { recursive: true })
  rmSync(join(wsG, 'zzz-copy', '.annotation-store-quarantine'), { force: true })
  reboundCopy(join(outsideG, 'honest'), join(wsG, 'zzz-copy'), 122)
  const sG = linkStoreAt(join(wsG, 'link'), [link('ln-z2g', docG, 'a1', { anchor: 'textQuote' })])
  say({ probe: 'Z2g a QUARANTINE marker sitting behind the symlink (does it hide the honest store again)', gate: gate(sG), binder: binder(sG) })
}

/* ---- Z3 전역 거절에서의 종단점별 사유 ------------------------------------- */
if (runs('Z3')) {
  // Z3a 네 종단점 -> 네 답. 스위트 C12(8) 은 셋을 재므로 하나(레코드 부재)를 더 얹는다.
  const ws = fresh('z3a')
  const doc = honestStore(join(ws, 'main'), 130)
  const s = linkStoreAt(join(ws, 'link'), [
    link('ln-a-clean', doc, 'a1', { anchor: 'textQuote' }),
    link('ln-b-inherited', doc, 'a1', { anchor: 'constructor' }),
    link('ln-c-badtype', doc, 'a1', { anchor: 'textQuote', type: 'inventedRelation' }),
    link('ln-d-norecord', doc, 'a-missing', { anchor: 'textQuote' }),
  ])
  say({ probe: 'Z3a four endpoints under one plane-wide refusal: four answers?', gate: gate(s), binder: binder(s) })

  // Z3b 좁은 사유(per-store)가 **전역 거절 아래에서도** 이긴다: 레코드가 다른 문서를 주장하는
  //     스토어(vnv V7) 위에 나쁜 링크 타입을 얹어 평면을 통째로 빨갛게 만든다.
  const wsB = fresh('z3b')
  const docB = honestStore(join(wsB, 'main'), 131)
  {
    // 8차 V7 과 **같은 변형**(레코드의 `anchors.document` 가 남의 문서).
    const path = join(wsB, 'main', 'annotations.json')
    const payload = JSON.parse(readFileSync(path, 'utf8'))
    payload.annotations[0].anchors.document = { id: 'doc-somebody-elses' }
    writeFileSync(path, stringify(payload))
  }
  const sB = linkStoreAt(join(wsB, 'link'), [
    link('ln-a-mismatch', docB, 'a1', { anchor: 'textQuote' }),
    link('ln-z-badtype', docB, 'a1', { anchor: 'textQuote', type: 'inventedRelation' }),
  ])
  say({ probe: 'Z3b a per-store gate reason UNDER a plane-wide refusal (does the narrow one still win)', gate: gate(sB), binder: binder(sB) })

  // Z3d 두 번째 층이 **거짓으로 안심시키지는 않는가**: 게이트가 초록으로 서명했지만
  //     `loadStore` 가 거절하는 스토어(8차 P1 = M1 모양) 위에 나쁜 링크를 얹어 평면을 빨갛게
  //     만든다. 그 종단점은 자기 잘못이 **있는데**(편집기가 못 연다) 게이트는 그것을 볼 수
  //     없으므로 `reasons.endpoint` 가 무엇이라 말하는지가 이 층의 정직성이다.
  const wsD = fresh('z3d')
  const docD = honestStore(join(wsD, 'main'), 132)
  {
    const path = join(wsD, 'main', 'document.json')
    const payload = JSON.parse(readFileSync(path, 'utf8'))
    payload.yUpdateBase64 = 'not*valid*base64!!'
    writeFileSync(path, stringify(payload))
  }
  const sD = linkStoreAt(join(wsD, 'link'), [
    link('ln-a-unopenable', docD, 'a1', { anchor: 'textQuote' }),
    link('ln-z-badtype', docD, 'a1', { anchor: 'textQuote', type: 'inventedRelation' }),
  ])
  say({ probe: 'Z3d an endpoint whose store the EDITOR refuses, under a plane-wide refusal', gate: gate(sD), binder: binder(sD) })
  // 대조군: 나쁜 링크를 빼면 같은 종단점이 무엇이라 답하는가.
  const sDclean = linkStoreAt(join(wsD, 'link-clean'), [
    link('ln-a-unopenable', docD, 'a1', { anchor: 'textQuote' }),
  ])
  say({ probe: 'Z3d control — the same store with no bad link on the plane', gate: gate(sDclean), binder: binder(sDclean) })

  // Z3c 사람이 읽는 출력에도 두 번째 층이 보이는가 (JSON 만 고치고 text 를 빠뜨리는 자리).
  const proc = spawnSync('node', [ROOT + 'bind-links.mjs', '--store', s], { encoding: 'utf8' })
  say({
    probe: 'Z3c the text channel also carries the second layer',
    exit: proc.status,
    text: (proc.stdout || '').split('\n').filter((l) => l.includes('this endpoint itself') ||
      l.includes('->') || l.includes('gate:')).map((l) => l.trim()).slice(0, 12),
  })
}
