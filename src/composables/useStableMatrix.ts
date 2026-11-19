import { computed } from 'vue'
import { compose, type Workspace, type Matrix } from '../domain/affine.ts'
export function useStableMatrix(workspace: () => Workspace) {
  return computed<Matrix>((previous) => {
    const next = compose(workspace().steps)
    return previous && next.every((n, i) => Object.is(n, previous[i])) ? previous : next
  })
}
