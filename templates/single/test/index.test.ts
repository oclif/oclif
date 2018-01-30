import {expect, test} from '@anycli/test'

import cmd from '../src'

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
