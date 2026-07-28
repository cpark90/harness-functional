# deprecated-maturity 은퇴 + planning-doc 재동기화 검증 재현 절차

behavior-preserving refactor(코드 제거 + TBox def 리터럴 변경)를 self-report 없이 판정한 절차.

## 핵심 = retrieve byte-identity via HEAD worktree
- **격리 기법**: `git worktree add --detach <scratch>/head-wt HEAD` → 변경 전(구 retrieve.py +
  구 harness.ttl) 클린 상태 확보. 다수 uncommitted 파일이 있어도 worktree는 HEAD 순수.
- `ontology_lib.ROOT`는 `__file__` 기준 → 각 retrieve는 **자기 worktree의 ontology**를 로드.
  ⇒ HEAD-wt retrieve vs 현재 retrieve 비교 = retrieve.py 변경 **+** tbox 변경 결합 end-to-end.
- `PYTHONHASHSEED=0` 양측 고정으로 hash-noise 제거, 코드 diff만 분리.
- 질의 4개 × `md`+`json` 8팩 diff. **함정: `--format`은 `md|json`만 허용** ("markdown"은 argparse
  거부→양측 동일 오류라 IDENTICAL 오탐). 반드시 `md`로 실팩(14–36KB) 비교.
- deprecated 기계 검증이면 "deprecated/retired/maturity/lifecycle" 실은 질의 1개 포함.
- 끝나면 `git worktree remove --force <path>; git worktree prune`.

## 전-축 은퇴 grep
- `grep -rn "deprecated|DEPRECATED_RANK_FACTOR|lifecycle_factor" tools/ ontology/tbox/ ontology/shapes/`
  → **tools/는 webui/static minified JS가 2MB 히트하니 `--include="*.py"`로 스코프**.
- 잔여 "deprecated"는 구분: guardrails.ttl promptText "mark it deprecated"(기록보존 정책 산문)와
  webui 번들은 maturity 기계와 무관 = 결함 아님. maturity 노드는 `grep 'maturity[[:space:]]*"deprecated"'`
  로 abox + recipes(/home/cpark/git/harness-recipes) 양쪽 0 확인.
- 제거 심볼이 부르던 헬퍼(`maturity_values`)가 다른 경로(`maturity_of`/`_MATURITY_RANK`)로 존치·사용
  중인지 확인 = orphan 아님. `import retrieve`로 NameError/미참조 없음 스모크.

## planning doc(OPEN-ISSUES) 스팟체크
- "완료"로 옮긴 항목의 land 해시 → `git log --oneline -1 <hash>` subject 대조(표본 3~4).
- "미해결" 표본은 주장대로인지 grep(예: B4 dormant = 구조 술어 승격 0건).
- 헤더 카운트(245) = `validate.py` "all N individuals reachable" 실측과 대조.

판정: PASS. 게이트 5개 전부 green, retrieve 8/8 byte-identical.
