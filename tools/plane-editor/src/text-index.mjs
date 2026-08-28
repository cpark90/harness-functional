/**
 * Flat text projection of a ProseMirror document plus a two-way offset map.
 *
 * TextQuoteSelector works in character space; ProseMirror works in position
 * space (node boundaries count). This module is the only place that converts
 * between the two, so the quote lane never guesses positions.
 */

export const BLOCK_SEPARATOR = '\n'

export function buildTextIndex(doc) {
  const parts = []
  let text = ''

  doc.descendants((node, pos) => {
    if (node.isTextblock) {
      if (text.length > 0) text += BLOCK_SEPARATOR
      return true
    }
    if (node.isText) {
      parts.push({ pmFrom: pos, textFrom: text.length, len: node.text.length })
      text += node.text
      return false
    }
    return true
  })

  return { text, parts }
}

/** ProseMirror position -> character offset (clamped to the nearest text run). */
export function posToOffset(index, pos) {
  for (const part of index.parts) {
    if (pos <= part.pmFrom) return part.textFrom
    if (pos <= part.pmFrom + part.len) return part.textFrom + (pos - part.pmFrom)
  }
  return index.text.length
}

/** Character offset -> ProseMirror position, or null if the offset falls in a block gap. */
export function offsetToPos(index, offset) {
  for (const part of index.parts) {
    if (offset >= part.textFrom && offset <= part.textFrom + part.len) {
      return part.pmFrom + (offset - part.textFrom)
    }
  }
  return null
}

export function commonPrefixLength(a, b) {
  const limit = Math.min(a.length, b.length)
  let i = 0
  while (i < limit && a[i] === b[i]) i += 1
  return i
}

export function commonSuffixLength(a, b) {
  const limit = Math.min(a.length, b.length)
  let i = 0
  while (i < limit && a[a.length - 1 - i] === b[b.length - 1 - i]) i += 1
  return i
}
