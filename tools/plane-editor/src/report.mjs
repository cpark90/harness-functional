/**
 * REPORT.md 생성기. 수치는 전부 suite 결과에서만 온다 — 손으로 고칠 여지를
 * 남기지 않으려고 리포트 자체를 산출물로 만든다 (재실행 시 byte-identical).
 */

const OUTCOME_LETTER = {
  survived: 'S',
  recovered: 'R',
  drifted: 'D',
  orphaned: 'O',
  wrong: 'X',
}

const yesNo = (value) => (value ? 'PASS' : 'FAIL')
const pct = (part, total) => (total === 0 ? 'n/a' : `${((part / total) * 100).toFixed(1)}%`)

function table(header, rows) {
  const lines = [`| ${header.join(' | ')} |`, `|${header.map(() => '---').join('|')}|`]
  for (const row of rows) lines.push(`| ${row.join(' | ')} |`)
  return lines.join('\n')
}

function laneMatrix(result, lane) {
  const anchorIds = result.fixture.anchorIds
  return table(
    ['id', '시나리오', '기대', ...anchorIds, '앵커수', '생존', '복구', '드리프트', 'orphan', '오해소', '판정'],
    result.scenarios.map((scenario) => {
      const byAnchor = new Map(scenario.trials.map((trial) => [trial.anchorId, trial]))
      const cells = anchorIds.map((id) => {
        const trial = byAnchor.get(id)
        if (!trial) return '-'
        const measurement = trial.lanes[lane]
        if (!measurement.measured) return 'n/a'
        const letter = OUTCOME_LETTER[measurement.outcome]
        return measurement.pass ? letter : `**${letter}**`
      })
      const totals = scenario.lanes[lane]
      return [
        scenario.id,
        scenario.title,
        scenario.target,
        ...cells,
        String(totals.measured),
        String(totals.survived),
        String(totals.recovered),
        String(totals.drifted),
        String(totals.orphaned),
        String(totals.wrong),
        totals.measured === 0 ? 'n/a' : `${totals.pass}/${totals.measured}`,
      ]
    }),
  )
}

const LANE_MEANING = {
  live: {
    survived: 'Decoration이 편집을 따라 재정렬되어 기대 텍스트를 덮음',
    recovered: '해당 없음 — live 레인에는 quote 복구 단계가 없다',
    orphaned: 'Decoration이 사라짐 — 평면이 명시적으로 orphan으로 표기',
  },
  pipeline: {
    survived: '주앵커 RelativePosition만으로 기대 텍스트 해소',
    recovered: '주앵커 실패 후 TextQuoteSelector로 기대 텍스트 해소',
    orphaned: '두 selector 모두 실패(또는 tombstone 증언) — 명시적으로 orphaned 표기',
  },
}
LANE_MEANING.stale = LANE_MEANING.pipeline

function fourWay(result, lane) {
  const totals = result.totals[lane]
  const meaning = LANE_MEANING[lane]
  return table(
    ['분류', '건수', '비율', '의미'],
    [
      ['생존 (survived)', String(totals.survived), pct(totals.survived, totals.measured), meaning.survived],
      ['복구 (recovered)', String(totals.recovered), pct(totals.recovered, totals.measured), meaning.recovered],
      ['orphan (orphaned)', String(totals.orphaned), pct(totals.orphaned, totals.measured), meaning.orphaned],
      [
        '오해소 (wrong)',
        String(totals.wrong),
        pct(totals.wrong, totals.measured),
        '무관한 위치에 부착 — **0이어야 함**',
      ],
      [
        '(참고) 드리프트 (drifted)',
        String(totals.drifted),
        pct(totals.drifted, totals.measured),
        `같은 자리인데 경계가 밀림(총 ${totals.driftChars}자). 생존으로 세지 않는다`,
      ],
    ],
  )
}

export function renderReport(result) {
  const out = []
  const g2 = result.gates.G2

  out.push('# Phase 1 — 앵커 엔진 검증 리포트 (실측)')
  out.push('')
  out.push(
    '> **이 파일은 `node run-suite.mjs`가 생성한다. 손으로 고치지 말 것.**',
    '> 수치는 전부 같은 실행의 `suite-result.json`과 동일한 측정에서 나온다.',
  )
  out.push('')
  out.push(
    `스택: Tiptap ${result.environment.tiptap} / ProseMirror(@tiptap/pm ${result.environment.tiptapPm}) / ` +
      `yjs ${result.environment.yjs} / y-prosemirror ${result.environment.yProsemirror} / jsdom ${result.environment.jsdom} (headless).`,
  )
  out.push('')
  out.push(
    `문서 fixture = 블록 ${result.fixture.blocks}개 / 문자 ${result.fixture.docChars}자, ` +
      `앵커 ${result.fixture.anchors}개(${result.fixture.anchorIds.join(', ')}), 시나리오 ${result.scenarios.length}종, ` +
      `시나리오당 앵커 1개씩 독립 시행 → 총 ${result.totals.pipeline.trials}시행.`,
  )
  out.push('')

  /* ---- lanes ---- */
  out.push('## 0. 레인 — 왜 숫자가 하나가 아닌가')
  out.push('')
  out.push(
    '브리프 §4는 "생존"을 한 숫자로 요구하지만, 앵커를 언제 캡처하느냐에 따라 값이 갈린다. ' +
      '한쪽만 적으면 유리한 쪽을 고른 것이 되므로 **세 레인을 모두 측정해 나란히 싣는다**.',
  )
  out.push('')
  out.push(
    table(
      ['레인', '뜻', '대응하는 실제 상황'],
      [
        ['live', result.lanes.live, '편집 중인 화면 — 플러그인 상태의 앵커'],
        ['pipeline', result.lanes.pipeline, '브리프 §3의 저장 경로 (저장 → 재로드)'],
        ['stale', result.lanes.stale, '오프라인 협업·다른 프로세스가 편집한 문서에 옛 레코드를 들이댐'],
      ],
    ),
  )
  out.push('')
  out.push(
    '게이트 G2는 **pipeline 레인**으로 판정한다(브리프 §3이 규정한 저장 경로이므로). ' +
      'stale 레인 수치도 같은 표에 그대로 싣는다 — 목표 미달분을 숨기지 않기 위해서다.',
  )
  out.push('')

  /* ---- gates ---- */
  out.push('## 1. 게이트 판정')
  out.push('')
  out.push(
    table(
      ['gate', '내용', '결과', '근거 수치'],
      [
        [
          'G1',
          '문서 스키마에 annotation mark/노드 0',
          yesNo(result.gates.G1.pass),
          `plane 유무 스키마 fingerprint 동일=${result.gates.G1.fingerprintIdentical}, annotation 명칭 타입=${result.gates.G1.annotationNamedTypes.length}, ` +
            `부착 후 doc 불변=${result.gates.G1.documentUnchanged}, Yjs 상태 불변=${result.gates.G1.yStateUnchanged}, ` +
            `스키마 mark ${result.gates.G1.markCount}개/노드 ${result.gates.G1.nodeCount}개는 전부 StarterKit 콘텐츠 타입`,
        ],
        [
          'G2',
          'S1–S4·S8 생존 100% + S5 오해소 0',
          yesNo(g2.pass),
          `pipeline 생존 ${pct(g2.pipeline.survived, g2.pipeline.measured)} (${g2.pipeline.survived}/${g2.pipeline.measured}), ` +
            `stale 생존 ${pct(g2.stale.survived, g2.stale.measured)} (${g2.stale.survived}/${g2.stale.measured}, 드리프트 ${g2.stale.drifted}), ` +
            `S5 orphan ${g2.s5.pipeline.orphaned}/${g2.s5.pipeline.trials}, 전 레인 오해소 ${g2.wrongTotalAllLanes}`,
        ],
        [
          'G3',
          '단일 명령·비대화형 재현',
          yesNo(result.gates.G3.pass),
          `동일 프로세스 내 ${result.gates.G3.repeats}회 반복 digest 일치=${result.gates.G3.deterministic}, payload sha256=\`${result.gates.G3.payloadSha256.slice(0, 16)}…\``,
        ],
        ['G4', '기존 게이트 3종 회귀', result.gates.G4.status, result.gates.G4.note],
        [
          'G5',
          '언어 정책 (한글 산문 / 영어 용어)',
          yesNo(result.gates.G5.pass),
          `손으로 쓴 파일 ${result.gates.G5.filesScanned}개 스캔 — 정책 밖 문자 ${result.gates.G5.violations.length}개 ` +
            `(ASCII ${result.gates.G5.asciiChars}자 / 한글 ${result.gates.G5.hangulChars}자). ${result.gates.G5.note}`,
        ],
      ],
    ),
  )
  out.push('')
  out.push(
    `G2 세부: stale 레인이 브리프의 100% 목표를 만족하는가 = **${g2.staleMeetsTarget ? 'yes' : 'no'}** ` +
      `(${g2.stale.pass}/${g2.stale.measured} 통과, 드리프트 ${g2.stale.drifted}건). ` +
      '드리프트는 오해소가 아니라 경계 한 칸 밀림이며, 원인·성격은 아래 D2에 있다.',
  )
  out.push('')

  /* ---- scenario x anchor ---- */
  out.push('## 2. 시나리오 × 앵커')
  out.push('')
  out.push(
    '`S`=주앵커(RelativePosition) 생존, `R`=quote 복구, `D`=경계 드리프트(같은 자리·경계 밀림), ' +
      '`O`=orphaned, `X`=오해소. 굵은 글자는 기대 불일치 셀이다 (S5는 `O`가 정답).',
  )
  out.push('')
  out.push('### 2.1 pipeline 레인 (게이트 기준)')
  out.push('')
  out.push(laneMatrix(result, 'pipeline'))
  out.push('')
  out.push('### 2.2 stale 레인 (최악 경로)')
  out.push('')
  out.push(laneMatrix(result, 'stale'))
  out.push('')
  out.push('### 2.3 live 레인 (세션 안 Decoration)')
  out.push('')
  out.push(laneMatrix(result, 'live'))
  out.push('')

  /* ---- four-way totals ---- */
  out.push('## 3. 4분류 총계')
  out.push('')
  out.push('### 3.1 pipeline 레인')
  out.push('')
  out.push(fourWay(result, 'pipeline'))
  out.push('')
  out.push('### 3.2 stale 레인')
  out.push('')
  out.push(fourWay(result, 'stale'))
  out.push('')
  out.push('### 3.3 live 레인')
  out.push('')
  out.push(fourWay(result, 'live'))
  out.push('')
  out.push(
    `bystander(대상이 아닌 나머지 앵커) ${result.bystanders.total}건: exact 그대로 ${result.bystanders.ok}, ` +
      `편집에 걸려 잔여 범위 ${result.bystanders.residual}, orphan ${result.bystanders.orphaned}, 오해소 ${result.bystanders.wrong}. ` +
      '한 문서에 앵커를 여러 개 얹어도 서로를 밀어내지 않는지 본 값이다 (잔여 범위는 편집이 그 앵커에도 걸친 정상 결과).',
  )
  out.push('')

  /* ---- policy effects ---- */
  out.push('## 4. 해소 정책의 효과 (오해소 0을 만든 규칙)')
  out.push('')
  out.push(
    table(
      ['규칙', '발동', '없었다면'],
      [
        [
          'tombstone evidence — RelativePosition이 collapsed면 quote 복구를 돌리지 않고 orphan 확정',
          `${result.policy.tombstoneSkips}건`,
          `오해소 ${result.policy.counterfactualMisResolves}건 (naive fallback 반사실 측정)`,
        ],
        [
          'quote 채택 = 양쪽 affix 일치, 단 exact가 문서에 유일하면 한쪽 affix 허용',
          `${result.policy.quoteUniqueOneAffix}건이 유일-한쪽 규칙으로 복구`,
          '해당 앵커들은 전부 orphan (복구율 하락, 오해소는 불변)',
        ],
      ],
    ),
  )
  out.push('')
  if (result.policy.counterfactualTrials.length > 0) {
    out.push('naive fallback이 잘못 붙였을 자리:')
    out.push('')
    out.push(
      table(
        ['시나리오', '앵커', '레인', '붙었을 텍스트'],
        result.policy.counterfactualTrials.map((row) => [
          row.scenario,
          row.anchorId,
          row.lane,
          `\`${row.wouldAttachTo}\``,
        ]),
      ),
    )
    out.push('')
  }

  /* ---- diagnostics ---- */
  let section = 5
  for (const diagnostic of result.diagnostics) {
    out.push(`## ${section}. ${diagnostic.id} — ${diagnostic.title}`)
    out.push('')
    out.push(`질문: ${diagnostic.question}`)
    out.push('')
    if (diagnostic.id === 'D1') {
      out.push(
        table(
          ['앵커', 'exact', 'live 결과', 'stale 결과', '두 레인 일치'],
          diagnostic.rows.map((row) => [
            row.anchorId,
            `\`${row.exact}\``,
            `\`${row.liveText}\``,
            `\`${row.staleText}\``,
            row.lanesAgree ? 'yes' : 'no',
          ]),
        ),
      )
      out.push('')
      out.push(
        diagnostic.lanesAgree
          ? '두 레인이 끝 경계 삽입을 같게 처리한다.'
          : '두 레인이 끝 경계 삽입을 **다르게** 처리한다 — Decoration은 `inclusiveEnd:false`로 배타적이지만, ' +
              '`y-prosemirror`의 `absolutePositionToRelativePosition`은 assoc 인자를 받지 않아(3-arity, `src/lib.js:54`) ' +
              '항상 우측 결합이라 삽입을 범위 안으로 흡수한다. Phase 2에서 앵커 결합 방향을 명시 저장해야 한다는 뜻이다 (비게이팅 관측).',
      )
      out.push('')
    } else {
      out.push(
        table(
          ['앵커', 'exact', 'PM 삭제 시작', 'Yjs 삭제 시작', '어긋남(자)', '삭제 문자수'],
          diagnostic.rows.map((row) => [
            row.anchorId,
            `\`${row.exact}\``,
            String(row.pmDeleteStart),
            String(row.yjsDeleteStart),
            String(row.shift),
            String(row.deletedChars),
          ]),
        ),
      )
      out.push('')
      out.push(
        diagnostic.aligned
          ? 'PM Step과 Yjs 삭제 범위가 항상 같은 자리다.'
          : 'PM Step과 Yjs 삭제 범위가 **어긋나는 앵커가 있다**. `y-prosemirror`는 PM step을 그대로 옮기지 않고 ' +
              '텍스트를 `lib0/diff`의 `simpleDiff`로 비교해 Yjs 삭제 범위를 정하기 때문이다 ' +
              '(`node_modules/y-prosemirror/src/plugins/sync-plugin.js:1075` `updateYText`). ' +
              '삭제 경계 양쪽에 같은 문자(예: 공백)가 있으면 결과 문서는 동일하지만 tombstone 경계가 한 칸 밀리고, ' +
              '그 자리에 걸친 stale 앵커는 잔여 범위가 한 글자 넓게/좁게 해소된다 = 위 표의 드리프트. ' +
              '**저장 시 재캡처(pipeline 레인)를 하면 사라지는 오차**이므로, Phase 2의 저장 규약은 ' +
              '"편집 세션이 살아 있으면 저장 시점에 앵커를 다시 캡처한다"를 포함해야 한다.',
      )
      out.push('')
    }
    section += 1
  }

  /* ---- findings ---- */
  out.push(`## ${section}. 관측 (수치에서 바로 도출)`)
  out.push('')
  for (const finding of result.findings) out.push(`- ${finding}`)
  out.push('')
  section += 1

  /* ---- reproduction ---- */
  out.push(`## ${section}. 재현`)
  out.push('')
  out.push('```')
  out.push('cd tools/plane-editor && npm install   # 최초 1회 (pin된 버전)')
  out.push('node run-suite.mjs                     # -> suite-result.json + REPORT.md')
  out.push('```')
  out.push('')
  out.push(
    '비대화형·결정론적이다. Yjs client ID를 고정하고 시각·난수를 결과에 넣지 않으므로, ' +
      '같은 커밋에서 재실행하면 `suite-result.json`과 이 파일이 byte 단위로 같아야 한다 ' +
      '(재실행 후 `git diff --stat`가 비어야 함).',
  )
  out.push('')

  return `${out.join('\n')}`
}
