import {expect} from '@dxcli/dev-test'

import {add} from '../src'

describe('add', () => {
  it('1+2=3', () => {
    expect(add(1, 2)).to.equal(3)
  })
})
