import ejs from 'ejs'
import {arch, release, tmpdir, type} from 'node:os'
import {join, resolve} from 'node:path'
import {fileURLToPath, URL} from 'node:url'

import Cache from '../cache'
import {Command} from '../command'
import {CLIError, error, exit, warn} from '../errors'
import {getHelpFlagAdditions} from '../help/util'
import {Hook, Hooks, OclifConfiguration, PJSON, S3Templates, Topic, UserPJSON} from '../interfaces'
import {ArchTypes, Config as IConfig, LoadOptions, PlatformTypes, VersionDetails} from '../interfaces/config'
import {Plugin as IPlugin, Options} from '../interfaces/plugin'
import {Theme} from '../interfaces/theme'
import {makeDebug as loggerMakeDebug, setLogger} from '../logger'
import {loadWithData} from '../module-loader'
import {OCLIF_MARKER_OWNER, Performance} from '../performance'
import {settings} from '../settings'
import {determinePriority} from '../util/determine-priority'
import {safeReadJson} from '../util/fs'
import {toStandardizedId} from '../util/ids'
import {getHomeDir, getPlatform, getShell} from '../util/os'
import {compact, isProd} from '../util/util'
import {ux} from '../ux'
import {parseTheme} from '../ux/theme'
import PluginLoader from './plugin-loader'
import {tsPath} from './ts-path'
import {collectUsableIds, getCommandIdPermutations, makeDebug} from './util'

const debug = makeDebug()

const _pjson = Cache.getInstance().get('@oclif/core')
const BASE = `${_pjson.name}@${_pjson.version}`
const ROOT_ONLY_HOOKS = new Set<keyof Hooks>(['preparse'])

function displayWarnings() {
  if (process.listenerCount('warning') > 1) return
  process.on('warning', (warning: any) => {
    console.error(warning.stack)
    if (warning.detail) console.error(warning.detail)
  })
}

function channelFromVersion(version: string) {
  const m = version.match(/[^-]+(?:-([^.]+))?/)
  return (m && m[1]) || 'stable'
}

function isConfig(o: any): o is Config {
  return o && Boolean(o._base)
}

class Permutations extends Map<string, Set<string>> {
  private validPermutations = new Map<string, string>()

  public add(permutation: string, commandId: string): void {
    this.validPermutations.set(permutation, commandId)
    for (const id of collectUsableIds([permutation])) {
      if (this.has(id)) {
        this.set(id, this.get(id).add(commandId))
      } else {
        this.set(id, new Set([commandId]))
      }
    }
  }

  public get(key: string): Set<string> {
    return super.get(key) ?? new Set()
  }

  public getAllValid(): string[] {
    return [...this.validPermutations.keys()]
  }

  public getValid(key: string): string | undefined {
    return this.validPermutations.get(key)
  }

  public hasValid(key: string): boolean {
    return this.validPermutations.has(key)
  }
}

export class Config implements IConfig {
  public arch!: ArchTypes
  public bin!: string
  public binAliases?: string[] | undefined
  public binPath?: string | undefined
  public cacheDir!: string
  public channel!: string
  public configDir!: string
  public dataDir!: string
  public dirname!: string
  public flexibleTaxonomy!: boolean
  public home!: string
  public isSingleCommandCLI = false
  public name!: string
  public npmRegistry?: string | undefined
  public nsisCustomization?: string | undefined
  public pjson!: PJSON
  public platform!: PlatformTypes
  public plugins: Map<string, IPlugin> = new Map()
  public root!: string
  public shell!: string
  public theme?: Theme | undefined
  public topicSeparator: ' ' | ':' = ':'
  public updateConfig!: NonNullable<OclifConfiguration['update']>
  public userAgent!: string
  public userPJSON?: UserPJSON | undefined
  public valid!: boolean
  public version!: string
  protected warned = false
  public windows!: boolean
  private _base = BASE
  private _commandIDs!: string[]
  private _commands = new Map<string, Command.Loadable>()
  private _topics = new Map<string, Topic>()
  private commandPermutations = new Permutations()
  private pluginLoader!: PluginLoader
  private rootPlugin!: IPlugin
  private topicPermutations = new Permutations()

  constructor(public options: Options) {}

  static async load(opts: LoadOptions = module.filename || __dirname): Promise<Config> {
    setLogger(opts)
    // Handle the case when a file URL string is passed in such as 'import.meta.url'; covert to file path.
    if (typeof opts === 'string' && opts.startsWith('file://')) {
      opts = fileURLToPath(opts)
    }

    if (typeof opts === 'string') opts = {root: opts}
    if (isConfig(opts)) {
      debug(`reloading config from ${opts._base} to ${BASE}`)
      const pluginMap: Map<string, IPlugin> = new Map(opts.getPluginsList().map((p) => [p.name, p]))
      const config = new Config({...opts.options, plugins: pluginMap})
      await config.load()
      return config
    }

    const config = new Config(opts)
    await config.load()
    return config
  }

  public get commandIDs(): string[] {
    if (this._commandIDs) return this._commandIDs
    this._commandIDs = this.commands.map((c) => c.id)
    return this._commandIDs
  }

  public get commands(): Command.Loadable[] {
    return [...this._commands.values()]
  }

  protected get isProd(): boolean {
    return isProd()
  }

  static get rootPlugin(): IPlugin | undefined {
    return this.rootPlugin
  }

  public get topics(): Topic[] {
    return [...this._topics.values()]
  }

  public get versionDetails(): VersionDetails {
    const [cliVersion, architecture, nodeVersion] = this.userAgent.split(' ')
    return {
      architecture,
      cliVersion,
      nodeVersion,
      osVersion: `${type()} ${release()}`,
      pluginVersions: Object.fromEntries(
        [...this.plugins.values()].map((p) => [p.name, {root: p.root, type: p.type, version: p.version}]),
      ),
      rootPath: this.root,
      shell: this.shell,
    }
  }

  protected dir(category: 'cache' | 'config' | 'data'): string {
    const base =
      process.env[`XDG_${category.toUpperCase()}_HOME`] ||
      (this.windows && process.env.LOCALAPPDATA) ||
      join(this.home, category === 'data' ? '.local/share' : '.' + category)
    return join(base, this.dirname)
  }

  public findCommand(id: string, opts: {must: true}): Command.Loadable
  public findCommand(id: string, opts?: {must: boolean}): Command.Loadable | undefined

  public findCommand(id: string, opts: {must?: boolean} = {}): Command.Loadable | undefined {
    const lookupId = this.getCmdLookupId(id)
    const command = this._commands.get(lookupId)
    if (opts.must && !command) error(`command ${lookupId} not found`)
    return command
  }

  /**
   * Find all command ids that include the provided command id.
   *
   * For example, if the command ids are:
   * - foo:bar:baz
   * - one:two:three
   *
   * `bar` would return `foo:bar:baz`
   *
   * @param partialCmdId string
   * @param argv string[] process.argv containing the flags and arguments provided by the user
   * @returns string[]
   */
  public findMatches(partialCmdId: string, argv: string[]): Command.Loadable[] {
    const flags = argv
      .filter((arg) => !getHelpFlagAdditions(this).includes(arg) && arg.startsWith('-'))
      .map((a) => a.replaceAll('-', ''))
    const possibleMatches = [...this.commandPermutations.get(partialCmdId)].map((k) => this._commands.get(k)!)

    const matches = possibleMatches.filter((command) => {
      const cmdFlags = Object.entries(command.flags).flatMap(([flag, def]) =>
        def.char ? [def.char, flag] : [flag],
      ) as string[]

      // A command is a match if the provided flags belong to the full command
      return flags.every((f) => cmdFlags.includes(f))
    })

    return matches
  }

  public findTopic(id: string, opts: {must: true}): Topic

  public findTopic(id: string, opts?: {must: boolean}): Topic | undefined

  public findTopic(name: string, opts: {must?: boolean} = {}): Topic | undefined {
    const lookupId = this.getTopicLookupId(name)
    const topic = this._topics.get(lookupId)
    if (topic) return topic
    if (opts.must) throw new Error(`topic ${name} not found`)
  }

  /**
   * Returns an array of all command ids. If flexible taxonomy is enabled then all permutations will be appended to the array.
   * @returns string[]
   */
  public getAllCommandIDs(): string[] {
    return this.getAllCommands().map((c) => c.id)
  }

  /**
   * Returns an array of all commands. If flexible taxonomy is enabled then all permutations will be appended to the array.
   * @returns Command.Loadable[]
   */
  public getAllCommands(): Command.Loadable[] {
    const commands = [...this._commands.values()]
    const validPermutations = [...this.commandPermutations.getAllValid()]
    for (const permutation of validPermutations) {
      if (!this._commands.has(permutation)) {
        const cmd = this._commands.get(this.getCmdLookupId(permutation))!
        commands.push({...cmd, id: permutation})
      }
    }

    return commands
  }

  public getPluginsList(): IPlugin[] {
    return [...this.plugins.values()]
  }

  // eslint-disable-next-line complexity
  public async load(): Promise<void> {
    settings.performanceEnabled =
      (settings.performanceEnabled === undefined ? this.options.enablePerf : settings.performanceEnabled) ?? false
    if (settings.debug) displayWarnings()
    setLogger(this.options)
    const marker = Performance.mark(OCLIF_MARKER_OWNER, 'config.load')
    this.pluginLoader = new PluginLoader({plugins: this.options.plugins, root: this.options.root})
    this.rootPlugin = await this.pluginLoader.loadRoot({pjson: this.options.pjson})

    // Cache the root plugin so that we can reference it later when determining if
    // we should skip ts-node registration for an ESM plugin.
    const cache = Cache.getInstance()
    cache.set('rootPlugin', this.rootPlugin)
    cache.set('exitCodes', this.rootPlugin.pjson.oclif.exitCodes ?? {})

    this.root = this.rootPlugin.root
    this.pjson = this.rootPlugin.pjson

    this.plugins.set(this.rootPlugin.name, this.rootPlugin)
    this.root = this.rootPlugin.root
    this.pjson = this.rootPlugin.pjson
    this.name = this.pjson.name
    this.version = this.options.version || this.pjson.version || '0.0.0'
    this.channel = this.options.channel || channelFromVersion(this.version)
    this.valid = this.rootPlugin.valid

    this.arch = arch() === 'ia32' ? 'x86' : (arch() as any)
    this.platform = getPlatform()
    this.windows = this.platform === 'win32'
    this.bin = this.pjson.oclif.bin || this.name
    this.binAliases = this.pjson.oclif.binAliases
    this.nsisCustomization = this.pjson.oclif.nsisCustomization
    this.dirname = this.pjson.oclif.dirname || this.name
    this.flexibleTaxonomy = this.pjson.oclif.flexibleTaxonomy || false
    // currently, only colons or spaces are valid separators
    if (this.pjson.oclif.topicSeparator && [' ', ':'].includes(this.pjson.oclif.topicSeparator))
      this.topicSeparator = this.pjson.oclif.topicSeparator!
    if (this.platform === 'win32') this.dirname = this.dirname.replace('/', '\\')

    this.userAgent = `${this.name}/${this.version} ${this.platform}-${this.arch} node-${process.version}`
    this.shell = getShell()

    this.home = process.env.HOME || (this.windows && this.windowsHome()) || getHomeDir() || tmpdir()
    this.cacheDir = this.scopedEnvVar('CACHE_DIR') || this.macosCacheDir() || this.dir('cache')
    this.configDir = this.scopedEnvVar('CONFIG_DIR') || this.dir('config')
    this.dataDir = this.scopedEnvVar('DATA_DIR') || this.dir('data')
    this.binPath = this.scopedEnvVar('BINPATH')

    this.npmRegistry = this.scopedEnvVar('NPM_REGISTRY') || this.pjson.oclif.npmRegistry

    this.theme = await this.loadTheme()

    this.updateConfig = {
      ...this.pjson.oclif.update,
      node: this.pjson.oclif.update?.node ?? {},
      s3: this.buildS3Config(),
    }

    this.isSingleCommandCLI = Boolean(
      typeof this.pjson.oclif.commands !== 'string' &&
      this.pjson.oclif.commands?.strategy === 'single' &&
      this.pjson.oclif.commands?.target,
    )

    this.maybeAdjustDebugSetting()
    await this.loadPluginsAndCommands()

    debug('config done')
    marker?.addDetails({
      commandPermutations: this.commands.length,
      commands: [...this.plugins.values()].reduce((acc, p) => acc + p.commands.length, 0),
      plugins: this.plugins.size,
      topics: this.topics.length,
    })
    marker?.stop()
  }

  async loadPluginsAndCommands(opts?: {force: boolean}): Promise<void> {
    const pluginsMarker = Performance.mark(OCLIF_MARKER_OWNER, 'config.loadAllPlugins')
    const {errors, plugins} = await this.pluginLoader.loadChildren({
      dataDir: this.dataDir,
      devPlugins: this.options.devPlugins,
      force: opts?.force ?? false,
      pluginAdditions: this.options.pluginAdditions,
      rootPlugin: this.rootPlugin,
      userPlugins: this.options.userPlugins,
    })

    this.plugins = plugins
    pluginsMarker?.stop()

    const commandsMarker = Performance.mark(OCLIF_MARKER_OWNER, 'config.loadAllCommands')
    for (const plugin of this.plugins.values()) {
      this.loadCommands(plugin)
      this.loadTopics(plugin)
    }

    commandsMarker?.stop()

    for (const error of errors) {
      this.warn(error)
    }
  }

  public async loadTheme(): Promise<Theme | undefined> {
    if (this.scopedEnvVarTrue('DISABLE_THEME')) return

    const userThemeFile = resolve(this.configDir, 'theme.json')
    const getDefaultTheme = async () => {
      if (!this.pjson.oclif.theme) return
      if (typeof this.pjson.oclif.theme === 'string') {
        return safeReadJson<Record<string, string>>(resolve(this.root, this.pjson.oclif.theme))
      }

      return this.pjson.oclif.theme
    }

    const [defaultTheme, userTheme] = await Promise.all([
      getDefaultTheme(),
      safeReadJson<Record<string, string>>(userThemeFile),
    ])

    // Merge the default theme with the user theme, giving the user theme precedence.
    const merged = {...defaultTheme, ...userTheme}
    return Object.keys(merged).length > 0 ? parseTheme(merged) : undefined
  }

  protected macosCacheDir(): string | undefined {
    return (this.platform === 'darwin' && join(this.home, 'Library', 'Caches', this.dirname)) || undefined
  }

  public async runCommand<T = unknown>(
    id: string,
    argv: string[] = [],
    cachedCommand: Command.Loadable | null = null,
  ): Promise<T> {
    const marker = Performance.mark(OCLIF_MARKER_OWNER, `config.runCommand#${id}`)
    debug('runCommand %s %o', id, argv)
    let c = cachedCommand ?? this.findCommand(id)
    if (!c) {
      const matches = this.flexibleTaxonomy ? this.findMatches(id, argv) : []
      const hookResult =
        this.flexibleTaxonomy && matches.length > 0
          ? await this.runHook('command_incomplete', {argv, id, matches})
          : await this.runHook('command_not_found', {argv, id})

      if (hookResult.successes[0]) return hookResult.successes[0].result as T
      if (hookResult.failures[0]) throw hookResult.failures[0].error
      throw new CLIError(`command ${id} not found`)
    }

    if (this.isJitPluginCommand(c)) {
      const pluginName = c.pluginName!
      const pluginVersion = this.pjson.oclif.jitPlugins![pluginName]
      const jitResult = await this.runHook('jit_plugin_not_installed', {
        argv,
        command: c,
        id,
        pluginName,
        pluginVersion,
      })
      if (jitResult.failures[0]) throw jitResult.failures[0].error
      if (jitResult.successes[0]) {
        await this.loadPluginsAndCommands({force: true})
        c = this.findCommand(id) ?? c
      } else {
        // this means that no jit_plugin_not_installed hook exists, so we should run the default behavior
        const result = await this.runHook('command_not_found', {argv, id})
        if (result.successes[0]) return result.successes[0].result as T
        if (result.failures[0]) throw result.failures[0].error
        throw new CLIError(`command ${id} not found`)
      }
    }

    const command = await c.load()
    await this.runHook('prerun', {argv, Command: command})

    const result = (await command.run(argv, this)) as T
    // If plugins:uninstall was run, we need to remove all the uninstalled plugins
    // from this.plugins so that the postrun hook doesn't attempt to run any
    // hooks that might have existed in the uninstalled plugins.
    if (c.id === 'plugins:uninstall') {
      for (const arg of argv) this.plugins.delete(arg)
    }

    await this.runHook('postrun', {argv, Command: command, result})

    marker?.addDetails({command: id, plugin: c.pluginName!})
    marker?.stop()
    return result
  }

  public async runHook<T extends keyof Hooks, P extends Hooks = Hooks>(
    event: T,
    opts: P[T]['options'],
    timeout?: number,
    captureErrors?: boolean,
  ): Promise<Hook.Result<P[T]['return']>> {
    const marker = Performance.mark(OCLIF_MARKER_OWNER, `config.runHook#${event}`)
    debug('start %s hook', event)
    const search = (m: any): Hook<T> => {
      if (typeof m === 'function') return m
      if (m.default && typeof m.default === 'function') return m.default
      return Object.values(m).find((m: any) => typeof m === 'function') as Hook<T>
    }

    const withTimeout = async (ms: number, promise: any) => {
      let id: NodeJS.Timeout
      const timeout = new Promise((_, reject) => {
        id = setTimeout(() => {
          reject(new Error(`Timed out after ${ms} ms.`))
        }, ms).unref()
      })

      return Promise.race([promise, timeout]).then((result) => {
        clearTimeout(id)
        return result
      })
    }

    const final: Hook.Result<P[T]['return']> = {
      failures: [],
      successes: [],
    }

    const plugins = ROOT_ONLY_HOOKS.has(event) ? [this.rootPlugin] : [...this.plugins.values()]
    const promises = plugins.map(async (p) => {
      const debug = loggerMakeDebug([p.name, 'hooks', event].join(':'))
      const context: Hook.Context = {
        config: this,
        debug,
        error(message, options: {code?: string; exit?: number} = {}) {
          error(message, options)
        },
        exit(code = 0) {
          exit(code)
        },
        log(message?: any, ...args: any[]) {
          ux.stdout(message, ...args)
        },
        warn(message: string) {
          warn(message)
        },
      }

      const hooks = p.hooks[event] || []

      for (const hook of hooks) {
        const marker = Performance.mark(OCLIF_MARKER_OWNER, `config.runHook#${p.name}(${hook.target})`)
        try {
          /* eslint-disable no-await-in-loop */
          const {filePath, isESM, module} = await loadWithData(p, await tsPath(p.root, hook.target, p))
          debug('start', isESM ? '(import)' : '(require)', filePath)
          // If no hook is found using the identifier, then we should `search` for the hook but only if the hook identifier is 'default'
          // A named identifier (e.g. MY_HOOK) that isn't found indicates that the hook isn't implemented in the plugin.
          const hookFn = module[hook.identifier] ?? (hook.identifier === 'default' ? search(module) : undefined)
          if (!hookFn) {
            debug('No hook found for hook definition:', hook)
            continue
          }

          const result = timeout
            ? await withTimeout(timeout, hookFn.call(context, {...(opts as any), config: this, context}))
            : await hookFn.call(context, {...(opts as any), config: this, context})
          final.successes.push({plugin: p, result})

          if (p.name === '@oclif/plugin-legacy' && event === 'init') {
            this.insertLegacyPlugins(result as IPlugin[])
          }

          debug('done')
        } catch (error: any) {
          final.failures.push({error: error as Error, plugin: p})
          debug(error)
          // Do not throw the error if
          // captureErrors is set to true
          // error.oclif.exit is undefined or 0
          // error.code is MODULE_NOT_FOUND
          if (
            !captureErrors &&
            error.oclif?.exit !== undefined &&
            error.oclif?.exit !== 0 &&
            error.code !== 'MODULE_NOT_FOUND'
          )
            throw error
        }

        marker?.addDetails({
          event,
          hook: hook.target,
          plugin: p.name,
        })
        marker?.stop()
      }
    })

    await Promise.all(promises)

    debug('%s hook done', event)

    marker?.stop()
    return final
  }

  public s3Key(
    type: keyof S3Templates,
    ext?: '.tar.gz' | '.tar.xz' | IConfig.s3Key.Options,
    options: IConfig.s3Key.Options = {},
  ): string {
    if (typeof ext === 'object') options = ext
    else if (ext) options.ext = ext
    const template = this.updateConfig.s3?.templates?.[options.platform ? 'target' : 'vanilla'][type] ?? ''
    return ejs.render(template, {...(this as any), ...options})
  }

  public s3Url(key: string): string {
    const {host} = this.updateConfig.s3 ?? {host: undefined}
    if (!host) throw new Error('no s3 host is set')
    const url = new URL(host)
    url.pathname = join(url.pathname, key)
    return url.toString()
  }

  public scopedEnvVar(k: string): string | undefined {
    return process.env[this.scopedEnvVarKeys(k).find((k) => process.env[k]) as string]
  }

  /**
   * this DOES NOT account for bin aliases, use scopedEnvVarKeys instead which will account for bin aliases
   * @param k {string}, the unscoped key you want to get the value for
   * @returns {string} returns the env var key
   */
  public scopedEnvVarKey(k: string): string {
    return [this.bin, k]
      .map((p) => p.replaceAll('@', '').replaceAll(/[/-]/g, '_'))
      .join('_')
      .toUpperCase()
  }

  /**
   * gets the scoped env var keys for a given key, including bin aliases
   * @param k {string}, the env key e.g. 'debug'
   * @returns {string[]} e.g. ['SF_DEBUG', 'SFDX_DEBUG']
   */
  public scopedEnvVarKeys(k: string): string[] {
    return [this.bin, ...(this.binAliases ?? [])]
      .filter(Boolean)
      .map((alias) => [alias.replaceAll('@', '').replaceAll(/[/-]/g, '_'), k].join('_').toUpperCase())
  }

  public scopedEnvVarTrue(k: string): boolean {
    const v = this.scopedEnvVar(k)
    return v === '1' || v === 'true'
  }

  protected windowsHome(): string | undefined {
    return this.windowsHomedriveHome() || this.windowsUserprofileHome()
  }

  protected windowsHomedriveHome(): string | undefined {
    return process.env.HOMEDRIVE && process.env.HOMEPATH && join(process.env.HOMEDRIVE!, process.env.HOMEPATH!)
  }

  protected windowsUserprofileHome(): string | undefined {
    return process.env.USERPROFILE
  }

  private buildS3Config() {
    const s3 = this.pjson.oclif.update?.s3
    const bucket = this.scopedEnvVar('S3_BUCKET') ?? s3?.bucket
    const host = s3?.host ?? (bucket && `https://${bucket}.s3.amazonaws.com`)
    const templates = {
      ...s3?.templates,
      target: {
        baseDir: '<%- bin %>',
        manifest: "<%- channel === 'stable' ? '' : 'channels/' + channel + '/' %><%- platform %>-<%- arch %>",
        unversioned:
          "<%- channel === 'stable' ? '' : 'channels/' + channel + '/' %><%- bin %>-<%- platform %>-<%- arch %><%- ext %>",
        versioned:
          "<%- channel === 'stable' ? '' : 'channels/' + channel + '/' %><%- bin %>-v<%- version %>/<%- bin %>-v<%- version %>-<%- platform %>-<%- arch %><%- ext %>",
        ...(s3?.templates && s3?.templates.target),
      },
      vanilla: {
        baseDir: '<%- bin %>',
        manifest: "<%- channel === 'stable' ? '' : 'channels/' + channel + '/' %>version",
        unversioned: "<%- channel === 'stable' ? '' : 'channels/' + channel + '/' %><%- bin %><%- ext %>",
        versioned:
          "<%- channel === 'stable' ? '' : 'channels/' + channel + '/' %><%- bin %>-v<%- version %>/<%- bin %>-v<%- version %><%- ext %>",
        ...(s3?.templates && s3?.templates.vanilla),
      },
    }
    return {
      bucket,
      host,
      templates,
    }
  }

  private getCmdLookupId(id: string): string {
    if (this._commands.has(id)) return id
    if (this.commandPermutations.hasValid(id)) return this.commandPermutations.getValid(id)!
    return id
  }

  private getTopicLookupId(id: string): string {
    if (this._topics.has(id)) return id
    if (this.topicPermutations.hasValid(id)) return this.topicPermutations.getValid(id)!
    return id
  }

  /**
   * Insert legacy plugins
   *
   * Replace invalid CLI plugins (cli-engine plugins, mostly Heroku) loaded via `this.loadPlugins`
   * with oclif-compatible ones returned by @oclif/plugin-legacy init hook.
   *
   * @param plugins array of oclif-compatible plugins
   */
  private insertLegacyPlugins(plugins: IPlugin[]) {
    for (const plugin of plugins) {
      this.plugins.set(plugin.name, plugin)

      // Delete all commands from the legacy plugin so that we can re-add them.
      // This is necessary because determinePriority will pick the initial
      // command that was added, which won't have been converted by PluginLegacy yet.
      for (const cmd of plugin.commands ?? []) {
        this._commands.delete(cmd.id)
        for (const alias of [...(cmd.aliases ?? []), ...(cmd.hiddenAliases ?? [])]) {
          this._commands.delete(alias)
        }
      }

      this.loadCommands(plugin)
    }
  }

  private isJitPluginCommand(c: Command.Loadable): boolean {
    // Return true if the command's plugin is listed under oclif.jitPlugins AND if the plugin hasn't been loaded to this.plugins
    return (
      Object.keys(this.pjson.oclif.jitPlugins ?? {}).includes(c.pluginName ?? '') &&
      Boolean(c?.pluginName && !this.plugins.has(c.pluginName))
    )
  }

  private loadCommands(plugin: IPlugin) {
    const marker = Performance.mark(OCLIF_MARKER_OWNER, `config.loadCommands#${plugin.name}`, {plugin: plugin.name})
    for (const command of plugin.commands) {
      // set canonical command id
      if (this._commands.has(command.id)) {
        const prioritizedCommand = determinePriority(this.pjson.oclif.plugins ?? [], [
          this._commands.get(command.id)!,
          command,
        ])
        this._commands.set(prioritizedCommand.id, prioritizedCommand)
      } else {
        this._commands.set(command.id, command)
      }

      // v3 moved command id permutations to the manifest, but some plugins may not have
      // the new manifest yet. For those, we need to calculate the permutations here.
      const permutations =
        this.flexibleTaxonomy && command.permutations === undefined
          ? getCommandIdPermutations(command.id)
          : (command.permutations ?? [command.id])
      // set every permutation
      for (const permutation of permutations) {
        this.commandPermutations.add(permutation, command.id)
      }

      const handleAlias = (alias: string, hidden = false) => {
        const aliasWithDefaultTopicSeparator = toStandardizedId(alias, this)
        if (this._commands.has(aliasWithDefaultTopicSeparator)) {
          const prioritizedCommand = determinePriority(this.pjson.oclif.plugins ?? [], [
            this._commands.get(aliasWithDefaultTopicSeparator)!,
            command,
          ])
          this._commands.set(aliasWithDefaultTopicSeparator, {
            ...prioritizedCommand,
            id: aliasWithDefaultTopicSeparator,
          })
        } else {
          this._commands.set(aliasWithDefaultTopicSeparator, {...command, hidden, id: aliasWithDefaultTopicSeparator})
        }

        // set every permutation of the aliases
        // v3 moved command alias permutations to the manifest, but some plugins may not have
        // the new manifest yet. For those, we need to calculate the permutations here.
        const aliasPermutations =
          this.flexibleTaxonomy && command.aliasPermutations === undefined
            ? getCommandIdPermutations(aliasWithDefaultTopicSeparator)
            : (command.permutations ?? [aliasWithDefaultTopicSeparator])
        // set every permutation
        for (const permutation of aliasPermutations) {
          this.commandPermutations.add(permutation, command.id)
        }
      }

      // set command aliases
      for (const alias of command.aliases ?? []) {
        handleAlias(alias)
      }

      // set hidden command aliases
      for (const alias of command.hiddenAliases ?? []) {
        handleAlias(alias, true)
      }
    }

    marker?.addDetails({commandCount: plugin.commands.length})
    marker?.stop()
  }

  private loadTopics(plugin: IPlugin) {
    const marker = Performance.mark(OCLIF_MARKER_OWNER, `config.loadTopics#${plugin.name}`, {plugin: plugin.name})
    for (const topic of compact(plugin.topics)) {
      const existing = this._topics.get(topic.name)
      if (existing) {
        existing.description = topic.description || existing.description
        existing.hidden = existing.hidden || topic.hidden
      } else {
        this._topics.set(topic.name, topic)
      }

      const permutations = this.flexibleTaxonomy ? getCommandIdPermutations(topic.name) : [topic.name]
      for (const permutation of permutations) {
        this.topicPermutations.add(permutation, topic.name)
      }
    }

    // Add missing topics for displaying help when partial commands are entered.
    for (const c of plugin.commands.filter((c) => !c.hidden)) {
      const parts = c.id.split(':')
      while (parts.length > 0) {
        const name = parts.join(':')
        if (name && !this._topics.has(name)) {
          this._topics.set(name, {description: c.summary || c.description, name})
        }

        parts.pop()
      }
    }

    marker?.stop()
  }

  private maybeAdjustDebugSetting(): void {
    if (this.scopedEnvVarTrue('DEBUG')) {
      settings.debug = true
      displayWarnings()
    }
  }

  private warn(err: {detail: string; name: string} | Error | string, scope?: string): void {
    if (this.warned) return

    if (typeof err === 'string') {
      process.emitWarning(err)
      return
    }

    if (err instanceof Error) {
      const modifiedErr: any = err
      modifiedErr.name = `${err.name} Plugin: ${this.name}`
      modifiedErr.detail = compact([
        (err as any).detail,
        `module: ${this._base}`,
        scope && `task: ${scope}`,
        `plugin: ${this.name}`,
        `root: ${this.root}`,
        'See more details with DEBUG=*',
      ]).join('\n')
      process.emitWarning(err)
      return
    }

    // err is an object
    process.emitWarning('Config.warn expected either a string or Error, but instead received an object')
    err.name = `${err.name} Plugin: ${this.name}`
    err.detail = compact([
      err.detail,
      `module: ${this._base}`,
      scope && `task: ${scope}`,
      `plugin: ${this.name}`,
      `root: ${this.root}`,
      'See more details with DEBUG=*',
    ]).join('\n')

    process.emitWarning(JSON.stringify(err))
  }
}
