import AppCommand from '../app_command'

export default class extends AppCommand {
  static description = 'generate a new multi-command CLI'
  type = 'multi'
}
