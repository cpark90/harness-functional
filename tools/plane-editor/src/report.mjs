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

function laneMatrix(result, lane, fixtureId) {
  const fixture = result.fixtures.find((item) => item.id === fixtureId)
  const anchorIds = fixture.anchorIds
  const scenarios = result.scenarios.filter((scenario) => scenario.fixtureId === fixtureId)
  return table(
    ['id', '시나리오', '기대', ...anchorIds, '앵커수', '생존', '복구', '드리프트', 'orphan', '오해소', '판정'],
    scenarios.map((scenario) => {
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
    recovered: '해당 없음 — live 레인에는 복구 단계가 없다',
    orphaned: 'Decoration이 사라짐 — 평면이 명시적으로 orphan으로 표기',
  },
  pipeline: {
    survived: '주앵커 RelativePosition + guard 통과로 기대 텍스트 해소',
    recovered: '주앵커 실패 후 블록 item 정체성(block-identity)으로 기대 텍스트 해소',
    orphaned: '복구 조건 미충족(삭제 증거·출처 미상 포함) — 명시적으로 orphaned 표기',
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
    `시나리오 ${result.scenarios.length}종, 시나리오당 앵커 1개씩 독립 시행 → 총 ${result.totals.pipeline.trials}시행. ` +
      '문서 fixture는 2종이다.',
  )
  out.push('')
  out.push(
    '> **오해소(mis-resolution) 수치의 범위**: 이 리포트의 "오해소 0"은 **아래에 열거된 시나리오·레인·시행 안에서만** ' +
      '측정된 값이다. 스위트 밖 편집 모양까지 보장한다는 뜻이 아니다 (§4 주장 범위 참조).',
  )
  out.push('')
  out.push(
    table(
      ['fixture', '쓰임', '블록', '문자', '앵커'],
      result.fixtures.map((fixture) => [
        `\`${fixture.id}\``,
        fixture.title,
        String(fixture.blocks),
        String(fixture.docChars),
        `${fixture.anchors} (${fixture.anchorIds.join(', ')})`,
      ]),
    ),
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
        [
          'C1',
          `S9·S10 전 레인 오해소 0 (합산 ${result.gates.C1.minTrials}시행 이상)`,
          yesNo(result.gates.C1.pass),
          `S9(블록 통째 삭제)+S10(제자리 교체) ${result.gates.C1.trials}시행 — 전 레인 orphaned ${result.gates.C1.orphanedAllLanes}, ` +
            `오해소 ${result.gates.C1.wrongAllLanes}. Phase 1 규칙이었다면 이 범위에서만 오해소 ${result.gates.C1.blockedMisResolutions.phase1}건`,
        ],
        [
          'C1b',
          `S11 전 레인 오해소 0 (시나리오마다 ${result.gates.C1b.minTrialsPerScenario}시행 이상)`,
          yesNo(result.gates.C1b.pass),
          `S11a·S11b(쌍둥이 블록 이동)+S11c(재타이핑)+S11d(원격 작성)+S11e(v1 레코드) ${result.gates.C1b.trials}시행 — ` +
            `전 레인 orphaned ${result.gates.C1b.orphanedAllLanes}, 오해소 ${result.gates.C1b.wrongAllLanes}. ` +
            `텍스트 동일성으로 이동을 추정하는 정책(textmove)이었다면 이 범위에서만 오해소 ${result.gates.C1b.blockedMisResolutions.textmove}건`,
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
  const laneSections = [
    ['pipeline', 'pipeline 레인 (게이트 기준)'],
    ['stale', 'stale 레인 (최악 경로)'],
    ['live', 'live 레인 (세션 안 Decoration)'],
  ]
  laneSections.forEach(([lane, title], laneIndex) => {
    out.push(`### 2.${laneIndex + 1} ${title}`)
    out.push('')
    result.fixtures.forEach((fixture, fixtureIndex) => {
      out.push(`#### 2.${laneIndex + 1}.${fixtureIndex + 1} fixture \`${fixture.id}\` — ${fixture.title}`)
      out.push('')
      out.push(laneMatrix(result, lane, fixture.id))
      out.push('')
    })
  })

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
  const policy = result.policy
  const reasonCount = (prefix) =>
    Object.entries(policy.orphanReasons)
      .filter(([reason]) => reason.startsWith(prefix))
      .reduce((total, [, count]) => total + count, 0)

  out.push('## 4. 해소 정책의 효과 (측정된 시나리오 범위 안에서 오해소 0을 만든 규칙)')
  out.push('')
  out.push(
    `**주장 범위**: 아래 "오해소 0"은 이 스위트가 실제로 돌린 시나리오 ${result.scenarios.length}종 ` +
      `(${result.scenarios.map((scenario) => scenario.id).join(', ')}) × 레인 3종 × ` +
      `${result.totals.pipeline.trials}시행 **안에서만** 참이다. 측정하지 않은 편집 모양에 대한 무한정 주장이 아니다 ` +
      '— 실제로 Phase 1의 "오해소 0"도 S1–S8 밖에서 두 종류가 재현되어(vnv 판정 note 3·4) ' +
      'S9·S10으로 스위트에 편입됐다. 같은 방식으로 스위트 밖 편집은 여전히 미측정이다 ' +
      '(아래 "측정하지 않은 것" 절에 무엇이 빠져 있는지 열거한다).',
  )
  out.push('')
  out.push(
    table(
      ['규칙', '발동', '없었다면 (반사실)'],
      [
        [
          'A. 구조적 affix guard — 해소 텍스트가 exact의 앞·뒤 조각으로 설명되고(head+tail ≥ min 길이), ' +
            '캡처 때부터 있던 문자가 하나라도 남아야 채택',
          `거절 ${policy.guardRejections}건 (Phase 1 guard였다면 통과했을 시행)`,
          '해당 시행이 전부 무관한 텍스트에 부착 = 오해소',
        ],
        [
          'B. 삭제 증거 — collapsed(문자 삭제 증언) / 자리는 살아 있는데 내용이 바뀜(제자리 교체)이면 복구를 돌리지 않는다',
          `orphan 확정 ${reasonCount('collapsed') + reasonCount('content-replaced')}건 ` +
            `(collapsed ${reasonCount('collapsed')}, 제자리 교체 ${reasonCount('content-replaced')})`,
          '같은 문자열의 다른 출현으로 복구가 흘러가 오해소',
        ],
        [
          'C. 블록 item 정체성 — 블록이 통째로 사라졌을 때, 저장된 **item id가 지금도 살아 있는 블록**일 ' +
            '때만 복구 (텍스트 동일성은 보조 검증)',
          `복구 ${policy.movedBlockRecoveries}건 · 거절 ${reasonCount('block-gone')}건`,
          '"같은 텍스트 블록이 새로 생겼다"로 복구하게 되어, 재타이핑·쌍둥이 이동·원격 작성이 전부 부착 (D3·S11)',
        ],
      ],
    ),
  )
  out.push('')
  out.push(
    table(
      ['대조 정책', '뜻', '이 스위트에서 냈을 오해소', '이 스위트에서 살렸을 복구'],
      [
        [
          'textmove',
          '블록 **텍스트** 동일성으로 이동을 추정하는 복구 (C1 규칙 + 원격 client 보정)',
          `${policy.blockedMisResolutions.textmove}건`,
          `${policy.forgoneRecoveries.textmove}건`,
        ],
        [
          'phase1',
          'Phase 1에서 실제로 돌던 규칙 (겹침 1자 guard + 문서 전역 quote 복구)',
          `${policy.blockedMisResolutions.phase1}건`,
          `${policy.forgoneRecoveries.phase1}건`,
        ],
        [
          'naive',
          'phase1에서 tombstone 규칙까지 뺀 것',
          `${policy.blockedMisResolutions.naive}건`,
          `${policy.forgoneRecoveries.naive}건`,
        ],
        [
          'strict (현행)',
          '위 A·B·C',
          `${result.totals.pipeline.wrong + result.totals.stale.wrong + result.totals.live.wrong}건 (전 레인 실측)`,
          '기준',
        ],
      ],
    ),
  )
  out.push('')
  out.push(
    '오른쪽 열이 **안전을 택한 대가**다. strict가 orphan으로 접은 자리 중 그 정책이었다면 기대 텍스트로 ' +
      '살아났을 시행 수이며, 0이 아니면 복구율을 실제로 잃고 있다는 뜻이다 (허용되는 손실이지만 숨기지 않는다). ' +
      'textmove의 두 숫자는 같은 규칙의 양면이다 — 이동을 텍스트로 추정하면 그만큼 살리고 그만큼 오부착한다.',
  )
  out.push('')
  if (policy.forgoneTrials.length > 0) {
    const grouped = new Map()
    for (const row of policy.forgoneTrials) {
      const key = [row.scenario, row.anchorId, row.policy].join('|')
      const entry = grouped.get(key)
      if (entry) entry.lanes.push(row.lane)
      else grouped.set(key, { ...row, lanes: [row.lane] })
    }
    out.push('포기한 복구 — 더 약한 정책이었다면 **살렸을** 자리 (반사실 계측):')
    out.push('')
    out.push(
      table(
        ['시나리오', '앵커', '대조 정책', '레인', '경로', '살렸을 텍스트', 'strict의 orphan 사유'],
        [...grouped.values()].map((row) => [
          row.scenario,
          row.anchorId,
          row.policy,
          row.lanes.join('+'),
          row.via,
          `\`${row.wouldRecover}\``,
          `\`${row.strictReason}\``,
        ]),
      ),
    )
    out.push('')
  }
  if (policy.blockedTrials.length > 0) {
    const grouped = new Map()
    for (const row of policy.blockedTrials) {
      const key = [row.scenario, row.anchorId, row.policy].join('|')
      const entry = grouped.get(key)
      if (entry) entry.lanes.push(row.lane)
      else grouped.set(key, { ...row, lanes: [row.lane] })
    }
    out.push('막힌 자리 — 더 약한 정책이었다면 **어디에** 붙었을지 (반사실 계측, 레인별로 셈):')
    out.push('')
    out.push(
      table(
        ['시나리오', '앵커', '대조 정책', '레인', '경로', '붙었을 텍스트', '현행 결과'],
        [...grouped.values()].map((row) => [
          row.scenario,
          row.anchorId,
          row.policy,
          row.lanes.join('+'),
          row.via,
          `\`${row.wouldAttachTo}\``,
          row.strictOutcome,
        ]),
      ),
    )
    out.push('')
  } else {
    out.push(
      '**주의**: 반사실 계측에서 막힌 오해소가 0건이다 = 강화 규칙이 이 스위트에서 아무것도 막지 못했다(vacuous).',
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
    } else if (diagnostic.id === 'D3') {
      out.push(
        table(
          ['편집', '결과 문서(끝 44자)', 'Yjs 업데이트 sha256(앞 16)'],
          diagnostic.rows.map((row) => [
            row.label,
            `\`…${row.docText.slice(-44).replace(/\n/g, ' / ')}\``,
            `\`${row.updateSha256.slice(0, 16)}…\``,
          ]),
        ),
      )
      out.push('')
      out.push(
        diagnostic.moveIsDistinguishable
          ? '이동과 재타이핑의 CRDT 업데이트가 **다르다** — 텍스트 동일성으로 이동을 판별할 여지가 있다.'
          : '**이동과 재타이핑의 Yjs 업데이트가 byte 단위로 같다.** 블록을 잘라 붙이는 편집은 Yjs에서 ' +
              '"옛 element 삭제 + 새 element 삽입"이고, 같은 문장을 지웠다 다시 치는 편집도 정확히 같은 연산이다. ' +
              '결과 문서 텍스트도 같다(=' +
              `${diagnostic.sameDocumentText}). 따라서 **어떤 해소 규칙도 저장된 상태만으로 둘을 가를 수 없다** — ` +
              '"같은 텍스트 블록이 새로 생겼다"를 이동의 증거로 쓰면 재타이핑(S11c)·쌍둥이 이동(S11a·S11b)·' +
              '원격 작성(S11d)이 전부 같이 통과한다. 그래서 규칙 C는 **item 정체성이 살아 있을 때만** 복구하고, ' +
              '정체성이 파괴된 뒤에는 orphan으로 접는다. 그 대가는 §4의 "포기한 복구" 표에 숫자로 있다 ' +
              '(S6 블록 이동이 복구되지 않는다).',
      )
      out.push('')
    } else if (diagnostic.id === 'D4') {
      out.push(
        table(
          ['항목', '값'],
          [
            ['현재 저장 버전', String(diagnostic.currentVersion)],
            ['읽은 파일의 버전', String(diagnostic.loadedVersion)],
            ['로드된 레코드', `${diagnostic.recordsLoaded}건 (버려지지 않는다)`],
            ['출처 미상 표시', `${diagnostic.markedLegacy} (\`${diagnostic.legacyReason}\`)`],
            ['블록 문맥', diagnostic.blockContextDropped ? '비움 — 이동 복구 대상 아님' : '남아 있음'],
            ['편집', `\`${diagnostic.anchorQuote}\` -> \`${diagnostic.replacement}\` (제자리 교체)`],
            ['해소 결과', `${diagnostic.method}${diagnostic.attachedText ? ` -> \`${diagnostic.attachedText}\`` : ''}`],
            ['사유', `\`${diagnostic.reason}\` (guard 출처 판정 \`${diagnostic.guardProvenance}\`)`],
            ['알 수 없는 버전 거절', String(diagnostic.rejectsUnknownVersion)],
          ],
        ),
      )
      out.push('')
      out.push(
        diagnostic.orphaned
          ? '옛 파일은 **로드되지만 승격되지 않는다**: 출처 증거가 없으므로 문자열 구조만으로 통과시키지 않고 ' +
              'orphan 사유를 남긴다. 이 경로가 열려 있으면 강화된 guard가 옛 레코드에서만 조용히 무력화된다.'
          : '**옛 레코드가 문자열만으로 통과했다** — 하위호환 구멍이다.',
      )
      out.push('')
    } else if (diagnostic.pairs) {
      out.push(table(['항목', '값'], diagnostic.pairs))
      out.push('')
      out.push(diagnostic.note)
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

  /* ---- explicit scope of what was NOT measured ---- */
  out.push(`## ${section}. 측정하지 않은 것 (잔여 위험)`)
  out.push('')
  out.push(
    '"오해소 0"이 어디까지의 주장인지 못 박아 두는 절이다. 아래 항목은 이 스위트가 **한 번도 누르지 않은** ' +
      '경로이므로, 여기서 새 오해소가 나올 수 있다 (Phase 1의 S9·S10이 정확히 그렇게 발견됐다).',
  )
  out.push('')
  out.push(
    table(
      ['미측정 항목', '왜 위험한가'],
      [
        [
          `문서 규모 — fixture는 ${result.fixtures.map((fixture) => `${fixture.id} ${fixture.blocks}블록/${fixture.docChars}자`).join(', ')}, 앵커는 시나리오당 ${result.fixtures[0].anchors}개`,
          '대형 문서·수백 앵커에서의 후보 충돌률과 성능은 미측정',
        ],
        [
          '블록 종류 — fixture는 heading·paragraph만 쓴다',
          '표·중첩 리스트·코드블록 안의 앵커, 블록 타입 변경(paragraph -> heading)은 미측정',
        ],
        [
          '복합 편집 — "여러 블록 동시 삭제", 앵커 범위를 가로지르는 동시 편집, 블록 타입 변경 중의 앵커',
          '블록 정체성이 파괴되는 편집은 이제 **전부 orphan**이라 오부착 위험은 낮지만, 이 모양들의 복구율 손실은 미측정',
        ],
        [
          '문서 재임포트 **여러 앵커·여러 문서 세대** (D5는 앵커 1개짜리 단발 측정이다)',
          '한 앵커에 대해서는 D5가 orphan을 확인했지만, 재임포트를 반복하거나 일부만 재임포트하는 혼합 문서는 미측정',
        ],
        [
          '앵커가 블록 경계를 걸치는 경우 (blockContext 없음)',
          '캡처 기준점은 v2에서 따로 저장하므로 guard(문자 출처)는 그대로 작동하지만, 정체성 복구는 아예 시도하지 않는다(=orphan). 그 복구율 손실은 미측정',
        ],
        [
          '이동을 CRDT가 보존하는 편집기·연산 (예: Yjs의 move 연산, 블록 id를 갖는 스키마)',
          '규칙 C의 복구 경로는 item 정체성이 살아남을 때만 발동한다. 지금 스택(y-prosemirror)에서는 D3대로 정체성이 파괴되므로 **한 번도 발동하지 않았다** — 그 경로 자체가 미측정',
        ],
        [
          '경계 흡수 — 앵커 끝에 붙여 쓴 긴 삽입',
          `D1이 보였듯 RelativePosition은 끝 경계 삽입을 범위 안으로 흡수한다. 흡수량 상한이 없으므로 앵커가 크게 늘어날 수 있다(오부착은 아니나 범위 오염)`,
        ],
      ],
    ),
  )
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
