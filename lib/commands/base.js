"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const app_command_1 = require("../app-command");
class default_1 extends app_command_1.default {
    constructor() {
        super(...arguments);
        this.type = 'base';
    }
}
exports.default = default_1;
default_1.hidden = true;
