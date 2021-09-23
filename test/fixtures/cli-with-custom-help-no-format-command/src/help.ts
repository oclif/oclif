import {HelpBase, Interfaces} from '@oclif/core'

export default class CustomHelp extends HelpBase {
  showHelp() {
    console.log('TODO: showHelp')
  }

  showCommandHelp(command: Interfaces.Command) {
    console.log(`Custom help for ${command.id}`)
  }
}
