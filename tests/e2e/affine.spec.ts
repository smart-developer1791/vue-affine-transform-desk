import { test, expect, type Page } from '@playwright/test'
import { readFile } from 'node:fs/promises'
const fixture = JSON.parse(
  await readFile(new URL('../../public/sample-workspace.json', import.meta.url), 'utf8'),
)
async function importData(page: Page, value: unknown) {
  await page.getByRole('button', { name: 'Import', exact: true }).click()
  await page.getByLabel('Workspace JSON', { exact: true }).fill(JSON.stringify(value))
  await page.getByRole('button', { name: 'Import workspace', exact: true }).click()
  await expect(page.locator('dialog[open]')).toHaveCount(0)
}
async function deliver(page: Page, label: string) {
  const pending = page.waitForEvent('download')
  await page.getByRole('button', { name: label, exact: true }).click()
  const file = await pending
  return { name: file.suggestedFilename(), buffer: await readFile((await file.path())!) }
}

import { parse, compose, matrixText, transform, points } from '../../src/domain/affine.ts'
test('named operation model validates atomically, preserves pending fields on artwork edits and updates actual SVG matrices', async ({
  page,
}) => {
  await page.goto('/')
  const before = await page.locator('[data-ui="transformed-polygon"]').getAttribute('transform')
  await page.getByRole('spinbutton', { name: 'Scale X, %', exact: true }).fill('201')
  await page.getByRole('button', { name: 'Apply operation', exact: true }).click()
  await expect(page.locator('[data-ui="operation-form"]').getByRole('alert')).toContainText(
    '-200 to 200',
  )
  await expect(page.locator('[data-ui="transformed-polygon"]')).toHaveAttribute(
    'transform',
    before!,
  )
  await page.getByRole('textbox', { name: 'Operation name', exact: true }).fill('A pending stretch')
  await page.getByRole('textbox', { name: 'Workspace name', exact: true }).fill('A renamed arrow')
  await page.getByRole('textbox', { name: 'Shape HEX', exact: true }).fill('#abcdef')
  await page.getByRole('button', { name: 'Apply artwork settings', exact: true }).click()
  await expect(page.getByRole('textbox', { name: 'Operation name', exact: true })).toHaveValue(
    'A pending stretch',
  )
  await page.getByRole('spinbutton', { name: 'Scale X, %', exact: true }).fill('150')
  await page.getByRole('spinbutton', { name: 'Scale Y, %', exact: true }).fill('-80')
  await page.getByRole('button', { name: 'Apply operation', exact: true }).click()
  const w = parse({
      ...fixture,
      steps: fixture.steps.map((s: any, i: number) =>
        i ? s : { ...s, x: 150, y: -80, name: 'A pending stretch' },
      ),
    }),
    m = compose(w.steps)
  await expect(page.locator('[data-ui="transformed-polygon"]')).toHaveAttribute(
    'transform',
    matrixText(m),
  )
  await expect(page.locator('[data-ui="transformed-polygon"]')).toHaveAttribute('fill', '#ABCDEF')
  const native = await page.locator('[data-ui="transformed-polygon"]').evaluate((el) => {
    const m = (el as unknown as SVGGraphicsElement).transform.baseVal.consolidate()!.matrix
    return [m.a, m.b, m.c, m.d, m.e, m.f]
  })
  native.forEach((v, i) => expect(v).toBeCloseTo(m[i]!, 5))
  await expect(page.locator('[data-ui="orientation"]')).toHaveText('Reflected')
  await page.reload()
  await expect(page.getByRole('spinbutton', { name: 'Scale X, %', exact: true })).toHaveValue('150')
})
test('reordering applies the first step first and retains keyed operation cards and preview height', async ({
  page,
}) => {
  await page.goto('/')
  await importData(page, {
    ...fixture,
    steps: [
      { id: 'move', name: 'Move', enabled: true, kind: 'translate', x: 10, y: 20 },
      { id: 'scale', name: 'Scale', enabled: true, kind: 'scale', x: 200, y: 200 },
    ],
  })
  const card = page.locator('[data-operation="move"]'),
    panel = page.locator('[data-ui="preview-panel"]'),
    height = await panel.evaluate((e) => e.getBoundingClientRect().height)
  await card.evaluate((e) => {
    ;(window as any).__move = e
  })
  await expect(page.locator('[data-ui="matrix-notation"]')).toHaveText('matrix(2 0 0 2 20 40)')
  await page.getByRole('button', { name: 'Move later', exact: true }).click()
  await expect(page.locator('[data-ui="matrix-notation"]')).toHaveText('matrix(2 0 0 2 10 20)')
  expect(await card.evaluate((e) => e === (window as any).__move)).toBe(true)
  expect(await panel.evaluate((e) => e.getBoundingClientRect().height)).toBe(height)
})
test('zero and negative scale remain valid, disabled operations become neutral, and confirmed collection limits hold', async ({
  page,
}) => {
  await page.goto('/')
  await importData(page, {
    ...fixture,
    steps: [{ id: 'scale', name: 'Scale', enabled: true, kind: 'scale', x: 100, y: 100 }],
  })
  await page.getByRole('spinbutton', { name: 'Scale X, %', exact: true }).fill('0')
  await page.getByRole('button', { name: 'Apply operation', exact: true }).click()
  await expect(page.locator('[data-ui="determinant"]')).toHaveText('0')
  await expect(page.locator('[data-ui="orientation"]')).toHaveText('Collapsed')
  await page.getByRole('spinbutton', { name: 'Scale X, %', exact: true }).fill('-100')
  await page.getByRole('button', { name: 'Apply operation', exact: true }).click()
  await expect(page.locator('[data-ui="determinant"]')).toHaveText('-1')
  await page.getByRole('checkbox', { name: 'Enable operation', exact: true }).uncheck()
  await page.getByRole('button', { name: 'Apply operation', exact: true }).click()
  await expect(page.locator('[data-ui="matrix-notation"]')).toHaveText('matrix(1 0 0 1 0 0)')
  await page.getByRole('button', { name: 'Add rotate', exact: true }).click()
  await page.getByRole('button', { name: 'Remove operation', exact: true }).click()
  await page.getByRole('button', { name: 'Cancel', exact: true }).click()
  await expect(page.locator('[data-operation]')).toHaveCount(2)
  await page.getByRole('button', { name: 'Remove operation', exact: true }).click()
  await page
    .getByRole('dialog')
    .getByRole('button', { name: 'Remove operation', exact: true })
    .click()
  await expect(page.getByRole('button', { name: 'Remove operation', exact: true })).toBeDisabled()
  for (let i = 0; i < 5; i++)
    await page.getByRole('button', { name: 'Add translate', exact: true }).click()
  await expect(page.locator('[data-operation]')).toHaveCount(6)
  await expect(page.getByRole('button', { name: 'Add scale', exact: true })).toBeDisabled()
})
test('actual SVG contains one transformed polygon, escaped metadata and fitted geometry while TXT/JSON retain full recipe', async ({
  page,
}) => {
  await page.goto('/')
  await importData(page, { ...fixture, name: '<script>Arrow</script>' })
  const download = await deliver(page, 'Artwork SVG'),
    facts = await page.evaluate((text) => {
      const doc = new DOMParser().parseFromString(text, 'image/svg+xml'),
        root = doc.documentElement,
        shape = doc.querySelector('polygon')!,
        box = root.getAttribute('viewBox')!.split(' ').map(Number)
      return {
        bad: doc.querySelectorAll('script,parsererror').length,
        title: doc.querySelector('title')?.textContent,
        polygons: doc.querySelectorAll('polygon').length,
        rects: doc.querySelectorAll('rect').length,
        transform: shape.getAttribute('transform'),
        box,
      }
    }, download.buffer.toString('utf8'))
  expect(download.name).toMatch(/^AF-[A-F0-9]{8}\.svg$/)
  expect(facts.bad).toBe(0)
  expect(facts.title).toBe('<script>Arrow</script>')
  expect(facts.polygons).toBe(1)
  expect(facts.rects).toBe(0)
  expect(facts.transform).toBe(matrixText(compose(parse(fixture).steps)))
  const m = compose(parse(fixture).steps),
    [x, y, width, height] = facts.box
  for (const p of points('arrow').map((p) => transform(m, p))) {
    expect(p.x).toBeGreaterThanOrEqual(x!)
    expect(p.x).toBeLessThanOrEqual(x! + width!)
    expect(p.y).toBeGreaterThanOrEqual(y!)
    expect(p.y).toBeLessThanOrEqual(y! + height!)
  }
  const text = (await deliver(page, 'Matrix TXT')).buffer.toString('utf8')
  expect(text).toContain('First listed operation applies first')
  expect(text).toContain('Area factor: 1.04')
  expect(text).toContain(await page.locator('[data-ui="marker"]').innerText())
  const json = JSON.parse((await deliver(page, 'JSON')).buffer.toString('utf8'))
  expect(json.steps).toEqual(fixture.steps)
  expect(json.matrix).toBeUndefined()
  expect(json.selected).toBeUndefined()
})
