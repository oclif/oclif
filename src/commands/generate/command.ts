import {Args, Errors, Flags} from '@oclif/core'
import chalk from 'chalk'
import {pascalCase} from 'change-case'
import {join} from 'node:path'

import {GeneratorCommand, readPJSON} from '../../generator'

export default class GenerateCommand extends GeneratorCommand<typeof GenerateCommand> {
  static args = {
    name: Args.string({description: 'name of command', required: true}),
  }
  static description = 'Add a command to an existing CLI or plugin.'
  static flags = {
    'commands-dir': Flags.string({default: 'src/commands', description: 'The directory to create the command in.'}),
    force: Flags.boolean({description: 'Overwrite existing files.'}),
  }

  async run(): Promise<void> {
    const packageJSON = await readPJSON(process.cwd())
    if (!packageJSON) throw new Errors.CLIError('not in a project directory')
    const topicSeparator = packageJSON.oclif?.topicSeparator ?? ':'
    this.log(`Adding ${chalk.dim(this.args.name.replaceAll(':', topicSeparator))} to ${packageJSON.name}!`)

    const cmdPath = this.args.name.split(':').join('/')
    const destination = join(process.cwd(), this.flags['commands-dir'], `${cmdPath}.ts`)

    let bin = packageJSON.oclif?.bin ?? packageJSON.oclif?.dirname ?? packageJSON.name
    if (bin.includes('/')) bin = bin.split('/').at(-1)!
    const opts = {
      bin,
      className: pascalCase(this.args.name),
      cmd: `${bin} ${this.args.name}`,
      name: this.args.name,
      path: destination,
      type: 'command',
    }

    await this.template(join(this.templatesDir, 'src', 'command.ts.ejs'), destination, opts)

    if (packageJSON.devDependencies?.mocha) {
      const testTemplatePath = join(this.templatesDir, 'test', 'command.test.ts.ejs')
      const testDestination = join(process.cwd(), 'test', 'commands', `${cmdPath}.test.ts`)
      await this.template(testTemplatePath, testDestination, opts)
    }
  }
}
