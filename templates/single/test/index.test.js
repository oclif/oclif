const {expect, test} = require('@dxcli/test')
const cmd = require('..')

describe('command', () => {
  test
    .stdout()
    .do(() => cmd.run([]))
    .do(ctx => expect(ctx.stdout).to.equal('hello world!\n'))
    .it('says hello world!')

  test
    .stdout()
    .do(() => cmd.run(['--name', 'jeff']))
    .do(ctx => expect(ctx.stdout).to.equal('hello jeff!\n'))
    .it('says hello jeff!')
})
