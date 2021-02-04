"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const command_1 = require("@oclif/command");
const Config = require("@oclif/config");
const fs = require("fs-extra");
const path = require("path");
class Manifest extends command_1.Command {
    async run() {
        try {
            fs.unlinkSync('oclif.manifest.json');
        }
        catch (_a) { }
        const { args } = this.parse(Manifest);
        const root = path.resolve(args.path);
        let plugin = new Config.Plugin({ root, type: 'core', ignoreManifest: true, errorOnManifestCreate: true });
        if (!plugin)
            throw new Error('plugin not found');
        await plugin.load();
        if (!plugin.valid) {
            const p = require.resolve('@oclif/plugin-legacy', { paths: [process.cwd()] });
            const { PluginLegacy } = require(p);
            delete plugin.name;
            plugin = new PluginLegacy(this.config, plugin);
            await plugin.load();
        }
        if (process.env.OCLIF_NEXT_VERSION) {
            plugin.manifest.version = process.env.OCLIF_NEXT_VERSION;
        }
        const dotfile = plugin.pjson.files.find((f) => f.endsWith('.oclif.manifest.json'));
        const file = path.join(plugin.root, `${dotfile ? '.' : ''}oclif.manifest.json`);
        fs.writeFileSync(file, JSON.stringify(plugin.manifest));
        this.log(`wrote manifest to ${file}`);
    }
}
exports.default = Manifest;
Manifest.hidden = true;
Manifest.description = 'generates plugin manifest json';
Manifest.args = [
    { name: 'path', description: 'path to plugin', default: '.' },
];
