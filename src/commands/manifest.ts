import {Args, Command, Plugin, ux, Flags, Interfaces} from '@oclif/core'
import * as fs from 'fs-extra'
import * as path from 'path'
import * as os from 'os'
import * as semver from 'semver'
import {exec, ShellString, ExecOptions} from 'shelljs'
import got from 'got'
import {promisify} from 'util'
import {pipeline as pipelineSync} from 'stream'
import {checkFor7Zip} from '../util'

const pipeline = promisify(pipelineSync)

async function fileExists(filePath: string): Promise<boolean> {
  try {
    await fs.access(filePath)
    return true
  } catch {
    return false
  }
}

export default class Manifest extends Command {
  static description = 'generates plugin manifest json'

  static args = {
    path: Args.string({description: 'path to plugin', default: '.'}),
  }

  static flags = {
    jit: Flags.boolean({
      allowNo: true,
      summary: 'append commands from JIT plugins in manifest',
      default: true,
    }),
  }

  async run(): Promise<void> {
    const {flags} = await this.parse(Manifest)
    try {
      fs.unlinkSync('oclif.manifest.json')
    } catch {}

    const {args} = await this.parse(Manifest)
    const root = path.resolve(args.path)

    const packageJson = fs.readJSONSync('package.json') as { oclif: { jitPlugins: Record<string, string> } }

    let jitPluginManifests: Interfaces.Manifest[] = []

    if (flags.jit && packageJson.oclif?.jitPlugins) {
      this.debug('jitPlugins: %s', packageJson.oclif.jitPlugins)
      const tmpDir = os.tmpdir()
      const promises = Object.entries(packageJson.oclif.jitPlugins).map(async ([jitPlugin, version]) => {
        const pluginDir = jitPlugin.replace('/', '-').replace('@', '')

        const fullPath = path.join(tmpDir, pluginDir)

        if (await fileExists(fullPath)) await fs.remove(fullPath)

        await fs.mkdir(fullPath, {recursive: true})

        const resolvedVersion = this.getVersion(jitPlugin, version)
        const tarballUrl = this.getTarballUrl(jitPlugin, resolvedVersion)
        const tarball = path.join(fullPath, path.basename(tarballUrl))
        await pipeline(
          got.stream(tarballUrl),
          fs.createWriteStream(tarball),
        )

        if (process.platform === 'win32') {
          await checkFor7Zip()
          exec(`7z x -bd -y "${tarball}"`, {cwd: fullPath})
        } else {
          exec(`tar -xJf "${tarball}"`, {cwd: fullPath})
        }

        const manifest = await fs.readJSON(path.join(fullPath, 'package', 'oclif.manifest.json')) as Interfaces.Manifest
        for (const command of Object.values(manifest.commands)) {
          command.pluginType = 'jit'
        }

        return manifest
      })

      ux.action.start('Generating JIT plugin manifests')
      jitPluginManifests = await Promise.all(promises)
      ux.action.stop()
    }

    let plugin = new Plugin({root, type: 'core', ignoreManifest: true, errorOnManifestCreate: true})
    if (!plugin) throw new Error('plugin not found')
    await plugin.load(true)
    if (!plugin.valid) {
      const p = require.resolve('@oclif/plugin-legacy', {paths: [process.cwd()]})
      const {PluginLegacy} = require(p)
      plugin = new PluginLegacy(this.config, plugin)
      await plugin.load()
    }

    if (process.env.OCLIF_NEXT_VERSION) {
      plugin.manifest.version = process.env.OCLIF_NEXT_VERSION
    }

    const dotfile = plugin.pjson.files.find((f: string) => f.endsWith('.oclif.manifest.json'))
    const file = path.join(plugin.root, `${dotfile ? '.' : ''}oclif.manifest.json`)

    for (const manifest of jitPluginManifests) {
      plugin.manifest.commands = {...plugin.manifest.commands, ...manifest.commands}
    }

    fs.writeFileSync(file, JSON.stringify(plugin.manifest, null, 2))

    this.log(`wrote manifest to ${file}`)
  }

  private getVersion(plugin: string, version: string): string {
    if (version.startsWith('^') || version.startsWith('~')) {
      // Grab latest from npm to get all the versions so we can find the max satisfying version.
      // We explicitly ask for latest since this command is typically run inside of `npm prepack`,
      // which sets the npm_config_tag env var, which is used as the default anytime a tag isn't
      // provided to `npm view`. This can be problematic if you're building the `nightly` version
      // of a CLI and all the JIT plugins don't have a `nightly` tag themselves.
      // TL;DR - always ask for latest to avoid potentially requesting a non-existent tag.
      const {versions} = JSON.parse(this.executeCommand(`npm view ${plugin}@latest --json`).stdout) as {
        versions: string[]
      }

      return semver.maxSatisfying(versions, version) ?? version.replace('^', '').replace('~', '')
    }

    return version
  }

  private getTarballUrl(plugin: string, version: string): string {
    const {dist} = JSON.parse(this.executeCommand(`npm view ${plugin}@${version} --json`).stdout) as {
      dist: { tarball: string }
    }
    return dist.tarball

  }

  private executeCommand(command: string, options?: ExecOptions): ShellString {
    const debugString = options?.cwd ? `executing command: ${command} in ${options.cwd}` : `executing command: ${command}`
    this.debug(debugString)
    const result = exec(command, {...options, silent: true, async: false})
    if (result.code !== 0) {
      this.error(result.stderr)
    }

    this.debug(result.stdout)
    return result
  }
}
