import Window from '../Window';
import { createElement } from '../../../core/src/utils/DOM'

export function Alert(window: Window) {
    let buttons: string[] = [];
    let result: string|undefined = undefined;
    let width = 225;
    let height = 150;

    const obj: { title: string, message: string, icon: string, addButton: (text: string) => void, runModal: () => Promise<string|undefined> } = {
        title: '',
        message: '',
        icon: '',
        addButton(text: string){
            buttons.push(text);
        },
        async runModal(){
            window.lock();
            const x = (window.x + (window.width - width) / 2);
            const y = (window.y + (window.height - height) / 2);
            const win = new Window({ width, height, show: false, roundRadius: 0.75, hasTitleBar: false, moveable: false, resizable: false, x, y, css: {
                boxShadow: "0 0 20px 10px rgba(0, 0, 0, 0.2)"
            }, animations: {
                open: "0.3s cubic-bezier(0.11, 0.05, 0.22, 0.81) open",
                close: "0.2s cubic-bezier(0.11, 0.05, 0.22, 0.81) close",
            }});
            // @ts-ignore тайпскрипт дебил, можно превратить void в boolean используя !!
            // win.onClose(() => !!window.unlock());

            const title = createElement('div', { text: this.title, css: {
                display: 'block',
                width: '100%',
                textAlign: 'center',
                fontWeight: 'bold',
                color: 'white',
                margin: '15px'
            }});
            win.content.appendChild(title);

            const message = createElement('label', { text: this.message, css: {
                display: 'block',
                width: ['-webkit-fill-available', '-moz-available', 'fill-available'],
                textAlign: 'center',
                fontSize: '13px',
                color: 'white',
                margin: '15px'
            }});
            win.content.appendChild(message);

            const div = createElement('div', { css: {
                display: 'flex',
                flexWrap: 'nowrap',
                margin: '10px',
                bottom: '10px',
                position: 'absolute',
                width: ['-webkit-fill-available', '-moz-available', 'fill-available'],
            }});
            win.content.appendChild(div);

            for(let i of buttons){
                const btn = createElement('button', { text: i, css: { width: '100%', marginLeft: '3px', marginRight: '3px', height: '25px' }});
                btn.onclick = () => {
                    result = i;
                    win.close();
                    window.unlock();
                }
                div.appendChild(btn);
            }

            win.show();
            await win.wait('close');
    
            return result;
        }
    }

    return obj;
}