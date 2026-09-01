import Command from "./Command";

class CommandManager {
  commands = new Set<Command>();
  
  register(command: Command){
    this.commands.add(command);
  }
  unregister(command: Command){
    return this.commands.delete(command);
  }

  executeCommand(input: string){
    input = input.substring(input.startsWith('/') ? 1 : 0);
    const args = input.split(' ');
    if(this.hasCommand(args[0])) {
      this.run(input);
      return true;
    } else {
      return false;
    }
  }

  hasCommand(name: string): boolean{
    for(const cmd of this.commands){
      if(cmd.aliases.includes(name)) return true;
    }
    return false;
  }
  getCommand(name: string): Command|null{
    for(const cmd of this.commands){
      if(cmd.aliases.includes(name)) return cmd;
    }
    return null;
  }

  run(input: string): any{
    input = input.substring(input.startsWith('/') ? 1 : 0);
    const args = input.split(' ');
    return this.getCommand(args[0])?.run(args.slice(1));
  }

  async runAsync(input: string): Promise<any> {
    input = input.substring(input.startsWith('/') ? 1 : 0);
    const args = input.split(' ');
    for(const cmd of this.commands){
      if(cmd.aliases.includes(args[0])){
        return await cmd.run(args.slice(1));
      }
    }
  }
}

export default new CommandManager();