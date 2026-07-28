# recipes 품질 진단 probe 재현 절차 (central 품질 렌즈를 recipe repo에 적용)

대상: `/home/cpark/git/harness-recipes/recipes/` (38 recipe). central Q1/Q2/Q3 +
orphan/dangling 렌즈로 "실제 정리 큐가 있나" 판정. findings-only.

## 환경 셋업 (sanctioned)
- recipe repo 루트에 **임시 gitignored `./central` 심링크** → central repo. catalog
  (`catalog-v001.xml`, 루트)가 `central/...` 상대경로로 참조. `.gitignore`에 `/central/`
  있어 git status에 안 뜸. **끝나면 `rm central`** (recipe tree byte-clean 유지).
- recipe TTL은 `recipes/<name>/<name>.ttl`. IRI는 catalog에서
  `grep -oE 'https://harness-ontology.dev/recipes/[a-z0-9-]+' catalog-v001.xml`.
- 실행: `HARNESS_CATALOG=catalog-v001.xml HARNESS_ROOT_ONTOLOGY=<iri>
  /usr/bin/python3 central/tools/{validate,lint_uniformity}.py`. 로더가 env로 union
  (whole central + that recipe) 로드. catalog drift guard: `gen_recipe_catalog.py --check`
  ("in sync (38 recipes)"). core-roles/observation/memory catalog에 present(lpranging P0 landed).

## ★핵심 판정
- **Q1 린터는 recipe에 적용 가능**(오탐 아님): §2 prefix/§1c token/§1d lang 전부 **class-based
  domain-neutral** → recipe-local id: 노드도 정당 in-scope. central 린터가 recipe에 옳은 도구.
- **유일 실제 큐 = `ho:Contract` prefix drift**: recipe 5노드(lpranging 3 + contract-demo 2)가
  `contract-*`인데 §2(ONTOLOGYSTYLE:135)는 `ct-`. central은 ct- 준수. 이 둘만 `a ho:Contract`
  선언(ODR-contract 증분 동일저자 slip). validate는 §2 못 봄 → 게이트 green이라도 린터가 잡음.
  fix=rename+참조갱신, integrity-neutral, developer dispatch 큐.
- **나머지 전부 clean**: validate 38/38 PASS. Q1 token/lang/maturity/def 0. Q3 decompose 0
  (긴 def=Harness overview/skill desc, length≠defect). dangling 0.

## 함정
- **B23 stale-contradiction은 node-level로 검사**: file-level grep("specializes core:"+
  "no central archetype" 동일파일 공존)은 전부 오탐 — negation은 domain/fp 노드(recipe-local
  정당, specializes 없음), specializes는 별개 role 노드. rdflib로 **같은 subject**가 둘 다
  갖는지만 = 0. (predicate-vs-prose, anti-drift FIRST.)
- **dangling은 core: object만**: recipe의 74 distinct `core:` ref 전부 central abox subject로
  resolve=0 dangling. lpranging `id:role-developer/vnv/inspection`은 **recipe-local**(id:,
  core: 아님) 프로젝트 자체 role — 삭제된 central role-developer 참조 아님(bare grep 오탐 lure).
- validate/lint 38 전수 sweep은 IRI 루프로 ~수분. tail -1==PASS 집계.

→ docs/verify/recipes-quality-probe.md. 판정=(b) 작은 실제 큐 1종(5노드/2recipe), 나머지 정합.
