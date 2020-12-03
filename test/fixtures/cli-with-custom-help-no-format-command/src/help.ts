import {HelpBase} from '@oclif/plugin-help'
import {Command} from '@oclif/config'

export default class CustomHelp extends HelpBase {
  showHelp() {
    console.log('TODO: showHelp')
  }

  showCommandHelp(command: Command) {
    console.log(`Custom help for ${command.id}`)
  }
}
