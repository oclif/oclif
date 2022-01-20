import {Command} from '@oclif/core'
import {createEnv} from 'yeoman-environment'

export default abstract class CommandBase extends Command {
  protected generate(type: string, generatorOptions: Record<string, unknown> = {}): void {
    const env = createEnv()

    env.register(
      require.resolve(`./generators/${type}`),
      `oclif:${type}`,
    )
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    env.run(`oclif:${type}`, generatorOptions)
  }
}
