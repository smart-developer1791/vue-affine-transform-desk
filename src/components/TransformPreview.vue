<script setup lang="ts">
import { computed, useId } from 'vue'
import {
  points,
  transform,
  bounds,
  polygon,
  matrixText,
  type Workspace,
  type Matrix,
} from '../domain/affine.ts'
const props = defineProps<{ workspace: Workspace; matrix: Matrix }>()
const title = useId(),
  description = useId(),
  original = computed(() => points(props.workspace.shape)),
  box = computed(() =>
    bounds([
      ...original.value,
      ...original.value.map((p) => transform(props.matrix, p)),
      { x: 0, y: 0 },
    ]),
  ),
  viewBox = computed(() => {
    const b = box.value
    return [b.x, b.y, b.width, b.height].join(' ')
  })
</script>
<template>
  <div class="flex h-full min-w-0 items-center overflow-auto p-5">
    <svg
      :viewBox="viewBox"
      :aria-labelledby="title + ' ' + description"
      role="img"
      class="h-full min-h-[260px] min-w-[280px] flex-1"
      data-ui="transform-preview"
    >
      <title :id="title">Original and transformed {{ workspace.shape }}</title>
      <desc :id="description">
        The faint outline is the source. The filled polygon uses the composed matrix. The view
        automatically fits both shapes and the origin.
      </desc>
      <path
        :d="
          'M ' +
          box.x +
          ' 0 H ' +
          (box.x + box.width) +
          ' M 0 ' +
          box.y +
          ' V ' +
          (box.y + box.height)
        "
        fill="none"
        stroke="#566E9940"
        stroke-width="1"
        vector-effect="non-scaling-stroke"
      />
      <polygon
        :points="polygon(original)"
        fill="none"
        stroke="#566E99"
        stroke-dasharray="5 4"
        stroke-width="1.5"
        opacity=".5"
        vector-effect="non-scaling-stroke"
        data-ui="original-polygon"
      />
      <polygon
        :points="polygon(original)"
        :transform="matrixText(matrix)"
        :fill="workspace.ink"
        opacity=".85"
        data-ui="transformed-polygon"
      />
      <circle cx="0" cy="0" r="2" fill="#292632" />
    </svg>
  </div>
</template>
