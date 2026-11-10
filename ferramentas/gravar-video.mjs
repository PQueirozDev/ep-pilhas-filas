/*
 * gravar-video.mjs
 * ----------------
 * Grava o filme (slides/simulador.html?filme) em MP4, quadro a quadro.
 * Em vez de filmar a tela em tempo real, trocamos o relógio da página por um
 * relógio falso: a cada quadro avançamos 1/60 s, tiramos um print e mandamos
 * para o ffmpeg. O resultado sai liso mesmo num computador lento.
 *
 * Uso (dentro de ferramentas/):
 *   npm install
 *   node gravar-video.mjs            grava slides/midia/banco-ep.mp4
 *   node gravar-video.mjs --previa   só os primeiros 20 s, em previa.mp4
 * Precisa de ffmpeg no PATH e do Chrome instalado (ou CHROME=caminho).
 */
import http from 'node:http';
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { existsSync, mkdirSync } from 'node:fs';
import { readFile } from 'node:fs/promises';
import { dirname, extname, join, normalize } from 'node:path';
import { fileURLToPath } from 'node:url';
import puppeteer from 'puppeteer-core';

const FPS = 60, LARGURA = 1920, ALTURA = 1080;
const raiz = join(dirname(fileURLToPath(import.meta.url)), '..');
const pastaSite = join(raiz, 'slides');
const previa = process.argv.includes('--previa');
const saida = previa ? join(raiz, 'ferramentas', 'previa.mp4') : join(pastaSite, 'midia', 'banco-ep.mp4');
const LIMITE = (previa ? 20 : 300) * FPS;       /* trava de segurança */
const SOBRA = 90;                               /* quadros parados depois do fim */

const chrome = [process.env.CHROME,
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe',
  '/usr/bin/google-chrome', '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'
].find(c => c && existsSync(c));
if (!chrome) { console.error('Chrome não encontrado. Defina a variável CHROME.'); process.exit(1); }

/* Servidor local só para a pasta slides/ */
const TIPOS = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8' };
const servidor = http.createServer(async (req, res) => {
  const caminho = normalize(decodeURIComponent(new URL(req.url, 'http://x').pathname));
  const arquivo = join(pastaSite, caminho);
  try {
    if (!arquivo.startsWith(pastaSite)) throw new Error('fora da pasta');
    res.writeHead(200, { 'Content-Type': TIPOS[extname(arquivo)] || 'application/octet-stream' });
    res.end(await readFile(arquivo));
  } catch { res.writeHead(404); res.end(); }
});
servidor.listen(0, '127.0.0.1');
await once(servidor, 'listening');
const url = 'http://127.0.0.1:' + servidor.address().port + '/simulador.html?filme';

/* Relógio falso, instalado antes de qualquer script da página. */
function instalarRelogio() {
  let agora = 0, proximoId = 1;
  const timers = new Map();                    /* id -> { quando, fn, args, intervalo } */
  let quadros = [];                            /* callbacks de requestAnimationFrame */
  const nascimento = new WeakMap();            /* animação -> instante em que apareceu */

  Date.now = () => 1793880000000 + agora;
  performance.now = () => agora;
  window.setTimeout = (fn, ms = 0, ...args) => { timers.set(proximoId, { quando: agora + Math.max(0, ms), fn, args }); return proximoId++; };
  window.setInterval = (fn, ms = 0, ...args) => { timers.set(proximoId, { quando: agora + Math.max(1, ms), fn, args, intervalo: Math.max(1, ms) }); return proximoId++; };
  window.clearTimeout = window.clearInterval = id => { timers.delete(id); };
  window.requestAnimationFrame = fn => { quadros.push({ id: proximoId, fn }); return proximoId++; };
  window.cancelAnimationFrame = id => { quadros = quadros.filter(q => q.id !== id); };

  /* Transições e animações (CSS e element.animate) andam no relógio real do
   * navegador. Pausamos cada uma e colocamos o tempo dela à mão. */
  function sincronizarAnimacoes() {
    for (const a of document.getAnimations()) {
      if (!nascimento.has(a)) { nascimento.set(a, agora); try { a.pause(); } catch {} }
      const t = agora - nascimento.get(a);
      const fim = a.effect ? a.effect.getComputedTiming().endTime : 0;
      try { if (t >= fim) a.finish(); else a.currentTime = t; } catch { a.currentTime = t; }
    }
  }

  /* Deixa as promises pendentes continuarem (várias voltas, para cadeias de await) */
  const drenar = async () => { for (let i = 0; i < 20; i++) await null; };

  window.__avancar = async dt => {
    const alvo = agora + dt;
    for (;;) {                                   /* dispara os timers vencidos, em ordem */
      let id = null, t = null;
      for (const [i, x] of timers) if (x.quando <= alvo && (t === null || x.quando < t.quando)) { id = i; t = x; }
      if (id === null) break;
      agora = Math.max(agora, t.quando);
      if (t.intervalo) t.quando += t.intervalo; else timers.delete(id);
      try { t.fn(...t.args); } catch (e) { console.error(e); }
      await drenar();
    }
    agora = alvo;
    await drenar();
    const lote = quadros; quadros = [];
    for (const q of lote) { try { q.fn(agora); } catch (e) { console.error(e); } }
    await drenar();
    sincronizarAnimacoes();
    return window.__filmeFim === true;
  };
}

const navegador = await puppeteer.launch({
  executablePath: chrome, headless: true,
  args: ['--force-device-scale-factor=1', '--hide-scrollbars', '--font-render-hinting=none']
});
const pagina = await navegador.newPage();
await pagina.setViewport({ width: LARGURA, height: ALTURA, deviceScaleFactor: 1 });
pagina.on('pageerror', e => console.error('Erro na página:', e.message));
pagina.on('console', m => { if (m.type() === 'error') console.error('Console:', m.text()); });
await pagina.evaluateOnNewDocument(instalarRelogio);
await pagina.goto(url, { waitUntil: 'networkidle0' });
await pagina.waitForFunction('window.__filmePronto === true', { timeout: 30000 });

mkdirSync(dirname(saida), { recursive: true });
const ffmpeg = spawn('ffmpeg', ['-y', '-loglevel', 'error', '-f', 'image2pipe', '-framerate', String(FPS), '-c:v', 'png', '-i', '-',
  '-c:v', 'libx264', '-preset', 'slow', '-crf', '15', '-pix_fmt', 'yuv420p', '-movflags', '+faststart', saida],
  { stdio: ['pipe', 'inherit', 'inherit'] });

let quadro = 0, depoisDoFim = 0, codigoFfmpeg = null;
const inicio = Date.now();
const fimFfmpeg = once(ffmpeg, 'close').then(([codigo]) => { codigoFfmpeg = codigo; });
ffmpeg.stdin.on('error', () => {});             /* o erro real aparece no código de saída */
try {
  while (quadro < LIMITE && depoisDoFim < SOBRA && codigoFfmpeg === null) {
    const acabou = await pagina.evaluate(dt => window.__avancar(dt), 1000 / FPS);
    const png = await pagina.screenshot({ type: 'png', optimizeForSpeed: true });
    if (!ffmpeg.stdin.write(png)) await Promise.race([once(ffmpeg.stdin, 'drain'), fimFfmpeg]);
    if (acabou) depoisDoFim++;
    if (++quadro % 300 === 0) console.log((quadro / FPS) + ' s de vídeo gravados (' + Math.round((Date.now() - inicio) / 1000) + ' s reais)');
  }
} finally {
  ffmpeg.stdin.end();
  await fimFfmpeg;
  await navegador.close();
  servidor.close();
}
if (codigoFfmpeg !== 0) { console.error('O ffmpeg falhou (código ' + codigoFfmpeg + '). Vídeo inválido.'); process.exit(1); }
console.log((depoisDoFim >= SOBRA ? 'Filme completo: ' : 'Parou no limite: ') + (quadro / FPS).toFixed(1) + ' s em ' + saida);
