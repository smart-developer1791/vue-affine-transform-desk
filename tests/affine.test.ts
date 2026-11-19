import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
const fixture = JSON.parse(
  readFileSync(new URL('../public/sample-workspace.json', import.meta.url), 'utf8'),
)

import { ref, watch, effectScope } from 'vue'
import {
  parse,
  serialize,
  compose,
  multiply,
  operation,
  identity,
  transform,
  points,
  determinant,
  svgExport,
  textExport,
} from '../src/domain/affine.ts'
import { useStableMatrix } from '../src/composables/useStableMatrix.ts'
test('sample composes scale then clockwise turn then translation with signed area factor 1.04', () => {
  const w = parse(fixture),
    m = compose(w.steps)
  assert.ok(Math.abs(m[0] - 1.1258330249197703) < 1e-12)
  assert.ok(Math.abs(m[1] - 0.65) < 1e-12)
  assert.deepEqual(m.slice(4), [70, -25])
  assert.ok(Math.abs(determinant(w) - 1.04) < 1e-12)
  assert.match(serialize(w).provenance.marker, /^AF-[A-F0-9]{8}$/)
  assert.deepEqual(parse(serialize(w)), w)
  assert.notEqual(
    serialize({ ...w, name: '🙂' }).provenance.marker,
    serialize({ ...w, name: '🙃' }).provenance.marker,
  )
})
test('ordered composition matches independently applied points and translation/scale reversal changes position', () => {
  const w = parse(fixture)
  for (const p of points('arrow')) {
    const expected = w.steps.reduce((p, s) => transform(operation(s), p), p),
      actual = transform(compose(w.steps), p)
    assert.ok(Math.abs(expected.x - actual.x) < 1e-10)
    assert.ok(Math.abs(expected.y - actual.y) < 1e-10)
  }
  const steps = parse({
    ...fixture,
    steps: [
      { id: 'move', name: 'Move', enabled: true, kind: 'translate', x: 10, y: 20 },
      { id: 'scale', name: 'Scale', enabled: true, kind: 'scale', x: 200, y: 200 },
    ],
  }).steps
  assert.deepEqual(transform(compose(steps), { x: 1, y: 1 }), { x: 22, y: 42 })
  assert.deepEqual(transform(compose([...steps].reverse()), { x: 1, y: 1 }), { x: 12, y: 22 })
  assert.deepEqual(multiply(identity(), compose(steps)), compose(steps))
})
test('disabled/no-op steps, reflections, exact axis rotations and very small nonzero scales retain mathematical behavior', () => {
  const w = parse(fixture),
    off = w.steps.map((s) => ({ ...s, enabled: false }))
  assert.deepEqual(compose(off), identity())
  const base = { id: 'first', name: 'First', enabled: true },
    turn = operation({ ...base, kind: 'rotate', angle: 90 })
  assert.deepEqual(transform(turn, { x: 10, y: 0 }), { x: 0, y: 10 })
  assert.equal(determinant({ ...w, steps: [{ ...base, kind: 'scale', x: -100, y: 100 }] }), -1)
  assert.equal(
    determinant({ ...w, steps: [{ ...base, kind: 'scale', x: 0, y: 100 }, ...w.steps] }),
    0,
  )
  const tiny = parse({
      ...w,
      steps: Array.from({ length: 6 }, (_, i) => ({
        ...base,
        id: 'tiny-' + i,
        kind: 'scale',
        x: 1,
        y: 1,
      })),
    }),
    m = compose(tiny.steps)
  assert.ok(m[0] > 0 && m[0] < 1e-11)
  assert.ok(svgExport(tiny).includes('1e-12'))
})
test('Vue computed reuses matrix identity for label, disabled-value, and neutral-step edits but publishes numeric changes', () => {
  const owner = effectScope(),
    w = ref(parse(fixture)),
    matrix = owner.run(() => useStableMatrix(() => w.value))!,
    first = matrix.value
  let notifications = 0
  const stop = watch(matrix, () => notifications++, { flush: 'sync' })
  w.value = {
    ...w.value,
    name: 'Another name',
    steps: w.value.steps.map((s) => ({ ...s, name: 'Other' })),
  }
  assert.equal(matrix.value, first)
  assert.equal(notifications, 0)
  w.value = parse({
    ...w.value,
    steps: [
      ...w.value.steps,
      { id: 'off', name: 'Off', enabled: false, kind: 'translate', x: 200, y: -200 },
    ],
  })
  assert.equal(matrix.value, first)
  assert.equal(notifications, 0)
  w.value = parse({
    ...w.value,
    steps: w.value.steps.map((s) => (s.id === 'off' ? { ...s, enabled: true } : s)),
  })
  assert.notEqual(matrix.value, first)
  assert.equal(notifications, 1)
  stop()
  owner.stop()
})
test('strict operation kinds, bounds, identities, shape, HEX and real primitives reject malformed workspaces', () => {
  for (const change of [
    (w: any) => (w.steps = []),
    (w: any) => (w.steps[0].x = '100'),
    (w: any) => (w.steps[0].x = 201),
    (w: any) => (w.steps[1].angle = 180.1),
    (w: any) => (w.steps[0].enabled = 1),
    (w: any) => (w.steps[0].id = 'constructor'),
    (w: any) => (w.steps[1].id = w.steps[0].id),
    (w: any) => (w.shape = 'circle'),
    (w: any) => (w.ink = '#xyzxyz'),
    (w: any) => (w.version = 2),
  ]) {
    const w = structuredClone(fixture)
    change(w)
    assert.throws(() => parse(w))
  }
})
test('transparent complete SVG/TXT escape metadata, fit collapsed shapes, and retain maximum operations in JSON', () => {
  const w = parse({
      ...fixture,
      name: '<script>Arrow</script>',
      steps: Array.from({ length: 6 }, (_, i) => ({
        id: 'operation-' + i,
        name: '"'.repeat(32),
        enabled: true,
        kind: 'scale',
        x: i ? -200 : 0,
        y: 200,
      })),
    }),
    svg = svgExport(w)
  assert.ok(svg.includes('&lt;script&gt;Arrow&lt;/script&gt;'))
  assert.equal(svg.includes('<script>'), false)
  assert.equal((svg.match(/<polygon/g) || []).length, 1)
  assert.equal(svg.includes('<rect'), false)
  assert.ok(textExport(w).includes('Area factor: 0'))
  assert.ok(textExport(w).includes(serialize(w).provenance.marker))
  assert.ok(JSON.stringify(serialize(w)).length < 120000)
  assert.deepEqual(parse(serialize(w)), w)
})
