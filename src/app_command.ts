import Command, {flags} from '@dxcli/command'
import {createEnv} from 'yeoman-environment'

export default abstract class AppCommand extends Command {
  static flags: flags.Input = {
    defaults: flags.boolean({description: 'use defaults for every setting'}),
    options: flags.string({description: '(typescript|semantic-release|mocha)'}),
    force: flags.boolean({description: 'overwrite existing files'}),
  }
  static args = [
    {name: 'path', required: false}
  ]

  abstract type: string

  async run() {
    const env = createEnv()

    env.register(
      require.resolve('./generators/app'),
      'dxcli:app'
    )

    const options = this.flags.options ? this.flags.options.split(',') : []

    await env.run('dxcli:app', {type: this.type, path: this.args.path, options, defaults: this.flags.defaults, force: this.flags.force})
  }
}
