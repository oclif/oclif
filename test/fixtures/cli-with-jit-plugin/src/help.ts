import {Command, Help} from '@oclif/core'

export default class CustomHelp extends Help {
  formatCommand(command: Command.Class): string {
    return `Custom help for ${command.id}`
  }
}
