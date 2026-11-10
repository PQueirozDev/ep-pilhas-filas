/* Regressões da leitura sem scanf e conferência da demonstração real em C. */
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { readFileSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { join, dirname } from 'node:path';

const raiz = join(dirname(fileURLToPath(import.meta.url)), '..');
const executavel = join(raiz, process.platform === 'win32' ? 'banco.exe' : 'banco');
let total = 0;
function rodar(entrada) {
  const r = spawnSync(executavel, { input: entrada, encoding: 'utf8', timeout: 5000 });
  assert.ifError(r.error);
  assert.equal(r.status, 0, r.stderr);
  return r.stdout.replace(/\r\n/g, '\n');
}
function conferir(nome, teste) { teste(); total++; console.log('ok ' + nome); }
const eventos = s => s.split(/\r?\n/).filter(l => /^  (\[|Nada a estornar|Pedido na fila|Data atual|Estorno impossível|Nenhum)/.test(l));
conferir('demonstração mantém as mesmas 19 linhas de eventos', () => {
  assert.deepEqual(eventos(rodar(readFileSync(join(raiz, 'demo/entrada-demo.txt'), 'utf8'))),
    eventos(readFileSync(join(raiz, 'demo/saida-demo.txt'), 'utf8')));
});
for (const valor of ['150,50', '150.50', '1.505e2']) {
  conferir('depósito aceita ' + valor, () => assert.match(rodar('1\n2\n' + valor + '\n6\n0\n'), /\[EFETIVADA\].*150\.50/));
}
for (const invalido of ['abc', '1.9', '9999999999999999999999999', '9'.repeat(150)]) {
  conferir('inteiro inválido é recusado e próxima linha é lida: ' + invalido.slice(0, 15), () => {
    const s = rodar('1\n' + invalido + '\n2\n10\n6\n0\n');
    assert.match(s, /Digite um número inteiro/);
    assert.match(s, /\[EFETIVADA\].*10\.00.*conta 2/);
  });
}
conferir('valor com lixo é recusado e pode ser corrigido', () => {
  const s = rodar('1\n2\n10abc\n25\n6\n0\n');
  assert.match(s, /Digite um valor/);
  assert.match(s, /\[EFETIVADA\].*25\.00/);
});
conferir('data impossível é recusada antes de aceitar uma data válida', () => {
  const s = rodar('8\n1\n10\n31/02/2027\n06/11/2026\n10\n06/11/2026\n0\n');
  assert.match(s, /Data inválida/);
  assert.match(s, /\[AGENDADO PAGO\].*10\.00/);
});
conferir('fim de entrada encerra o programa', () => assert.match(rodar(''), /Até logo/));
conferir('fontes não declaram ponteiros, usam endereçamento ou alocação dinâmica', () => {
  for (const pasta of ['src', 'testes']) {
    for (const arquivo of readdirSync(join(raiz, pasta)).filter(p => /\.[ch]$/.test(p))) {
      const s = readFileSync(join(raiz, pasta, arquivo), 'utf8')
        .replace(/\/\*[\s\S]*?\*\/|\/\/[^\n]*|"(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*'/g, '');
      assert.doesNotMatch(s, /->|\b(?:void|char|int|double|Sistema|Conta|Operacao|Pilha|Fila|Agenda|Historico)\s*\*|(?<!&)&(?!&)|\b(?:malloc|calloc|realloc|free|qsort|scanf|sscanf)\s*\(/, arquivo);
    }
  }
});
console.log(total + ' verificações passaram.');
