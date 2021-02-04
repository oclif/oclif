"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
// tslint:disable no-implicit-dependencies
const command_1 = require("@oclif/command");
const Config = require("@oclif/config");
const plugin_help_1 = require("@oclif/plugin-help");
const fs = require("fs-extra");
const _ = require("lodash");
const path = require("path");
const url_1 = require("url");
const util_1 = require("../util");
const help_compatibility_1 = require("../help-compatibility");
const normalize = require('normalize-package-data');
const columns = parseInt(process.env.COLUMNS, 10) || 120;
const slugify = new (require('github-slugger'))();
class Readme extends command_1.Command {
    async run() {
        const { flags } = this.parse(Readme);
        const cwd = process.cwd();
        const readmePath = path.resolve(cwd, 'README.md');
        const config = await Config.load({ root: cwd, devPlugins: false, userPlugins: false });
        try {
            const p = require.resolve('@oclif/plugin-legacy', { paths: [cwd] });
            const plugin = new Config.Plugin({ root: p, type: 'core' });
            await plugin.load();
            config.plugins.push(plugin);
        }
        catch (_a) { }
        await config.runHook('init', { id: 'readme', argv: this.argv });
        let readme = await fs.readFile(readmePath, 'utf8');
        let commands = config.commands;
        commands = commands.filter(c => !c.hidden);
        commands = commands.filter(c => c.pluginType === 'core');
        this.debug('commands:', commands.map(c => c.id).length);
        commands = util_1.uniqBy(commands, c => c.id);
        commands = util_1.sortBy(commands, c => c.id);
        readme = this.replaceTag(readme, 'usage', this.usage(config));
        readme = this.replaceTag(readme, 'commands', flags.multi ? this.multiCommands(config, commands, flags.dir) : this.commands(config, commands));
        readme = this.replaceTag(readme, 'toc', this.toc(config, readme));
        readme = readme.trimRight();
        readme += '\n';
        await fs.outputFile(readmePath, readme);
    }
    replaceTag(readme, tag, body) {
        if (readme.includes(`<!-- ${tag} -->`)) {
            if (readme.includes(`<!-- ${tag}stop -->`)) {
                readme = readme.replace(new RegExp(`<!-- ${tag} -->(.|\n)*<!-- ${tag}stop -->`, 'm'), `<!-- ${tag} -->`);
            }
            this.log(`replacing <!-- ${tag} --> in README.md`);
        }
        return readme.replace(`<!-- ${tag} -->`, `<!-- ${tag} -->\n${body}\n<!-- ${tag}stop -->`);
    }
    toc(__, readme) {
        return readme.split('\n').filter(l => l.startsWith('# '))
            .map(l => l.trim().slice(2))
            .map(l => `* [${l}](#${slugify.slug(l)})`)
            .join('\n');
    }
    usage(config) {
        return [
            `\`\`\`sh-session
$ npm install -g ${config.name}
$ ${config.bin} COMMAND
running command...
$ ${config.bin} (-v|--version|version)
${config.name}/${process.env.OCLIF_NEXT_VERSION || config.version} ${process.platform}-${process.arch} node-v${process.versions.node}
$ ${config.bin} --help [COMMAND]
USAGE
  $ ${config.bin} COMMAND
...
\`\`\`\n`,
        ].join('\n').trim();
    }
    multiCommands(config, commands, dir) {
        let topics = config.topics;
        topics = topics.filter(t => !t.hidden && !t.name.includes(':'));
        topics = topics.filter(t => commands.find(c => c.id.startsWith(t.name)));
        topics = util_1.sortBy(topics, t => t.name);
        topics = util_1.uniqBy(topics, t => t.name);
        for (const topic of topics) {
            this.createTopicFile(path.join('.', dir, topic.name.replace(/:/g, '/') + '.md'), config, topic, commands.filter(c => c.id === topic.name || c.id.startsWith(topic.name + ':')));
        }
        return [
            '# Command Topics\n',
            ...topics.map(t => {
                return util_1.compact([
                    `* [\`${config.bin} ${t.name}\`](${dir}/${t.name.replace(/:/g, '/')}.md)`,
                    util_1.template({ config })(t.description || '').trim().split('\n')[0],
                ]).join(' - ');
            }),
        ].join('\n').trim() + '\n';
    }
    createTopicFile(file, config, topic, commands) {
        const bin = `\`${config.bin} ${topic.name}\``;
        const doc = [
            bin,
            '='.repeat(bin.length),
            '',
            util_1.template({ config })(topic.description || '').trim(),
            '',
            this.commands(config, commands),
        ].join('\n').trim() + '\n';
        fs.outputFileSync(file, doc);
    }
    commands(config, commands) {
        return [
            ...commands.map(c => {
                const usage = this.commandUsage(config, c);
                return `* [\`${config.bin} ${usage}\`](#${slugify.slug(`${config.bin}-${usage}`)})`;
            }),
            '',
            ...commands.map(c => this.renderCommand(config, c)).map(s => s.trim() + '\n'),
        ].join('\n').trim();
    }
    renderCommand(config, c) {
        this.debug('rendering command', c.id);
        const title = util_1.template({ config, command: c })(c.description || '').trim().split('\n')[0];
        const HelpClass = plugin_help_1.getHelpClass(config);
        const help = new HelpClass(config, { stripAnsi: true, maxWidth: columns });
        const wrapper = new help_compatibility_1.HelpCompatibilityWrapper(help);
        const header = () => `## \`${config.bin} ${this.commandUsage(config, c)}\``;
        try {
            return util_1.compact([
                header(),
                title,
                '```\n' + wrapper.formatCommand(c).trim() + '\n```',
                this.commandCode(config, c),
            ]).join('\n\n');
        }
        catch (error) {
            this.error(error.message);
        }
    }
    commandCode(config, c) {
        const pluginName = c.pluginName;
        if (!pluginName)
            return;
        const plugin = config.plugins.find(p => p.name === c.pluginName);
        if (!plugin)
            return;
        const repo = this.repo(plugin);
        if (!repo)
            return;
        let label = plugin.name;
        let version = plugin.version;
        const commandPath = this.commandPath(plugin, c);
        if (!commandPath)
            return;
        if (config.name === plugin.name) {
            label = commandPath;
            version = process.env.OCLIF_NEXT_VERSION || version;
        }
        const template = plugin.pjson.oclif.repositoryPrefix || '<%- repo %>/blob/v<%- version %>/<%- commandPath %>';
        return `_See code: [${label}](${_.template(template)({ repo, version, commandPath, config, c })})_`;
    }
    repo(plugin) {
        const pjson = Object.assign({}, plugin.pjson);
        normalize(pjson);
        const repo = pjson.repository && pjson.repository.url;
        if (!repo)
            return;
        const url = new url_1.URL(repo);
        if (!['github.com', 'gitlab.com'].includes(url.hostname) && !pjson.oclif.repositoryPrefix)
            return;
        return `https://${url.hostname}${url.pathname.replace(/\.git$/, '')}`;
    }
    // eslint-disable-next-line valid-jsdoc
    /**
     * fetches the path to a command
     */
    commandPath(plugin, c) {
        const commandsDir = plugin.pjson.oclif.commands;
        if (!commandsDir)
            return;
        let p = path.join(plugin.root, commandsDir, ...c.id.split(':'));
        const libRegex = new RegExp('^lib' + (path.sep === '\\' ? '\\\\' : path.sep));
        if (fs.pathExistsSync(path.join(p, 'index.js'))) {
            p = path.join(p, 'index.js');
        }
        else if (fs.pathExistsSync(p + '.js')) {
            p += '.js';
        }
        else if (plugin.pjson.devDependencies && plugin.pjson.devDependencies.typescript) {
            // check if non-compiled scripts are available
            const base = p.replace(plugin.root + path.sep, '');
            p = path.join(plugin.root, base.replace(libRegex, 'src' + path.sep));
            if (fs.pathExistsSync(path.join(p, 'index.ts'))) {
                p = path.join(p, 'index.ts');
            }
            else if (fs.pathExistsSync(p + '.ts')) {
                p += '.ts';
            }
            else
                return;
        }
        else
            return;
        p = p.replace(plugin.root + path.sep, '');
        if (plugin.pjson.devDependencies && plugin.pjson.devDependencies.typescript) {
            p = p.replace(libRegex, 'src' + path.sep);
            p = p.replace(/\.js$/, '.ts');
        }
        p = p.replace(/\\/g, '/'); // Replace windows '\' by '/'
        return p;
    }
    commandUsage(config, command) {
        const arg = (arg) => {
            const name = arg.name.toUpperCase();
            if (arg.required)
                return `${name}`;
            return `[${name}]`;
        };
        const defaultUsage = () => {
            // const flags = Object.entries(command.flags)
            // .filter(([, v]) => !v.hidden)
            return util_1.compact([
                command.id,
                command.args.filter(a => !a.hidden).map(a => arg(a)).join(' '),
            ]).join(' ');
        };
        const usages = util_1.castArray(command.usage);
        return util_1.template({ config, command })(usages.length === 0 ? defaultUsage() : usages[0]);
    }
}
exports.default = Readme;
Readme.hidden = true;
Readme.description = `adds commands to README.md in current directory
The readme must have any of the following tags inside of it for it to be replaced or else it will do nothing:
# Usage
<!-- usage -->
# Commands
<!-- commands -->

Customize the code URL prefix by setting oclif.repositoryPrefix in package.json.
`;
Readme.flags = {
    dir: command_1.flags.string({ description: 'output directory for multi docs', default: 'docs', required: true }),
    multi: command_1.flags.boolean({ description: 'create a different markdown page for each topic' }),
};
