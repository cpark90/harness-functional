---
status: approved            # 사용자만 approved로 바꾼다
targets: []             # 특정 abox 노드 아님 — 프로젝트 전반 용어 체계
---
# 용어 정립: "ontology" vs "knowledge graph" 혼용 해소

## 사용자 피드백 (2026-08-27, orchestrator 세션에서 접수)

"온톨로지라는 용어와 knowledge graph라는 용어를 혼용해서 사용한 것 같다. 이 프로젝트는
에이전트 하네스를 위한 **온톨로지를 구축**함과 동시에 에이전트 하네스에 대한
**knowledge graph도 구축**하는 것이 목적이었다."

## orchestrator 예비 확인 (판정 아님)

- `"knowledge graph"` 문자열은 repo 전체(md/ttl/py, agent-memory 제외)에서 **0회** 사용.
- 반면 `ontolog*`는 CLAUDE.md(12), README.md(9), ONTOLOGYSTYLE.md(9), docs/DESIGN.md(6),
  tools/retrieve.py(7), tools/validate.py(6) 등에서 **TBox+ABox 전체를 통칭**하는 데 쓰임.
- 즉 혼용의 실태는 "두 용어를 뒤섞음"이 아니라 **두 산출물(스키마 vs 인스턴스 그래프)을
  하나의 용어 'ontology'로 뭉뚱그림**: 프로젝트의 이중 목적이 문서·도구 어디에도 명시돼
  있지 않다.
  - **ontology** = 하네스를 기술하기 위한 스키마·어휘 (`ontology/tbox/` + `ontology/shapes/`,
    `ho:` 클래스·프로퍼티, skos concept scheme)
  - **knowledge graph** = 그 온톨로지로 기술된 하네스 사실·인스턴스 집합 (`ontology/abox/`)

## inspection 검증 요청 (파급효과 조사 범위 제안)

1. **문서 층**: DESIGN.md·README.md·CLAUDE.md·ONTOLOGYSTYLE.md에서 "ontology"가
   (a) 스키마를 지칭 / (b) ABox 인스턴스 그래프를 지칭 / (c) 둘 합친 저장소 전체를 지칭하는
   지점을 분류하고, 이중 목적(ontology 구축 + KG 구축)을 명시하는 용어 규약 제안.
2. **경로·이름 층**: 디렉토리명 `ontology/`(abox 포함), 파일 `harness-ontology.ttl`,
   도구 docstring 등 rename이 필요한지 vs 문서 정의로 충분한지 판단 (rename은 파급효과 큼 —
   비용/이득 평가 포함).
3. **그래프 데이터 층**: TBox/ABox 내 `skos:definition`·주석 등 그래프 안 텍스트에 같은
   혼용이 있는지 (`retrieve.py` projection으로 확인).
4. **메모리 층**: `.claude/agent-memory/**`·auto-memory의 아키텍처 서술도 이중 목적 관점으로
   갱신 필요한지.

verdict(적용 계획 포함)는 `docs/feedback/verified/`로.
