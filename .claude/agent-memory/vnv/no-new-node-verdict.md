# "신설 0(no-new-node)" 결론의 판정 재현 절차

developer가 "요구된 부품이 **이미 있어서 아무것도 저작하지 않았다**"고 보고하는 유형.
증명축이 보통 검증과 반대다 — 게이트 PASS는 거의 자동(그래프 무변경)이므로, 판정은
① 진짜 무변경인가 ② 그 결론이 **anti-drift 준수인가 GAP 회피인가**에 전부 걸린다.
사례: `docs/verify/plane-ontology-verify.md` (지식 평면 분리 / `id:pat-knowledge-plane-separation`).

## 1. 무변경 + 선재(先在) 기계증명 3줄

```bash
git status --short ontology/ ; git diff --stat HEAD -- ontology/     # 둘 다 빈 출력 = 이번 dispatch 편집 0
git show HEAD:<ttl> | grep -c <node-id>                              # 1 = 이미 HEAD에 land
git log --oneline -S <node-id> -- <ttl>                              # 어느 커밋이 넣었나
```
**재dispatch 원인이 "커밋 메시지 미언급"인 경우가 실제로 있다** — `git log -1 --format=%B <sha>`로
본문에 그 노드가 빠졌는지 확인해 사실만 적는다(브리프가 같은 커밋의 *다른* 산출물은 알고 있다면
미언급→미착지 오인이 유력). developer 자기보고를 믿지 말고 이 3줄로 독립 확인.

## 2. GAP 회피 판별 = 소스 절 단위 coverage 표

브리프의 "이미 표현됨" 주장은 **소스 문서의 구조 요소를 직접 열거해** 노드 문면과 1:1 대조해야
한다(노드 정의문을 통째로 읽고 인용구를 붙인 표를 리포트에 싣는다). 판정 규칙:
- 매핑됨 = 노드 문면에 **중립화된 대응 문장**이 있으면 OK. 저장소별 표기(`id:`/`core:` IRI,
  `plan_upsert` 같은 도구 이름)를 **일부러 뺀 것은 결함이 아니라 neutral-parts 원칙 준수**다
  (예: "앵커=IRI" → "carries its own native stable identifier").
- 미매핑 = **소스 자신(inspection 판정문)이 도구 층으로 귀속시킨 항목**이면 accepted-reason,
  아니면 GAP. 소스에 그 귀속 문장이 있는지 grep으로 확인하고 리포트에 인용한다.
- 담을 어휘 범주가 없어 못 담은 것인지도 본다(있으면 TBox 확장 트리거 — 이번엔 DesignPattern
  하나로 충분해 트리거 없음).
- **신설했다면 오히려 중복이 됐을 것**임을 보이면 "신설 0"이 골든룰 2 준수로 확정된다:
  기존 형제 노드(`c-bounded-context` 등) 정의문과 축을 대조하고, 노드 정의문 안의 판별절
  ("Complements id:…, which bounds HOW MUCH … this fixes WHICH KIND")을 증거로 인용.

## 3. 발견성 퇴행 비교 = **node-removal overlay**(HEAD worktree 아님)

병행 lane 때문에 HEAD 비교는 오염된다. 대신 **현재 트리 복제 + 그 노드 블록만 삭제**해
"코드 동일·그래프만 상이"를 만든다(`ontology_lib.ROOT`가 `__file__` 기준이라 복제본의
`tools/retrieve.py`를 부르면 복제본 그래프를 읽는다).

```bash
cp -r ontology tools catalog-v001.xml $SB/noplane/      # 원본 무접촉
# patterns.ttl에서 대상 노드 블록만 제거 (다음 '#=====' 헤더 직전까지)
for q in ...; do 두 tools/retrieve.py --format json 실행 → nodes 라벨 리스트·budget_used 대조; done
```
- 질의 세트는 **determinism 게이트 4개 + 주제 인접 질의 10개**로 짠다(전부 same면 vacuous).
- 판정 기준: 차이가 "**노드 소실·엣지 끊김·budget 초과**"면 퇴행, "**신규 노드가 admit되며
  예산 재분배**"면 정상. 후자면 밀려난 개수를 세어 note로만 낸다.

## 4. 큰 노드의 예산 점유는 **정량**으로 note

`retrieve.py:179-182 token_cost` = `tokenEstimate` 있으면 그 값, **없으면 일괄 15**.
따라서 §1c 목표대역 상단(243/260)을 정직하게 선언한 노드는 기본 예산 900의 **27%**를 먹고,
실측 14질의 중 6질의에서 5–13개 노드를 밀어냈다. 어휘 표면이 넓은 노드("separation",
"context")는 **주제 아닌 질의에서도 rank 3으로 admit되어 정작 주제 노드를 앞지른다**(실측).
[지킴] 위반은 아니므로 pass-with-notes 항목.

동시에 선재 비대칭을 계량해 두면 note의 설득력이 산다(rdflib 1회 스캔):
- 텍스트 있는데 `tokenEstimate` 없는 abox 노드 **120개**(그중 실측 60 token 초과 61개) →
  전부 15로 청구. §1c [지킴] 범위 밖이라 린터가 못 잡는다.
- 선언값 vs `chars//4` 괴리 >2 token인 노드 **109개**(`as-execution-mode` 24 vs 164 등).
- 최근 관례는 **declared == chars//4 정확 일치**(대상 노드 243=973//4) — 이 값이 맞는지는
  린터가 검사하지 않으므로 vnv가 직접 재측정해야 한다.

## 함정
- DesignPattern은 §1c tokenEstimate **필수 범위 밖**(definition-only) — 있으면 정확도만 보고,
  없다고 결함 잡지 않는다. 반대로 있으면 예산을 실제로 청구하므로 §3의 비대칭이 생긴다.
- 인바운드 0(`ho:appliesPattern` 하는 harness 없음)은 결함 아님 — DesignPattern 14개 중 8개가
  미적용인 neutral-parts 재고 상태가 정상.
- reachability는 무향 BFS라 `ho:tagged` 한 줄이면 통과한다. "고아 아님"과 "쓰이고 있음"을
  구분해 적는다.
