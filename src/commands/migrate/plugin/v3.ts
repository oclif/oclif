import {Command, Flags} from '@oclif/core'
import {generate} from '../../../util'

type ModuleType = 'esm' | 'cjs'
type VersionBump = 'major' | 'minor' | 'patch' | 'none'

export default class MigratePluginV3 extends Command {
  static state = 'beta'
  static hidden = true
  static summary = 'Migrate a plugin to work with @oclif/core v3'
  static description = `
  This command will do the following:
    - Update @oclif/core to v3
    - Update to latest eslint, mocha, ts-node, and @oclif/test
    - Update to typescript to ^4.9.5 if it's currently less than 4.7.4
    - Update tsconfig.json to be ESM/CJS interoperable
    - Ensure that either main or exports is used in package.json

  Running the command with --module-type esm (which is the default) will also migrate the plugin's package.json, tsconfig.json, and .mocharc.json to ESM. Other changes might be required to fully migrate the plugin to ESM.
  Running the command with --module-type cjs will keep the plugin as CommonJS.
  `

  static examples = [
    {
      command: '<%= config.bin %> <%= command.id %>',
      description: 'migrate a plugin to ESM and to be ESM compatible',
    },
    {
      command: '<%= config.bin %> <%= command.id %> --module-type cjs',
      description: 'migrate a plugin to remain CJS but be ESM compatible',
    },
    {
      command: '<%= config.bin %> <%= command.id %> --dry-run',
      description: 'print the changes that would be made without actually making them',
    },
  ]

  static flags = {
    'module-type': Flags.custom<ModuleType>({
      summary: 'Desired module type of the plugin',
      options: ['esm', 'cjs'],
      char: 'm',
      default: 'esm',
    })(),
    'dry-run': Flags.boolean({
      summary: 'Print the changes that would be made without actually making them',
      char: 'd',
    }),
    'bump-version': Flags.custom<VersionBump>({
      summary: 'Bump the plugin version',
      options: ['major', 'minor', 'patch', 'none'],
      char: 'b',
      default: 'none',
    })(),
    'use-exports': Flags.boolean({
      summary: 'Use exports in package.json.',
      char: 'e',
    }),
    'bump-lib': Flags.string({
      description: 'list of npm libraries you want bumped to latest',
      char: 'l',
      multiple: true,
      default: [],
    }),
    'remove-eslint-disable-node-protocol': Flags.boolean({
      summary: 'Remove eslint-disable-next-line unicorn/prefer-node-protocol from code base',
      char: 'r',
      relationships: [
        {
          type: 'none',
          flags: [
            {name: 'module-type', when: async flags => flags['module-type'] === 'cjs'},
          ],
        },
      ],
    }),
  }

  public async run(): Promise<void> {
    this.warn('This command is in beta and could change at any time.')
    const {flags} = await this.parse(MigratePluginV3)
    this.log(flags['dry-run'] ? 'Running in dry-run mode\n' : 'Running in normal mode\n')
    await generate('plugin-v3', {
      force: true,
      bumpVersion: flags['bump-version'],
      dryRun: flags['dry-run'],
      moduleType: flags['module-type'],
      useExports: flags['use-exports'],
      removeEslintRemoveNodeProtocol: flags['remove-eslint-disable-node-protocol'],
      bumpLibs: flags['bump-lib'],
    })
  }
}
