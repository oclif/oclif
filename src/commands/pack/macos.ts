import {Command, Flags, Interfaces} from '@oclif/core'
import * as fs from 'fs-extra'
import {exec as execSync} from 'node:child_process'
import * as os from 'node:os'
import path from 'node:path'
import {promisify} from 'node:util'

import * as Tarballs from '../../tarballs'
import {templateShortKey} from '../../upload-util'
import {uniq} from '../../util'

const exec = promisify(execSync)

const noBundleConfiguration = `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<array/>
</plist>
`

const scripts = {
  postinstall: (config: Interfaces.Config, additionalCLI: string | undefined) => `#!/usr/bin/env bash
set -x
sudo mkdir -p /usr/local/bin
sudo ln -sf /usr/local/lib/${config.dirname}/bin/${config.bin} /usr/local/bin/${config.bin}
${
  config.binAliases
    ? config.binAliases
        ?.map((alias) => `sudo ln -sf /usr/local/lib/${config.dirname}/bin/${config.bin} /usr/local/bin/${alias}`)
        .join(os.EOL)
    : ''
}
${
  additionalCLI
    ? `sudo ln -sf /usr/local/lib/${config.dirname}/bin/${additionalCLI} /usr/local/bin/${additionalCLI}`
    : ''
}
`,
  preinstall: (config: Interfaces.Config, additionalCLI: string | undefined) => `#!/usr/bin/env bash
sudo rm -rf /usr/local/lib/${config.dirname}
sudo rm -rf /usr/local/${config.bin}
sudo rm -rf /usr/local/bin/${config.bin}
${
  additionalCLI
    ? `sudo rm -rf /usr/local/${additionalCLI}
sudo rm -rf /usr/local/bin/${additionalCLI}`
    : ''
}
${config.binAliases ? config.binAliases.map((alias) => `sudo rm -rf /usr/local/bin/${alias}`).join(os.EOL) : ''}
`,
  uninstall(config: Interfaces.Config, additionalCLI: string | undefined) {
    const packageIdentifier = (config.pjson.oclif as Interfaces.PJSON['plugin']).macos!.identifier!
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
# remove bin aliases link
${
  config.binAliases
    ? config.binAliases.map((alias) => `find "/usr/local/bin/" -name "${alias}" | xargs rm`).join(os.EOL)
    : ''
}
# remove link to shortcut file
find "/usr/local/bin/" -name "${config.bin}" | xargs rm
${additionalCLI ? `find "/usr/local/bin/" -name "${additionalCLI}" | xargs rm` : ''}
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
  echo "[2/3] [DONE] Successfully deleted application information"
else
  echo "[2/3] [ERROR] Could not delete application information" >&2
fi

#remove application source distribution
[ -e "/usr/local/lib/${config.dirname}" ] && rm -rf "/usr/local/lib/${config.dirname}"

#remove application data directory
[ -e "${config.dataDir}" ] && rm -rf "${config.dataDir}"

#remove application cache directory
[ -e "${config.cacheDir}" ] && rm -rf "${config.cacheDir}"

#remove application config directory
[ -e "${config.configDir}" ] && rm -rf "${config.configDir}"

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
  static description =
    'Add a pretarball script to your package.json if you need to run any scripts before the tarball is created.'
  static flags = {
    'additional-cli': Flags.string({
      description: `An Oclif CLI other than the one listed in config.bin that should be made available to the user
the CLI should already exist in a directory named after the CLI that is the root of the tarball produced by "oclif pack:tarballs"`,
      hidden: true,
    }),
    'prune-lockfiles': Flags.boolean({description: 'remove lockfiles in the tarball.', exclusive: ['tarball']}),
    root: Flags.string({
      char: 'r',
      default: '.',
      description: 'Path to oclif CLI root.',
      required: true,
    }),
    sha: Flags.string({
      description: '7-digit short git commit SHA (defaults to current checked out commit).',
      required: false,
    }),
    tarball: Flags.string({
      char: 't',
      description: 'Optionally specify a path to a tarball already generated by NPM.',
      exclusive: ['prune-lockfiles'],
      required: false,
    }),
    targets: Flags.string({
      description: 'Comma-separated targets to pack (e.g.: darwin-x64,darwin-arm64).',
    }),
  }
  static summary = 'Pack CLI into macOS .pkg'

  async run(): Promise<void> {
    if (process.platform !== 'darwin') this.error('must be run from macos')
    const {flags} = await this.parse(PackMacos)
    const buildConfig = await Tarballs.buildConfig(flags.root, {sha: flags?.sha, targets: flags?.targets?.split(',')})
    const {config} = buildConfig
    const c = config.pjson.oclif
    if (!c.macos) this.error('package.json is missing an oclif.macos config')
    if (!c.macos.identifier) this.error('package.json must have oclif.macos.identifier set')
    const macos = c.macos
    const packageIdentifier = macos.identifier
    await Tarballs.build(buildConfig, {
      pack: false,
      parallel: true,
      platform: 'darwin',
      pruneLockfiles: flags['prune-lockfiles'],
      tarball: flags.tarball,
    })
    const scriptsDir = path.join(buildConfig.tmp, 'macos/scripts')
    await fs.emptyDir(buildConfig.dist('macos'))
    const noBundleConfigurationPath = path.join(buildConfig.tmp, 'macos', 'no-bundle.plist')

    const build = async (arch: Interfaces.ArchTypes) => {
      const templateKey = templateShortKey('macos', {
        arch,
        bin: config.bin,
        sha: buildConfig.gitSha,
        version: config.version,
      })
      const dist = buildConfig.dist(`macos/${templateKey}`)
      const rootDir = buildConfig.workspace({arch, platform: 'darwin'})
      const writeNoBundleConfiguration = async () => {
        await fs.mkdir(path.dirname(noBundleConfigurationPath), {recursive: true})
        await fs.writeFile(noBundleConfigurationPath, noBundleConfiguration, {mode: 0o755})
      }

      const writeScript = async (script: 'postinstall' | 'preinstall' | 'uninstall') => {
        const scriptLocation = script === 'uninstall' ? [rootDir, 'bin'] : [scriptsDir]
        scriptLocation.push(script)
        await fs.mkdir(path.dirname(path.join(...scriptLocation)), {recursive: true})
        await fs.writeFile(path.join(...scriptLocation), scripts[script](config, flags['additional-cli']), {
          mode: 0o755,
        })
      }

      await Promise.all([
        writeNoBundleConfiguration(),
        writeScript('preinstall'),
        writeScript('postinstall'),
        writeScript('uninstall'),
      ])

      const args = [
        '--root',
        rootDir,
        '--component-plist',
        noBundleConfigurationPath,
        '--identifier',
        packageIdentifier,
        '--version',
        config.version,
        '--install-location',
        `/usr/local/lib/${config.dirname}`,
        '--scripts',
        scriptsDir,
      ]

      if (macos.sign) {
        args.push('--sign', macos.sign)
      } else this.debug('Skipping macOS pkg signing')
      if (process.env.OSX_KEYCHAIN) args.push('--keychain', process.env.OSX_KEYCHAIN)
      args.push(dist)
      await exec(`pkgbuild  ${args.join(' ')}`)
    }

    const arches = uniq(buildConfig.targets.filter((t) => t.platform === 'darwin').map((t) => t.arch))
    await Promise.all(arches.map((a) => build(a)))
  }
}
