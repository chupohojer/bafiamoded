import { getTexture } from "../../../game/src/utils/Resources";

export function insertAtCaret(element: HTMLInputElement, text: string) {
  // @ts-ignore
  if(document.selection) {
    element.focus();
    // @ts-ignore
    const sel = document.selection.createRange();
    sel.text = text;
    element.focus();
  } else if(element.selectionStart || element.selectionStart === 0) {
    const startPos = element.selectionStart;
    const endPos = element.selectionEnd;
    const scrollTop = element.scrollTop;
    // @ts-ignore
    element.value = element.value.substring(0, startPos) + text + element.value.substring(endPos, element.value.length);
    element.focus();
    element.selectionStart = startPos + text.length;
    element.selectionEnd = startPos + text.length;
    element.scrollTop = scrollTop;
  } else {
    element.value += text;
    element.focus();
  }
}

// export function processEmojis(element: HTMLElement, text: string, size = 20) {
//   element.innerHTML = '';
  
//   const parts = text.split(/(:sm[1-6]:)/g);
  
//   for(const part of parts) {
//     if(part.match(/:sm[1-6]:/)) {
//       const emojiName = part.slice(1, -1);
//       const img = document.createElement('img');
//       img.width = img.height = size;
//       img.style.pointerEvents = 'none';
//       img.style.verticalAlign = 'middle';
//       getTexture(`emoji/${emojiName}.png`).then(src => img.src = src);
//       element.appendChild(img);
//     } else if(part) {
//       element.appendChild(document.createTextNode(part));
//     }
//   }
// }
export function processEmojis(element: HTMLElement, html: string, size = 20) {
  element.innerHTML = '';
  
  const temp = document.createElement('div');
  temp.innerHTML = html;
  
  function processNode(node: Node) {
    if(node.nodeType == Node.TEXT_NODE) {
      const text = node.textContent || '';
      const parts = text.split(/(:sm[1-6]:)/g);
      
      for(const part of parts) {
        if(part.match(/:sm[1-6]:/)) {
          const emojiName = part.slice(1, -1);
          const img = document.createElement('img');
          img.width = img.height = size;
          img.style.verticalAlign = 'middle';
          img.style.margin = '0 2px';
          getTexture(`emoji/${emojiName}.png`).then(src => img.src = src);
          element.appendChild(img);
        } else if(part) {
          element.appendChild(document.createTextNode(part));
        }
      }
    } else if(node.nodeType == Node.ELEMENT_NODE) {
      const el = document.createElement(node.nodeName);
      for(const attr of (node as Element).attributes) {
        el.setAttribute(attr.name, attr.value);
      }
      
      const tempElement = document.createElement('div');
      
      Array.from(node.childNodes).forEach(child => {
        const savedElement = element;
        element = tempElement;
        processNode(child);
        element = savedElement;
      });
      
      el.innerHTML = tempElement.innerHTML;
      element.appendChild(el);
    }
  }
  
  Array.from(temp.childNodes).forEach(processNode);
}

export function createElement<K extends keyof HTMLElementTagNameMap>(tagName: K, options: {
  className?: string
  id?: string
  text?: string
  html?: string
  hide?: boolean
  type?: string
  checked?: boolean
  value?: string
  placeholder?: string
  width?: number
  height?: number
  src?: string
  appendTo?: HTMLElement
  css?: CSSStyleDeclaration|object
  attr?: ([string, string])[]
}, callback: (elem: HTMLElementTagNameMap[K]) => void = () => {}): HTMLElementTagNameMap[K] {
  const elem = document.createElement(tagName);
  if(options.className) elem.className = options.className;
  if(options.id) elem.id = options.id;
  if(options.text) elem.textContent = options.text;
  if(options.html) elem.innerHTML = options.html;
  if(options.hide) elem.style.display = 'none';
  if(options.type) (elem as HTMLInputElement).type = options.type;
  if(options.checked) (elem as HTMLInputElement).checked = options.checked;
  if(options.value) (elem as HTMLInputElement).value = options.value;
  if(options.placeholder) (elem as HTMLInputElement).placeholder = options.placeholder;
  if(options.width) (elem as HTMLImageElement).width = options.width;
  if(options.height) (elem as HTMLImageElement).height = options.height;
  if(options.src) (elem as HTMLImageElement).src = options.src;
  if(options.css){
    for(const key in options.css){
      // @ts-ignore
      elem.style[key] = options.css[key];
    }
  }
  if(options.attr){
    for(const e of options.attr){
      elem.setAttribute(e[0], e[1]);
    }
  }

  callback(elem);

  if(options.appendTo) options.appendTo.appendChild(elem);

  return elem;
}
