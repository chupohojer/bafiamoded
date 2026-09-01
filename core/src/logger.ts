export type LogLevel = "DEBUG" | "INFO" | "WARN" | "ERROR";

export interface LogEntry {
  time: string;
  level: LogLevel;
  name: string;
  message: string;
}

export const logReport: string[] = [];

let currentLevel: LogLevel = "DEBUG";

export function setLogLevel(level: LogLevel) {
  currentLevel = level;
}

const levelPriority: Record<LogLevel, number> = {
  DEBUG: 0,
  INFO: 1,
  WARN: 2,
  ERROR: 3,
};

function currentLevelPriority() {
  return levelPriority[currentLevel];
}

const entries: LogEntry[] = [];
let cachedWidth = 8;

function pad(n: number) {
  return n.toString().padStart(2, "0");
}

function time() {
  const d = new Date();
  return `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
}

function formatErrorLike(arg: any): string {
  if(arg === null) return "null";
  if(arg === undefined) return "undefined";

  if(arg instanceof Error) {
    return arg.stack || arg.message;
  }

  if(typeof Event !== "undefined" && arg instanceof Event) {
    return `[Event ${arg.type}]`;
  }

  return null as any;
}

function formatArg(arg: any): string {
  const err = formatErrorLike(arg);
  if(err !== null) return err;

  if(typeof arg === "string") return arg;
  if(typeof arg === "number" || typeof arg === "boolean") return String(arg);

  if(arg instanceof Date) return arg.toISOString();

  const ws = (globalThis as any).WebSocket;
  if(ws && arg instanceof ws) {
    return `[WebSocket ${arg.url} state=${arg.readyState}]`;
  }

  if(typeof arg === "object") {
    try {
      return JSON.stringify(arg);
    } catch {
      return Object.prototype.toString.call(arg);
    }
  }

  return String(arg);
}

function formatMessage(args: any[]): string {
  if(args.length === 1) {
    const single = formatErrorLike(args[0]);
    if(single !== null) return single;
  }

  return args.map(formatArg).join(" ");
}

function recalcLayout() {
  let max = 0;
  for(const e of entries) {
    if(e.name.length > max) max = e.name.length;
  }
  cachedWidth = Math.max(max, 8);
}

function formatAligned(e: LogEntry) {
  const name = e.name.padEnd(cachedWidth, " ");
  return `${e.time}  ${e.level.padEnd(5, " ")}  ${name}  ${e.message}`;
}

function push(level: LogLevel, name: string, args: any[]) {
  if(levelPriority[level] < currentLevelPriority()) return;

  const message = formatMessage(args);

  const entry: LogEntry = {
    time: time(),
    level,
    name,
    message,
  };

  entries.push(entry);
  recalcLayout();

  const line = formatAligned(entry);
  logReport.push(line);

  renderConsole(entry);
}

function renderConsole(entry: LogEntry) {
  const name = entry.name.padEnd(cachedWidth, " ");
  const level = entry.level.padEnd(5, " ");

  console.log(
    `%c${entry.time}  %c${level}  %c${name}%c ${entry.message}`,
    "color:#666",
    colors[entry.level],
    "color:#aaa",
    "color:inherit"
  );
}

const colors = {
  DEBUG: "color:#888",
  INFO: "color:#2b7cff",
  WARN: "color:#ffb020",
  ERROR: "color:#ff3b3b;font-weight:bold",
};

export class Logger {
  constructor(private name: string) {}

  debug(...args: any[]) {
    push("DEBUG", this.name, args);
  }
  info(...args: any[]) {
    push("INFO", this.name, args);
  }
  warn(...args: any[]) {
    push("WARN", this.name, args);
  }
  error(...args: any[]) {
    push("ERROR", this.name, args);
  }

  sub(name: string) {
    return new Logger(name);
  }
}

export const rootLogger = new Logger("Bafia");

export function getLogs() {
  recalcLayout();
  return entries.map(formatAligned);
}

type BrowserErrorKind = "JS" | "PROMISE";


function pushSystemError(kind: BrowserErrorKind, data: any) {
  let message = "";

  if(kind === "JS") {
    message = formatMessage([
      data.message,
      data.source ? `${data.source}:${data.lineno}:${data.colno}` : "",
      data.stack,
    ].filter(Boolean));
  }

  if(kind === "PROMISE") {
    message = formatMessage([data]);
  }

  const entry: LogEntry = {
    time: time(),
    level: "ERROR",
    name: kind === "JS" ? "Browser" : "Promise",
    message,
  };

  entries.push(entry);
  recalcLayout();

  const line = formatAligned(entry);
  logReport.push(line);

  renderConsole(entry);
}

export function installBrowserErrorHooks() {
  window.onerror = (message, source, lineno, colno, error) => {
    pushSystemError("JS", {
      message,
      source,
      lineno,
      colno,
      stack: error?.stack,
    });
    return false;
  };

  window.onunhandledrejection = (event: PromiseRejectionEvent) => {
    pushSystemError("PROMISE", event.reason);
  };
}