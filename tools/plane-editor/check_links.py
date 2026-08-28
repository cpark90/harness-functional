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
  3. 링크 타입 어휘 — 그래프에 이미 있는 `ho:` 관계 어휘만 재사용한다(신조어 금지).
     어휘 목록이 **살아 있는지**도 TBox에서 확인한다(vocabulary-provenance): 다섯 술어가
     `owl:ObjectProperty`로 선언돼 있어야 하고, `supersedes`는 평면 내부 전용이므로
     `ho:` 어휘에 나타나면 B9 경계를 다시 봐야 한다는 뜻이라 위반으로 잡는다.
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

# 이 검사기가 **소유한** 스토어(links.json / decisions.json)의 버전.
STORE_VERSION = 1

# 주석 스토어는 남의 평면 것이다. 그 버전을 소유한 것은 `src/store.mjs`이고, 여기서는
# "읽을 수 있는 버전"만 선언해 협상한다 (자기 버전을 강요하면 실사용 스토어가 통째로
# exit 2가 된다 — Phase 2 판정의 F1이 그 결함이다).
#   v1·v2 : 레코드 id는 읽히지만 **문서 정체성이 없다** -> 링크 종단점을 바인딩할 수 없다.
#   v3    : documentId + 레코드별 anchorState 를 싣는다 -> 종단점 바인딩·끊김 보고가 가능.
ANNOTATION_STORE_VERSIONS = (1, 2, 3)
ANNOTATION_BINDING_VERSION = 3
# 주석 평면의 현재 버전이 이 집합을 넘어서면 조용히 통과시키지 않고 알람을 울린다.
ANNOTATION_PLANE_MODULE = os.path.join(HERE, "src", "store.mjs")
ANNOTATION_VERSION_RE = re.compile(r"export\s+const\s+STORE_VERSION\s*=\s*(\d+)")

ANCHOR_STATES = ("bound", "orphaned")

# 평면 이름 (Phase 0 §4.2). `graph`는 지식 그래프 평면 자신이다.
PLANES = ("annotation", "decision", "graph")
RECORD_PLANES = ("annotation", "decision")

# 링크 타입 어휘 — 브리프 §3a [v0.2 B]. 그래프에 이미 있는 ho: 관계 어휘를 재사용하며
# 신조어를 만들지 않는다. 이 목록이 TBox에 실재하는지는 vocabulary-provenance 검사가 본다.
GRAPH_LINK_TYPES = ("alternativeOf", "constrainedBy", "derivedFrom",
                    "overlapsWith", "tagged")
# 설계결정 평면 **내부 전용** 타입. 그래프 어휘가 아니므로 graph 종단점을 겨냥할 수 없다.
DECISION_INTERNAL_TYPES = ("supersedes",)

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


def contract() -> dict:
    """편집기가 소비하는 계약 표면. 값의 출처는 전부 도구 층이다(복제 금지)."""
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
        "linkTypes": {
            "graphVocabulary": list(GRAPH_LINK_TYPES),
            "decisionInternal": list(DECISION_INTERNAL_TYPES),
        },
        "decisionStatuses": list(DECISION_STATUSES),
        "idPrefixes": dict(sorted(ID_PREFIXES.items())),
        "files": {
            "links": LINKS_FILE,
            "decisions": DECISIONS_FILE,
            "annotations": ANNOTATIONS_FILE,
        },
        "storeVersion": STORE_VERSION,
        "anchorStates": list(ANCHOR_STATES),
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


def annotation_index(paths: list) -> dict:
    """주석 스토어들을 읽어 종단점 해소용 색인을 만든다.

    bound     : (documentId, recordId) -> {anchorState, store}
    unbound   : recordId -> store  (문서 정체성이 없는 옛 스토어 = 바인딩 불가)
    documents : 선언된 documentId 집합
    """
    bound, unbound, stores = {}, {}, []
    for path in paths:
        store = _read_annotation_store(path)
        stores.append(store)
        for record in store["records"]:
            if not isinstance(record, dict) or not isinstance(record.get("id"), str):
                continue
            if store["documentId"] is None:
                unbound.setdefault(record["id"], store)
            else:
                bound[(store["documentId"], record["id"])] = {
                    "anchorState": record.get("anchorState"),
                    "store": store,
                }
    return {
        "bound": bound,
        "unbound": unbound,
        "stores": stores,
        "documents": sorted({store["documentId"] for store in stores if store["documentId"]}),
        "records": len(bound) + len(unbound),
    }


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
        self.graph = self.lib.load_graph(reason=False)
        self.nodes = self.lib.instance_nodes(self.graph)

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

    def is_object_property(self, local: str) -> bool:
        from rdflib import RDF
        from rdflib.namespace import OWL
        return (self.property_iri(local), RDF.type, OWL.ObjectProperty) in self.graph

    def range_types(self, local: str) -> set:
        """rdfs:range와 그 하위 클래스 폐포(TBox에서 직접 계산 — 하드코딩 금지)."""
        from rdflib import RDFS
        rng = self.graph.value(self.property_iri(local), RDFS.range)
        if rng is None:
            return set()
        closure, stack = {rng}, [rng]
        while stack:
            cur = stack.pop()
            for sub in self.graph.subjects(RDFS.subClassOf, cur):
                if sub not in closure:
                    closure.add(sub)
                    stack.append(sub)
        return closure

    def types_of(self, iri) -> set:
        from rdflib import RDF
        return set(self.graph.objects(iri, RDF.type))


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
    elsewhere = sorted({doc for (doc, rid) in index["bound"] if rid == ref})
    if elsewhere:
        return None, ("endpoint-document-mismatch",
                      f"record {ref!r} exists, but in document(s) {', '.join(elsewhere)} — "
                      f"not in {document}")
    if ref in index["unbound"]:
        store = index["unbound"][ref]
        return None, ("annotation-store-unbound",
                      f"record {ref!r} lives in {_repo_path(store['path'])}, a version "
                      f"{store['version']} store that declares no documentId, so it cannot "
                      "bind a link endpoint; migrate it to a document-bound store")
    return None, ("record-endpoint-missing",
                  f"no record {ref!r} in document {document} "
                  f"(loaded documents: {', '.join(index['documents']) or 'none'})")


def check_links(links, decision_ids, annotations: dict, view: GraphView) -> tuple:
    out: list = []
    broken: list = []
    seen: set = set()
    ids = []
    all_types = set(GRAPH_LINK_TYPES) | set(DECISION_INTERNAL_TYPES)

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
                    or not set(ep) <= {"plane", "ref", "document"}:
                out.append(_violation("link-endpoint-plane", shown,
                                      f"'{side}' must be {{plane, ref}} (+ 'document' for the "
                                      "annotation plane)", _endpoint_str(ep)))
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
            endpoints[side] = (plane, ref, _endpoint_str(ep), document)

        # 단방향 (§3c): 평면 -> 그래프만 연다. graph가 출발점이면 역방향 인덱스다.
        if endpoints.get("from") and endpoints["from"][0] == "graph":
            out.append(_violation("direction-graph-source", shown,
                                  "links run plane -> graph only; a graph 'from' endpoint "
                                  "is a reverse index (§3c)", endpoints["from"][2]))

        # 종단점 실재 판정. 양쪽 다 해소 실패면 orphan-link 하나로만 보고한다.
        resolved = {}
        missing = {}
        for side, (plane, ref, shown_ep, document) in endpoints.items():
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

        # 타입 어휘.
        link_type = record.get("type")
        if not isinstance(link_type, str) or link_type not in all_types:
            out.append(_violation(
                "link-type-unknown", shown,
                f"type {link_type!r} is outside the reused vocabulary "
                f"({', '.join(sorted(all_types))}) — coining a new relation is drift",
                ""))
            continue

        if link_type in DECISION_INTERNAL_TYPES:
            # supersedes 경계 (B9): 설계결정 평면 내부에서만 성립한다.
            for side, (plane, _ref, shown_ep, _document) in sorted(endpoints.items()):
                if plane != "decision":
                    out.append(_violation(
                        "supersedes-boundary", shown,
                        f"'{link_type}' is decision-plane-internal; its {side} endpoint "
                        f"must be a decision record, not the {plane} plane", shown_ep))
        else:
            # 재사용한 ho: 술어의 rdfs:range를 그래프 종단점에 실제로 적용한다.
            allowed = view.range_types(link_type)
            target = resolved.get("to")
            if allowed and target and target[0] == "graph":
                if not (view.types_of(target[1]) & allowed):
                    names = ", ".join(sorted(str(t).rsplit("#", 1)[-1] for t in allowed))
                    out.append(_violation(
                        "link-type-range", shown,
                        f"ho:{link_type} declares rdfs:range {names}; the graph endpoint "
                        f"is not of that type", target[2]))

    _check_order("link", [i for i in ids if i], out)
    broken.sort(key=lambda row: (row["link"], row["side"]))
    return out, broken


def check_vocabulary(view: GraphView) -> list:
    """어휘 출처 검사 — 재사용한다고 적어 놓은 술어가 TBox에 실제로 살아 있는지."""
    out = []
    for local in GRAPH_LINK_TYPES:
        if not view.is_object_property(local):
            out.append(_violation(
                "vocabulary-provenance", f"ho:{local}",
                "link type claims to reuse graph vocabulary but is not declared as an "
                "owl:ObjectProperty in the TBox"))
    for local in DECISION_INTERNAL_TYPES:
        if view.is_object_property(local):
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

    if not annotation_paths:
        default = os.path.join(store_dir, ANNOTATIONS_FILE)
        annotation_paths = [default] if os.path.exists(default) else []
    annotations = annotation_index(annotation_paths)

    decision_ids = {r["id"] for r in decisions
                    if isinstance(r, dict) and isinstance(r.get("id"), str)}

    view = GraphView()
    cap_contract = contract()["textCap"]

    violations = []
    violations += check_vocabulary(view)
    link_violations, broken = check_links(links, decision_ids, annotations, view)
    violations += link_violations
    violations += check_decisions(decisions, links, cap_contract)
    violations.sort(key=lambda v: (v["rule"], v["record"], v["endpoint"], v["detail"]))

    return {
        "store": _repo_path(store_dir),
        "counts": {
            "links": len(links),
            "decisions": len(decisions),
            "annotationRecords": annotations["records"],
            "annotationStores": len(annotations["stores"]),
            "brokenEndpoints": len(broken),
            "graphNodes": len(view.nodes),
        },
        "annotationStores": [
            {
                "path": _repo_path(store["path"]),
                "version": store["version"],
                "documentId": store["documentId"],
                "records": len(store["records"]),
                # 문서 정체성이 없는 스토어는 읽히지만 종단점을 바인딩하지 못한다 (명시).
                "bindsEndpoints": store["documentId"] is not None,
            }
            for store in annotations["stores"]
        ],
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
    for store in result["annotationStores"]:
        bound = (f"document {store['documentId']}" if store["bindsEndpoints"]
                 else "no documentId — cannot bind endpoints")
        print(f"  annotation store v{store['version']}: {store['path']} "
              f"({store['records']} record(s), {bound})")
    if result["brokenEndpoints"]:
        print(f"\n! {len(result['brokenEndpoints'])} link(s) point at a broken endpoint "
              "(the anchor is orphaned — the link is kept and shown, never re-pointed):")
        for row in result["brokenEndpoints"]:
            print(f"    - {row['link']}  {row['side']} -> {row['endpoint']}  [{row['state']}]")
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
                        help="standoff annotation store to resolve annotation endpoints "
                             "against (repeatable; defaults to <store>/annotations.json)")
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
