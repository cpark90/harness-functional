# recipe TestScenario prefLabel 케이스 규약 정규화

recipes 저장소 scenario 라벨 케이스 drift 통일 작업의 재사용 지식.

## 표준 패턴 (34-다수)
`ho:TestScenario`의 `skos:prefLabel`는 **content word 전부 Title-case + "scenario"만 lowercase**.
- `scn-error` → `"Error Flow scenario"` (다수 34; sentence-case "Error flow scenario"가 drift)
- `scn-existing-file-utilization` → `"Existing File Utilization Flow scenario"` (51/25/24/23/09 다수 일치)
- 파생(data/material 등 unique IRI)도 같은 word-form 적용: `"Existing Data Utilization Flow scenario"`.
- **억지 금지**: 의미가 다른 single-recipe 라벨(`"Weekly newsletter scenario"`,
  `"Titanic classifier scenario"`, `"Full code-review scenario"`)은 규약 대상 아님 —
  구조 공유 skeleton(error/existing-*/normal/happy-path)만 통일.

## ★ prefLabel은 materialize EMIT됨 (definition과 반대)
- b23 note: `skos:definition`은 materialize 미방출 → 편집이 byte-neutral(delta=MANIFEST roll-up).
- **prefLabel은 방출됨**: materialize 델타에 CLAUDE.md `- **<label>** (kind)` 줄 +
  MANIFEST.json `"label"` 둘 다 케이스 반영 → **byte-identical 아님**(의도된 cosmetic delta).
  케이스만 바꿔도 산출 문서 diff에 잡힌다. 대소문자 정규화는 "cosmetic이지만 visible" 축.

## 검증 절차
- 잔여 sentence-case sweep: 전 recipe `grep 'a ho:TestScenario ; skos:prefLabel "..."'`,
  Title-case 아닌 flow-scenario skeleton = 0 확인.
- closure validate: repo root에 `ln -sfn <central> central`, per-recipe
  `HARNESS_CATALOG=catalog-v001.xml HARNESS_ROOT_ONTOLOGY=https://harness-ontology.dev/recipes/<r>
  /usr/bin/python3 central/tools/validate.py` → PASS. 끝나면 `rm central`(gitignore `/central/`).
- materialize 델타: `materialize.py <harness-id>`(positional=**harness node IRI** 예 `h-hiring-pipeline`,
  recipe root IRI 아님. root는 HARNESS_ROOT_ONTOLOGY env). old는 tracked면 `git stash push -- <ttl>`.
  ★untracked wave-import recipe(예 88)는 stash 불가 → tracked 형제로 델타 시연.
