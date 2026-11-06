import assert from 'node:assert/strict'
import { test } from 'node:test'
import { tableBackgroundStyle } from '../src/lib/utils.ts'

test('available tables use a transparent green gradient over the image', () => {
  const style = tableBackgroundStyle('preset-1', 70, false)
  assert.ok(style)
  assert.match(style.backgroundImage, /rgba\(4, 120, 87, 0\.45/)
  assert.match(style.backgroundImage, /rgba\(2, 44, 34, 0\.7\)/)
  assert.match(style.backgroundImage, /url\("\/table-backgrounds\/flag-us\.jpg"\)/)
})

test('occupied tables use a transparent red gradient over the image', () => {
  const style = tableBackgroundStyle('preset-2', 50, true)
  assert.ok(style)
  assert.match(style.backgroundImage, /rgba\(153, 27, 27, 0\.325\)/)
  assert.match(style.backgroundImage, /rgba\(69, 10, 10, 0\.5\)/)
  assert.match(style.backgroundImage, /url\("\/table-backgrounds\/flag-uk\.jpg"\)/)
})

test('transparency extremes and missing backgrounds are preserved', () => {
  assert.match(tableBackgroundStyle('preset-3', 0, false).backgroundImage, /rgba\(2, 44, 34, 0\)/)
  assert.match(tableBackgroundStyle('preset-3', 100, true).backgroundImage, /rgba\(69, 10, 10, 1\)/)
  assert.equal(tableBackgroundStyle(null, 70, false), undefined)
})
