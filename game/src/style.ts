import fs from "../../core/src/fs/fs";
import { getCSS } from "../../core/src/utils/utils";
import App from "./App";

function apply(obj: any): void {
  for(const key in obj) {
    const value = obj[key];

    if(typeof value == "string") {
      if(value == '@main-color') obj[key] = `#d03a41`;
      else if(value == '@main-text-color') obj[key] = `#e1dcdc`;
      else if(value == '@black-text-color') obj[key] = `#121212`;
    } else if(typeof value == "object" && value !== null) {
      apply(value);
    }
  }
}

async function readCSS(path: string){
  const obj = JSON.parse(await fs.readFile(path));
  obj[`#${App.element.id}`] = obj[`&`];
  delete obj[`&`];

  apply(obj);

  return obj;
}

export default async function(path: string): Promise<HTMLStyleElement>{
  const mainCSS = await readCSS(path);

  const style = document.createElement('style');
  style.innerHTML = getCSS(mainCSS);
  return style;
}
