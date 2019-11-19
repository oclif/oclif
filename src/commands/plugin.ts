import AppCommand from '../app-command'

export default class extends AppCommand {
  static description = 'create a new CLI plugin'

  type = 'plugin'
}
