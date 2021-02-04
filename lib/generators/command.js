"use strict";
const _ = require("lodash");
const path = require("path");
const Generator = require("yeoman-generator");
const yosay = require("yosay");
const { version } = require('../../package.json');
class CommandGenerator extends Generator {
    constructor(args, options) {
        super(args, options);
        this.options = options;
    }
    get _path() {
        return this.options.name.split(':').join('/');
    }
    get _ts() {
        return this.pjson.devDependencies.typescript;
    }
    get _ext() {
        return this._ts ? 'ts' : 'js';
    }
    get _mocha() {
        return this.pjson.devDependencies.mocha;
    }
    async prompting() {
        this.pjson = this.fs.readJSON('package.json');
        if (!this.pjson)
            throw new Error('not in a project directory');
        this.pjson.oclif = this.pjson.oclif || {};
        this.log(yosay(`Adding a command to ${this.pjson.name} Version: ${version}`));
    }
    writing() {
        this.sourceRoot(path.join(__dirname, '../../templates'));
        let bin = this.pjson.oclif.bin || this.pjson.oclif.dirname || this.pjson.name;
        if (bin.includes('/'))
            bin = bin.split('/').pop();
        const cmd = `${bin} ${this.options.name}`;
        const commandPath = this.destinationPath(`src/commands/${this._path}.${this._ext}`);
        const opts = Object.assign(Object.assign({}, this.options), { bin, cmd, _, type: 'command', path: commandPath });
        this.fs.copyTpl(this.templatePath(`src/command.${this._ext}.ejs`), commandPath, opts);
        // this.fs.copyTpl(this.templatePath(`plugin/src/hooks/init.${this._ext}`), this.destinationPath(`src/hooks/init.${this._ext}`), this)
        if (this._mocha) {
            // this.fs.copyTpl(this.templatePath(`plugin/test/hooks/init.test.${this._ext}`), this.destinationPath(`test/hooks/init.test.${this._ext}`), this)
            this.fs.copyTpl(this.templatePath(`test/command.test.${this._ext}.ejs`), this.destinationPath(`test/commands/${this._path}.test.${this._ext}`), opts);
        }
        // this.fs.writeJSON(this.destinationPath('./package.json'), this.pjson)
    }
    end() {
        this.spawnCommandSync(path.join('.', 'node_modules/.bin/oclif-dev'), ['readme']);
    }
}
module.exports = CommandGenerator;
