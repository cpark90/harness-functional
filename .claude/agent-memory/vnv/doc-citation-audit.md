# 형식화·매핑 **문서** 판정 (인용 전수 검증형)

대상이 `ontology/` 노드가 아니라 **문서**(`docs/plans/**` 매핑·형식화 문서, 계약 명세)일 때의
판정 절차. 그래프 축(`retrieve.py` 재검색·`HarnessShape`·tokenEstimate)은 **N/A**이므로
판정 무게가 전부 **"주장이 실재하는가"** 로 옮겨간다. 핵심 리스크 = **날조·추정**.

## 1. 인용 추출을 눈으로 하지 말 것 (정규식 → 표)

문서가 `파일:줄` 규약을 쓰면 `(prev)` 형태의 **생략 인용**(`:29-30`처럼 파일명 없이 앞 파일을
승계)이 절반 이상이다. 한 번에 뽑는다:

```python
tok = re.compile(r'(?:([A-Za-z0-9_./@-]+\.(?:py|ttl|md|json|yml|mjs))\s*)?`?:(\d+)(?:[-–](\d+))?`?')
for i,l in enumerate(open(doc).read().split('\n'),1):
    for m in tok.finditer(l): print(i, m.group(1) or '(prev)', m.group(2), m.group(3))
```

- 오탐 유형: 본문의 `1:1로`, 시각 `12:30`. 건수 보고 시 **오탐을 명시적으로 빼고** 센다.
- 그다음 파일별로 묶어 `awk 'NR>=S&&NR<=E{printf "%d| %s\n", NR, $0}' <file>`로 **원문을 출력**해
  대조한다(줄번호 붙여 출력하는 게 핵심 — `sed -n`은 번호가 안 붙어 off-by-N을 놓친다).
- 판정 표는 **파일 단위 행 + 건수 + 결과**로 압축한다(136건을 한 줄씩 쓰면 리포트가 무너진다).

## 2. 이 유형에서 실제로 나오는 결함은 3종뿐

전건 대조해 보면 "존재하지 않는 파일/함수"는 거의 안 나오고, 다음이 나온다:

1. **문자적 과장** — "`server.py:38-42`가 import 전부" 같은 전칭. 실제로는 stdlib(:23-25)·
   framework(:32-36)·함수 내부 `import difflib`(:234)도 있다. **실질 주장**(lint_uniformity
   미import)이 참이면 결함이 아니라 **정밀도 note**로 내린다. 판별: `grep -n "<모듈>" <file>`.
2. **블록-시작 인용** — 인용문(`"DECLARED BUT DORMANT BY DESIGN"`)에 노드 블록 첫 줄
   (`harness.ttl:205`)을 달았는데 문자열은 `skos:definition` 줄(:208)에 있다. TTL은 한 노드가
   여러 줄이라 상시 발생. 관례로 방어되지만 **인용문은 소재 줄**이 옳다.
3. **표 내부 행 인용** — "§2 접두사표(`ONTOLOGYSTYLE.md:150`)"인데 :150은 표의 한 행.
4. **이동표적 수치** — 병행 세션이 같은 워킹트리를 편집하면 `docs/verify/` 개수, 채널 항목 수,
   individuals가 저작→판정 사이에 바뀐다. **구조 주장이 뒤집혔는지**만 보고, 개수 차이는
   "원인(어느 파일이 늘었나)"까지 적어 note로 내린다. 문서가 caveat 박스를 이미 달았으면
   **수치를 다시 좇게 만들지 말 것**(추적은 그 문서의 목적이 아니다).

## 3. 계약 서술은 읽지 말고 **실행**한다 (샌드박스 2종)

"webui write path를 재사용하라"류 계약(C1–C8)은 코드 대조로 끝내면 약하다. 워킹트리를
건드리지 않고 실행 재현하는 두 경로:

**(A) ttl_writer 단독** — `ABOX_DIR`만 치환하면 된다:
```python
sys.path.insert(0,'tools'); sys.path.insert(0,'tools/webui'); import ttl_writer
ttl_writer.ABOX_DIR = SCRATCH_ABOX          # cp -r ontology/abox $SCRATCH/abox
```
- **C1(무쓰기)**: 호출 전후 전 파일 sha256 동일 → `plan_upsert`가 계획만 계산함을 증명.
- **C2(MERGE)**: `_existing_preds`로 on-disk 술어를 먼저 뽑고, payload 밖 술어가 `plan["new"]`에
  전부 남는지 확인(dropped=[]).
- **C3(낙관적 잠금)**: `{relpath: mtime}` stale → `Conflict`; **`{basename: mtime}` stale은
  Conflict 안 남**(= 보호 실패)까지 보여야 "키는 relpath"가 증명된다. 허용오차는 1e-7 편차가
  통과하는 것으로 확인(`ttl_writer.py:287-293`, `1e-6`).
- **C7**: 없는 subject → `plan["file"]`이 `authored.ttl`, `created=True`.

**(B) validate/lint 전체 그래프** — ★함정: **`lib.ONT_DIR`을 바꿔도 소용없다.**
`load_graph`는 `CATALOG = os.environ.get("HARNESS_CATALOG", ROOT/catalog-v001.xml)`
(`ontology_lib.py:44`)로 owl:imports를 해석하므로, ONT_DIR만 치환하면 **실제 repo 그래프가
로드되어 "주입했는데 위반 0"이라는 위양성 통과**가 나온다(실제로 한 번 났고 뒤집었다). 올바른 법:
```bash
cp -r ontology $S/repo/ontology; cp catalog-v001.xml $S/repo/
HARNESS_CATALOG=$S/repo/catalog-v001.xml /usr/bin/python3 …   # triples 수로 사본 로드 확인
```
- **"cap 초과는 write path를 조용히 통과한다"** 증명: 사본의 `skos:definition`을 1,470자로
  키워(367 token) → `validate.run_structured()["pass"] = True`(6축 전부 ✓) **AND**
  `lint_uniformity.check_text_cap` 위반 1건. 두 짝을 같이 보여야 "webui는 저장, CI가 잡음"이 된다.
- **"duplicates는 advisory"** 증명 함정: **노드를 복제하면 안 된다** — 새 노드는 reachability/
  assemblyOrder를 깨서 `pass=False`가 나오고(교란) advisory 주장이 거짓처럼 보인다. 반드시
  **기존 두 노드의 prefLabel을 동일화**(노드 수·엣지 불변)해서 `pass=True` + `duplicates=1`을 낸다.

## 4. 커버리지는 소스의 **열/절 단위**로 닫는다

5평면 매핑이면 평면 5개뿐 아니라 **소스 표의 열**까지 본다(v0.2 §2.1은 진리판정·변경률·원자단위·
안정식별자 4열인데 문서가 "변경률"만 사상 안 함 → 제외 사유가 없으면 coverage note).
(a)그대로/(b)감싸서/(c)새로에서 **"없음"은 사유가 붙어 있으면 GAP이 아니다**(명시적 제외).

## 5. 경계 판정 (멀티 세션 워킹트리)

`git status`만 보면 타 세션 산출물이 섞여 오판한다. **`git diff --stat HEAD -- <담당파일>`**로
이 dispatch의 기여를 분리하고, HEAD-absent 파일은 "타 세션 소유"로 목록만 남긴다(고치지 않음).
- 실사례: 브리프가 "새 파일 저작"을 전제했으나 파일은 이미 HEAD에 있었고(`git log --oneline`으로
  land 커밋 확인) developer가 정정만 했다 → **결함 아님**, 브리프 전제 정정으로 보고.
- `author: developer`인 문서가 `docs/plans/`에 있으면 CLAUDE.md 역할표의 developer 파일 경계
  (`ontology/abox/`) 밖이다 — 내용 결함은 아니나 프로세스 note로 남긴다.
