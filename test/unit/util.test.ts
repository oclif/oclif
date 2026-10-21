import {expect} from 'chai'

import {parsePackageManagerField, validateBin} from '../../src/util'

describe('util', () => {
  describe('parsePackageManagerField', () => {
    it('returns the manager name for a supported packageManager field', () => {
      expect(parsePackageManagerField('pnpm@9.1.0')).to.equal('pnpm')
      expect(parsePackageManagerField('yarn@4.0.2')).to.equal('yarn')
      expect(parsePackageManagerField('npm@10.2.0')).to.equal('npm')
    })

    it('returns the manager name when there is no version suffix', () => {
      expect(parsePackageManagerField('pnpm')).to.equal('pnpm')
    })

    it('returns undefined for an unsupported manager', () => {
      expect(parsePackageManagerField('bun@1.0.0')).to.be.undefined
    })

    it('returns undefined when the field is missing or not a string', () => {
      expect(parsePackageManagerField()).to.be.undefined
      expect(parsePackageManagerField(null)).to.be.undefined
      expect(parsePackageManagerField(42)).to.be.undefined
    })
  })

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
})
