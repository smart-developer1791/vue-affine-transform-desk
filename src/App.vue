<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import sample from '../public/sample-workspace.json'
import StudioHeader from './components/StudioHeader.vue'
import DataTools from './components/DataTools.vue'
import AppDialog from './components/AppDialog.vue'
import OperationControls from './components/OperationControls.vue'
import TransformPreview from './components/TransformPreview.vue'
import {
  parse,
  serialize,
  shapes,
  points,
  transform,
  fmt,
  matrixText,
  determinant,
  svgExport,
  textExport,
  type Operation,
} from './domain/affine.ts'
import { useStableMatrix } from './composables/useStableMatrix.ts'
import { useDraft } from './services/draft.ts'
import { download } from './services/files.ts'
const { draft, storageStatus } = useDraft('vue-affine-transform-desk:v1', parse(sample), parse)
const identity = computed(() => serialize(draft.value).provenance.marker),
  matrix = useStableMatrix(() => draft.value),
  det = computed(() => determinant(draft.value, matrix.value)),
  selected = ref(draft.value.steps[0]!.id),
  index = computed(() => draft.value.steps.findIndex((s) => s.id === selected.value)),
  active = computed<Operation>({
    get: () => draft.value.steps.find((s) => s.id === selected.value) ?? draft.value.steps[0]!,
    set: (next) => {
      draft.value = parse({
        ...draft.value,
        steps: draft.value.steps.map((s) => (s.id === selected.value ? next : s)),
      })
    },
  }),
  vertices = computed(() =>
    points(draft.value.shape).map((p) => ({ source: p, result: transform(matrix.value, p) })),
  ),
  entries = computed(() => [
    matrix.value[0],
    matrix.value[2],
    matrix.value[4],
    matrix.value[1],
    matrix.value[3],
    matrix.value[5],
    0,
    0,
    1,
  ])
const title = ref(draft.value.name),
  ink = ref(draft.value.ink),
  shape = ref(draft.value.shape),
  error = ref(''),
  about = ref(false),
  removing = ref(false)
function sync() {
  title.value = draft.value.name
  ink.value = draft.value.ink
  shape.value = draft.value.shape
  error.value = ''
}
watch(() => JSON.stringify([draft.value.name, draft.value.ink, draft.value.shape]), sync)
function replace(value: unknown) {
  draft.value = parse(value)
  selected.value = draft.value.steps[0]!.id
  sync()
}
function save() {
  try {
    draft.value = parse({ ...draft.value, name: title.value, ink: ink.value, shape: shape.value })
    sync()
  } catch (e) {
    error.value = (e as Error).message
  }
}
function add(kind: Operation['kind']) {
  if (draft.value.steps.length >= 6) return
  let n = 1
  while (draft.value.steps.some((s) => s.id === 'operation-' + n)) n++
  const base = { id: 'operation-' + n, name: 'New ' + kind, enabled: true },
    step: Operation =
      kind === 'rotate'
        ? { ...base, kind, angle: 0 }
        : { ...base, kind, x: kind === 'scale' ? 100 : 0, y: kind === 'scale' ? 100 : 0 }
  draft.value = parse({ ...draft.value, steps: [...draft.value.steps, step] })
  selected.value = step.id
}
function move(delta: number) {
  const i = index.value,
    j = i + delta
  if (j < 0 || j >= draft.value.steps.length) return
  const steps = [...draft.value.steps]
  ;[steps[i], steps[j]] = [steps[j]!, steps[i]!]
  draft.value = parse({ ...draft.value, steps })
}
function remove() {
  if (draft.value.steps.length <= 1) return
  const steps = draft.value.steps.filter((s) => s.id !== selected.value)
  draft.value = parse({ ...draft.value, steps })
  selected.value = steps[0]!.id
  removing.value = false
}
function exportSvg() {
  download(identity.value + '.svg', svgExport(draft.value), 'image/svg+xml')
}
function exportText() {
  download(identity.value + '-matrix.txt', textExport(draft.value), 'text/plain;charset=utf-8')
}
</script>
<template>
  <div data-project="vue-affine-transform-desk" class="min-h-screen">
    <StudioHeader
      title="Affine Transform Desk"
      subtitle="A little math, a new point of view"
      code="AF"
      ><DataTools
        :workspace="draft"
        :sample="sample"
        :parse="parse"
        :serialize="serialize"
        @replace="replace"
      /><button class="bg-surface hover:bg-soft" @click="about = true">About</button></StudioHeader
    >
    <main class="mx-auto max-w-[1480px] px-4 py-7 sm:px-6 lg:px-8">
      <section class="mb-7 flex flex-wrap items-end justify-between gap-5">
        <div class="min-w-0 max-w-2xl">
          <p class="mb-2 text-xs font-bold uppercase tracking-[.18em] text-accent">
            A SHAPE THROUGH A SEQUENCE
          </p>
          <h1 class="break-words font-display text-3xl font-semibold leading-tight sm:text-4xl">
            {{ draft.name }}
          </h1>
          <p class="mt-3 max-w-xl leading-relaxed text-muted">
            Move, turn, stretch, or reflect a shape. Change the order and watch one composed matrix
            tell a different story.
          </p>
        </div>
        <div class="rounded-xl border border-line bg-surface px-4 py-3 text-right">
          <span class="block font-mono text-xs text-accent" data-ui="marker">{{ identity }}</span
          ><span class="mt-1 block text-xs text-muted" role="status">{{ storageStatus }}</span>
        </div>
      </section>
      <div
        data-ui="workspace"
        class="grid min-w-0 gap-5 xl:grid-cols-[minmax(0,.85fr)_minmax(0,1.15fr)]"
      >
        <section
          class="flex h-[1010px] min-w-0 flex-col overflow-hidden rounded-2xl border border-line bg-surface"
          data-ui="editor-panel"
        >
          <div class="flex items-center justify-between gap-3 border-b border-line p-5">
            <div>
              <h2 class="text-lg font-semibold">The transformation notebook</h2>
              <p class="mt-1 text-xs text-muted">
                First listed applies first · up to six operations
              </p>
            </div>
            <span class="rounded-full bg-soft px-3 py-1 font-mono text-xs text-accent"
              >{{ draft.steps.length }} steps</span
            >
          </div>
          <div class="min-h-0 flex-1 space-y-5 overflow-auto p-5">
            <form @submit.prevent="save" novalidate data-ui="settings-form">
              <label>Workspace name<input v-model="title" maxlength="80" /></label>
              <div class="mt-4 grid grid-cols-2 gap-3">
                <label
                  >Source shape<select v-model="shape">
                    <option v-for="s in shapes" :key="s" :value="s">{{ s }}</option>
                  </select></label
                ><label>Shape HEX<input v-model="ink" maxlength="7" spellcheck="false" /></label>
              </div>
              <p role="alert" class="mt-3 min-h-6 text-xs text-danger">{{ error }}</p>
              <button
                class="mt-2 w-full border-accent! bg-accent text-on-accent hover:brightness-110"
              >
                Apply artwork settings
              </button>
            </form>
            <div class="border-t border-line pt-5">
              <h3 class="font-semibold">Transformation order</h3>
              <div
                class="mt-3 h-40 space-y-1 overflow-auto rounded-lg border border-line bg-soft p-2"
                data-ui="operation-list"
              >
                <button
                  v-for="(step, i) in draft.steps"
                  :key="step.id"
                  :data-operation="step.id"
                  :aria-pressed="selected === step.id"
                  @click="selected = step.id"
                  class="w-full justify-start! text-left"
                  :class="
                    selected === step.id
                      ? 'border-accent bg-white text-accent'
                      : 'border-transparent bg-transparent hover:bg-white'
                  "
                >
                  <span class="shrink-0 font-mono text-xs">{{ i + 1 }}</span
                  ><span class="min-w-0 flex-1 truncate">{{ step.name }}</span
                  ><span class="shrink-0 font-mono text-[10px]">{{
                    step.enabled ? step.kind : 'off'
                  }}</span>
                </button>
              </div>
              <div class="mt-3 flex flex-wrap gap-2">
                <button
                  v-for="kind in ['translate', 'rotate', 'scale'] as const"
                  :key="kind"
                  @click="add(kind)"
                  :disabled="draft.steps.length >= 6"
                  class="bg-soft text-xs text-accent hover:bg-background"
                >
                  Add {{ kind }}
                </button>
              </div>
              <div class="mt-3 flex flex-wrap gap-2">
                <button
                  @click="move(-1)"
                  :disabled="index <= 0"
                  class="bg-surface text-xs hover:bg-soft"
                >
                  Move earlier</button
                ><button
                  @click="move(1)"
                  :disabled="index >= draft.steps.length - 1"
                  class="bg-surface text-xs hover:bg-soft"
                >
                  Move later</button
                ><button
                  @click="removing = true"
                  :disabled="draft.steps.length === 1"
                  class="bg-surface text-xs text-danger hover:bg-soft"
                >
                  Remove operation
                </button>
              </div>
            </div>
            <OperationControls v-model="active" />
          </div>
        </section>
        <section
          class="flex h-[1010px] min-w-0 flex-col overflow-hidden rounded-2xl border border-line bg-surface"
          data-ui="preview-panel"
        >
          <div class="border-b border-line p-5">
            <h2 class="text-lg font-semibold">Follow the little arrow</h2>
            <p class="mt-1 text-xs text-muted">Faint source outline · filled transformed shape</p>
          </div>
          <div class="min-h-0 flex-1 space-y-5 overflow-auto p-5">
            <div class="h-[360px] overflow-hidden rounded-xl border border-line bg-background">
              <TransformPreview :workspace="draft" :matrix="matrix" />
            </div>
            <div class="grid grid-cols-2 gap-3">
              <div class="rounded-xl border border-line p-4">
                <p class="text-[10px] font-semibold uppercase text-muted">Signed area factor</p>
                <p :title="fmt(det)" class="mt-1 truncate font-mono text-lg" data-ui="determinant">
                  {{ fmt(det) }}
                </p>
              </div>
              <div class="rounded-xl border border-line p-4">
                <p class="text-[10px] font-semibold uppercase text-muted">Orientation</p>
                <p class="mt-1 text-sm font-semibold" data-ui="orientation">
                  {{ det === 0 ? 'Collapsed' : det < 0 ? 'Reflected' : 'Preserved' }}
                </p>
              </div>
            </div>
            <div class="rounded-xl border border-line bg-soft p-4">
              <p class="text-xs font-semibold">Composed homogeneous matrix</p>
              <div class="mt-3 grid grid-cols-3 gap-2 font-mono text-xs" data-ui="matrix">
                <span
                  v-for="(n, i) in entries"
                  :key="i"
                  :data-entry="i"
                  :title="fmt(n)"
                  class="truncate rounded-md border border-line bg-white px-2 py-2 text-center"
                  >{{ fmt(n) }}</span
                >
              </div>
              <p class="mt-3 break-all font-mono text-[10px] text-muted" data-ui="matrix-notation">
                {{ matrixText(matrix) }}
              </p>
            </div>
            <div class="h-40 overflow-auto rounded-xl border border-line">
              <table class="w-full min-w-[380px] text-left text-xs">
                <thead class="sticky top-0 bg-background">
                  <tr>
                    <th class="p-3">Point</th>
                    <th class="p-3">Source X, Y</th>
                    <th class="p-3">Result X, Y</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="(p, i) in vertices" :key="i" class="border-t border-line">
                    <td class="p-3">P{{ i + 1 }}</td>
                    <td class="p-3 font-mono">{{ fmt(p.source.x) }}, {{ fmt(p.source.y) }}</td>
                    <td class="p-3 font-mono">{{ fmt(p.result.x) }}, {{ fmt(p.result.y) }}</td>
                  </tr>
                </tbody>
              </table>
            </div>
            <p class="text-xs leading-relaxed text-muted">
              SVG coordinates grow right and down, so positive rotation looks clockwise. Each new
              operation left-multiplies the accumulated matrix. The preview fits the source, result
              and origin; delivery SVG fits the result alone. Zero scale is valid and may leave only
              a line or point.
            </p>
          </div>
          <div class="grid grid-cols-2 gap-2 border-t border-line p-4">
            <button @click="exportSvg" class="bg-background hover:bg-soft">Artwork SVG</button
            ><button @click="exportText" class="bg-background hover:bg-soft">Matrix TXT</button>
          </div>
        </section>
      </div>
      <footer
        class="mt-6 flex flex-wrap items-center justify-between gap-2 border-t border-line pt-4 text-xs text-muted"
      >
        <span>Made with Vue · Stored on this device</span><span>CodeSculptor · MIT · 2026</span>
      </footer>
    </main>
    <AppDialog v-model="removing" title="Remove this operation?"
      ><p class="leading-relaxed text-muted">
        This removes the selected operation and composes the remaining sequence.
      </p>
      <div class="mt-6 flex justify-end gap-2">
        <button @click="removing = false" class="hover:bg-soft">Cancel</button
        ><button @click="remove" class="border-danger! bg-danger text-white">
          Remove operation
        </button>
      </div></AppDialog
    ><AppDialog v-model="about" title="About Affine Transform Desk"
      ><div class="space-y-4 leading-relaxed text-muted">
        <p>
          A small SVG affine editor. Named Vue models validate complete operation edits; a stable
          computed keeps the same matrix object whenever its numeric result stays the same.
        </p>
        <p>
          JSON keeps the editable workspace. Local storage stays on this browser; exports let you
          keep a copy elsewhere.
        </p>
        <a href="/sample-workspace.json" class="font-semibold text-accent underline" download
          >Download the complete sample</a
        >
      </div></AppDialog
    >
  </div>
</template>
