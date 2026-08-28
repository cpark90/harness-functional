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
        [
          'C2',
          '문서 정체성 바인딩 + 저장소 계약 무결성',
          yesNo(result.gates.C2.pass),
          `다른 문서 ${result.gates.C2.crossDocument.crossDocumentShapes}모양에 부착 ` +
            `${result.gates.C2.crossDocument.attachments}건 (같은 문서 대조군 해소=${result.gates.C2.crossDocument.controlResolved}), ` +
            `채워 넣은 캡처 증거 ${result.gates.C2.storeContract.forgedShapes}모양 중 부착 ` +
            `${result.gates.C2.storeContract.misResolutions}건 (승격 경로 존재=${result.gates.C2.storeContract.upgradePathExists}; ` +
            `로드 통과 ${result.gates.C2.storeContract.forgeriesPassingLoad}모양은 해소 시점 대응 검사가 ` +
            `${result.gates.C2.storeContract.forgeriesCaughtAtResolve}모양 차단), ` +
            `옛 파일 로드 시 정체성 입양=${result.gates.C2.legacyLoad.documentAdopted} · ` +
            `대조군 해소=${result.gates.C2.legacyLoad.controlResolved} · ` +
            `알 수 없는 버전 거절=${result.gates.C2.legacyLoad.rejectsUnknownVersion}`,
        ],
        [
          'C3',
          `흔한 편집 조작 ${result.gates.C3.minOperations}종의 orphan 예산 게시`,
          yesNo(result.gates.C3.pass),
          `조작 ${result.gates.C3.measuredOperations}종 · orphan ${result.gates.C3.orphanedLaneMeasurements}/` +
            `${result.gates.C3.laneMeasurements} 레인측정 · 오해소 ${result.gates.C3.wrongLaneMeasurements} · ` +
            `대조군(범위 안 삽입) 생존=${result.gates.C3.controlResolved} · 앵커 텍스트가 그대로인 시행 ` +
            `${result.gates.C3.placement.measured}건 중 제자리 밖 부착 ${result.gates.C3.placement.attachedOutsideQuote}건`,
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
          '0. 문서 정체성 바인딩 — 레코드의 문서 id와 지금 문서의 id가 **둘 다 있고 같을 때만** ' +
            'selector를 읽는다 (`src/document-id.mjs`)',
          `다른 문서 ${result.gates.C2.crossDocument.crossDocumentShapes}모양에 부착 ` +
            `${result.gates.C2.crossDocument.attachments}건 (D5)`,
          '같은 clientID로 만든 다른 문서·재임포트본·파생본에 레코드가 그대로 붙는다 (실측: vnv M5)',
        ],
        [
          'A. 구조적 affix guard — 해소 텍스트가 exact의 앞·뒤 조각으로 설명되고(head+tail ≥ min 길이), ' +
            '캡처 때 앵커에 들어 있던 **바로 그 문자**(문자 정체성)가 하나라도 남아야 채택',
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

  /* ---- orphan budget (조건 3) ---- */
  const budget = result.orphanBudget
  out.push('## 5. orphan 예산 — 흔한 편집 조작마다 앵커가 얼마나 끊기는가')
  out.push('')
  out.push(
    '정밀도(오해소 0)만 재는 게이트는 재현율을 얼마든지 깎을 수 있다. 그래서 **앵커 텍스트가 편집 후에도 ' +
      '문서에 그대로 남는** 조작들을 정식 시나리오로 넣고, 그 orphan율을 여기에 게시한다. ' +
      '목표는 orphan을 줄이는 것이 아니라 **보이게 하는 것**이므로 값 자체는 게이트가 아니다 ' +
      '(게이트는 "측정했는가 · 오해소 0인가 · 대조군은 살아남는가"만 본다).',
  )
  out.push('')
  out.push(
    table(
      ['조작', '시나리오', '시행', 'pipeline orphan', 'stale orphan', '앵커 텍스트 잔존', '더 약한 정책이었다면 살렸을 복구'],
      budget.operations.map((op) => [
        `\`${op.operation}\`${op.control ? ' (대조군)' : ''}`,
        `${op.id} ${op.title}`,
        String(op.trials),
        `${op.lanes.pipeline.orphaned}/${op.lanes.pipeline.measured} (${pct(op.lanes.pipeline.orphaned, op.lanes.pipeline.measured)})`,
        `${op.lanes.stale.orphaned}/${op.lanes.stale.measured} (${pct(op.lanes.stale.orphaned, op.lanes.stale.measured)})`,
        `${op.quoteStillInDocument}/${op.trials}`,
        `textmove ${op.forgoneRecoveries.textmove} · phase1 ${op.forgoneRecoveries.phase1} · naive ${op.forgoneRecoveries.naive}`,
      ]),
    ),
  )
  out.push('')
  out.push(
    `대조군을 뺀 ${budget.operations.filter((op) => !op.control).length}개 조작의 합계: ` +
      `orphan ${budget.orphanedLaneMeasurements}/${budget.laneMeasurements} 레인측정 ` +
      `(${pct(budget.orphanedLaneMeasurements, budget.laneMeasurements)}), 오해소 ${budget.wrongLaneMeasurements}. ` +
      `앵커 텍스트가 편집에 닿지 않고 문서에 그대로 남은 시행 ${result.placement.measured}건은 ` +
      `**전부 자기 자리에** 붙었다 (제자리 밖 부착 ${result.placement.attachedOutsideQuote}건) — ` +
      'orphan이 아닌 것들이 "아무 데나" 붙어서 생긴 값이 아니라는 뜻이다.',
  )
  out.push('')
  out.push(
    '두 레인의 값이 다른 것이 핵심 정보다: **편집 세션이 살아 있으면**(pipeline = 저장 시 재캡처) ' +
      '병합·분할은 끊기지 않고, **옛 레코드를 들이대는 경로**(stale = 오프라인 협업·다른 프로세스 편집)에서만 ' +
      '끊긴다. 이동과 undo는 두 레인 모두 끊긴다 — 블록 정체성이 파괴되는 편집이기 때문이다(D3). ' +
      '링크 종단점은 이 값을 "끊긴 종단점(broken endpoint)" 상태로 보게 된다 ' +
      '(`link-store/README.md`, `check_links.py`의 broken-endpoint 보고).',
  )
  out.push('')

  /* ---- diagnostics ---- */
  let section = 6
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
            [
              '문서 정체성 입양',
              `${diagnostic.documentAdopted} — 동거는 정체성의 증거가 아니다. 스토어의 documentId를 찍어 주지 ` +
                '않으므로 이 레코드는 어느 문서에서도 미상으로 남는다 (바인딩 가능=' +
                `${diagnostic.bindable})`,
            ],
            [
              'load -> save 승격 (세탁 경로)',
              `${diagnostic.promotedBySave} — 저장을 거쳐도 v${diagnostic.savedStoreVersion} 레코드가 미상 표시를 ` +
                `유지하고(${diagnostic.savedRecordMarkedLegacy}) 종단점 상태는 측정값 ` +
                `\`${diagnostic.savedAnchorState}\`이다`,
            ],
            ['출처 미상 표시', `${diagnostic.markedLegacy} (\`${diagnostic.legacyReason}\`)`],
            ['블록 문맥', diagnostic.blockContextDropped ? '비움 — 이동 복구 대상 아님' : '남아 있음'],
            ['편집', `\`${diagnostic.anchorQuote}\` -> \`${diagnostic.replacement}\` (제자리 교체)`],
            ['해소 결과', `${diagnostic.method}${diagnostic.attachedText ? ` -> \`${diagnostic.attachedText}\`` : ''}`],
            ['사유', `\`${diagnostic.reason}\` (guard 출처 판정 \`${diagnostic.guardProvenance}\`)`],
            [
              '대조군 (같은 문서·같은 세션, 정체성을 실은 레코드)',
              `${diagnostic.controlResolved} (\`${diagnostic.controlMethod}\`) — 위 orphan은 "전부 거절"의 산물이 아니다`,
            ],
            ['알 수 없는 버전 거절', String(diagnostic.rejectsUnknownVersion)],
          ],
        ),
      )
      out.push('')
      out.push(
        diagnostic.orphaned && !diagnostic.documentAdopted && !diagnostic.promotedBySave
          ? '옛 파일은 **로드되지만 승격되지 않는다**: 스토어 옆에 있다는 사실만으로 문서 정체성을 얻지 못하고 ' +
              '(입양 금지), 출처 증거가 없으므로 문자열 구조만으로도 통과하지 않는다. 이 경로가 열려 있으면 ' +
              '문서 A의 주석 파일을 문서 B 옆에 두는 것만으로 B의 레코드가 되고, 재저장 한 번에 v3 링크 ' +
              '종단점으로 승격된다 (실측된 세탁 경로: vnv B3 -> B7).'
          : '**옛 레코드가 남의 문서 정체성을 얻었거나 문자열만으로 통과했다** — 하위호환 구멍이다.',
      )
      out.push('')
    } else if (diagnostic.id === 'D5') {
      out.push(
        table(
          ['문서 모양', '레코드의 문서인가', '저장 item의 상태', '해소', '사유/부착 텍스트'],
          diagnostic.rows.map((row) => [
            row.shape,
            row.recordBelongsToThisDocument ? 'yes' : 'no',
            row.storedItemStateInThisDocument,
            row.method,
            row.attachedText ? `\`${row.attachedText}\`` : `\`${row.reason}\``,
          ]),
        ),
      )
      out.push('')
      out.push(
        `남의 문서 ${diagnostic.crossDocumentShapes}모양에 부착된 건수 **${diagnostic.crossDocumentAttachments}**, ` +
          `같은 문서(저장 상태에서 재로드) 대조군 해소 **${diagnostic.controlResolved}**. ${diagnostic.note}`,
      )
      out.push('')
    } else if (diagnostic.id === 'D6') {
      out.push(
        table(
          ['스토어 모양', '버전', '로드', '강등', '해소', '사유'],
          diagnostic.rows.map((row) => [
            row.shape,
            String(row.storeVersion),
            row.loadRejected ? '거절' : '읽음',
            row.loadRejected ? '-' : row.degraded ? `yes (\`${row.degradeReason}\`)` : 'no',
            row.method ?? '-',
            `\`${row.loadRejected ? row.rejection : (row.reason ?? '-')}\``,
          ]),
        ),
      )
      out.push('')
      out.push(
        `앵커 \`${diagnostic.anchorQuote}\`를 \`${diagnostic.replacement}\`로 제자리 교체한 문서에, ` +
          `증거를 채워 넣은 스토어 ${diagnostic.forgedShapes}모양을 들이댔다 — 부착 ${diagnostic.misResolutions}건, ` +
          `승격 경로 존재=${diagnostic.upgradePathExists}. 로드 시점 검사(길이·SV)를 통과한 모양은 ` +
          `${diagnostic.forgeriesPassingLoad}개이고 그중 ${diagnostic.forgeriesCaughtAtResolve}개를 해소 시점의 ` +
          `자리별 대응 검사가 잡는다 — **막는 층이 둘이라는 사실 자체를 수치로 남긴다**. ${diagnostic.note}`,
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
          '문서 정체성이 **없는** 문서 상태 (이 엔진 이전에 만들어진 Y.Doc)',
          '규칙 0이 "정체성 없는 문서에는 아무 레코드도 바인딩하지 않는다"로 흐르므로 오부착 위험은 없지만, ' +
            '그런 문서를 실제로 다루는 마이그레이션 경로(문서에 정체성을 부여하는 절차)는 미설계·미측정',
        ],
        [
          '문서 재임포트 **여러 앵커·여러 문서 세대** (D5는 앵커 1개를 네 모양에 들이대는 측정이다)',
          '한 앵커에 대해서는 D5가 부착 0을 확인했지만, 재임포트를 반복하거나 일부만 재임포트하는 혼합 문서는 미측정',
        ],
        [
          '악의적 위조 — **신뢰 경계 바깥** (레코드를 손으로 쓰는 주체. D6은 그 모양 ' +
            `${result.gates.C2.storeContract.forgedShapes}개를 실제 파일로 만든다)`,
          '자기보고 정합 검사(이름표 길이 합계·캡처 SV)만으로는 **부족하다**: 현재 범위의 이름표에 문서 ' +
            '다른 곳의 이름표를 padding 해 길이를 맞추면 둘 다 통과한다(실측 B4). 그래서 해소 시점에 이름표와 ' +
            '저장된 exact의 **자리별 대응**(내용·유일성·순서)에 더해 **문서 전역 순서**를 본다 — 자리별 ' +
            '대응까지 만족시키도록 padding 글자를 고른 위조(실측 H1)는 문서 순서에서 걸린다. ' +
            '**그래도 남는 것**: (a) 남의 문서의 **유효한** capture를 통째로 이식, (b) 사람이 옛 레코드에 ' +
            'documentId를 써 넣기, (c) **죽었거나 이 문서가 모르는** 이름표로 채운 padding(내용이 ' +
            'tombstone과 함께 사라져 반증할 사실이 없다), (d) 남의 documentId를 지정해 새 문서를 만들기 ' +
            '(문서를 만들 때 id를 정하는 것은 호출부의 권한이므로 문서 상태 자체를 위조하는 것과 같다). ' +
            '넷 다 전제가 같다 — 즉 **스토어 파일에 쓸 수 있는 ' +
            '주체는 그 문서의 주석을 임의로 주장할 수 있다. 이것은 방어 실패가 아니라 신뢰 경계다**. 그 위는 ' +
            '서명·무결성 태그의 영역으로 미구현이다. 경계 **안쪽**(일상 편집·복사·병합으로 도달하는 경로: ' +
            '문서 복제·스토어 중복·중복 레코드 id·anchors 삭제·해석 불가 레코드 모양·옛 파일 동거·스토어를 ' +
            '남의 문서 옆으로 옮기기·**문서 상태 없이 스토어만 옮기기**)은 게이트가 막고 매 실행 재측정하되, ' +
            '**"전부"라고 적지 않는다**: 안쪽 목록은 지금까지 실측으로 찾아낸 것이고, 라운드마다 새 항목이 ' +
            '추가돼 왔다(H3 -> H4 -> X1 -> X2 -> N1·N2·N6). 그래서 이제는 사례를 세는 대신 **성질**을 건다 — ' +
            '`게이트 accept <-> 편집기 accept`를 fixture 스토어 전수에 적용하고(`run-link-checks.mjs` C9), ' +
            '편집기 쪽은 **진짜 `loadStore`**로 잰다(계약 함수를 다시 부르면 게이트와 같은 입력을 먹여 두 층이 ' +
            '갈리는 축이 보이지 않는다 — 실측 vnv 6차). **다만 그 성질에도 범위가 있다**: 자동으로 포함되는 ' +
            '것은 **fixture 코퍼스에 넣은 스토어**이고(`fixtures/**` + 실사용 `sample-state`, 필터는 ' +
            '`annotations`·`version` 두 키), 코퍼스 **밖**의 스토어는 성질이 아니라 게이트의 **발견**이 맡는다. ' +
            '게이트가 원리적으로 볼 수 없는 축(평문과 CRDT 상태의 어긋남 · `yUpdateBase64` 내용이 열리지 ' +
            '않음 = 문서 상태를 손으로 쓰기)은 이제 **부류로 측정한다**: 그 모양들이 fixture로 코퍼스에 ' +
            '들어와 있어 매 실행 divergence로 세어지고(`EXPECTED_DIVERGENCE_CODES`, 3건 이상), **그 부류 ' +
            '밖의 divergence는 0**이어야 한다. 즉 자동으로 잡히는 것은 ' +
            '**코퍼스에 들어온 모양**이지 "모든 새 변종"이 아니다. ' +
            '발견에는 **전제**가 있고 그 전제는 판정 JSON에 드러난다(작업공간 루트 없음 = `workspaceRoot: ' +
            'null`이면 발견이 인자와 스토어 디렉토리로 한정된다 — 실측 C10) — README "발견의 전제" 절',
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
