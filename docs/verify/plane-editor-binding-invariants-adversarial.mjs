/**
 * vnv 적대 프로브 (3차) — I-1(게이트·편집기 등가)을 **문언 그대로** 겨냥한 새 우회.
 *   node docs/verify/plane-editor-binding-invariants-adversarial.mjs
 *   (환경변수 VNV_SCRATCH 로 scratch 경로 지정)
 *
 * I-1 은 "어떤 레코드 모양도 **게이트 통과 + 편집기 거절**이 되면 안 된다"이다. 수치 기준은
 * H3 의 세 모양에 한정돼 있으므로, 여기서는 그 셋 **밖에서** 같은 어긋남을 찾는다.
 *
 *   X1 — 정직한 스토어를 **남의 문서 옆으로 옮긴다**(복사·병합·rename 으로 도달). 파일
 *        내용은 위조가 아니다. 편집기는 "문서 상태가 다른 문서라고 말한다"며 거절하지만,
 *        검사기는 `document.json` 을 아예 읽지 않으므로 종단점을 묶는다.
 *   X2 — v3 스토어 안의 **깨진 레코드 모양**: id 가 문자열이 아니거나(숫자), 레코드가 dict
 *        가 아닌 경우. 검사기는 `isinstance(record["id"], str)` 로 조용히 건너뛰고, 편집기는
 *        같은 레코드에서 계약 위반으로 스토어 전체를 거절한다.
 *
 * tools/plane-editor/ 는 읽기만 한다 (산출은 scratch 뿐).
 */
const ROOT = new URL('../../tools/plane-editor/', import.meta.url).pathname
const { openSession, locate } = await import(ROOT + 'src/session.mjs')
const { captureAnchors, anchorStateOf } = await import(ROOT + 'src/anchors.mjs')
const { loadStore, saveStore } = await import(ROOT + 'src/store.mjs')
const { mkdirSync, writeFileSync, readFileSync, rmSync, copyFileSync } = await import('node:fs')
const { join } = await import('node:path')
const { spawnSync } = await import('node:child_process')

const SCRATCH = process.env.VNV_SCRATCH || '/tmp/vnv-invariants-probe'
const say = (o) => console.log(JSON.stringify(o))
const para = (t) => ({ type: 'paragraph', content: [{ type: 'text', text: t }] })
const docOf = (...texts) => ({ type: 'doc', content: texts.map(para) })
const stringify = (v) => `${JSON.stringify(v, null, 2)}\n`
const fresh = (name) => {
  const dir = join(SCRATCH, name)
  rmSync(dir, { recursive: true, force: true })
  mkdirSync(dir, { recursive: true })
  return dir
}

const writeLinks = (dir, documentId, linkId, ref = 'a1') => {
  writeFileSync(join(dir, 'links.json'), stringify({
    version: 1,
    plane: 'link',
    links: [{
      id: linkId,
      from: { plane: 'annotation', ref, document: documentId },
      to: { plane: 'graph', ref: 'id:c-traceability' },
      type: 'tagged',
      created_by: 'vnv invariants probe',
    }],
  }))
  writeFileSync(join(dir, 'decisions.json'), stringify({ version: 1, plane: 'decision', decisions: [] }))
}

const gate = (dir) => {
  const proc = spawnSync('/usr/bin/python3',
    [join(ROOT, 'check_links.py'), '--store', dir, '--format', 'json'], { encoding: 'utf8' })
  const verdict = proc.stdout ? JSON.parse(proc.stdout) : null
  return {
    exit: proc.status,
    pass: verdict ? verdict.pass : null,
    violations: verdict ? verdict.violations.map((v) => v.rule) : null,
    broken: verdict ? verdict.brokenEndpoints.length : null,
    stderr: (proc.stderr || '').trim().slice(0, 160),
  }
}

/** 문서 하나 + 살아있는 앵커 하나를 가진 정직한 v3 스토어를 만든다. */
const honestStore = (dir, clientID, line) => {
  const s = openSession({ clientID, docJSON: docOf('Opening block.', line, 'Closing block.') })
  const t = locate(s, { quote: line.slice(0, 12) })
  const anchors = captureAnchors(s, t.from, t.to)
  saveStore(dir, {
    fragment: 'prosemirror',
    documentId: s.documentId,
    docUpdate: s.encodeState(),
    docJSON: s.editor.getJSON(),
    annotations: [{ id: 'a1', anchors, body: 'honest', status: 'open', anchorState: anchorStateOf(s, anchors) }],
  })
  const documentId = s.documentId
  s.close()
  return documentId
}

/* ================================================================== *
 * X1 — 정직한 스토어를 남의 문서 옆으로 옮긴다 (복사·병합 경로)
 * ================================================================== */
{
  const dirA = fresh('x1-document-a')
  const dirB = fresh('x1-document-b')
  const docA = honestStore(dirA, 1, 'The disputed clause survives here.')
  const docB = honestStore(dirB, 2, 'A different document with other words.')

  // 병합 사고: A 의 annotations.json 이 B 의 디렉토리로 들어간다 (문서 파일은 B 것 그대로).
  copyFileSync(join(dirA, 'annotations.json'), join(dirB, 'annotations.json'))

  let loadError = null
  try { loadStore(dirB) } catch (error) { loadError = error.message }

  // 게이트: B 디렉토리를 스토어로 물린다. 링크는 **A 문서의 a1** 을 가리킨다.
  writeLinks(dirB, docA, 'ln-x1')
  const verdict = gate(dirB)
  say({
    probe: 'X1 an honest store moved next to another document (copy/merge)',
    documentA: docA,
    documentB: docB,
    editorLoad: loadError ? 'rejected' : 'accepted',
    editorError: loadError,
    checker: verdict,
    divergence: Boolean(loadError) && verdict.exit === 0 && verdict.pass === true,
  })
}

/* ================================================================== *
 * X2 — 검사기가 건너뛰고 편집기가 거절하는 레코드 모양
 * ================================================================== */
for (const [name, mutate] of [
  ['record id is a number, no anchors', (records) => [...records, { id: 7, body: 'no anchors' }]],
  ['record id missing entirely', (records) => [...records, { body: 'nameless', anchorState: 'bound' }]],
  ['record is not an object', (records) => [...records, 'just a string']],
]) {
  const dir = fresh(`x2-${name.replace(/[^a-z0-9]+/gi, '-')}`)
  const docId = honestStore(dir, 3, 'The clause that stays put.')
  const file = join(dir, 'annotations.json')
  const payload = JSON.parse(readFileSync(file, 'utf8'))
  payload.annotations = mutate(payload.annotations)
  writeFileSync(file, stringify(payload))

  let loadError = null
  try { loadStore(dir) } catch (error) { loadError = error.message }
  writeLinks(dir, docId, 'ln-x2')
  const verdict = gate(dir)
  say({
    probe: `X2 ${name}`,
    editorLoad: loadError ? 'rejected' : 'accepted',
    editorError: loadError,
    checker: verdict,
    divergence: Boolean(loadError) && verdict.exit === 0 && verdict.pass === true,
  })
}
