/* Atualiza somente os trechos C do painel, a partir dos fontes do trabalho. */
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { join, dirname } from 'node:path';
const raiz = join(dirname(fileURLToPath(import.meta.url)), '..');
const codigo = {};
for (const nome of ['sistema', 'fila', 'pilha', 'agendados', 'historico']) {
  const fonte = readFileSync(join(raiz, 'src', nome + '.c'), 'utf8').replace(/\r\n/g, '\n');
  for (const m of fonte.matchAll(/^(?:int|void|double|Operacao) (\w+)\([^\n]*\)\n\{/gm)) {
    let i = m.index + m[0].length, nivel = 1;
    while (nivel && i < fonte.length) {
      if (fonte[i] === '{') nivel++;
      if (fonte[i] === '}') nivel--;
      i++;
    }
    if (nivel) throw new Error('Função incompleta: ' + m[1]);
    codigo[m[1]] = { arquivo: nome + '.c', linhas: fonte.slice(m.index, i).split('\n') };
  }
}
const caminho = join(raiz, 'slides/js/banco.js');
const antigo = readFileSync(caminho, 'utf8');
const inicio = antigo.indexOf('  const CODIGO = ');
const fim = antigo.indexOf('\n  /* Índice da primeira linha', inicio);
if (inicio < 0 || fim < 0) throw new Error('Marcadores do painel ausentes.');
writeFileSync(caminho, antigo.slice(0, inicio) + '  const CODIGO = ' + JSON.stringify(codigo, null, 2) + ';\n' + antigo.slice(fim));
console.log('Painel sincronizado com ' + Object.keys(codigo).length + ' funções C.');
