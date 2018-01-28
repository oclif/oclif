const {expect, test} = require('@dxcli/test')

describe('command', () => {
  test
    .stdout()
    .command(['hello'])
    .do(output => expect(output.stdout).to.contain('hello world!'))
    .it('says hello')

  test
    .stdout()
    .command(['hello', '--name', 'jeff'])
    .do(output => expect(output.stdout).to.contain('hello jeff!'))
    .it('says hello jeff')
})
