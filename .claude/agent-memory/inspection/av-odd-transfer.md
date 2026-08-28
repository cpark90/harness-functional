# AV ODD·시나리오 형식 이식 (구상 + 파급 실측)

원본: `docs/feedback/inquiries/av-odd-scenario-transfer.md`(구상) +
`verified/av-odd-scenario-transfer.md`(파급). 조사 `wf_4ca0a54c-f64` 6축. 2026-08-28.

## 재사용 지식
- **대응 지도 요지**: ODD=하네스 선언 운용범위(현재 **부재**, targetsDomain은 라벨뿐) ·
  OD/COD=env-space/global-state(**이미 있음**) · scene/situation/scenario=global-state/
  ObservationSpace/궤적(**이미 동형 — 신설 금지**) · ODD exit→fallback→MRC=envelope-exit
  FailurePolicy→인계→safe-halt · J3016 level=**(task-share, fallback owner, envelope binding)
  삼중항**(선언이지 측정 아님, Harness에 붙고 모델에 안 붙음, 명목형) · functional/logical/
  concrete=TestScenario abstractionLevel · 6-layer=환경 계층 스킴 · SOTIF 4영역=knowledge-area ·
  UL4600 prompt element=coverage-audit 의무 4등급 · GSN=verify 보고 구조 · SPI=**판정 만료 조건**.
- **repo 선례가 결정한 설계 2건**: (가) OperatingEnvelope는 **HarnessComponent**
  (`hasEnvelope subPropertyOf hasComponent` + chain axiom) — TestScenario/FailurePolicy/Agent가
  같은 이유로 그렇게 들어왔고 ComponentConnectivityShape가 anti-orphan을 자동 커버.
  (나) AutonomyTier는 **ExecutionMode와 같은 Specification leaf**(슬롯을 데이터로 들어야 SHACL
  함의 검사 가능) — 반면 HITL/HOTL·knowledge-area·abstractionLevel·환경층은 skos 개념으로 충분.
- **접두사 충돌 실측**(린터 startswith, 현행 32종 전수): `oe-/es-/er-/tier-/orc-/svar-/tc-/fi-`
  전부 무충돌. `env-`도 기계적 충돌은 없으나(싱글턴 env-space는 SINGLETON_NAMES로만 검사)
  가독상 오독 → `oe-` 권장. 신규 클래스는 **PREFIX_MAP + §2 표 + INSTANCE_CLASSES 3중 등록**.
- **개체 폭증 방어선**: restrictive 기본값이라 **include만 명시**(exclude 생략) + 중앙엔 대표
  하네스 2종만 + 속성 스킴은 중앙/선언은 recipe → 중앙 증가 ~40개체로 억제.
- **이식 금지 목록**: 물리 안전 정량 기준(ALARP·충돌 심각도), 시나리오 클래스 계층 증식
  (34504 자신이 태그집합 택함), **OWL-DL/SWRL 스택 역수입**(우리 SHACL이 앞섬), 유료 표준
  verbatim, prefLabel에 ODD/DDT/MRC 약어·"레벨 N" 서열 라벨.
- **PEGASUS 배정 규칙 함정**: production tier에는 시나리오를 **배정하지 않는다**(발견 전용) —
  "제일 비싼 테스트 장소"로 오해하면 방법론을 잘못 옮긴다.
- ★**죽은 씨앗 발견**: `ho:triggerPhrase`/`ho:outOfScope`(Harness+Instruction, 자유문 활성
  경계)가 TBox에 **이미 선언**돼 있으나 **ABox/staging/도구/shapes 전부 0건**. 새 envelope
  술어를 그냥 얹으면 근사동의어 2쌍 공존 → W1에서 **택일 강제**(서술문 생성물로 재정의 vs
  같은 커밋 제거). **교훈: 신규 술어 제안 전 TBox 전수 grep + ABox 사용 건수 실측**을 항상
  선행할 것 — "빈자리"로 보이는 것이 죽은 어휘일 수 있다.

## (A) 구체화 — 사례조사가 뒤집은 것 (부록 B; 본문보다 우선)
- **envelope은 5축**(영역·과업/절차·주체·인터페이스 표면·자산). domain 축만으로 좁히는 것은
  Khlaaf가 명시 지적한 오류. Ag-ODD 교훈: 새 도메인의 **중심 과업 축**을 반드시 신설.
- **"COD 감시=ObservationSpace"는 범주 오류**: 속성공간(OD taxonomy=중앙) / 선언 술어식
  (=하네스 envelope) / 측정 튜플(=ObservationSpace) / **평가자**(별도 Guardrail, 주기·권한·
  재진입 조건 보유) 4분. ISO 34503·PAS 1883도 이름과 달리 **OD** taxonomy다.
- **자율성**: 두 독립 사다리가 "인간 승인 단위 크기"로 수렴, Endsley는 {decide,act} 배분으로
  정의. **L0(권고만) 필수**. HITL/HOTL/HOOTL·승인단위·"인간이 왜 있나(9역할)"는 **3개 직교 축**.
- **capability ≠ authorization**(confused-deputy) — approvalScope를 능력 그래프에서 파생 금지.
- **검증 보고에 Defeater 필수**(CAE) — 지지 증거만 나열하면 분야 기준선 미달.
- **safe-halt=상태 + 자동 재개 불가**; 승인 은행화 금지(정족수+신선도, 기본 false).
- **긴 통지 ≠ 빠른 응답**(실증 +1.35초) → 통지 리드타임과 응답 기한은 별개 수.
- Guardrail 필드셋은 이제 **인용으로 채운다**: 부착점 4·권한 사다리 6·집행모드(차단대치 vs
  최소편집)·주기/지연한계·지평·우선순위·무결성(checker>doer)·override 금지·결정성.
  경험 근거: **행위 수준 감시는 목표 수준 위반 0% 검출** → intake/plan 검사 없는 하네스는 결함.
- 함정 추가: 감시자가 doer보다 비싸면 그 부착점 불가 / false rejection rate 없는 평가는 자기기만 /
  같은 모델 자기검증=단일 고장영역(인증 불가) / margin 정규화 없는 논리곱 oracle은 탐색 오도 /
  **절대 수치 이식 금지**(스키마·비율·형태·인과 방향만).
- **우리가 처음인 지점 2개**(선행 없음): 에이전트 TestScenario의 functional→logical→concrete,
  SOTIF 4영역의 LLM 이식 → "선행 채택"이 아니라 우리 설계로 제시.

## 채널 상태
- inbox `av-odd-scenario-transfer.md`: 사용자 **"(B) 우선 + (A)는 사례조사로 구체화"** 승인.
  → W1 브리프 초안 `inquiries/av-w1-envelope-brief.md`(B 착수용) + 구상 부록 B(A 구체화) 작성 완료.
- 관련: harvest 항목은 사용자가 **(B)→(A)** 승인 — verified에 결정 기록 완료. A 확장 전
  **술어 경계 명문화**(approvalScope/attachesAt/environmentFidelity vs envelope) 선행 지시함.
