const {expect} = require('@dxcli/dev-test')
const {add} = require('../src')

describe('add', () => {
  it('1+2=3', () => {
    expect(add(1, 2)).to.equal(3)
  })
})
