# refresh 판정 + 안전 커밋 절차 (inspection)

## refresh 판정
approved + 적용 실증(validate PASS·산출물 존재)만으로는 **부족**하다. 항목이 명시한
**inspection 몫 후속(첫 git 커밋·공개 repo 등)이 완료돼야** step5 refresh 대상이 된다.
미완이면 유지 — "적용 전이면 남긴다, 시간 가정 금지"(verify-then-proceed). 판정 근거는
실측(`validate.py`, `git rev-list --count HEAD`, 산출물 존재)으로 남긴다.

## 안전 refresh 순서 (데이터 손실 방지)
1. baseline 커밋에 항목 **포함**(히스토리에 영구 보존 → 복구 가능).
2. push 성공 후(또는 로컬이면 곧바로) **별도 커밋으로 `git rm` 항목** = refresh.
항목을 미커밋 상태에서 먼저 지우면 push 실패 시 추적 기록이 소실된다. 절대 금지.

## ★verified 보고서가 적용 시점보다 **뒤처져 있다** — 판정은 git 이력으로
보고서 본문의 verdict·status 텍스트를 **믿지 마라**. 판정 당시 "미적용"/"refresh 보류"로 얼어붙은
채 그 뒤 실제로 land된 경우가 흔하다(2026-07-25 refresh: `webui-save-drops-triples` 보고서는
"미적용 확정"인데 `19a8cc6`로 이미 land, `harness-100-augmentation-progress`는 "refresh 보류"인데
importer·대표35 임포트 전부 완료). ⇒ **실제 적용은 `git show <commit>`/`git log --grep`로 확인**하고,
적용됐는데 보고서에 기록이 없으면 **먼저 custody 기록을 추가하는 커밋(A)** 을 만든 뒤 별도 커밋(B)에서
`git rm`. 같은 커밋에서 add+rm하면 그 내용이 어느 트리에도 안 남아 이력에서 소실된다(반드시 2커밋).
- **부분 완료 항목은 HOLD**: 여러 결정/wave 중 일부만 미해결이면(예: survey 결정4 "예제 10~20"이
  소스타입 불일치로 미해결) 적용분(W0~W4)은 verified에 custody 기록하되 **항목은 inbox에 유지**하고
  잔여 사유·필요한 사용자 확인을 명시. optional 후속(별건 GAP)은 OPEN-ISSUES로 넘기고 핵심 요청이
  충족됐으면 항목은 제거 가능.

## 병렬 dispatch 중 scoped land (자율 루프 E-1 상시 상황)
같은 작업트리에서 developer 2~3인이 동시에 편집한다 ⇒ **`git add -A` 절대 금지**, brief가
명시한 파일만 개별 add. 절차:
1. `git status --porcelain`으로 브리프의 "진행 중 dispatch 파일 목록"과 실제를 **대조**한다 —
   목록이 어긋날 수 있다(예: 브리프는 `tools/ontology_lib.py`인데 실제는
   `ontology/shapes/harness-shapes.ttl`이 dirty). 내 5파일 외는 무조건 손대지 않는다.
2. **공유 파일 `.claude/agent-memory/developer/MEMORY.md`** 는 여러 dispatch가 같이 고친다 →
   커밋 전 `git diff <파일>`로 **추가된 줄이 인덱스 한 줄뿐인지** 확인. 판단 기준은 섞인
   인덱스 줄이 **가리키는 파일이 내 커밋 셋(또는 이미 커밋됨)에 있느냐**다:
   - 있으면 함께 커밋 무해(메모 포인터일 뿐).
   - **없으면(=미커밋 out-of-scope 파일 참조) DEFER**: 그 인덱스 줄들은 그 파일을 land할
     동시-dispatch가 MEMORY.md째로 커밋한다. 나는 **self-contained 토픽 메모리 파일만** 커밋하고
     공유 MEMORY.md는 손대지 않는다(커밋된 토픽파일 + 미커밋 인덱스줄 = 무해; 반대인 dangling
     인덱스가 나쁘다). 브리프가 MEMORY.md를 커밋 대상에 넣었더라도 이 경우엔 보고 후 defer.
   - 실측 함정: 동시 dispatch가 MEMORY.md를 **압축 리라이트**(단순 append 아님)하면 아래 hunk
     분할도 실용성 없음 → 그냥 defer가 깔끔. (2026-07-25 execution-sep land: mass-import Wave A~G2
     8줄이 미커밋 wave 파일 참조 → MEMORY.md defer, 토픽파일만 커밋 fce72af.)
3. `git add` 후 `git status --porcelain`으로 스테이지가 정확히 그 파일들인지 재확인 →
   커밋 → push → 다시 porcelain으로 **타 dispatch 작업분이 미커밋으로 온전한지** 보고.
4. 문서만 커밋할 때 `validate.py` 실패는 차단 사유가 아니다(스테이지에 그래프 파일이 없으므로
   CI가 보는 트리는 이전 그래프 + 문서). 단 과도기라는 사실을 보고에 남긴다.

## 관심사별 커밋 분리 시 **공유 메모리 파일**은 hunk 단위로 쪼갠다
developer 2인 증분을 커밋 2개로 나눌 때 `.claude/agent-memory/developer/MEMORY.md`에는 인덱스
줄이 **각 1줄씩** 들어와 파일이 양쪽에 걸린다. 파일 단위 add로는 못 나누므로:
`git diff <file> > p.patch` → 헤더 + `@@` 훅 하나씩으로 patch 파일을 만들고
`git apply --cached mem-0.patch` 로 **첫 커밋엔 첫 훅만** 스테이징, 두 번째 커밋에서 나머지를
통째로 add. `git diff --cached <file> | grep -c '^+- \['` 로 스테이지된 인덱스 줄 수를 확인.

## 이 repo git 사실
- `.claude/settings.local.json`은 사용자 전역 ignore(`~/.config/git/ignore`)로 제외 — 안전.
- `gh` CLI 미설치, remote 없음 → 공개 repo 생성/ push는 사용자가 remote를 제공해야 가능.
- 첫 커밋은 main에 직접(정상 — inspection=메인테이너측 git 전담).
