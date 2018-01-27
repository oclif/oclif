const {expect, test} = require('@dxcli/dev-test')
const cmd = require('..')

describe('command', () => {
  test
    .stdout()
    .do(() => cmd.run([]))
    .do(output => expect(output.stdout).to.equal('hello world!\n'))
    .it('says hello world!')

  test
    .stdout()
    .do(() => cmd.run(['--name', 'jeff']))
    .do(output => expect(output.stdout).to.equal('hello jeff!\n'))
    .it('says hello jeff!')
})
