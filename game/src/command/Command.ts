export default class Command {
  aliases: string[];
  callback: (args: string[]) => any = () => {};

  constructor(...aliases: string[]) {
    this.aliases = aliases;
  }

  execute(args: string[]): any {
    return this.callback(args);
  }

  addCallback(callback: (args: string[]) => any) {
    this.callback = callback;
  }

  run(args: string[]){
    return this.execute(args);
  }
}