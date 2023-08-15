import {expect, test} from '@oclif/test'

describe('migrate:plugin:esm-compatible', () => {
  test
  .stdout()
  .command(['migrate:plugin:esm-compatible'])
  .it('runs hello', ctx => {
    expect(ctx.stdout).to.contain('hello world')
  })

  test
  .stdout()
  .command(['migrate:plugin:esm-compatible', '--name', 'jeff'])
  .it('runs hello --name jeff', ctx => {
    expect(ctx.stdout).to.contain('hello jeff')
  })
})
