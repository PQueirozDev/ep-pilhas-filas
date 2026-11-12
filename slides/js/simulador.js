/*
 * simulador.js
 * ------------
 * Tela do simulador. O motor (banco.js) executa cada comando e devolve
 * passos com uma "foto" do estado. Aqui tocamos os passos em sequência:
 * desenhamos a foto e animamos o que mudou (técnica FLIP: medimos onde cada
 * ficha estava, desenhamos o novo estado e animamos do lugar antigo ao novo).
 *
 * A tela é dividida em partes (fila, pilha, agenda e vetor): cada uma mostra
 * só a sua estrutura e roda um roteiro curto (BancoEP.PARTES). A cada passo,
 * um balão em linguagem simples aparece colado na parte que mudou.
 */
(function () {
  'use strict';

  const B = window.BancoEP;
  const $ = id => document.getElementById(id);
  const CURVA = 'cubic-bezier(0.22, 1, 0.36, 1)';
  const INTERVALO = 1500;                       /* ms entre passos em 1× */
  const movimentoReduzido = window.matchMedia('(prefers-reduced-motion: reduce)');
  /* Modo filme (simulador.html?filme): a página vira um palco de 1920x1080
   * escalado, e js/filme.js comanda o roteiro por meio de window.Simulador. */
  const FILME = document.documentElement.classList.contains('filme');
  const palco = () => window.__palcoFilme || { x: 0, y: 0, k: 1 };
  const rolagem = () => (duracao() && !FILME ? 'smooth' : 'auto');
  const api = { tempoDoPasso: null };           /* ms de cada passo (opcional) */

  let banco = new B.Banco();
  let velocidade = 1;
  const filaPassos = [];                        /* passos esperando para aparecer */
  let tocando = false, pulando = false, liberar = null, timer = null;
  const elementos = new Map();                  /* chave -> elemento (fichas e registros) */
  let fnAtual = null, hojeAtual = null;
  let parteAtual = null;                        /* 'fila' | 'pilha' | 'agenda' | 'vetor' | null (tudo) */
  let passoAtual = null;                        /* último passo mostrado (para redesenhar o balão) */

  const duracao = () => (movimentoReduzido.matches || pulando) ? 0 : Math.round(520 / velocidade);
  const tecnico = () => document.documentElement.classList.contains('tecnico');

  /* ---------------- Texto ---------------- */
  function esc(s) { return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); }
  function dataCurta(d) { return B.textoData(d).slice(0, 5); }
  function rota(op) {
    const o = op.contaOrigem, d = op.contaDestino;
    if (o && d) return 'conta ' + o + ' → ' + d;
    if (o) return 'sai da conta ' + o;
    if (d) return 'entra na conta ' + d;
    return '';
  }
  /* Etiqueta da ficha: o texto simples sempre aparece; o índice do vetor só
   * com "Detalhes técnicos" ligado. Sem texto simples, a etiqueta é só técnica. */
  function etiqueta(simples, tec) {
    if (!simples) return '<span class="tag tec">' + tec + '</span>';
    return '<span class="tag">' + simples + (tec ? '<span class="tec"> · ' + tec + '</span>' : '') + '</span>';
  }
  function htmlFicha(op, tag, extra) {
    return tag +
      '<div class="l1"><span class="num">#' + op.numero + '</span><span class="tipo">' + (B.NOME_CURTO[op.tipo] || '?') + '</span></div>' +
      '<div class="valor">' + B.reais(op.valor) + '</div>' +
      '<div class="rota">' + rota(op) + '</div>' + (extra || '');
  }
  const CLASSE_SIT = { 1: 'ok', 2: 'erro', 3: 'estorno', 4: 'agenda', 5: 'agenda', 6: 'ok', 7: 'erro' };
  function htmlNo(h) {
    return '<div class="caixa"><span class="sit"><span class="tec">[' + (h.id - 1) + '] </span><span class="nao-tec">' + h.id + 'º · </span>' +
      esc(B.NOME_SIT[h.situacao].trim()) + '</span>' +
      '<span class="det">#' + h.op.numero + ' ' + B.NOME_CURTO[h.op.tipo].toLowerCase() + ' ' +
      B.reais(h.op.valor) + ' · ' + dataCurta(h.data) + '</span></div>';
  }

  /* Realce simples de sintaxe C */
  const RX = /(\/\*.*?\*\/|\/\*.*$)|("(?:\\.|[^"\\])*")|\b(int|double|void|const|if|else|return|while|for|sizeof|NULL)\b|\b(\d+)\b|\b([A-Za-z_]\w*)(?=\s*\()/g;
  function realcar(linha) {
    let saida = '', i = 0;
    linha.replace(RX, (m, c, s, k, n, f, pos) => {
      saida += esc(linha.slice(i, pos));
      const cls = c ? 'tk-c' : s ? 'tk-s' : k ? 'tk-k' : n ? 'tk-n' : 'tk-f';
      saida += '<span class="' + cls + '">' + esc(m) + '</span>';
      i = pos + m.length;
      return m;
    });
    return saida + esc(linha.slice(i));
  }

  /* ---------------- Contas ---------------- */
  function montarContas(foto) {
    $('contas').innerHTML = foto.contas.map(c =>
      '<article class="conta" id="c' + c.numero + '">' +
        '<div class="quem"><span class="avatar">' + c.titular[0] + '</span>Conta ' + c.numero + ' · ' + c.titular + '</div>' +
        '<div class="saldo" data-valor="' + c.saldo + '">' + B.reais(c.saldo) + '</div>' +
        '<div class="delta"></div>' +
      '</article>').join('');
  }
  function atualizarContas(foto) {
    foto.contas.forEach(c => {
      const cartao = $('c' + c.numero), el = cartao.querySelector('.saldo');
      const antes = parseFloat(el.dataset.valor);
      if (Math.abs(antes - c.saldo) < 0.001) return;
      const delta = c.saldo - antes;
      el.dataset.valor = c.saldo;
      cartao.querySelector('.delta').textContent = (delta > 0 ? '+ ' : '− ') + B.reais(Math.abs(delta));
      cartao.classList.remove('sobe', 'desce');
      cartao.classList.add(delta > 0 ? 'sobe' : 'desce');
      clearTimeout(cartao._t);
      cartao._t = setTimeout(() => cartao.classList.remove('sobe', 'desce'), pulando ? 0 : 1800 / velocidade);
      contarAte(el, antes, c.saldo, duracao() * 1.6);
    });
  }
  function contarAte(el, de, para, ms) {
    cancelAnimationFrame(el._raf);
    if (!ms) { el.textContent = B.reais(para); return; }
    const t0 = performance.now();
    const quadro = t => {
      const k = Math.min(1, (t - t0) / ms), e = 1 - Math.pow(1 - k, 3);
      el.textContent = B.reais(de + (para - de) * e);
      if (k < 1) el._raf = requestAnimationFrame(quadro);
    };
    el._raf = requestAnimationFrame(quadro);
  }

  /* ---------------- Estruturas (reconciliação + FLIP) ---------------- */
  function desenhar(foto, animar) {
    const D = animar ? duracao() : 0;
    /* Mede onde cada elemento está NA TELA (com a animação anterior em curso)
     * e só depois cancela essa animação, para começar a nova dali sem salto. */
    const antes = new Map();
    elementos.forEach((el, k) => {
      if (D) antes.set(k, el.getBoundingClientRect());
      el.getAnimations().forEach(a => a.cancel());
    });
    const vivos = new Set();

    function colocar(container, itens) {
      itens.forEach((item, i) => {
        let el = elementos.get(item.chave);
        if (!el) {
          el = document.createElement('div');
          el._novo = true;
          elementos.set(item.chave, el);
        }
        el.className = item.classe;
        el.innerHTML = item.html;
        if (container.children[i] !== el) container.insertBefore(el, container.children[i] || null);
        vivos.add(item.chave);
      });
    }

    colocar($('fila'), foto.fila.map(({ indice, op }, i) =>
      ({ chave: 'op' + op.numero, classe: 'ficha', html: htmlFicha(op, etiqueta(i === 0 ? 'próximo' : (i + 1) + 'º', 'itens[' + indice + ']')) })));
    colocar($('op'), foto.emMaos ? [{ chave: 'op' + foto.emMaos.numero, classe: 'ficha',
      html: htmlFicha(foto.emMaos, '<span class="tag"><span class="nao-tec">agora</span><span class="tec">op</span></span>') }] : []);
    colocar($('pilha'), foto.pilha.map((op, i, a) =>
      ({ chave: 'op' + op.numero, classe: 'ficha', html: htmlFicha(op, etiqueta(i === a.length - 1 ? 'TOPO' : '', 'itens[' + i + ']')) })));
    colocar($('agenda'), foto.agenda.map((op, i) =>
      ({ chave: 'op' + op.numero, classe: 'ficha', html: htmlFicha(op, etiqueta(i === 0 ? 'próximo' : '', 'itens[' + i + ']'), '<span class="quando">' + dataCurta(op.data) + '</span>') })));
    colocar($('historico'), foto.historico.map(h =>
      ({ chave: 'h' + h.id, classe: 'no s-' + CLASSE_SIT[h.situacao], html: htmlNo(h) })));

    /* Quem sumiu de todas as estruturas sai com uma animação */
    elementos.forEach((el, k) => {
      if (!vivos.has(k)) { elementos.delete(k); sair(el, antes.get(k), D); }
    });

    /* FLIP: do lugar antigo ao novo */
    elementos.forEach((el, k) => {
      const velho = antes.get(k);
      if (D && el._novo) {
        el.animate([{ opacity: 0, transform: 'translateY(16px) scale(.96)' }, { opacity: 1, transform: 'none' }], { duration: D, easing: CURVA });
      } else if (D && velho && velho.width) {
        const novo = el.getBoundingClientRect();
        const k = palco().k, dx = (velho.left - novo.left) / k, dy = (velho.top - novo.top) / k;
        if (novo.width && (Math.abs(dx) > 0.5 || Math.abs(dy) > 0.5)) {
          el.animate([{ transform: 'translate(' + dx + 'px,' + dy + 'px)' }, { transform: 'none' }], { duration: D, easing: CURVA });
        }
      }
      el._novo = false;
    });

    atualizarContas(foto);
    $('filaMeta').textContent = 'inicio = ' + foto.filaInicio + ' · quantidade = ' + foto.filaQuantidade;
    $('pilhaMeta').textContent = 'quantidade = ' + foto.pilha.length;
    $('agendaMeta').textContent = 'quantidade = ' + foto.agenda.length;
    $('histMeta').textContent = 'quantidade = ' + foto.historico.length;
    if (hojeAtual !== foto.hoje) {
      hojeAtual = foto.hoje;
      $('hoje').textContent = B.textoData(foto.hoje);
    }
  }

  function sair(el, rect, D) {
    el.remove();
    if (!D || !rect || !rect.width) return;
    el.classList.add('saida-clone');
    const { x, y, k } = palco();
    Object.assign(el.style, { left: (rect.left - x) / k + 'px', top: (rect.top - y) / k + 'px', width: rect.width / k + 'px' });
    document.body.appendChild(el);
    el.animate([{ opacity: 1, transform: 'none' }, { opacity: 0, transform: 'translateY(-16px) scale(.92)' }],
      { duration: D, easing: CURVA, fill: 'forwards' }).onfinish = () => el.remove();
  }

  function focar(passo) {
    document.querySelectorAll('.foco-ok, .foco-erro, .foco-info')
      .forEach(e => e.classList.remove('foco-ok', 'foco-erro', 'foco-info'));
    const f = passo.foco;
    if (!f) return;
    if (f.area === 'data') {
      const chip = $('chipData');
      chip.classList.remove('pulsa'); void chip.offsetWidth; chip.classList.add('pulsa');
      return;
    }
    const el = f.area === 'conta' ? $(f.chave) : elementos.get(f.chave);
    if (!el) return;
    void el.offsetWidth;                         /* reinicia a animação de tremer */
    el.classList.add('foco-' + passo.tom);
    const area = el.closest('.fila-area');
    if (area) {
      const deslocamento = (el.getBoundingClientRect().left - area.getBoundingClientRect().left) / palco().k;
      area.scrollTo({ left: area.scrollLeft + deslocamento - 48, behavior: rolagem() });
    }
  }

  /* ---------------- Balão ---------------- */
  /* Painel de cada função, para quando o passo não destaca uma ficha visível */
  const PAINEL_DA_FUNCAO = {
    solicitarOperacao: 'pFila', enfileirar: 'pFila', desenfileirar: 'pFila', processarProximo: 'pFila',
    empilhar: 'pPilha', desempilhar: 'pPilha', estornar: 'pPilha', desfazerOperacao: 'pPilha',
    agendarPagamento: 'pAgenda', agendar: 'pAgenda', compararAgendados: 'pAgenda',
    cancelarAgendado: 'pAgenda', avancarData: 'pAgenda',
    registrarHistorico: 'pHist', conferirHistorico: 'pHist', aplicarOperacao: 'contas'
  };
  const visivel = el => el && el.getClientRects().length > 0;
  function alvoDoBalao(p) {
    const f = p.foco;
    let el = null;
    if (f && f.area === 'conta') el = $(f.chave);
    else if (f && f.area !== 'data') el = elementos.get(f.chave);
    if (!visivel(el)) el = $(PAINEL_DA_FUNCAO[p.fn]);
    return visivel(el) ? el : $('palco');
  }
  function posicionarBalao() {
    const balao = $('balao'), p = passoAtual;
    if (!p || !p.simples) return;
    const r = alvoDoBalao(p).getBoundingClientRect();
    const largura = Math.min(360, innerWidth - 32);
    balao.style.width = largura + 'px';
    const altura = balao.offsetHeight, centro = r.left + r.width / 2;
    const esquerda = Math.max(16, Math.min(centro - largura / 2, innerWidth - largura - 16));
    /* Embaixo do alvo; se não couber, em cima; no último caso, preso à borda da tela */
    let topo = r.bottom + 12, acima = false;
    if (topo + altura > innerHeight - 16 && r.top - 12 - altura > 88) { topo = r.top - 12 - altura; acima = true; }
    topo = Math.max(88, Math.min(topo, innerHeight - altura - 96));
    balao.classList.toggle('acima', acima);
    balao.style.setProperty('--seta', Math.max(16, Math.min(centro - esquerda, largura - 16)) + 'px');
    balao.style.left = esquerda + scrollX + 'px';
    balao.style.top = topo + scrollY + 'px';
  }
  function mostrarBalao(p) {
    const balao = $('balao');
    clearTimeout(balao._t);
    balao.classList.remove('visivel');
    if (FILME || !p || !p.simples) return;
    /* Espera a animação das fichas terminar para medir o lugar final */
    balao._t = setTimeout(() => {
      balao.className = 'balao tom-' + p.tom;
      balao.textContent = p.simples;
      posicionarBalao();
      balao.classList.add('visivel');
    }, duracao() + 40);
  }
  function esconderBalao() {
    const balao = $('balao');
    clearTimeout(balao._t);
    balao.classList.remove('visivel');
    passoAtual = null;
  }

  /* ---------------- Código, narração e terminal ---------------- */
  function mostrarCodigo(fn, linha, tom) {
    const c = B.CODIGO[fn], caixa = $('codigo');
    if (fn !== fnAtual) {
      fnAtual = fn;
      $('codTitulo').textContent = fn + '()';
      $('codArquivo').textContent = 'src/' + c.arquivo;
      caixa.innerHTML = c.linhas.map((l, i) => '<div class="ln" data-n="' + (i + 1) + '"><span>' + (realcar(l) || ' ') + '</span></div>').join('');
      if (duracao()) caixa.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 300, easing: CURVA });
    }
    caixa.querySelectorAll('.ln.ativa').forEach(e => { e.className = 'ln'; });
    const ln = caixa.children[linha];
    ln.className = 'ln ativa' + (tom === 'info' ? '' : ' ' + tom);
    caixa.scrollTo({ top: ln.offsetTop - caixa.clientHeight / 2 + ln.offsetHeight / 2, behavior: rolagem() });
  }

  /* A explicação ligada ao código C aparece no filme e com "Detalhes técnicos";
   * no modo simples quem explica é o balão. */
  function narrar(p) {
    $('narCmd').textContent = p.titulo + ' · passo ' + (p.i + 1) + ' de ' + p.total;
    $('narTexto').textContent = (FILME || tecnico()) ? p.legenda : '';
    $('narracao').className = 'painel narracao tom-' + p.tom;
    $('progresso').innerHTML = Array.from({ length: p.total }, (_, i) =>
      '<span class="' + (i < p.i ? 'feito' : i === p.i ? 'atual' : '') + '"></span>').join('');
  }

  function classeLog(l) {
    if (/RECUSAD|impossível|inexistente|deve |precisa|Nada a|Nenhum|cheia|mesma conta|Limite|Não há/.test(l)) return 'erro';
    if (/\[ESTORNADA\]|continua no topo/.test(l)) return 'p';
    if (/\[AGENDADO|\[CANCELADO\]|Data atual/.test(l)) return 'a';
    if (/\[EFETIVADA\]/.test(l)) return 'ok';
    return '';
  }
  function escrever(texto, classe) {
    const term = $('terminal'), d = document.createElement('div');
    d.className = (pulando ? '' : 'ent ') + classe;
    d.textContent = texto;
    term.appendChild(d);
    term.scrollTop = term.scrollHeight;
  }

  /* ---------------- Tocador de passos ---------------- */
  /* Usado pelo filme e pelo roteiro completo: cada comando conta os próprios passos */
  function enfileirar(titulo, passos) {
    passos.forEach((p, i) => filaPassos.push({ ...p, titulo, i, total: passos.length, novoComando: i === 0 }));
  }

  async function tocar() {
    if (tocando) return;
    tocando = true;
    atualizarBotoes();
    while (filaPassos.length) {
      const p = filaPassos.shift();
      mostrar(p);
      if (filaPassos.length) await aguardar(p);
    }
    tocando = false;
    pulando = false;
    atualizarBotoes();
  }

  function mostrar(p) {
    if (p.novoComando) escrever(p.titulo, 'cmd');
    desenhar(p.foto, true);
    focar(p);
    mostrarCodigo(p.fn, p.linha, p.tom);
    narrar(p);
    p.log.forEach(l => escrever(l.replace(/^ {2}/, ''), classeLog(l)));
    passoAtual = p;
    mostrarBalao(p);
  }

  function aguardar(p) {
    if (pulando) return Promise.resolve();
    return new Promise(resolve => {
      liberar = () => { clearTimeout(timer); timer = null; liberar = null; atualizarBotoes(); resolve(); };
      const ms = api.tempoDoPasso ? api.tempoDoPasso(p) : INTERVALO;
      /* Por padrão espera o clique em "Próximo passo"; no filme (sem botão) e
       * com "Avançar sozinho" ligado, avança por tempo. */
      if (FILME || $('autoPlay').checked) timer = setTimeout(liberar, ms / velocidade);
      atualizarBotoes();
    });
  }

  function atualizarBotoes() {
    $('proximoPasso').disabled = !liberar;
    $('pularTudo').disabled = !tocando;
  }

  function reiniciar() {
    filaPassos.length = 0;
    if (liberar) liberar();
    esconderBalao();
    banco = new B.Banco();
    elementos.forEach(el => el.remove());
    elementos.clear();
    fnAtual = null;
    $('codTitulo').textContent = 'Código C';
    $('codArquivo').textContent = 'src/';
    $('codigo').innerHTML = '<div class="ln" data-n="1"><span class="tk-c">/* o trecho de C de cada passo aparece aqui */</span></div>';
    const foto = banco.foto();
    montarContas(foto);
    desenhar(foto, false);
    $('terminal').textContent = '';
    $('narCmd').textContent = 'Pronto para começar';
    $('narTexto').textContent = 'Banco reiniciado: Ana com R$ 500,00, Bruno com R$ 200,00 e Carla com R$ 50,00, em 05/11/2026.';
    $('narracao').className = 'painel narracao';
    $('progresso').innerHTML = '';
  }

  /* Roteiro completo (simulador.html?roteiro=demo): todas as estruturas juntas */
  function rodarRoteiro(nome) {
    escolherParte(null);
    reiniciar();
    /* Enfileira o roteiro inteiro antes de tocar, para nenhum comando ser atropelado */
    B.ROTEIROS[nome].comandos.forEach(c => enfileirar(c.titulo, c.run(banco)));
    tocar();
  }

  /* ---------------- Partes ---------------- */
  /* Em cada parte, alguns passos não acrescentam nada ao que está na tela
   * (ex.: o registro no histórico, que só aparece na parte do vetor). */
  const MOSTRAR_PASSO = {
    fila: p => p.fn !== 'registrarHistorico' && p.fn !== 'empilhar' && !(p.fn === 'solicitarOperacao' && p.tom !== 'erro'),
    pilha: p => p.fn !== 'registrarHistorico',
    agenda: p => p.fn !== 'registrarHistorico',
    vetor: p => p.fn === 'registrarHistorico'
  };
  /* Junta os passos escondidos ao passo mostrado seguinte (ou ao anterior, no fim),
   * sem perder as linhas do terminal; a foto do último passo é sempre o estado final. */
  function resumir(passos, mostrarPasso) {
    const saida = [];
    let pendentes = [];
    passos.forEach(p => {
      if (mostrarPasso(p)) { saida.push({ ...p, log: pendentes.concat(p.log) }); pendentes = []; }
      else pendentes = pendentes.concat(p.log);
    });
    const ultimo = passos[passos.length - 1];
    if (!saida.length) return ultimo ? [{ ...ultimo, log: pendentes }] : [];
    const fim = saida[saida.length - 1];
    saida[saida.length - 1] = { ...fim, foto: ultimo.foto, log: fim.log.concat(pendentes) };
    return saida;
  }

  function escolherParte(nome) {
    parteAtual = nome;
    if (nome) document.documentElement.dataset.parte = nome;
    else delete document.documentElement.dataset.parte;
    document.querySelectorAll('.abas [data-parte]').forEach(b => b.setAttribute('aria-selected', String(b.dataset.parte === nome)));
  }

  /* Volta a parte ao ponto de partida: banco novo + preparo em silêncio */
  function prepararParte(nome) {
    escolherParte(nome);
    reiniciar();
    const parte = B.PARTES[nome];
    if (parte.preparo.length) {
      escrever('Antes desta parte:', 'cmd');
      parte.preparo.forEach(c => c.run(banco).forEach(p => p.log.forEach(l => escrever(l.replace(/^ {2}/, ''), classeLog(l)))));
      const foto = banco.foto();
      montarContas(foto);
      desenhar(foto, false);
    }
    $('narCmd').textContent = parte.nome + ' · clique em Rodar para começar';
    $('narTexto').textContent = parte.intro;
  }

  function rodarParte() {
    if (!parteAtual) { rodarRoteiro('demo'); return; }
    prepararParte(parteAtual);
    const passos = B.PARTES[parteAtual].comandos.flatMap(c =>
      resumir(c.run(banco), MOSTRAR_PASSO[parteAtual]).map((p, i) => ({ ...p, titulo: c.titulo, novoComando: i === 0 })));
    passos.forEach((p, i) => filaPassos.push({ ...p, i, total: passos.length }));
    tocar();
  }

  /* ---------------- Controles ---------------- */
  function ligar() {
    document.querySelectorAll('.abas [data-parte]').forEach(b => b.addEventListener('click', () => prepararParte(b.dataset.parte)));
    $('rodarDemo').addEventListener('click', rodarParte);
    $('reiniciar').addEventListener('click', () => (parteAtual ? prepararParte(parteAtual) : reiniciar()));
    $('limparTerminal').addEventListener('click', () => { $('terminal').textContent = ''; });

    $('proximoPasso').addEventListener('click', () => { if (liberar) liberar(); });
    $('pularTudo').addEventListener('click', () => { pulando = true; if (liberar) liberar(); });
    $('autoPlay').addEventListener('change', e => {
      $('velocidades').hidden = !e.target.checked;
      if (!e.target.checked) { clearTimeout(timer); timer = null; }
      else if (liberar) liberar();
      atualizarBotoes();
    });
    $('modoTecnico').addEventListener('change', e => {
      document.documentElement.classList.toggle('tecnico', e.target.checked);
      if (passoAtual) { narrar(passoAtual); posicionarBalao(); }
    });
    document.querySelectorAll('[data-vel]').forEach(b => b.addEventListener('click', () => {
      velocidade = Number(b.dataset.vel);
      document.querySelectorAll('[data-vel]').forEach(x => x.setAttribute('aria-pressed', String(x === b)));
    }));
    document.addEventListener('keydown', e => {
      if (e.target.closest('input, textarea, select')) return;
      if ((e.key === 'n' || e.key === 'ArrowRight') && liberar) { e.preventDefault(); liberar(); }
    });
    window.addEventListener('resize', posicionarBalao);
  }

  ligar();
  reiniciar();
  if (!FILME) {
    const busca = new URLSearchParams(location.search);
    const roteiro = busca.get('roteiro'), parte = busca.get('parte');
    if (roteiro && B.ROTEIROS[roteiro]) rodarRoteiro(roteiro);
    else prepararParte(B.PARTES[parte] ? parte : 'fila');
  }

  Object.assign(api, { enfileirar, tocar, reiniciar, banco: () => banco });
  window.Simulador = api;
})();
