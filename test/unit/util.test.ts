import {expect} from 'chai'

import {validateBin} from '../../src/util'

describe('validateBin', () => {
  const validBins = [
    'foo',
    'foo-bar',
    'foo-bar_baz',
    'foo_bar',
    'foo123',
    '123foo',
    'foo-bar-',
    'foo_bar_',
    '-foo-bar',
    '_foo_bar',
    '123',
  ]

  const invalidBins = ['foo bar', 'foo!bar']

  it('should return true for valid bins', () => {
    for (const bin of validBins) {
      expect(validateBin(bin), `${bin} to be valid`).to.be.true
    }
  })

  it('should return false for invalid bins', () => {
    for (const bin of invalidBins) {
      expect(validateBin(bin), `${bin} to be invalid`).to.be.false
    }
  })
})
