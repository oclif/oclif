import * as Generator from 'yeoman-generator'

export interface GeneratorOptions extends Generator.GeneratorOptions {
  defaults?: boolean
  force?: boolean
  name: string
}
