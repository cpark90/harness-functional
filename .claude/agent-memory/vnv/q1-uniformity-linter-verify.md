# Q1 uniformity linter (tools/lint_uniformity.py) 검증 재현 절차

`validate.py`가 못 보는 저작 통일성 5축 린터 독립검증. → docs/verify/q1-uniformity-linter-verify.md

- **인터프리터**: `/usr/bin/python3` (셸 python3엔 rdflib 無). `ontology_lib`는 repo root
  아니라 **tools/** 에 있음 → in-memory 스크립트는 `cd tools` 후 import.
- **5축**: (1)tokenEstimate §1c 6클래스(SystemPrompt/Instruction/Guardrail/Example/Tool/Workflow,
  하드코딩 tuple) (2)prefix §2표 PREFIX_MAP 31클래스+싱글턴 2 (3)language §1d Hangul 정규식 on
  prefLabel/definition/altLabel (4)maturity (5)definition — **(4)(5)는 shapes에서 파생**
  (`_derive_required_classes`: targetClass+path+minCount≥1). 하드코딩 아님=drift 불가.
- **Gate2 원문대조 핵심**: §1c 6클래스 정확일치·PromptSection/WorkflowStep/AreaOfObservation
  제외 옳음(§3 observedTokenVolume 별개축). §2표 ConceptScheme 싱글턴(id:scheme)만 미포함=Note
  (skos:ConceptScheme라 INSTANCE_CLASSES밖→instance_nodes 안잡힘→FP도 안남). §1d rdfs:comment/
  promptText 미검사가 옳음(한글 산문은 comment에 두라는게 §1d).
- **Gate3 shapes-파생 독립재현**: 실측 maturity minCount≥1 targetClass=9(Agent/AoI/AoO/
  FailurePolicy/GlobalState/Hook/Memory/ObsSpace/TestScenario), definition=Memory 1. `sh:node`
  간접참조 0(nested shape 우회위험 없음). 핵심클래스(SystemPrompt/Guardrail/Harness…)는 maturity
  minCount 자체가 shapes에 없어 scope 자동제외=SpecConcept면제 자동존중.
- **Gate4 teeth**: `load_graph(reason=True)` 복사본에 1건 주입→해당 check 함수 호출→정확히 1.
  cross-axis 격리(1축 교란시 나머지 0). 비-vacuous scope: token55/prefix245id:/lang546literal/
  mat43/def3 전부>0. leaf-type해석=most_specific_types가 subclass우선(Guardrail typed도
  HarnessComponent 아닌 gr- 기대).
- **★latent FP 벡터(Note-2)**: §1c는 "promptText **있는**" 조건부인데 check_token_estimate는
  4클래스 무조건 요구. 현재 전부 promptText 보유(promptText-less=0)라 오탐0. shapes는 promptText
  minCount를 SystemPrompt만 강제→장차 promptText없는 Guardrail 저작시 오탐가능(현재 무해·규범강제로 방어가능).
- **무영향**: 린터는 read-only(teeth는 in-memory copy). validate.py PASS + git status ontology/ 클린으로 확인.
- 판정: PASS + 2 non-blocking note. CI 게이트 적합(exit 0/1/2). 진짜 teeth는 축1/2/3(어떤 shape도
  강제 안함=고유가치); 4/5는 SHACL과 중복(회귀 대비 겸 리포트 일원화).
