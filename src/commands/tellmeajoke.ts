  
import {Command, flags} from '@oclif/command'
import axios from "axios"

export default class Tellmeajoke extends Command {
  static description = 'describe the command here'

  static flags = {
    help: flags.help({char: 'h'}),
  }

  async run() {
    const {args, flags} = this.parse(Tellmeajoke)

      let res = await axios.get(
          `https://geek-jokes.sameerkumar.website/api?format=json`
          );

    this.log(res.data.joke)
  }
}