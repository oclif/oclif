import {Command} from '@oclif/core'

export default class Hello extends Command {
  static aliases = ['hi']
  static description = 'a simple command'
  static flags = {}

  async run(): Promise<void> {
    this.log('hello world')
  }
}
