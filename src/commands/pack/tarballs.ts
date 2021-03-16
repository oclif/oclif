import {Command, flags} from '@oclif/command'
import * as qq from 'qqjs'

import * as Tarballs from '../../tarballs'

export default class PackTarballs extends Command {
  static hidden = true

  static description = `packages oclif CLI into tarballs

This can be used to create oclif CLIs that use the system node or that come preloaded with a node binary.
`

  static flags = {
    root: flags.string({char: 'r', description: 'path to oclif CLI root', default: '.', required: true}),
    targets: flags.string({char: 't',
      description: 'comma-separated targets to pack (e.g.: linux-arm,win32-x64)',
      default: Tarballs.TARGETS.join(','),
    }),
    xz: flags.boolean({description: 'also build xz', allowNo: true, default: true}),
    parellel: flags.boolean({description: 'download node and build tars in parellel'}),
  }

  async run() {
    const prevCwd = qq.cwd()
    if (process.platform === 'win32') throw new Error('pack does not function on windows')
    const {flags} = this.parse(PackTarballs)
    const targets = flags.targets.split(',')
    const buildConfig = await Tarballs.buildConfig(flags.root, {xz: flags.xz, targets: targets})
    await Tarballs.build(buildConfig, {parellel: flags.parellel})
    qq.cd(prevCwd)
  }
}
