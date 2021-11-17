import {Interfaces, HelpBase} from '@oclif/core'

interface MaybeCompatibleHelp extends HelpBase {
  formatCommand?: (command: Interfaces.Command) => string;
  command?: (command: Interfaces.Command) => string;
}

class IncompatibleHelpError extends Error {
  message = 'Please implement `formatCommand` in your custom help class.\nSee https://oclif.io/docs/help_classes for more.'
}

export class HelpCompatibilityWrapper {
  inner: MaybeCompatibleHelp

  constructor(inner: MaybeCompatibleHelp) {
    this.inner = inner
  }

  formatCommand(command: Interfaces.Command): string {
    if (this.inner.formatCommand) {
      return this.inner.formatCommand(command)
    }

    if (this.inner.command) {
      return command.description + '\n\n' + this.inner.command(command)
    }

    throw new IncompatibleHelpError()
  }
}
