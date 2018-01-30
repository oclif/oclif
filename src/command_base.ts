import Command from '@anycli/command'
import {createEnv} from 'yeoman-environment'

export default abstract class CommandBase extends Command {
  protected async generate(type: string, generatorOptions: object = {}) {
    const env = createEnv()

    env.register(
      require.resolve(`./generators/${type}`),
      `anycli:${type}`
    )

    await env.run(`anycli:${type}`, generatorOptions)
  }
}
