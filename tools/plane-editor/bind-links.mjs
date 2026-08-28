#!/usr/bin/env node
/**
 * 링크 종단점 바인딩 — "이 링크는 문서의 **어디**를 가리키는가"를 실제로 계산해 보인다.
 *
 *   node tools/plane-editor/bind-links.mjs
 *   node tools/plane-editor/bind-links.mjs --store <dir> --format json
 *
 * 종료 코드: 0 = 모든 앵커 종단점을 평가했다(붙었거나, 사유와 함께 orphan이거나),
 *            1 = 평가하지 못한 종단점이 있다(스토어를 열 수 없음·레코드 없음 등),
 *            2 = 사용/입출력 오류.
 *
 * 왜 검사기(`check_links.py`)가 아니라 여기인가: 위치 해소는 CRDT 문서 상태를 여는 일이고,
 * 게이트는 CRDT를 해독하지 않는다(선언된 경계). 그래서 게이트는 종단점의 형식과 "레코드가
 * 그 앵커 부분을 싣는가"까지 보고, **여는 일은 편집기 쪽인 이 명령**이 한다. 규칙과 근거는
 * `src/link-binding.mjs` 머리말에 있다 — 특히 **바인딩은 `loadStore`가 연 스토어에만 건다**.
 */
import { bindLinkStore, DEFAULT_STORE_DIR } from './src/link-binding.mjs'

function parseArgs(argv) {
  const args = { store: DEFAULT_STORE_DIR, format: 'text', annotations: [] }
  for (let i = 0; i < argv.length; i += 1) {
    const flag = argv[i]
    const value = argv[i + 1]
    if (flag === '--store' && value) { args.store = value; i += 1 }
    else if (flag === '--annotations' && value) { args.annotations.push(value); i += 1 }
    else if (flag === '--format' && (value === 'text' || value === 'json')) { args.format = value; i += 1 }
    else throw new Error(`unknown argument: ${flag}`)
  }
  return args
}

function printText(result) {
  const { counts } = result
  console.log(`store: ${result.store}`)
  console.log(
    `  ${counts.links} link(s) · ${counts.anchorEndpoints} endpoint(s) naming a document ` +
      `position · ${counts.recordEndpoints} naming only a record`,
  )
  console.log(
    `  ${counts.annotationStores} annotation store(s) in scope · ${counts.loadStoreCalls} ` +
      `loadStore call(s) · ${counts.storesOpened} opened`,
  )
  for (const store of result.annotationStores) {
    const state = store.opened === null
      ? 'not needed by any anchor endpoint'
      : store.opened
        ? `opened, ${store.bindings} binding(s)`
        : `REFUSED [${store.refusal}] — 0 binding(s)`
    console.log(`    - ${store.path} (document ${store.documentId}): ${state}`)
  }
  if (result.bindings.length) {
    console.log('\n  bound endpoints (the text each link actually points at):')
    for (const row of result.bindings) {
      if (row.state === 'bound') {
        console.log(
          `    - ${row.link} ${row.side} -> ${row.document}/${row.record} @${row.anchor} ` +
            `[${row.from},${row.to}) ${JSON.stringify(row.text)}`,
        )
      } else {
        console.log(
          `    - ${row.link} ${row.side} -> ${row.document}/${row.record} @${row.anchor} ` +
            `ORPHANED (${row.reason}) — reported, never re-pointed`,
        )
      }
    }
  }
  if (result.unbound.length) {
    console.log('\n! endpoints this binder could not evaluate (not a missing result, a failure):')
    for (const row of result.unbound) {
      console.log(`    - ${row.link} ${row.side} -> ${row.document}/${row.record} @${row.anchor}: ${row.reason}`)
    }
  }
  console.log(`\n${result.pass ? 'PASS' : 'FAIL'}`)
}

function main(argv) {
  let args
  try {
    args = parseArgs(argv)
  } catch (error) {
    console.error(`x ${error.message}`)
    return 2
  }
  let result
  try {
    result = bindLinkStore({ storeDir: args.store, annotations: args.annotations })
  } catch (error) {
    console.error(`x ${error.message}`)
    return 2
  }
  if (args.format === 'json') console.log(JSON.stringify(result, null, 2))
  else printText(result)
  return result.pass ? 0 : 1
}

process.exit(main(process.argv.slice(2)))
