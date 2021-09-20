
import Base from './command-base'

export default abstract class AppCommand extends Base {
  static flags = {
  }

  static args = [
    {name: 'name', required: true, description: 'directory name of new project'},
  ]

  async run() {
    const {args} = this.parse(AppCommand)

    await super.generate('app', {
      name: args.name,
      force: true,
    })
  }
}
