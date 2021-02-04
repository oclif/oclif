"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const command_1 = require("@oclif/command");
const yeoman_environment_1 = require("yeoman-environment");
class CommandBase extends command_1.default {
    async generate(type, generatorOptions = {}) {
        const env = yeoman_environment_1.createEnv();
        env.register(require.resolve(`./generators/${type}`), `oclif:${type}`);
        await new Promise((resolve, reject) => {
            env.run(`oclif:${type}`, generatorOptions, ((err, results) => {
                if (err)
                    reject(err);
                else
                    resolve(results);
            }));
        });
    }
}
exports.default = CommandBase;
