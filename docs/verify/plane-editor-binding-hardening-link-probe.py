#!/usr/bin/env python3
"""vnv 링크 평면 적대 프로브 (2차) — N-2/N-4 **수정본을 겨냥한** 우회.

실행: /usr/bin/python3 docs/verify/plane-editor-binding-hardening-link-probe.py <scratch-dir>
tools/plane-editor/ 는 읽기만 한다 (스토어는 전부 scratch 에 만든다).

  P1 — 같은 파일을 두 번 물린다 (`--annotations X --annotations X`).
       "한 문서 = 한 스토어" 규칙이 **호출 모양**까지 위반으로 볼 것인가 (위양성 여부).
  P2 — 같은 documentId 스토어가 둘 있는데 **한쪽만** 물린다 (검사기는 넘긴 집합만 본다).
       끊긴 종단점이 다시 사라지는가 = 순서 의존을 없앤 자리에 **집합 의존**이 남는가.
  P3 — L1/L1b 두 인자 순서의 **판정 JSON 전문**을 byte 로 대조한다 (N-2 해제 기준).
  P4 — 세 스토어가 같은 documentId 를 선언 (위반이 1건인가, 경로가 전부 실리는가).
  P5 — documentId 를 공백/대소문자로 비튼 쌍 (중복 검사를 문자열로 우회할 수 있는가).
"""
import hashlib
import json
import os
import shutil
import subprocess
import sys

REPO = "/home/cpark/git/harness_ontology"
CHECKER = os.path.join(REPO, "tools/plane-editor/check_links.py")
PY = "/usr/bin/python3"
SCRATCH = sys.argv[1] if len(sys.argv) > 1 else "/tmp/vnv-hardening-link-probe"
GRAPH_REF = "id:c-traceability"


def w(path, payload):
    os.makedirs(os.path.dirname(path), exist_ok=True)
    with open(path, "w", encoding="utf-8") as fh:
        json.dump(payload, fh, ensure_ascii=False, indent=2)
        fh.write("\n")


def ann_store(doc_id, records, version=3):
    return {"version": version, "document": "document.json",
            **({"documentId": doc_id} if doc_id else {}),
            "annotations": records}


def rec(rid, state="bound", doc="doc-x"):
    return {"id": rid,
            "anchors": {"document": {"id": doc},
                        "relativePosition": {"start": "AA==", "end": "AA=="},
                        "textQuote": {"exact": "x", "prefix": "", "suffix": ""},
                        "capture": None, "blockContext": None},
            "body": "b", "status": "open", "anchorState": state}


def link(lid, ref, doc):
    return {"id": lid, "from": {"plane": "annotation", "ref": ref, "document": doc},
            "to": {"plane": "graph", "ref": GRAPH_REF}, "type": "tagged",
            "created_by": "vnv hardening link probe"}


def run_raw(case, links, ann_paths):
    d = os.path.join(SCRATCH, "link", case)
    shutil.rmtree(d, ignore_errors=True)
    os.makedirs(d, exist_ok=True)
    w(os.path.join(d, "links.json"), {"version": 1, "plane": "link", "links": links})
    w(os.path.join(d, "decisions.json"), {"version": 1, "plane": "decision", "decisions": []})
    cmd = [PY, CHECKER, "--store", d, "--format", "json"]
    for p in ann_paths:
        cmd += ["--annotations", p]
    return subprocess.run(cmd, capture_output=True, text=True)


def run_raw_in(case, ann_paths):
    """이미 만들어 둔 링크 스토어 디렉토리에 **인자 순서만 바꿔** 다시 돌린다."""
    d = os.path.join(SCRATCH, "link", case)
    cmd = [PY, CHECKER, "--store", d, "--format", "json"]
    for p in ann_paths:
        cmd += ["--annotations", p]
    return subprocess.run(cmd, capture_output=True, text=True)


def summarize(case, proc):
    try:
        out = json.loads(proc.stdout)
    except Exception:
        out = None
    return {"case": case, "exit": proc.returncode,
            "pass": out["pass"] if out else None,
            "violations": sorted(v["rule"] for v in out["violations"]) if out else None,
            "broken": [f'{b["link"]}:{b["side"]}:{b["state"]}' for b in out["brokenEndpoints"]] if out else None,
            "stores": [(s["path"].split("/")[-1], s["documentId"]) for s in out["annotationStores"]] if out else None,
            "stderr": (proc.stderr or "").strip()[:160]}


results = []
stores = os.path.join(SCRATCH, "stores")

# P1 — 같은 파일 두 번
p_single = os.path.join(stores, "single.json")
w(p_single, ann_store("doc-p", [rec("a1", "bound", "doc-p")]))
results.append(summarize("P1a-single-store-once", run_raw("p1a", [link("ln-a", "a1", "doc-p")], [p_single])))
results.append(summarize("P1b-same-file-twice", run_raw("p1b", [link("ln-a", "a1", "doc-p")], [p_single, p_single])))

# P2 — 같은 documentId 스토어 둘 중 **한쪽만** 물린다
p_a = os.path.join(stores, "pairA.json")
p_b = os.path.join(stores, "pairB.json")
w(p_a, ann_store("doc-pair", [rec("a1", "orphaned", "doc-pair")]))
w(p_b, ann_store("doc-pair", [rec("a1", "bound", "doc-pair")]))
results.append(summarize("P2a-both-stores", run_raw("p2a", [link("ln-a", "a1", "doc-pair")], [p_a, p_b])))
results.append(summarize("P2b-only-bound-store", run_raw("p2b", [link("ln-a", "a1", "doc-pair")], [p_b])))
results.append(summarize("P2c-only-orphaned-store", run_raw("p2c", [link("ln-a", "a1", "doc-pair")], [p_a])))

# P3 — 인자 순서 두 가지의 판정 JSON 전문 대조.
#      ★ 링크 스토어 디렉토리를 **같은 것**으로 써야 한다 (판정 JSON 에 store 경로가 실리므로
#      디렉토리가 다르면 "순서 때문에 다르다"는 위양성이 난다 — 실제로 처음에 그렇게 났다).
o1 = run_raw("p3-shared", [link("ln-a", "a1", "doc-pair")], [p_a, p_b]).stdout
o2 = run_raw_in("p3-shared", [p_b, p_a]).stdout
results.append({"case": "P3-verdict-json-byte-identical", "identical": o1 == o2,
                "sha256": hashlib.sha256(o1.encode()).hexdigest()[:16],
                "bytes": (len(o1), len(o2))})

# P4 — 세 스토어가 같은 documentId
p_c = os.path.join(stores, "pairC.json")
w(p_c, ann_store("doc-pair", [rec("a1", "bound", "doc-pair")]))
proc = run_raw("p4", [link("ln-a", "a1", "doc-pair")], [p_a, p_b, p_c])
out = json.loads(proc.stdout) if proc.stdout else None
results.append({"case": "P4-three-stores-one-document", "exit": proc.returncode,
                "violations": sorted(v["rule"] for v in out["violations"]) if out else None,
                "violationCount": len(out["violations"]) if out else None,
                "detailMentionsAllThree": bool(out and all(
                    name in out["violations"][0]["detail"] for name in ("pairA.json", "pairB.json", "pairC.json")))})

# P5 — documentId 문자열을 비튼 쌍 (공백·대소문자)
for label, twisted in [("trailing-space", "doc-pair "), ("case", "DOC-PAIR")]:
    p_t = os.path.join(stores, f"twisted-{label}.json")
    w(p_t, ann_store(twisted, [rec("a1", "bound", twisted)]))
    results.append(summarize(f"P5-{label}", run_raw(f"p5-{label}", [link("ln-a", "a1", "doc-pair")], [p_a, p_t])))

for r in results:
    print(json.dumps(r, ensure_ascii=False))
