import { record, list, unique } from './validation.ts'
import { single, id, integer, provenance } from './shared.ts'
export type Base = { id: string; name: string; enabled: boolean }
export type Operation = Base &
  (
    | { kind: 'translate'; x: number; y: number }
    | { kind: 'rotate'; angle: number }
    | { kind: 'scale'; x: number; y: number }
  )
export type Matrix = [number, number, number, number, number, number]
export type Point = { x: number; y: number }
export const shapes = ['triangle', 'rectangle', 'arrow'] as const
export type Shape = (typeof shapes)[number]
export type Workspace = { version: 1; name: string; shape: Shape; ink: string; steps: Operation[] }
export function parse(value: unknown): Workspace {
  const w = record(value, 'Workspace')
  if (w.version !== 1) throw new Error('Unsupported workspace version.')
  if (!shapes.includes(w.shape as Shape)) throw new Error('Choose triangle, rectangle, or arrow.')
  if (typeof w.ink !== 'string' || !/^#[0-9a-f]{6}$/i.test(w.ink))
    throw new Error('Ink must be six-digit HEX.')
  const steps = list(w.steps, 'Operations', 6).map((value): Operation => {
    const s = record(value, 'Operation')
    if (typeof s.enabled !== 'boolean') throw new Error('Enabled must be a boolean.')
    const base = { id: id(s.id), name: single(s.name, 'Operation name', 32), enabled: s.enabled }
    if (s.kind === 'translate' || s.kind === 'scale')
      return {
        ...base,
        kind: s.kind,
        x: integer(s.x, 'X', -200, 200),
        y: integer(s.y, 'Y', -200, 200),
      }
    if (s.kind === 'rotate')
      return { ...base, kind: 'rotate' as const, angle: integer(s.angle, 'Angle', -180, 180) }
    throw new Error('Unsupported operation.')
  })
  if (!steps.length) throw new Error('Keep at least one operation.')
  unique(
    steps.map((s) => s.id),
    'Operation identities',
  )
  return {
    version: 1,
    name: single(w.name, 'Workspace name', 80),
    shape: w.shape as Shape,
    ink: w.ink.toUpperCase(),
    steps,
  }
}
export function serialize(value: unknown) {
  const w = parse(value)
  return { ...w, provenance: provenance('AF', 'vue-affine-transform-desk', w) }
}
export const identity = (): Matrix => [1, 0, 0, 1, 0, 0]
export function multiply(a: Matrix, b: Matrix): Matrix {
  return [
    a[0] * b[0] + a[2] * b[1],
    a[1] * b[0] + a[3] * b[1],
    a[0] * b[2] + a[2] * b[3],
    a[1] * b[2] + a[3] * b[3],
    a[0] * b[4] + a[2] * b[5] + a[4],
    a[1] * b[4] + a[3] * b[5] + a[5],
  ]
}
export function operation(s: Operation): Matrix {
  if (s.kind === 'translate') return [1, 0, 0, 1, s.x, s.y]
  if (s.kind === 'scale') return [s.x / 100, 0, 0, s.y / 100, 0, 0]
  const angle = (s.angle * Math.PI) / 180,
    clean = (n: number) => (Math.abs(n) < 1e-15 ? 0 : n),
    c = clean(Math.cos(angle)),
    n = clean(Math.sin(angle))
  return [c, n, -n, c, 0, 0]
}
export function compose(steps: Operation[]): Matrix {
  return steps
    .reduce<Matrix>((m, s) => (s.enabled ? multiply(operation(s), m) : m), identity())
    .map((n) => (Object.is(n, -0) ? 0 : n)) as Matrix
}
export function transform(m: Matrix, p: Point): Point {
  return { x: m[0] * p.x + m[2] * p.y + m[4], y: m[1] * p.x + m[3] * p.y + m[5] }
}
export function points(shape: Shape): Point[] {
  const p =
    shape === 'triangle'
      ? [
          [-50, 35],
          [0, -50],
          [50, 35],
        ]
      : shape === 'rectangle'
        ? [
            [-60, -35],
            [60, -35],
            [60, 35],
            [-60, 35],
          ]
        : [
            [-60, -25],
            [10, -25],
            [10, -45],
            [65, 0],
            [10, 45],
            [10, 25],
            [-60, 25],
          ]
  return p.map(([x, y]) => ({ x: x!, y: y! }))
}
export function fmt(n: number) {
  return Number(n.toPrecision(12)).toString()
}
export function matrixText(m: Matrix) {
  return 'matrix(' + m.map(fmt).join(' ') + ')'
}
export function polygon(p: Point[]) {
  return p.map((v) => fmt(v.x) + ',' + fmt(v.y)).join(' ')
}
export function bounds(p: Point[]) {
  const xs = p.map((p) => p.x),
    ys = p.map((p) => p.y),
    x = Math.min(...xs) - 20,
    y = Math.min(...ys) - 20
  return { x, y, width: Math.max(...xs) - x + 20, height: Math.max(...ys) - y + 20 }
}
export function determinant(w: Workspace, m = compose(w.steps)) {
  return w.steps.some((s) => s.enabled && s.kind === 'scale' && (!s.x || !s.y))
    ? 0
    : m[0] * m[3] - m[1] * m[2]
}
function escape(s: string) {
  return s.replace(
    /[&<>"']/g,
    (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!,
  )
}
export function svgExport(w: Workspace) {
  const m = compose(w.steps),
    p = points(w.shape),
    b = bounds(p.map((p) => transform(m, p)))
  return (
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="' +
    [b.x, b.y, b.width, b.height].map(fmt).join(' ') +
    '" role="img" aria-labelledby="title desc"><title id="title">' +
    escape(w.name) +
    '</title><desc id="desc">Ordered affine transforms; first listed applies first. ' +
    serialize(w).provenance.marker +
    ' · CodeSculptor</desc><polygon points="' +
    polygon(p) +
    '" transform="' +
    matrixText(m) +
    '" fill="' +
    w.ink +
    '"/></svg>'
  )
}
export function textExport(w: Workspace) {
  const m = compose(w.steps)
  return (
    w.name +
    '\n' +
    serialize(w).provenance.marker +
    '\nAffine transform · CodeSculptor\nSVG coordinates: X right, Y down; positive rotation appears clockwise.\nFirst listed operation applies first; compose by left multiplication.\nShape: ' +
    w.shape +
    '\nInk: ' +
    w.ink +
    '\n\n' +
    w.steps
      .map(
        (s, i) =>
          i +
          1 +
          '. ' +
          s.name +
          ' [' +
          (s.enabled ? 'on' : 'off') +
          '] ' +
          s.kind +
          ' ' +
          (s.kind === 'rotate'
            ? s.angle + ' deg'
            : s.x + ', ' + s.y + (s.kind === 'scale' ? ' percent' : '')),
      )
      .join('\n') +
    '\n\n' +
    matrixText(m) +
    '\n[a c e; b d f; 0 0 1]\n' +
    [m[0], m[2], m[4]].map(fmt).join(' ') +
    '\n' +
    [m[1], m[3], m[5]].map(fmt).join(' ') +
    '\n0 0 1\nArea factor: ' +
    fmt(determinant(w, m)) +
    '\n\n' +
    points(w.shape)
      .map((p, i) => {
        const q = transform(m, p)
        return (
          'P' + (i + 1) + ': ' + fmt(p.x) + ', ' + fmt(p.y) + ' -> ' + fmt(q.x) + ', ' + fmt(q.y)
        )
      })
      .join('\n')
  )
}
