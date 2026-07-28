# harness-recipes repo: closure verification workflow

harness-recipes(별도 repo)의 recipe TTL를 검증할 때 central을 `./central/`로 참조한다
(catalog-v001.xml의 CENTRAL 블록이 `central/…` 상대경로). checkout 없으면 **임시 심링크**:
`ln -s /home/cpark/git/harness_ontology central` → 검증 후 `rm central` (파일아님 심링크 제거).

전 명령 공통 env: `HARNESS_CATALOG=catalog-v001.xml HARNESS_ROOT_ONTOLOGY=https://harness-ontology.dev/recipes/<name>` + `/usr/bin/python3 central/tools/<tool>.py`.

- **validate**: `validate.py` → PASS(SHACL/reachability/capabilities/assemblyOrder/capacityFit/registryDrift). SpecializesTyping은 SHACL 하위.
- **verify_contract**: 먼저 `materialize.py <harness> --out <tree>`로 트리 생성 → `verify_contract.py <harness> --tree <tree>`. contract는 ho:Capability의 ho:capabilityContract에 매달림→ id rename해도 그 참조만 정합하면 N/N PASS.
- **lint_uniformity**: 저작규약 린터. naming prefix(§2표)축이 Contract→`ct-` 위반 잡음. env 없이 돌리면 central-only scope(recipe 미포함)—recipe축 보려면 반드시 HARNESS_ROOT 지정.

## prefix rename(reuse 아님) 패턴
잘못된 prefix 교정(예 Contract `contract-`→`ct-`)은 sed로 old-id 전체토큰을 신규로 치환
(subject 선언+capabilityContract/contractCheck 등 모든 참조 동시). 옛 id는 소멸(재사용 금지).
증거=`grep old-id → 0건`(dangling 없음) + 신 id로 subject+ref 짝. 구조필드/prefLabel 산문의
"contract" 단어는 유지(id prefix만 규약대상).
