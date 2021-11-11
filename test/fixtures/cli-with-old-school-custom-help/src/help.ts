import {Interfaces, HelpBase} from '@oclif/core'

export default class CustomHelp extends HelpBase {
  async showHelp() {
    console.log('TODO: showHelp')
  }

  async showCommandHelp(command: Interfaces.Command) {
    console.log(`Custom help for ${command.id}`)
  }

  command(command: Interfaces.Command) {
    return `Custom help for ${command.id}`
  }
}
