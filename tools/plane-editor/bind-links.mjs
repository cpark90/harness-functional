#!/usr/bin/env node
/**
 * 링크 종단점 바인딩 — "이 링크는 문서의 **어디**를 가리키는가"를 실제로 계산해 보인다.
 *
 *   node tools/plane-editor/bind-links.mjs
 *   node tools/plane-editor/bind-links.mjs --store <dir> --format json
 *
 * 종료 코드: 0 = 게이트가 링크 평면을 통과시켰고 모든 앵커 종단점을 평가했다(붙었거나,
 *                사유와 함께 orphan이거나),
 *            1 = 게이트의 전역 판정이 빨강이거나, 평가하지 못한 종단점이 있다(문서가 모호함·
 *                스토어를 열 수 없음·레코드 없음·앵커 이름이 계약 밖 등),
 *            2 = 사용/입출력 오류.
 *
 * 왜 검사기(`check_links.py`)가 아니라 여기인가: 위치 해소는 CRDT 문서 상태를 여는 일이고,
 * 게이트는 CRDT를 해독하지 않는다(선언된 경계). 그래서 게이트는 종단점의 형식과 "레코드가
 * 그 앵커 부분을 싣는가"까지 보고, **여는 일은 편집기 쪽인 이 명령**이 한다. 규칙과 근거는
 * `src/link-binding.mjs` 머리말에 있다 — 특히 **바인딩은 `loadStore`가 연 스토어에만 건다**
 * 와, 이 명령 **단독**으로도 fail-closed 여야 한다는 전제 셋(게이트 전역 판정 · 문서를
 * 선언한 스토어가 정확히 하나 · 앵커 이름은 own key). 앵커 종단점인지는 `anchor` **키의
 * 존재**로 정한다 — 값이 `""`·`0`이어도 종단점이며, 해소되지 않으면 사유 있는 unbound다.
 *
 * 거절 행은 사유를 **두 층**으로 싣는다: `reason`(판정 사유)과 `reasons.{endpoint, plane}`.
 * 링크 하나가 나빠 평면이 통째로 거절돼도 나머지 종단점이 "**게이트가 볼 수 있는** 잘못은
 * 없다"를 말할 수 있게 하려는 것이며, 판정은 그대로다(exit 1 · 바인딩 0). 그 문장이 "자기
 * 잘못은 없다"였던 동안에는 **과잉 안심**이었다: 게이트가 원리적으로 못 보는 축(편집기만 아는
 * `loadStore` 거절)에서는 자기 잘못이 있는 종단점도 같은 문장을 받았다(실측: vnv 10차 Z3d —
 * 대조군에서 같은 종단점은 `store-refused:document-state-unopenable`이다).
 */
import { bindLinkStore, DEFAULT_STORE_DIR, NO_GATE_VISIBLE_FAULT } from './src/link-binding.mjs'

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
  const { counts, gate } = result
  console.log(`store: ${result.store}`)
  console.log(
    `  ${counts.links} link(s) · ${counts.anchorEndpoints} endpoint(s) naming a document ` +
      `position · ${counts.recordEndpoints} naming only a record`,
  )
  // 게이트 통과는 바인딩의 필요조건이다 — 그 판정을 맨 위에 적어 둔다(문구 = 구현).
  console.log(
    gate.pass
      ? `  gate: exit ${gate.exitCode}, no violation — the necessary condition holds`
      : `  gate: exit ${gate.exitCode} REFUSED [${gate.violations.join(', ') || 'none'}] — ` +
        'nothing is bound while the link plane is red',
  )
  console.log(
    `  ${counts.annotationStores} annotation store(s) in scope · ${counts.loadStoreCalls} ` +
      `loadStore call(s) · ${counts.storesOpened} opened`,
  )
  // 열지 않은 스토어라도 **종단점이 이름을 댄** 것과 아무도 찾지 않은 것은 다르다. 둘을
  // 같은 문장으로 찍으면 평면이 빨개서 열지 않은 스토어가 "필요 없었다"로 읽힌다.
  const namedByUnbound = new Set(result.unbound.map((row) => row.store).filter(Boolean))
  for (const store of result.annotationStores) {
    const state = store.ambiguous
      ? `AMBIGUOUS — another store declares this document too, so neither is chosen; ` +
        `${store.bindings} binding(s)`
      : store.opened === null
        ? (namedByUnbound.has(store.path)
          ? 'named by an endpoint but never opened — nothing is opened while the link plane is red'
          : 'not needed by any anchor endpoint')
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
      // 전역 거절이 개별 사유를 덮지 않게 두 번째 층을 찍는다: 이 종단점 자신에게 **게이트가
      // 본** 잘못이 있는가, 아니면 다른 링크 때문에 평면이 거절됐을 뿐인가 (exit 은 어느 쪽이든 1).
      if (row.reason === row.reasons.plane) {
        console.log(`        this endpoint itself: ${row.reasons.endpoint ?? NO_GATE_VISIBLE_FAULT}`)
      }
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
