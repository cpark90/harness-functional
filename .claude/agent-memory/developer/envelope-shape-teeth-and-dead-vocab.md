# 셰이프 이빨 스모크 · 대칭 롤업 · 죽은 어휘 축소 (AV W1 envelope/autonomy 실측)

registry 3점 등록은 `new-class-three-point-registry.md`가 원본. 이 노트는 **선언형 어휘를
"이빨 있는" 상태로 land시키는 방법**과 그때 같이 오는 결정 2건.

## 이빨 4종 스모크 = control 1 + negative 4 (디스크 무오염)

```python
base = lib.load_graph(); shapes = Graph().parse("ontology/shapes/harness-shapes.ttl")
data = base + synthetic          # 합성 트리플만 Graph()에 담아 합집합
conforms, _, txt = pyshacl.validate(data, shacl_graph=shapes, advanced=True, inference="none")
msgs = [l for l in txt.splitlines() if l.strip().startswith("Message:")]   # 키워드로 필터
```
- **control(무주입)이 conforms=True**여야 한다 — 이걸 같이 찍지 않으면 "이빨"만 보이고
  "오탐 없음"은 증명되지 않는다.
- 주입 노드는 orphan/prefLabel 같은 **부산물 위반**을 반드시 만든다. 그래서 결과 텍스트에서
  검사 대상 메시지 키워드만 뽑아 본다(전체 conforms=False는 판정 근거가 못 된다).
- 실측 4케이스: 필수 슬롯 누락(observable) / 조건부 요구 미충족(bounded tier인데 envelope
  없음) / 함의 미충족(fallback owner=harness인데 해당 capability 미제공, receptive-user인데
  user 채널 없음) / 닫힌 값 밖 문자열. 각각 정확히 1건씩 걸린다.
- 함의 셰이프는 `sh:targetSubjectsOf <술어>` + `sh:sparql`. 쿼리가 `id:` 개체를 직접 가리키면
  shapes 문서 `sh:declare`에 **`ho`와 `id` 둘 다** 선언돼 있어야 한다. 셰이프는 reasoned
  그래프에 돌므로 쿼리의 `ho:hasComponent`가 하위 술어·체인 롤업까지 자동 포함한다 —
  "바인딩된 컴포넌트 중 하나가 provide" 같은 조건을 그대로 쓸 수 있다.

## 컨테이너에 행 종류가 둘이면 롤업 체인도 둘 (비대칭 금지)

`OperatingEnvelope`처럼 statement/rule 두 종류 행을 담는 노드는 `hasComponent` propertyChain을
**두 개 다** 건다(`hasComponent o hasEnvelopeStatement`, `... o hasEnvelopeRule`). 하나만 걸면
한쪽만 HarnessComponent로 추론되는 타입·도달성 비대칭이 남는다(orphan은 아니라 게이트가 조용).
컨테이너 자신은 `hasEnvelope ⊑ hasComponent`(주어가 Harness이므로 직접 sub)로 도달시키고,
행 술어는 절대 직접 sub로 만들지 않는다(주어 mistype).

## 근사 동의어가 생기면 — 제거보다 **domain 축소**

새 어휘가 기존 술어의 용도 일부를 흡수하면(예: 하네스 범위 선언이 `ho:triggerPhrase`/
`ho:outOfScope`의 자유텍스트를 대체) **남은 용도가 유효한지**로 판단한다.
- 남은 용도 있음 → `rdfs:domain`을 그 용도의 클래스로 좁히고(Harness 제거 → Instruction 전용),
  두 definition에 "이 용도에는 쓰지 않는다(무엇이 전담한다)" **1줄**을 넣는다. 위쪽 주석
  블록에 근거(golden rule 2: 근사 동의어 2쌍 공존 금지)를 함께 남긴다.
- 남은 용도 0 → 완전 제거(B9 선례, 추적성은 git).
ABox·도구·shapes 사용처 0건임을 **전수 grep으로 먼저 확인**하고 결정한다.

## 도구 배선 잔여 (코드 경계 밖이면 고치지 말고 보고)

`tools/retrieve.py` `PREDICATE_WEIGHT`는 미등재 술어를 **기본 0.5**로 순회한다. `hasEnvelope`는
`hasComponent` 하위라 reasoned 그래프에서 0.9로 도달하지만, `ho:autonomyTier`처럼 spec-concept
선언 술어는 미등재면 0.5(짝 축 `hasExecutionMode`는 0.7)로 **비대칭**이 남는다. 담당 경로 밖이면
notes로 보고한다.
