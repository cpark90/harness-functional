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

## 사례

`id:wf-compose-harness` 57 → **115** (정의문 460자 /4; HEAD부터 stale이었고 정의문 정밀화로
격차가 벌어짐). 위상 영향 0 — 리터럴 1개. 부수효과 확인은 `retrieve.py --format json`의
`budget_used`(900 예산에서 898, 갱신 전과 동일 대역 → 팩 절단 없음)로 본다.
