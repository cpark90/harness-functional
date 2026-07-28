# Housekeeping 적용분 독립 검증 — deprecated-maturity 은퇴 + OPEN-ISSUES 재동기화

judge: vnv (opus dispatch). 대상: 2-커밋 대기 working-tree 변경분 (`tools/retrieve.py`,
`ontology/tbox/harness.ttl`) + 저위험 planning doc (`docs/plans/OPEN-ISSUES.md`).
방식: developer self-report 불신, 전 게이트 재현. 인터프리터 `/usr/bin/python3`.

## 판정: **PASS**

deprecated-maturity 기계가 전 축에서 0으로 은퇴됐고, retrieve 출력은 변경 전(HEAD) 대비
**byte-identical**(behavior-preserving refactor 확증). validate/determinism PASS.
OPEN-ISSUES land 해시 표본 3/3 일치, 미해결 표본 1건 실제 미해결.

---

## Gate 1 — deprecated-maturity 완전 은퇴 (PASS)

명령: `grep -rn "deprecated|DEPRECATED_RANK_FACTOR|lifecycle_factor" tools/ ontology/tbox/ ontology/shapes/`

- `tools/*.py`(webui/static 제외), `ontology/tbox/`, `ontology/shapes/`: **관련 0건** (grep exit 1 세 곳 모두).
- `git diff` 확인: `DEPRECATED_RANK_FACTOR` 상수·`lifecycle_factor()` 함수·markdown 배지
  (`⚠ DEPRECATED`)·호출부 2곳(`lexical_score` 곱셈, `traverse` factor dict)·docstring/주석 전부 제거.
  `harness.ttl:900` `ho:maturity` definition 열거에서 `deprecated` 제거
  (`draft | reviewed | stable | deprecated.` → `draft | reviewed | stable.`).
- shapes에 maturity `sh:in` enum 애초 부재 확인 → 스키마 변경 없었음(브리프 주장과 일치).
- **abox·recipes maturity "deprecated" 노드 0**: `grep -rn 'maturity[[:space:]]*"deprecated"'` →
  `ontology/abox/` 0건, `/home/cpark/git/harness-recipes/` 0건.

무관한(구분됨) 잔여 "deprecated" 2건 — **결함 아님**:
1. `ontology/abox/core/behavioral/guardrails.ttl:36` `ho:promptText` 내 "mark it **deprecated**
   with a reason and a replacement link" = 기록보존 거버넌스 정책 산문 (maturity 기계와 무관).
2. `tools/webui/static/assets/index-*.js` = 빌드된 minified 번들 문자열 (소스 아님).

## Gate 2 — retrieve byte-identity (핵심, PASS)

방법: `git worktree add --detach <scratch> HEAD`로 **변경 전** 상태(구 retrieve.py:
mechanism ref 7건 + 구 harness.ttl: 열거에 deprecated 포함) 격리. `PYTHONHASHSEED=0` 고정으로
코드 diff만 분리. 질의 4개 × `md`+`json` = 8팩을 HEAD-worktree(구) vs 현재로 독립 생성 후 `diff`.

| 질의 | md | json |
|---|---|---|
| compose a multi-agent research harness | IDENTICAL (14960B) | IDENTICAL (35253B) |
| guardrail for context budget and drift | IDENTICAL (15499B) | IDENTICAL (36239B) |
| retrieve context pack with deprecated retired part maturity lifecycle | IDENTICAL (15432B) | IDENTICAL (36924B) |
| coding agent with tools and review workflow | IDENTICAL (13952B) | IDENTICAL (36796B) |

8/8 byte-identical. 각 retrieve는 `ontology_lib.ROOT`(= `__file__` 기준)로 **자기 repo의 ontology**를
로드하므로, 이 비교는 retrieve.py 변경 **+** harness.ttl 변경을 **결합한 end-to-end** 비교다
(구 retrieve+구 ttl vs 신 retrieve+신 ttl). "deprecated/retired/maturity/lifecycle"를 일부러 실은
질의 3에서도 랭킹·순서·점수·산출 텍스트 전부 불변. developer 주장("현 노드 전부 non-deprecated →
factor 1.0 → output-neutral")을 독립 재현 확인. harness.ttl def 변경이 무영향인 이유: `ho:maturity`는
`owl:DatatypeProperty`로 INSTANCE_CLASSES 개체가 아니라 seed/pack 대상이 아님.

## Gate 3 — 구조 게이트 (PASS)

- `/usr/bin/python3 tools/validate.py` → **PASS**. SHACL · reachability(all 245) · capabilities ·
  assemblyOrder · **capacityFit**(5 agents fit) · **registryDrift**(28 in-scope registered) 모두 ✓.
- `/usr/bin/python3 tools/check_determinism.py` → **PASS** (4 질의 × md/json, 각 4-run 1-distinct).

## Gate 4 — retrieve 정합/스모크 (PASS)

- Gate 2에서 8팩 정상 산출(14–36KB, 오류 없음) = 스모크 통과.
- 제거 심볼 잔존 참조 0: `grep DEPRECATED_RANK_FACTOR|lifecycle_factor tools/*.py` → 0.
- `maturity_values()`는 존치·계속 사용(`maturity_of`, `_MATURITY_RANK` 타이브레이크) = orphan 아님.
- `import retrieve` 클린: `project` 존재, `lifecycle_factor` 부재, AST 파싱 OK → NameError/미참조 없음.

## Gate 5 — OPEN-ISSUES 재동기화 스팟체크 (PASS)

land 해시 → 커밋 subject 대조 (전부 일치):
- B16 `aaca77b` = "Apply B16 INSTANCE_CLASSES drift guard; verify and refresh" ✓
- B21 `b3e9e3d` = "import_corpus: extract run-behaviour 3 axes (B21)" ✓
- B22 `36084c3` = "revfactory delta F — cap-skill + first Contract instances (B22)…" ✓

미해결 표본 — 실제 미해결 확인:
- B4(dormant): mode-sub-agents/mode-persistent-team scope가 구조 술어로 승격됐는지 grep
  (`scope|constraint|appliesTo|conflict`) → **0건**. definition 산문에만 존재 = 문서 주장과 일치.
- 헤더 "245 individuals" = validate "all 245 individuals reachable" 실측과 일치.

---

### 재현 명령 요약
```
grep -rn "deprecated|DEPRECATED_RANK_FACTOR|lifecycle_factor" tools/ ontology/tbox/ ontology/shapes/
grep -rn 'maturity[[:space:]]*"deprecated"' ontology/abox/ /home/cpark/git/harness-recipes/
git worktree add --detach <scratch>/head-wt HEAD
for q in <4 queries>; do for f in md json; do
  PYTHONHASHSEED=0 /usr/bin/python3 <head>/tools/retrieve.py "$q" --format $f > head; \
  PYTHONHASHSEED=0 /usr/bin/python3 tools/retrieve.py "$q" --format $f > cur; diff head cur; done; done
/usr/bin/python3 tools/validate.py ; /usr/bin/python3 tools/check_determinism.py
git log --oneline -1 aaca77b b3e9e3d 36084c3
```

주의: retrieve `--format`는 `md|json`만 허용("markdown"은 argparse 거부→빈 오류출력). 최초 실행에서
"markdown"으로 준 런은 양측 동일 오류라 무의미했고, `md`로 재실행해 실팩 비교로 확정.
