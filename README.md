# harness-functional

**하네스의 functional 수준과 ODD를 담는 저장소** (구 `harness_ontology`).
agentic-knowledge-base의 추상화 사다리(functional → abstract → logical →
concrete → executable)로 하네스 지식을 재배치한 결과의 상단이다.

- **functional** — 하네스가 무엇으로 이루어지는가에 대한 **어휘**:
  OWL 2 TBox(`ontology/tbox/harness.ttl`)와 SHACL shapes
  (`ontology/shapes/`). functional 수준은 별도 파일이 아니라 어휘의 서술적
  사용(라벨·정의)으로 존재한다.
- **ODD** — 하네스 작업의 운영 설계 영역: [`HARNESS-ODD.md`](HARNESS-ODD.md).

**logical·concrete 수준은 여기 없다.** union root, A-Box 중립 부품
라이브러리, 조립 명세(레시피), 후보·선택 정책은 전부
[`harness-concrete`](../harness-concrete)(구 `harness-recipes`)에 있다.
일반 지식관리 방법론(3대 실패 모드, 형식 저장·좁은 읽기, 조립 워크플로,
토큰 예산, 교훈 승격)은 **agentic-knowledge-base의 결정 청크
d-0013~d-0017로 이송**되었다 — 여기서 다시 서술하지 않는다.

## Layout

```
ontology/tbox/harness.ttl     # 어휘 (functional): 클래스·프로퍼티·SKOS
ontology/shapes/              # SHACL — 검증 전용, catalog·import 밖
HARNESS-ODD.md                # 하네스 작업의 ODD
ONTOLOGYSTYLE.md              # TTL 저작 규칙 (concrete 저장소도 이 문서를 따름)
tools/                        # validate·retrieve·materialize 등 (양쪽 저장소가 공용)
catalog-v001.xml              # IRI→파일: schema만
```

IRI는 위치 독립이다 — 파일이 저장소 사이를 이동해도 IRI는 바뀌지 않고
catalog만 바뀐다.

## Validate

```bash
make validate     # schema + shapes 게이트 (TBox 정합성 · 라벨 중복 · SHACL)
```

전체 union(schema + 부품 + 레시피) 게이트는 harness-concrete에서 돈다 —
그쪽 CI가 이 저장소를 `./central/`로 체크아웃한다. retrieve(투영)도
인스턴스가 있는 concrete 쪽에서 실행한다.

## 어휘 확장

새 클래스·프로퍼티는 TBox에만 추가한다(개체는 concrete 저장소로).
저작 규칙은 `ONTOLOGYSTYLE.md`. 추가 후 `make validate` PASS 확인, 그리고
concrete 저장소의 catalog 재생성 + 전체 레시피 게이트 재실행 (HARNESS-ODD
조건부 규정).
