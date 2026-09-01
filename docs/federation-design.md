# Federation design: 사다리로 나뉜 두 저장소의 union 조립

하네스 지식을 여러 GitHub 저장소로 **연합(federate)** 하는 구조를 기록한다.
[`lu-w/auto`](https://github.com/lu-w/auto)가 자동차 온톨로지를 연합하는 방식과
같다 — 스키마·도구 저장소 하나와 데이터 저장소 하나 이상을, `owl:imports` +
Protégé 카탈로그로 **하나의 union 그래프**로 합친다.

**2026-09 재배치**: 저장소 분할 기준이 "스키마/데이터"에서 **추상화 사다리**로
바뀌었다 (agentic-knowledge-base 청크 d-0005). 아래 D1·D3·D4는 그대로이고,
D2(분할)만 사다리 기준으로 다시 실현되었다.

## 확정 결정

- **D1 — 연합 로딩 = `owl:imports` + 카탈로그.** union 그래프는 Protégé
  `catalog-v001.xml`(온톨로지 IRI → 로컬 파일)을 통해 `owl:imports`를 해석해
  조립한다. 디렉토리 glob도, git submodule도 아니다. 표준 OWL 연합 기본기다.
- **D2 — 사다리 기준 저장소 분할.** `harness-functional`(하네스의 ODD +
  functional: TBox 어휘 + SHACL shapes + 공용 도구) 대
  `harness-concrete`(하네스의 logical + concrete: union root + A-Box 중립 부품
  라이브러리 + 조립 명세). **어휘가 위, 개체가 아래**다.
- **D3 — 도메인 하위 네임스페이스.** 개체 IRI는
  `https://harness-ontology.dev/id/<domain>/<slug>`로 민팅해 독립 저장소끼리
  맨 slug에서 충돌하지 않게 한다. `core`는 중립 부품 라이브러리 예약어다.
- **D4 — 2단 검증 게이트.** 기여자가 로컬에서 `validate.py`를 돌리고, **또한**
  데이터 저장소 CI가 그것을 끌어와 PR을 게이트한다. 반-고아 / 반-drift /
  조립가능 보장은 **union** 위에서만 성립하므로, 검증은 언제나 합쳐진 union을
  대상으로 하고 단일 파일을 홀로 검증하지 않는다.

## union이 하중을 받는 불변식인 이유

세 보장 — 반-고아(도달성 + SHACL 연결성), 반-drift(통제 어휘), 조립가능
(capability 충족) — 은 전부 **하나로 합쳐 추론된 그래프**를 검증하는 데서
나온다 (근거: agentic-knowledge-base 청크 d-0014). 그러므로 연합은 "검증할
union이 하나 있다"를 보존해야 한다. `owl:imports` + 카탈로그가 정확히 그것을
준다 — import 폐포가 곧 union이다. 저장소를 가로지르는 간선(A의 개체가 B의
개체를 `hasComponent`)은 둘 다 union에 들어와야 도달·타입 검사가 되며, 이것이
D1(조립)과 D4(union 검증)가 한 설계의 양면인 이유다.

## 구조

### 저장소 배치 (D2)

```
harness-functional  (어휘 + 도구; ODD + functional 수준)
├── ontology/tbox/harness.ttl        # 어휘 (owl:Ontology .../schema)
├── ontology/shapes/harness-shapes.ttl  # SHACL — 검증 전용, import 안 함
├── tools/                           # validate·retrieve·materialize·gen_recipe_catalog·webui
├── HARNESS-ODD.md, ONTOLOGYSTYLE.md, docs/
└── catalog-v001.xml                 # schema 한 줄

harness-concrete   (개체 + 조립; logical + concrete 수준)
├── ontology/harness-ontology.ttl    # union ROOT — schema + 모든 core 유닛 import
├── ontology/abox/core/<group>/*.ttl # 중립 부품 라이브러리 (.../data/core/<type>)
├── recipes/<name>/<name>.ttl        # 조립 명세 (.../recipes/<name>)
├── catalog-v001.xml                 # 생성 파일 — CENTRAL/LOCAL/RECIPE 3블록
├── central/                         # harness-functional 체크아웃 (gitignored)
└── .github/workflows/validate.yml   # central validate.py를 끌어와 PR 게이트 (D4)
```

**functional은 개체를 담지 않고, concrete은 어휘를 정의하지 않는다.** 도구는
전부 functional에 있고 concrete이 `central/`로 체크아웃해 쓴다. concrete에서
작업하기 = concrete을 클론하고 functional을 `central/`로 클론한 뒤, TTL을
편집하고 union에 대해 `central/tools/validate.py`를 돌리고 PR을 연다.

### union 조립 방식 (D1)

1. **root 온톨로지**는 concrete의 `ontology/harness-ontology.ttl`이다 —
   `<https://harness-ontology.dev/ontology> a owl:Ontology`를 선언하고 schema
   IRI와 각 A-Box 유닛 IRI를 `owl:imports` 한다. **root가 개체 쪽에 있는 것이
   재배치의 핵심**이다: union의 대부분이 개체이고, 어휘는 그 한 부분이다.
2. `catalog-v001.xml`이 모든 온톨로지 IRI를 로컬 파일로 사상한다:

   | 온톨로지 IRI | 로컬 파일 | 저장소 |
   |---|---|---|
   | `…/schema` | `central/ontology/tbox/harness.ttl` | functional |
   | `…/ontology` (root) | `ontology/harness-ontology.ttl` | concrete |
   | `…/data/core/<type>` | `ontology/abox/core/<group>/<type>.ttl` | concrete |
   | `…/recipes/<name>` | `recipes/<name>/<name>.ttl` | concrete |

3. `tools/ontology_lib.load_graph()`가 카탈로그를 읽고 root IRI에서
   `owl:imports`를 따라 BFS하며 각 IRI를 로컬 파일로 해석해 한 번씩 파싱한다.
   import 폐포가 union이다. SHACL shapes는 **절대 import하지 않는다**
   (검증 전용이라 데이터 그래프에 섞이지 않는다).
4. 카탈로그나 root가 없으면 로더는 디렉토리 glob으로 **폴백**하므로 부분
   체크아웃에서도 로드된다.

**IRI는 위치 독립이다.** 2026-09 재배치에서 A-Box와 root가 저장소를 옮겼지만
IRI는 하나도 바뀌지 않았다 — 카탈로그의 경로만 바뀌었다. 이것이 카탈로그 기반
연합을 하드코딩 glob보다 택한 이유다.

### 카탈로그 생성 (드리프트 가드)

concrete의 카탈로그는 손으로 유지하지 않고
`central/tools/gen_recipe_catalog.py`가 디스크에서 결정론적으로 생성한다.
세 블록이 나온다:

- **CENTRAL** — functional의 카탈로그를 `central/` 접두어를 붙여 복사(schema).
- **LOCAL** — 이 저장소의 `ontology/**` 유닛(root + 모든 core 부품). 각 IRI는
  그 파일의 `owl:Ontology` 헤더에서 읽는다 — 경로에서 추측하지 않는다.
- **RECIPE** — `recipes/<name>/` 하나당 한 줄.

CI가 `--check` 모드로 돌려 디스크와 어긋나면 실패시킨다. 손으로 세 곳에
목록을 복제하던 시절 실제로 드리프트가 났고(카탈로그 누락으로 **부분** union만
로드된 채 검증이 통과), 이 생성기가 그 중복을 없앤다.

### IRI 하위 네임스페이스 (D3)

- **개체 IRI**: `https://harness-ontology.dev/id/<domain>/<slug>`.
  `<slug>`는 `ONTOLOGYSTYLE.md §2`의 접두사 + kebab 규약(`h-…`, `tool-…`,
  `gr-…`, `sp-…`, `c-…`)을 따른다. `<domain>`은 저장소·기여자 범위를 나타내는
  짧은 kebab 세그먼트이며 `core`는 중립 부품 라이브러리 예약어다.
- **온톨로지(문서) IRI**는 개체 IRI와 별개다: `…/data/<domain>`,
  `…/recipes/<name>`. 개체를 *담는 문서*의 IRI와 개체 자신의 IRI는 다르다는
  표준 OWL 관행이다.
- **Turtle에서는 prefix 바인딩으로만** 표현해 노드 본문을 그대로 둔다. 레시피는
  자기 도메인을 `@prefix id:`로, 중립 부품 참조를 `@prefix core:`로 묶는다.
  두 prefix가 같은 네임스페이스를 가리키면 union에서 같은 IRI로 해석되어
  cross-domain 간선이 성립한다.

### 검증 게이트 (D4)

두 단, 둘 다 **union**을 검증한다:

1. **기여자 로컬** — concrete에서 functional을 `central/`로 두고:

   ```bash
   git clone https://github.com/cpark90/harness-functional central
   HARNESS_CATALOG=catalog-v001.xml \
   HARNESS_ROOT_ONTOLOGY=https://harness-ontology.dev/ontology \
   python3 central/tools/validate.py            # 전체 union
   HARNESS_ROOT_ONTOLOGY=https://harness-ontology.dev/recipes/<name> \
   python3 central/tools/validate.py            # 레시피 하나 (schema+부품+그 레시피)
   ```

2. **concrete CI** — 자기 TTL과 functional을 체크아웃해 카탈로그로 union을
   조립하고 central `validate.py`를 돌린다. 비영 종료면 PR 체크 실패.
   PR이 레시피 디렉토리만 건드리면 바뀐 레시피만, 그 밖(카탈로그·워크플로·
   central 변경)이면 전 레시피를 검증한다.

**functional 쪽 게이트는 좁다.** 그 저장소에는 개체가 없으므로 `make validate`가
schema를 root로 삼아 TBox 정합성·라벨 중복·SHACL만 본다. 개체가 필요한
불변식(assemblyOrder, capability 충족, 도달성)은 인스턴스가 사는 concrete의
union 게이트가 강제한다.

`workflow_dispatch`가 필요한 이유: functional의 어휘가 바뀌면 레시피는 하나도
바뀌지 않아도 전 레시피 게이트를 다시 돌려야 한다 (HARNESS-ODD 조건부 규정).

## 새 데이터 저장소를 연합에 넣기

미래에 도메인별 부품 모음을 별도 저장소로 두려면 (a) 그 온톨로지 IRI + 로컬
경로를 카탈로그에 넣고 (b) 조립하는 root의 `owl:imports`에 올린다. 도구 코드는
바뀌지 않는다 — 그것이 카탈로그 기반 연합의 요점이다. 개체는
`…/id/<domain>/<slug>`, 중립 부품 참조는 `…/id/core/<slug>`로 쓰고, union
검증이 그 저장소를 가로지르는 하네스가 연결·타입 정합·조립가능함을 증명한다.

## 미해결

- **IRI 해석기(resolver)** — 여러 기계의 카탈로그가 합의하려면
  `https://harness-ontology.dev/…`가 실제로 해석되어야 한다(GitHub Pages 또는
  릴리스 타르볼, `auto`가 하는 방식). 지금은 카탈로그가 IRI를 로컬 클론으로
  사상하며, 로컬·CI 검증에는 충분하다.
- **webui의 도메인 인지 저작** — webui는 현재 `core` 도메인으로 저작한다.
  편집기에서 대상 도메인을 고르게 하는 것은 webui 범위의 후속 작업이며,
  로더와 데이터 모델은 이미 지원한다.
