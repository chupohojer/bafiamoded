const global = window;

export function isMacOS(): boolean {
  return /Macintosh/i.test(navigator.userAgent);
}
export function getZoom(): number {
  const style = global.getComputedStyle(document.body);
  const transform = style.transform;
  const zoom = global.parseFloat(style.zoom || "1");
  if(transform && transform != "none") {
    const match = transform.match(/matrix\(([\d.]+),/);
    if(match) return global.parseFloat(match[1]);
  }
  return global.isNaN(zoom) ? 1 : zoom;
}
export function error(...message: any){
  const msg = message.join('\n');
  console.error(msg);
  return msg;
}
export function bytesToBase64(bytes: Uint8Array): string {
  let binary = '';
  bytes.forEach(byte => binary += global.String.fromCharCode(byte));
  return global.btoa(binary);
}
export function wait(timeout: number = 0) {
  return new Promise(res => setTimeout(res, timeout));
}
export function getDeep(obj: any, path: string): any {
  return path.split('.').reduce((acc, part) => acc && acc[part], obj);
}
export function gKey(obj: any) {
  let sttxt = '';
  for(let i in obj){
    let key = i.replace(/[A-Z]{1}/g, m=>'-'+m.toLowerCase());
    if(key == 'this') key = '&';
    if(typeof obj[i] == 'object') {
      if(global.Array.isArray(obj[i])){
        for(let j of obj[i]) sttxt += `${key}:${j};`;
      } else sttxt += `${key}{${gKey(obj[i])}}`;
    } else sttxt += `${key}:${obj[i]};`;
  }
  return sttxt;
}
export function getCSS(cssObject: CSSStyleDeclaration|object) {
  let sttxt = '';
  for(let sel in cssObject){
    // @ts-ignore
    let obj = cssObject[sel];
    sttxt += sel+'{'+gKey(obj)+'}';
  }
  return sttxt;
}
export async function decompress(data: Uint8Array): Promise<Uint8Array> {
  const isGzip = data[0] == 0x1F && data[1] == 0x8B;
  if(!isGzip) throw error("Data are not compressed gzip");
  try{
    // @ts-ignore
    const stream = new global.Blob([data]).stream().pipeThrough(new global.DecompressionStream("gzip"));
    return new global.Uint8Array(await new global.Response(stream).arrayBuffer());
} catch(err) {
    console.error("Decompression error:", err);
    throw error(err);
  }
}
/**
 * Вычисляет offset, необходимый для компенсации изменения позиции
 * после применения transform: scale().
 *
 * @param left - Текущий отступ слева (px).
 * @param top - Текущий отступ сверху (px).
 * @param scale - Текущий масштаб { scaleX: number, scaleY: number }.
 * @returns { offsetX: number, offsetY: number } - Корректировка позиции.
 */
export function getOffset(left: number, top: number, scale: { x: number; y: number }): { x: number; y: number } {
  if(scale.x == 1 && scale.y == 1) {
    return { x: 0, y: 0 };
  }

  return {
    x: left * (1 - scale.x),
    y: top * (1 - scale.y),
  }
}
/**
 * Вычисляет масштаб (scaleX, scaleY) для transform: scale(),
 * чтобы элемент визуально принял заданные width и height.
 *
 * @param currentWidth - Текущая ширина элемента (px).
 * @param currentHeight - Текущая высота элемента (px).
 * @param targetWidth - Желаемая ширина (px).
 * @param targetHeight - Желаемая высота (px).
 * @returns { scaleX: number, scaleY: number } - Коэффициенты масштабирования.
 */
export function getScale(currentWidth: number,currentHeight: number,targetWidth: number,targetHeight: number): { x: number; y: number } {
  if(currentWidth <= 0 || currentHeight <= 0) {
    throw error("Current width and height must be positive numbers");
  }

  return {
    x: targetWidth / currentWidth,
    y: targetHeight / currentHeight,
  };
}
export function typeOf(obj: any): string {
  return {}.toString.call(obj).split(' ')[1].slice(0, -1).toLowerCase();
}
export function createScript(options: { src?: string, type?: string, async?: boolean, defer?: boolean, html?: string, toBody?: boolean, remove?: boolean }){
  const script = document.createElement('script');
  if(!options.remove) options.remove = true;
  function func(callback: Function) {
    if(options.remove) script.remove();
    callback();
  }
  if(options.src) script.src = options.src;
  if(options.type) script.type = options.type;
  if(options.async) script.async = options.async;
  if(options.html) script.innerHTML = options.html;
  if(options.defer) script.defer = options.defer;
  if(options.toBody) document.body.appendChild(script);
  else document.head.appendChild(script);
  return new Promise((res, rej) => {
    script.onload = () => func(res);
    script.onerror = () => func(rej);
    if(options.type == "importmap") res(1);
  });
}
export function isNative(fn: Function) {
  if(fn == null) return false;
  return /\{\s*\[native code\]\s*\}/.test('' + fn);
}
export function debounce(fn: Function, delay: number) {
  let timer: number;
  return function(...args: any) {
    clearTimeout(timer);
    // @ts-ignore
    timer = setTimeout(() => {
    // @ts-ignore
        fn.apply(this, args);
    }, delay);
  }
}
export function createHiPPICanvas(width: number, height: number, options: WebGLContextAttributes = {}): HTMLCanvasElement {
  const ratio = global.devicePixelRatio;
  const canvas = document.createElement("canvas");

  canvas.width = global.Math.floor(width * ratio);
  canvas.height = global.Math.floor(height * ratio);
  canvas.style.width = width + "px";
  canvas.style.height = height + "px";

  const gl = canvas.getContext('webgl2', {
    ...options,
    failIfMajorPerformanceCaveat: true
  }) as WebGL2RenderingContext | null;

  if(!gl) throw new Error(`WebGL2 doesn't support`);

  // Настройка viewport для HiDPI
  gl.viewport(0, 0, gl.drawingBufferWidth, gl.drawingBufferHeight);

  // Дополнительные полезные настройки
  // gl.enable(gl.DEPTH_TEST);
  // gl.clearColor(0, 0, 0, 1);

  return canvas;
}
export function getVersionECMAscript(): number {
  let version = 2014;
  try {
    const Function = global.Function;
    const Object = global.Object;
    const RegExp = global.RegExp;
    const String = global.String;
    const Array = global.Array;
    const Set = global.Set;

    // ES2015 (class, includes)
    new Function("class C {}");
    if(([] as any).includes) version = 2015;

    // ES2016 (Array.includes)
    if((Array.prototype as any).includes) version = 2016;

    // ES2017 (async/await, String.padStart, String.padEnd)
    new Function("async function f(){}");
    if((String.prototype as any).padStart) version = 2017;
    if((String.prototype as any).padEnd) version = 2017;

    // ES2018 (Promise.finally)
    if((Promise.prototype as any).finally) version = 2017;

    // ES2019 (Array.flat)
    if((Array.prototype as any).flat) version = 2019;

    // ES2020 (optional chaining, nullish coalescing, logical assignment, class fields, String.matchAll)
    new Function("const x = {}; x?.a;");
    new Function("let x=1; x &&= 2;");
    new Function("class A { x = 1 }");
    if((String.prototype as any).matchAll) version = 2020;

    // ES2021 (String.replaceAll)
    if((String.prototype as any).replaceAll) version = 2021;

    // ES2022 (Array.at)
    if((Array.prototype as any).at) version = 2022;

    // ES2023 (Array.findLast)
    if((Array.prototype as any).findLast) version = 2023;

    // ES2024 (Promise.withResolvers, Object.groupBy, String.isWellFormed, RegExp /v flag)
    if(typeof (Promise as any).withResolvers == "function") version = 2024;
    if(typeof (Object as any).groupBy == "function") version = 2024;
    try { if((String.prototype as any).isWellFormed) version = 2024; } catch {}
    try { new Function("/a/v.test('a');"); version = 2024; } catch {}

    // ES2025 (Iterator helpers, Set methods, RegExp.escape, Promise.try)
    if((globalThis as any).Iterator) version = 2025;
    if(typeof (Set.prototype as any).union == "function") version = 2025;
    if(typeof (RegExp as any).escape == "function") version = 2025;
    if(typeof (Promise as any).try == "function") version = 2025;

  } catch(e) {
    console.error(e);
  }
  return version;
}
export function radiansToDegrees(radians: number) {
  return radians * (180 / global.Math.PI);
}
export function degreesToRadians(degrees: number) {
  return degrees * global.Math.PI / 180;
}
export function normalizeAngle(angle: number): number {
  if(radiansToDegrees(angle) > 180)
    return degreesToRadians(-180);
  if(radiansToDegrees(angle) < -180)
    return degreesToRadians(180);
  return angle;
}
export function randomInt(min: number, max: number): number {
  min = global.Math.ceil(min);
  max = global.Math.floor(max);
  return global.Math.floor(global.Math.random() * (max - min + 1)) + min;
}
export function getAllProps(obj: any) {
  let props = new global.Set();
  let current = obj;
  while(current) {
    global.Object.getOwnPropertyNames(current).forEach(p => props.add(p));
    current = global.Object.getPrototypeOf(current);
  }
  return [...props];
}
export function noXSS(input: string): string {
  // return String(input)
  //   .replace(/&lt;/g, "<")
  //   .replace(/&gt;/g, ">")
  //   .replace(/&amp;/g, "&")
  //   .replace(/&quot;/g, "\"")
  //   .replace(/&#39;/g, "'")
  //   .replace(/&#x2F;/gi, "/");
  const div = document.createElement('div');
  div.textContent = input;
  return div.innerHTML;
}
