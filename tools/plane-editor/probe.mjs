import { JSDOM } from 'jsdom'

const dom = new JSDOM('<!doctype html><html><body><div id="root"></div></body></html>', { pretendToBeVisual: true })
globalThis.window = dom.window
globalThis.document = dom.window.document
Object.defineProperty(globalThis, 'navigator', { value: dom.window.navigator, configurable: true })
for (const k of ['Node', 'Element', 'HTMLElement', 'DocumentFragment', 'Range', 'Selection', 'MutationObserver', 'DOMParser', 'XMLSerializer', 'Event', 'CustomEvent']) {
  if (globalThis[k] === undefined && dom.window[k]) globalThis[k] = dom.window[k]
}
globalThis.getSelection = dom.window.getSelection.bind(dom.window)

const { Editor, Extension, getSchema } = await import('@tiptap/core')
const { default: StarterKit } = await import('@tiptap/starter-kit')
const Y = await import('yjs')
const yp = await import('y-prosemirror')

const extensions = [StarterKit.configure({ undoRedo: false })]
const schema = getSchema(extensions)
const docJSON = {
  type: 'doc',
  content: [
    { type: 'paragraph', content: [{ type: 'text', text: 'Alpha beta gamma delta epsilon zeta.' }] },
    { type: 'paragraph', content: [{ type: 'text', text: 'Second paragraph with anchor target here.' }] },
  ],
}

function session(update) {
  const ydoc = new Y.Doc()
  ydoc.clientID = 1
  if (update) Y.applyUpdate(ydoc, update)
  const frag = ydoc.getXmlFragment('prosemirror')
  if (!update) {
    const seeded = yp.prosemirrorJSONToYDoc(schema, docJSON, 'prosemirror')
    Y.applyUpdate(ydoc, Y.encodeStateAsUpdate(seeded))
  }
  const Collab = Extension.create({ name: 'probeCollab', addProseMirrorPlugins: () => [yp.ySyncPlugin(frag)] })
  const el = dom.window.document.createElement('div')
  const editor = new Editor({ element: el, extensions: [...extensions, Collab] })
  const mapping = () => yp.ySyncPluginKey.getState(editor.state).binding.mapping
  return { ydoc, frag, editor, mapping }
}

const s = session()
const doc = s.editor.state.doc
const text = doc.textBetween(0, doc.content.size, '\n')
console.log('TEXT:', JSON.stringify(text))
// anchor on "gamma" in paragraph 1 -> find PM pos
const p1Start = 1
const off = 'Alpha beta '.length
const from = p1Start + off
const to = from + 'gamma'.length
console.log('anchor text:', JSON.stringify(doc.textBetween(from, to)))

function cap(assocStart, assocEnd) {
  return {
    start: Y.encodeRelativePosition(yp.absolutePositionToRelativePosition(from, s.frag, s.mapping(), assocStart)),
    end: Y.encodeRelativePosition(yp.absolutePositionToRelativePosition(to, s.frag, s.mapping(), assocEnd)),
  }
}
const variants = {
  'start+1/end-1': cap(1, -1),
  'start0/end0': cap(0, 0),
  'start-1/end+1': cap(-1, 1),
}

function resolve(sess, rel) {
  const st = yp.relativePositionToAbsolutePosition(sess.ydoc, sess.frag, Y.decodeRelativePosition(rel.start), sess.mapping())
  const en = yp.relativePositionToAbsolutePosition(sess.ydoc, sess.frag, Y.decodeRelativePosition(rel.end), sess.mapping())
  if (st === null || en === null) return { st, en, text: null }
  return { st, en, text: st < en ? sess.editor.state.doc.textBetween(st, en, '\n') : '' }
}

function trial(name, edit) {
  const base = Y.encodeStateAsUpdate(s.ydoc)
  const t = session(base)
  edit(t)
  const out = {}
  for (const [k, rel] of Object.entries(variants)) out[k] = JSON.stringify(resolve(t, rel))
  console.log('---', name, JSON.stringify(t.editor.state.doc.textBetween(0, t.editor.state.doc.content.size, '\n')))
  for (const [k, v] of Object.entries(out)) console.log('   ', k, v)
}

trial('insert AT from', (t) => t.editor.view.dispatch(t.editor.state.tr.insertText('[PRE]', from)))
trial('insert AT to', (t) => t.editor.view.dispatch(t.editor.state.tr.insertText('[POST]', to)))
trial('insert INSIDE', (t) => t.editor.view.dispatch(t.editor.state.tr.insertText('[IN]', from + 2)))
trial('delete BEFORE', (t) => t.editor.view.dispatch(t.editor.state.tr.delete(from - 5, from)))
trial('delete WHOLE range', (t) => t.editor.view.dispatch(t.editor.state.tr.delete(from, to)))
trial('delete TAIL half + after', (t) => t.editor.view.dispatch(t.editor.state.tr.delete(from + 2, to + 3)))
trial('cut+paste block', (t) => {
  const $p = t.editor.state.doc.resolve(from)
  const bFrom = $p.before(1)
  const bTo = $p.after(1)
  const node = t.editor.state.doc.child($p.index(0))
  t.editor.view.dispatch(t.editor.state.tr.delete(bFrom, bTo))
  t.editor.view.dispatch(t.editor.state.tr.insert(t.editor.state.doc.content.size, node))
})
