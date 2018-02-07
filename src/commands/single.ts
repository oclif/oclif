import AppCommand from '../app_command'

export default class extends AppCommand {
  static description = 'generate a new single-command CLI'
  type = 'single'
}
