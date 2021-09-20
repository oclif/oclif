import CommandBase from './../command-base'

export default class Generate extends CommandBase {
  static description = 'generate a new single-command CLI'

  static flags = {
  }

  static args = [
    {name: 'name', required: true, description: 'directory name of new project'},
  ]

  async run() {
    const {args} = this.parse(Generate)

    await super.generate('cli', {
      name: args.name,
      force: true,
    })
  }
}
