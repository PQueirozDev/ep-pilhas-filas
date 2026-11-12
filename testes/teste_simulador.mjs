/*
 * teste_simulador.mjs
 * -------------------
 * Confere se o motor do simulador (slides/js/banco.js) se comporta igual
 * ao banco.exe: roda o roteiro de demo/entrada-demo.txt e compara as linhas
 * impressas com demo/saida-demo.txt, depois testa os casos extremos.
 *
 * Rodar:  node testes/teste_simulador.mjs
 */
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const raiz = join(dirname(fileURLToPath(import.meta.url)), '..');
await import(join(raiz, 'slides', 'js', 'banco.js').replace(/\\/g, '/').replace(/^([A-Za-z]):/, 'file:///$1:'));
const B = globalThis.BancoEP;

let total = 0, falhas = 0;
function verificar(cond, descricao) {
  total++;
  if (cond) { console.log('  ok   ' + descricao); }
  else { falhas++; console.log('  FALHA ' + descricao); }
}
const logs = P => P.flatMap(p => p.log);
const saldos = b => b.contas.map(c => c.saldo.toFixed(2)).join(' ');

/* 1. Roteiro da demonstração == saída real do banco.exe */
console.log('\n1. Roteiro da demonstração');
{
  const b = new B.Banco();
  const obtido = B.ROTEIROS.demo.comandos.flatMap(c => logs(c.run(b)));
  const esperado = readFileSync(join(raiz, 'demo', 'saida-demo.txt'), 'utf8')
    .split(/\r?\n/)
    .filter(l => /^  (\[|Nada a estornar|Pedido na fila|Data atual|Estorno impossível|Nenhum)/.test(l));
  verificar(obtido.length === esperado.length, 'mesmo número de linhas (' + obtido.length + ' / ' + esperado.length + ')');
  esperado.forEach((linha, i) => {
    if (obtido[i] !== linha) console.log('     esperado: ' + JSON.stringify(linha) + '\n     obtido:   ' + JSON.stringify(obtido[i]));
  });
  verificar(esperado.every((l, i) => obtido[i] === l), 'linhas idênticas às do banco.exe');
  verificar(saldos(b) === '320.00 200.00 50.00', 'saldos finais Ana 320, Bruno 200, Carla 50');
  verificar(b.historico.length === 13, 'histórico com 13 registros');
  verificar(b.pilha.length === 0 && b.agenda.length === 0 && b.fila.quantidade === 0, 'estruturas vazias no fim');
  const pagos = b.historico.filter(h => h.situacao === B.SIT_AGENDADO_PAGO).map(h => h.op.numero).join(',');
  verificar(pagos === '5,4,6', 'agendados pagos na ordem #5, #4, #6 (desempate pelo número)');
}

/* 2. Validações antes da fila */
console.log('\n2. Validações');
{
  const b = new B.Banco();
  const casos = [
    [B.TIPO_TRANSFERENCIA, 0, 2, 100, 'Conta inexistente.', 'conta 0 como origem'],
    [B.TIPO_SAQUE, 9, 0, 10, 'Conta inexistente.', 'conta 9'],
    [B.TIPO_SAQUE, 1, 0, NaN, 'Valor deve ser', 'valor nan'],
    [B.TIPO_SAQUE, 1, 0, 0, 'Valor deve ser', 'valor zero'],
    [B.TIPO_DEPOSITO, 0, 1, 1000000.01, 'Valor deve ser', 'acima de 1 milhão'],
    [B.TIPO_TRANSFERENCIA, 2, 2, 10, 'mesma conta', 'transferência para a mesma conta']
  ];
  for (const [t, o, d, v, msg, desc] of casos) {
    const L = logs(b.solicitarOperacao(t, o, d, v));
    verificar(L.length === 1 && L[0].includes(msg), desc + ' recusado');
  }
  verificar(b.fila.quantidade === 0 && b.proximoNumero === 1, 'nada entrou na fila e o número não avançou');
  const dep = b.solicitarOperacao(B.TIPO_DEPOSITO, 7, 2, 10.005);
  verificar(logs(dep)[0].includes('(conta 2)') && b.fila.itens[0].contaOrigem === 0, 'depósito ignora a origem digitada');
  verificar(b.fila.itens[0].valor === 10.01, 'valor arredondado para centavos');
  verificar(logs(b.agendarPagamento(1, 10, B.DATA_INICIAL))[0].includes('depois de hoje'), 'agendar para hoje recusado');
  verificar(logs(b.avancarData(20261101))[0].includes('precisa ser depois'), 'voltar a data recusado');
  verificar(logs(b.cancelarAgendamento(42))[0].includes('número 42'), 'cancelar inexistente avisa');
}

/* 3. Estorno impossível */
console.log('\n3. Estorno impossível');
{
  const b = new B.Banco();
  const L = B.ROTEIROS.estornoImpossivel.comandos.flatMap(c => logs(c.run(b)));
  verificar(L.some(l => l.includes('Estorno impossível: a conta 3 já não tem R$ 100.00.')), 'mensagem de estorno impossível');
  verificar(b.pilha.length === 1 && b.pilha[0].numero === 1, 'depósito continua no topo da pilha');
  verificar(saldos(b) === '500.00 200.00 10.00', 'nenhum saldo mudou no estorno');
}

/* 4. Fila circular dá a volta */
console.log('\n4. Vetor circular');
{
  const b = new B.Banco();
  for (let i = 0; i < 49; i++) { b.solicitarOperacao(B.TIPO_DEPOSITO, 0, 1, 1); b.processarProximo(); }
  b.solicitarOperacao(B.TIPO_DEPOSITO, 0, 1, 1);
  b.solicitarOperacao(B.TIPO_DEPOSITO, 0, 1, 1);
  const f = b.foto().fila;
  verificar(f[0].indice === 49 && f[1].indice === 0, 'fim volta para itens[0] depois de itens[49]');
  for (let i = 0; i < 48; i++) b.solicitarOperacao(B.TIPO_DEPOSITO, 0, 1, 1);
  verificar(logs(b.solicitarOperacao(B.TIPO_DEPOSITO, 0, 1, 1))[0].includes('Fila cheia (50'), 'fila cheia com 50');
}

/* 5. Cada passo traz linha de código válida */
console.log('\n5. Passos bem formados');
{
  const b = new B.Banco();
  const P = Object.values(B.ROTEIROS).flatMap(r => r.comandos.flatMap(c => c.run(b)));
  verificar(P.every(p => B.CODIGO[p.fn] && p.linha >= 0 && p.linha < B.CODIGO[p.fn].linhas.length), 'fn e linha existem em CODIGO');
  verificar(P.every(p => p.foto && typeof p.legenda === 'string' && p.legenda.length > 0), 'todo passo tem foto e legenda');
  verificar(P.every(p => typeof p.simples === 'string' && p.simples.length > 0), 'todo passo tem frase simples (balão)');
  /* Cada parte do simulador roda do zero sem erro e todo passo tem frase simples */
  const partes = Object.entries(B.PARTES).map(([nome, parte]) => {
    const b2 = new B.Banco();
    parte.preparo.forEach(c => c.run(b2));
    return [nome, parte.comandos.flatMap(c => c.run(b2)), b2];
  });
  verificar(partes.every(([, Q]) => Q.length > 0 && Q.every(p => p.simples && p.legenda)), 'partes: todos os passos com frase simples e legenda');
  const [, , bFila] = partes.find(([n]) => n === 'fila');
  verificar(bFila.contas[2].saldo === 10 && bFila.pilha.length === 2 && bFila.historico.map(h => h.situacao).join() === [B.SIT_EFETIVADA, B.SIT_RECUSADA, B.SIT_EFETIVADA].join(), 'parte fila: R$ 40 efetivado, R$ 30 recusado, transferência efetivada');
  verificar(B.PARTES.pilha.preparo === B.PARTES.fila.comandos, 'parte pilha começa onde a parte fila termina');
  const [, , bPilha] = partes.find(([n]) => n === 'pilha');
  verificar(bPilha.pilha.length === 0 && bPilha.contas.map(c => c.saldo).join() === '500,200,50', 'parte pilha: dois estornos desfazem tudo');
  const [, , bAgenda] = partes.find(([n]) => n === 'agenda');
  verificar(bAgenda.agenda.length === 1 && bAgenda.contas[0].saldo === 450, 'parte agenda: paga só o de 08/11');
  const [, , bVetor] = partes.find(([n]) => n === 'vetor');
  verificar(bVetor.historico.length === 4, 'parte vetor: quatro registros no histórico');
}

console.log('\n6. Histórico com limite fixo');
{
  const b = new B.Banco();
  b.solicitarOperacao(B.TIPO_DEPOSITO, 0, 1, 10);
  b.processarProximo();
  b.agendarPagamento(1, 20, 20261106);
  b.agendarPagamento(1, 30, 20261106);
  while (b.historico.length < 1000) b.historico.push({ ...b.historico[0], id: b.historico.length + 1 });
  const numero = b.proximoNumero;
  verificar(logs(b.agendarPagamento(1, 1, 20261107))[0].includes('Histórico cheio') && b.proximoNumero === numero, 'agendamento cheio não consome número');
  verificar(logs(b.estornar())[0].includes('Histórico cheio') && b.pilha.length === 1 && b.contas[0].saldo === 510, 'estorno cheio preserva pilha e saldo');
  verificar(logs(b.cancelarAgendamento(2))[0].includes('Histórico cheio') && b.agenda.length === 2, 'cancelamento cheio preserva agenda');
  verificar(logs(b.cancelarAgendamento(99))[0].includes('número 99'), 'cancelamento inexistente continua identificado');
  b.solicitarOperacao(B.TIPO_DEPOSITO, 0, 1, 5);
  const P = b.processarTodos();
  verificar(logs(P)[0].includes('Histórico cheio') && b.fila.quantidade === 1 && b.contas[0].saldo === 510, 'fila inteira para sem perder pedido nem alterar saldo');
  b.historico.pop();
  verificar(logs(b.avancarData(20261106))[0].includes('Histórico cheio') && b.hoje === B.DATA_INICIAL && b.agenda.length === 2, 'avanço exige espaço para todos os vencidos');
  b.historico.pop();
  b.avancarData(20261106);
  verificar(b.historico.length === 1000 && b.agenda.length === 0 && b.contas[0].saldo === 460, 'duas vagas permitem executar os dois vencidos');
}

console.log('\n' + (total - falhas) + ' de ' + total + ' verificações passaram.');
process.exit(falhas ? 1 : 0);
