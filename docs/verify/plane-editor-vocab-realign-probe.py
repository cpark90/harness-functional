#!/usr/bin/env python3
"""vnv independent derivation probe — mutate a COPY of the graph, watch the verdict follow.

원본 `ontology/`는 읽기만 한다(끝에서 byte 비교로 확인). C11(developer의 상설 검사)과
**다른 변형**을 쓴다: kind 은퇴 / predicate 신설 / range 재선언 / LinkShape sh:or 축소 /
supersedes 그래프 유입 / 어휘 전멸.
"""
import json
import os
import shutil
import subprocess
import sys

S = os.path.dirname(os.path.abspath(__file__))
R = "/home/cpark/git/harness_ontology"
GC = os.path.join(S, "gc")
CHECKER = os.path.join(R, "tools", "plane-editor", "check_links.py")
TBOX = os.path.join(GC, "ontology", "tbox", "harness.ttl")
KINDS = os.path.join(GC, "ontology", "abox", "core", "vocab", "concepts.ttl")
SHAPES = os.path.join(GC, "ontology", "shapes", "harness-shapes.ttl")

ENV = dict(os.environ)
ENV["HO_TOOLS_DIR"] = os.path.join(GC, "tools")
ENV["HARNESS_CATALOG"] = os.path.join(GC, "catalog-v001.xml")


def run(store):
    p = subprocess.run(["/usr/bin/python3", CHECKER, "--store", store, "--format", "json"],
                       capture_output=True, text=True, env=ENV, cwd=R)
    try:
        j = json.loads(p.stdout)
    except Exception:
        return p.returncode, None, p.stdout + p.stderr
    return p.returncode, j, ""


def probe_store(name, link_type, to_plane, to_ref):
    d = os.path.join(S, "probes", name)
    os.makedirs(d, exist_ok=True)
    with open(os.path.join(d, "links.json"), "w") as f:
        json.dump({"version": 1, "plane": "link", "links": [{
            "id": "ln-vnv-probe",
            "from": {"plane": "decision", "ref": "dec-vnv-probe"},
            "to": {"plane": to_plane, "ref": to_ref},
            "type": link_type,
            "created_by": "vnv derivation probe",
        }]}, f, indent=2)
    with open(os.path.join(d, "decisions.json"), "w") as f:
        json.dump({"version": 1, "plane": "decision", "decisions": [{
            "id": "dec-vnv-probe", "title": "vnv probe",
            "body": "Probe record for the vnv derivation experiment.",
            "status": "open", "decided_by": "vnv",
        }]}, f, indent=2)
    return d


class Mutation:
    def __init__(self, path, fn):
        self.path = path
        self.fn = fn

    def __enter__(self):
        with open(self.path) as f:
            self.before = f.read()
        after = self.fn(self.before)
        assert after != self.before, f"mutation was a no-op on {self.path}"
        with open(self.path, "w") as f:
            f.write(after)

    def __exit__(self, *a):
        with open(self.path, "w") as f:
            f.write(self.before)


def show(tag, rc, j, err):
    if j is None:
        print(f"  {tag}: exit={rc} NON-JSON {err[:400]}")
        return
    rules = [v["rule"] for v in j.get("violations", [])]
    counts = j.get("counts", {})
    vocab = j.get("vocabulary", {})
    print(f"  {tag}: exit={rc} rules={rules} "
          f"pred={counts.get('graphLinkPredicates')} kinds={counts.get('graphLinkKinds')} "
          f"kindTargets={vocab.get('kindTargetStatus')}")
    for v in j.get("violations", [])[:3]:
        print(f"      -> {v['rule']}: {v.get('subject')} :: {v.get('detail', '')[:220]}")


REAL = os.path.join(R, "tools", "plane-editor", "link-store")

print("== E0 baseline (copy, unmutated) ==")
show("real link-store", *run(REAL))

print("\n== E1 RETIRE a kind used by the real store (id:kind-overlap) — green -> red ==")
with Mutation(KINDS, lambda t: t.replace("id:kind-overlap a ho:LinkKind ;",
                                         "id:kind-overlap a skos:Concept ;")):
    show("real link-store", *run(REAL))
show("restored", *run(REAL))

print("\n== E2 ADD a brand-new predicate (ho:vnvProbeRelation) — red -> green ==")
p2 = probe_store("new-predicate", "vnvProbeRelation", "graph", "id:c-traceability")
show("before add", *run(p2))
with Mutation(TBOX, lambda t: t + """
ho:vnvProbeRelation a owl:ObjectProperty ;
    rdfs:label "vnv probe relation" ;
    skos:definition "Probe object property written into a COPY of the graph by the vnv derivation probe." .
"""):
    show("after add", *run(p2))
show("restored", *run(p2))

print("\n== E3 RE-DECLARE rdfs:range of ho:tagged — the range check follows the graph ==")
rng = os.path.join(R, "tools", "plane-editor", "fixtures", "link-plane", "negative-tagged-range")
show("negative-tagged-range (baseline)", *run(rng))
with Mutation(TBOX, lambda t: t.replace(
        "ho:tagged a owl:ObjectProperty ;\n    rdfs:range ho:Concept ;",
        "ho:tagged a owl:ObjectProperty ;\n    rdfs:range ho:DesignPattern ;")):
    show("range := ho:DesignPattern", *run(rng))
show("restored", *run(rng))

print("\n== E4 kind link at a GRAPH endpoint: narrow ho:LinkShape sh:or — target check follows ==")
p4 = probe_store("kind-graph", "id:kind-topic", "graph", "id:c-traceability")
show("baseline (Concept allowed)", *run(p4))
ORIG_OR = ("""sh:or ( [ sh:class ho:HarnessComponent ]
                [ sh:class ho:SpecConcept ]
                [ sh:class ho:Concept ] ) ;""")
with Mutation(SHAPES, lambda t: t.replace(ORIG_OR, "sh:or ( [ sh:class ho:Tool ] ) ;", 1)):
    show("sh:or narrowed (first alt -> ho:Tool)", *run(p4))
show("restored", *run(p4))

print("\n== E5 supersedes leaks into ho: vocabulary — B9 alarm ==")
with Mutation(TBOX, lambda t: t + """
ho:supersedes a owl:ObjectProperty ;
    rdfs:label "supersedes" ;
    skos:definition "Probe: the plane-internal type name leaking into the graph vocabulary." .
"""):
    show("real link-store", *run(REAL))
show("restored", *run(REAL))

print("\n== E6 derivation goes EMPTY (no ho: ObjectProperty at all) — vocabulary-provenance ==")
with Mutation(TBOX, lambda t: t.replace("a owl:ObjectProperty ;", "a owl:AnnotationProperty ;")):
    show("real link-store", *run(REAL))
show("restored", *run(REAL))

print("\n== E7 ho:LinkKind class itself removed — the kind form's anchor is gone ==")
with Mutation(TBOX, lambda t: t.replace("ho:LinkKind a owl:Class ;", "ho:LinkKind a owl:Thing ;")):
    show("real link-store", *run(REAL))
show("restored", *run(REAL))

print("\n== E8 teeth: types that name nothing ==")
for name, ty, plane, ref in [
        ("kind that does not exist", "id:kind-vnv-absent", "graph", "id:c-traceability"),
        ("kind ref that names a non-LinkKind node", "id:c-traceability", "graph", "id:c-traceability"),
        ("bare name that is a retired predicate", "overlapsWith", "graph", "id:c-traceability"),
        ("bare name that is a retired predicate 2", "alternativeOf", "graph", "id:c-traceability"),
        ("class name used as a predicate", "Concept", "graph", "id:c-traceability"),
        ("kind written bare", "kind-overlap", "graph", "id:c-traceability"),
        ("datatype property used as a link type", "maturity", "graph", "id:c-traceability"),
        ("skos predicate (not ho:)", "broader", "graph", "id:c-traceability"),
        ("full IRI form", "ho:tagged", "graph", "id:c-traceability"),
        ("kind with trailing space", "id:kind-overlap ", "graph", "id:c-traceability"),
        ("kind with case change", "id:Kind-Overlap", "graph", "id:c-traceability"),
        ("empty type", "", "graph", "id:c-traceability"),
]:
    d = probe_store("teeth-" + name.replace(" ", "-"), ty, plane, ref)
    rc, j, err = run(d)
    rules = [v["rule"] for v in j.get("violations", [])] if j else ["<non-json>"]
    print(f"  {name:45s} type={ty!r:24s} exit={rc} rules={rules}")

print("\n== E9 the real ontology/ was never written ==")
for rel in ["ontology/tbox/harness.ttl", "ontology/abox/core/vocab/concepts.ttl",
            "ontology/shapes/harness-shapes.ttl"]:
    a = open(os.path.join(R, rel), "rb").read()
    b = open(os.path.join(GC, rel), "rb").read()
    print(f"  {rel}: copy == original -> {a == b}")
print("  git status of ontology/ (must be unchanged by this probe):")
print(subprocess.run(["git", "diff", "--stat", "--", "ontology"], cwd=R,
                     capture_output=True, text=True).stdout[-400:] or "  (see report)")
