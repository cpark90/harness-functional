/**
 * S8 round-trip: a SEPARATE node process that knows nothing but the store
 * directory. It rebuilds the document from the persisted Yjs update, reloads
 * the standoff annotation file, and resolves every anchor from scratch.
 *
 *   node src/reload-child.mjs <storeDir>   ->  JSON on stdout
 */
import './dom.mjs'
import { openSession } from './session.mjs'
import { loadStore, STORE_VERSION } from './store.mjs'
import { resolveAnchors } from './anchors.mjs'
import { replaceAnnotations, annotationRecords } from './annotation-plane.mjs'

const RELOAD_CLIENT_ID = 41

const dir = process.argv[2]
if (!dir) {
  process.stderr.write('usage: node src/reload-child.mjs <storeDir>\n')
  process.exit(2)
}

const store = loadStore(dir)
const session = openSession({ update: store.docUpdate, clientID: RELOAD_CLIENT_ID })

const annotations = store.annotations.map((record) => ({
  id: record.id,
  status: record.status,
  resolution: resolveAnchors(session, record.anchors),
}))

// Re-hydrate the live plane from the resolved anchors: orphans stay orphans,
// they do not silently vanish from the plane.
replaceAnnotations(
  session.editor.view,
  annotations.map((item) => ({
    id: item.id,
    from: item.resolution.from,
    to: item.resolution.to,
    body: '',
    status: item.status,
    orphaned: item.resolution.method === 'orphaned',
  })),
)

const rehydrated = annotationRecords(session.editor.state)

process.stdout.write(
  JSON.stringify({
    pid: process.pid,
    storeVersion: STORE_VERSION,
    docText: session.text(),
    planeRecords: rehydrated.length,
    planeOrphans: rehydrated.filter((record) => record.orphaned).length,
    annotations,
  }),
)
session.close()
