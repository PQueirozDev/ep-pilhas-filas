/*
 * filme.js
 * --------
 * Linha do tempo do filme (simulador.html?filme). Usa o simulador de verdade:
 * mostra um cartão por capítulo e toca os comandos da demonstração do EP
 * (BancoEP.ROTEIROS.demo, o mesmo roteiro de demo/entrada-demo.txt).
 * ferramentas/gravar-video.mjs grava este filme quadro a quadro em MP4.
 */
(function () {
  'use strict';
  if (!document.documentElement.classList.contains('filme')) return;

  const S = window.Simulador, B = window.BancoEP;
  const demo = B.ROTEIROS.demo.comandos;
  const $ = id => document.getElementById(id);
  const espera = ms => new Promise(r => setTimeout(r, ms));

  /* Índices em ROTEIROS.demo.comandos. O comando 0 (estornar com a pilha vazia)
   * é igual ao último e não muda o estado, então o filme só mostra o último. */
  const CAPITULOS = [
    { id: 'fila', nome: 'Fila · FIFO', cor: 'var(--fifo)', comandos: [1, 2, 3, 4],
      titulo: 'Quem pediu primeiro\né atendido primeiro',
      sub: 'Carla tem R$ 50 e pede dois saques. A ordem da fila decide qual deles fica sem saldo.' },
    { id: 'pilha', nome: 'Pilha · LIFO', cor: 'var(--lifo)', comandos: [5],
      titulo: 'O estorno desfaz\na última efetivada',
      sub: 'Cada operação efetivada foi para o topo da pilha. Estornar tira sempre o topo.' },
    { id: 'agenda', nome: 'Agenda · inserção', cor: 'var(--agenda)', comandos: [6, 7, 8, 9, 10, 11],
      titulo: 'Na data certa,\nna ordem certa',
      sub: 'Pagamentos agendados ficam ordenados por data. No mesmo dia, vale quem entrou antes.' },
    { id: 'pilha', nome: 'Pilha · LIFO', cor: 'var(--lifo)', comandos: [12, 13],
      titulo: 'De volta à pilha,\naté esvaziar',
      sub: 'Os agendados não entraram na pilha. O topo ainda é o saque da Carla.' },
    { id: 'lista', nome: 'Histórico · vetor', cor: 'var(--lista)', cena: cenaHistorico,
      titulo: 'Tudo ficou registrado,\nposição por posição',
      sub: 'Cada evento ocupou a próxima posição livre do vetor do histórico.' }
  ];

  /* ---------------- Montagem ---------------- */
  const icone = '<div class="f-icone" aria-hidden="true"><span></span><span></span><span></span><span></span></div>';
  const vistos = new Set();
  const topo = document.createElement('div');
  topo.className = 'f-topo';
  topo.innerHTML = '<div class="f-marca">' + icone + 'Banco EP <small>o código C, passo a passo</small></div>' +
    '<ol class="f-caps">' + CAPITULOS.filter(c => !vistos.has(c.id) && vistos.add(c.id))
      .map(c => '<li data-cap="' + c.id + '" style="--cor:' + c.cor + '">' + c.nome + '</li>').join('') + '</ol>';
  topo.appendChild($('chipData'));
  document.querySelector('.sim').prepend(topo);

  const cartao = document.createElement('div');
  cartao.className = 'f-cartao visivel';
  cartao.innerHTML = icone + '<p class="f-num"></p><p class="rotulo"></p><h1 class="gradiente"></h1><p class="f-sub"></p><div class="f-fatos"></div>';
  Array.from(cartao.children).forEach((c, i) => c.style.setProperty('--i', i));
  document.body.appendChild(cartao);
  const [cIcone, cNum, cRotulo, cTitulo, cSub, cFatos] = cartao.children;

  function preencher(c) {
    cartao.style.setProperty('--cor', c.cor || 'var(--muted)');
    cIcone.hidden = !c.icone;
    cNum.hidden = !c.num; cNum.textContent = c.num || '';
    cRotulo.hidden = !c.rotulo; cRotulo.textContent = c.rotulo || '';
    cTitulo.innerHTML = c.titulo.split('\n').join('<br>');
    cSub.hidden = !c.sub; cSub.textContent = c.sub || '';
    cFatos.hidden = !c.fatos;
    cFatos.innerHTML = (c.fatos || []).map(f => '<span><b>' + f[0] + '</b>' + f[1] + '</span>').join('');
  }
  async function mostrarCartao(c, ms, manter) {
    preencher(c);
    cartao.classList.add('visivel');
    void cartao.offsetWidth;
    cartao.classList.add('dentro');
    await espera(ms);
    if (manter) return;
    cartao.classList.remove('visivel');
    await espera(600);
    cartao.classList.remove('dentro');
  }

  function legenda(cmd, texto) {
    $('narCmd').textContent = cmd;
    $('narTexto').textContent = texto;
    $('narracao').className = 'painel narracao';
  }
  function marcarCapitulo(id) {
    topo.querySelectorAll('.f-caps li').forEach(li => li.classList.toggle('atual', li.dataset.cap === id));
  }

  /* Histórico: destaca cada posição ocupada do vetor */
  async function cenaHistorico() {
    const nos = Array.from(document.querySelectorAll('#historico .no'));
    document.documentElement.classList.add('foco-hist');
    legenda('Histórico · vetor encadeada',
      nos.length + ' eventos em ' + nos.length + ' posições. Para mostrar o histórico, o programa percorre os índices de 0 a quantidade - 1.');
    await espera(1200);
    for (const no of nos) {
      nos.forEach(n => n.classList.toggle('f-aceso', n === no));
      await espera(380);
    }
    nos.forEach(n => n.classList.remove('f-aceso'));
    legenda('Histórico · vetor encadeada', 'Ao reiniciar o programa, quantidade volta a zero e o vetor pode ser reutilizado.');
    await espera(3200);
    document.documentElement.classList.remove('foco-hist');
  }

  /* Tempo de cada passo: o bastante para ler a legenda; registros repetidos passam rápido */
  let registros = 0;
  S.tempoDoPasso = p => {
    if (p.fn === 'registrarHistorico' && ++registros > 2) return 1500;
    return Math.max(1700, Math.min(2800, 900 + p.legenda.length * 11));
  };

  /* ---------------- Roteiro ---------------- */
  async function rodar() {
    registros = 0;
    S.reiniciar();
    marcarCapitulo(null);
    legenda('Banco EP', 'Três contas: Ana com R$ 500,00, Bruno com R$ 200,00 e Carla com R$ 50,00. Hoje é 05/11/2026.');
    await mostrarCartao({ icone: true, rotulo: 'EP de Algoritmos · Senac · 2026',
      titulo: 'Transações bancárias\ncom pilha e fila em C',
      sub: 'Fila, pilha, agenda por inserção e histórico em vetor, passo a passo.' }, 4500);
    await espera(1800);

    let n = 0;
    for (const cap of CAPITULOS) {
      n++;
      await mostrarCartao({ num: '0' + n, rotulo: cap.nome, cor: cap.cor, titulo: cap.titulo, sub: cap.sub }, 3600);
      marcarCapitulo(cap.id);
      if (cap.comandos) {
        cap.comandos.forEach(i => S.enfileirar(demo[i].titulo, demo[i].run(S.banco())));
        await S.tocar();
        await espera(2400);
      }
      if (cap.cena) await cap.cena();
    }

    await mostrarCartao({ icone: true, rotulo: 'Resumo',
      titulo: 'Fila para a ordem justa.\nPilha para desfazer com segurança.',
      fatos: [['72', 'verificações nos testes em C'], ['32', 'no simulador'], ['19', 'linhas idênticas às do banco.exe']] }, 6000, true);
    window.__filmeFim = true;
  }

  /* Escala o palco de 1920x1080 para caber na janela */
  function ajustar() {
    const k = Math.min(innerWidth / 1920, innerHeight / 1080);
    const x = (innerWidth - 1920 * k) / 2, y = (innerHeight - 1080 * k) / 2;
    document.body.style.transform = 'translate(' + x + 'px,' + y + 'px) scale(' + k + ')';
    window.__palcoFilme = { x, y, k };
  }
  ajustar();
  window.addEventListener('resize', ajustar);

  /* Espera as fontes para nenhum texto trocar de fonte no meio do filme */
  const fontes = ['400 16px Geist', '500 16px Geist', '600 16px Geist', '400 16px "Geist Mono"', '500 16px "Geist Mono"', '16px Phosphor'];
  Promise.all(fontes.map(f => document.fonts.load(f))).catch(() => {}).then(() => {
    window.__filmePronto = true;
    setTimeout(rodar, 100);        /* por timer: na gravação, só começa quando o relógio andar */
  });
})();
