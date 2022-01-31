import {deleteFolder} from './helper'
import {expect} from '@oclif/test'

describe('helper', () => {
  it('should not do a recursive list', async () => {
    const list = await deleteFolder('dfc-data-production', 'media/salesforce-cli/oclif-testing/versions')
    expect(list).to.be.ok
  })
})
