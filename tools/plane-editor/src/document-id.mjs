/**
 * 문서 정체성 (document identity) — "이 레코드가 **이 문서**의 것인가"를 물을 수 있게
 * 하는 최소 층. 앵커 해소와 링크 종단점이 둘 다 이 값에 기댄다.
 *
 * ## 왜 콘텐츠 해시가 아닌가 (설계 근거)
 *
 * 문서 id에 필요한 성질은 두 가지이고, 콘텐츠 해시는 **둘 다** 어긴다.
 *   1. **생애 안정성** — 문서를 편집해도 같은 문서다. 콘텐츠 해시는 한 글자만 고쳐도
 *      바뀌므로, 어제 캡처한 앵커가 오늘 "다른 문서의 레코드"가 된다.
 *   2. **파생본 구별** — 같은 텍스트를 다시 들여온 문서(재임포트)나 복사해 만든
 *      파생본은 **다른 문서**다. 콘텐츠 해시는 이 둘을 같다고 말한다. 실측된 결함이
 *      바로 그것이다(vnv M5: 같은 clientID로 만든 다른 문서에 레코드가 그대로 붙었다).
 *
 * 그래서 id는 **문서가 생길 때 한 번 발급**되어 그 문서의 CRDT 상태 안에 산다.
 *   - 편집·저장·재로드·오프라인 복제본 병합을 통틀어 같은 값이다 (상태를 따라다닌다).
 *   - 재임포트·파생본은 **새 CRDT를 만드는 행위**이므로 새 id를 받는다.
 *   - 정체성이 없는 문서 상태에는 **로드 시점에 id를 발급하지 않는다** — 그것은 출처를
 *     날조하는 것이다. 정체성 없는 문서에서는 어떤 레코드도 바인딩되지 않는다.
 *
 * 발급기는 이 프로토타입에서 **프로세스 안 단조 카운터**다(결정론적 재현이 스위트의
 * 게이트라 난수를 쓸 수 없다). 실서비스라면 UUIDv4·ULID여야 하며, 성질(발급 1회·상태
 * 저장·재임포트 시 새 값)은 그대로다. 호출부가 명시 id를 줄 수도 있다 — 커밋되는
 * 산출물(sample-state)처럼 값이 안정적이어야 하는 곳은 그렇게 고정한다.
 *
 * ## 문서 순수성 (G1)
 *
 * 이 값은 주석·앵커 데이터가 **아니다**. 문서 자신의 식별자이므로 ProseMirror 스키마와
 * 무관한 별도 Y.Map(`meta`)에 있고, `prosemirrorJSON`에는 나타나지 않는다. G1 게이트가
 * 그 사실(맵 키가 정체성 하나뿐 · 문서 JSON 불변)을 매 실행 확인한다.
 */
import * as Y from 'yjs'

export const DOCUMENT_META_MAP = 'meta'
export const DOCUMENT_ID_KEY = 'documentId'

let minted = 0

/** 결정론적 발급기 (프로세스 안 단조 증가). 실서비스에서는 UUID. */
export function mintDocumentId() {
  minted += 1
  return `doc-${minted}`
}

export function documentIdOf(ydoc) {
  if (!ydoc) return null
  const value = ydoc.getMap(DOCUMENT_META_MAP).get(DOCUMENT_ID_KEY)
  return typeof value === 'string' && value ? value : null
}

export function setDocumentId(ydoc, id) {
  ydoc.getMap(DOCUMENT_META_MAP).set(DOCUMENT_ID_KEY, id)
  return id
}

/** 문서 메타 맵의 키 목록 — G1이 "정체성 말고는 아무것도 없다"를 확인하는 데 쓴다. */
export function documentMetaKeys(ydoc) {
  return [...ydoc.getMap(DOCUMENT_META_MAP).keys()].sort()
}

/**
 * 저장된 Yjs 업데이트에서 문서 정체성을 읽는다. 스토어의 `documentId` 필드는 **사본**일
 * 뿐이고 원본은 언제나 CRDT 상태다 (파일 필드는 손으로 고칠 수 있다).
 */
export function documentIdFromUpdate(update) {
  const probe = new Y.Doc()
  Y.applyUpdate(probe, update)
  const id = documentIdOf(probe)
  probe.destroy()
  return id
}
