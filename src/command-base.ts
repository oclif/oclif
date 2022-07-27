import {Command} from '@oclif/core'
import {createEnv} from 'yeoman-environment'

export default abstract class CommandBase extends Command {
  protected async generate(type: string, generatorOptions: Record<string, unknown> = {}): Promise<void> {
    const env = createEnv()

    env.register(
      require.resolve(`./generators/${type}`),
      `oclif:${type}`,
    )

    await env.run(`oclif:${type}`, generatorOptions)
  }
}
