# 그래프 밖 스토어 + "계약 표면" 판정 절차 (plane-editor Phase 2 유형)

대상이 `ontology/` 밖의 JSON 스토어 + 전용 무결성 검사기 + "도구 층 상수를 복제하지 않고
계약 표면으로 소비"라고 주장하는 코드일 때. `validate.py`는 이런 스토어를 **아예 보지 않으므로**
판정 무게가 전부 "검사기가 실제로 무엇을 막나 / 주장한 단일 정의처가 진짜 단일인가"로 간다.

## 1. ★ negative control은 "요구 목록"이 아니라 **우회 목록**으로 다시 짠다

브리프가 5종을 요구하면 developer는 그 5종 fixture를 만들고 전부 FAIL시킨다 — 그건 자기가
통과시킨 모양의 집합이라 결함은 항상 그 밖에 있다. control에서 한 곳만 바꾸는 스크립트
(`copy.deepcopy(control)` → mutate → 진짜 검사기 호출)를 짜고 20~30 케이스를 돌리면 싸다.
실제로 잡힌 것(=규칙이 없는 구멍):
- **자기 자신을 겨냥한 링크**(from==to): `supersedes`만 순환검사에 걸리고 나머지 타입은 통과.
- **같은 간선을 다른 id로 중복**: 중복 규칙 없음.
- **타입의 `rdfs:range`가 graph 종단점에만 적용**: 같은 술어를 레코드 평면에 겨냥하면 무검사.
  + TBox 실측으로 "range가 선언된 술어가 몇 개인지" 세라 — 5종 중 2종뿐이면 "어휘 재사용을
  range까지 강제한다"는 문서 문장은 실제보다 강하다.
반대로 **fail-closed 확인**도 같이: 참조 스토어 파일이 없을 때 orphan/미해소로 FAIL하는지
(조용히 통과하면 그게 최악). exit 2(사용/입출력 오류)와 exit 1(위반)의 분리도 케이스로 굳힌다.

문법 우회는 대소문자·스킴 대문자·full IRI·후행공백·zero-width space·한 글자 뺀 유사 slug를
한 세트로 넣는다. 도메인 명시형(`id:core/<slug>`)은 **양성 대조**로 같이 넣어야 "문법이 좁아서
전부 FAIL"인 게 아님이 증명된다.

## 2. ★ "값 복제가 아니다"는 반사실로만 증명된다 — 도구 층을 갈아끼워라

`--emit-contract` 같은 계약 표면이 있어도, 소비자 쪽이 몰래 상수를 박아 뒀는지는 값을 바꿔 봐야
안다. 원본 도구는 다른 세션 소유라 손대면 안 되므로 **격리 사본 + env override**로 한다:
```
cp tools/*.py <scratch>/tools-cap40/ ; sed로 상수만 변경
HO_TOOLS_DIR=<scratch>/tools-cap40 HARNESS_CATALOG=<repo>/catalog-v001.xml python3 <checker>
```
`ontology_lib`은 ROOT를 자기 파일 위치에서 잡으므로 **HARNESS_CATALOG를 원본 repo 카탈로그로**
같이 줘야 그래프가 로드된다(안 주면 union이 비어 오탐).
측정은 "PASS/FAIL 뒤집힘"보다 **경계값 탐색**이 강하다: 소비자가 받아들이는 최대 입력 크기를
1자씩 올려 찾아 층마다 비교(예: 1043자 → cap만 바꾸면 163자, 추정기만 바꾸면 2087자).
층을 4개 만든다: ①원본 ②상수만 변경 ③추정기만 변경 ④**계약 파손**(심볼 삭제/표현 불가한
추정기) — ④에서 "조용한 기본값으로 흐르지 않고 exit 2로 멈추는가"가 진짜 안전성 항목이다.

## 3. 어휘 재사용 주장은 TBox를 변형해 반증한다

"기존 `ho:` 어휘만 재사용, 신조어 0"은 목록을 눈으로 봐선 증명이 안 된다. `ontology/`를 스크래치로
복사하고 `catalog-v001.xml`도 같이 복사한 뒤(카탈로그 경로는 자기 디렉토리 기준) `HARNESS_CATALOG`만
바꿔 검사기를 돌린다. 두 방향 모두 시험:
- 재사용한다는 술어를 `owl:AnnotationProperty`로 강등 → 검사기가 FAIL해야 한다.
- 평면 내부 전용 타입(`supersedes`)을 그래프 어휘로 신설 → 경계 위반으로 FAIL해야 한다.
끝나고 `git diff --stat -- ontology/`가 빈 출력인지 반드시 확인(원본 무접촉 증명).

## 4. 병행 lane과의 **버전 충돌**이 이 유형의 단골 결함

검사기가 자기 `STORE_VERSION`을 **남의 평면 스토어에도** 적용하면, 그 평면 소유 모듈이 버전을
올리는 순간 exit 2로 죽는다(실제 발생: annotation store가 v2로 승격 → 링크 검사기는 v1 고정).
판정법: 각 스토어의 실제 version을 읽고 소유 모듈의 `STORE_VERSION`/`SUPPORTED_STORE_VERSIONS`와
대조한 뒤, **fixture가 아니라 실사용 스토어**를 `--annotations` 등으로 물려 본다. developer가
자기 fixture 버전을 자기 상수에 맞춰 만들면 이 충돌이 스위트에서 절대 안 드러난다.
귀속은 `git show HEAD:<file>`로 가른다 — HEAD에서 같은 버전이면 lane 간 충돌(공동 책임),
HEAD에서 이미 달랐으면 저작 오류.

## 5. 공유 트리에서 안 쓰고 재기 (병행 dispatch 예절)

산출물을 덮어쓰는 스위트(`run-suite.mjs` → `suite-result.json` 등)는 **rsync로 스크래치에 복사 +
`ln -s <abs>/node_modules`** 후 거기서 돌린다. 내 결과가 in-tree 산출물과 sha256이 같으면
"내가 재생산한 표 = 트리의 표"가 증명되고 공유 파일은 무접촉이다. 측정 전후로 대상 파일
해시를 찍어 두면(다른 lane이 중간에 재생성해도) 시점 귀속이 남는다.

## 6. 결정론 측정 시 그래프 유래 필드 주의

검사기 JSON에 `counts.graphNodes` 같은 그래프 유래 값이 있으면, 다른 세션이 저작하는 동안
런 사이에 값이 바뀐다(356→364 실측). 비결정성이 아니라 **시점 의존**이므로, 같은 스냅샷 3회
byte-identical을 보이고 "이 JSON을 골든 산출물로 커밋하면 무관한 저작마다 diff" 라고 적어 둔다.

## 7. 무결합 증명으로 회귀 게이트를 귀속시킨다

"기존 스위트 수치 유지"류 게이트는 신규 코드가 그 수치를 건드릴 수 없음을 **import 양방향 grep
0건**으로 보이면 판정이 한 줄로 끝난다(수치 자체의 소유는 상대 lane에 귀속).

## 8. "어휘를 하드코딩에서 **그래프 파생**으로 바꿨다" 판정 (§3의 강화판)

병행 lane이 TBox 어휘를 폐기해 게이트가 red가 된 뒤, developer가 목록 상수를 없애고 파생으로
바꾸는 wave가 온다. 이때 판정은 "게이트가 초록인가"가 아니라 **"약화가 아니라 파생인가"**다.

- **하드코딩 소멸은 grep 한 줄로 끝난다**(`GRAPH_LINK_TYPES` 0건). 남아도 되는 상수는
  ①평면 내부 전용 타입 ②파생이 **겨누는 자리 이름**(클래스·술어·셰이프 이름)뿐 — **관계
  이름 목록**이 남아 있으면 그 자리가 결함이다. 소비자(편집기 JS)까지 같이 봐야 한다:
  검사기는 파생인데 UI가 목록을 들고 있으면 둘이 갈라진다(`--emit-contract` 소비 여부로 확인).
- **★developer의 상설 검사(C11류)와 겹치지 않는 변형을 골라라.** 그가 넣은 검사는 그가
  통과시킨 모양이다. 실제로 그의 C11은 "kind 추가 / 술어 은퇴"만 쟀다 → 나는 **반대 축**을
  쟀다: **새 술어 신설**(red→green, pred 68→69)과 **실사용 스토어가 쓰는 kind 은퇴**
  (green→red). 둘 다 처음으로 발화한 방향이다.
- **대상 타입 제약도 파생인지 따로 쟀다**(이름만 재사용이면 반쪽): `rdfs:range` 재선언으로
  negative fixture를 **PASS로 뒤집고**, 셰이프의 `sh:or`를 좁혀 통과하던 링크를 위반으로
  만든다. 셰이프 그래프는 데이터 union 밖이라 검사기가 **따로 파싱**하므로 별도 축이다.
- **emptiness는 축마다 따로 재라(비대칭이 나온다).** 술어 파생이 0이면 "링크 없는 **빈
  스토어**"까지 위반(fail-closed)인데, **kind 개체가 0인 것은 알람이 아니었다**. 그래프가
  관계를 술어→개체로 옮긴 뒤에는 사라질 축이 오히려 kind 쪽이다. 판정 문구는 "평가 불가는
  결과 없음이 아니다"가 **두 축 모두에** 적용되는지로 쓴다.
- **★파생은 허용 어휘를 넓힌다 — 그 폭을 실측하라.** 큐레이션된 5개가 "살아 있는 `ho:`
  ObjectProperty 전부"(68개)가 되면 조립 술어와 **링크 층 자신의 배관**(`linkTarget`·
  `linkKind`·`hasLink`)까지 타입으로 서명된다. 완충은 `rdfs:range`(실측 64/68 선언)뿐이고
  range 없는 것(`derivedFrom`·`specializes`·`linkTarget`·`linkKind`)은 무제약 통과한다.
  제안은 "코드 목록 복구"가 아니라 **그래프 선언에서 파생한 필터**로 낸다.
- **★kind 개체가 산문으로만 선언한 규범은 아무도 강제하지 못한다.** `ho:LinkKind` 정의에
  "Symmetric — author ONE link per pair, never mirrored"가 있는데 셰이프 필드는
  prefLabel/definition/traversalWeight뿐 → A→B·B→A 미러 쌍이 exit 0. 평면 코드로 닫으면
  하드코딩 복귀이므로 **schema(TBox) 확장 트리거**로 라우팅한다(CLAUDE.md 7번 규칙).
- **출력 채널별로 "조용한 생략 금지" 주장을 검사하라.** 상태(`kindForm.targetTypes`가
  `unavailable:…`)가 JSON엔 실리는데 **기본 text 모드엔 안 실리는** 실측이 나왔다 — 사람이
  읽는 경로가 기본 text면 그 주장은 반쪽이다.
- **폐기 어휘 정리의 정직성은 diff의 "type 아닌 줄"로 잰다**: `git diff -- '**/links.json'`
  에서 `"type"` 줄을 뺀 변경이 0이면 종단점·evidence를 슬쩍 고친 자리가 없다. 의미 보존은
  내 판단이 아니라 **대체 개체의 `skos:definition`이 "replacing the retired crisp X"라고
  말하는지**로 귀속시킨다. 스키마 차이(그래프 Link는 `linkWeight` 필수, 평면 레코드엔 없음)를
  README가 "결정 대기"로 적어 뒀는지도 정직성 항목이다.
- 파생 실험 인프라는 §3과 같다(`cp -r ontology` + `catalog-v001.xml` + `tools/*.py` →
  `HO_TOOLS_DIR`/`HARNESS_CATALOG`). 끝에 **원본 3파일 byte 비교 + `git status --porcelain --
  ontology` 항목 수 불변**으로 무접촉을 못 박는다(병행 lane이 동시에 쓰고 있으므로 `git diff`
  가 비어 있기를 기대하면 안 된다 — **항목 수 불변**이 옳은 기준).
- 무회귀 baseline은 `git show HEAD:<artifact>`의 **시나리오×레인 셀 1:1**. 이 lane처럼 여러
  wave가 미커밋으로 쌓여 있으면 산출물 전체 diff는 남의 wave 것이 섞이므로, 셀 표만 대조하고
  나머지 diff는 **직전 wave에 귀속**시켜 적는다.
