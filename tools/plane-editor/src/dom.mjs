/**
 * Headless DOM bootstrap.
 *
 * prosemirror-view (and therefore Tiptap's Editor) needs a DOM. This module
 * installs a jsdom window as the process globals and MUST be imported before
 * any ProseMirror/Tiptap module is evaluated. Import it first, always.
 *
 * No network, no browser, no timers beyond jsdom's own.
 */
import { JSDOM } from 'jsdom'

const dom = new JSDOM('<!doctype html><html><body></body></html>', {
  pretendToBeVisual: true,
  url: 'https://plane-editor.invalid/',
})

const COPIED_GLOBALS = [
  'Node',
  'Element',
  'HTMLElement',
  'DocumentFragment',
  'Range',
  'Selection',
  'MutationObserver',
  'DOMParser',
  'XMLSerializer',
  'Event',
  'CustomEvent',
  'KeyboardEvent',
  'MouseEvent',
  'InputEvent',
  'ClipboardEvent',
  'CompositionEvent',
  'DragEvent',
]

globalThis.window = dom.window
globalThis.document = dom.window.document
Object.defineProperty(globalThis, 'navigator', {
  value: dom.window.navigator,
  configurable: true,
})
for (const name of COPIED_GLOBALS) {
  if (globalThis[name] === undefined && dom.window[name] !== undefined) {
    globalThis[name] = dom.window[name]
  }
}
globalThis.getSelection = dom.window.getSelection.bind(dom.window)

export const window = dom.window

/** Detached host element for one editor instance. */
export function createHost() {
  return dom.window.document.createElement('div')
}
