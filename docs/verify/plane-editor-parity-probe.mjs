/**
 * vnv 적대 프로브 (6차) — **게이트–편집기 동치 성질**(`run-link-checks.mjs` C9)을 겨냥한다.
 *   VNV_SCRATCH=<dir> node docs/verify/plane-editor-parity-probe.mjs
 *
 * 성질의 문언은 "게이트 accept <-> 편집기 accept"이고, 구현은
 *   editor  = `src/store-contract.mjs annotationStoreContract(payload, {documentId})`
 *   gate    = `check_links.py` 가 그 경로에 매긴 per-store 규칙
 * 이다. 두 쪽 모두 **문서 정체성을 옆 `document.json` 의 평문 필드**에서 받는다. 진짜 편집기
 * (`loadStore`)는 그 값을 **CRDT 상태**에서 읽는다 — 그래서 평문 필드가 없거나 파일이 아예
 * 없으면 성질이 보는 "편집기"와 진짜 편집기가 갈린다. 그 틈을 겨냥한다.
 *
 *   N0  대조군    — 정직한 스토어: 게이트 accept + 진짜 loadStore accept.
 *   N1  document.json 없이 스토어만 옮김(내보내기·부분 체크아웃·백업).
 *   N2  옮긴 자리의 document.json 에 평문 documentId 가 없음(옛 saveStore·손질된 파일).
 *   N2c N2 의 대조군 — 평문 필드가 있으면 X1 규칙이 실제로 걸린다.
 *   N3  이름을 바꾼 쌍둥이 + 머리 4KB 밖으로 밀려난 "version" 키(sort_keys 직렬화·큰 스토어).
 *   N3c N3 의 대조군 — 패딩이 없으면 이름을 바꿔도 잡힌다(Y3 닫힘 재확인).
 *
 * tools/plane-editor/ 는 읽기만 한다 (산출은 scratch 뿐).
 */
const ROOT = new URL('../../tools/plane-editor/', import.meta.url).pathname
const { openSession, locate } = await import(ROOT + 'src/session.mjs')
const { captureAnchors, anchorStateOf } = await import(ROOT + 'src/anchors.mjs')
const { loadStore, saveStore } = await import(ROOT + 'src/store.mjs')
const { annotationStoreContract } = await import(ROOT + 'src/store-contract.mjs')
const { mkdirSync, writeFileSync, readFileSync, rmSync, copyFileSync, existsSync } =
  await import('node:fs')
const { join, dirname } = await import('node:path')
const { spawnSync } = await import('node:child_process')

const SCRATCH = process.env.VNV_SCRATCH || '/tmp/vnv-parity-probe'
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
const honestStore = (dir, clientID, line, extraRecords = 0) => {
  const session = openSession({ clientID, docJSON: docOf('Opening block.', line, 'Closing block.') })
  const target = locate(session, { quote: line.slice(0, 12) })
  const anchors = captureAnchors(session, target.from, target.to)
  const state = anchorStateOf(session, anchors)
  const annotations = [{ id: 'a1', anchors, body: 'honest', status: 'open', anchorState: state }]
  for (let i = 0; i < extraRecords; i += 1) {
    annotations.push({
      id: `pad-${i}`,
      anchors,
      body: `padding record ${i} — a store big enough that a sorted-key serialiser pushes ` +
        'the "version" key past the sniff budget',
      status: 'open',
      anchorState: state,
    })
  }
  saveStore(dir, {
    fragment: 'prosemirror',
    documentId: session.documentId,
    docUpdate: session.encodeState(),
    docJSON: session.editor.getJSON(),
    annotations,
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
      created_by: 'vnv parity probe',
    }],
  }))
  writeFileSync(join(dir, 'decisions.json'), stringify({ version: 1, plane: 'decision', decisions: [] }))
  return dir
}

const gate = (storeDir, named = []) => {
  const args = [join(ROOT, 'check_links.py'), '--store', storeDir, '--format', 'json']
  for (const path of named) args.push('--annotations', path)
  const proc = spawnSync('/usr/bin/python3', args, { encoding: 'utf8' })
  const verdict = proc.stdout ? JSON.parse(proc.stdout) : null
  return {
    exit: proc.status,
    pass: verdict ? verdict.pass : null,
    violations: verdict ? verdict.violations.map((v) => v.rule) : null,
    broken: verdict ? verdict.counts.brokenEndpoints : null,
    judged: verdict ? verdict.annotationStores.length : null,
    scope: verdict ? verdict.annotationScope : null,
    recordsRead: verdict && verdict.counts ? verdict.counts.annotationRecordsRead : null,
    stderr: (proc.stderr || '').trim().slice(0, 160),
  }
}

/** 진짜 편집기. 성질이 쓰는 계약 함수와 **다른** 입력(CRDT 상태)을 본다. */
const editor = (dir) => {
  try {
    loadStore(dir)
    return { load: 'accepted', error: null }
  } catch (error) {
    return { load: 'rejected', error: error.message.slice(0, 120) }
  }
}

/** C9 가 계산하는 "편집기 쪽" 답 — payload + 옆 document.json 의 **평문** 필드. */
const propertyEditorSide = (storePath) => {
  const payload = JSON.parse(readFileSync(storePath, 'utf8'))
  let documentId = null
  const docPath = join(dirname(storePath), 'document.json')
  if (existsSync(docPath)) {
    // C9 의 documentStateId 와 같은 처리 — 읽지 못하면 null (조용히 넘어간다).
    try {
      const doc = JSON.parse(readFileSync(docPath, 'utf8'))
      if (typeof doc.documentId === 'string' && doc.documentId) documentId = doc.documentId
    } catch { documentId = null }
  }
  const problems = annotationStoreContract(payload, { documentId })
  return problems.length ? problems.map((p) => p.code) : 'accepted'
}

/* ---- N0 대조군 ---------------------------------------------------------- */
{
  const ws = fresh('n0')
  const documentId = honestStore(join(ws, 'main'), 61, 'The disputed clause survives here.')
  const link = linkStoreAt(join(ws, 'link'), documentId, 'ln-n0')
  say({
    probe: 'N0 control — an honest store in a workspace',
    gate: gate(link),
    editor: editor(join(ws, 'main')),
    c9EditorSide: propertyEditorSide(join(ws, 'main', 'annotations.json')),
  })
}

/* ---- N1 스토어만 옮김 (document.json 없음) -------------------------------- */
{
  const ws = fresh('n1')
  const documentId = honestStore(join(ws, 'main'), 62, 'The disputed clause survives here.')
  // 내보내기·부분 체크아웃·백업: 주석 파일만 다른 디렉토리로 간다 (원본은 사라진다).
  mkdirSync(join(ws, 'exported'), { recursive: true })
  copyFileSync(join(ws, 'main', 'annotations.json'), join(ws, 'exported', 'annotations.json'))
  rmSync(join(ws, 'main'), { recursive: true, force: true })
  const link = linkStoreAt(join(ws, 'link'), documentId, 'ln-n1')
  say({
    probe: 'N1 the store moved without its document.json',
    gate: gate(link),
    editor: editor(join(ws, 'exported')),
    c9EditorSide: propertyEditorSide(join(ws, 'exported', 'annotations.json')),
  })
}

/* ---- N2 옮긴 자리의 document.json 에 평문 documentId 가 없다 --------------- */
{
  const ws = fresh('n2')
  const documentA = honestStore(join(ws, 'a'), 63, 'The disputed clause survives here.')
  honestStore(join(ws, 'b'), 64, 'A different document with other words.')
  // A 의 스토어를 B 의 디렉토리로 옮긴다 (원본은 사라진다 = 병합·git mv).
  copyFileSync(join(ws, 'a', 'annotations.json'), join(ws, 'b', 'annotations.json'))
  rmSync(join(ws, 'a'), { recursive: true, force: true })
  // 그 자리의 document.json 에 평문 documentId 가 없다 (옛 saveStore·손질·다른 도구 산출).
  const documentB = JSON.parse(readFileSync(join(ws, 'b', 'document.json'), 'utf8'))
  const plainId = documentB.documentId
  delete documentB.documentId
  writeFileSync(join(ws, 'b', 'document.json'), stringify(documentB))
  const link = linkStoreAt(join(ws, 'link'), documentA, 'ln-n2')
  say({
    probe: 'N2 moved next to a document.json that carries no plaintext documentId',
    movedStoreClaims: documentA,
    documentStateReallyIs: plainId,
    gate: gate(link),
    editor: editor(join(ws, 'b')),
    c9EditorSide: propertyEditorSide(join(ws, 'b', 'annotations.json')),
  })
}

/* ---- N2c 대조군: 평문 필드가 있으면 X1 규칙이 걸린다 ---------------------- */
{
  const ws = fresh('n2c')
  const documentA = honestStore(join(ws, 'a'), 65, 'The disputed clause survives here.')
  honestStore(join(ws, 'b'), 66, 'A different document with other words.')
  copyFileSync(join(ws, 'a', 'annotations.json'), join(ws, 'b', 'annotations.json'))
  rmSync(join(ws, 'a'), { recursive: true, force: true })
  const link = linkStoreAt(join(ws, 'link'), documentA, 'ln-n2c')
  say({
    probe: 'N2c control — same move, document.json keeps its plaintext documentId',
    gate: gate(link),
    editor: editor(join(ws, 'b')),
    c9EditorSide: propertyEditorSide(join(ws, 'b', 'annotations.json')),
  })
}

/* ---- N3 이름 바꾼 쌍둥이 + sniff 예산 밖으로 밀린 "version" ---------------- */
{
  const ws = fresh('n3')
  const documentId = honestStore(join(ws, 'main'), 67, 'The disputed clause survives here.', 8)
  const link = linkStoreAt(join(ws, 'link'), documentId, 'ln-n3')
  const twin = JSON.parse(readFileSync(join(ws, 'main', 'annotations.json'), 'utf8'))
  twin.annotations[0].anchorState = 'orphaned'
  mkdirSync(join(ws, 'copy'), { recursive: true })
  // 키를 정렬해 쓰는 직렬화기(python json.dump(sort_keys=True) 등)에서는 "version" 이 마지막에
  // 온다. 레코드가 몇 개만 돼도 그 키는 머리 4096 바이트 밖으로 밀린다.
  const sorted = (value) => {
    if (Array.isArray(value)) return value.map(sorted)
    if (value && typeof value === 'object') {
      return Object.fromEntries(Object.keys(value).sort().map((k) => [k, sorted(value[k])]))
    }
    return value
  }
  const text = stringify(sorted(twin))
  writeFileSync(join(ws, 'copy', 'annotations-backup.json'), text)
  say({
    probe: 'N3 renamed twin whose "version" key sits past the 4096-byte sniff budget',
    versionKeyAtByte: text.indexOf('"version"'),
    annotationsKeyAtByte: text.indexOf('"annotations"'),
    gate: gate(link),
  })
}

/* ---- N3c 대조군: 패딩 없이 이름만 바꾼 쌍둥이는 잡힌다 -------------------- */
{
  const ws = fresh('n3c')
  const documentId = honestStore(join(ws, 'main'), 68, 'The disputed clause survives here.')
  const link = linkStoreAt(join(ws, 'link'), documentId, 'ln-n3c')
  const twin = JSON.parse(readFileSync(join(ws, 'main', 'annotations.json'), 'utf8'))
  twin.annotations[0].anchorState = 'orphaned'
  mkdirSync(join(ws, 'copy'), { recursive: true })
  const text = stringify(twin)
  writeFileSync(join(ws, 'copy', 'annotations-backup.json'), text)
  say({
    probe: 'N3c control — same rename, "version" still inside the sniff budget',
    versionKeyAtByte: text.indexOf('"version"'),
    gate: gate(link),
  })
}

/* ---- N4 작업공간 루트에 격리 표식 한 장 -------------------------------- */
{
  const ws = fresh('n4')
  const documentId = honestStore(join(ws, 'main'), 69, 'The disputed clause survives here.')
  const link = linkStoreAt(join(ws, 'link'), documentId, 'ln-n4')
  const twin = JSON.parse(readFileSync(join(ws, 'main', 'annotations.json'), 'utf8'))
  twin.annotations[0].anchorState = 'orphaned'
  mkdirSync(join(ws, 'copy'), { recursive: true })
  writeFileSync(join(ws, 'copy', 'annotations.json'), stringify(twin))
  const before = gate(link)
  writeFileSync(join(ws, '.annotation-store-quarantine'), 'wip\n')
  say({
    probe: 'N4 one quarantine marker at the workspace root',
    beforeMarker: { exit: before.exit, violations: before.violations, broken: before.broken, judged: before.judged },
    gate: gate(link),
  })
}

/* ---- N5 anchors.legacy 가 빈 배열 (JS truthy / Python falsy) ------------- */
{
  const ws = fresh('n5')
  const documentId = honestStore(join(ws, 'main'), 70, 'The disputed clause survives here.')
  const store = JSON.parse(readFileSync(join(ws, 'main', 'annotations.json'), 'utf8'))
  store.annotations[0].anchors.document = null
  store.annotations[0].anchors.legacy = []
  writeFileSync(join(ws, 'main', 'annotations.json'), stringify(store))
  const link = linkStoreAt(join(ws, 'link'), documentId, 'ln-n5')
  say({
    probe: 'N5 anchors.legacy is an empty array (truthy in JS, falsy in Python)',
    gate: gate(link),
    editor: editor(join(ws, 'main')),
    c9EditorSide: propertyEditorSide(join(ws, 'main', 'annotations.json')),
  })
}

/* ---- N6 옆 document.json 이 깨진 JSON ------------------------------------ */
{
  const ws = fresh('n6')
  const documentA = honestStore(join(ws, 'a'), 71, 'The disputed clause survives here.')
  honestStore(join(ws, 'b'), 72, 'A different document with other words.')
  copyFileSync(join(ws, 'a', 'annotations.json'), join(ws, 'b', 'annotations.json'))
  rmSync(join(ws, 'a'), { recursive: true, force: true })
  writeFileSync(join(ws, 'b', 'document.json'), '{ truncated during a merge')
  const link = linkStoreAt(join(ws, 'link'), documentA, 'ln-n6')
  say({
    probe: 'N6 moved next to a document.json that is not valid JSON',
    gate: gate(link),
    editor: editor(join(ws, 'b')),
    c9EditorSide: propertyEditorSide(join(ws, 'b', 'annotations.json')),
  })
}
