# plane-editor Phase 2 — 링크 평면 + 설계결정 평면 (ontology/ 밖 스토어)

브리프: `docs/plans/plane-editor-phase2-brief.md`(결정 1-(a)·2-(a)). 산출물:
`tools/plane-editor/{check_links.py,link-store/,src/link-plane.mjs,src/decision-plane.mjs,run-link-checks.mjs}`.
재사용 지식만 남긴다.

## 계약 표면 = 값 복제 금지의 유일한 구현법 (Node↔Python 경계)

도구 층 상수(`lint_uniformity.TEXT_CAP_TOKENS`)를 다른 런타임에서 쓰려면 **복제**가 아니라
**호출**이어야 한다. 패턴: 검사기 자신에 `--emit-contract` 모드를 달아 cap·어휘·평면·id 접두사를
JSON으로 내보내고, 편집기는 그것만 소비한다(상수 선언 0개).

- **추정기(chars/N)까지 읽어라.** cap 숫자만 읽고 나눗셈은 JS에 박으면 반쪽이다. `_text_tokens`에
  길이를 아는 리터럴을 물려 보고 N을 **역산**한다(27720=lcm(1..11)로 probe하면 어떤 작은 N도
  정확히 나온다 + 둘째 probe로 검증). 도구가 chars//8로 바뀌면 편집기 판정이 그대로 따라간다.
- **모르는 값이면 조용히 기본값 금지** — 추정기 문자열은 닫힌 집합(`^chars-div-(\d+)$`)으로
  파싱하고 아니면 throw. 함수 이름이 사라져도 "재구현하지 말고 계약을 다시 겨눠라"로 실패.
- **시험법(G2)**: 도구 층 위치를 env(`HO_TOOLS_DIR`)로 갈아끼우고 격리 사본에서 값을 바꿔
  판정이 움직이는지 본다(원본 무수정). `ontology_lib` 사본은 ROOT가 어긋나므로
  `HARNESS_CATALOG`를 실제 catalog로 지정하면 그래프 로드가 산다.
- **판정은 한 언어에만.** JS는 레코드 생성·정렬·직렬화, 판정(존재·어휘·경계·고아)은 Python
  검사기에 위임(spawnSync + `--format json`). 규칙을 두 런타임에 복제하면 그 순간 갈라진다.
  cap만 양쪽에서 적용하는데, 값이 같은 계약에서 오므로 복제가 아니다.

## ontology/ 밖 스토어의 무결성은 손으로 다시 만들어야 한다

`validate.py`가 안 보는 대신 검사기가 전부 진다. 실제로 이빨이 된 규칙:

1. graph 종단점 = `ontology_lib.instance_nodes` 실재 판정. **`reason=False`로 충분**하다 —
   추론 유무로 집합이 같아야 한다는 도구 층 불변식이 있고 실측도 356=356. 2.9s → 0.3s.
2. 표기 강제: `id:<slug>` / `id:<domain>/<slug>`만 허용(자유 형식 targets = GAP A2의 재발).
   도메인 생략 시 core로 해소하는 것이 중앙 union의 관례(`retrieve.py`의 IriTokenResolver).
3. **어휘 재사용은 range까지 지켜야 진짜다.** `ho:tagged`를 쓰면서 Concept 아닌 노드를 겨냥하면
   이름만 재사용이다. `rdfs:range` + 하위클래스 폐포를 TBox에서 **그때 계산**해 적용(하드코딩 금지).
4. **vocabulary-provenance**: 재사용한다고 적은 다섯 술어가 실제로 `owl:ObjectProperty`로
   선언돼 있는지, 그리고 평면 내부 전용 타입(`supersedes`)이 `ho:` 어휘에 **생기지 않았는지**
   양방향으로 본다. 후자는 평면/그래프 경계가 조용히 합쳐지는 것을 잡는 알람.
5. 단방향(평면→그래프): `from`이 graph면 역방향 인덱스 = 위반. 이 규칙이 없으면 "역방향 인덱스
   금지"가 문서에만 남는다.
6. 고아 = **양쪽 다** 미해소일 때만. 한쪽만 미해소면 그쪽 사유로 보고해야 negative control이
   서로 구분된다(안 그러면 사유 코드가 한 덩어리로 뭉개진다).

## negative control은 control에서 한 곳만 바꾼 사본으로

fixture 디렉토리 = `control/` + `negative-*/`(단 한 곳 변형). 러너는 **위반이 정확히 1건이고
사유 코드가 기대와 같은지**까지 본다 — 여러 코드가 함께 터지면 어느 규칙이 잡았는지 알 수 없어
대조군 구실을 못 한다. 변형은 스크립트로 생성해 formatting을 control과 맞추면 `diff`가 한 줄이라
vnv가 원인을 눈으로 확인한다. supersedes 순환 fixture는 status 정합 규칙과 겹치니 status도 같이
맞춰 코드 1건으로 유지.

## 결정론·경계

- 스토어 정렬은 **id 오름차순 하나만**. 내용 복합키는 Python 검사기가 같은 규칙을 다시 구현해야
  해서 드리프트가 생긴다(id는 유일하므로 총순서).
- 직렬화 결정론 시험 = 디스크 파일과 재직렬화 결과의 **byte 비교**(키 순서 드리프트까지 잡힘).
- 보고 경로는 repo 상대경로로 줄여 출력이 기계에 안 매이게(절대경로는 3회 byte 동일은 유지해도
  다른 세션·머신에서 흔들린다).
- 설계결정 평면은 **결정론 판정이 불가능한 유일한 평면**(논증의 타당성). 검사기는 형식만 보고
  커밋 조건은 `decided_by` 표기로 둔다 — 이 선을 코드 주석에도 박아 두면 나중에 "왜 여기만
  약한가"를 다시 묻지 않는다.
- 병행 dispatch 트리에서는 **신규 파일만** 만들고(`git status --porcelain` 전후 확인), 상대 산출물
  (`REPORT.md`·`suite-result.json`)은 읽지도 쓰지도 말 것. 자체 진입점(`run-link-checks.mjs`)을
  따로 파면 스위트 두 개가 서로를 안 건드린다.
