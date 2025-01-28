import {Command, Config, HelpBase, Interfaces, loadHelpClass, toConfiguredId, ux} from '@oclif/core'
import makeDebug from 'debug'
import {render} from 'ejs'
import * as fs from 'fs-extra'
import {readFile} from 'node:fs/promises'
import path from 'node:path'
import {URL} from 'node:url'
import normalize from 'normalize-package-data'

import {HelpCompatibilityWrapper} from './help-compatibility'
const columns = Number.parseInt(process.env.COLUMNS!, 10) || 120
import {castArray, compact, sortBy, uniqBy} from './util'

const debug = makeDebug('readme')

interface HelpBaseDerived {
  new (config: Interfaces.Config, opts?: Partial<Interfaces.HelpOptions>): HelpBase
}

type Options = {
  aliases?: boolean
  dryRun?: boolean
  multi?: boolean
  nestedTopicsDepth?: number
  outputDir: string
  pluginDir?: string
  readmePath: string
  repositoryPrefix?: string
  version?: string
}

async function slugify(str: string): Promise<string> {
  const {default: GithubSlugger} = await import('github-slugger')
  const slugify = new GithubSlugger()
  return slugify.slug(str)
}

export default class ReadmeGenerator {
  public constructor(
    private config: Config,
    private options: Options,
  ) {}

  protected commandCode(c: Command.Cached): string | undefined {
    const pluginName = c.pluginName
    if (!pluginName) return
    const plugin = this.config.plugins.get(pluginName)
    if (!plugin) return
    const repo = this.repo(plugin)
    if (!repo) return
    let label = plugin.name
    let version = plugin.version
    const commandPath = this.commandPath(plugin, c)
    if (!commandPath) return
    if (this.config.name === plugin.name) {
      label = commandPath
      version = this.options.version || version
    }

    const template =
      this.options.repositoryPrefix ||
      plugin.pjson.oclif.repositoryPrefix ||
      '<%- repo %>/blob/v<%- version %>/<%- commandPath %>'
    return `_See code: [${label}](${render(template, {c, commandPath, config: this.config, repo, version})})_`
  }

  protected async commands(commands: Command.Cached[]): Promise<string> {
    const helpClass = await loadHelpClass(this.config)
    return [
      ...(await Promise.all(
        commands.map(async (c) => {
          const usage = this.commandUsage(c)
          return usage
            ? `* [\`${this.config.bin} ${usage}\`](#${await slugify(`${this.config.bin}-${usage}`)})`
            : `* [\`${this.config.bin}\`](#${await slugify(`${this.config.bin}`)})`
        }),
      )),
      '',
      ...commands.map((c) => this.renderCommand({...c}, helpClass)).map((s) => s.trim() + '\n'),
    ]
      .join('\n')
      .trim()
  }

  protected async createTopicFile(file: string, topic: Interfaces.Topic, commands: Command.Cached[]): Promise<void> {
    const bin = `\`${this.config.bin} ${topic.name}\``
    const doc =
      [
        bin,
        '='.repeat(bin.length),
        '',
        render(topic.description || '', {config: this.config}).trim(),
        '',
        await this.commands(commands),
      ]
        .join('\n')
        .trim() + '\n'

    await this.write(path.resolve(this.options.pluginDir ?? process.cwd(), file), doc)
  }

  public async generate(): Promise<string> {
    let readme = await this.read()
    const commands = uniqBy(
      this.config.commands
        .filter((c) => !c.hidden && c.pluginType === 'core')
        .filter((c) => (this.options.aliases ? true : !c.aliases.includes(c.id)))
        .map((c) => (this.config.isSingleCommandCLI ? {...c, id: ''} : c))
        .sort((a, b) => a.id.localeCompare(b.id)),
      (c) => c.id,
    )

    debug('commands:', commands.map((c) => c.id).length)

    readme = this.replaceTag(readme, 'usage', this.usage())
    readme = this.replaceTag(
      readme,
      'commands',
      this.options.multi
        ? await this.multiCommands(commands, this.options.outputDir, this.options.nestedTopicsDepth)
        : await this.commands(commands),
    )
    readme = this.replaceTag(readme, 'toc', await this.tableOfContents(readme))

    readme = readme.trimEnd()
    readme += '\n'

    await this.write(this.options.readmePath, readme)

    return readme
  }

  protected async multiCommands(
    commands: Command.Cached[],
    dir: string,
    nestedTopicsDepth: number | undefined,
  ): Promise<string> {
    let topics = this.config.topics
    topics = nestedTopicsDepth
      ? topics.filter((t) => !t.hidden && (t.name.match(/:/g) || []).length < nestedTopicsDepth)
      : topics.filter((t) => !t.hidden && !t.name.includes(':'))

    topics = topics.filter((t) => commands.find((c) => c.id.startsWith(t.name)))
    topics = uniqBy(
      sortBy(topics, (t) => t.name),
      (t) => t.name,
    )
    for (const topic of topics) {
      // eslint-disable-next-line no-await-in-loop
      await this.createTopicFile(
        path.join('.', dir, topic.name.replaceAll(':', '/') + '.md'),
        topic,
        commands.filter((c) => c.id === topic.name || c.id.startsWith(topic.name + ':')),
      )
    }

    return (
      [
        '# Command Topics\n',
        ...topics.map((t) =>
          compact([
            `* [\`${this.config.bin} ${t.name.replaceAll(':', this.config.topicSeparator)}\`](${dir}/${t.name.replaceAll(':', '/')}.md)`,
            render(t.description || '', {config: this.config})
              .trim()
              .split('\n')[0],
          ]).join(' - '),
        ),
      ]
        .join('\n')
        .trim() + '\n'
    )
  }

  protected async read(): Promise<string> {
    return readFile(this.options.readmePath, 'utf8')
  }

  protected renderCommand(c: Command.Cached, HelpClass: HelpBaseDerived): string {
    debug('rendering command', c.id)
    const title = render(c.summary ?? c.description ?? '', {command: c, config: this.config})
      .trim()
      .split('\n')[0]
    const help = new HelpClass(this.config, {maxWidth: columns, respectNoCacheDefault: true, stripAnsi: true})
    const wrapper = new HelpCompatibilityWrapper(help)

    const header = () => {
      const usage = this.commandUsage(c)
      return usage ? `## \`${this.config.bin} ${usage}\`` : `## \`${this.config.bin}\``
    }

    try {
      // copy c to keep the command ID with colons, see:
      // https://github.com/oclif/oclif/pull/1165#discussion_r1282305242
      const command = {...c}
      return compact([
        header(),
        title,
        '```\n' + wrapper.formatCommand(c).trim() + '\n```',
        this.commandCode(command),
      ]).join('\n\n')
    } catch (error: unknown) {
      const {message} = error as {message: string}
      ux.error(message)
    }
  }

  protected replaceTag(readme: string, tag: string, body: string): string {
    if (readme.includes(`<!-- ${tag} -->`)) {
      if (readme.includes(`<!-- ${tag}stop -->`)) {
        readme = readme.replace(new RegExp(`<!-- ${tag} -->(.|\n)*<!-- ${tag}stop -->`, 'm'), `<!-- ${tag} -->`)
      }

      ux.stdout(`replacing <!-- ${tag} --> in ${this.options.readmePath}`)
    }

    return readme.replace(`<!-- ${tag} -->`, `<!-- ${tag} -->\n${body}\n<!-- ${tag}stop -->`)
  }

  protected async tableOfContents(readme: string): Promise<string> {
    const toc = await Promise.all(
      readme
        .split('\n')
        .filter((l) => l.startsWith('# '))
        .map((l) => l.trim().slice(2))
        .map(async (l) => `* [${l}](#${await slugify(l)})`),
    )

    return toc.join('\n')
  }

  protected usage(): string {
    const versionFlags = ['--version', ...(this.config.pjson.oclif.additionalVersionFlags ?? []).sort()]
    const versionFlagsString = `(${versionFlags.join('|')})`
    return [
      `\`\`\`sh-session
$ npm install -g ${this.config.name}
$ ${this.config.bin} COMMAND
running command...
$ ${this.config.bin} ${versionFlagsString}
${this.config.name}/${this.options.version || this.config.version} ${process.platform}-${process.arch} node-v${
        process.versions.node
      }
$ ${this.config.bin} --help [COMMAND]
USAGE
  $ ${this.config.bin} COMMAND
...
\`\`\`\n`,
    ]
      .join('\n')
      .trim()
  }

  protected async write(file: string, content: string): Promise<void> {
    if (!this.options.dryRun) await fs.outputFile(file, content)
  }

  /**
   * fetches the path to a command
   */
  // eslint-disable-next-line complexity
  private commandPath(plugin: Interfaces.Plugin, c: Command.Cached): string | undefined {
    const strategy =
      typeof plugin.pjson.oclif?.commands === 'string' ? 'pattern' : plugin.pjson.oclif?.commands?.strategy

    // if the strategy is explicit, we can't determine the path so return undefined
    if (strategy === 'explicit') return

    const commandsDir =
      typeof plugin.pjson.oclif?.commands === 'string'
        ? plugin.pjson.oclif?.commands
        : plugin.pjson.oclif?.commands?.target

    if (!commandsDir) return
    const hasTypescript = plugin.pjson.devDependencies?.typescript || plugin.pjson.dependencies?.typescript
    let p = path.join(plugin.root, commandsDir, ...c.id.split(':'))
    const outDir = path.dirname(commandsDir.replace(/^.\/|.\\/, '')) // remove leading ./ or .\ from path
    const outDirRegex = new RegExp('^' + outDir + (path.sep === '\\' ? '\\\\' : path.sep))
    if (fs.pathExistsSync(path.join(p, 'index.js'))) {
      p = path.join(p, 'index.js')
    } else if (fs.pathExistsSync(p + '.js')) {
      p += '.js'
    } else if (hasTypescript) {
      // check if non-compiled scripts are available
      const base = p.replace(plugin.root + path.sep, '')
      p = path.join(plugin.root, base.replace(outDirRegex, 'src' + path.sep))
      if (fs.pathExistsSync(path.join(p, 'index.ts'))) {
        p = path.join(p, 'index.ts')
      } else if (fs.pathExistsSync(p + '.ts')) {
        p += '.ts'
      } else return
    } else return
    p = p.replace(plugin.root + path.sep, '')
    if (hasTypescript) {
      p = p.replace(outDirRegex, 'src' + path.sep).replace(/\.js$/, '.ts')
    }

    p = p.replaceAll('\\', '/') // Replace windows '\' by '/'
    return p
  }

  private commandUsage(command: Command.Cached): string {
    const arg = (arg: Command.Arg.Cached) => {
      const name = arg.name.toUpperCase()
      if (arg.required) return `${name}`
      return `[${name}]`
    }

    const id = toConfiguredId(command.id, this.config)
    const defaultUsage = () =>
      compact([
        id,
        Object.values(command.args)
          .filter((a) => !a.hidden)
          .map((a) => arg(a))
          .join(' '),
      ]).join(' ')

    const usages = castArray(command.usage)
    return render(usages.length === 0 ? defaultUsage() : usages[0], {command, config: this.config})
  }

  private repo(plugin: Interfaces.Plugin): string | undefined {
    const pjson = {...plugin.pjson}
    normalize(pjson)
    const repo = pjson.repository && pjson.repository.url
    if (!repo) return
    const url = new URL(repo)
    if (
      !['github.com', 'gitlab.com'].includes(url.hostname) &&
      !pjson.oclif.repositoryPrefix &&
      !this.options.repositoryPrefix
    )
      return
    return `https://${url.hostname}${url.pathname.replace(/\.git$/, '')}`
  }
}
