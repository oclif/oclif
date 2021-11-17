import {Interfaces, HelpBase} from '@oclif/core'

export default class CustomHelp extends HelpBase {
  async showHelp(): Promise<void> {
    console.log('TODO: showHelp')
  }

  async showCommandHelp(command: Interfaces.Command): Promise<void> {
    console.log(`Custom help for ${command.id}`)
  }

  command(command: Interfaces.Command): string {
    return `Custom help for ${command.id}`
  }
}
