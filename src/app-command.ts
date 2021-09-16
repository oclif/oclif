
import Base from './command-base'

export default abstract class AppCommand extends Base {
  static flags = {
  }

  static args = [
    {name: 'name', required: true, description: 'directory name of new project'},
  ]

  abstract type: string

  async run() {
    const {args} = await this.parse(AppCommand)

    await super.generate('app', {
      name: args.name,
      force: true,
    })
  }
}
