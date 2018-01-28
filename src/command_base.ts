import Command from '@dxcli/command'
import {createEnv} from 'yeoman-environment'

export default abstract class CommandBase extends Command {
  protected async generate(type: string, generatorOptions: object = {}) {
    const env = createEnv()

    env.register(
      require.resolve(`./generators/${type}`),
      `dxcli:${type}`
    )

    await env.run(`dxcli:${type}`, generatorOptions)
  }
}
