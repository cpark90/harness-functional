.PHONY: install validate retrieve

install:
	pip install --user -r requirements.txt

# Gate for THIS repo: schema + shapes only (TBox consistency, label dedup).
# The full-union gate (schema + core parts + a recipe) runs in harness-concrete,
# which clones this repo as ./central/ and passes its own catalog/root env.
validate:
	HARNESS_ROOT_ONTOLOGY=https://harness-ontology.dev/schema python3 tools/validate.py

# retrieve/determinism operate on a DATA union — run them from harness-concrete:
#   HARNESS_CATALOG=catalog-v001.xml python3 central/tools/retrieve.py "<request>"
retrieve:
	@echo "run from harness-concrete with HARNESS_CATALOG (this repo has no instances)"; exit 1
