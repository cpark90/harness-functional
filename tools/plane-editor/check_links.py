#!/usr/bin/env python3
"""링크 평면 + 설계결정 평면 무결성 검사기 (Phase 2, 결정 2-(a)).

링크 스토어는 `ontology/` **밖**에 있다. 그래서 `validate.py`·`retrieve.py`는 이 파일들을
스캔하지 않고(= 그래프 재도입 금지 규칙을 자동 준수하고), 그 대가로 **무결성은 이 검사기가
전부 진다**. 단일 명령·비대화형·결정론이며 종료 코드로 통과/실패를 낸다.

  0 = PASS, 1 = 위반 있음(FAIL), 2 = 사용/입출력 오류

검사 축 (브리프 §3a 1~4 + 3b + 3c):

  1. graph 종단점 IRI 실재 — `ontology_lib.instance_nodes`로 판정한다(추정 금지).
     읽기 전용 import이며 `ontology/`는 건드리지 않는다.
  2. annotation/decision 종단점 레코드 실재 — 해당 평면의 스토어 파일에서 id로 판정.
     주석 종단점은 **(문서, 레코드 id)** 쌍으로만 해소된다: 레코드 id는 문서 안에서만
     유일하므로(`a1`은 문서마다 있다) 문서를 빼면 종단점이 남의 문서를 가리킬 수 있다.
     주석 스토어의 **버전은 주석 평면이 소유**하므로 이 검사기는 자기 버전을 강요하지 않고
     읽을 수 있는 버전 집합으로 협상하며, 읽을 수 없으면 명시적 사유로 거절한다.
  2a. 주석 종단점은 **문서 안의 위치**까지 가리킬 수 있다 — 레코드 id에서 멈추지 않는다.
     종단점에 `anchor`를 실으면 그 종단점은 "이 레코드"가 아니라 **그 레코드가 문서에서
     차지하는 자리**(인용 범위 / 그 범위가 든 블록)를 뜻한다. 값은 레코드가 **이미 가진**
     앵커 부분의 이름이다(`ENDPOINT_ANCHORS`) — 링크는 selector를 **복사하지 않는다**.
     복사하면 두 벌이 갈려 문서가 편집될 때 링크 쪽 사본만 낡기 때문이다(이 평면이 반복해
     겪은 실패 양식). 그래서 여기서 보는 것은 두 가지뿐이다: 표기가 닫힌 집합 안인가,
     그리고 **그 레코드가 그 부분을 실제로 싣고 있는가**(`annotation-anchor-missing`).
     위치로의 **해소**(그 문장이 지금 문서 어디인가)는 CRDT를 여는 일이라 이 게이트의
     몫이 아니다 — 편집기 쪽 바인더(`node bind-links.mjs`)가 스토어당 `loadStore`를 한 번
     불러 해소하고, 그 스토어를 열지 못하면 바인딩 0 + 사유를 자기 판정 JSON에 남긴다.
     (게이트 exit 0은 바인딩의 **필요조건이지 충분조건이 아니다** — 게이트가 서명해도
     편집기가 거절하는 모양이 실재한다: 문서 상태의 평문과 CRDT가 어긋나거나
     `yUpdateBase64`의 **내용**이 유효한 업데이트가 아닌 경우. 아래 3의 어휘 축과 달리 이
     축은 두 층이 공유하는 표면이 없어서 게이트가 원리적으로 볼 수 없고, 그래서 성질
     테스트가 그것을 `expectedDivergence` 부류로 **매 실행 측정**한다.)
     앵커가 orphan이면 그 링크는 여전히 **끊긴 종단점으로 보고**된다(위반이 아니다) —
     레코드가 저장 시점에 측정한 `anchorState` 경로를 그대로 쓴다. 조용히 지우거나 다른
     곳에 다시 겨누는 경로는 어느 층에도 없다.
  2b. 주석 스토어 계약 — 링크가 겨냥하든 말든 성립해야 하는 것. 편집기가 로드 시점에
     거절하는 모양을 커밋 게이트도 거절해야 하기 때문이다(한쪽만 막으면 파일이 게이트를
     통과한 채 편집기에서 터진다). **이 등가성이 불변식 I-1**이다.
       - 한 documentId를 **두 스토어**가 선언하면 위반이다. 문서를 복제하면 정체성이
         따라가므로 사고로 도달 가능하고, 색인이 조용히 덮어써지면 끊긴 종단점이 로드
         순서에 따라 사라진다(실측: vnv L1 — 인자 순서만 바꾸면 broken 1건이 0건이 됐다).
       - 레코드가 자기 스토어와 **다른 문서**를 주장하면 위반이다(실측: vnv L4).
       - 앵커를 실었는데 **문서 정체성이 없는** 레코드는 종단점을 묶지 못한다. 스토어 옆에
         있다는 사실은 정체성이 아니다(`src/store.mjs`의 입양 금지, vnv B3->B7 세탁 경로).
       - v3 레코드가 `anchors`를 통째로 싣지 않거나(`anchors` 없음 / `null`), 정체성도
         강등 표시도 없으면 **편집기 `loadStore`가 거절하는 모양**이므로 여기서도 위반이다
         (실측: vnv H3 — 이 모양들이 게이트를 exit 0으로 통과하며 종단점을 묶었다).
       - 한 스토어 안에 **같은 레코드 id가 둘** 있으면 위반이다. 편집기는 파일 순서의 첫
         레코드를 쥐고 검사기는 다른 쪽을 쥘 수 있어, 게이트가 서명한 종단점과 편집기가
         여는 종단점이 갈라진다(실측: vnv H4). 상태는 보수적으로 병합한다(불변식 I-2).
       - **fail-closed**: 검사기가 완전히 평가하지 못한 레코드(객체가 아님 · id가 문자열이
         아니거나 없음)는 건너뛸 대상이 아니라 **위반**이다(실측: vnv X2a-c — 조용히 건너뛴
         레코드 때문에 게이트가 exit 0을 주고 편집기가 같은 파일을 열지 못했다). 판정 JSON에
         "건너뜀"이라는 상태는 없고, 읽은 레코드 수를 `counts.annotationRecordsRead`로 낸다.
       - 스토어가 **자기 자리의 문서와 다른 문서**를 선언하면 위반이다(실측: vnv X1 — 정직한
         스토어를 남의 문서 옆으로 옮기는 것만으로 도달한다). 게이트는 CRDT를 해독하지 않으므로
         스토어의 `documentId`와 옆 `document.json`의 **평문** 필드를 견준다.
       - **문서 축도 fail-closed다.** 그 대조를 **할 수 없는** 경우(옆 `document.json`이 없다 /
         파싱되지 않는다 / 문서 상태(`yUpdateBase64`)가 없다 / 종단점을 묶는 스토어인데 평문
         `documentId`가 없다)는 건너뛸 대상이 아니라 위반이다(`annotation-store-document-
         unreadable`). 한때 이 세 자리가 조용히 넘어갔고, 셋 다 **파일을 옮기는 것만으로**
         도달하며 게이트는 exit 0 · 종단점 해소를 줬다(실측: vnv N1·N2·N6 — 진짜 `loadStore`는
         셋 다 거절한다). 스토어는 파일 하나가 아니라 **디렉토리**다.
       - 이 목록의 완결성은 **성질**로 주장한다: `게이트 accept <-> 편집기 accept`를 fixture
         스토어 전수에 적용한다(`run-link-checks.mjs` C9). 규칙의 단일 정의처는 주석 평면의
         `src/store-contract.mjs`이며, 그 표(`GATE_RULE_OF`)가 여기 규칙 이름과 짝을 이룬다.
  2c. **판정 범위는 발견(discovery)으로 정한다** — 호출 인자가 아니라(불변식 I-3).
     넘겨받은 파일만 보면 같은 문서를 선언한 스토어 둘 중 한쪽만 물려 끊긴 종단점을 다시
     숨길 수 있다(실측: vnv P2b — exit 0 · broken 0). 그래서 스토어 집합은
       (a) 링크 스토어가 사는 작업공간 루트(`.git`을 가진 첫 조상)의 `annotations.json` 전부,
       (b) 링크 스토어 디렉토리의 스토어 전부,
       (c) 지목된 스토어의 **형제 중 같은 문서를 선언한 것**(문서 정체성에 대해 닫힌 범위)
     로 정하고, 같은 실체를 가리키는 인자는 realpath로 정규화한다(같은 파일을 두 번 물려도
     "중복 선언"이 되지 않는다 — 실측: vnv P1b 위양성). (c)를 "형제 전부"로 넓히지 않는 것은
     무관한 문서의 결함이 새어 드는 위양성을 막기 위해서다 — 숨을 수 있는 것은 같은 문서를
     주장하는 스토어뿐이다. 끌려오지 않은 후보도 판정 JSON에 목록으로 남긴다. 같은 닫힘이
     **발견을 피하는 두 경로**도 막는다: 이름이 `annotations.json`이 아닌 스토어도 후보가 되고
     (실측: vnv Y3), 격리 표식은 **자기 subtree 안의 문서에 대해서만** 유효하다(실측: vnv Y2b —
     표식 한 줄로 끊긴 종단점이 사라졌다). 일부러 깨뜨려 둔 대조군 디렉토리는
     `.annotation-store-quarantine` 표식으로 **명시 제외**하며, 제외 사실·사유·제외된 스토어
     수도 판정 JSON에 실린다(조용한 제외 금지). 발견의 전제는 README "발견의 전제" 절에
     수치로 적혀 있고, 스위트가 매 실행 실측한다(`run-link-checks.mjs` C10).
  3. 링크 타입 어휘 — **그래프에서 파생한다**(목록을 코드에 박지 않는다). 예전에는 다섯
     술어를 상수로 들고 있었고, 그래프 재설계가 `ho:alternativeOf`·`ho:overlapsWith`를
     폐기하자 게이트가 통째로 red가 됐다(vocabulary-provenance 2건 -> 대조군 37개 붕괴).
     검사가 옳게 작동한 결과였지만 고칠 곳은 검사가 아니라 **어휘의 출처**다. 이제 레코드의
     `type`이 무엇을 가리키는지를 **표기로** 갈라 판정한다:
       (P) 술어형 `tagged` — 살아 있는 `ho:` `owl:ObjectProperty`의 local name. 집합은
           `ontology_lib.link_predicates(g)`가 TBox에서 전수 파생한다(도구 층 재사용 —
           그 함수 자체가 B14에서 화이트리스트를 없앤 자리다). 선언된 `rdfs:range`는
           graph 종단점에 그대로 적용한다.
       (K) 종류형 `id:kind-overlap` — `ho:LinkKind` **개체**. 재설계가 관계 종류를 개체로
           옮겼으므로 이쪽이 확장 지점이다: 새 관계 종류는 그래프에 개체 하나가 느는 것이고
           검사기는 **코드 변경 없이** 그것을 인정한다. 허용 대상 타입은 `ho:LinkShape`가
           `ho:linkTarget`에 건 `sh:or`에서 읽는다(술어형의 rdfs:range와 같은 자리 —
           `ho:linkTarget`은 prp-rng 세탁을 피하려고 rdfs:range를 **일부러** 두지 않는다).
       (I) 평면 내부형 `supersedes` — 닫힌 집합. 그래프 어휘가 **아니어야** 하며 `ho:`
           어휘에 나타나면 B9 경계를 다시 봐야 한다는 뜻이라 위반으로 잡는다.
     파생이라고 이빨이 빠지지는 않는다: 실재하지 않는 술어·kind를 주장하는 링크는 여전히
     `link-type-unknown`이고, 파생이 **비어 버리면**(그래프에 `ho:` 관계 술어가 하나도 없다)
     그 자체가 `vocabulary-provenance` 위반이다 — 평가 불가는 결과 없음이 아니다.
     이 성질(어휘를 하나 더하거나 지우면 판정이 따라 움직인다)은 `run-link-checks.mjs` C11이
     **그래프 사본을 변형해** 매 실행 실측한다(원본 `ontology/`는 건드리지 않는다).
  4. 고아 링크 0 — 양쪽 종단점이 모두 해소되지 않는 링크.
  5. 단방향(브리프 §3c) — 링크는 **평면 → 그래프** 방향으로만 연다. `from`이 graph면
     역방향 인덱스이므로 위반.
  6. 설계결정 평면 형식 — 필수 필드 / 상태 어휘 / 텍스트 cap / supersedes 순환·경계.
     이 평면은 결정론적 판정이 불가능한 유일한 평면이므로(논증의 타당성) 검사기는
     **형식만** 본다. 내용의 정당성은 `decided_by`가 가리키는 판정 주체의 몫이다.

## cap 계약 표면 (브리프 §5 — Phase 4 예고 조항)

cap 260과 그 추정기(chars/4)의 **유일 정의처는 도구 층**(`tools/lint_uniformity.py`)이다.
편집기(Node)는 프로세스 경계 때문에 그것을 import할 수 없으므로, 이 파일이 **얇은 어댑터**가
되어 값을 JSON으로 내보낸다:

    python3 tools/plane-editor/check_links.py --emit-contract

값은 복제하지 않는다. cap은 `lint_uniformity.TEXT_CAP_TOKENS`를 그대로 읽고, 추정기는
`lint_uniformity._text_tokens`를 **실제로 호출해 역산**한다(chars/N의 N을 probe로 얻는다).
도구 층에서 값이 바뀌면 이 검사기와 편집기의 판정이 함께 바뀐다 — 그것이 계약 표면의 뜻이다.
`HO_TOOLS_DIR`로 도구 층 위치를 바꿔 그 성질을 실험할 수 있다(원본 수정 없이 격리 사본으로).
"""
from __future__ import annotations

import argparse
import importlib
import json
import os
import re
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
REPO_ROOT = os.path.dirname(os.path.dirname(HERE))
# 도구 층 = repo의 tools/. 격리 실험용으로만 HO_TOOLS_DIR override를 허용한다.
TOOLS_DIR = os.path.abspath(os.environ.get("HO_TOOLS_DIR", os.path.dirname(HERE)))


def _repo_path(path: str) -> str:
    """보고용 경로 — repo 안이면 상대 경로로 줄여 출력이 기계에 덜 매이게 한다."""
    try:
        rel = os.path.relpath(path, REPO_ROOT)
    except ValueError:  # pragma: no cover - 다른 드라이브(비POSIX)
        return path
    return path if rel.startswith("..") else rel

DEFAULT_STORE = os.path.join(HERE, "link-store")
LINKS_FILE = "links.json"
DECISIONS_FILE = "decisions.json"
ANNOTATIONS_FILE = "annotations.json"
# 편집기가 문서 상태를 두는 파일. 스토어가 **자기 자리의 문서**와 어긋나는지 볼 때 읽는다.
DOCUMENT_FILE = "document.json"

# 발견(2c)에서 절대 내려가지 않는 디렉토리 — 작업공간의 내용이 아니다.
SCAN_SKIP_DIRS = frozenset({".git", "node_modules"})
# 일부러 깨뜨려 둔 스토어(대조군 fixture)를 **명시적으로** 발견 대상에서 뺀다. 조용히
# 건너뛰는 경로를 만들지 않으려고, 표식 파일의 첫 줄(사유)을 판정 JSON에 그대로 싣는다.
# 격리는 **자기 subtree 안의 문서에 대해서만** 유효하다 (아래 `annotation_scope` 참조).
QUARANTINE_MARKER = ".annotation-store-quarantine"
# 이름이 편집기의 것이 아닌 파일을 **스토어인지 싸게 보는** 예산. 머리 이만큼에 두 키가
# 보일 때만 전문을 파싱한다 (작업공간 전체를 매 실행 파싱하지 않으려는 타협이며, 이것이
# 발견의 전제 하나다 — README "발견의 전제" 절).
SNIFF_BYTES = 4096

# 이 검사기가 **소유한** 스토어(links.json / decisions.json)의 버전.
STORE_VERSION = 1

# 주석 스토어는 남의 평면 것이다. 그 버전과 **스토어 계약**을 소유한 것은
# `src/store-contract.mjs`이고, 여기서는 "읽을 수 있는 버전"만 선언해 협상한다 (자기 버전을
# 강요하면 실사용 스토어가 통째로 exit 2가 된다 — Phase 2 판정의 F1이 그 결함이다).
#   v1·v2 : 레코드 id는 읽히지만 **문서 정체성이 없다** -> 링크 종단점을 바인딩할 수 없다.
#   v3    : documentId + 레코드별 anchorState 를 싣는다 -> 종단점 바인딩·끊김 보고가 가능.
ANNOTATION_STORE_VERSIONS = (1, 2, 3)
ANNOTATION_BINDING_VERSION = 3
# 주석 평면의 현재 버전이 이 집합을 넘어서면 조용히 통과시키지 않고 알람을 울린다.
ANNOTATION_PLANE_MODULE = os.path.join(HERE, "src", "store-contract.mjs")
ANNOTATION_VERSION_RE = re.compile(r"export\s+const\s+STORE_VERSION\s*=\s*(\d+)")

ANCHOR_STATES = ("bound", "orphaned")

# 주석 종단점이 이름으로 가리킬 수 있는 **레코드 자신의 앵커 부분** (2a). 이름은 v3 레코드의
# `anchors` 키 그대로다 — 링크가 selector 값을 복사하는 대신 레코드가 이미 가진 것을 **참조**
# 한다는 사실을 표기 자체가 말하게 하려는 것이다.
#   textQuote    : 캡처된 인용 범위 = "이 문장/이 구절"
#   blockContext : 그 범위가 든 블록 = "이 문단"
# 이 목록은 그래프 어휘가 아니라 **평면 내부 어휘**이므로 여기가 단일 정의처이고, 편집기는
# `--emit-contract`의 `endpointAnchors`로 받아 쓴다(값 복제 금지). 늘리려면 게이트의 판정
# (레코드가 그 부분을 싣는가)과 바인더의 해소를 **함께** 늘려야 한다 — 한쪽만 늘리면
# 스위트가 그 자리에서 FAIL한다(`run-link-checks.mjs` C12).
ENDPOINT_ANCHORS = ("blockContext", "textQuote")

# 평면 이름 (Phase 0 §4.2). `graph`는 지식 그래프 평면 자신이다.
PLANES = ("annotation", "decision", "graph")
RECORD_PLANES = ("annotation", "decision")

# 링크 타입 어휘는 **그래프에서 파생한다** (docstring 3). 여기에 남는 상수는 그래프가
# 소유하지 **않는** 것 둘뿐이다: 평면 내부 전용 타입과, 파생이 겨누는 자리(클래스·술어·
# 셰이프의 이름). 관계 이름 목록 자체를 다시 들이지 말 것 — 그것이 이 wave가 없앤 결함이다.
#
# 설계결정 평면 **내부 전용** 타입. 그래프 어휘가 아니므로 graph 종단점을 겨냥할 수 없고,
# 반대로 `ho:` 어휘에 같은 이름이 생기면 평면/그래프 경계가 조용히 합쳐진 것이다(B9).
DECISION_INTERNAL_TYPES = ("supersedes",)
# 종류형이 겨누는 자리. 클래스 이름은 그래프의 확장 지점이고, 셰이프는 그 종류의 대상 타입을
# 선언하는 유일한 자리다(`ho:linkTarget`에는 rdfs:range가 일부러 없다).
LINK_KIND_CLASS = "LinkKind"
LINK_TARGET_PROPERTY = "linkTarget"
LINK_SHAPE_NAME = "LinkShape"
# 종류형의 표기 — graph 종단점과 **같은** IRI 표기를 쓴다(`id:<slug>`). 표기가 갈리면
# 술어형(bare local name)과 구별할 방법이 없어진다.
KIND_REF_PREFIX = "id:"

DECISION_STATUSES = ("open", "accepted", "superseded")

# id 표기: 평면별 접두사 + 소문자 kebab (ONTOLOGYSTYLE §2의 접두사 규율을 평면 스토어에
# 옮긴 것 — 그래프 IRI가 아니므로 §2 표 자체를 확장하지는 않는다).
ID_PREFIXES = {"link": "ln-", "decision": "dec-"}
ID_RE = re.compile(r"^[a-z][a-z0-9-]*$")

# graph 종단점 표기 `id:<slug>` / `id:<domain>/<slug>` (Phase 0 §4.2 P2). 도메인을 생략하면
# 중앙 union의 관례대로 core 네임스페이스로 해소한다(tools/retrieve.py:112-128과 같은 규약).
GRAPH_REF_RE = re.compile(r"^id:(?:([a-z][a-z0-9-]*)/)?([a-z][a-z0-9-]*)$")

LINK_KEYS_REQUIRED = ("id", "from", "to", "type", "created_by")
LINK_KEYS_OPTIONAL = ("evidence",)
DECISION_KEYS_REQUIRED = ("id", "title", "body", "status", "decided_by")
DECISION_KEYS_OPTIONAL = ("supersedes",)


class ContractError(RuntimeError):
    """도구 층에서 cap/추정기를 읽지 못했다 — 조용히 값을 복제하지 않고 실패한다."""


class StoreError(RuntimeError):
    """스토어 파일을 읽지 못했다(부재·JSON 오류·버전 불일치)."""


# --- 도구 층 계약 표면 ---------------------------------------------------------

def _import_tool(name: str):
    if TOOLS_DIR not in sys.path:
        sys.path.insert(0, TOOLS_DIR)
    try:
        return importlib.import_module(name)
    except Exception as exc:  # noqa: BLE001
        raise ContractError(f"cannot import {name} from {TOOLS_DIR}: {exc}") from exc


def _probe_estimator(lint) -> int:
    """도구 층의 토큰 추정기를 **호출해** chars/N의 N을 역산한다.

    상수를 베껴 오면 도구 층이 바뀌어도 편집기 판정이 안 바뀐다(= 계약이 아니라 복제).
    그래서 `lint_uniformity._text_tokens`에 길이를 아는 리터럴을 물려 보고 나눗셈 계수를
    되돌려 받는다. 읽기 전용이며 그래프를 로드하지 않는다."""
    try:
        from rdflib import Graph, Literal, URIRef
        from rdflib.namespace import SKOS
    except Exception as exc:  # noqa: BLE001
        raise ContractError(f"rdflib unavailable: {exc}") from exc
    text_tokens = getattr(lint, "_text_tokens", None)
    if text_tokens is None:
        raise ContractError(
            "tools/lint_uniformity.py no longer exposes the text-size estimator "
            "(_text_tokens) — the cap contract surface must be re-pointed, not guessed")
    probe = URIRef("urn:ho:cap-contract-probe")

    def tokens_for(chars: int) -> int:
        g = Graph()
        g.add((probe, SKOS.definition, Literal("x" * chars)))
        return int(text_tokens(g, probe))

    # 27720 = lcm(1..11): 어떤 작은 계수여도 나누어떨어져 역산이 정확하다.
    wide = tokens_for(27720)
    if wide <= 0:
        raise ContractError("estimator probe returned 0 tokens for 27720 chars")
    divisor = round(27720 / wide)
    if divisor < 1 or tokens_for(999) != 999 // divisor:
        raise ContractError(
            "cannot express the tool-layer estimator as chars//N — the editor must "
            "not re-implement it; re-point the contract surface instead")
    return divisor


def vocabulary(view) -> dict:
    """편집기·판정에 함께 실리는 **파생된** 링크 타입 어휘.

    목록을 코드에 두지 않는 대신, 그때 그래프에서 읽은 것이 무엇인지를 값으로 공개한다:
    파생이 조용히 비거나 뒤바뀌면 이 숫자가 먼저 움직인다(`run-link-checks.mjs` C11이 그
    성질을 그래프 사본으로 실측한다)."""
    predicates = view.graph_predicates()
    kinds = view.link_kinds()
    _closure, _declared, kind_target_status = view.kind_target_types()
    return {
        "source": "derived-from-graph",
        "predicateForm": {
            "spelling": "<localName>",
            "declaredAs": "owl:ObjectProperty",
            "namespace": str(view.lib.HO),
            "targetTypes": "rdfs:range of the predicate",
        },
        "kindForm": {
            "spelling": f"{KIND_REF_PREFIX}<slug>",
            "declaredAs": f"ho:{LINK_KIND_CLASS}",
            "targetTypes": f"ho:{LINK_SHAPE_NAME} sh:or on ho:{LINK_TARGET_PROPERTY} "
                           f"[{kind_target_status}]",
        },
        # 술어형은 68종 규모라 목록을 그대로 실으면 판정 JSON이 어휘 덤프가 된다. 확장 지점인
        # kind 목록은 작고 의미가 있으므로 그대로 싣는다(추가·삭제가 판정에서 바로 보인다).
        "graphVocabulary": sorted(predicates),
        "graphKinds": sorted(kinds.values()),
        "decisionInternal": list(DECISION_INTERNAL_TYPES),
    }


def contract(view=None) -> dict:
    """편집기가 소비하는 계약 표면. 값의 출처는 전부 도구 층·그래프다(복제 금지).

    cap은 `tools/lint_uniformity.py`에서, 링크 타입 어휘는 **그래프에서** 온다. 그래서 이
    함수는 그래프를 한 번 읽는다 — 호출자가 이미 뷰를 들고 있으면 그것을 물려 두 번 읽지
    않는다(`run()`이 그렇게 부른다)."""
    lint = _import_tool("lint_uniformity")
    cap = getattr(lint, "TEXT_CAP_TOKENS", None)
    if not isinstance(cap, int):
        raise ContractError(
            "tools/lint_uniformity.py no longer defines TEXT_CAP_TOKENS as an int")
    divisor = _probe_estimator(lint)
    return {
        "version": 1,
        "source": {
            "toolsDir": _repo_path(TOOLS_DIR),
            "module": "lint_uniformity",
            "capSymbol": "TEXT_CAP_TOKENS",
            "estimatorSymbol": "_text_tokens",
        },
        "textCap": {
            "tokens": cap,
            "estimator": f"chars-div-{divisor}",
            "charsPerToken": divisor,
            # cap이 적용되는 필드(설계결정 평면). §1c의 promptText+definition 합산과 같은 규율.
            "fields": ["title", "body"],
        },
        "planes": list(PLANES),
        "recordPlanes": list(RECORD_PLANES),
        "linkTypes": vocabulary(view if view is not None else GraphView()),
        "decisionStatuses": list(DECISION_STATUSES),
        "idPrefixes": dict(sorted(ID_PREFIXES.items())),
        "files": {
            "links": LINKS_FILE,
            "decisions": DECISIONS_FILE,
            "annotations": ANNOTATIONS_FILE,
        },
        "storeVersion": STORE_VERSION,
        "anchorStates": list(ANCHOR_STATES),
        # 주석 종단점이 이름으로 가리킬 수 있는 레코드 앵커 부분 (2a). 편집기·바인더는 이
        # 값을 받아 쓰고 자기 목록을 두지 않는다 — 늘리려면 두 층을 함께 가르쳐야 한다.
        "endpointAnchors": list(ENDPOINT_ANCHORS),
        # 주석 스토어는 남의 평면 소유다: 읽을 수 있는 버전 집합과, 종단점 바인딩에 필요한
        # 최소 버전, 그리고 그 평면이 지금 쓰고 있는 버전(알람용)을 그대로 내보낸다.
        "annotationStore": {
            "readableVersions": list(ANNOTATION_STORE_VERSIONS),
            "bindingVersion": ANNOTATION_BINDING_VERSION,
            "planeVersion": annotation_plane_version(),
            "planeModule": _repo_path(ANNOTATION_PLANE_MODULE),
        },
    }


# --- 스토어 읽기 ---------------------------------------------------------------

def _read_json(path: str) -> dict:
    if not os.path.exists(path):
        raise StoreError(f"missing store file: {path}")
    try:
        with open(path, encoding="utf-8") as fh:
            return json.load(fh)
    except json.JSONDecodeError as exc:
        raise StoreError(f"invalid JSON in {path}: {exc}") from exc


def _read_records(path: str, key: str, required: bool) -> list:
    """**이 검사기가 소유한** 스토어에서 레코드 배열을 꺼낸다 (links / decisions)."""
    if not required and not os.path.exists(path):
        return []
    data = _read_json(path)
    version = data.get("version")
    if version != STORE_VERSION:
        raise StoreError(f"unsupported store version in {path}: {version!r}")
    records = data.get(key)
    if not isinstance(records, list):
        raise StoreError(f"{path}: '{key}' must be an array")
    return records


def annotation_plane_version():
    """주석 평면이 선언한 현재 버전 (읽을 수 없으면 None). 드리프트 알람 전용이다."""
    if not os.path.exists(ANNOTATION_PLANE_MODULE):
        return None
    with open(ANNOTATION_PLANE_MODULE, encoding="utf-8") as fh:
        match = ANNOTATION_VERSION_RE.search(fh.read())
    return int(match.group(1)) if match else None


def _read_annotation_store(path: str) -> dict:
    """주석 스토어 하나를 **버전 협상**으로 읽는다.

    주석 평면의 스토어 버전은 이 검사기의 것이 아니다. 그래서
      - 읽을 수 있는 버전(`ANNOTATION_STORE_VERSIONS`)이면 읽고,
      - 아니면 **무엇이 문제인지 적어서** 거절한다(조용한 통과 금지),
      - 그리고 주석 평면이 이 집합을 넘어선 버전을 쓰기 시작했으면 그 사실 자체를 알람으로
        올린다 (검사기를 가르쳐야 한다는 신호이지, 값을 베껴 오라는 뜻이 아니다).
    """
    data = _read_json(path)
    version = data.get("version")
    if version not in ANNOTATION_STORE_VERSIONS:
        plane = annotation_plane_version()
        hint = ""
        if plane is not None and plane not in ANNOTATION_STORE_VERSIONS:
            hint = (f" — the annotation plane ({_repo_path(ANNOTATION_PLANE_MODULE)}) now writes "
                    f"version {plane}; teach this checker to read it instead of assuming a shape")
        raise StoreError(
            f"cannot read the annotation store {_repo_path(path)}: version {version!r} is outside "
            f"the readable set {list(ANNOTATION_STORE_VERSIONS)}{hint}")
    records = data.get("annotations")
    if not isinstance(records, list):
        raise StoreError(f"{path}: 'annotations' must be an array")
    document_id = data.get("documentId")
    if version >= ANNOTATION_BINDING_VERSION and not isinstance(document_id, str):
        raise StoreError(
            f"{_repo_path(path)}: a version {version} annotation store must declare its "
            "'documentId' — link endpoints are bound to (document, record)")
    return {
        "path": path,
        "version": version,
        "documentId": document_id if isinstance(document_id, str) else None,
        "records": records,
    }


def _record_shape(record, position: int):
    """레코드가 **해석 가능한 모양**인가. 반환 `(레코드 이름, 거절 사유 또는 None)`.

    한때 이 검사기는 dict가 아니거나 id가 문자열이 아닌 레코드를 조용히 건너뛰었다. 그
    건너뜀이 구멍이었다: 병합·도구 산출로 쉽게 도달하는 모양인데 게이트는 exit 0을 주고
    편집기는 같은 파일을 열지 못했다(실측: vnv X2a-c). **검사기가 완전히 평가하지 못한
    레코드는 결과가 없는 것이 아니라 위반이다** — 판정에 "건너뜀"이라는 상태는 없다.

    이름을 못 읽는 레코드는 파일 안 자리(`#3`)로 부른다. 그래야 위반이 어느 레코드에
    대한 것인지 결정론적으로 가리킬 수 있다.
    """
    at = f"#{position}"
    if not isinstance(record, dict):
        return at, "not-an-object"
    record_id = record.get("id")
    if not isinstance(record_id, str) or not record_id:
        return at, "no-record-id"
    return record_id, None


def _document_state(store_path: str, binds_endpoints: bool):
    """스토어 **옆의** 문서 상태(`document.json`)를 fail-closed 로 읽는다.

    반환 `(평문 documentId 또는 None, 거절 사유 또는 None)`.

    편집기는 정체성을 CRDT 상태에서 읽고(원본) 평문 필드는 사본으로 대조한다. 게이트는
    CRDT를 해독하지 않으므로 **평문 필드끼리** 대조한다 — 정직한 스토어를 남의 문서 옆으로
    옮기는 것(병합·rename·`git mv`)만으로 게이트가 초록을 주고 편집기가 거절하던 어긋남이
    이것으로 닫힌다(실측: vnv X1).

    한때 이 함수는 **읽지 못하면 None을 돌려주고 대조를 건너뛰었다.** 그 fail-open이 구멍
    이었다: 옆 문서 파일이 없거나(N1) 평문 필드가 없거나(N2) 파싱되지 않으면(N6) 게이트가
    exit 0 · 종단점 해소를 주는데 진짜 `loadStore`는 그 스토어를 열지 못했다 — 셋 다 파일을
    **옮기는 것만으로** 도달한다. 레코드 축에 쓴 규칙(`_record_shape`)을 문서 축에도 그대로
    적용한다: **평가할 수 없으면 위반이다.**

    평문 정체성은 **종단점을 묶는 스토어**(v3 이상 + 자기 documentId)에만 요구한다. v1·v2
    문서에는 정체성 자체가 없었으므로(하위호환 경로) 그 자리에서는 편집기도 요구하지 않는다
    (`src/store-contract.mjs documentStateContract`와 같은 기준).
    """
    path = os.path.join(os.path.dirname(store_path), DOCUMENT_FILE)
    if not os.path.isfile(path):
        return None, "absent"
    try:
        payload = _read_json(path)
    except StoreError:
        return None, "unparsable"
    if not isinstance(payload, dict):
        return None, "unparsable"
    state = payload.get("yUpdateBase64")
    if not isinstance(state, str) or not state:
        # 내용이 유효한 Yjs 업데이트인지는 **편집기만** 안다(게이트는 CRDT를 해독하지
        # 않는다). 여기서는 상태가 실려 있는지 모양까지만 본다.
        return None, "no-document-state"
    value = payload.get("documentId")
    if not isinstance(value, str) or not value:
        return None, ("unidentified" if binds_endpoints else None)
    return value, None


# 문서 상태를 평가하지 못한 사유 -> 위반 문면 (편집기의 `documentStateContract`와 1:1).
DOCUMENT_STATE_REASONS = {
    "absent": (f"has no {DOCUMENT_FILE} next to it at all. An annotation store is a directory, "
               "not a file: moving or exporting the store alone (backup, partial checkout, a "
               "gitignored document state) reaches exactly this shape, and no editor can open "
               "what it finds there"),
    "unparsable": (f"sits next to a {DOCUMENT_FILE} that cannot be read as an object (truncated "
                   "merge, half-written file). The checker does not skip what it cannot evaluate"),
    "no-document-state": (f"sits next to a {DOCUMENT_FILE} that carries no 'yUpdateBase64' "
                          "document state, so there is nothing for the editor to open"),
    "unidentified": (f"sits next to a {DOCUMENT_FILE} that carries no plaintext 'documentId'. "
                     "That field is the only surface both layers share - this checker does not "
                     "decode CRDT state - so a store that binds endpoints cannot be checked "
                     "against the document it sits next to without it"),
}


def _record_document(record: dict):
    """v3 레코드가 **스스로 싣고 있는** 문서 정체성과, 편집기가 그 모양을 읽을 수 있는지.

    반환은 `(주장한 id, 로드 불가 사유 또는 None)`이다. 사유가 있으면 편집기
    (`src/store.mjs loadStore`)가 그 스토어를 통째로 거절하는 모양이므로 커밋 게이트도
    거절해야 한다(불변식 I-1).

    한때 여기서는 `anchors`가 없는 레코드를 "투영 모양"으로 보아 그냥 통과시켰다. 그
    관대함이 구멍이었다: 정체성 없는 레코드에서 `anchors`를 **지우기만** 하면 게이트가
    exit 0으로 종단점을 묶었고, 편집기는 같은 파일을 열지 못했다(실측: vnv H3). 검사기가
    읽는 것은 id·anchorState뿐이지만, **읽지 않는 필드가 없어도 된다는 뜻은 아니다.**
    """
    anchors = record.get("anchors")
    if not isinstance(anchors, dict):
        return None, "no-anchors"
    document = anchors.get("document")
    if isinstance(document, dict) and isinstance(document.get("id"), str) and document["id"]:
        return document["id"], None
    if anchors.get("legacy"):
        # 강등 표시가 있는 미상 레코드 = 편집기가 그대로 읽는 모양(sticky). 위반은 아니지만
        # 종단점을 묶지는 못한다.
        return None, None
    return None, "unmarked"


def _record_anchor_parts(record: dict) -> set:
    """레코드가 **실제로 싣고 있는** 앵커 부분 (종단점이 이름으로 가리킬 수 있는 것, 2a).

    링크는 selector를 복사하지 않고 참조하므로, 레코드에 그 부분이 없으면 종단점이 가리킬
    자리 자체가 없다 — 그것이 `annotation-anchor-missing`이다. 게이트가 여기서 보는 것은
    **실림의 사실**뿐이고(값의 해소는 CRDT를 여는 일이라 편집기 몫), 부재는 파일만 보고
    판정할 수 있으므로 두 층이 같은 답을 낸다.

    `blockContext`는 앵커가 블록 경계를 걸치면 정상적으로 `null`이다(`src/anchors.mjs`) —
    즉 이 부재는 손상이 아니라 그 레코드가 블록 단위 위치를 **주장하지 않는다**는 뜻이고,
    그래서 없는 부분을 가리키는 링크 쪽이 틀린 것이다.
    """
    anchors = record.get("anchors")
    if not isinstance(anchors, dict):
        return set()
    parts = set()
    quote = anchors.get("textQuote")
    if isinstance(quote, dict) and isinstance(quote.get("exact"), str) and quote["exact"]:
        parts.add("textQuote")
    block = anchors.get("blockContext")
    if isinstance(block, dict) and isinstance(block.get("itemId"), str) and block["itemId"]:
        parts.add("blockContext")
    return parts


# 편집기가 거절하는 레코드 모양 -> 게이트가 그대로 옮겨 적는 사유 (불변식 I-1).
UNLOADABLE_REASONS = {
    "not-an-object": ("is not an object at all, so nothing in it can be read — the checker does "
                      "not skip what it cannot evaluate"),
    "no-record-id": ("carries no string id, so no endpoint can name it — the checker does not "
                     "skip what it cannot evaluate"),
    "no-anchors": ("carries no 'anchors' object at all (field absent or null), so it cannot say "
                   "which document it belongs to"),
    "unmarked": ("declares neither its own document identity (anchors.document.id) nor a "
                 "provenance mark (anchors.legacy)"),
}


# --- 스토어 발견 (2c / 불변식 I-3) ---------------------------------------------

def _looks_like_annotation_store(payload) -> bool:
    return (isinstance(payload, dict) and isinstance(payload.get("annotations"), list)
            and "version" in payload)


def _quarantine_reason(directory: str):
    """디렉토리가 발견 대상에서 빠졌다고 **선언**했는가. 반환은 사유 문자열."""
    marker = os.path.join(directory, QUARANTINE_MARKER)
    if not os.path.isfile(marker):
        return None
    with open(marker, encoding="utf-8") as fh:
        for line in fh:
            line = line.strip()
            if line and not line.startswith("#"):
                return line
    return "(no reason given)"


def workspace_root(store_dir: str):
    """링크 스토어가 사는 작업공간(저장소) 루트 = `.git`을 가진 첫 조상. 없으면 None.

    작업공간 밖(임시 디렉토리 등)에서 돌 때 루트를 억지로 지어내지 않는다 — 대신 판정
    JSON의 `workspaceRoot`가 null이 되어 "이 판정의 발견 범위는 인자가 지목한 디렉토리
    뿐"이라는 사실이 드러난다.
    """
    current = os.path.abspath(store_dir)
    while True:
        if os.path.isdir(os.path.join(current, ".git")):
            return current
        parent = os.path.dirname(current)
        if parent == current:
            return None
        current = parent


def _sniff_annotation_store(path: str) -> bool:
    """이름이 편집기의 것이 아닌 파일이 **주석 스토어인가**를 싸게 본다.

    머리 `SNIFF_BYTES` 안에 두 키가 보일 때만 전문을 파싱한다. 이름을 바꾸는 것만으로
    발견을 피하던 경로(실측: vnv Y3)를 닫으면서도 작업공간의 모든 JSON을 매 실행 파싱하지
    않기 위한 예산이며, 이 예산 자체가 발견의 전제 하나다(README "발견의 전제").
    """
    try:
        with open(path, "rb") as fh:
            head = fh.read(SNIFF_BYTES)
    except OSError:
        return False
    if b'"annotations"' not in head or b'"version"' not in head:
        return False
    try:
        payload = _read_json(path)
    except StoreError:
        return False
    return _looks_like_annotation_store(payload)


def _stores_under(root: str) -> list:
    """격리된 subtree 안의 스토어 목록 (판정하지 않고 **무엇이 가려졌는지** 알기 위해서만).

    격리 트리는 일부러 깨뜨려 둔 파일이 사는 곳이므로 여기서는 아무것도 raise 하지 않는다.
    """
    found: list = []
    for current, dirnames, filenames in os.walk(root):
        dirnames[:] = [name for name in sorted(dirnames) if name not in SCAN_SKIP_DIRS]
        for name in sorted(filenames):
            if name.endswith(".json") and _sniff_annotation_store(os.path.join(current, name)):
                found.append(os.path.join(current, name))
    return found


def scan_annotation_stores(root: str, named_only: bool) -> dict:
    """`root` 아래의 주석 스토어를 발견한다.

    반환 `{found, unnamed, quarantined, quarantinedStores}`:
      found            — 곧바로 판정에 넣는 스토어
      unnamed          — 이름이 `annotations.json`이 아니어서 **후보로만** 둔 스토어
                         (작업공간 훑기에서만 생긴다; 범위 안 문서를 선언하면 끌려온다)
      quarantined      — (디렉토리, 사유)
      quarantinedStores— 격리 표식 아래에서 발견된 스토어와 그 격리 루트

    `named_only`(작업공간 루트 훑기)는 **편집기가 쓰는 파일 이름**(`annotations.json`)을
    무조건 판정하고, 다른 이름의 JSON은 sniff로 후보에만 올린다 — 저장소 전체를 무조건
    판정하면 남의 결함이 내 판정으로 새어 든다(위양성). 반대로 호출자가 **지목한
    디렉토리**는 이름과 무관하게 통째로 판정한다: 스토어 하나를 지목하면 그 디렉토리의
    형제 스토어도 함께 판정된다(한 파일만 골라 물려 쌍둥이 스토어를 숨기는 P2b 경로를 닫는다).
    """
    result = {"found": [], "unnamed": [], "quarantined": [], "quarantinedStores": []}
    root = os.path.abspath(root)
    if not os.path.isdir(root):
        return result
    reason = _quarantine_reason(root)
    if reason is not None:
        result["quarantined"].append((_repo_path(root), reason))
        result["quarantinedStores"].extend((path, root) for path in _stores_under(root))
        return result
    for current, dirnames, filenames in os.walk(root):
        keep = []
        for name in sorted(dirnames):
            if name in SCAN_SKIP_DIRS:
                continue
            directory = os.path.join(current, name)
            marker = _quarantine_reason(directory)
            if marker is None:
                keep.append(name)
            else:
                result["quarantined"].append((_repo_path(directory), marker))
                result["quarantinedStores"].extend(
                    (path, directory) for path in _stores_under(directory))
        dirnames[:] = keep
        for name in sorted(filenames):
            if not name.endswith(".json"):
                continue
            path = os.path.join(current, name)
            if name == ANNOTATIONS_FILE:
                # 편집기가 쓰는 이름이다. 읽을 수 없으면 조용히 건너뛰지 않는다 —
                # 건너뛰는 순간 "이름만 바꾸면 게이트를 피한다"의 반대편 구멍이 열린다.
                payload = _read_json(path)
                if not _looks_like_annotation_store(payload):
                    raise StoreError(
                        f"{_repo_path(path)} is named {ANNOTATIONS_FILE} but is not an annotation "
                        "store (no 'annotations' array with a 'version'); rename it or declare "
                        f"the directory with a {QUARANTINE_MARKER} marker")
                result["found"].append(path)
                continue
            if named_only:
                if _sniff_annotation_store(path):
                    result["unnamed"].append(path)
                continue
            try:
                payload = _read_json(path)
            except StoreError:
                continue  # 지목된 디렉토리 안의 남의 JSON — 주석 스토어가 아니다.
            if _looks_like_annotation_store(payload):
                result["found"].append(path)
    return result


def _declared_document(path: str):
    """스토어가 **선언한** documentId만 싸게 읽는다 (버전 판정 없이). 못 읽으면 None."""
    try:
        payload = _read_json(path)
    except StoreError:
        return None
    if not _looks_like_annotation_store(payload):
        return None
    document = payload.get("documentId")
    return document if isinstance(document, str) else None


def _within(path: str, root: str) -> bool:
    """`path`가 `root` **안에** 있는가 (격리 경계를 넘는지 판정할 때 쓴다)."""
    return os.path.realpath(path).startswith(os.path.realpath(root) + os.sep)


def annotation_scope(store_dir: str, annotation_paths: list) -> dict:
    """판정할 주석 스토어 집합을 **발견으로** 정한다 (불변식 I-3).

    두 갈래로 넓힌다. 명시 인자는 **더해질 뿐 빼지 못한다**.

      (1) **작업공간 루트**(`.git`을 가진 첫 조상) 아래에서 편집기가 쓰는 이름
          (`annotations.json`)의 스토어를 전부 찾는다 — 커밋 게이트가 무엇을 판정하는지가
          호출 인자에 좌우되지 않게 하는 쪽.
      (2) 지목된 스토어·링크 스토어의 **디렉토리**를 훑어, **이미 범위 안에 있는 문서를
          선언한** 스토어를 끌어들인다(문서 정체성에 대해 닫힌 범위). "한 문서 = 한 스토어"
          라는 불변식은 그 문서의 스토어를 **전부** 봐야 검사할 수 있고, 한쪽만 물리는
          호출이 정확히 그 점을 이용해 끊긴 종단점을 숨겼다(실측: vnv P2b).

    (2)를 "그 디렉토리의 모든 스토어"로 넓히지 않는 이유는 위양성이다: 서로 무관한 문서의
    스토어를 한 디렉토리에 모아 둔 작업 트리(적대 프로브의 scratch가 그렇다)에서 남의 결함이
    내 판정으로 새어 든다. 대신 **같은 문서를 주장하는 것만** 끌어온다 — 숨을 수 있는 것은
    그것뿐이기 때문이다. 끌려오지 않은 후보도 판정 JSON에 목록으로 남긴다(조용한 제외 금지).

    같은 닫힘이 **발견을 피하는 두 경로**도 함께 막는다. 둘 다 "범위 안 문서를 선언한
    스토어는 판정을 피할 수 없다"는 한 성질의 따름이다.

      - **이름**: 이름이 `annotations.json`이 아니어서 작업공간 훑기에 걸리지 않은 스토어도
        후보가 되고, 범위 안 문서를 선언하면 끌려온다(실측: vnv Y3 — 이름만 바꾼 쌍둥이가
        발견에서 빠지고 흔적도 없었다). 다른 문서를 선언한 것은 `outOfScope`에 남는다.
      - **격리 표식**: 격리는 **자기 subtree 안의 문서에 대해서만** 유효하다. 격리 밖에서
        판정되는 문서를 선언한 스토어는 표식으로 가려지지 않는다(실측: vnv Y2b — 표식 한
        줄로 끊긴 종단점이 사라졌다). 대조군 트리처럼 그 문서가 격리 안에만 사는 경우에는
        격리가 그대로 유효하므로, 일부러 깨뜨려 둔 fixture 는 계속 제외된다.
    """
    explicit = []
    seen = set()
    for path in annotation_paths:
        real = os.path.realpath(path)
        if real in seen:
            continue
        seen.add(real)
        explicit.append(real)

    root = workspace_root(store_dir)
    scanned: list = []
    quarantined: dict = {}
    discovered: list = []
    # 판정에 넣지 않은 후보. 무엇이 왜 빠졌는지가 판정 JSON에 남아야 조용한 제외가 없다.
    candidates: list = []

    def take(scan: dict) -> None:
        for path in scan["found"]:
            real = os.path.realpath(path)
            if real not in seen:
                seen.add(real)
                discovered.append(real)

    def add_candidate(path: str, reason: str, quarantine=None) -> None:
        real = os.path.realpath(path)
        if real in seen:
            return
        for row in candidates:
            if row["path"] != real:
                continue
            # 호출자가 그 디렉토리를 **직접 지목**해 다시 찾은 후보는 격리가 더 이상 가리지
            # 않는다 — 격리는 발견을 막는 표식이지, 지목을 무르는 표식이 아니다.
            if quarantine is None and row["quarantine"] is not None:
                row["quarantine"] = None
                row["reason"] = reason
            return
        candidates.append({"path": real, "reason": reason, "quarantine": quarantine})

    def absorb(scan: dict) -> None:
        quarantined.update(dict(scan["quarantined"]))
        take(scan)
        for path in scan["unnamed"]:
            add_candidate(path, "not-named")
        for path, quarantine_root in scan["quarantinedStores"]:
            add_candidate(path, "quarantined", quarantine_root)

    # 무조건 판정하는 것: 작업공간 루트가 가진 스토어 + **링크 스토어 자신의 디렉토리**.
    # 뒤쪽은 옛 기본값(`<store>/annotations.json`)을 이름에 매이지 않게 넓힌 것이다.
    if root is not None:
        real_root = os.path.realpath(root)
        scanned.append(real_root)
        absorb(scan_annotation_stores(real_root, named_only=True))
    real_store_dir = os.path.realpath(store_dir)
    if real_store_dir not in scanned:
        scanned.append(real_store_dir)
        absorb(scan_annotation_stores(real_store_dir, named_only=False))

    # 조건부: 지목된 스토어의 **형제**는 같은 문서를 주장할 때만 끌어온다 (아래 닫힘).
    for directory in [os.path.dirname(p) for p in explicit]:
        if directory in scanned:
            continue
        scanned.append(directory)
        scan = scan_annotation_stores(directory, named_only=False)
        quarantined.update(dict(scan["quarantined"]))
        for path in scan["found"]:
            add_candidate(path, "another-document")
        for path, quarantine_root in scan["quarantinedStores"]:
            add_candidate(path, "quarantined", quarantine_root)

    # 문서 정체성에 대한 닫힘: 범위 안 문서를 주장하는 후보를 더 이상 없을 때까지 끌어온다.
    pulled = True
    while pulled:
        pulled = False
        declarers: dict = {}
        for path in explicit + discovered:
            document = _declared_document(path)
            if document is not None:
                declarers.setdefault(document, []).append(path)
        for row in list(candidates):
            document = _declared_document(row["path"])
            if document is None or document not in declarers:
                continue
            if row["quarantine"] is not None and not any(
                    not _within(path, row["quarantine"]) for path in declarers[document]):
                # 그 문서를 판정하는 스토어가 전부 같은 격리 안에 있다 = 격리가 자기 안의
                # 문서를 가린 것이므로 유효하다(대조군 fixture 트리가 이 경우다).
                continue
            candidates.remove(row)
            seen.add(row["path"])
            discovered.append(row["path"])
            pulled = True
    excluded: dict = {}
    for row in candidates:
        if row["quarantine"] is not None:
            excluded[_repo_path(row["quarantine"])] = excluded.get(
                _repo_path(row["quarantine"]), 0) + 1
    return {
        "workspaceRoot": _repo_path(root) if root else None,
        "roots": sorted(_repo_path(directory) for directory in scanned),
        "explicit": sorted(_repo_path(path) for path in explicit),
        # 호출자가 **이름을 댄** 경로 (읽지 못하면 사용 오류로 멈춘다 — 발견분과 다르다).
        "named": sorted(explicit),
        "discovered": sorted(_repo_path(path) for path in discovered),
        # 발견은 됐지만 판정에 넣지 않은 것 + 그 사유. 격리로 빠진 것은 아래 quarantined 의
        # excluded 수로 세고, 여기에는 **다른 문서**의 스토어만 목록으로 남긴다.
        "outOfScope": sorted(
            ({"path": _repo_path(row["path"]), "reason": row["reason"]}
             for row in candidates if row["quarantine"] is None),
            key=lambda row: (row["path"], row["reason"])),
        "quarantined": [{"path": path, "reason": reason, "excluded": excluded.get(path, 0)}
                        for path, reason in sorted(quarantined.items())],
        "paths": sorted(explicit + discovered),
    }


def _binds_endpoints(store: dict) -> bool:
    """이 스토어가 링크 종단점을 묶을 수 있는가 = **문서 정체성을 실은 v3 이상**인가.

    버전과 documentId를 함께 본다: 옛 버전 파일에 documentId만 손으로 적어 넣어도 v3 레코드
    계약(자기 정체성·측정된 anchorState)은 성립하지 않기 때문이다.
    """
    return store["documentId"] is not None and store["version"] >= ANNOTATION_BINDING_VERSION


def _merge_anchor_state(first, second):
    """같은 (문서, 레코드)를 두 스토어가 실었을 때의 상태 병합 — **덮어쓰지 않는다**.

    모름이 이기고, 그다음 orphaned가 이긴다. 즉 어느 쪽이 먼저 로드되든 결과가 같고
    (교환법칙), 끊긴 종단점이 다른 스토어의 `bound` 뒤에 숨지 않는다(실측: vnv L1은
    인자 순서에 따라 broken 1건이 0건으로 사라졌다).
    """
    if first not in ANCHOR_STATES or second not in ANCHOR_STATES:
        return None
    return "orphaned" if "orphaned" in (first, second) else "bound"


def annotation_index(paths: list, named: set = frozenset()) -> dict:
    """주석 스토어들을 읽어 종단점 해소용 색인을 만든다.

    bound      : (documentId, recordId) -> {anchorState, parts, store}
    unbound    : recordId -> store  (문서 정체성이 없는 옛 **스토어** = 바인딩 불가)
    unbindable : (documentId, recordId) -> store  (스토어는 정체성을 선언했지만 **레코드가**
                 자기 정체성을 싣지 않았다 = 출처 미상. 동거로는 정체성을 얻지 못한다)
    duplicates : documentId -> [스토어 경로]  (같은 문서를 선언한 스토어가 둘 이상)
    duplicateRecords : (스토어 경로, recordId, 개수)  (한 스토어 안 중복 레코드 id)
    unloadable : (스토어 경로, recordId, 사유코드)  (편집기가 거절하는 레코드 모양)
    unreadable : (스토어 경로, 사유)  (발견됐지만 이 검사기가 읽을 수 없는 스토어)
    mismatched : 레코드가 자기 스토어와 **다른 문서**를 주장한 목록
    documents  : 선언된 documentId 집합

    **인자 순서에 의존하지 않는다**: 같은 종단점을 여러 레코드가 주장하면 상태를 교환법칙
    병합(모름 > orphaned > bound)으로 합치고, "묶을 수 없다"가 언제나 이긴다. 그래서 어떤
    순서로 읽어도 판정 JSON이 같다(실측 기준: vnv L1/L1b · H4 두 파일 순서).

    **읽을 수 없는 스토어의 처리는 지목됐는지에 따라 갈린다**(`named` = 호출자가 이름을 댄
    경로들). 지목한 스토어를 읽지 못하면 그것은 사용 오류이므로 사유와 함께 **멈춘다**
    (exit 2, 버전 협상 계약). 반면 **발견된** 스토어를 읽지 못하는 것은 작업공간에 관한
    사실이므로 판정을 멈추지 않고 **위반으로 보고**한다(exit 1) — 멈추면 읽을 수 없는 파일
    하나가 나머지 전부의 판정을 가려 버린다. 어느 쪽이든 조용히 건너뛰지는 않는다.
    """
    unbound, stores = {}, []
    declared: dict = {}
    mismatched: list = []
    unloadable: list = []
    unreadable: list = []
    duplicate_records: list = []
    document_mismatch: list = []
    document_state: list = []
    entries: dict = {}
    # 판정이 **해석한** 레코드 수. 스토어가 실은 레코드 수와 반드시 같아야 한다 — 다르면
    # 어딘가에서 조용히 건너뛴 것이므로 그 자체가 계약 위반이다(fail-closed 자기검사).
    accounted = 0
    for path in sorted(paths):
        try:
            store = _read_annotation_store(path)
        except StoreError as exc:
            if os.path.realpath(path) in named:
                raise
            unreadable.append((_repo_path(path), str(exc)))
            continue
        stores.append(store)
        # 문서 축은 **모든** 스토어에 대해 평가한다: 편집기는 어떤 버전이든 옆 문서 상태를
        # 먼저 열기 때문이다. 평가하지 못하면 건너뛰는 대신 위반으로 올린다(fail-closed).
        state_document, state_refusal = _document_state(store["path"], _binds_endpoints(store))
        # 문서 축의 상태는 위반일 때만이 아니라 **언제나** 판정에 실린다 (조용한 축 금지).
        store["documentState"] = state_refusal if state_refusal is not None else "readable"
        if state_refusal is not None:
            document_state.append((_repo_path(path), state_refusal))
        if store["documentId"] is not None:
            declared.setdefault(store["documentId"], []).append(store)
            # 스토어가 **자기 자리의 문서**와 어긋나는가 (정직한 스토어를 남의 문서 옆으로
            # 옮기는 경로 — 실측: vnv X1). 편집기는 CRDT 상태로, 게이트는 평문 필드로 본다.
            if state_document is not None and state_document != store["documentId"]:
                document_mismatch.append((_repo_path(path), store["documentId"], state_document))
        counts: dict = {}
        for position, record in enumerate(store["records"]):
            accounted += 1
            record_id, refusal = _record_shape(record, position)
            if refusal is not None:
                # 해석하지 못한 레코드는 건너뛰지 않는다 — 위반으로 올리고 색인에는 넣지
                # 않는다(넣을 이름이 없다). 판정은 이미 FAIL이므로 조용한 통과가 아니다.
                unloadable.append((_repo_path(path), record_id, refusal))
                continue
            counts[record_id] = counts.get(record_id, 0) + 1
            if not _binds_endpoints(store):
                unbound.setdefault(record_id, store)
                continue
            key = (store["documentId"], record_id)
            entry = entries.setdefault(key, {"anchorState": None, "store": store,
                                             "seen": 0, "unbindable": False, "parts": None})
            entry["seen"] += 1
            # 앵커 부분도 **보수적으로** 병합한다(교집합): 같은 종단점을 주장하는 레코드가
            # 둘인데 한쪽이 그 부분을 싣지 않으면, 종단점은 그것을 가진다고 말할 수 없다.
            parts = _record_anchor_parts(record)
            entry["parts"] = parts if entry["parts"] is None else (entry["parts"] & parts)
            claimed, refusal = _record_document(record)
            if refusal is not None:
                unloadable.append((_repo_path(path), record_id, refusal))
            if claimed is None:
                # 출처 미상 레코드. 스토어 옆에 있다는 사실은 정체성의 증거가 아니다
                # (`src/store.mjs`의 입양 금지) — 저장을 거쳐도 승격되지 않으므로 여기서도
                # 종단점을 묶지 않는다. 한 번이라도 미상이면 그 종단점은 미상이다.
                entry["unbindable"] = True
                continue
            if claimed is not None and claimed != store["documentId"]:
                # 색인에서 빼지는 않는다: 판정이 이미 FAIL이므로 조용한 통과가 아니고,
                # 대조군이 "위반 정확히 1건"을 유지한다.
                mismatched.append((_repo_path(path), record_id, claimed, store["documentId"]))
            state = record.get("anchorState")
            entry["anchorState"] = (state if entry["seen"] == 1
                                    else _merge_anchor_state(entry["anchorState"], state))
        for record_id, count in sorted(counts.items()):
            if count > 1:
                duplicate_records.append((_repo_path(path), record_id, count))

    total = sum(len(store["records"]) for store in stores)
    if accounted != total:  # pragma: no cover - 자기검사 (여기에 오면 코드가 틀린 것)
        raise StoreError(
            f"the checker read {accounted} of {total} annotation record(s): a record it cannot "
            "account for is a record it skipped, and a skipped record is a violation, not a "
            "missing result")

    bound = {key: {"anchorState": entry["anchorState"], "store": entry["store"],
                   "parts": entry["parts"] or set()}
             for key, entry in entries.items() if not entry["unbindable"]}
    unbindable = {key: entry["store"] for key, entry in entries.items() if entry["unbindable"]}
    return {
        "bound": bound,
        "unbound": unbound,
        "unbindable": unbindable,
        # 해석한 레코드 수 = 스토어가 실은 레코드 수 (건너뛴 것이 없다는 근거).
        "accounted": accounted,
        "documentMismatch": sorted(document_mismatch),
        "documentState": sorted(document_state),
        "duplicates": {
            document: sorted(_repo_path(store["path"]) for store in same)
            for document, same in declared.items()
            if len(same) > 1
        },
        "duplicateRecords": sorted(duplicate_records),
        "unloadable": sorted(unloadable),
        "unreadable": sorted(unreadable),
        "mismatched": sorted(mismatched),
        "stores": stores,
        "documents": sorted(declared),
        "records": len(bound) + len(unbound) + len(unbindable),
    }


def check_annotation_stores(index: dict) -> list:
    """주석 스토어 자체의 계약 — 링크가 겨냥하든 말든 성립해야 하는 것들.

    편집기(`src/store.mjs loadStore`)가 로드 시점에 거절하는 모양을 **커밋 게이트인 이
    검사기도** 거절해야 한다. 한쪽만 막으면 파일이 게이트를 통과한 채 편집기에서만 터진다
    (실측: vnv L4 — 레코드가 다른 문서를 주장해도 검사기는 PASS였다).
    """
    out: list = []
    for document, paths in sorted(index["duplicates"].items()):
        out.append(_violation(
            "annotation-store-duplicate-document", "<annotation-stores>",
            f"documentId {document!r} is declared by {len(paths)} annotation stores "
            f"({', '.join(paths)}) — one document identity names exactly one store. Copying a "
            "document copies its identity, so two stores for one document make endpoint state "
            "depend on load order"))
    for path, record_id, count in index["duplicateRecords"]:
        out.append(_violation(
            "annotation-store-duplicate-record", f"<annotation:{record_id}>",
            f"{path} carries {count} records with id {record_id!r} — one endpoint names exactly "
            "one record. The editor keeps the first record in file order while this checker reads "
            "the merged state, so a duplicated id lets the gate sign an endpoint that the editor "
            "opens as a different record (src/store.mjs refuses to load such a store)"))
    for path, reason in index["documentState"]:
        out.append(_violation(
            "annotation-store-document-unreadable", "<annotation-stores>",
            f"{path} {DOCUMENT_STATE_REASONS[reason]}. The annotation plane refuses to load such "
            "a store (src/store-contract.mjs documentStateContract), so the commit gate refuses "
            "it too - a document state the gate cannot evaluate is not a missing result, it is a "
            "violation"))
    for path, declared, state_document in index["documentMismatch"]:
        out.append(_violation(
            "annotation-store-document-mismatch", "<annotation-stores>",
            f"{path} declares document {declared!r}, but the document state next to it "
            f"({DOCUMENT_FILE}) says {state_document!r} — an annotation store belongs to the "
            "document it sits next to. Moving or merging a store into another document's "
            "directory reaches exactly this state, and the annotation plane refuses to load it "
            "(src/store-contract.mjs), so the commit gate refuses it too"))
    for path, record_id, claimed, declared in index["mismatched"]:
        out.append(_violation(
            "annotation-record-document-mismatch", f"<annotation:{record_id}>",
            f"record {record_id!r} in {path} declares document {claimed!r}, but the store "
            f"declares {declared!r} — the annotation plane refuses to load this store "
            "(src/store-contract.mjs), so the commit gate must refuse it too"))
    for path, reason in index["unreadable"]:
        out.append(_violation(
            "annotation-store-unreadable", "<annotation-stores>",
            f"a discovered annotation store cannot be read: {reason}. Discovery does not skip what "
            "it cannot read — teach this checker the version, or declare the directory with a "
            f"{QUARANTINE_MARKER} marker if the store is a deliberate control"))
    for path, record_id, reason in index["unloadable"]:
        out.append(_violation(
            "annotation-record-unloadable", f"<annotation:{record_id}>",
            f"record {record_id!r} in {path} {UNLOADABLE_REASONS[reason]}. The annotation plane "
            "refuses to load this store (src/store-contract.mjs), so the commit gate refuses it "
            "too — a record the gate cannot fully evaluate is not a lighter record, it is a "
            "record that cannot say whose it is"))
    return out


# --- 위반 수집 -----------------------------------------------------------------

def _violation(rule: str, record: str, detail: str, endpoint: str = "") -> dict:
    return {"rule": rule, "record": record, "endpoint": endpoint, "detail": detail}


def _endpoint_str(ep) -> str:
    if isinstance(ep, dict):
        return f"{ep.get('plane')}:{ep.get('ref')}"
    return repr(ep)


def _check_id(kind: str, value, seen: set, out: list, path: str) -> str:
    """id 형식·접두사·유일성. 반환값은 이후 위반 보고에 쓸 표시용 id."""
    shown = value if isinstance(value, str) and value else f"<{path}>"
    if not isinstance(value, str) or not value:
        out.append(_violation("store-format", shown, "record has no string 'id'"))
        return shown
    prefix = ID_PREFIXES[kind]
    if not ID_RE.match(value):
        out.append(_violation("store-format", shown,
                              "id must be lower-case kebab (^[a-z][a-z0-9-]*$)"))
    elif not value.startswith(prefix):
        out.append(_violation("store-format", shown,
                              f"{kind} id must carry the '{prefix}' prefix"))
    if value in seen:
        out.append(_violation("store-format", shown, f"duplicate {kind} id"))
    seen.add(value)
    return shown


def _check_key_set(kind: str, record: dict, shown: str, required, optional, out: list):
    for key in required:
        if key not in record:
            out.append(_violation("store-format", shown, f"missing required field '{key}'"))
        elif key not in ("from", "to") and not isinstance(record[key], str):
            out.append(_violation("store-format", shown, f"field '{key}' must be a string"))
        elif key not in ("from", "to") and not record[key].strip():
            out.append(_violation("store-format", shown, f"field '{key}' must not be empty"))
    for key in record:
        if key not in required and key not in optional:
            out.append(_violation("store-format", shown,
                                  f"unknown field '{key}' in a {kind} record"))
    for key in optional:
        if key in record and (not isinstance(record[key], str) or not record[key].strip()):
            out.append(_violation("store-format", shown,
                                  f"optional field '{key}', when present, must be a non-empty string"))


def _check_order(kind: str, ids: list, out: list):
    """결정론적 정렬: 레코드는 id 오름차순으로 직렬화된다(총순서, 언어 독립)."""
    if ids != sorted(ids):
        out.append(_violation("store-format", f"<{kind}s>",
                              "records must be serialised in ascending id order "
                              "(deterministic store)"))


# --- 그래프 종단점 -------------------------------------------------------------

class GraphView:
    """지식 그래프의 읽기 전용 뷰 — 존재 판정과 range 판정에만 쓴다.

    `reason=False`로 읽는다: `ontology_lib.instance_nodes`는 추론 유무와 관계없이 같은
    집합이어야 한다는 것이 도구 층의 명시된 불변식이고(ontology_lib.py:69-75), 실측도
    356 = 356으로 같다. 추론을 생략해 검사기를 10배 빠르게 유지한다."""

    def __init__(self):
        self.lib = _import_tool("ontology_lib")
        try:
            self.graph = self.lib.load_graph(reason=False)
        except Exception as exc:  # noqa: BLE001 - rdflib raises many parse/IO errors
            # 종단점 실재도 **링크 타입 어휘**도 전부 이 그래프에서 읽는다. 읽지 못하면
            # 추측하지 말고 사유와 함께 거절한다(exit 2) — 예전에는 traceback으로 죽으면서
            # exit 1(="위반 있음")을 내어 스토어 탓으로 보였다.
            raise ContractError(
                f"cannot load the knowledge graph via {_repo_path(TOOLS_DIR)}/ontology_lib.py: "
                f"{exc.__class__.__name__}: {exc}") from exc
        self.nodes = self.lib.instance_nodes(self.graph)
        self._predicates = None
        self._kinds = None
        self._kind_targets = None

    def resolve(self, ref: str):
        m = GRAPH_REF_RE.match(ref or "")
        if not m:
            return None
        domain, slug = m.group(1), m.group(2)
        base = f"{self.lib.ID}{domain}/" if domain else str(self.lib.ID_CORE)
        from rdflib import URIRef
        return URIRef(base + slug)

    def exists(self, iri) -> bool:
        return iri in self.nodes

    def property_iri(self, local: str):
        from rdflib import URIRef
        return URIRef(str(self.lib.HO) + local)

    def class_iri(self, local: str):
        from rdflib import URIRef
        return URIRef(str(self.lib.HO) + local)

    def ref_of(self, iri) -> str:
        """IRI -> graph 종단점과 **같은** 표기(`id:<slug>` / `id:<domain>/<slug>`)."""
        text = str(iri)
        core, base = str(self.lib.ID_CORE), str(self.lib.ID)
        if text.startswith(core):
            return "id:" + text[len(core):]
        if text.startswith(base):
            return "id:" + text[len(base):]
        return text

    # --- 파생된 관계 어휘 (하드코딩 금지) ---------------------------------------

    def graph_predicates(self) -> dict:
        """살아 있는 `ho:` 관계 술어 {local name: IRI}.

        도구 층의 `ontology_lib.link_predicates(g)`를 그대로 쓴다 — 같은 파생을 여기서 다시
        구현하면 그 순간부터 둘이 갈라진다(cap 계약 표면과 같은 규율). 그 함수는 SKOS 관계
        술어도 함께 돌려주므로 `ho:` 네임스페이스만 남긴다: 링크 레코드의 술어형 표기는
        **local name 하나**라서 두 네임스페이스를 섞으면 이름이 충돌한다."""
        if self._predicates is None:
            ho = str(self.lib.HO)
            self._predicates = {
                str(p)[len(ho):]: p
                for p in self.lib.link_predicates(self.graph)
                if str(p).startswith(ho)
            }
        return self._predicates

    def link_kinds(self) -> dict:
        """살아 있는 `ho:LinkKind` 개체 {IRI: `id:` 표기}. 그래프의 확장 지점이다.

        키가 표기가 아니라 IRI인 이유: 한 IRI를 두 표기로 쓸 수 있으므로(도메인 생략)
        표기를 키로 삼으면 서로 다른 개체가 같은 칸을 덮어써 **조용히 사라질** 수 있다."""
        if self._kinds is None:
            from rdflib import RDF, URIRef
            self._kinds = {
                s: self.ref_of(s)
                for s in self.graph.subjects(RDF.type, self.class_iri(LINK_KIND_CLASS))
                if isinstance(s, URIRef)
            }
        return self._kinds

    def declares_class(self, local: str) -> bool:
        from rdflib import RDF
        from rdflib.namespace import OWL
        return (self.class_iri(local), RDF.type, OWL.Class) in self.graph

    def kind_target_types(self) -> tuple:
        """종류형 링크가 겨눌 수 있는 클래스 폐포와 그 **출처 상태**.

        술어형의 range는 TBox의 `rdfs:range`에서 오지만, `ho:linkTarget`은 rdfs:range를
        **일부러** 두지 않는다(OWL RL prp-rng가 잘못 겨눈 대상을 세탁해 셰이프 제약을 공허하게
        만든 실측 교훈). 그래서 그 자리에 해당하는 그래프의 선언은 `ho:LinkShape`가
        `ho:linkTarget`에 건 `sh:or`뿐이고, 여기서 그것을 읽는다.

        셰이프 그래프는 데이터 union이 **아니다**(`ontology_lib`가 의도적으로 제외한다).
        그래서 읽지 못했을 때 조용히 통과시키는 대신 상태를 판정 JSON에 실어 말한다:
        `derived` / `unconstrained`(셰이프는 있는데 대상 제약이 없다) / `unavailable: <사유>`.
        읽지 못한 것을 여기서 위반으로 올리지 않는 이유는 그 조건이 `validate.py`의 소관이고
        (셰이프 파일이 없으면 그쪽이 먼저 실패한다) 같은 사실을 두 게이트가 이중 보고할
        필요가 없기 때문이다. 대신 상태는 **언제나** 출력에 실린다(조용한 생략 금지).

        반환: `(closure, declared, status)` — 판정은 하위클래스 **폐포**로 하고, 사람이 읽는
        사유에는 그래프가 실제로 **선언한** 클래스만 쓴다(폐포를 그대로 찍으면 45줄이 된다)."""
        if self._kind_targets is None:
            self._kind_targets = self._read_kind_target_types()
        return self._kind_targets

    def _read_kind_target_types(self) -> tuple:
        from rdflib import Graph, RDF
        from rdflib.namespace import SH
        path = os.path.join(self.lib.ONT_DIR, "shapes", "harness-shapes.ttl")
        if not os.path.exists(path):
            return set(), set(), f"unavailable: no shapes graph at {_repo_path(path)}"
        shapes = Graph()
        try:
            shapes.parse(path, format="turtle")
        except Exception as exc:  # noqa: BLE001 - rdflib raises many parse errors
            return set(), set(), (
                f"unavailable: shapes graph does not parse ({exc.__class__.__name__})")
        shape = self.class_iri(LINK_SHAPE_NAME)
        if (shape, RDF.type, SH.NodeShape) not in shapes:
            return set(), set(), f"unavailable: no ho:{LINK_SHAPE_NAME} in the shapes graph"
        target = self.property_iri(LINK_TARGET_PROPERTY)
        declared = set()
        for prop in shapes.objects(shape, SH.property):
            if shapes.value(prop, SH.path) != target:
                continue
            cls = shapes.value(prop, SH["class"])
            if cls is not None:
                declared.add(cls)
            for member in shapes.objects(prop, SH["or"]):
                for item in shapes.items(member):
                    alt = shapes.value(item, SH["class"])
                    if alt is not None:
                        declared.add(alt)
        if not declared:
            return set(), set(), "unconstrained: the shapes graph declares no target class"
        return self._subclass_closure(declared), declared, "derived"

    def _subclass_closure(self, classes) -> set:
        """TBox에서 그때 계산하는 하위클래스 폐포 (하드코딩 금지)."""
        from rdflib import RDFS
        closure, stack = set(classes), list(classes)
        while stack:
            cur = stack.pop()
            for sub in self.graph.subjects(RDFS.subClassOf, cur):
                if sub not in closure:
                    closure.add(sub)
                    stack.append(sub)
        return closure

    def range_types(self, local: str) -> set:
        """rdfs:range와 그 하위 클래스 폐포(TBox에서 직접 계산 — 하드코딩 금지)."""
        from rdflib import RDFS
        rng = self.graph.value(self.property_iri(local), RDFS.range)
        if rng is None:
            return set()
        return self._subclass_closure({rng})

    def types_of(self, iri) -> set:
        from rdflib import RDF
        return set(self.graph.objects(iri, RDF.type))


# --- 링크 타입: 표기로 형식을 가르고, 어휘는 그래프에서 파생한다 -------------------

def classify_link_type(link_type, view: GraphView) -> tuple:
    """레코드의 `type`이 무엇을 가리키는지 판정한다.

    형식은 **표기**로 갈린다 (docstring 3):
      `id:` 로 시작하면 종류형 = `ho:LinkKind` 개체,
      닫힌 내부 집합에 있으면 평면 내부형,
      그 밖의 bare 이름은 술어형 = 살아 있는 `ho:` `owl:ObjectProperty`의 local name.
    표기로 가르는 이유는 한 이름이 두 형식일 수 있으면 검증 규칙이 갈리기 때문이다.

    반환: `(form, subject, reason)` — form ∈ "internal" | "predicate" | "kind" | None.
    form이 None이면 reason이 `link-type-unknown`의 사유 문구다."""
    if not isinstance(link_type, str) or not link_type.strip():
        return None, None, "a link type must be a non-empty string"
    if link_type in DECISION_INTERNAL_TYPES:
        return "internal", link_type, None

    if link_type.startswith(KIND_REF_PREFIX):
        kinds = view.link_kinds()
        iri = view.resolve(link_type)
        # 표기 두 가지(`id:<slug>` / `id:core/<slug>`)가 같은 IRI로 풀리므로, 대조는 표기가
        # 아니라 **해소된 IRI**로 한다 (graph 종단점이 두 표기를 다 받는 것과 같은 규약).
        if iri is not None and iri in kinds:
            return "kind", iri, None
        if not view.declares_class(LINK_KIND_CLASS):
            return None, None, (
                f"{link_type!r} is written as a relation KIND, but this graph declares no "
                f"ho:{LINK_KIND_CLASS} class at all — the kind form's anchor is gone, so the "
                "plane must be re-pointed at whatever replaced it (do not re-invent the "
                "vocabulary here)")
        if iri is None:
            return None, None, (
                f"{link_type!r} is not a well-formed kind reference — write it the way graph "
                "endpoints are written (id:<slug> or id:<domain>/<slug>)")
        if view.exists(iri):
            return None, None, (
                f"{link_type} exists in the graph but is not a ho:{LINK_KIND_CLASS} individual, "
                "so it names no relation; link kinds live in the graph as typed individuals "
                f"(present: {', '.join(sorted(kinds.values())) or 'none'})")
        return None, None, (
            f"no ho:{LINK_KIND_CLASS} individual {link_type} in the graph "
            f"(present: {', '.join(sorted(kinds.values())) or 'none'}) — a kind is admitted the moment "
            "the graph declares it, and only then")

    predicates = view.graph_predicates()
    if link_type in predicates:
        return "predicate", predicates[link_type], None
    return None, None, (
        f"type {link_type!r} is not a live ho: relation predicate "
        f"({len(predicates)} declared as owl:ObjectProperty) and is not written as a relation "
        f"kind ({KIND_REF_PREFIX}<slug>, a ho:{LINK_KIND_CLASS} individual) — coining a relation "
        "is drift; if the predicate was RETIRED, re-point this record at the link kind that "
        f"replaced it (present kinds: {', '.join(sorted(view.link_kinds().values())) or 'none'})")


def link_type_targets(form: str, subject, view: GraphView) -> tuple:
    """그 형식이 graph 종단점에 허용하는 것: `(폐포, 사유 문구)`.

    술어형은 자기 `rdfs:range`를, 종류형은 `ho:LinkShape`의 `sh:or`를 따른다 — 둘 다 그래프가
    선언한 자리이고, 선언이 없으면 제약도 없다(도구가 대신 발명하지 않는다). 판정은 하위클래스
    폐포로 하되 사유에는 **선언된** 클래스만 적는다."""
    if form == "predicate":
        local = str(subject).rsplit("#", 1)[-1]
        allowed = view.range_types(local)
        if not allowed:
            return set(), ""
        rng = view.graph.value(subject, _rdfs_range())
        return allowed, f"ho:{local} declares rdfs:range {_class_names({rng})}"
    if form == "kind":
        allowed, declared, status = view.kind_target_types()
        if status != "derived":
            return set(), ""
        return allowed, (f"ho:{LINK_SHAPE_NAME} allows ho:{LINK_TARGET_PROPERTY} to be "
                         f"{_class_names(declared)}")
    return set(), ""


def _rdfs_range():
    from rdflib import RDFS
    return RDFS.range


def _class_names(classes) -> str:
    """`{IRI}` -> "ho:A, ho:B" (결정론적 정렬)."""
    return ", ".join(sorted(f"ho:{str(c).rsplit('#', 1)[-1]}" for c in classes if c is not None))


# --- 링크 평면 검사 -------------------------------------------------------------

def _resolve_annotation(document, ref, index: dict):
    """주석 종단점 = (문서, 레코드). 실패 사유를 규칙 코드까지 붙여 돌려준다."""
    if document is None:
        return None, ("endpoint-document-missing",
                      "an annotation endpoint must name its document ('document': "
                      "<documentId>) — a record id is only unique inside one document")
    entry = index["bound"].get((document, ref))
    if entry is not None:
        return entry, None
    store = index["unbindable"].get((document, ref))
    if store is not None:
        return None, ("annotation-record-unbound",
                      f"record {ref!r} lives in {_repo_path(store['path'])} but carries no "
                      "document identity of its own, so it cannot bind a link endpoint — a "
                      "record does not become this document's by sitting next to it "
                      "(identity is minted at capture time, never adopted from a store)")
    elsewhere = sorted({doc for (doc, rid) in index["bound"] if rid == ref})
    if elsewhere:
        return None, ("endpoint-document-mismatch",
                      f"record {ref!r} exists, but in document(s) {', '.join(elsewhere)} — "
                      f"not in {document}")
    if ref in index["unbound"]:
        store = index["unbound"][ref]
        lacking = ("declares no documentId" if store["documentId"] is None
                   else f"predates the per-record identity contract of version "
                        f"{ANNOTATION_BINDING_VERSION}")
        return None, ("annotation-store-unbound",
                      f"record {ref!r} lives in {_repo_path(store['path'])}, a version "
                      f"{store['version']} store that {lacking}, so it cannot "
                      "bind a link endpoint; migrate it to a document-bound store")
    return None, ("record-endpoint-missing",
                  f"no record {ref!r} in document {document} "
                  f"(loaded documents: {', '.join(index['documents']) or 'none'})")


def check_links(links, decision_ids, annotations: dict, view: GraphView) -> tuple:
    out: list = []
    broken: list = []
    seen: set = set()
    ids = []
    # 문서 **위치**를 가리키는 종단점의 수. 0이면 이 스토어는 아직 레코드 id까지만 가리킨다.
    anchor_endpoints = 0

    for index, record in enumerate(links):
        if not isinstance(record, dict):
            out.append(_violation("store-format", f"<links[{index}]>",
                                  "link record must be an object"))
            continue
        shown = _check_id("link", record.get("id"), seen, out, f"links[{index}]")
        ids.append(record.get("id") if isinstance(record.get("id"), str) else "")
        _check_key_set("link", record, shown, LINK_KEYS_REQUIRED, LINK_KEYS_OPTIONAL, out)

        endpoints = {}
        for side in ("from", "to"):
            ep = record.get(side)
            if not isinstance(ep, dict) or not {"plane", "ref"} <= set(ep) \
                    or not set(ep) <= {"plane", "ref", "document", "anchor"}:
                out.append(_violation("link-endpoint-plane", shown,
                                      f"'{side}' must be {{plane, ref}} (+ 'document' and an "
                                      "optional 'anchor' for the annotation plane)",
                                      _endpoint_str(ep)))
                continue
            plane, ref = ep.get("plane"), ep.get("ref")
            if plane not in PLANES:
                out.append(_violation("link-endpoint-plane", shown,
                                      f"unknown plane (allowed: {', '.join(PLANES)})",
                                      _endpoint_str(ep)))
                continue
            if not isinstance(ref, str) or not ref.strip():
                out.append(_violation("link-endpoint-plane", shown,
                                      "'ref' must be a non-empty string", _endpoint_str(ep)))
                continue
            document = ep.get("document")
            if "document" in ep and plane != "annotation":
                out.append(_violation("link-endpoint-plane", shown,
                                      f"only annotation endpoints carry a 'document' "
                                      f"(the {plane} plane is not per-document)",
                                      _endpoint_str(ep)))
                continue
            if document is not None and (not isinstance(document, str) or not document.strip()):
                out.append(_violation("link-endpoint-plane", shown,
                                      "'document' must be a non-empty string", _endpoint_str(ep)))
                continue
            if "anchor" in ep and plane != "annotation":
                out.append(_violation("link-endpoint-plane", shown,
                                      f"only annotation endpoints carry an 'anchor' (the {plane} "
                                      "plane has no document position)", _endpoint_str(ep)))
                continue
            if "anchor" in ep and ep["anchor"] not in ENDPOINT_ANCHORS:
                # 닫힌 집합이다: 링크가 selector를 스스로 짓지 않고 **레코드가 가진 부분**을
                # 이름으로 가리키게 하려는 것이므로, 그 밖의 이름은 가리킬 대상이 없다.
                out.append(_violation(
                    "link-endpoint-plane", shown,
                    f"'anchor' must name a part the record already carries "
                    f"({' | '.join(ENDPOINT_ANCHORS)}); a link never copies selectors of its own",
                    _endpoint_str(ep)))
                continue
            endpoints[side] = (plane, ref, _endpoint_str(ep), document, ep.get("anchor"))

        # 단방향 (§3c): 평면 -> 그래프만 연다. graph가 출발점이면 역방향 인덱스다.
        if endpoints.get("from") and endpoints["from"][0] == "graph":
            out.append(_violation("direction-graph-source", shown,
                                  "links run plane -> graph only; a graph 'from' endpoint "
                                  "is a reverse index (§3c)", endpoints["from"][2]))

        # 종단점 실재 판정. 양쪽 다 해소 실패면 orphan-link 하나로만 보고한다.
        resolved = {}
        missing = {}
        for side, (plane, ref, shown_ep, document, anchor) in endpoints.items():
            if plane == "graph":
                iri = view.resolve(ref)
                if iri is None:
                    missing[side] = (shown_ep, "graph-endpoint-missing",
                                     "graph ref must be written id:<slug> or id:<domain>/<slug>")
                elif not view.exists(iri):
                    missing[side] = (shown_ep, "graph-endpoint-missing",
                                     "no such individual in the knowledge graph")
                else:
                    resolved[side] = ("graph", iri, shown_ep)
            elif plane == "annotation":
                entry, failure = _resolve_annotation(document, ref, annotations)
                if failure is not None:
                    missing[side] = (shown_ep, failure[0], failure[1])
                    continue
                resolved[side] = (plane, ref, shown_ep)
                if anchor is not None:
                    anchor_endpoints += 1
                    if anchor not in entry["parts"]:
                        # 종단점이 **레코드에 없는 부분**을 가리킨다. 링크가 selector를
                        # 스스로 들지 않는 대신 참조하는 구조이므로, 참조 대상이 없으면
                        # 그 종단점에는 가리킬 문서 위치가 존재하지 않는다. 편집기 쪽
                        # 바인더도 같은 자리에서 해소를 거절한다(anchor-part-missing).
                        out.append(_violation(
                            "annotation-anchor-missing", shown,
                            f"{side}: record {ref!r} in document {document} carries no "
                            f"{anchor!r} anchor, so this endpoint names no position in the "
                            f"document (the record carries: "
                            f"{', '.join(sorted(entry['parts'])) or 'no anchor part at all'}). "
                            "A link references the record's own anchor - it never carries a "
                            "selector copy of its own, because two copies drift apart",
                            shown_ep))
                state = entry["anchorState"]
                if state not in ANCHOR_STATES:
                    # v3 스토어는 종단점 상태를 **측정해서** 실어야 한다. 없으면 링크가
                    # "붙어 있다"고 조용히 가정하게 되므로 그것 자체가 위반이다.
                    out.append(_violation(
                        "annotation-anchor-state-unknown", shown,
                        f"{side}: record {ref!r} does not declare a measured anchorState "
                        f"({' | '.join(ANCHOR_STATES)}); a link may not assume its endpoint "
                        "is still bound", shown_ep))
                elif state == "orphaned":
                    # 위반이 **아니다** — 끊긴 종단점은 정상적인 상태다. 다만 조용히 사라지지
                    # 않도록 보고한다 (조용한 재지정 금지 = 이 상태가 존재하는 이유).
                    broken.append({
                        "link": shown,
                        "side": side,
                        "endpoint": shown_ep,
                        "document": document,
                        "record": ref,
                        # 종단점이 문서 **위치**를 가리키던 것인지도 함께 남긴다. 위치를
                        # 가리키던 링크가 끊긴 것은 더 큰 소식이지만, 처리는 같다: 보고만
                        # 하고 지우지도 다시 겨누지도 않는다.
                        "anchor": anchor,
                        "state": state,
                    })
            else:
                if ref in decision_ids:
                    resolved[side] = (plane, ref, shown_ep)
                else:
                    missing[side] = (shown_ep, "record-endpoint-missing",
                                     f"no such record in the {plane} plane")

        if len(missing) == 2 and len(endpoints) == 2:
            out.append(_violation(
                "orphan-link", shown,
                "both endpoints are unresolvable — the link references nothing",
                f"{endpoints['from'][2]} -> {endpoints['to'][2]}"))
        else:
            for side, (shown_ep, rule, reason) in sorted(missing.items()):
                out.append(_violation(rule, shown, f"{side}: {reason}", shown_ep))

        # 타입 어휘 — 목록이 아니라 **그래프에서 파생한 것**과 대조한다 (docstring 3).
        link_type = record.get("type")
        form, subject, reason = classify_link_type(link_type, view)
        if form is None:
            out.append(_violation("link-type-unknown", shown, reason, ""))
            continue

        if form == "internal":
            # supersedes 경계 (B9): 설계결정 평면 내부에서만 성립한다.
            for side, (plane, _ref, shown_ep, _document, _anchor) in sorted(endpoints.items()):
                if plane != "decision":
                    out.append(_violation(
                        "supersedes-boundary", shown,
                        f"'{link_type}' is decision-plane-internal; its {side} endpoint "
                        f"must be a decision record, not the {plane} plane", shown_ep))
        else:
            # 재사용이 이름뿐이 아니도록, 그 형식이 선언한 대상 타입을 실제로 적용한다.
            allowed, source = link_type_targets(form, subject, view)
            target = resolved.get("to")
            if allowed and target and target[0] == "graph":
                if not (view.types_of(target[1]) & allowed):
                    actual = _class_names(view.types_of(target[1])) or "no declared type"
                    out.append(_violation(
                        "link-type-range", shown,
                        f"{source}; the graph endpoint is {actual}, which is not one of those "
                        "(reusing a relation means honouring what it may point at, not just "
                        "its name)", target[2]))

    _check_order("link", [i for i in ids if i], out)
    broken.sort(key=lambda row: (row["link"], row["side"]))
    return out, broken, anchor_endpoints


def check_vocabulary(view: GraphView) -> list:
    """어휘 **출처** 검사 — 목록의 생사가 아니라 파생 자체가 성립하는지를 본다.

    예전에는 여기서 "우리가 적어 둔 다섯 술어가 아직 살아 있는가"를 물었고, 그래서 그래프가
    두 술어를 폐기하자 게이트가 red가 됐다(대조군 37개 붕괴). 목록이 사라진 지금 남는 질문은
    둘이다: (1) 파생이 실제로 무언가를 읽었는가, (2) 평면 내부 전용 이름이 그래프 어휘로
    새어 들어오지 않았는가. 개별 레코드의 어휘 실재는 `link-type-unknown`이 레코드마다 본다."""
    out = []
    predicates = view.graph_predicates()
    if not predicates:
        out.append(_violation(
            "vocabulary-provenance", "<graph>",
            "this graph declares no ho: relation predicate at all — the link type vocabulary "
            "is DERIVED from the graph, so an empty derivation means the checker is reading "
            "the wrong union, not that every link is untyped (fail-closed: an evaluation that "
            "read nothing is a violation, never a silent pass)"))
    for local in DECISION_INTERNAL_TYPES:
        if local in predicates:
            out.append(_violation(
                "vocabulary-provenance", f"ho:{local}",
                "a decision-plane-internal type now exists as graph vocabulary — the "
                "plane/graph boundary (B9) must be re-decided, not silently merged"))
    return out


# --- 설계결정 평면 검사 ---------------------------------------------------------

def check_decisions(decisions, links, cap: dict) -> list:
    """형식만 본다 — 논증의 타당성은 기계 판정 대상이 아니다(브리프 §3b)."""
    out: list = []
    seen: set = set()
    ids = []
    records = {}

    for index, record in enumerate(decisions):
        if not isinstance(record, dict):
            out.append(_violation("store-format", f"<decisions[{index}]>",
                                  "decision record must be an object"))
            continue
        shown = _check_id("decision", record.get("id"), seen, out, f"decisions[{index}]")
        ids.append(record.get("id") if isinstance(record.get("id"), str) else "")
        _check_key_set("decision", record, shown, DECISION_KEYS_REQUIRED,
                       DECISION_KEYS_OPTIONAL, out)
        if isinstance(record.get("id"), str):
            records[record["id"]] = record

        status = record.get("status")
        if status is not None and status not in DECISION_STATUSES:
            out.append(_violation(
                "decision-status-unknown", shown,
                f"status {status!r} is outside {', '.join(DECISION_STATUSES)}"))

        chars = sum(len(record[f]) for f in cap["fields"]
                    if isinstance(record.get(f), str))
        tokens = chars // cap["charsPerToken"]
        if tokens > cap["tokens"]:
            out.append(_violation(
                "decision-text-cap", shown,
                f"{'+'.join(cap['fields'])} = {tokens} tokens ({cap['estimator']}) > cap "
                f"{cap['tokens']} — split the decision (single responsibility)"))

    _check_order("decision", [i for i in ids if i], out)

    # supersedes 관계 = 레코드 필드 + 같은 뜻의 링크. 둘은 하나의 관계이므로 함께 본다.
    edges = {}
    for rid, record in records.items():
        target = record.get("supersedes")
        if isinstance(target, str) and target:
            edges.setdefault(rid, set()).add(target)
    for link in links:
        if not isinstance(link, dict) or link.get("type") not in DECISION_INTERNAL_TYPES:
            continue
        src, dst = link.get("from"), link.get("to")
        if (isinstance(src, dict) and isinstance(dst, dict)
                and src.get("plane") == "decision" and dst.get("plane") == "decision"
                and isinstance(src.get("ref"), str) and isinstance(dst.get("ref"), str)):
            edges.setdefault(src["ref"], set()).add(dst["ref"])

    superseded = set()
    for src in sorted(edges):
        for dst in sorted(edges[src]):
            if dst not in records:
                out.append(_violation(
                    "decision-supersedes-missing", src,
                    "supersedes a decision record that does not exist",
                    f"decision:{dst}"))
            else:
                superseded.add(dst)

    for rid in sorted(superseded):
        if records[rid].get("status") != "superseded":
            out.append(_violation(
                "decision-status-incoherent", rid,
                "another decision supersedes this one, so its status must be "
                f"'superseded' (found {records[rid].get('status')!r})"))

    # 순환 검사 (DFS, 결정론적 순서).
    WHITE, GREY, BLACK = 0, 1, 2
    colour = {rid: WHITE for rid in records}
    reported = set()

    def visit(node, stack):
        colour[node] = GREY
        for nxt in sorted(edges.get(node, ())):
            if nxt not in colour:
                continue
            if colour[nxt] == GREY:
                cycle = stack[stack.index(nxt):] + [nxt] if nxt in stack else [node, nxt]
                key = tuple(sorted(set(cycle)))
                if key not in reported:
                    reported.add(key)
                    out.append(_violation(
                        "decision-supersedes-cycle", cycle[0],
                        "supersedes forms a cycle: " + " -> ".join(cycle)))
            elif colour[nxt] == WHITE:
                visit(nxt, stack + [nxt])
        colour[node] = BLACK

    for rid in sorted(records):
        if colour[rid] == WHITE:
            visit(rid, [rid])
    return out


# --- 실행 ----------------------------------------------------------------------

def run(store_dir: str, annotation_paths: list) -> dict:
    """스토어 하나를 검사하고 결정론적 결과 dict를 돌려준다."""
    links = _read_records(os.path.join(store_dir, LINKS_FILE), "links", required=True)
    decisions = _read_records(os.path.join(store_dir, DECISIONS_FILE), "decisions",
                              required=False)

    # 판정 범위는 **발견**으로 정한다 (2c / I-3): 인자는 범위를 넓히기만 하고 좁히지 못한다.
    scope = annotation_scope(store_dir, annotation_paths)
    annotations = annotation_index(scope["paths"], named=set(scope["named"]))

    decision_ids = {r["id"] for r in decisions
                    if isinstance(r, dict) and isinstance(r.get("id"), str)}

    view = GraphView()
    cap_contract = contract(view)["textCap"]

    violations = []
    violations += check_vocabulary(view)
    violations += check_annotation_stores(annotations)
    link_violations, broken, anchor_endpoints = check_links(
        links, decision_ids, annotations, view)
    violations += link_violations
    violations += check_decisions(decisions, links, cap_contract)
    violations.sort(key=lambda v: (v["rule"], v["record"], v["endpoint"], v["detail"]))

    return {
        "store": _repo_path(store_dir),
        "counts": {
            "links": len(links),
            "decisions": len(decisions),
            "annotationRecords": annotations["records"],
            # 파일에서 **읽어 해석한** 레코드 수. 색인에 들어간 수(annotationRecords)와 달리
            # 중복·해석 불가까지 전부 센다 — 판정에 "건너뜀"이 없다는 근거다(fail-closed).
            "annotationRecordsRead": annotations["accounted"],
            "annotationStores": len(annotations["stores"]),
            "brokenEndpoints": len(broken),
            # 레코드 id에서 멈추지 않고 문서 **위치**를 가리키는 종단점의 수 (2a). 위치로의
            # 해소는 편집기 쪽 바인더가 하지만, 몇 개가 그것을 주장하는지는 게이트가 센다.
            "anchorEndpoints": anchor_endpoints,
            "graphNodes": len(view.nodes),
            # 파생된 어휘의 크기. 그래프가 관계 어휘를 늘리거나 줄이면 여기가 먼저 움직인다.
            "graphLinkPredicates": len(view.graph_predicates()),
            "graphLinkKinds": len(view.link_kinds()),
        },
        # 이 판정이 **무엇을 어휘로 인정했는가**. 목록을 코드에 두지 않는 대신 판정마다 공개한다.
        "vocabulary": vocabulary(view),
        # 인자 순서가 판정에 새어 들어가지 않도록 경로로 정렬한다 (같은 스토어 집합이면
        # 어떤 순서로 넘겨도 같은 JSON이 나온다 — vnv L1/L1b가 재는 성질).
        "annotationStores": [
            {
                "path": _repo_path(store["path"]),
                "version": store["version"],
                "documentId": store["documentId"],
                "records": len(store["records"]),
                # 문서 정체성이 없는 스토어는 읽히지만 종단점을 바인딩하지 못한다 (명시).
                "bindsEndpoints": _binds_endpoints(store),
                # 옆 문서 상태를 **평가한 결과** (readable / absent / unparsable /
                # no-document-state / unidentified). 위반이 아닐 때도 실어 둔다 — 그래야
                # "문서 축을 보긴 봤는가"가 판정 JSON에서 확인된다.
                "documentState": store.get("documentState", "readable"),
            }
            for store in sorted(annotations["stores"], key=lambda store: store["path"])
        ],
        # 무엇을 **발견해서** 판정했는가. 범위를 숨기지 않는 것이 I-3의 핵심이라 판정 JSON에
        # 싣는다: 훑은 루트, 인자로 지목된 것, 발견된 것, 그리고 격리된 디렉토리와 그 사유.
        "annotationScope": {
            "workspaceRoot": scope["workspaceRoot"],
            "roots": scope["roots"],
            "explicit": scope["explicit"],
            "discovered": scope["discovered"],
            "outOfScope": scope["outOfScope"],
            "quarantined": scope["quarantined"],
        },
        # 끊긴 종단점은 **위반이 아니라 상태**다. 그래서 pass에는 영향을 주지 않고, 대신
        # 언제나 출력에 실린다 — 조용히 사라지지도, 다른 곳을 가리키지도 않게.
        "brokenEndpoints": broken,
        "cap": cap_contract,
        "violations": violations,
        "pass": not violations,
    }


def _print_text(result: dict) -> None:
    counts = result["counts"]
    print(f"store: {result['store']}")
    print(f"  {counts['links']} link(s) · {counts['decisions']} decision(s) · "
          f"{counts['annotationRecords']} annotation record(s) · "
          f"{counts['graphNodes']} graph individual(s)")
    print(f"  text cap (from the tool layer): {result['cap']['tokens']} tokens "
          f"[{result['cap']['estimator']}]")
    vocab = result["vocabulary"]
    print(f"  link vocabulary (derived from the graph): "
          f"{counts['graphLinkPredicates']} ho: predicate(s) · "
          f"{counts['graphLinkKinds']} ho:{LINK_KIND_CLASS} individual(s) "
          f"[{', '.join(vocab['graphKinds']) or 'none'}] · "
          f"plane-internal: {', '.join(vocab['decisionInternal'])}")
    scope = result["annotationScope"]
    print(f"  annotation scope: {len(result['annotationStores'])} store(s) found under "
          f"{', '.join(scope['roots'])} "
          f"(workspace root: {scope['workspaceRoot'] or 'none — outside a repository'})")
    for quarantined in scope["quarantined"]:
        print(f"    quarantined: {quarantined['path']} ({quarantined['excluded']} store(s) kept "
              f"out) — {quarantined['reason']}")
    for out_of_scope in scope["outOfScope"]:
        print(f"    out of scope: {out_of_scope['path']} — {out_of_scope['reason']}")
    for store in result["annotationStores"]:
        bound = (f"document {store['documentId']}" if store["bindsEndpoints"]
                 else "cannot bind endpoints")
        state = ("" if store.get("documentState") == "readable"
                 else f", document state: {store.get('documentState')}")
        print(f"  annotation store v{store['version']}: {store['path']} "
              f"({store['records']} record(s), {bound}{state})")
    if counts["anchorEndpoints"]:
        print(f"  {counts['anchorEndpoints']} endpoint(s) name a position in the document "
              f"(anchor: {' | '.join(ENDPOINT_ANCHORS)}) — resolve them with "
              "`node bind-links.mjs`")
    if result["brokenEndpoints"]:
        print(f"\n! {len(result['brokenEndpoints'])} link(s) point at a broken endpoint "
              "(the anchor is orphaned — the link is kept and shown, never re-pointed):")
        for row in result["brokenEndpoints"]:
            anchor = f" @{row['anchor']}" if row.get("anchor") else ""
            print(f"    - {row['link']}  {row['side']} -> {row['endpoint']}{anchor}  "
                  f"[{row['state']}]")
    if result["violations"]:
        print(f"\n✗ {len(result['violations'])} violation(s):")
        for v in result["violations"]:
            endpoint = f"  [{v['endpoint']}]" if v["endpoint"] else ""
            print(f"    - {v['record']}  {v['rule']}{endpoint}\n        {v['detail']}")
    else:
        print("\n✓ every link resolves, every type is reused vocabulary, "
              "and the decision plane is well-formed")
    print(f"\n{'PASS' if result['pass'] else 'FAIL'}")


def main(argv=None) -> int:
    parser = argparse.ArgumentParser(
        description="Integrity checker for the link plane + decision plane "
                    "(stores that live outside ontology/).")
    parser.add_argument("--store", default=DEFAULT_STORE,
                        help="store directory holding links.json (+ decisions.json)")
    parser.add_argument("--annotations", action="append", default=[], metavar="PATH",
                        help="standoff annotation store to judge as well (repeatable). The set is "
                             "DISCOVERED, not chosen: naming a store also judges every store in "
                             "its directory, plus <store>/ and the workspace root — an argument "
                             "can only widen the scope, never narrow it")
    parser.add_argument("--format", choices=("text", "json"), default="text")
    parser.add_argument("--emit-contract", action="store_true",
                        help="print the tool-layer contract (cap, estimator, vocabulary) "
                             "as JSON and exit — the editor's single source for them")
    args = parser.parse_args(argv)

    try:
        if args.emit_contract:
            print(json.dumps(contract(), indent=2, ensure_ascii=False, sort_keys=True))
            return 0
        result = run(os.path.abspath(args.store), [os.path.abspath(p)
                                                   for p in args.annotations])
    except (ContractError, StoreError) as exc:
        print(f"✗ {exc}", file=sys.stderr)
        return 2

    if args.format == "json":
        print(json.dumps(result, indent=2, ensure_ascii=False, sort_keys=True))
    else:
        _print_text(result)
    return 0 if result["pass"] else 1


if __name__ == "__main__":
    sys.exit(main())
