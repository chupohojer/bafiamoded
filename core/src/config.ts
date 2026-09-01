import { uriServer } from './Constants'
import { createScript } from './utils/utils'

export type Config = {
  path: string
  version: number
  auth: {
    email?: string
    password?: string
    token?: string
    userId?: string
  }|null
  debug: boolean
  uriServer: string
  userAgent: string|null
}

let defaultConfig: Config = {
  path: '',
  version: 1,
  auth: null,
  debug: false,
  uriServer,
  userAgent: null
}
let config = defaultConfig;

export async function initConfig(): Promise<Config>{
  try{
    await createScript({src: './config.js'});
    // @ts-ignore
    if(window['config']) config = window['config'];
    // @ts-ignore
    delete window['config'];
    return config;
  } catch{}
  console.log('[config]', `can't read, using default config`);
  return config; // default
}

function get(key: keyof Config): any {
  return config[key] == undefined ? defaultConfig[key] : config[key];
}

export default function(replaceConfig?: Config): Config {
  if(replaceConfig)
    config = replaceConfig;
  return {
    path: get('path'),
    version: get('version'),
    auth: get('auth'),
    debug: get('debug'),
    uriServer: get('uriServer'),
    userAgent: get('userAgent')
  }
};
