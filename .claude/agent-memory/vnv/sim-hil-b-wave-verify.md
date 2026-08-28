# sim-hil B 웨이브(B-T TBox + B-K1 ABox 부품군) 검증 재현 절차

리포트: `docs/verify/sim-hil-b-wave-verify.md`. 유형: "TBox 술어군 + 첫 사용처 + ABox 부품
웨이브"가 한 판정 대상으로 묶인 경우.

## 이 검증에서 배운 것 (재사용)

- **★네임스페이스 함정(실사)**: negative control 주입 시 `Namespace("https://w3id.org/...")`
  로 손저작하면 **주입이 전부 inert → 8/8 위양성 CONFORM**이 난다. 이 repo의 NS는
  `https://harness-ontology.dev/schema#`·`/id/core/`이며 반드시 **`lib.HO`/`lib.ID_CORE`를
  import해서 쓴다**. 증상 판별: FAIL 기대 케이스까지 전부 conforms=True면 먼저 주입 트리플이
  그래프에 실재하는지 의심하라 (똑같은 스크립트가 NS만 고치니 6/8 FAIL로 뒤집힘).
- **★웨이브 스코프가 커밋 경계에 걸친다**: B-T의 TBox·shapes는 이전 커밋(75242d3, 다른
  웨이브 AV W1에 동봉)에 이미 land, ABox 사용처+B-K1만 워킹트리. `git log -S "<신규 shape명>"
  -- ontology/`로 실제 land 커밋을 먼저 찾고, 중간점 개체수(332)는 관측 불가 — **최종상태
  delta(323→356)만 판정**하고 리포트에 형상 전제를 명시.
- **delta 재집계 표준형**: HEAD 핀 worktree + 양쪽 rdflib abox glob 로드 → URIRef subject
  symdiff(NEW/REMOVED) + "생존 subject의 HEAD 트리플 중 WT에 없는 것 0" = 순수 additive 증명.
- **attachesAt류 refinement 엣지(range Concept)의 이빨은 간접**: 전용 shape 없어도 OWL RL
  prp-rng가 object를 Concept로 타이핑 → ConceptConnectivityShape(prefLabel+orphan)가 잡는다.
  mistyped 기존 개체도 "아무도 그를 tag 안 하고 broader 없음"이라 orphan으로 FAIL — 단
  메시지가 원인을 안 가리킴(note감). dangling IRI는 prefLabel minCount까지 2중 FAIL.
- **닫힌 값 대조군 세트(재사용)**: bogus값 FAIL / 2번째 유효값(repeatable=CONFORM vs
  maxCount=FAIL로 설계 구분 증명) / **단일 유효값 CONFORM = vacuous-pass 대조군**(실사용 0인
  술어일 때 필수 — FAIL이 값 탓임을 증명).
- **FailurePolicy는 skos:definition 미emit**(materialize Error-handling 표 =
  failureCondition+recoveryStrategy만, :698). fp 판별절이 definition에만 있으면 "그래프
  텍스트에는 있음(retrieve pack엔 실림), 산출 문서엔 없음"으로 등급 — emit되는 condition끼리
  자체 변별되는지를 추가로 봐야 함. Guardrail=promptText(:469), Channel=definition+medium
  (:404-416), WF/WFS/Pattern/Role/Scenario=definition은 emit됨.
- **emit층 변별 판정을 쌍마다 층 확인으로**: "step ↔ guardrail" 같은 이종 쌍은 stepGuardedBy
  그래프 엣지가 관계를 명시하면 정의문 내 Distinguished-from 부재도 비-이슈(층이 다름).
- **재량 신설 workflow 판정법**: WorkflowStep의 유일한 비-고아 배선 = hasComponent∘hasStep
  롤업이므로 "신규 step N개 = host workflow 필요"는 구조 사실. 기존 workflow 편입은 그
  workflow의 stepOrder 제어흐름 주장을 거짓으로 만드는지로 판단.
- **기계적 dedup 스캔형**: 신규군 vs 전 그래프에서 ①교차-클래스 prefLabel 중복 ②altLabel↔
  prefLabel 충돌 ③정의+promptText+fp텍스트 token-Jaccard(≥0.30 컷). 파라메트릭 거울 형제
  (pre/post 등)는 J 0.4대가 정상 — 정의문에 거울 관계 명시돼 있으면 KEEP.
- **materialize 무회귀**: 비-carrier는 lock individualCount 1줄만 diff가 정상(구조적 필연),
  carrier는 `grep -c "^<"`=0(삭제 0)으로 순수 추가 증명. 병행 lane이 ontology 밖(tools/)만
  만지면 HEAD-대조가 이 웨이브에 온전히 귀속됨을 git status로 먼저 확인.
- **스코프 편차 판정(gr-safe-halt형)**: 하위 계획 문서(inspection 브리프 초안)가 이월을
  권고했는데 landed된 경우 — 이월 사유의 **전제가 이미 충족**됐고 채택 권한 문구("채택은
  orchestrator")가 있으면 편차-정당-기록(note)이지 결함 아님.

## B-K2(wave-S/C 축소분) 검증에서 추가로 배운 것 → docs/verify/sim-hil-bk2-verify.md

- **★중간점이 커밋에 없으면 역적용 overlay로 만든다**: 워킹트리에 두 웨이브가 겹쳐 있을 때
  이번 웨이브 격리는 rsync 복제 → 이번 웨이브 전용 파일은 `git apply --reverse`, 혼합 파일은
  블록 외과 제거(주석은 그래프 무관이라 남아도 됨, **비주석 id: 잔여 참조 0** grep이 완료 신호)
  → overlay validate가 브리프의 중간점 개체수를 정확히 재현하면 격리 성립. (developer 메모대로
  "편집 전 스냅샷"이 정도(正道)지만 vnv는 사후라 역적용이 표준.)
- **capability mint(최후수단) 판정 3요소**: ①전수 카탈로그 재구성으로 빈자리 실증 ②기각된
  soft-reuse가 requires↔provides 기계 매칭에서 **실제로 거짓 충족을 만들 수 있는지** 그래프로
  보임(cap-codeexec requires 3곳 → 시뮬 도구가 provides 주장 시 실행 요구를 거짓 충족)
  ③provided-only는 선례(cap-audit/benchmarking/safe-halt)로 합법 — reachable 경로는
  providesCapability 인바운드 + carrier usesTool.
- **tool↔자기 capability 정의 거울은 J 0.4~0.5가 정상**(전 그래프 유일 ≥0.30 쌍이어도 drift
  아님 — provider-capability 구조 쌍, capability 쪽 자체 판별절 확인만).
- **약어 slug 오탐 주의**: "ACI"/"SWE" 대문자 약어 grep은 repl**aci**ng·an**swe**r 부분열에
  걸림 — `grep -io ".\{20\}PAT.\{20\}"`로 문맥 출력해 실히트/부분열을 가른다. slug 자체가
  소스 약어면 emit값 중립 + 승인 계획 고정으로 N5형 cosmetic note.
- **appliesPattern 없는 신규 pattern**: "어떤 하네스도 그 pattern이 아님"이면 tagged만이 정답
  (단언=날조). 판정은 inbound [] 직접 조회 + validate 전역 reachability PASS 교차.
- **retrievalPolicy 등 신규 리터럴 축의 미렌더 확증법**: renderer grep 0 + **그 리터럴만 얹힌
  비-carrier 하네스의 CLAUDE.md byte-identical**이 반사실 짝.
- **tokenEstimate 산술 대조가 carrier diff의 강한 증거**: MANIFEST aggregate delta ==
  신규 노드 선언값 합(h-coding +353=171+182, h-ws +360=175+185)이면 초과 렌더·누락 렌더 없음.
- **recipe 진입 판정은 §3층 표를 열 단위로 닫는다**: bind 목록의 비-노드 항목(양면 oracle·
  pass^k 같은 이월된 TBox 축)이 함정 — 중앙 부재를 "recipe-local 처리 조건"으로 명시해
  다음 brief의 신설-드리프트를 선제 차단.

## B-R (recipe 3종: hil-approval / eval-user-sim / coding-swe) 판정 절 — docs/verify/sim-hil-br-recipes-verify.md

- **중앙 무수정 증명은 "소유자 분리 grep"으로**: 병행 lane(B1 facet)이 같은 워킹트리
  `ontology/`를 편집 중이라 diff-empty 증명이 불가 → `git diff HEAD -- ontology/` 전문에
  **이번 웨이브 식별자 전수 패턴**(로컬 slug + dct:source 도메인까지) grep=0 + validate
  개체수==직전 wave 최종 baseline(364)로 "이번 산출물이 중앙에 쓴 트리플 0"을 판정. staging/은
  gitignore(`git check-ignore -v`)라 land 경로=published clone(inspection) 확인도 한 줄.
- **recipe union lint는 "로드 트리플 수 > 중앙"으로 union 실로드 확인 필수**(9421>9178) —
  lint/validate/retrieve/materialize 전부 `HARNESS_CATALOG`+`HARNESS_ROOT_ONTOLOGY` env로 동작
  (ontology_lib:44-46), 카탈로그 미매핑이면 중앙만 조용히 PASS.
- **recipe-local 제약(승격 금지) 판정 3요소**: ①로컬 NS 소속(`/id/<recipe>/`) ②중앙 전수
  grep 0 ③금지 표기가 TTL 헤더 배너+README **양쪽** + "rebind, not re-author" 업그레이드 경로.
- **W1 선언 negative control은 recipe union 위에서**: in-memory 4케이스(무변형 CONTROL /
  hasEnvelope 제거→AutonomyShape / observable 제거→StatementShape / 닫힌값 밖 fidelity→sh:in)
  — tier의 `envelopeBinding`/`fallbackOwner` 값을 먼저 읽고 어느 constraint가 대상인지 지정
  (per-action tier는 fallbackOwner "user"라 safe-halt/receptive-user 절 비대상이 정답).
- **★"N1 해소" 류 주장은 층위 분리로 판정**: 그래프 선언(validate+negctl로 실증)과 **문서
  렌더**(materialize.py 술어 grep 0 + 산출 CLAUDE.md grep 0)는 별개 — envelope/tier/fidelity는
  렌더러 미지원이라 선언 층위만 해소, 문서 층위는 렌더 wave로 남김(비차단·중앙 tools 소관).
  onEnvelopeExit fp는 envelope에 걸려 있어 Error-handling 표(hasFailurePolicy 소스)에도 미출현.
- **재량 bind 사실 대조 = emit 텍스트 상호 참조**: 확대 bind 각각을 persona promptText·wf
  step·중앙 개체의 approvalScope 값과 짝지어 사실 확인(예: rejection-feedback↔"stated reason
  becomes the context of your next attempt"). 2-harness 대조군 구성의 "유일 비날조 경로"는
  대안 전수(단일 하네스 단언=날조/중앙 신설=무수정 위반/별도 recipe=통제변인 공동 단언 불가)로.
- **catalog 검증**: ElementTree parse + 블록별 엔트리 수기 카운트 + `gen_recipe_catalog.py
  --check`(exit 0=멱등) + `--print-matrix`에 신규 IRI — CI는 매트릭스를 생성기에서 파생하므로
  matrix 노출=--print-matrix 확인으로 닫힘.
- 함정: T4 값 사실성은 closed set 소속만이 아니라 **TBox 정의문 rung 서술과 실행 형상 대조**
  (mock=수제·no real system, replica=live non-prod copy). "production" 같은 전제 선언은 근거
  추론의 과일반화(드릴 반례)와 선언 자체 성립을 분리해 note 처리.
