/*
 * simulador.js
 * ------------
 * Tela do simulador. O motor (banco.js) executa cada comando e devolve
 * passos com uma "foto" do estado. Aqui tocamos os passos em sequência:
 * desenhamos a foto e animamos o que mudou (técnica FLIP: medimos onde cada
 * ficha estava, desenhamos o novo estado e animamos do lugar antigo ao novo).
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
  const elementos = new Map();                  /* chave -> elemento (fichas e nós) */
  let fnAtual = null, hojeAtual = null;

  const duracao = () => (movimentoReduzido.matches || pulando) ? 0 : Math.round(520 / velocidade);

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
  function htmlFicha(op, tag, extra) {
    return '<span class="tag">' + tag + '</span>' +
      '<div class="l1"><span class="num">#' + op.numero + '</span><span class="tipo">' + (B.NOME_CURTO[op.tipo] || '?') + '</span></div>' +
      '<div class="valor">' + B.reais(op.valor) + '</div>' +
      '<div class="rota">' + rota(op) + '</div>' + (extra || '');
  }
  const CLASSE_SIT = { 1: 'ok', 2: 'erro', 3: 'estorno', 4: 'agenda', 5: 'agenda', 6: 'ok', 7: 'erro' };
  function htmlNo(h) {
    return '<div class="caixa"><span class="sit">' + esc(B.NOME_SIT[h.situacao].trim()) + '</span>' +
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

    colocar($('fila'), foto.fila.map(({ indice, op }) =>
      ({ chave: 'op' + op.numero, classe: 'ficha', html: htmlFicha(op, 'itens[' + indice + ']') })));
    colocar($('op'), foto.emMaos ? [{ chave: 'op' + foto.emMaos.numero, classe: 'ficha', html: htmlFicha(foto.emMaos, 'op') }] : []);
    colocar($('pilha'), foto.pilha.map((op, i, a) =>
      ({ chave: 'op' + op.numero, classe: 'ficha', html: htmlFicha(op, (i === a.length - 1 ? 'TOPO · ' : '') + 'itens[' + i + ']') })));
    colocar($('agenda'), foto.agenda.map((op, i) =>
      ({ chave: 'op' + op.numero, classe: 'ficha', html: htmlFicha(op, (i === 0 ? 'próximo · ' : '') + 'itens[' + i + ']', '<span class="quando">' + dataCurta(op.data) + '</span>') })));
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
      } else if (D && velho) {
        const novo = el.getBoundingClientRect();
        const k = palco().k, dx = (velho.left - novo.left) / k, dy = (velho.top - novo.top) / k;
        if (Math.abs(dx) > 0.5 || Math.abs(dy) > 0.5) {
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
    if (!D || !rect) return;
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

  function narrar(p) {
    $('narCmd').textContent = p.titulo + ' · passo ' + (p.i + 1) + ' de ' + p.total;
    $('narTexto').textContent = p.legenda;
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
  function enfileirar(titulo, passos) {
    passos.forEach((p, i) => filaPassos.push({ ...p, titulo, i, total: passos.length }));
  }
  function executar(titulo, passos) {
    enfileirar(titulo, passos);
    tocar();
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
    if (p.i === 0) escrever(p.titulo, 'cmd');
    desenhar(p.foto, true);
    focar(p);
    mostrarCodigo(p.fn, p.linha, p.tom);
    narrar(p);
    p.log.forEach(l => escrever(l.replace(/^ {2}/, ''), classeLog(l)));
  }

  function aguardar(p) {
    if (pulando) return Promise.resolve();
    return new Promise(resolve => {
      liberar = () => { clearTimeout(timer); timer = null; liberar = null; atualizarBotoes(); resolve(); };
      const ms = api.tempoDoPasso ? api.tempoDoPasso(p) : INTERVALO;
      /* No filme não há botão de próximo passo: sempre avança sozinho */
      if (FILME || !$('modoPasso').checked) timer = setTimeout(liberar, ms / velocidade);
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

  function rodarRoteiro(nome) {
    reiniciar();
    /* Enfileira o roteiro inteiro antes de tocar, para nenhum comando ser atropelado */
    B.ROTEIROS[nome].comandos.forEach(c => enfileirar(c.titulo, c.run(banco)));
    tocar();
  }

  /* ---------------- Formulários ---------------- */
  /* Cada campo ganha uma mensagem de erro ligada a ele (aria-describedby) */
  function prepararErros() {
    document.querySelectorAll('.campo input').forEach(input => {
      let msg = input.parentElement.querySelector('.dica-erro');
      if (!msg) {
        msg = document.createElement('span');
        msg.className = 'dica-erro';
        input.parentElement.appendChild(msg);
      }
      msg.id = 'erro-' + input.id;
      msg.setAttribute('aria-live', 'polite');
      input.setAttribute('aria-describedby', msg.id);
    });
  }
  function erroCampo(input, msg) {
    $('erro-' + input.id).textContent = msg || '';
    if (msg) { input.setAttribute('aria-invalid', 'true'); input.focus(); }
    else input.removeAttribute('aria-invalid');
  }
  /* Igual ao banco.exe: aceita 150, 150.50 ou 150,50 (e "nan", que o motor recusa) */
  function lerValor(input) {
    const t = input.value.trim().replace(',', '.');
    erroCampo(input, '');
    if (/^[+-]?nan$/i.test(t)) return NaN;
    if (/^[+-]?inf(inity)?$/i.test(t)) return t.startsWith('-') ? -Infinity : Infinity;
    if (!/^[+-]?(\d+(\.\d*)?|\.\d+)([eE][+-]?\d+)?$/.test(t)) {
      erroCampo(input, 'Digite um número, como 150 ou 150,50.');
      return null;
    }
    return Number(t);
  }
  /* Igual a lerInteiro do C: só aceita um número inteiro inteiro, sem casas */
  function lerInteiro(input) {
    const t = input.value.trim();
    erroCampo(input, '');
    if (!/^[+-]?\d{1,9}$/.test(t)) { erroCampo(input, 'Digite um número inteiro.'); return null; }
    return Number(t);
  }
  /* Igual a dataExiste do C: ano entre 1900 e 2999 */
  function lerData(input) {
    erroCampo(input, '');
    const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(input.value);
    if (!m) { erroCampo(input, 'Escolha uma data.'); return null; }
    if (Number(m[1]) < 1900 || Number(m[1]) > 2999) { erroCampo(input, 'Use um ano entre 1900 e 2999.'); return null; }
    return Number(m[1] + m[2] + m[3]);
  }

  let tipo = B.TIPO_DEPOSITO;
  function escolherTipo(t) {
    tipo = t;
    document.querySelectorAll('.tipos button').forEach(b => b.setAttribute('aria-pressed', String(Number(b.dataset.tipo) === t)));
    $('campoOrigem').hidden = t === B.TIPO_DEPOSITO;
    $('campoDestino').hidden = !(t === B.TIPO_DEPOSITO || t === B.TIPO_TRANSFERENCIA);
  }

  function ligar() {
    document.querySelectorAll('.tipos button').forEach(b => b.addEventListener('click', () => escolherTipo(Number(b.dataset.tipo))));

    $('formPedido').addEventListener('submit', e => {
      e.preventDefault();
      /* Só lê as contas que aparecem para o tipo escolhido */
      const o = $('campoOrigem').hidden ? 0 : lerInteiro($('origem'));
      if (o === null) return;
      const d = $('campoDestino').hidden ? 0 : lerInteiro($('destino'));
      if (d === null) return;
      const valor = lerValor($('valor'));
      if (valor === null) return;
      let alvo = '';
      if (tipo === B.TIPO_DEPOSITO) alvo = ' na conta ' + d;
      else if (tipo === B.TIPO_TRANSFERENCIA) alvo = ' da conta ' + o + ' para a ' + d;
      else alvo = ' da conta ' + o;
      executar('Opção ' + tipo + ': ' + B.NOME_CURTO[tipo].toLowerCase() + ' de ' + $('valor').value.trim() + alvo,
        banco.solicitarOperacao(tipo, o, d, valor));
    });
    $('processar').addEventListener('click', () => {
      const P = [];
      banco.processarProximo(P);
      executar('Opção 5: processar o próximo da fila', P);
    });
    $('processarTodos').addEventListener('click', () => executar('Opção 6: processar a fila inteira', banco.processarTodos()));
    $('estornar').addEventListener('click', () => executar('Opção 7: estornar o topo da pilha', banco.estornar()));

    $('formAgendar').addEventListener('submit', e => {
      e.preventDefault();
      const conta = lerInteiro($('agConta'));
      if (conta === null) return;
      const valor = lerValor($('agValor'));
      if (valor === null) return;
      const data = lerData($('agData'));
      if (data === null) return;
      executar('Opção 8: agendar ' + $('agValor').value.trim() + ' da conta ' + conta + ' para ' + dataCurta(data),
        banco.agendarPagamento(conta, valor, data));
    });
    $('formCancelar').addEventListener('submit', e => {
      e.preventDefault();
      const n = lerInteiro($('cancNum'));
      if (n === null) return;
      executar('Opção 9: cancelar o agendado #' + n, banco.cancelarAgendamento(n));
    });
    $('formAvancar').addEventListener('submit', e => {
      e.preventDefault();
      const data = lerData($('novaData'));
      if (data === null) return;
      executar('Opção 10: avançar a data para ' + dataCurta(data), banco.avancarData(data));
    });

    $('rodarDemo').addEventListener('click', () => rodarRoteiro('demo'));
    $('rodarEstorno').addEventListener('click', () => rodarRoteiro('estornoImpossivel'));
    $('reiniciar').addEventListener('click', reiniciar);
    $('limparTerminal').addEventListener('click', () => { $('terminal').textContent = ''; });

    $('proximoPasso').addEventListener('click', () => { if (liberar) liberar(); });
    $('pularTudo').addEventListener('click', () => { pulando = true; if (liberar) liberar(); });
    $('modoPasso').addEventListener('change', e => {
      if (e.target.checked) { clearTimeout(timer); timer = null; }
      else if (liberar) liberar();
      atualizarBotoes();
    });
    document.querySelectorAll('[data-vel]').forEach(b => b.addEventListener('click', () => {
      velocidade = Number(b.dataset.vel);
      document.querySelectorAll('[data-vel]').forEach(x => x.setAttribute('aria-pressed', String(x === b)));
    }));
    document.addEventListener('keydown', e => {
      if (e.target.closest('input, textarea, select')) return;
      if ((e.key === 'n' || e.key === 'ArrowRight') && liberar) { e.preventDefault(); liberar(); }
    });
  }

  prepararErros();
  ligar();
  escolherTipo(B.TIPO_DEPOSITO);
  reiniciar();
  const pedido = new URLSearchParams(location.search).get('roteiro');
  if (!FILME && pedido && B.ROTEIROS[pedido]) rodarRoteiro(pedido);

  Object.assign(api, { enfileirar, tocar, reiniciar, banco: () => banco });
  window.Simulador = api;
})();
