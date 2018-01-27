import Command, {flags} from '@dxcli/command'
import {createEnv} from 'yeoman-environment'

export default class extends Command {
  static flags: flags.Input = {
    defaults: flags.boolean({description: 'use defaults for every setting'}),
    options: flags.string({description: '(typescript|semantic-release|mocha)'}),
  }
  static args = [
    {name: 'path', required: false}
  ]

  async run() {
    const env = createEnv()

    env.register(
      require.resolve('../generators/app'),
      'dxcli:app'
    )

    const options = this.flags.options ? this.flags.options.split(',') : []

    await env.run('dxcli:app', {type: 'base', path: this.args.path, options, defaults: this.flags.defaults})
  }
}
