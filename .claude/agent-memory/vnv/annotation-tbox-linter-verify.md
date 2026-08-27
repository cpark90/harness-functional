# annotation TBox 술어 + §1c text-cap 린터 검증 재현 절차

승인 계획 ①(alternativeOf/overlapsWith/Anchor n-ary)·②(cap 260 token, chars/4) 판정.
→ `docs/verify/annotation-tbox-linter-verify.md`. 인터프리터 `/usr/bin/python3`
(rdflib 7.6.0 · pyshacl 0.40.0 · owlrl 7.6.2).

## 주입식 negative control의 가장 싼 경로
- 원본 워킹트리를 절대 건드리지 않는다: `rsync -a --exclude .git <repo>/ $SP/nc/` 후
  **catalog에 매핑된 아무 core 유닛에 append**하면 union에 들어간다
  (`ontology/abox/core/behavioral/guardrails.ttl`이 `ho:`/`id:`/`skos:` prefix를 다 갖춰 편함).
  catalog·root `owl:imports`를 손댈 필요 없음.
- 케이스마다 원본에서 `cp`로 되돌린 뒤 append → `validate.py`/`lint_uniformity.py` 실행.
  스크립트화해두면 1케이스 ≈ 20초.

## SHACL SPARQL constraint(대칭 술어) 검증 요령
- `sh:targetSubjectsOf` + `sh:sparql` 가드는 **대칭 추론 때문에 위반 1건이 violation 2건**으로
  보고된다(양쪽 끝 각각 focus node). "2건 = 정상"이지 중복 버그가 아니다.
- `sh:prefixes`는 파일 상단 Turtle `@prefix`가 아니라 **`sh:declare`가 달린 owl:Ontology 노드**를
  가리켜야 한다. shapes 파일은 로더가 `os.sep+"shapes"+os.sep` 경로로 스킵하므로 그 헤더가
  데이터 union에 섞이지 않는다(triple 수로 확인 가능).
- pyshacl 0.40.0은 `advanced=False`에서도 sh:sparql을 평가한다 — "advanced 끄면 가드가 죽는다"는
  가설은 이 버전에서 **거짓**(실측). 그래도 호출부는 `tools/validate.py:45-51` 한 곳뿐.
- `sh:datatype xsd:decimal` 0..1 제약은 `1`/`0` 같은 **정수 리터럴을 FAIL**시킨다
  (xsd:integer≠xsd:decimal). 0..1 가중치 축을 검증할 땐 이 함정을 반드시 케이스로 넣는다.

## SymmetricProperty·propertyChain 실측법
- 델타: `lib.load_graph(reason=False)` vs `(reason=True)` 의 `len(g)` 차이. N쌍 선언 시
  raw +N / reasoned **+2N**(prp-symp). `instance_nodes`는 reason 유무와 무관히 동수여야 한다.
- chain axiom이 **실제로 발화**하는지는 "추론 후 그 노드를 `hasComponent`하는 subject가 전부
  `ho:Harness` 타입인가"로 본다 — 도달성 BFS는 **무향**이라 chain이 죽어도 통과하므로
  reachability 초록만으로는 chain 검증이 안 된다(핵심 함정).
- 중간 노드를 아무 데도 안 매단 케이스를 넣어 `ComponentConnectivityShape`(inverse hasComponent
  minCount 1)가 FAIL하는지도 같이 본다.

## "신규 어휘가 산출물에 무영향"의 격리 증명
`HEAD vs 워킹트리` diff는 병행 wave 때문에 항상 지저분하다. 대신 **워킹트리 복제본에서 그 단계만
되돌린 트리**(클래스·술어 블록·chain axiom 1줄·shape·`INSTANCE_CLASSES` 1행 제거)를 만들어
`materialize.py`를 harness 전수로 돌리고 `diff -r`. 사용 0의 TBox 추가라면 `harness.lock.json`까지
byte-identical이 나온다(락은 TBox 텍스트를 해싱하지 않음). HEAD-diff는 "잔여 delta가 전부 타 wave
소관"임을 문장으로 귀속시키는 용도로만 쓴다.

## §1c text cap(chars/4) 검증
- 린터를 믿지 말고 rdflib로 재측정: 노드별 `ho:promptText`+`skos:definition` **전 값** 문자수 합 //4.
- 경계 실험은 기존 노드에 **정확한 길이의 padding literal**을 붙여 만든다:
  cap C에 대해 `4C+3` chars = C token(PASS), `4C+4` chars = C+1 token(FAIL). exit code도 같이 본다.
- metric 사각지대를 항상 계량한다: 이 cap은 두 술어만 세므로 `ho:recoveryStrategy`·
  `ho:failureCondition`·`ho:scenarioExpected` 등 클래스 고유 산문은 무계측(전 리터럴 기준으로 재면
  초과 노드가 더 나온다).
- 선언 `tokenEstimate`가 어떤 산식인지는 median 비율로 판정: est/(chars/4) median 0.90 vs
  est/wc median 1.43 → 이 저장소는 **chars/4 계열**. 단 `tools/import_corpus.py:71`은 여전히 wc -w.
- §2 표 ↔ `lint_uniformity.PREFIX_MAP` 대조는 기계로 한다(표 33행 파싱 → 맵 비교). 신규 클래스가
  표에만 추가되고 맵에 안 들어가면 **인스턴스 0 동안 조용히 미강제**된다 —
  잘못된 슬러그 개체를 주입해 통과하는지로 실증한다.
