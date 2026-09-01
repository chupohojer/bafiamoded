import App from './App';
import config, { Config } from '../../core/src/config';
import IWindow from '../../core/src/IWindow'
import fs from '../../core/src/fs/fs';
import { installBrowserErrorHooks } from '../../core/src/logger';

installBrowserErrorHooks();

// @ts-ignore
window.main = async function(conf: Config, win: IWindow, element: HTMLElement) {
  App.config = config(conf);
  App.win = win;
  App.element = element;
  await fs.init('Indexeddb');
  await App.init();
}
