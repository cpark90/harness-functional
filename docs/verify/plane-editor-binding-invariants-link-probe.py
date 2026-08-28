#!/usr/bin/env python3
"""vnv 링크 평면 적대 프로브 (3차) — I-1~I-3 **수정본을 겨냥한** 새 우회.

실행: /usr/bin/python3 docs/verify/plane-editor-binding-invariants-link-probe.py <scratch-dir>
tools/plane-editor/ 는 읽기만 한다 (스토어는 전부 scratch 에 만든다).

  Y1 — I-2 의 문언 기준 직접 측정: 한 스토어 안 중복 레코드 id 를 **같은 경로**에 두 순서로
       써 넣고 판정 JSON 전문을 byte 로 대조한다 (경로가 같아야 순서만 남는다).
  Y2 — 발견(I-3)이 작업공간을 실제로 훑는가 + **격리 표식으로 숨길 수 있는가**.
       (a) 같은 문서를 선언한 스토어 둘을 서로 **다른 디렉토리**에 두고 아무 인자도 주지
           않는다 → 발견이 작동하면 중복 위반이 나야 한다.
       (b) 그 한쪽 디렉토리에 `.annotation-store-quarantine` 표식만 놓는다 → 판정에서
           빠지는가(= 표식 한 줄로 끊긴 종단점을 숨길 수 있는가).
  Y3 — 이름 의존: 같은 스토어를 `annotations-backup.json` 으로 **이름만 바꿔** 둔다.
       작업공간 훑기는 `annotations.json` 만 보므로 발견되지 않는다 — 격리와 달리 판정
       JSON 에 흔적도 남지 않는가(조용한 제외)를 본다.
  Y4 — 작업공간(.git) 밖에서 돌 때: 같은 문서 스토어 둘이 **다른 디렉토리**에 있고 한쪽만
       물린다 → P2b 가 되살아나는가 (발견 범위가 형제로 한정되므로).
  Y5 — 작업공간 안에 `annotations.json` 이라는 이름의 **주석 스토어가 아닌** 파일이 있으면
       그 작업공간의 모든 게이트 실행이 어떻게 되는가 (fail-closed 의 비용).
  Y6 — 대조군: 정상 작업공간 하나 = exit 0.
"""
import json
import os
import shutil
import subprocess
import sys

REPO = "/home/cpark/git/harness_ontology"
CHECKER = os.path.join(REPO, "tools/plane-editor/check_links.py")
PY = "/usr/bin/python3"
SCRATCH = sys.argv[1] if len(sys.argv) > 1 else "/tmp/vnv-invariants-link-probe"
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


def rec(rid, state="bound", doc="doc-x", body="b"):
    return {"id": rid,
            "anchors": {"document": {"id": doc},
                        "relativePosition": {"start": "AA==", "end": "AA=="},
                        "textQuote": {"exact": "x", "prefix": "", "suffix": ""},
                        "capture": None, "blockContext": None},
            "body": body, "status": "open", "anchorState": state}


def link(lid, ref, doc):
    return {"id": lid, "from": {"plane": "annotation", "ref": ref, "document": doc},
            "to": {"plane": "graph", "ref": GRAPH_REF}, "type": "tagged",
            "created_by": "vnv invariants link probe"}


def make_link_store(directory, links):
    w(os.path.join(directory, "links.json"), {"version": 1, "plane": "link", "links": links})
    w(os.path.join(directory, "decisions.json"),
      {"version": 1, "plane": "decision", "decisions": []})
    return directory


def check(store_dir, ann_paths=()):
    cmd = [PY, CHECKER, "--store", store_dir, "--format", "json"]
    for p in ann_paths:
        cmd += ["--annotations", p]
    return subprocess.run(cmd, capture_output=True, text=True)


def summarize(case, proc, extra=None):
    try:
        out = json.loads(proc.stdout)
    except Exception:
        out = None
    scope = out.get("annotationScope") if out else None
    row = {"case": case, "exit": proc.returncode,
           "pass": out["pass"] if out else None,
           "violations": sorted(v["rule"] for v in out["violations"]) if out else None,
           "broken": [f'{b["link"]}:{b["side"]}:{b["state"]}' for b in out["brokenEndpoints"]]
                     if out else None,
           "judged": [s["path"] for s in out["annotationStores"]] if out else None,
           "workspaceRoot": scope["workspaceRoot"] if scope else None,
           "outOfScope": scope["outOfScope"] if scope else None,
           "quarantined": [q["path"] for q in scope["quarantined"]] if scope else None,
           "stderr": (proc.stderr or "").strip()[:200]}
    if extra:
        row.update(extra)
    return row


results = []
shutil.rmtree(SCRATCH, ignore_errors=True)

# --- Y1: I-2 문언 (같은 경로, 두 레코드 순서, 판정 JSON byte 대조) ---------------
y1 = os.path.join(SCRATCH, "y1")
store = os.path.join(y1, "store")
make_link_store(store, [link("ln-y1", "a1", "doc-y1")])
target = os.path.join(store, "annotations.json")
dup_first = [rec("a1", "orphaned", "doc-y1", "laundered"), rec("a1", "bound", "doc-y1", "honest")]
w(target, ann_store("doc-y1", dup_first))
o1 = check(store)
w(target, ann_store("doc-y1", list(reversed(dup_first))))
o2 = check(store)
results.append(summarize("Y1a-duplicate-record-id-order-1", o1))
results.append(summarize("Y1b-duplicate-record-id-order-2", o2,
                         {"verdictJSONIdentical": o1.stdout == o2.stdout,
                          "bytes": (len(o1.stdout), len(o2.stdout))}))

# --- Y2: 발견이 작업공간을 훑는가 / 표식 한 줄로 숨길 수 있는가 ------------------
ws = os.path.join(SCRATCH, "y2", "ws")
os.makedirs(os.path.join(ws, ".git"), exist_ok=True)
link_store = make_link_store(os.path.join(ws, "link"), [link("ln-y2", "a1", "doc-y2")])
w(os.path.join(ws, "main", "annotations.json"),
  ann_store("doc-y2", [rec("a1", "bound", "doc-y2", "honest")]))
w(os.path.join(ws, "copy", "annotations.json"),
  ann_store("doc-y2", [rec("a1", "orphaned", "doc-y2", "the copy")]))
results.append(summarize("Y2a-twins-in-different-dirs-no-arguments", check(link_store)))
with open(os.path.join(ws, "copy", ".annotation-store-quarantine"), "w", encoding="utf-8") as fh:
    fh.write("work in progress\n")
results.append(summarize("Y2b-one-marker-file-hides-the-twin", check(link_store)))
os.remove(os.path.join(ws, "copy", ".annotation-store-quarantine"))

# --- Y3: 이름 의존 (조용한 제외) ------------------------------------------------
os.rename(os.path.join(ws, "copy", "annotations.json"),
          os.path.join(ws, "copy", "annotations-backup.json"))
results.append(summarize("Y3-renamed-twin-is-invisible", check(link_store)))

# --- Y4: 작업공간 밖 (workspaceRoot 없음) --------------------------------------
out = os.path.join(SCRATCH, "y4")          # .git 없음
link_store4 = make_link_store(os.path.join(out, "link"), [link("ln-y4", "a1", "doc-y4")])
w(os.path.join(out, "main", "annotations.json"),
  ann_store("doc-y4", [rec("a1", "bound", "doc-y4", "honest")]))
w(os.path.join(out, "copy", "annotations.json"),
  ann_store("doc-y4", [rec("a1", "orphaned", "doc-y4", "the copy")]))
results.append(summarize("Y4a-outside-a-workspace-name-both",
                         check(link_store4, [os.path.join(out, "main", "annotations.json"),
                                             os.path.join(out, "copy", "annotations.json")])))
results.append(summarize("Y4b-outside-a-workspace-name-only-the-bound-one",
                         check(link_store4, [os.path.join(out, "main", "annotations.json")])))

# --- Y5: 작업공간 안의 "annotations.json 인데 스토어가 아닌 파일" ----------------
ws5 = os.path.join(SCRATCH, "y5", "ws")
os.makedirs(os.path.join(ws5, ".git"), exist_ok=True)
link_store5 = make_link_store(os.path.join(ws5, "link"), [link("ln-y5", "a1", "doc-y5")])
w(os.path.join(ws5, "main", "annotations.json"),
  ann_store("doc-y5", [rec("a1", "bound", "doc-y5", "honest")]))
w(os.path.join(ws5, "unrelated", "annotations.json"), {"note": "someone else's file"})
results.append(summarize("Y5-a-non-store-named-annotations.json", check(link_store5)))

# --- Y6: 대조군 -----------------------------------------------------------------
ws6 = os.path.join(SCRATCH, "y6", "ws")
os.makedirs(os.path.join(ws6, ".git"), exist_ok=True)
link_store6 = make_link_store(os.path.join(ws6, "link"), [link("ln-y6", "a1", "doc-y6")])
w(os.path.join(ws6, "main", "annotations.json"),
  ann_store("doc-y6", [rec("a1", "bound", "doc-y6", "honest")]))
results.append(summarize("Y6-control-one-honest-store", check(link_store6)))

for row in results:
    print(json.dumps(row, ensure_ascii=False))
