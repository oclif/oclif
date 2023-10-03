// eslint-disable-next-line node/no-extraneous-import
import {HelpBase, Command} from '@oclif/core'

export default class CustomHelp extends HelpBase {
  async showHelp(): Promise<void> {
    console.log('TODO: showHelp')
  }

  async showCommandHelp(command: Command.Class): Promise<void> {
    console.log(`Custom help for ${command.id}`)
  }

  command(command: Command.Class): string {
    return `Custom help for ${command.id}`
  }
}
