import {Command, flags} from '@oclif/command'
import {Interfaces} from '@oclif/core'

import * as path from 'path'
import * as qq from 'qqjs'

import * as Tarballs from '../../tarballs'
import {templateShortKey} from '../../upload-util'

type OclifConfig = {
  macos?: {
    identifier?: string;
    sign?: string;
  };
}

const scripts = {
  preinstall: (config: Interfaces.Config,
  ) => `#!/usr/bin/env bash
sudo rm -rf /usr/local/lib/${config.dirname}
sudo rm -rf /usr/local/${config.bin}
sudo rm -rf /usr/local/bin/${config.bin}
`,
  postinstall: (config: Interfaces.Config,
  ) => `#!/usr/bin/env bash
set -x
sudo mkdir -p /usr/local/bin
sudo ln -sf /usr/local/lib/${config.dirname}/bin/${config.bin} /usr/local/bin/${config.bin}
`,
  uninstall: (config: Interfaces.Config,
  ) => {
    const packageIdentifier = (config.pjson.oclif as OclifConfig).macos!.identifier!
    return `#!/usr/bin/env bash

#Parameters
DATE=\`date +%Y-%m-%d\`
TIME=\`date +%H:%M:%S\`
LOG_PREFIX="[$DATE $TIME]"

#Functions
log_info() {
    echo "\${LOG_PREFIX}[INFO]" $1
}

log_warn() {
    echo "\${LOG_PREFIX}[WARN]" $1
}

log_error() {
    echo "\${LOG_PREFIX}[ERROR]" $1
}

#Check running user
if (( $EUID != 0 )); then
    echo "Please run as root."
    exit
fi

echo "Welcome to Application Uninstaller"
echo "The following packages will be REMOVED:"
echo "  ${config.dirname}"
while [ "$1" != "-y" ]; do
    read -p "Do you wish to continue [Y/n]?" answer
    [[ $answer == "y" || $answer == "Y" || $answer == "" ]] && break
    [[ $answer == "n" || $answer == "N" ]] && exit 0
    echo "Please answer with 'y' or 'n'"
done

echo "Application uninstalling process started"
# remove link to shorcut file
find "/usr/local/bin/" -name "${config.bin}" | xargs rm
if [ $? -eq 0 ]
then
  echo "[1/3] [DONE] Successfully deleted shortcut links"
else
  echo "[1/3] [ERROR] Could not delete shortcut links" >&2
fi

#forget from pkgutil
pkgutil --forget "${packageIdentifier}" > /dev/null 2>&1
if [ $? -eq 0 ]
then
  echo "[2/3] [DONE] Successfully deleted application informations"
else
  echo "[2/3] [ERROR] Could not delete application informations" >&2
fi

#remove application source distribution
[ -e "/usr/local/lib/${config.dirname}" ] && rm -rf "/usr/local/lib/${config.dirname}"
if [ $? -eq 0 ]
then
  echo "[3/3] [DONE] Successfully deleted application"
else
  echo "[3/3] [ERROR] Could not delete application" >&2
fi

echo "Application uninstall process finished"
exit 0
`
  },
}

export default class PackMacos extends Command {
  static hidden = true

  static description = 'pack CLI into macOS .pkg'

  static flags = {
    root: flags.string({char: 'r', description: 'path to oclif CLI root', default: '.', required: true}),
  }

  async run() {
    if (process.platform !== 'darwin') this.error('must be run from macos')
    const {flags} = this.parse(PackMacos)
    const buildConfig = await Tarballs.buildConfig(flags.root)
    const {config} = buildConfig
    const c = config.pjson.oclif as OclifConfig
    if (!c.macos) this.error('package.json is missing an oclif.macos config')
    if (!c.macos.identifier) this.error('package.json must have oclif.macos.identifier set')
    const macos = c.macos
    const packageIdentifier = macos.identifier
    await Tarballs.build(buildConfig, {platform: 'darwin', pack: false})
    const templateKey = templateShortKey('macos', {bin: config.bin, version: config.version, sha: buildConfig.gitSha})
    const dist = buildConfig.dist(`macos/${templateKey}`)
    await qq.emptyDir(path.dirname(dist))
    const scriptsDir = qq.join(buildConfig.tmp, 'macos/scripts')
    const rootDir = buildConfig.workspace({platform: 'darwin', arch: 'x64'})
    const writeScript = async (script: 'preinstall' | 'postinstall' | 'uninstall') => {
      const path = script === 'uninstall' ? [rootDir, 'bin'] : [scriptsDir]
      path.push(script)
      await qq.write(path, scripts[script](config))
      await qq.chmod(path, 0o755)
    }
    await writeScript('preinstall')
    await writeScript('postinstall')
    await writeScript('uninstall')
    /* eslint-disable array-element-newline */
    const args = [
      '--root', rootDir,
      '--identifier', packageIdentifier,
      '--version', buildConfig.version,
      '--install-location', `/usr/local/lib/${config.dirname}`,
      '--scripts', scriptsDir,
    ]
    /* eslint-enable array-element-newline */
    if (macos.sign) {
      args.push('--sign', macos.sign)
    } else this.debug('Skipping macOS pkg signing')
    if (process.env.OSX_KEYCHAIN) args.push('--keychain', process.env.OSX_KEYCHAIN)
    args.push(dist)
    await qq.x('pkgbuild', args as string[])
  }
}
