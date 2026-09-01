import * as esbuild from 'esbuild';
import http from 'http';
import fs from 'fs';
import path from 'path';

const RUNDIR = './run';
const OUTDIR = './run/bin';
const PORT   = 8080;

const clients = new Set();

let ready = false;

const ctx = await esbuild.context({
  bundle:   true,
  platform: 'browser',
  format:   'iife',
  alias: {},
  external: ['ws', 'crypto', 'fs', 'path'],
  entryPoints: {
    'image': 'game/src/index.ts',
    'index': 'launcher/src/index.ts'
  },
  outdir: OUTDIR,
  plugins: [
    {
      name: 'live-reload',
      setup(build) {
        build.onEnd(() => {
          if(!ready) { ready = true; return };
          console.log('[dev] rebuilt, reloading...');
          for(const res of clients) res.write('event: reload\ndata: reload\n\n');
        })
      }
    }
  ]
})

await ctx.watch();

const MIME = {
  '.html': 'text/html',
  '.js':   'application/javascript',
  '.css':  'text/css',
  '.png':  'image/png',
  '.ico':  'image/x-icon',
}

http.createServer((req, res) => {
  const reqUrl = new URL(req.url, `http://${req.headers.host}`).pathname;

  if(reqUrl === '/__reload') {
    res.writeHead(200, {
      'Content-Type':  'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection':    'keep-alive'
    })
    res.write('data: connected\n\n')
    clients.add(res)
    req.on('close', () => clients.delete(res))
    return
  }

  let filePath = path.join(RUNDIR, reqUrl === '/' ? 'index.html' : reqUrl);
  
  if(!fs.existsSync(filePath)) {
    res.writeHead(404);
    res.end();
    return;
  }

  const ext  = path.extname(filePath)
  const mime = MIME[ext] ?? 'application/octet-stream'

  fs.readFile(filePath, (err, data) => {
    if(err) {
      res.writeHead(404);
      res.end();
      return;
    }
    res.writeHead(200, {
      'Content-Type': mime,
    })
    res.end(data)
  })
}).listen(PORT, '0.0.0.0', () => {
  console.log(`[dev] http://localhost:${PORT}`);
})