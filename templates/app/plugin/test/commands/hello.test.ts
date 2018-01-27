import {expect, test} from '@dxcli/dev-test'

describe('command', () => {
  test
  .stdout()
  .command(['hello'])
  .it('says hello', output => {
    expect(output.stdout).to.contain('hello world!')
  })

  test
  .stdout()
  .command(['hello', '--name', 'jeff'])
  .it('says hello jeff', output => {
    expect(output.stdout).to.contain('hello jeff!')
  })
})
