import * as Generator from 'yeoman-generator'

export interface GeneratorOptions extends Generator.GeneratorOptions {
  name: string;
  defaults?: boolean;
  force?: boolean;
}
