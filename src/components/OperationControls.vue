<script setup lang="ts">
import { ref, watch } from 'vue'
import type { Operation } from '../domain/affine.ts'
import { single, integer } from '../domain/shared.ts'
const model = defineModel<Operation>({ required: true })
const name = ref(''),
  enabled = ref(true),
  x = ref<string | number>(0),
  y = ref<string | number>(0),
  angle = ref<string | number>(0),
  error = ref('')
function sync() {
  name.value = model.value.name
  enabled.value = model.value.enabled
  error.value = ''
  if (model.value.kind === 'rotate') angle.value = model.value.angle
  else {
    x.value = model.value.x
    y.value = model.value.y
  }
}
watch(() => JSON.stringify(model.value), sync, { immediate: true })
function number(v: string | number) {
  return typeof v === 'number' ? v : v.trim() ? Number(v) : NaN
}
function save() {
  try {
    const base = {
      ...model.value,
      name: single(name.value, 'Operation name', 32),
      enabled: enabled.value,
    }
    model.value =
      model.value.kind === 'rotate'
        ? { ...base, kind: 'rotate', angle: integer(number(angle.value), 'Angle', -180, 180) }
        : {
            ...base,
            kind: model.value.kind,
            x: integer(number(x.value), 'X', -200, 200),
            y: integer(number(y.value), 'Y', -200, 200),
          }
    sync()
  } catch (e) {
    error.value = (e as Error).message
  }
}
</script>
<template>
  <form @submit.prevent="save" novalidate data-ui="operation-form" class="space-y-4">
    <h3 class="font-semibold capitalize">{{ model.kind }} settings</h3>
    <label>Operation name<input v-model="name" maxlength="32" /></label
    ><label class="flex items-center gap-2"
      ><input v-model="enabled" type="checkbox" />Enable operation</label
    ><label v-if="model.kind === 'rotate'"
      >Angle, degrees<input v-model="angle" type="number" min="-180" max="180" step="1"
    /></label>
    <div v-else class="grid grid-cols-2 gap-3">
      <label
        >{{ model.kind === 'scale' ? 'Scale X, %' : 'Translate X, units'
        }}<input v-model="x" type="number" min="-200" max="200" step="1" /></label
      ><label
        >{{ model.kind === 'scale' ? 'Scale Y, %' : 'Translate Y, units'
        }}<input v-model="y" type="number" min="-200" max="200" step="1"
      /></label>
    </div>
    <p role="alert" class="min-h-6 text-xs text-danger">{{ error }}</p>
    <button class="w-full bg-background text-accent hover:bg-soft">Apply operation</button>
    <p class="text-xs leading-relaxed text-muted">
      Scale uses percentages: 100 keeps size, negative reflects, zero collapses an axis. Rotation is
      around the origin in SVG coordinates.
    </p>
  </form>
</template>
