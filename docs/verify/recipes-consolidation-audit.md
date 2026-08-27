# recipes 저장소 전수 감사 — cross-recipe 중복 통합 + format 일관성

**감사자**: vnv (dispatch). **모드**: findings only — 편집·삭제·커밋 없음.
**대상**: `/home/cpark/git/harness-recipes/recipes/` — **53 recipe** (on-disk working tree).
**날짜**: 2026-07-28. **인터프리터**: `/usr/bin/python3` (rdflib 7.6.0).

## TL;DR (결론)

- **축① (내용 통합)**: **진짜 통합 후보 0건.** 53 recipe의 실질 텍스트 필드
  (`ho:promptText`, `skos:definition`)에서 byte/근사-동일 재저작이 **하나도** 없다
  (exact-normalized 0, Jaccard≥0.85 0, ≥0.60 0 — SystemPrompt/Instruction/Role/Concept/Task).
  neutral-parts 통합 규율이 **작동 중**: 유일한 공유 패턴(refer-to-expert 3종)조차 이미
  중앙 archetype `core:fp-refer-to-expert`로 `ho:specializes` 라우팅됨. Guardrail은
  recipe-local이 **0개**(전부 중앙 IRI 참조 = 완전 통합).
- **축② (format 일관성)**: **[지킴] 위반 0건.** prefix(§2)/language(§1d)/tokenEstimate(§1c)
  teeth 3축 전부 53/53 clean. 배너·메타(source/license/maturity)는 provenance 계열별로
  내부 일관. **결정 필요 항목 1건(cosmetic·non-blocking)**: scenario prefLabel 대소문자 drift.
- **검증 grounding**: 대표 4 closure(techdoc/88/21/100) 전부 central `validate.py` **PASS**.

⇒ **"recipes 이미 대체로 정합"** — 통합/정규화 강제 대상 없음. 결정 대기 1건(선택).

---

## 재현 절차 (실행한 명령)

```bash
# 로컬 노드 추출(각 recipe TTL standalone parse, id:<recipe>/ 주체만)
/usr/bin/python3 scratchpad/extract.py     # → 1186 local individuals, type 히스토그램
# 클러스터링(클래스별 word-set Jaccard union-find)
/usr/bin/python3 scratchpad/cluster.py     # J>=0.85
/usr/bin/python3 scratchpad/exact.py       # exact-normalized full-text dup
/usr/bin/python3 scratchpad/near.py        # cross-recipe J>=0.60
/usr/bin/python3 scratchpad/central.py     # recipe-local vs central core 텍스트 대조
# teeth 3축 직접 재구현(정확한 PREFIX_MAP + Hangul regex + §1c scope)
/usr/bin/python3 scratchpad/lint.py        # prefix/language/tokenEstimate
# closure validate (임시 ./central 심링크 → 검증 → rm)
ln -s /home/cpark/git/harness_ontology central
HARNESS_CATALOG=catalog-v001.xml HARNESS_ROOT_ONTOLOGY=https://harness-ontology.dev/recipes/<r> \
  /usr/bin/python3 central/tools/validate.py
rm central
```
(스크립트 원본은 세션 scratchpad. PREFIX_MAP은 central `tools/lint_uniformity.py:106-118`,
Hangul regex는 `:126`을 그대로 복제 — 린터와 동일 판정을 recipe-standalone으로 낸 것.)

recipe-local 노드 클래스 히스토그램 (총 1186):
SystemPrompt 287 · Role 234 · Concept 175 · Instruction 162 · TestScenario 120 ·
FailurePolicy 54 · Harness 53 · Task 45 · Domain 43 · Contract 5 · Tool 3 · Capability 3 · Candidate 2.
(**Guardrail·Channel·Workflow·ModelConfig·Pattern local 0** — 전부 중앙 IRI 참조 = 이미 통합됨.)

---

## 축① — cross-recipe 중복 통합 후보

### 클러스터 표

| 클래스 | 사실상-동일(실질텍스트) 클러스터 | 판정 | 근거 |
|---|---|---|---|
| SystemPrompt (persona) | **0** (J≥0.60 cross-recipe pair = 0) | 통합 불요 | 287 persona 전부 도메인 특화. exact/근사 재저작 없음 |
| Instruction (skill) | **0** (J≥0.60 = 0) | 통합 불요 | 162 노드 전부 도메인 특화 |
| Role | **0** (J≥0.60 = 0) | 통합 불요 | 234 노드; 공유 추상은 이미 `ho:specializes core:role-*`로 링크됨(B17) |
| Concept | **0** | 통합 불요 | 175 노드; 도메인 vocab, `skos:broader core:c-*`로 앵커됨 |
| Task/Domain | **0** | 통합 불요 | 도메인 특화 |
| FailurePolicy | 근사 3종(refer-to-expert) J=0.60~0.70 | **(b)+(c) KEEP** | 아래 상세 — 이미 중앙 커버 |
| TestScenario | prefLabel-skeleton 6군집(scn-error 37개 등) | **(c) 정당 instance-local** | 아래 상세 — 본문은 도메인 특화 |
| Tool/Capability | **0** | 통합 불요 | local 6개 전부 handmade 2 recipe(lpranging·contract-demo)에만, 중복 없음 |

**recipe-local vs 중앙 core 텍스트 대조**(축①-b, 재저작-of-central 탐지): J≥0.75 hit **0건**
(중앙 246 core 노드 텍스트 대비). 즉 어떤 recipe도 중앙에 이미 있는 내용을 재저작하지 않았다.

### 상세 판정

**FailurePolicy refer-to-expert 3종 (유일한 실질 near-cluster)**
- `id:fp-legal-judgment-needed`(87-crisis-communication), `id:fp-legal-review-needed`
  (95-procurement-docs), `id:fp-tax-legal-judgment`(96-real-estate-analyst).
- 셋 다 `ho:specializes core:fp-refer-to-expert` — **공유 추상은 이미 중앙에 통합돼 있고**
  각 recipe는 도메인 조건으로 specialize만 함. `ho:failureCondition`/`ho:recoveryStrategy`는
  도메인별로 실제 다름(위기-대응 legal disclosure / 조달 contract clause / 부동산 tax·zoning).
  J=0.70 겹침은 "refer-to-expert" 독트린 자체(중앙 노드가 이미 소유)에서 옴.
- **판정 = (b) 이미 중앙 커버 + (c) 정당 instance-local. KEEP.** 오히려 통합 규율이 작동한
  증거(공유 패턴을 archetype으로 라우팅). 통합 불요.

**TestScenario prefLabel-skeleton 군집**
- scn-error(37 recipe)·scn-normal(31)·scn-existing-file(14) 등이 **prefLabel만** 공유
  ("Error Flow scenario" 등 importer 상수 라벨). 본문(`ho:scenarioPrompt`/`ho:scenarioExpected`)은
  전부 도메인 특화(예: podcast "write a podcast script quickly" vs legal "legal issues, can't
  share detail"). materialize용 self-contained 도메인 fixture.
- **판정 = (c) 정당 instance-local. KEEP.** (단 라벨 대소문자는 축②의 cosmetic 항목 참조.)

### 규모 산출
통합 시 줄어드는 recipe/노드 = **0**. 중앙에 올릴 것 = **없음.**
recipes는 neutral-parts 원칙대로 이미 정합(공유 추상은 중앙, 도메인 특화는 recipe-local).

---

## 축② — format 일관성

### teeth 3축 (기계적, [지킴] 기준) — 전부 clean

| 축 | 근거(§) | 위반 |
|---|---|---|
| 명명 prefix | ONTOLOGYSTYLE §2 table (PREFIX_MAP 정확복제) | **0 / 53** |
| language(Hangul in searchable) | §1d | **0 / 53** |
| tokenEstimate scope(promptText-bodied + Tool/Workflow) | §1c | **0 / 53** |

→ 직전 recipes-quality-probe가 잡은 `contract-*` prefix drift는 **수정 확인됨**(현재 전부 `ct-`,
Contract 5노드 conform). 잔여 prefix drift 없음.

### 구조/메타 일관성

- **배너**: 53/53 recipe가 `####` 헤더 블록으로 시작 (importer·handmade 공통). 구조 균일.
- **metadata (provenance 계열별 내부 일관)**:
  - importer recipe **50개**: `dct:source`(harness-100 upstream URL) + `dct:license "Apache-2.0"`
    **둘 다** — 균일.
  - handmade **3개**(contract-demo·lpranging·techdoc): source·license **둘 다 없음** — first-party
    original(귀속할 upstream 없음), 3개끼리 일관. **결함 아님.**
- **maturity**: draft 898 · reviewed 17 · stable 5. reviewed/stable은 handmade에만
  (lpranging 16, contract-demo 6); importer recipe는 전부 draft — lifecycle상 정합
  (importer 산출=draft, 큐레이션된 handmade만 승격). 계열별 일관.

### 결정 필요 (cosmetic · non-blocking) — **1건**

**scenario prefLabel 대소문자 drift**: 34 recipe는 Title-case("Error **F**low scenario",
"Normal Flow scenario", "Existing File Flow scenario"), **5 recipe는 sentence-case**
("Error **f**low scenario" 등):
- `81-technical-writer`, `82-report-generator`, `87-crisis-communication`,
  `88-risk-register`, `90-hiring-pipeline` (Wave G1/G2 import분).
- **[지킴] 위반 아님**: §1d는 English만 요구(충족), 대소문자는 명문 style rule 없음.
  → 정규화하려면 이 5 recipe의 scenario `skos:prefLabel`을 Title-case로 통일(리터럴 수정,
  위상 무영향, tokenEstimate 범위 밖). **선택 사항 — 강제 아님.**

그 외 format 이탈 없음.

---

## 검증 grounding (verification)

대표 4 closure를 central `validate.py`로 실측 — 전부 **PASS**:
`techdoc`(handmade) · `88-risk-register`(신규 importer, sentence-case) · `21-code-reviewer`(pilot) ·
`100-ip-portfolio`(Wave G2). (임시 `./central` 심링크 → 검증 → `rm`, `.gitignore`가
`/central/` 무시.)

## 명백·기계적 vs 판단 필요 분리

- **명백·기계적 (측정으로 확정, 결정 불요)**: 축① 통합 후보 0건 · teeth 3축 0위반 ·
  배너 53/53 · metadata provenance-일관 · validate PASS. 아무 조치 불요.
- **판단 필요 (사용자 승인 대기)**: scenario prefLabel 대소문자 정규화 5 recipe — **선택**,
  cosmetic, [지킴] 밖. 하면 통일성↑, 안 해도 규약 위반 아님.

## 주의(오탐 방지 메모)

- 작업 tree에 미커밋 wave import 다수(20/23/24/25/27/36/38 등 untracked) + 수정
  (catalog-v001.xml, contract-demo/lpranging.ttl). 감사는 **on-disk 53 recipe** 기준.
  커밋은 inspection 소관 — 본 감사 범위 밖.
- Jaccard word-set은 근사동의어(near-dup) 탐지용; byte-identity는 exact-normalized 패스로
  별도 확인(둘 다 0). persona가 "비슷해 보이는" 건 importer template skeleton 공유일 뿐
  실질 텍스트 J<0.60 → 통합 후보 아님(neutral-parts 대전제).
