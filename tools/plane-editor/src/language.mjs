/**
 * G5 언어 정책(gr-lang: Korean/English only)을 기계적으로 재는 검사.
 *
 * 대상은 **손으로 쓴 파일만**이다 (생성물 REPORT.md·suite-result.json·schema-dump.json·
 * sample-state/는 제외 — 스위트가 다시 쓰므로 실행 순서에 따라 값이 흔들린다).
 * 허용 문자는 ASCII + 한글 + 아래 기호 allowlist뿐이고, 그 밖의 문자(가나·한자·키릴 등)는
 * 위반으로 코드포인트와 함께 보고한다.
 */
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

/** 산문에 실제로 쓰는 기호만 명시 허용 — 늘리려면 여기 적어야 한다. */
const PUNCTUATION_ALLOWLIST = new Set([
  '§', // §
  '·', // ·
  '×', // ×
  '–', // – (en dash: S1–S8 같은 범위 표기)
  '—', // —
  '‘',
  '’',
  '“',
  '”',
  '…', // …
  '→', // →
  '≠', // ≠
  '≤',
  '≥',
  '✓', // ✓
])

const HANGUL_RANGES = [
  [0x1100, 0x11ff],
  [0x3130, 0x318f],
  [0xac00, 0xd7a3],
]

/** 손으로 쓰는 파일 목록 (생성물 제외, 고정 순서 = 결정론). */
export const AUTHORED_FILES = [
  'README.md',
  'package.json',
  'run-suite.mjs',
  'probe.mjs',
  'fixtures/anchors.json',
  'fixtures/document.json',
  'fixtures/twin-anchors.json',
  'fixtures/twin-document.json',
  'src/anchors.mjs',
  'src/annotation-plane.mjs',
  'src/blocks.mjs',
  'src/dom.mjs',
  'src/language.mjs',
  'src/reload-child.mjs',
  'src/report.mjs',
  'src/scenarios.mjs',
  'src/schema.mjs',
  'src/session.mjs',
  'src/store.mjs',
  'src/text-index.mjs',
]

function allowed(codePoint, char) {
  if (codePoint === 0x0a || codePoint === 0x0d || codePoint === 0x09) return true
  if (codePoint >= 0x20 && codePoint <= 0x7e) return true
  if (PUNCTUATION_ALLOWLIST.has(char)) return true
  return HANGUL_RANGES.some(([low, high]) => codePoint >= low && codePoint <= high)
}

export function checkLanguagePolicy(baseUrl) {
  const violations = []
  let hangulChars = 0
  let asciiChars = 0
  for (const relative of AUTHORED_FILES) {
    const text = readFileSync(fileURLToPath(new URL(relative, baseUrl)), 'utf8')
    let line = 1
    for (const char of text) {
      const codePoint = char.codePointAt(0)
      if (char === '\n') line += 1
      if (codePoint >= 0x20 && codePoint <= 0x7e) asciiChars += 1
      else if (HANGUL_RANGES.some(([low, high]) => codePoint >= low && codePoint <= high)) hangulChars += 1
      if (!allowed(codePoint, char)) {
        violations.push({
          file: relative,
          line,
          char,
          codePoint: `U+${codePoint.toString(16).toUpperCase().padStart(4, '0')}`,
        })
      }
    }
  }
  return {
    pass: violations.length === 0,
    filesScanned: AUTHORED_FILES.length,
    asciiChars,
    hangulChars,
    violations,
  }
}
