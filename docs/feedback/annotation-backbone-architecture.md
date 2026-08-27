---
status: approved            # 사용자만 approved로 바꾼다
targets: [id:scheme, ho:salience, ho:tagged, tools/webui, tools/retrieve.py, tools/lint_uniformity.py]
---
# Backbone + anchored annotation 아키텍처 (+ 전용 편집 도구)

사용자 제안 (2026-08-27 세션, inspection이 채널로 전사; 용어는 사용자 요청으로 표준 용어 교체).

## 제안 내용 (표준 용어로 재기술)
1. 모사하려는 지식·시스템을 **agent-특화 annotation**(사용자 원용어 "block") 단위로 나눈다.
   한 annotation은 **42 line 이하**로 제한한다(granularity cap).
2. 최소 단위 annotation들은 **backbone**(사용자 원용어 "skeleton") — 핵심 **확률적 그래프**
   (taxonomy backbone, 구현: `skos:ConceptScheme` + confidence 가중) — 로 구조적으로 정리된다.
3. **중복 서술 허용**: 같은 지식을 여러 annotation이 다르게 설명할 수 있고, 설명 영역이
   **겹칠 수(overlapping scope)** 있으며 같은 영역에 **대안 설명(alternative annotation)**이
   공존할 수 있다.
4. 단, 모든 annotation은 backbone 위의 **확실한 anchor(구조적 위치)** 를 가져 서로 구분된다.
5. 이를 편집·반영하기 위한 전용 도구를 함께 제작한다 — 참조: tiptap(블록 편집 UI),
   SWE-Edit(Viewer/Editor 컨텍스트 분리), CAPRA(evidence anchoring + 멀티에이전트 판정).

## 용어 대체 (사용자 요청: 임의 용어 → 온톨로지/KG 표준 용어)
| 원용어 | 교체 권고 | 표준 근거 |
|---|---|---|
| block | **annotation** (anchored annotation) | W3C Web Annotation(`oa:Annotation` = body+target) — 같은 target에 복수 annotation = 중복·대안 설명이 모델 내장. 주의: OWL `owl:AnnotationProperty`(메타데이터)와 이름 충돌 → 문서에서 "anchored annotation"으로 표기 권고. 차선: `TextChunk`(SPAR/DoCO) |
| skeleton | **backbone** (taxonomy backbone) | KG 공학 표준 관용어; 구현은 SKOS **`ConceptScheme`**(+`skos:broader`/`inScheme`) — 본 repo에 `id:scheme`으로 이미 존재 |
| 확률적 | **confidence** (edge/assertion 가중) | uncertain/probabilistic KG의 표준 축; 본 repo node-level 대응물 = `ho:salience` |
| 겹치는 설명영역 | **scope** (`oa:hasScope`) / coverage | Web Annotation의 대상 범위 개념 |
| 구조적 위치 | **anchor / anchoring** | CAPRA의 evidence anchoring과 동일 개념 |

## 결정 요청 (선택지)
- (A) 중복 서술 허용 정책을 채택하되 **anchor 필수 + pack당 영역별 1설명 선별**로 anti-drift와
  양립시킨다 (inspection 권고, 검증 보고서 참조).
- (B) 중복 서술은 현행 anti-drift 원칙(근사동의어 금지)과 충돌하므로 채택하지 않는다.
- (C) 다른 결정 (직접 기재).

## 사용자 피드백
(A), 추가적으로 도구는 CLAUDE.md와 같은 제약으로 정한 것들을 에이전트가 위반하는 걸 방지하기 위해 사용함. 또한 에이전트가 추론하는데 사용하는 정보에 노이즈가 섞이지 않도록 필요한 내용만 입력으로 사용하기 위해서 필요함.
