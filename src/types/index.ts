import * as Generator from 'yeoman-generator'

export interface PackageJson {
  name: string;
  devDependencies: Record<string, string>;
  dependencies: Record<string, string>;
  oclif: {
    bin: string;
    dirname: string;
    hooks: Record<string, string | string[]>;
  };
}

export interface GeneratorOptions extends Generator.GeneratorOptions {
  name: string;
  defaults?: boolean;
  force?: boolean;
}
