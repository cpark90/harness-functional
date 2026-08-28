#!/usr/bin/env node
/**
 * fixture 스토어 디렉토리마다 **문서 상태**(`document.json`)를 만든다.
 *
 *   node tools/plane-editor/make-fixture-documents.mjs [--check]
 *
 * ## 왜 필요한가
 *
 * 주석 스토어는 파일 하나가 아니라 **디렉토리**다: 편집기(`loadStore`)는 `annotations.json`
 * 옆의 `document.json`을 먼저 연다. fixture 트리는 오랫동안 `annotations.json`만 들고
 * 있었고, 그래서 (a) 게이트의 문서 축이 fail-open 인 것을 대조군이 잴 수 없었으며
 * (b) 성질(C9)의 "편집기 쪽"을 **진짜 `loadStore`로** 잴 수도 없었다(문서 상태가 없으니
 * 열리지 않는다). 문서 축을 fail-closed 로 닫으면서 fixture 도 실제 스토어의 모양을
 * 갖춘다 — 대조군은 **한 곳만** 망가져 있어야 하기 때문이다.
 *
 * ## 무엇을 쓰는가
 *
 * `saveStore`가 쓰는 것과 **같은 모양**의 문서 상태다: 실제 세션을 열어 CRDT 업데이트를
 * 인코딩하고, 그 상태 안에 문서 정체성이 들어 있다(정체성은 발급 시점에 상태로 들어간다 —
 * `src/document-id.mjs`). 그래서 fixture 는 평문 필드만 흉내 낸 껍데기가 아니라 편집기가
 * 실제로 여는 문서다. 문서 본문은 정체성 대조에 쓰이지 않으므로 한 문단으로 둔다.
 *
 * 결정론: clientID·문서 정체성·본문이 전부 표에 고정돼 있으므로 두 번 돌리면 byte 동일이다
 * (`--check`가 그 사실을 잰다 — 파일을 쓰지 않고 디스크본과 비교만 한다).
 *
 * 표의 마지막 네 줄은 **일부러 문서 축을 망가뜨린** 대조군이다(각각 사유 하나).
 */
import { readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

import { openSession } from './src/session.mjs'
import { DOCUMENT_FILE } from './src/store-contract.mjs'
import { PLANE_EDITOR_DIR } from './src/link-plane.mjs'

const FIXTURES = join(PLANE_EDITOR_DIR, 'fixtures', 'link-plane')

const CONTROL_TEXT = 'Fixture document for the link-plane control store.'
const LIVE_TEXT = 'Fixture document that the annotation stores next to it belong to.'

/**
 * [디렉토리, documentId, clientID, 본문, 옵션]
 *
 * 옵션 (대조군 전용, 그 밖에는 없음):
 *   plaintext: false — 평문 `documentId` 필드를 뺀다 (실측: vnv N2)
 *   state: false     — `yUpdateBase64`(문서 상태)를 뺀다
 *   raw: '...'       — 파일을 그대로 쓴다 (깨진 JSON — 실측: vnv N6)
 *   omit: true       — 파일을 아예 만들지 않는다 (실측: vnv N1)
 *   yUpdate: '...'   — `yUpdateBase64`의 **내용**을 편집기가 열 수 없는 값으로 바꾼다
 *                      (평문 정체성은 그대로 = 게이트가 볼 수 없는 축 — 실측: vnv M1·M1b)
 *   crdtFrom: [id, clientID, text] — 평문 정체성은 이 행의 것을 두고 CRDT 상태만 **남의
 *                      문서**의 것으로 바꾼다 (손으로 스플라이스한 모양 — 실측: vnv M2)
 *
 * 마지막 세 행(`yUpdate` 둘 + `crdtFrom` 하나)은 다른 대조군과 성격이 다르다: 게이트는
 * 이것들을 **초록으로 서명하고** 편집기는 거절한다. 게이트가 CRDT를 해독하지 않기 때문이며
 * (선언된 경계), 그 비대칭을 문장으로 두지 않고 매 실행 측정하려고 코퍼스에 넣어 둔 것이다
 * (`run-link-checks.mjs` C9의 `expectedDivergence` 부류).
 */
const DOCUMENT_STATES = [
  ['control', 'doc-fixture-control', 201, CONTROL_TEXT],
  ['negative-annotation-document-mismatch', 'doc-fixture-control', 202, CONTROL_TEXT],
  ['negative-annotation-document-missing', 'doc-fixture-control', 203, CONTROL_TEXT],
  ['negative-annotation-anchor-missing', 'doc-fixture-control', 238, CONTROL_TEXT],
  ['negative-annotation-anchor-unknown', 'doc-fixture-control', 239, CONTROL_TEXT],
  ['negative-annotation-state-unknown', 'doc-fixture-control', 204, CONTROL_TEXT],
  ['negative-bad-type', 'doc-fixture-control', 205, CONTROL_TEXT],
  ['negative-graph-source', 'doc-fixture-control', 206, CONTROL_TEXT],
  ['negative-missing-iri', 'doc-fixture-control', 207, CONTROL_TEXT],
  ['negative-missing-record', 'doc-fixture-control', 208, CONTROL_TEXT],
  ['negative-orphan-link', 'doc-fixture-control', 209, CONTROL_TEXT],
  ['negative-supersedes-cycle', 'doc-fixture-control', 210, CONTROL_TEXT],
  ['negative-supersedes-graph', 'doc-fixture-control', 211, CONTROL_TEXT],
  ['negative-tagged-range', 'doc-fixture-control', 212, CONTROL_TEXT],
  ['annotation-stores/broken-endpoint', 'doc-fixture-broken', 213,
    'Fixture document whose anchored block was moved, so the anchor is orphaned.'],
  // 스토어가 **남의 문서 옆에** 앉은 자리 (실측: vnv X1). 여기 사는 문서는 다른 문서다.
  ['annotation-stores/document-mismatch', 'doc-fixture-elsewhere', 214,
    'The document state this directory holds. The store next to it claims another document.'],
  ['annotation-stores/duplicate-document', 'doc-fixture-live', 215, LIVE_TEXT],
  ['annotation-stores/duplicate-record', 'doc-fixture-live', 216, LIVE_TEXT],
  ['annotation-stores/legacy-v1', 'doc-fixture-legacy-v1', 217,
    'Fixture document for a store that predates document identity.'],
  ['annotation-stores/legacy-v2', 'doc-fixture-legacy-v2', 218,
    'Fixture document for a store that predates document identity.'],
  ['annotation-stores/mixed-documents', 'doc-fixture-live', 219, LIVE_TEXT],
  ['annotation-stores/no-anchors', 'doc-fixture-live', 220, LIVE_TEXT],
  ['annotation-stores/null-anchors', 'doc-fixture-live', 221, LIVE_TEXT],
  ['annotation-stores/record-document-mismatch', 'doc-fixture-live', 222, LIVE_TEXT],
  ['annotation-stores/record-id-missing', 'doc-fixture-live', 223, LIVE_TEXT],
  ['annotation-stores/record-id-not-a-string', 'doc-fixture-live', 224, LIVE_TEXT],
  ['annotation-stores/record-not-an-object', 'doc-fixture-live', 225, LIVE_TEXT],
  ['annotation-stores/unidentified-record', 'doc-fixture-live', 226, LIVE_TEXT],
  ['annotation-stores/unmarked-identity', 'doc-fixture-live', 227, LIVE_TEXT],
  ['annotation-stores/unreadable-sibling', 'doc-fixture-live', 228, LIVE_TEXT],
  ['annotation-stores/unreadable-v99', 'doc-fixture-unreadable', 229,
    'Fixture document for a store written in a version this checker cannot read.'],
  ['annotation-stores/annotations-not-an-array', 'doc-fixture-shapeless', 230,
    'Fixture document for a file that is named like a store but is not one.'],
  // ---- 문서 축 대조군 (각각 한 곳만 망가져 있다) ----
  ['annotation-stores/document-state-absent', 'doc-fixture-state-absent', 231, '', { omit: true }],
  ['annotation-stores/document-state-unparsable', 'doc-fixture-state-unparsable', 232, '',
    { raw: '{\n  "fragment": "prosemirror",\n  "documentId": "doc-fixture-state-unpars\n' }],
  ['annotation-stores/document-state-unidentified', 'doc-fixture-state-unidentified', 233,
    'Fixture document whose plaintext identity field was dropped (an older writer, a merge).',
    { plaintext: false }],
  ['annotation-stores/document-state-missing', 'doc-fixture-state-missing', 234,
    'Fixture document state that carries no CRDT update at all.', { state: false }],
  // ---- 게이트가 볼 수 없는 축 (expectedDivergence 부류) ----
  ['annotation-stores/document-state-unopenable-base64', 'doc-fixture-state-unopenable-base64', 235,
    'Fixture document whose stored update was damaged in transit: the field is there, the content is not base64.',
    { yUpdate: 'not-base64:@@@' }],
  ['annotation-stores/document-state-unopenable-payload', 'doc-fixture-state-unopenable-payload', 236,
    'Fixture document whose stored update decodes as base64 but is not a Yjs update at all.',
    { yUpdate: Buffer.from('not-a-yjs-update', 'utf8').toString('base64') }],
  ['annotation-stores/document-state-foreign-crdt', 'doc-fixture-state-foreign', 237,
    'Fixture document state whose plaintext identity says one document while its CRDT state is another.',
    { crdtFrom: ['doc-fixture-state-foreign-other', 337,
      'The other document whose CRDT state was spliced into this file by hand.'] }],
]

const stringify = (value) => `${JSON.stringify(value, null, 2)}\n`

const paragraph = (text) => ({
  type: 'doc',
  content: [{ type: 'paragraph', content: [{ type: 'text', text }] }],
})

function documentState([directory, documentId, clientID, text, options = {}]) {
  if (options.omit) return null
  if (options.raw) return options.raw
  const session = openSession({ clientID, documentId, docJSON: paragraph(text) })
  let state = Buffer.from(session.encodeState()).toString('base64')
  let docJSON = session.editor.getJSON()
  if (options.yUpdate !== undefined) state = options.yUpdate
  if (options.crdtFrom) {
    // 평문 정체성은 이 행의 것으로 두고 **CRDT 상태만** 남의 문서 것으로 바꾼다.
    const [otherId, otherClient, otherText] = options.crdtFrom
    const other = openSession({ clientID: otherClient, documentId: otherId, docJSON: paragraph(otherText) })
    state = Buffer.from(other.encodeState()).toString('base64')
    docJSON = other.editor.getJSON()
    other.close()
  }
  const payload = {
    fragment: 'prosemirror',
    ...(options.plaintext === false ? {} : { documentId: session.documentId }),
    ...(options.state === false ? {} : { yUpdateBase64: state }),
    prosemirrorJSON: docJSON,
  }
  session.close()
  return stringify(payload)
}

const check = process.argv.includes('--check')
let written = 0
let differs = 0
for (const row of DOCUMENT_STATES) {
  const path = join(FIXTURES, row[0], DOCUMENT_FILE)
  const content = documentState(row)
  if (content === null) {
    console.log(`  skip  ${row[0]}/${DOCUMENT_FILE} (deliberately absent)`)
    continue
  }
  if (check) {
    let onDisk = null
    try {
      onDisk = readFileSync(path, 'utf8')
    } catch {
      onDisk = null
    }
    const same = onDisk === content
    if (!same) differs += 1
    console.log(`  ${same ? 'ok  ' : 'DIFF'}  ${row[0]}/${DOCUMENT_FILE}`)
    continue
  }
  writeFileSync(path, content)
  written += 1
}
if (check) {
  console.log(`\n${differs === 0 ? 'PASS' : 'FAIL'} — ${differs} file(s) differ from the table`)
  process.exit(differs === 0 ? 0 : 1)
}
console.log(`\n${written} document state(s) written`)
