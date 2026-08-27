# stale `ho:tokenEstimate` 재산정 — 실측 규약

§1c는 tokenEstimate의 **존재**만 [지킴]으로 요구하고 **산식은 규정하지 않는다**. 그래서 정의문을
길게 고친 뒤 값을 안 고쳐도 `validate.py`/`lint_uniformity.py`는 통과한다(둘 다 존재/범위 축만
본다) — stale은 **검증이 안 잡는 결함**이므로 정의문 편집 시 직접 재산정해야 한다.

## 측정 방법 (rdflib로, 눈대중 금지)

pack에 실리는 그 노드 자신의 텍스트 길이를 재고 **chars/4**로 근사한다. 텍스트 없는 노드
(promptText·definition 없음)의 선언값은 손대지 않는다 — 근거 없는 재산정이 된다.

```
/usr/bin/python3 -c "
from rdflib import Graph, Namespace; from rdflib.namespace import SKOS
g=Graph(); g.parse('<file>.ttl',format='turtle'); HO=Namespace('https://harness-ontology.dev/schema#')
for s in sorted(set(g.subjects(None,HO.Workflow))):
    d=str(g.value(s,SKOS.definition) or ''); l=str(g.value(s,SKOS.prefLabel) or '')
    print(s.split('/')[-1], g.value(s,HO.tokenEstimate), len(d), round(len(d)/4), round((len(d)+len(l))/4))"
```

## 관찰 (재산정 전에 이웃부터 재보기)

같은 파일 안에서도 **관례가 균일하지 않다**: `wf-verify-harness` 128은 (def+label)/4와 정확히
일치하는데 `wf-harness-evolution` 130은 어느 산식과도 안 맞는다(≈146). ⇒ 단일 산식을 사후에
강요해 이웃을 일괄 수정하지 말 것(브리프 범위 밖 + 근거 없는 변경). **배정된 노드만** 재산정하고,
어떤 산식으로 얼마를 쟀는지 반환값에 남긴다.

## annotation 크기 대역 = 130–260 token (사용자 결정)

한 노드의 annotation 산문(promptText+definition 문자수합 //4, tokenEstimate와 같은 chars/4)은
**130–260 token** 대역 안에 있어야 한다(권장 착지 ~230–255). **선언값이 아니라 실측**이 기준이다 —
`mode-standing-service`는 선언 270인데 실측 282라 초과 판정이 났다. 대역 위반을 찾을 땐 항상
rdflib로 재측정한다(`lint_uniformity.py §1c`는 존재/형식만 보고 대역은 안 본다).

## 초과 노드 압축법 (삭제 아닌 밀도 개선)

의미 손실 없이 줄이는 자리는 거의 항상 **같은 명제가 두 번 나오는 곳**이다. 순서:
1. 서두 정의절과 뒤쪽 Contrast절의 **중복 명제** — 하나만 남긴다. 예: "torn down with it"은 서두
   ("stood up for a run and torn down with it")와 mode-agent-teams 대비절에 두 번 있었다 →
   대비절 쪽에만 남김(그쪽이 그 명제를 필요로 하는 절). "serves a stream of requests"도 서두
   "serving requests as they arrive"와 중복 → 서두만.
2. 군더더기 어구: `only once that item is marked` → `only once it is`, `at the end of it` → `at the
   end`, `and must carry` → `and carry`, `and a harness declares that by` → `which a harness
   declares by`.
3. **줄이면 안 되는 것**: 형제 노드와 공유하는 관용구(`briefed completely up front`은
   mode-sub-agents 정의문과 같은 표현 — 검색·대비 축이므로 "completely" 유지), 대문자 강조
   (OPEN BEYOND/ONE/PHASE), `id:` 교차참조, 선택 기준(Choose when/instead) 절 구조.

## 사례

- `id:wf-compose-harness` 57 → **115** (정의문 460자 /4; HEAD부터 stale이었고 정의문 정밀화로
  격차가 벌어짐). 위상 영향 0 — 리터럴 1개. 부수효과 확인은 `retrieve.py --format json`의
  `budget_used`(900 예산에서 898, 갱신 전과 동일 대역 → 팩 절단 없음)로 본다.
- `id:mode-standing-service` 1130자/**282** → 1011자/**252** (declared 270 → 252). 6개 명제
  (열린 세션·durable channel 소비·Choose when·sub-agents 대비·agent-teams 대비·hybrid 구분)
  전부 보존, 중복 2건 제거. validate/lint PASS, retrieve budget_used 897/900.

## 재-dispatch: 브리프 수치는 HEAD, 기준은 working tree

압축 브리프는 감사 시점(대개 **HEAD**) 실측을 인용하므로, 같은 노드가 이전 dispatch에서 이미
압축돼 **커밋 안 된 채 워킹트리에 있으면** 브리프의 "초과" 진술이 stale이다. 순서: ① 편집 전
워킹트리 값을 rdflib로 재측정 ② `git diff HEAD -- <file>`로 이미 반영됐는지 확인 ③ 대역 안이면
**두 번 압축하지 말고**(2차 압축은 명제 손실 위험) 검증만 하고 완료 보고. 대역 전수 확인은
ABox 전체 glob 1회 스캔(`>260` 개수)으로 끝낸다 — 다른 노드는 배정 밖이라 보고만 한다.
