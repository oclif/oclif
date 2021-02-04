import * as Generator from 'yeoman-generator';
declare class App extends Generator {
    options: {
        defaults?: boolean;
        mocha: boolean;
        circleci: boolean;
        appveyor: boolean;
        codecov: boolean;
        typescript: boolean;
        eslint: boolean;
        yarn: boolean;
        travisci: boolean;
    };
    args: {
        [k: string]: string;
    };
    type: 'single' | 'multi' | 'plugin' | 'base';
    path: string;
    pjson: any;
    githubUser: string | undefined;
    answers: {
        name: string;
        bin: string;
        description: string;
        version: string;
        github: {
            repo: string;
            user: string;
        };
        author: string;
        files: string;
        license: string;
        pkg: string;
        typescript: boolean;
        eslint: boolean;
        mocha: boolean;
        ci: {
            circleci: boolean;
            appveyor: boolean;
            codecov: boolean;
            travisci: boolean;
        };
    };
    mocha: boolean;
    circleci: boolean;
    appveyor: boolean;
    codecov: boolean;
    ts: boolean;
    eslint: boolean;
    yarn: boolean;
    travisci: boolean;
    get _ext(): "ts" | "js";
    get _bin(): any;
    repository?: string;
    constructor(args: any, opts: any);
    prompting(): Promise<void>;
    writing(): void;
    install(): Promise<void>;
    end(): void;
    private _gitignore;
    private _eslintignore;
    private _writeBase;
    private _writePlugin;
    private _writeSingle;
    private _writeMulti;
}
export = App;
