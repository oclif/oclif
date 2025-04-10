import {Args, Command, Flags, Interfaces, Plugin, ux} from '@oclif/core'
import {access, mkdir, readJSON, readJSONSync, remove, unlinkSync, writeFileSync} from 'fs-extra'
import {exec, ExecOptions} from 'node:child_process'
import * as os from 'node:os'
import path from 'node:path'

async function fileExists(filePath: string): Promise<boolean> {
  try {
    await access(filePath)
    return true
  } catch {
    return false
  }
}

export default class Manifest extends Command {
  static args = {
    path: Args.string({default: '.', description: 'Path to plugin.'}),
  }
  static description = 'Generates plugin manifest json (oclif.manifest.json).'
  static flags = {
    jit: Flags.boolean({
      allowNo: true,
      default: true,
      summary: 'Append commands from JIT plugins in manifest.',
    }),
  }

  public async run(): Promise<Interfaces.Manifest> {
    const {flags} = await this.parse(Manifest)
    try {
      unlinkSync('oclif.manifest.json')
    } catch {}

    const {args} = await this.parse(Manifest)
    const root = path.resolve(args.path)

    const packageJson = readJSONSync(path.join(root, 'package.json')) as Interfaces.PJSON
    let jitPluginManifests: Interfaces.Manifest[] = []

    if (flags.jit && packageJson.oclif?.jitPlugins) {
      this.debug('jitPlugins: %s', packageJson.oclif.jitPlugins)
      const tmpDir = os.tmpdir()
      const promises = Object.entries(packageJson.oclif.jitPlugins).map(async ([jitPlugin, version]) => {
        const pluginDir = jitPlugin.replace('/', '-').replace('@', '')
        const fullPath = path.join(tmpDir, pluginDir)

        if (await fileExists(fullPath)) await remove(fullPath)
        await mkdir(fullPath, {recursive: true})

        const tarball = await this.downloadTarball(jitPlugin, version, fullPath)

        await this.executeCommand(`tar -xzf "${tarball}"`, {cwd: fullPath})

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
      errorOnManifestCreate: true,
      ignoreManifest: true,
      respectNoCacheDefault: true,
      root,
      type: 'core',
    })

    if (!plugin) throw new Error('plugin not found')
    await plugin.load()
    if (!plugin.valid) {
      const {PluginLegacy} = await import('@oclif/plugin-legacy')
      // @ts-expect-error for now because PluginLegacy doesn't use the same major of @oclif/core
      plugin = new PluginLegacy(this.config, plugin)
      await plugin.load()
    }

    if (!Array.isArray(plugin.pjson.files)) {
      this.error('The package.json has to contain a "files" array', {
        ref: 'https://docs.npmjs.com/cli/v10/configuring-npm/package-json#files',
        suggestions: [
          'Add a "files" property in the package.json listing the paths to the files that should be included in the published package',
        ],
      })
    }

    const dotfile = plugin.pjson.files.find((f: string) => f.endsWith('.oclif.manifest.json'))
    const file = path.join(plugin.root, `${dotfile ? '.' : ''}oclif.manifest.json`)

    for (const manifest of jitPluginManifests) {
      plugin.manifest.commands = {...plugin.manifest.commands, ...manifest.commands}
    }

    writeFileSync(file, JSON.stringify(plugin.manifest, null, 2))

    this.log(`wrote manifest to ${file}`)

    return plugin.manifest
  }

  private async downloadTarball(plugin: string, version: string, tarballStoragePath: string): Promise<string> {
    const {stderr} = await this.executeCommand(
      `npm pack ${plugin}@${version} --pack-destination "${tarballStoragePath}" --json`,
    )
    // You can `npm pack` with multiple modules to download multiple at a time. There will be at least 1 if the command
    // succeeded.
    const tarballs = JSON.parse(stderr) as {
      filename: string
    }[]

    if (!Array.isArray(tarballs) || tarballs.length !== 1) {
      throw new Error(`Could not download tarballs for ${plugin}. Tarball download was not in the correct format.`)
    }

    const {filename} = tarballs[0]

    return path.join(tarballStoragePath, filename)
  }

  private async executeCommand(command: string, options?: ExecOptions): Promise<{stderr: string; stdout: string}> {
    return new Promise((resolve) => {
      exec(command, options, (error, stderr, stdout) => {
        if (error) this.error(error)
        const debugString = options?.cwd
          ? `executing command: ${command} in ${options.cwd}`
          : `executing command: ${command}`
        this.debug(debugString)
        this.debug(stdout)
        this.debug(stderr)
        resolve({stderr: stderr.toString(), stdout: stdout.toString()})
      })
    })
  }
}
