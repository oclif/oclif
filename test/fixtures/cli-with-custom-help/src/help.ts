import {Help} from '@oclif/plugin-help'
import {Interfaces} from '@oclif/core'

export default class CustomHelp extends Help {
  formatCommand(command: Interfaces.Command) {
    return `Custom help for ${command.id}`
  }
}
