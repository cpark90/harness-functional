# revfactory delta F — cap-skill + first central ho:Contract (B22 close)

`gr-well-formed-skill`(저작 절반)의 강제 절반 저작. 결과 226→230, validate PASS,
verify_contract h-harness-factory 2/2 PASS(거짓계약 회피).

## ★핵심: Contract가 검사하는 파일 = materialize가 실제 emit하는 skill 경로
- 브리프 ★judgment은 `file-contains:SKILL.md::...`(루트 SKILL.md)를 걱정했으나, **materialize는
  루트가 아니라 `.claude/skills/<name>/SKILL.md`를 emit**한다(`emit_instructions`, name=`skos:notation`
  or IRI tail `ins-` strip). fallback 렌더는 frontmatter `name:`+`description:`(=skos:definition)
  + `# <prefLabel>` heading + promptText body. ⇒ **contractCheck를 그 실제 경로로 겨누면** 그 skill을
  ship하는 harness의 tree에 파일이 실재→verify PASS. 이게 "거짓계약(항상 FAIL)"을 구조적으로 없애는 열쇠.
- 그래서 옵션 A(spec-only, 실행대상 아님)로 도피할 필요 없이 **옵션 B(실제 SKILL.md emit 컨텍스트에 바인딩)**
  가 깔끔히 성립: provider Instruction을 `h-harness-factory`에 `hasInstruction`하면 factory tree가
  `.claude/skills/well-formed-skill/SKILL.md`를 emit→contract TRUE. dogfood(하네스저작 host가 skill저작
  skill을 ship하고 그 skill이 well-formed임을 자기 계약으로 검증).

## Contract 저작 규칙(재확인)
- **contractCheck는 노드당 정확히 1개**: `verify_contract.py`가 `g.value(c, HO.contractCheck)`로 읽음
  (다중이면 임의 1개만+비결정). assertion 2개면 **Contract 개체 2개**(demo 선례와 동일). 여기선
  `ct-well-formed-skill-description`(file-contains ...::description) + `ct-well-formed-skill-heading`
  (section ...::<prefLabel heading>).
- Contract엔 **tokenEstimate 안 붙임**(Candidate류 bind/verify 메타, promptText 없음). prefLabel+
  definition만 필수(ComponentConnectivityShape). tag 불요(rollup으로 orphan-free).
- 도달성=기존 `hasComponent o providesCapability o capabilityContract` chain(TBox L272). provider가
  harness에 hasComponent(여기 hasInstruction)돼야 Contract가 harness로 roll-up→orphan-free.

## verify_contract 수집 = requiresCapability ∪ (component providesCapability)
- `harness_capabilities`가 그 harness의 requiresCapability + 바인딩 컴포넌트 providesCapability의 합집합.
  ⇒ provider를 어떤 harness에 물리면 그 harness의 verify_contract가 이 contract를 **자동 수집**. 그래서
  provider의 SKILL.md를 emit **안 하는** harness에 물리면 false-FAIL. 반드시 emit하는 곳(=그 Instruction을
  hasInstruction한 곳)에 물릴 것(자동으로 일치).

## file-contains의 약점(감사 함정)
- `file-contains`는 **an치 substring 매치**라 필드가 아닌 본문 어디든 그 단어가 있으면 통과. `description:`
  라벨을 지워도 promptText/definition에 "description"이 남아있으면 PASS(약한 계약). 진짜 teeth 확인은
  **파일 삭제 tamper**로(→file missing FAIL exit1). 이건 grammar 한계(필드/라인 앵커 없음)=GAP.

## capability 만족은 validate가 per-harness로 강제
- SHACL(HarnessShape)은 require↔provide 매칭을 강제 안 함(CapabilityConnectivityShape는 개별 orphan만).
  하지만 `validate.py`의 **"Capability satisfaction" 단계**가 harness별로 required가 내부 provider로
  채워지는지 검사("every harness's required capabilities are provided internally"). ⇒ requiresCapability
  cap-skill를 factory에 넣었으면 provider(ins-well-formed-skill providesCapability cap-skill)를 같은
  harness에 반드시 바인딩해야 통과.

## 배치/byte-id
- 새 data unit(core/verification) 만들지 않음(federation 3점=orchestrator). cap-skill+2 Contract는
  `spec/capabilities.ttl`에, Instruction은 `behavioral/guardrails.ttl`(guardrail 짝 옆)에 배너로 co-locate.
  IRI 위치독립→나중 relocation은 순수 move.
- factory에 hasInstruction+requiresCapability 추가=의도된 byte변경(## Skills 섹션+skill 파일+capability
  binding). 나머지 6 harness는 CLAUDE.md/MANIFEST byte-identical(lock.json 전역 individualCount만 226→230).
- Instruction 술어순(ONTOLOGYSTYLE §4): ...usesModel→**hasInstruction**→hasChannel...; requiresCapability(§5)에 cap-skill append.

## GAP(보고)
- **금지파일 부재 assertion**(README/CHANGELOG 없음)=grammar에 부정/부재 op 없음→표현 불가. promptText로만
  서술, 계약화 못함. grammar 확장은 tools 변경(범위 밖).
- file-contains 필드-앵커 부재(위 약점). 둘 다 grammar 확장 신호(structural op에 `file-not-exists:`·
  `field:<path>::<key>` 등)—orchestrator에 스키마/도구 확장 트리거로 보고.
- Contract 전용 data unit(core/verification) 부재로 co-locate. 다수 Contract 쌓이면 relocation 필요.
