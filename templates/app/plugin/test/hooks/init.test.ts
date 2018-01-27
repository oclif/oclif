import {expect, test} from '@dxcli/dev-test'

describe('hooks', () => {
  test
  .stdout()
  .hook('init', {id: 'mycommand'})
  .do(output => expect(output.stdout).to.contain('example hook running mycommand'))
  .it('shows a message')
})
