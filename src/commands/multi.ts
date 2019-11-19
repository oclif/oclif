import AppCommand from '../app-command'

export default class extends AppCommand {
  static description = 'generate a new multi-command CLI'

  type = 'multi'
}
