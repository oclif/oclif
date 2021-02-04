import * as Generator from 'yeoman-generator';
import { Options } from '../commands/command';
declare class CommandGenerator extends Generator {
    options: Options;
    pjson: any;
    get _path(): string;
    get _ts(): any;
    get _ext(): "ts" | "js";
    get _mocha(): any;
    constructor(args: any, options: Options);
    prompting(): Promise<void>;
    writing(): void;
    end(): void;
}
export = CommandGenerator;
