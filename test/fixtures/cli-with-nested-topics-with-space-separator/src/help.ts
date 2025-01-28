import {Help, Interfaces} from '@oclif/core'

export default class CustomHelp extends Help {
  formatCommand(command: Interfaces.Command): string {
    return `Custom help for ${command.id}`
  }
}
