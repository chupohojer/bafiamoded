import { getLogs } from "../../core/src/logger";
import App from "./App";

export function getId32(input: string): string {
  let hash = 0x811c9dc5;

  for(let i = 0; i < input.length; i++) {
    hash ^= input.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }

  return (hash >>> 0).toString(16).padStart(8, '0');
}

export function getId64(input: string): string {
  let h1 = 0x811c9dc5;
  let h2 = 0x811c9dc5;

  for(let i = 0; i < input.length; i++) {
    const c = input.charCodeAt(i);

    h1 ^= c;
    h1 = Math.imul(h1, 0x01000193);

    h2 = Math.imul((h2 ^ c) + 0x9e3779b9, 0x85ebca6b);
  }

  return (
    (h1 >>> 0).toString(16).padStart(8, '0') +
    (h2 >>> 0).toString(16).padStart(8, '0')
  );
}

function escapeHTML(str: string): string {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

function cleanStack(stack: string): string {
  const lines = stack.split('\n');

  const filtered = lines.filter(line => {
    return !line.includes('normalizeError')
      && !line.includes('Panic.start');
      // && !line.includes('App.panic');
  });

  return filtered.join('\n');
}
function normalizeError(error: any): { message: string; stack: string } {
  if(error instanceof Error) {
    return {
      message: error.message,
      stack: cleanStack(error.stack || error.message)
    };
  }

  if(typeof error == 'string') {
    const err = new Error(error);
    return {
      message: error,
      stack: cleanStack(err.stack || error)
    };
  }

  try {
    const err = new Error(JSON.stringify(error));
    return {
      message: JSON.stringify(error),
      stack: cleanStack(err.stack || String(error))
    };
  } catch {
    return {
      message: String(error),
      stack: String(error)
    };
  }
}

export class Panic {
  crashed = false;

  data!: {
    screenName: string
  }
  customData: any = {};

  description = '';

  #init(){
    this.data = {
      screenName: App.screen?.name ?? 'Unknown'
    }

    App.server.destroy();
    // App.destroy();
  }

  start(error: any|Error, data?: any) {
    if(this.crashed) return;
    this.crashed = true;
    this.customData = data;

    this.#init();

    this.#showCrash(normalizeError(error)).catch(async() => alert(await this.getMessage(error)));

    throw error;
  }

  async getMessage(error: { message: string; stack: string }){
    const id = getId64(error.stack);

    this.description = this.#getDescription(error);
    
    const message = escapeHTML(`
      Скопируйте весь и отправьте
      -------------------------

Время: ${new Date().toUTCString()}
Описание: ${this.description}



${error.stack}



-- Детали --
ID report: ${id}
Version: ${App.version}
Screen: ${window.innerWidth}x${window.innerHeight}
DPR: ${window.devicePixelRatio}
Current Screen: ${this.data.screenName}
Location: ${window.location.href}

-- Logs --
${getLogs().join('\n')}

`);

    return message;
  }

  async #showCrash(error: { message: string; stack: string }) {
    const message = await this.getMessage(error);

    // App.element.style.margin = '0';
    App.element.innerHTML = `
      <div style="
        display:flex;
        flex-direction:column;
        justify-content:center;
        align-items:center;
        background:#262E40;
        color:#fff;
        font-family:monospace;
        padding:20px 0;
        height:100vh;
        overflow:auto;
        user-select:none;
        -webkit-user-select:none;
      ">
        <div style="text-align:center">Упс.. Бафия крашнулась</div>
        <div style="text-align:center">Отправьте это разработчику Бафии</div>
        <a style="text-align:center;color:lightblue" href="https://t.me/bafiaonlinebot">t.me/bafiaonlinebot</a>
        <br/>
        <textarea id="paniclog" readonly style="width:80%;height:100%">${message}</textarea>
      </div>
    `;

    const el = document.getElementById('paniclog') as HTMLTextAreaElement;
    if(!el) return;
    let copied = false;
    el.onclick = async() => {
      if(copied) return;
      copied = true;
      el.select();
      el.setSelectionRange(0, 99999); 

      if(navigator.clipboard && navigator.clipboard.writeText) {
        try {
          await navigator.clipboard.writeText(el.value);
        } catch {
          try {
            document.execCommand('copy');
          } catch {}
        }
      }
    }
  }

  #getDescription(error: { message: string; stack: string }){
    if(typeof this.customData == 'object' && typeof this.customData.description == 'string')
      return this.customData.description;

    else if(typeof this.customData == 'string')
      return this.customData;

    if(error.message.includes('WebSocket'))
      return 'Server Error';

    return 'Неизвестное';
  }
}

export default new Panic();