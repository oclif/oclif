import {Args, Errors, Flags} from '@oclif/core'
import {dim} from 'ansis'
import * as fs from 'fs-extra'
import {writeFile} from 'node:fs/promises'
import {join, resolve} from 'node:path'

import {GeneratorCommand, readPJSON} from '../../generator'
import {castArray, uniq} from '../../util'

export default class GenerateHook extends GeneratorCommand<typeof GenerateHook> {
  static args = {
    name: Args.string({description: 'Name of hook (snake_case).', required: true}),
  }
  static description = 'Add a hook to an existing CLI or plugin.'
  static flags = {
    event: Flags.string({
      default: 'init',
      description: 'Event to run hook on.',
    }),
    force: Flags.boolean({
      description: 'Overwrite existing files.',
    }),
  }

  async run(): Promise<void> {
    const packageJSON = await readPJSON(process.cwd())
    if (!packageJSON) throw new Errors.CLIError('not in a project directory')

    this.log(`Adding a ${dim(this.flags.event)} hook to ${packageJSON.name}!`)

    const source = join(this.templatesDir, 'src', 'hook.ts.ejs')
    const dest = join(process.cwd(), 'src', 'hooks', this.flags.event, `${this.args.name}.ts`)
    await this.template(source, dest, {event: this.flags.event})

    if (packageJSON.devDependencies?.mocha) {
      const testSource = join(this.templatesDir, 'test', 'hook.test.ts.ejs')
      const testDest = join(process.cwd(), 'test', 'hooks', this.flags.event, `${this.args.name}.test.ts`)
      await this.template(testSource, testDest)
    }

    const tsConfigPath = resolve(process.cwd(), 'tsconfig.json')
    const tsConfig = await fs.readJSON(tsConfigPath).catch(() => ({}))
    const outDir = tsConfig.compilerOptions?.outDir ?? 'dist'
    const hooks = packageJSON.oclif?.hooks ?? {}
    hooks[this.flags.event] = hooks[this.flags.event]
      ? uniq([...castArray(hooks[this.flags.event]), `./${outDir}/hooks/${this.flags.event}/${this.args.name}`]).sort()
      : `./${outDir}/hooks/${this.flags.event}/${this.args.name}`

    const updatedPackageJSON = {
      ...packageJSON,
      oclif: {
        ...packageJSON.oclif,
        hooks,
      },
    }

    await writeFile(resolve(process.cwd(), 'package.json'), JSON.stringify(updatedPackageJSON, null, 2))
  }
}
