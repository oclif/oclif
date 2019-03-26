const {expect} = require('chai')
const {add} = require('../src')

describe('add', () => {
  it('1+2=3', () => {
    expect(add(1, 2)).to.equal(3)
  })
})
