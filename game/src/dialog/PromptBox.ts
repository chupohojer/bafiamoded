import Box from "./Box";

export default async function(message: string, options: { btnText?: string, placeholder?: string, title?: string, height?: number, canCloseAnywhere?: boolean } = {}){
  const box = new Box({ title: options.title, height: options.height ?? 175, canCloseAnywhere: options.canCloseAnywhere });

  const messageElem = document.createElement('div');
  messageElem.innerHTML = message.replaceAll(`\n`,'<br/>');
  messageElem.style.color = 'black';
  messageElem.style.textAlign = 'center';
  messageElem.style.padding = '15px 5px';
  box.content.appendChild(messageElem);

  const footer = document.createElement('div');
  footer.style.width = '100%';
  footer.style.position = 'absolute';
  footer.style.bottom = '15px';
  footer.style.display = 'flex';
  footer.style.justifyContent = 'column';
  footer.style.flexDirection = 'column';
  footer.style.alignItems = 'center';
  footer.style.left = '0';
  box.content.appendChild(footer);

  const input = document.createElement('input');
  input.style.width = '80%';
  input.style.marginBottom = '10px';
  input.placeholder = options.placeholder ?? '';
  footer.appendChild(input);

  const btnOk = document.createElement('button');
  btnOk.textContent = options.btnText ?? 'OK';
  btnOk.style.width = '80%';
  btnOk.addEventListener('click', () => box.close());
  footer.appendChild(btnOk);

  input.focus();

  await box.wait('destroy');
  return input.value;
}
