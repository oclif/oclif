import {Command, HelpBase} from '@oclif/core'

export default class CustomHelp extends HelpBase {
  command(command: Command.Class): string {
    return `Custom help for ${command.id}`
  }

  async showCommandHelp(command: Command.Class): Promise<void> {
    console.log(`Custom help for ${command.id}`)
  }

  async showHelp(): Promise<void> {
    console.log('TODO: showHelp')
  }
}
