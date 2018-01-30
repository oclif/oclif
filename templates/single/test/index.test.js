const {expect, test} = require('@dxcli/test')
const cmd = require('..')

describe('command', () => {
  test
    .stdout()
    .do(() => cmd.run([]))
    .it('says hello world!', ctx => {
      expect(ctx.stdout).to.equal('hello world!\n')
    })

  test
    .stdout()
    .do(() => cmd.run(['--name', 'jeff']))
    .it('says hello jeff!', ctx => {
      expect(ctx.stdout).to.equal('hello jeff!\n')
    })
})
