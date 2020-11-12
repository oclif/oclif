import {Command, flags} from '@oclif/command'
import * as Config from '@oclif/config'
import * as path from 'path'
import * as qq from 'qqjs'

import * as Tarballs from '../../tarballs'

const scripts = {
  preinstall: (config: Config.IConfig) => `#!/usr/bin/env bash
sudo rm -rf /usr/local/lib/${config.dirname}
sudo rm -rf /usr/local/${config.bin}
sudo rm -rf /usr/local/bin/${config.bin}
`,
  postinstall: (config: Config.IConfig) => `#!/usr/bin/env bash
set -x
sudo mkdir -p /usr/local/bin
sudo ln -sf /usr/local/lib/${config.dirname}/bin/${config.bin} /usr/local/bin/${config.bin}
`,
}

export default class PackMacos extends Command {
  static hidden = true

  static description = 'pack CLI into MacOS .pkg'

  static flags = {
    root: flags.string({char: 'r', description: 'path to oclif CLI root', default: '.', required: true}),
  }

  async run() {
    if (process.platform !== 'darwin') this.error('must be run from macos')
    const {flags} = this.parse(PackMacos)
    const buildConfig = await Tarballs.buildConfig(flags.root)
    const {config} = buildConfig
    const c = config.pjson.oclif as any
    if (!c.macos || !c.macos.identifier) this.error('package.json must have oclif.macos.identifier set')
    await Tarballs.build(buildConfig, {platform: 'darwin', pack: false})
    const dist = buildConfig.dist(`macos/${config.bin}-v${buildConfig.version}.pkg`)
    await qq.emptyDir(path.dirname(dist))
    const scriptsDir = qq.join(buildConfig.tmp, 'macos/scripts')
    const writeScript = async (script: 'preinstall' | 'postinstall') => {
      const path = [scriptsDir, script]
      await qq.write(path, scripts[script](config))
      await qq.chmod(path, 0o755)
    }
    await writeScript('preinstall')
    await writeScript('postinstall')
    /* eslint-disable array-element-newline */
    const args = [
      '--root', buildConfig.workspace({platform: 'darwin', arch: 'x64'}),
      '--identifier', c.macos.identifier,
      '--version', buildConfig.version,
      '--install-location', `/usr/local/lib/${config.dirname}`,
      '--scripts', scriptsDir,
    ]
    /* eslint-enable array-element-newline */
    if (c.macos.sign) args.push('--sign', c.macos.sign)
    if (process.env.OSX_KEYCHAIN) args.push('--keychain', process.env.OSX_KEYCHAIN)
    args.push(dist)
    await qq.x('pkgbuild', args)
  }
}

