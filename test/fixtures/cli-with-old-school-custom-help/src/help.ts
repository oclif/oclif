import {HelpBase, Interfaces} from '@oclif/core'

export default class CustomHelp extends HelpBase {
  showHelp() {
    console.log('TODO: showHelp')
    return Promise.resolve()
  }

  showCommandHelp(command: Interfaces.Command) {
    console.log(`Custom help for ${command.id}`)
    return Promise.resolve()
  }

  command(command: Interfaces.Command) {
    return Promise.resolve(`Custom help for ${command.id}`)
  }
}
