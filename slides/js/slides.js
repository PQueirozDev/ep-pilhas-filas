/*
 * slides.js
 * ---------
 * Navegação dos slides e mini animações ("cenas") de fila, pilha, agenda e
 * lista encadeada. Cada cena é um roteiro de passos; cada passo muda a lista
 * de itens e a cena reposiciona tudo com transform (a transição fica no CSS).
 */
(function () {
  'use strict';

  const slides = Array.from(document.querySelectorAll('.slide'));
  const $ = id => document.getElementById(id);
  const celular = window.matchMedia('(max-width: 900px)');
  const movimentoReduzido = window.matchMedia('(prefers-reduced-motion: reduce)');
  const INTERVALO = 1300;
  let atual = 0;

  /* ---------------- Motor das cenas ---------------- */
  function criarCena(el, cfg) {
    const legenda = document.createElement('p');
    legenda.className = 'legenda';
    el.appendChild(legenda);
    (cfg.fixos || []).forEach(f => {
      const s = document.createElement('span');
      s.className = 'fixo'; s.textContent = f.texto;
      Object.assign(s.style, f.estilo);
      el.appendChild(s);
    });
    const dom = new Map();
    let itens = [], passo = 0, timer = null, pausada = false;

    /* Botão de pausar / repetir (a cena também para sozinha com movimento reduzido) */
    const botao = document.createElement('button');
    botao.type = 'button';
    botao.className = 'pausa';
    el.appendChild(botao);
    function rotularBotao() {
      const parada = pausada || !timer;
      botao.innerHTML = '<i class="ph ' + (parada ? 'ph-play' : 'ph-pause') + '" aria-hidden="true"></i>';
      botao.setAttribute('aria-label', parada ? 'Reproduzir animação' : 'Pausar animação');
    }
    botao.addEventListener('click', () => {
      if (timer) { clearTimeout(timer); timer = null; pausada = true; }
      else { pausada = false; if (passo >= cfg.roteiro.length) zerar(); timer = setTimeout(tique, 300); }
      rotularBotao();
    });

    const estado = {
      get itens() { return itens; },
      set itens(v) { itens = v; },
      add(item) { itens.push(item); },
      tirarPrimeiro() { itens.shift(); },
      tirarUltimo() { itens.pop(); },
      marcar(ids, classe) { itens.forEach(it => { if (ids.includes(it.id)) it.classe = classe; }); },
      legenda(texto, erro) { legenda.textContent = texto || ''; legenda.className = 'legenda' + (erro ? ' erro' : ''); }
    };

    function desenhar() {
      const largura = el.clientWidth;
      itens.forEach((it, i) => {
        let d = dom.get(it.id);
        if (!d) {
          d = document.createElement('div');
          d.style.opacity = '0';
          d.style.transform = cfg.entrada(i, largura, it);
          el.appendChild(d);
          dom.set(it.id, d);
          void d.offsetWidth;                 /* aplica a posição inicial antes da transição */
        }
        d.className = 'item ' + (it.classe || '');
        d.textContent = it.texto;
        d.style.opacity = '1';
        d.style.transform = cfg.posicao(i, largura, it);
        d._i = i;
      });
      dom.forEach((d, id) => {
        if (itens.some(x => x.id === id)) return;
        dom.delete(id);
        d.style.opacity = '0';
        d.style.transform = cfg.saida(d._i, largura);
        setTimeout(() => d.remove(), 700);
      });
    }

    function zerar() {
      itens = cfg.inicial ? cfg.inicial() : [];
      passo = 0;
      estado.legenda('');
      dom.forEach(d => d.remove());
      dom.clear();
      desenhar();
    }

    function tique() {
      if (passo < cfg.roteiro.length) {
        cfg.roteiro[passo++](estado);
        desenhar();
        timer = setTimeout(tique, INTERVALO);
      } else if (movimentoReduzido.matches) {
        timer = null;                          /* roda uma vez e para */
      } else {
        timer = setTimeout(() => { zerar(); timer = setTimeout(tique, 600); }, INTERVALO * 1.6);
      }
      rotularBotao();
    }

    return {
      iniciar() { if (timer || pausada) return; zerar(); timer = setTimeout(tique, 700); rotularBotao(); },
      parar() { clearTimeout(timer); timer = null; pausada = false; zerar(); rotularBotao(); }
    };
  }

  const xy = (x, y) => 'translate(' + Math.round(x) + 'px,' + Math.round(y) + 'px)';
  const larguraFila = w => Math.min(152, (w - 32) / 3);
  const larguraNo = w => Math.min(128, (w - 104 - 56) / 3);

  const CENAS = {
    fila: {
      posicao: (i, w) => xy(16 + i * larguraFila(w), 24),
      entrada: (i, w) => xy(16 + (i + 1) * larguraFila(w) + 40, 24),
      saida: (i, w) => xy(16 - larguraFila(w), 24),
      roteiro: [
        s => { s.add({ id: 1, texto: '#1 saque 40' }); s.legenda('#1 entra no fim da fila'); },
        s => { s.add({ id: 2, texto: '#2 saque 30' }); s.legenda('#2 entra atrás do #1'); },
        s => { s.add({ id: 3, texto: '#3 transf. 150' }); s.legenda('Três pedidos esperando, na ordem de chegada'); },
        s => { s.marcar([1], 'ok'); s.legenda('#1 é atendido primeiro: Carla tem R$ 50'); },
        s => { s.tirarPrimeiro(); s.legenda('Efetivado. Carla fica com R$ 10'); },
        s => { s.marcar([2], 'erro'); s.legenda('#2 precisa de R$ 30: saldo insuficiente', true); },
        s => { s.tirarPrimeiro(); s.legenda('Recusado e registrado no histórico', true); },
        s => { s.marcar([3], 'ok'); s.legenda('#3: Ana tem saldo, efetivada'); },
        s => { s.tirarPrimeiro(); s.legenda('Fila vazia de novo'); }
      ]
    },
    pilha: {
      posicao: i => xy(16, 248 - 56 - i * 48),
      entrada: i => xy(16, 248 - 56 - i * 48 - 80),
      saida: i => xy(16, 248 - 56 - i * 48 - 80),
      roteiro: [
        s => { s.add({ id: 1, texto: '#1 saque 40' }); s.legenda('Efetivada: #1 vai para o topo'); },
        s => { s.add({ id: 3, texto: '#3 transferência 150' }); s.legenda('#3 vira o novo topo'); },
        s => { s.marcar([3], 'foco'); s.legenda('Estornar: sai sempre o topo'); },
        s => { s.tirarUltimo(); s.legenda('#3 desfeita: o dinheiro volta para Ana'); },
        s => { s.marcar([1], 'foco'); s.legenda('Estornar de novo: agora o topo é #1'); },
        s => { s.tirarUltimo(); s.legenda('#1 desfeita'); },
        s => { s.legenda('Pilha vazia: "Nada a estornar."', true); }
      ]
    },
    agenda: {
      posicao: i => xy(16, 16 + i * 44),
      entrada: i => xy(64, 16 + i * 44),
      saida: i => xy(-80, 16 + i * 44),
      roteiro: [
        s => { s.add({ id: 4, data: 10, texto: '#4 · 10/11 · R$ 100' }); s.legenda('#4 entra no fim do vetor'); },
        s => { s.add({ id: 5, data: 8, texto: '#5 · 08/11 · R$ 50' }); s.legenda('#5 entra no fim, fora de ordem'); },
        s => { ordenar(s); s.marcar([5], 'foco'); s.legenda('qsort: 08/11 vem antes de 10/11'); },
        s => { s.marcar([5], ''); s.add({ id: 6, data: 10, texto: '#6 · 10/11 · R$ 30' }); s.legenda('#6 também é para 10/11'); },
        s => { ordenar(s); s.marcar([4, 6], 'foco'); s.legenda('Empate na data: #4 entrou antes, fica na frente'); },
        s => { s.marcar([4, 6], ''); s.add({ id: 7, data: 12, texto: '#7 · 12/11 · R$ 20' }); s.legenda('#7 é a data mais distante'); },
        s => { s.marcar([5], 'ok'); s.legenda('Chegou 08/11: executa o primeiro da agenda'); },
        s => { s.tirarPrimeiro(); s.marcar([4], 'ok'); s.legenda('Chegou 10/11: primeiro #4...'); },
        s => { s.tirarPrimeiro(); s.marcar([6], 'ok'); s.legenda('...depois #6, na ordem de entrada'); },
        s => { s.tirarPrimeiro(); s.legenda('Só falta #7, para 12/11'); }
      ]
    },
    lista: {
      fixos: [{ texto: 'h->inicio', estilo: { left: '16px', top: '42px' } }],
      inicial: () => [{ id: 'nulo', texto: 'NULL', classe: 'nulo' }],
      posicao: (i, w) => xy(104 + i * larguraNo(w), 32),
      entrada: (i, w) => xy(104 + i * larguraNo(w), 48),
      saida: (i, w) => xy(104 + i * larguraNo(w), 16),
      roteiro: [
        s => { inserir(s, { id: 1, texto: 'EFETIVADA #1', classe: 'no-lista' }); s.legenda('malloc cria o 1º nó; inicio aponta para ele'); },
        s => { inserir(s, { id: 2, texto: 'RECUSADA #2', classe: 'no-lista' }); s.legenda('O antigo último passa a apontar para o novo'); },
        s => { inserir(s, { id: 3, texto: 'ESTORNADA #3', classe: 'no-lista' }); s.legenda('Sem limite fixo: cresce nó por nó'); },
        s => { s.legenda('Ao sair do programa: free em cada nó'); },
        s => { s.tirarPrimeiro(); },
        s => { s.tirarPrimeiro(); },
        s => { s.tirarPrimeiro(); s.legenda('Memória devolvida: inicio = NULL'); }
      ]
    }
  };
  function ordenar(s) { s.itens.sort((a, b) => a.data - b.data || a.id - b.id); }
  function inserir(s, item) { s.itens.splice(s.itens.length - 1, 0, item); }   /* antes do NULL */

  const cenas = new Map();
  document.querySelectorAll('[data-cena]').forEach(el => cenas.set(el, criarCena(el, CENAS[el.dataset.cena])));

  /* Fluxo do slide 3: uma "ficha" percorre os nós */
  function criarFluxo(slide) {
    const partes = Array.from(slide.querySelectorAll('[data-fluxo] > *'));
    const nos = partes.filter(p => p.classList.contains('no'));
    let k = 0, timer = null;
    function tique() {
      partes.forEach(p => p.classList.remove('aceso'));
      const no = nos[k], seta = no.previousElementSibling;
      no.classList.add('aceso');
      if (seta) seta.classList.add('aceso');
      const fimDaLinha = !no.nextElementSibling;
      k = (k + 1) % nos.length;
      timer = setTimeout(tique, fimDaLinha ? 1400 : 700);
    }
    return {
      iniciar() { if (!timer) { k = 0; timer = setTimeout(tique, 600); } },
      parar() { clearTimeout(timer); timer = null; partes.forEach(p => p.classList.remove('aceso')); }
    };
  }
  const fluxos = new Map();
  slides.forEach(s => { if (s.querySelector('[data-fluxo]')) fluxos.set(s, criarFluxo(s)); });

  function animacoesDe(slide) {
    const lista = Array.from(slide.querySelectorAll('[data-cena]')).map(el => cenas.get(el));
    if (fluxos.has(slide)) lista.push(fluxos.get(slide));
    return lista;
  }

  /* Entrada em cascata: cada bloco recebe seu índice */
  slides.forEach(s => {
    Array.from(s.children).forEach((c, i) => c.style.setProperty('--i', i));
    s.querySelectorAll('.grade').forEach(g => Array.from(g.children).forEach((c, i) => c.style.setProperty('--i', i + 2)));
  });

  /* ---------------- Navegação ---------------- */
  const pontos = $('pontos');
  slides.forEach((s, i) => {
    const b = document.createElement('button');
    b.type = 'button';
    b.setAttribute('aria-label', 'Ir para o slide ' + (i + 1) + ': ' + s.getAttribute('aria-label'));
    b.addEventListener('click', () => mostrar(i));
    pontos.appendChild(b);
  });

  function mostrar(indice) {
    atual = Math.max(0, Math.min(slides.length - 1, indice));
    slides.forEach((s, i) => {
      const ativo = i === atual;
      s.classList.toggle('ativo', ativo);
      s.setAttribute('aria-hidden', ativo ? 'false' : 'true');
      s.inert = !ativo;
      animacoesDe(s).forEach(a => (ativo ? a.iniciar() : a.parar()));
    });
    Array.from(pontos.children).forEach((b, i) => b.setAttribute('aria-current', i === atual ? 'step' : 'false'));
    $('contador').textContent = (atual + 1) + ' / ' + slides.length;
    $('barra').style.transform = 'scaleX(' + ((atual + 1) / slides.length) + ')';
    document.documentElement.style.setProperty('--cor-slide', slides[atual].dataset.cor || 'var(--text)');
    history.replaceState(null, '', '#' + (atual + 1));
  }

  /* Visão geral (tecla O) */
  const visao = $('visao');
  slides.forEach((s, i) => {
    const b = document.createElement('button');
    b.type = 'button';
    b.style.setProperty('--i', i);
    b.innerHTML = '<small>' + String(i + 1).padStart(2, '0') + '</small>';
    b.appendChild(document.createTextNode(s.getAttribute('aria-label')));
    b.addEventListener('click', () => { mostrar(i); alternarVisao(false); });
    visao.appendChild(b);
  });
  /* Fechada, a visão geral fica inerte (fora do Tab e do leitor de tela);
   * aberta, o resto da página é que fica inerte. */
  let focoAntes = null;
  visao.inert = true;
  function alternarVisao(abrir) {
    visao.classList.toggle('aberta', abrir);
    visao.inert = !abrir;
    document.querySelectorAll('main, nav.barra-nav').forEach(el => { el.inert = abrir; });
    Array.from(visao.children).forEach((b, i) => b.setAttribute('aria-current', String(i === atual)));
    if (abrir) {
      focoAntes = document.activeElement;
      visao.children[atual].focus();
    } else if (focoAntes && focoAntes.isConnected) {
      focoAntes.focus();
    }
  }

  $('anterior').addEventListener('click', () => mostrar(atual - 1));
  $('proximo').addEventListener('click', () => mostrar(atual + 1));
  document.querySelectorAll('[data-ir]').forEach(b => b.addEventListener('click', () => mostrar(Number(b.dataset.ir))));
  document.addEventListener('keydown', e => {
    if (celular.matches || e.ctrlKey || e.metaKey || e.altKey) return;
    const aberta = visao.classList.contains('aberta');
    if (e.key === 'o' || e.key === 'O') { alternarVisao(!aberta); return; }
    if (e.key === 'Escape' && aberta) { alternarVisao(false); return; }
    if (aberta) return;
    /* Espaço e Enter num botão ou link focado devem acionar o controle, não trocar de slide */
    if (e.target.closest('button, a, input, textarea, select, [contenteditable]') && [' ', 'Enter'].includes(e.key)) return;
    if (e.key === 's' || e.key === 'S') { location.href = 'simulador.html'; return; }
    if (['ArrowRight', 'PageDown', ' '].includes(e.key)) { e.preventDefault(); mostrar(atual + 1); }
    if (['ArrowLeft', 'PageUp'].includes(e.key)) { e.preventDefault(); mostrar(atual - 1); }
    if (e.key === 'Home') mostrar(0);
    if (e.key === 'End') mostrar(slides.length - 1);
  });

  /* No celular os slides viram uma página rolável: anima quando aparece */
  function modoCelular() {
    slides.forEach(s => { s.inert = false; s.removeAttribute('aria-hidden'); });
    const io = new IntersectionObserver(entradas => entradas.forEach(en => {
      if (en.isIntersecting) {
        en.target.classList.add('ativo');
        animacoesDe(en.target).forEach(a => a.iniciar());
      } else {
        animacoesDe(en.target).forEach(a => a.parar());
      }
    }), { threshold: 0.25 });
    slides.forEach(s => io.observe(s));
  }

  const slideDaUrl = () => {
    const n = parseInt(location.hash.slice(1), 10);
    return Number.isFinite(n) ? n - 1 : 0;
  };
  if (celular.matches) {
    modoCelular();
  } else {
    mostrar(slideDaUrl());
    window.addEventListener('hashchange', () => { if (slideDaUrl() !== atual) mostrar(slideDaUrl()); });
  }
  /* Os dois modos montam a página de jeitos diferentes: ao cruzar o limite, recarrega */
  celular.addEventListener('change', () => location.reload());
})();
