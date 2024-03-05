// eslint-disable-next-line node/no-extraneous-import
import {Command, HelpBase} from '@oclif/core'

export default class CustomHelp extends HelpBase {
  async showCommandHelp(command: Command.Class): Promise<void> {
    console.log(`Custom help for ${command.id}`)
  }

  async showHelp(): Promise<void> {
    console.log('TODO: showHelp')
  }
}
