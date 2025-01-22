import {Command, Config, Flags, Interfaces, Plugin} from '@oclif/core'
import * as fs from 'fs-extra'
import path from 'node:path'

import ReadmeGenerator from '../readme-generator'

export default class Readme extends Command {
  static description = `The readme must have any of the following tags inside of it for it to be replaced or else it will do nothing:
# Usage
<!-- usage -->
# Commands
<!-- commands -->
# Table of contents
<!-- toc -->

Customize the code URL prefix by setting oclif.repositoryPrefix in package.json.
`
  static flags = {
    aliases: Flags.boolean({
      allowNo: true,
      default: true,
      description: 'Include aliases in the command list.',
    }),
    'dry-run': Flags.boolean({
      description: 'Prints the generated README without modifying the file.',
    }),
    multi: Flags.boolean({
      description: 'Create a different markdown page for each topic.',
    }),
    'nested-topics-depth': Flags.integer({
      dependsOn: ['multi'],
      description: 'Max nested topics depth for multi markdown page generation. Use with --multi enabled.',
    }),
    'output-dir': Flags.string({
      aliases: ['dir'],
      default: 'docs',
      description: 'Output directory for multi docs.',
      required: true,
    }),
    'plugin-directory': Flags.string({
      description: 'Plugin directory to generate README for. Defaults to the current directory.',
    }),
    'readme-path': Flags.string({
      default: 'README.md',
      description: 'Path to the README file.',
      required: true,
    }),
    'repository-prefix': Flags.string({
      description: 'A template string used to build links to the source code.',
    }),
    'tsconfig-path': Flags.string({
      default: 'tsconfig.json',
      description: 'Path to the tsconfig file',
    }),
    version: Flags.string({
      description: 'Version to use in readme links. Defaults to the version in package.json.',
    }),
  }
  static summary = 'Adds commands to README.md in current directory.'
  private flags!: Interfaces.InferredFlags<typeof Readme.flags>

  async run(): Promise<string> {
    const {flags} = await this.parse(Readme)
    this.flags = flags
    this.flags['plugin-directory'] ??= process.cwd()
    const readmePath = path.resolve(this.flags['plugin-directory'], flags['readme-path'])
    const tsConfigPath = path.resolve(this.flags['plugin-directory'], flags['tsconfig-path'])
    if (await fs.pathExists(tsConfigPath)) {
      const {default: JSONC} = await import('tiny-jsonc')
      const tsConfigRaw = await fs.readFile(tsConfigPath, 'utf8')
      const tsConfig = JSONC.parse(tsConfigRaw)
      const outDir = tsConfig.compilerOptions?.outDir ?? 'lib'

      if (!(await fs.pathExists(outDir))) {
        this.warn(`No compiled source found at ${outDir}. Some commands may be missing.`)
      }
    }

    const config = await Config.load({
      devPlugins: false,
      root: this.flags['plugin-directory'],
      userPlugins: false,
    })

    try {
      const p = require.resolve('@oclif/plugin-legacy', {paths: [this.flags['plugin-directory']]})
      const plugin = new Plugin({root: p, type: 'core'})
      await plugin.load()
      config.plugins.set(plugin.name, plugin)
    } catch {}

    await config.runHook('init', {argv: this.argv, id: 'readme'})

    const generator = new ReadmeGenerator(config, {
      aliases: this.flags.aliases,
      dryRun: this.flags['dry-run'],
      multi: this.flags.multi,
      nestedTopicsDepth: this.flags['nested-topics-depth'],
      outputDir: this.flags['output-dir'],
      pluginDir: this.flags['plugin-directory'],
      readmePath,
      repositoryPrefix: this.flags['repository-prefix'],
      version: this.flags.version,
    })

    const readme = await generator.generate()
    if (this.flags['dry-run']) {
      this.log(readme)
    }

    return readme
  }
}
