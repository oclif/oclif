import {Command, flags} from '@oclif/command'
import * as qq from 'qqjs'

import * as Tarballs from '../../tarballs'

export default class Pack extends Command {
  static hidden = true

  static description = `packages oclif cli into tarballs

This can be used to create oclif CLIs that use the system node or that come preloaded with a node binary.
`

  static flags = {
    root: flags.string({char: 'r', description: 'path to oclif CLI root', default: '.', required: true}),
    targets: flags.string({char: 't', description: 'comma-separated targets to pack (e.g.: linux-arm,win32-x64)'}),
    xz: flags.boolean({description: 'also build xz', allowNo: true}),
  }

  async run() {
    const prevCwd = qq.cwd()
    if (process.platform === 'win32') throw new Error('pack does not function on windows')
    const {flags} = this.parse(Pack)
    const targets = flags.targets ? flags.targets.split(',') : undefined
    const buildConfig = await Tarballs.buildConfig(flags.root, {xz: flags.xz, targets})
    await Tarballs.build(buildConfig)
    qq.cd(prevCwd)
  }
}
