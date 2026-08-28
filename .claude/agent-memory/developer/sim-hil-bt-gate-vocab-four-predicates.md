# sim-hil B-T — TBox 술어 4종(approvalScope/attachesAt/retrievalPolicy/environmentFidelity)

신규 클래스 0, 술어 4 + 개념 9(스킴 1+leaf 8) + 기존 guardrail 9곳 사실 부여. registry 3점
전부 무변경(클래스·접두사 신설 없음 — INSTANCE_CLASSES/PREFIX_MAP 확인만 하고 보고).

## 클래스 shape가 없는 클래스의 optional 닫힌 값 = targetSubjectsOf 미니 shape
Guardrail엔 NodeShape가 아예 없다. optional 필드 하나 때문에 blanket GuardrailShape를 만들지
말고 `sh:targetSubjectsOf <술어>` + sh:in 한 개짜리 shape(ho:ApprovalScopeShape 선례)로.
반대로 대상 클래스 shape가 이미 있으면(HarnessShape) optional property(sh:maxCount+sh:in)로
얹는다 — minCount는 brief가 지정할 때만.

## 경계 명문화는 "양방향"이 완성형
새 술어 정의문에 기존 술어와의 BOUNDARY를 넣는 것만으론 반쪽 — **기존 술어(approvalUnit)
정의문에도 역방향 1문장**을 추가해야 두 정의가 서로를 가리킨다(값 어휘 의도적 disjoint 명시
포함). 이건 TBox definition 텍스트만이라 shapes/산출물 불변.

## T4 domain 판단 선례: "환경" 술어는 EnvironmentSpace가 아니라 Harness
이 repo의 ho:EnvironmentSpace = 관측투영체인 꼭대기의 **무한 실재 singleton**(id:env-space
1개, 비-component). per-deployment 성질(fidelity 등)을 거기 걸면 mock/replica 개체 신설로
모델 의미와 충돌 — 배포마다 변하는 선언은 ho:autonomyTier처럼 **Harness가 직접 든다**.

## 병행 wave 공존 시 byte-identity 증명 = scratch 역적용 baseline
W1이 uncommitted로 같은 파일에 있어 `git archive HEAD` baseline 불가. ontology/+catalog를
scratch 복사 → **내 편집만 문자열 역적용**(추가 블록 cut, 추가 라인 drop — count==1 assert)
→ HARNESS_CATALOG=scratch로 materialize 대조. 실측: CLAUDE.md/MANIFEST byte-identical,
변한 건 harness.lock.json individualCount(+9, 개념 증가의 구조적 필연)뿐. 개념은 component가
아니고 미렌더 술어는 산출물에 안 나온다(dangling id: 0).

## 사실 부여(anti-fabrication) 요령
promptText 문장에서 직접 읽히는 것만: "without explicit confirmation"→approvalScope
"tool-call", "present the plan ... obtain confirmation"→"plan", "Before accepting a
request"→attach-input, "retrieve only ... projection"→attach-retrieval, emit 계열→output.
붙일 곳 없는 leaf(execution-post/session/turn)는 broader 연결만으로 non-orphan — 점유자는
다음 ABox wave로 미루고 주석에 명시. tokenEstimate 재산정 불필요(lint text cap은
promptText+definition만 합산, 닫힌 값 리터럴은 비산입).
