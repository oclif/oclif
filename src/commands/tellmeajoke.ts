import {Command,flags} from '@oclif/command'


export default abstract class tellmejoke extends Command {
  static description = 'i will tell you a joke'

   static flags = {
    help: flags.help({char: 'h'}),
  }

  async run() {
    const {args,flags} = this.parse(tellmejoke)
    var joke =fetch('https://geek-jokes.sameerkumar.website/api');
    this.log(joke)
}
