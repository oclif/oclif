import {Help} from '@oclif/plugin-help'
import {Command} from '@oclif/config'

export default class CustomHelp extends Help {
  formatCommand(command: Command) {
    return `Custom help for ${command.id}`
  }
}
