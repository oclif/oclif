import {Args, Command, Plugin, ux, Flags, Interfaces} from '@oclif/core'
import {access, createWriteStream, mkdir, readJSON, readJSONSync, remove, unlinkSync, writeFileSync} from 'fs-extra'
import * as path from 'node:path'
import * as os from 'node:os'
import * as semver from 'semver'
import {exec, ShellString, ExecOptions} from 'shelljs'
import got from 'got'
import {promisify} from 'node:util'
import {pipeline as pipelineSync} from 'node:stream'

const pipeline = promisify(pipelineSync)

async function fileExists(filePath: string): Promise<boolean> {
  try {
    await access(filePath)
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
      unlinkSync('oclif.manifest.json')
    } catch {}

    const {args} = await this.parse(Manifest)
    const root = path.resolve(args.path)

    const packageJson = readJSONSync('package.json') as {oclif: {jitPlugins: Record<string, string>}}

    let jitPluginManifests: Interfaces.Manifest[] = []

    if (flags.jit && packageJson.oclif?.jitPlugins) {
      this.debug('jitPlugins: %s', packageJson.oclif.jitPlugins)
      const tmpDir = os.tmpdir()
      const promises = Object.entries(packageJson.oclif.jitPlugins).map(async ([jitPlugin, version]) => {
        const pluginDir = jitPlugin.replace('/', '-').replace('@', '')

        const fullPath = path.join(tmpDir, pluginDir)

        if (await fileExists(fullPath)) await remove(fullPath)

        await mkdir(fullPath, {recursive: true})

        const resolvedVersion = this.getVersion(jitPlugin, version)
        const tarballUrl = this.getTarballUrl(jitPlugin, resolvedVersion)
        const tarball = path.join(fullPath, path.basename(tarballUrl))
        await pipeline(got.stream(tarballUrl), createWriteStream(tarball))

        exec(`tar -xzf "${tarball}"`, {cwd: fullPath})

        const manifest = (await readJSON(path.join(fullPath, 'package', 'oclif.manifest.json'))) as Interfaces.Manifest
        for (const command of Object.values(manifest.commands)) {
          command.pluginType = 'jit'
        }

        return manifest
      })

      ux.action.start('Generating JIT plugin manifests')
      jitPluginManifests = await Promise.all(promises)
      ux.action.stop()
    }

    let plugin = new Plugin({
      root,
      type: 'core',
      ignoreManifest: true,
      errorOnManifestCreate: true,
      respectNoCacheDefault: true,
    })

    if (!plugin) throw new Error('plugin not found')
    await plugin.load()
    if (!plugin.valid) {
      const p = require.resolve('@oclif/plugin-legacy', {paths: [process.cwd()]})
      const {PluginLegacy} = require(p)
      plugin = new PluginLegacy(this.config, plugin)
      await plugin.load()
    }

    const dotfile = plugin.pjson.files.find((f: string) => f.endsWith('.oclif.manifest.json'))
    const file = path.join(plugin.root, `${dotfile ? '.' : ''}oclif.manifest.json`)

    for (const manifest of jitPluginManifests) {
      plugin.manifest.commands = {...plugin.manifest.commands, ...manifest.commands}
    }

    writeFileSync(file, JSON.stringify(plugin.manifest, null, 2))

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
      dist: {tarball: string}
    }
    return dist.tarball
  }

  private executeCommand(command: string, options?: ExecOptions): ShellString {
    const debugString = options?.cwd
      ? `executing command: ${command} in ${options.cwd}`
      : `executing command: ${command}`
    this.debug(debugString)
    const result = exec(command, {...options, silent: true, async: false})
    if (result.code !== 0) {
      this.error(result.stderr)
    }

    this.debug(result.stdout)
    return result
  }
}
