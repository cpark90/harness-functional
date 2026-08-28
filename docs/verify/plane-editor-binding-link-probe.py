#!/usr/bin/env python3
"""vnv 링크 평면 적대 프로브 — 종단점 바인딩·끊김 보고·버전 협상의 전제를 무너뜨린다.

실행: /usr/bin/python3 <this> <scratch-dir>
tools/plane-editor/ 는 읽기만 한다 (스토어는 전부 scratch 에 만든다).
"""
import copy
import json
import os
import shutil
import subprocess
import sys

REPO = "/home/cpark/git/harness_ontology"
CHECKER = os.path.join(REPO, "tools/plane-editor/check_links.py")
PY = "/usr/bin/python3"
SCRATCH = sys.argv[1] if len(sys.argv) > 1 else "/tmp/vnv-link-probe"

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
    r = {"id": rid,
         "anchors": {"document": {"id": doc},
                     "relativePosition": {"start": "AA==", "end": "AA=="},
                     "textQuote": {"exact": "x", "prefix": "", "suffix": ""},
                     "capture": None, "blockContext": None},
         "body": "b", "status": "open"}
    if state is not None:
        r["anchorState"] = state
    return r


def link(lid, ref, doc):
    return {"id": lid, "from": {"plane": "annotation", "ref": ref, "document": doc},
            "to": {"plane": "graph", "ref": GRAPH_REF}, "type": "tagged",
            "created_by": "vnv link probe"}


def run(case, links, ann_paths):
    d = os.path.join(SCRATCH, "link", case)
    shutil.rmtree(d, ignore_errors=True)
    os.makedirs(d, exist_ok=True)
    w(os.path.join(d, "links.json"), {"version": 1, "plane": "link", "links": links})
    w(os.path.join(d, "decisions.json"), {"version": 1, "plane": "decision", "decisions": []})
    cmd = [PY, CHECKER, "--store", d, "--format", "json"]
    for p in ann_paths:
        cmd += ["--annotations", p]
    proc = subprocess.run(cmd, capture_output=True, text=True)
    try:
        out = json.loads(proc.stdout)
    except Exception:
        out = None
    return {
        "case": case,
        "exit": proc.returncode,
        "pass": out["pass"] if out else None,
        "violations": sorted({v["rule"] for v in out["violations"]}) if out else None,
        "broken": [f'{b["link"]}:{b["side"]}:{b["state"]}' for b in out["brokenEndpoints"]] if out else None,
        "stores": [(s["path"].split("/")[-1], s["version"], s["documentId"], s["bindsEndpoints"])
                   for s in out["annotationStores"]] if out else None,
        "stderr": (proc.stderr or "").strip()[:200],
    }


results = []

# L1 — 서로 다른 두 스토어가 **같은 documentId** 를 선언한다 (문서 복제/파생본 시나리오).
#      한쪽은 bound, 다른 쪽은 orphaned 로 같은 레코드 id 를 싣는다.
p1 = os.path.join(SCRATCH, "stores/dupA.json")
p2 = os.path.join(SCRATCH, "stores/dupB.json")
w(p1, ann_store("doc-dup", [rec("a1", "orphaned", "doc-dup")]))
w(p2, ann_store("doc-dup", [rec("a1", "bound", "doc-dup")]))
results.append(run("L1-dup-doc-id-orphan-first", [link("ln-a", "a1", "doc-dup")], [p1, p2]))
results.append(run("L1b-dup-doc-id-bound-first", [link("ln-a", "a1", "doc-dup")], [p2, p1]))

# L2 — anchorState 값이 어휘 밖 (오타·새 상태어)
p3 = os.path.join(SCRATCH, "stores/badstate.json")
w(p3, ann_store("doc-b", [rec("a1", "Bound", "doc-b"), rec("a2", "broken", "doc-b"),
                          rec("a3", None, "doc-b")]))
results.append(run("L2-anchorstate-vocab", [link("ln-a", "a1", "doc-b"), link("ln-b", "a2", "doc-b"),
                                            link("ln-c", "a3", "doc-b")], [p3]))

# L3 — v3 스토어인데 documentId 가 없다 (선언 누락)
p4 = os.path.join(SCRATCH, "stores/v3-nodocid.json")
w(p4, ann_store(None, [rec("a1", "bound", "doc-c")]))
results.append(run("L3-v3-without-documentId", [link("ln-a", "a1", "doc-c")], [p4]))

# L4 — 레코드 안 document 와 스토어 documentId 가 어긋난다 (검사기가 보는가)
p5 = os.path.join(SCRATCH, "stores/inner-mismatch.json")
w(p5, ann_store("doc-store", [rec("a1", "bound", "doc-other")]))
results.append(run("L4-record-doc-vs-store-doc", [link("ln-a", "a1", "doc-store")], [p5]))

# L5 — 읽을 수 없는 버전들 (0 / 4 / 문자열 / 없음)
for label, version in [("v0", 0), ("v4", 4), ("vstr", "3"), ("vmissing", None)]:
    p = os.path.join(SCRATCH, f"stores/unreadable-{label}.json")
    payload = ann_store("doc-u", [rec("a1", "bound", "doc-u")])
    if version is None:
        payload.pop("version")
    else:
        payload["version"] = version
    w(p, payload)
    results.append(run(f"L5-unreadable-{label}", [link("ln-a", "a1", "doc-u")], [p]))

# L6 — 대조군: 정상 v3 스토어 + 정상 링크
p6 = os.path.join(SCRATCH, "stores/control.json")
w(p6, ann_store("doc-ok", [rec("a1", "bound", "doc-ok")]))
results.append(run("L6-control", [link("ln-a", "a1", "doc-ok")], [p6]))

# L7 — 대소문자·공백으로 document id 문법 우회
p7 = os.path.join(SCRATCH, "stores/case.json")
w(p7, ann_store("doc-ok", [rec("a1", "bound", "doc-ok")]))
results.append(run("L7-document-case-variant",
                   [link("ln-a", "a1", "DOC-OK"), link("ln-b", "a1", " doc-ok")], [p7]))

for r in results:
    print(json.dumps(r, ensure_ascii=False))
