/* Com o servidor local do README ativo, confere a apresentação e o simulador. */
import puppeteer from 'puppeteer-core';
import assert from 'node:assert/strict';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

const url = process.env.SITE_URL || 'http://127.0.0.1:8000';
const navegador = await puppeteer.launch({
  executablePath: process.env.CHROME || 'C:/Program Files/Google/Chrome/Application/chrome.exe',
  headless: true
});
try {
  for (const largura of [1440, 390]) {
    const pagina = await navegador.newPage();
    const erros = [];
    pagina.on('pageerror', e => erros.push(e.message));
    await pagina.setViewport({ width: largura, height: 900 });
    await pagina.emulateMediaFeatures([{ name: 'prefers-reduced-motion', value: 'reduce' }]);
    await pagina.goto(url + '/#9', { waitUntil: 'networkidle0' });
    assert.equal(await pagina.$$eval('.slide', els => els.length), 10);
    assert.ok(await pagina.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
    const slide = join(tmpdir(), 'ep-vetores-slides-' + largura + '.png');
    await pagina.screenshot({ path: slide });
    await pagina.goto(url + '/final.html', { waitUntil: 'networkidle0' });
    assert.equal(await pagina.$$eval('.slide', els => els.length), 2);
    assert.ok(await pagina.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
    await pagina.goto(url + '/simulador.html', { waitUntil: 'networkidle0' });
    const estado = await pagina.evaluate(async () => {
      const S = window.Simulador, B = window.BancoEP;
      S.tempoDoPasso = () => 0;
      document.getElementById('autoPlay').checked = true;   /* por padrão, cada passo espera um clique */
      for (const c of B.ROTEIROS.demo.comandos) S.enfileirar(c.titulo, c.run(S.banco()));
      await S.tocar();
      return {
        saldos: S.banco().contas.map(c => c.saldo),
        historico: document.querySelectorAll('#historico .no').length,
        largura: document.documentElement.scrollWidth,
        janela: innerWidth,
        texto: document.body.innerText
      };
    });
    assert.deepEqual(estado.saldos, [320, 200, 50]);
    assert.equal(estado.historico, 13);
    assert.ok(estado.largura <= estado.janela);
    assert.doesNotMatch(estado.texto, /malloc|qsort|h->inicio|lista encadeada/);
    assert.deepEqual(erros, []);
    const simulador = join(tmpdir(), 'ep-vetores-simulador-' + largura + '.png');
    await pagina.screenshot({ path: simulador });
    console.log('OK ' + largura + ' px, 13 registros e saldos corretos. Imagens: ' + slide + ' / ' + simulador);
    await pagina.close();
  }
} finally {
  await navegador.close();
}
