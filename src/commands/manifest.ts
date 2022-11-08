import {Command, Plugin, Interfaces, Flags, CliUx} from '@oclif/core'
import * as fs from 'fs-extra'
import * as path from 'path'
import * as os from 'os'
import * as semver from 'semver'
import {exec, ShellString, ExecOptions} from 'shelljs'

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

  static args = [
    {name: 'path', description: 'path to plugin', default: '.'},
  ]

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

    if (flags.jit && packageJson.oclif.jitPlugins) {
      this.debug('jitPlugins: %s', packageJson.oclif.jitPlugins)
      const tmpDir = os.tmpdir()
      const promises = Object.entries(packageJson.oclif.jitPlugins).map(async ([jitPlugin, version]) => {
        const pluginDir = jitPlugin.replace('/', '-').replace('@', '')
        const repo = this.executeCommand(`npm view ${jitPlugin} repository --json`)
        const stdout = JSON.parse(repo.stdout)

        const repoUrl = stdout.url.replace(`${stdout.type}+`, '')

        const fullPath = path.join(tmpDir, pluginDir)
        if (await fileExists(fullPath)) await fs.remove(fullPath)

        const versions = JSON.parse(this.executeCommand(`npm view ${jitPlugin} versions --json`).stdout)
        const maxSatisfying = semver.maxSatisfying(versions, version)

        this.cloneRepo(repoUrl, fullPath, maxSatisfying)

        this.executeCommand('yarn', {cwd: fullPath})
        this.executeCommand('yarn build', {cwd: fullPath})
        const plugin = new Plugin({root: fullPath, type: 'jit', ignoreManifest: true, errorOnManifestCreate: true})
        await plugin.load()

        return plugin.manifest
      })

      CliUx.ux.action.start('Generating JIT plugin manifests')
      jitPluginManifests = await Promise.all(promises)
      CliUx.ux.action.stop()
    }

    let plugin = new Plugin({root, type: 'core', ignoreManifest: true, errorOnManifestCreate: true})
    if (!plugin) throw new Error('plugin not found')
    await plugin.load()
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

  private cloneRepo(repoUrl: string, fullPath: string, tag: string | semver.SemVer | null): void {
    try {
      this.executeCommand(`git clone --branch ${tag} ${repoUrl} ${fullPath} --depth 1`)
    } catch {
      try {
        this.executeCommand(`git clone --branch v${tag} ${repoUrl} ${fullPath} --depth 1`)
      } catch {
        throw new Error(`Unable to clone repo ${repoUrl} with tag ${tag}`)
      }
    }
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
