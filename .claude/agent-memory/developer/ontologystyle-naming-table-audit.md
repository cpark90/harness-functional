# ONTOLOGYSTYLE §2 네이밍표 — 실측 감사 레시피

`ONTOLOGYSTYLE.md` §2 개체 접두사 표가 실제 ABox와 어긋나 있을 때(신규 클래스 저작 후 표
갱신을 빼먹는 것이 기본값이다) 쓰는 실측 절차. 문서만 고치므로 온톨로지 무영향 = validate 불변.

## 실측 3종 세트

```bash
# 1) 실제 쓰이는 접두사 전수 (참조 포함 — 어떤 접두사가 유통되나)
grep -rhoE "id:[a-z]+-" ontology/abox/core/ | sort | uniq -c | sort -rn
# 2) 접두사 → 클래스 매핑 (선언만 — 표의 "종류" 열 근거)
grep -rhoE "^id:[a-z0-9-]+ +a +(ho|skos):[A-Za-z]+" ontology/abox/core/ \
  | sed -E 's/^id:([a-z]+)-[a-z0-9-]* +a +/\1 | /' | sort | uniq -c
# 3) 접두사 없는 singleton (dash 없는 subject)
grep -rhoE "^id:[a-z0-9]+ " ontology/abox/core/ | sort -u    # → id:scheme
# 4) 표의 완결성 = TBox 구체 클래스 전수와 대조
grep -oE "^ho:[A-Za-z]+ a owl:Class" ontology/tbox/harness.ttl | sed 's/ a owl:Class//' | sort
```

## 함정 (2026-07 감사에서 실제로 걸린 것)

- **참조 수 ≫ 선언 수**: `id:tool-` 33회 유통이지만 중앙 Tool 개체는 4개뿐(나머지는
  harness/role의 `usesTool`/`roleTool` 참조). 표 근거는 반드시 **선언(`a ho:X`)** 으로 잡는다.
- **표의 예시 IRI가 허구**: `id:ins-verify-then-proceed`(존재 안 함), `id:ex-…`(ellipsis
  placeholder), `id:aoi-orchestrator-external`(실제는 `id:aoi-orchestrator`). 새 행뿐 아니라
  **기존 행도 전수 grep**로 존재 확인해야 한다.
- **중앙 core에 인스턴스가 0인 클래스**: `ho:Instruction`(`ins-`)·`ho:Candidate`(`cand-`)는
  실재 개체가 `harness-recipes/recipes/**`(data repo 도메인)에만 있다. 중앙만 grep하면 "미사용"
  으로 오판 → 접두사 규약은 federation 전체 적용이라 표에 남기되 예시는 recipe 실재 IRI를 쓴다.
  `ho:Example`은 **repo 전체에 개체 0**.
- **★Contract 접두사 divergence(2026-07 감사, UPDATE)**: 중앙 core는 이제 `ct-`
  (`id:ct-well-formed-skill-heading`·`-description`, `spec/capabilities.ttl`) 실개체 보유. 반면
  **recipe data repo는 `contract-`**(`id:contract-greeter-emitted` 등 contract-demo/lpranging).
  같은 `ho:Contract`에 두 접두사 유통 = cross-repo drift. §2 표는 **중앙 canonical `ct-`로 정정**
  (개체 rename은 ID재사용금지 위반). recipe `contract-` 통일은 recipe repo 소관 = GAP(orchestrator).
- **`grep -r --include=* .`가 staging을 건너뛸 수 있다**(셸의 grep이 gitignore 인식 도구로
  aliasing된 환경). 경로를 `ontology/ staging/`로 **명시**해 재확인할 것.
- **DA-4 중간 superclass**(`*Component`·`SpecConcept`·`InformationSpace`)는 직접 인스턴스가
  없으므로 표에 행을 만들지 않는다 — 표는 **구체(leaf) 클래스**만 담는다.

## §4 그룹 디렉토리 서술도 같이 stale해진다

새 unit이 생기면 §2 표뿐 아니라 **§4의 DA-4 그룹 나열**과 "중앙 individual이 없는 그룹" 예시가
동시에 낡는다(2026-07: `verification/` 신설로 그 예시가 자기모순이 됨). 실측 결과 **13그룹 전부
파일을 갖게 되어 "빈 그룹" 예시 자체가 없어졌다** → 서술을 **타입 레벨**로 내려 쓴다
(`ho:Candidate`·`ho:Contract`·`ho:Instruction` = 중앙 개체 0, recipe data repo에만 존재).
빈 그룹 확인은 `for d in ontology/abox/core/*/; do [ $(ls "$d" | wc -l) -eq 0 ] && echo "$d"; done`.

## 행 배치 규칙

기존 표의 논리는 spec→부품→전체→관측이다. 부품은 **부모 바로 뒤에 자식**:
`wf-`→`wfs-`→`dlv-`, `sp-`→`ps-`, `cap-`→`contract-`, `tool-`→`cand-`.
조직(`role-`/`chan-`)·상태(`mem-`)·검증(`scn-`/`fp-`)·조립(`as-`)은 `h-` 직전에 둔다.
§2 하단 "[지킴] 관용 축약만 표에 등록된 대로" 규칙 덕에, 축약형 접두사(`wfs`/`dlv`/`ps`/`chan`)는
표에 등재되는 순간 합법이 된다(=등재가 곧 anti-drift 조치). Hook(`hook-`)은 behavioral 계열이라
Guardrail(`gr-`) 바로 뒤에 배치.

## §3 predicate 순서도 신규 조립술어로 stale해진다

새 조립/모드 술어는 §3 순서 목록에서 빠지기 쉽다(2026-07: hasHook/hasRole/hasChannel/hasMemory/
hasAgent/hasGlobalState/hasAssemblySection/hasExecutionMode/hasTestScenario/hasFailurePolicy 미열거).
**실측 절차**: 가장 술어가 많은 노드 2개(`h-multiagent`·`h-harness-factory`)의 블록을 그대로 읽어
관찰된 순서를 기록(규칙 발명 아님). 관찰 결과: block4 tail = usesModel→hasInstruction→hasExample→
hasRole→hasChannel→hasMemory→hasAgent→hasGlobalState→hasAssemblySection→hasHook→hasTestScenario→
hasFailurePolicy. block5 = appliesPattern→**hasExecutionMode**→requiresCapability→…→specializes.
