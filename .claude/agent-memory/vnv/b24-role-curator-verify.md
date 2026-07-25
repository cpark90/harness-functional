# B24 role-curator archetype + axis-linking 검증 재현 절차

judged 2026-07-25. verdict = **PASS (both repos, 2 rounds)**. Round1: central PASS, recipe axis-linking
PHANTOM(미랜딩). Round2: recipe 절반 실제 저작됨→재검증 PASS. → docs/verify/b24-role-curator-final.md (FINAL)

## Round2 재검증 (recipe 36 엣지 이제 working tree에 존재)
- diff 대조: `git diff | grep '^+.*ho:specializes'` = 36 lines, 히스토그램 design16/synth11/research7/
  curator2, 25 파일. Round1 phantom(0/0/0/0)과 대비—이제 실재.
- 25 closure 전부 PASS+conforms=1(=SpecializesTypingShape 0위반; 엣지가 closure에 있으니 위반시 fail남).
  reach=중앙238+로컬. 루프가 심링크 dir名도 잡아 "central 238" 26번째 줄 나오는건 무해.
- **curator 엣지 resolve 확인법**(rdflib): `load_graph(reason=True)` 후 core:role-curator
  (=https://harness-ontology.dev/id/core/role-curator, ★core: prefix는 /id/core/ 이지 /id/ 아님)
  RDF.type에 ho:Role+ho:HarnessComponent 둘 다 True(Role⊑OrganizationComponent⊑HarnessComponent).
  subjects: 03 local role-curator + 14 role-terminology-manager 둘 다 ho:Role→Role→Role 동일partition.
- strip-test 재현: 03(이제 specializes 3개) materialize vs `grep -v ho:specializes` 사본 diff -r=IDENTICAL.
- commit ordering note: 2 curator 엣지(03/14)는 core:role-curator 의존→중앙 커밋이 recipe보다
  먼저/함께 랜딩해야 dangling 안됨. 나머지 34(research/design/synth)는 기존 중앙role 타깃이라 무관.

## 무엇을 검증했나
central 신규 `id:role-curator`(neutral worker archetype, roles.ttl "Neutral worker archetypes"
블록 role-tester 다음) + h-workspace-synthesis hasRole +1. 발주는 이에 더해 "recipe 36
specializes 엣지(research7/design16/synth11/curator2)" 도 developer 자평으로 딸려옴.

## ★핵심 함정: developer 자평 vs 실제 repo 불일치 (self-report 불신 원칙의 정확한 사례)
- 자평은 recipe repo에 research/design/synthesizer/curator 축 36 엣지 추가 주장.
- 실제: recipe repo working tree CLEAN, HEAD=유일 specializes commit(d4cfd82)에 82 엣지인데
  **전부 B17-family**(analyst29/author22/implementer11/strategist8/fp-refer-to-expert7/
  tester3/planner2). `core:role-research/design/synthesizer/curator` 타깃 = **0/0/0/0**.
- 재현: `grep -rho 'specializes core:[a-z-]*' recipes/ | sort|uniq -c` (타깃 히스토그램),
  `git show d4cfd82 | grep '^+.*specializes' | grep -o 'core:[a-z-]*'|sort|uniq -c`.
  4축 문자열 grep의 유일 히트는 `#` 주석(엣지 아님). flagship마저 03 local role-curator·
  14 terminology-manager 둘 다 specializes 엣지 자체가 없음(03 l.170 author 엣지는 copywriter 것).
- 교훈: 자평 "N edges added / N recipe closures PASS"는 반드시 타깃 히스토그램으로 대조.
  recipe working tree가 clean + HEAD가 central 변경보다 앞서면 그 recipe 작업은 미커밋/유실.

## central 게이트 (전부 PASS)
- `/usr/bin/python3 tools/validate.py` → 238(237+curator, 오직 +1). determinism PASS.
- retrieve "a role that curates and organises existing material" → Curator agent rel **4.05**
  최상위 Role, carrier hasRole 노출. (base cand=Workspace-synthesis 2.734)
- recipe closure 검증: 임시 `central`→중앙repo 심링크, `HARNESS_CATALOG=catalog-v001.xml
  HARNESS_ROOT_ONTOLOGY=https://harness-ontology.dev/recipes/<name> central/tools/validate.py`,
  끝나면 `rm -f central`. 03=261/14=259/96=265/21=258 전부 conforms(=SpecializesTypingShape 0 위반).
  role-curator는 central import로 **모든** recipe closure에 +1(자평 "8 recipe"는 과소).

## ★SpecializesTypingShape는 coarse (Role→Role 아님)
harness-shapes.ttl:118 = Harness-vs-HarnessComponent partition만 강제(주석 l.116-117 명시).
그래서 "Role→Role same partition"은 **convention**이지 shape 보장 아님(Role→Guardrail도 통과).
실제 committed 엣지는 관례상 same-class 준수. 판정문에 "shape가 아니라 convention"이라 명기.

## byte-identity (specializes 미emit)
`grep -c specializes tools/materialize.py`=0(materializer가 그 술어를 읽는 코드경로 없음).
strip-test 보강: recipe TTL에서 `grep -v ho:specializes`로 스트립 사본 materialize vs 원본
materialize `diff -r`=BYTE-IDENTICAL(ttl는 `git checkout`로 복원, 심링크 rm). materialize.py는
positional `<harness-id>` 필수(예 h-newsletter-engine) + `--out`. central 6 harness는
재materialize 불요—role-curator가 central서 오직 h-workspace-synthesis hasRole만 참조(source diff로 증명).

## anti-drift 판정
3축 재사용(research=role-research/design=role-design/synth=role-synthesizer 이미 neutral archetype)
+1 신규(curator)만 = 옳음. role-curator def가 research(GATHER new/ground)·author(write PROSE)·
analyst(DIAGNOSE what's wrong, severity)와 각각 판별절 명시 → near-synonym 아님. 6 sibling과
predicate 균일(roleTool=tool-editor, roleGuardrail×4=analyst와 동일셋). **NO tokenEstimate가
맞음**: §1c는 promptText-carrier+Tool/Workflow만; Role은 definition-carrier라 범위 밖(정정 불요).
role-tester만 salience 0.25(자체 예외).

## GAP 판정
h-workspace-synthesis skos:definition 산문이 "(analyst,author,implementer,planner,strategist,
tester)"만 열거·curator 누락. definition은 emit되므로 편집=+row 넘는 byte변경 → 미편집.
ACCEPTABLE 지연(예시적 괄호·구조 미사용·validate/retrieve/materialize 무영향)이나 graph→prose
reflection lag이므로 **follow-up 반영 권고**(조용히 방치 금지, coverage-audit 원칙).
