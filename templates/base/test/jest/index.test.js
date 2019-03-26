const {add} = require('../../src')

describe('add', () => {
  test('1+2=3', () => {
    expect(add(1, 2)).toBe(3)
  })
})
