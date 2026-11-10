/*
 * banco.js
 * --------
 * Espelho em JavaScript das regras de src/sistema.c, usado pelo simulador.
 * Mesmas contas, mesmas validações, mesmas mensagens do banco.exe.
 *
 * Cada comando executa na hora (o estado muda imediatamente) e devolve uma
 * LISTA DE PASSOS. Cada passo traz:
 *   foto     cópia do estado naquele instante (contas, fila, op, pilha, agenda, histórico)
 *   fn       função C que está rodando (chave de CODIGO)
 *   linha    índice da linha acesa no painel de código
 *   legenda  explicação para iniciantes
 *   log      linhas impressas no terminal (iguais às do banco.exe)
 *   tom      'ok' | 'erro' | 'info'
 *   foco     { area, chave } elemento a destacar
 * A tela só lê os passos; por isso o motor pode ser testado no Node.
 */
(function (global) {
  'use strict';

  const TIPO_DEPOSITO = 1, TIPO_SAQUE = 2, TIPO_TRANSFERENCIA = 3, TIPO_PAGAMENTO = 4;
  const SEM_CONTA = 0;
  const SIT_EFETIVADA = 1, SIT_RECUSADA = 2, SIT_ESTORNADA = 3, SIT_AGENDADA = 4,
        SIT_CANCELADA = 5, SIT_AGENDADO_PAGO = 6, SIT_AGENDADO_RECUSADO = 7;
  const CAPACIDADE_FILA = 50, CAPACIDADE_PILHA = 100, CAPACIDADE_AGENDA = 50;
  const MEIO_CENTAVO = 0.005, VALOR_MAXIMO = 1000000.00;
  const DATA_INICIAL = 20261105;

  const NOME_TIPO = { 1: 'DEPÓSITO     ', 2: 'SAQUE        ', 3: 'TRANSFERÊNCIA', 4: 'PAGAMENTO    ' };
  const NOME_CURTO = { 1: 'Depósito', 2: 'Saque', 3: 'Transferência', 4: 'Pagamento' };
  const NOME_SIT = {
    1: 'EFETIVADA         ', 2: 'RECUSADA (saldo)  ', 3: 'ESTORNADA         ',
    4: 'AGENDADA          ', 5: 'AGEND. CANCELADA  ', 6: 'AGENDADO PAGO     ',
    7: 'AGEND. RECUSADO   '
  };

  /* ---------------- Código C mostrado no painel ---------------- */
  const CODIGO = {
    solicitarOperacao: { arquivo: 'sistema.c', linhas: [
      'int solicitarOperacao(Sistema *s, int tipo, int origem,',
      '                      int destino, double valor)',
      '{',
      '    if (!valorValido(valor))       return RES_VALOR_INVALIDO;',
      '    valor = arredondarCentavos(valor);',
      '    precisaOrigem  = (tipo == TIPO_SAQUE || tipo == TIPO_TRANSFERENCIA ||',
      '                      tipo == TIPO_PAGAMENTO);',
      '    precisaDestino = (tipo == TIPO_DEPOSITO || tipo == TIPO_TRANSFERENCIA);',
      '    if ((precisaOrigem && buscarConta(s, origem) == NULL) ||',
      '        (precisaDestino && buscarConta(s, destino) == NULL))',
      '        return RES_CONTA_INVALIDA;',
      '    if (!precisaOrigem)  origem  = SEM_CONTA;   /* ignora conta que não se aplica */',
      '    if (!precisaDestino) destino = SEM_CONTA;',
      '    if (tipo == TIPO_TRANSFERENCIA && origem == destino)',
      '        return RES_MESMA_CONTA;',
      '    if (filaCheia(&s->pedidos))    return RES_FILA_CHEIA;',
      '',
      '    op = criarOperacao(s->proximoNumero, tipo, origem, destino, valor);',
      '    s->proximoNumero++;',
      '    enfileirar(&s->pedidos, op);',
      '    return RES_OK;',
      '}'] },
    enfileirar: { arquivo: 'fila.c', linhas: [
      'int enfileirar(Fila *f, Operacao op)',
      '{',
      '    int fim;',
      '',
      '    if (filaCheia(f)) {',
      '        return 0;',
      '    }',
      '    fim = (f->inicio + f->quantidade) % CAPACIDADE_FILA;  /* 1ª posição livre */',
      '    f->itens[fim] = op;',
      '    f->quantidade++;',
      '    return 1;',
      '}'] },
    processarProximo: { arquivo: 'sistema.c', linhas: [
      'int processarProximo(Sistema *s)',
      '{',
      '    if (filaVazia(&s->pedidos)) {',
      '        printf("  Nenhum pedido na fila.\\n");',
      '        return RES_FILA_VAZIA;',
      '    }',
      '    if (pilhaCheia(&s->efetivadas)) {     /* sem espaço para o estorno */',
      '        return RES_PILHA_CHEIA;           /* o pedido espera na fila  */',
      '    }',
      '    desenfileirar(&s->pedidos, &op);         /* FIFO: sai o mais antigo */',
      '    resultado = aplicarOperacao(s, op);',
      '',
      '    if (resultado == RES_OK) {',
      '        empilhar(&s->efetivadas, op);        /* LIFO: vira o novo topo  */',
      '        registrarHistorico(&s->historico, op, SIT_EFETIVADA, s->hoje);',
      '    } else {',
      '        registrarHistorico(&s->historico, op, SIT_RECUSADA, s->hoje);',
      '    }',
      '    return resultado;',
      '}'] },
    desenfileirar: { arquivo: 'fila.c', linhas: [
      'int desenfileirar(Fila *f, Operacao *saida)',
      '{',
      '    if (filaVazia(f)) {',
      '        return 0;',
      '    }',
      '    *saida = f->itens[f->inicio];                    /* copia o primeiro       */',
      '    f->inicio = (f->inicio + 1) % CAPACIDADE_FILA;   /* o segundo vira primeiro */',
      '    f->quantidade--;',
      '    return 1;',
      '}'] },
    aplicarOperacao: { arquivo: 'sistema.c', linhas: [
      'int aplicarOperacao(Sistema *s, Operacao op)',
      '{',
      '    Conta *origem  = buscarConta(s, op.contaOrigem);',
      '    Conta *destino = buscarConta(s, op.contaDestino);',
      '',
      '    if (origem != NULL && origem->saldo + MEIO_CENTAVO < op.valor) {',
      '        return RES_SALDO_INSUFICIENTE;          /* caso extremo: sem saldo */',
      '    }',
      '    if (origem != NULL)  origem->saldo  -= op.valor;',
      '    if (destino != NULL) destino->saldo += op.valor;',
      '    return RES_OK;',
      '}'] },
    empilhar: { arquivo: 'pilha.c', linhas: [
      'int empilhar(Pilha *p, Operacao op)',
      '{',
      '    if (pilhaCheia(p)) {',
      '        return 0;',
      '    }',
      '    p->itens[p->quantidade] = op;   /* grava na primeira posição livre (novo topo) */',
      '    p->quantidade++;',
      '    return 1;',
      '}'] },
    desempilhar: { arquivo: 'pilha.c', linhas: [
      'int desempilhar(Pilha *p, Operacao *saida)',
      '{',
      '    if (pilhaVazia(p)) {',
      '        return 0;                /* caso extremo: nada a estornar */',
      '    }',
      '    p->quantidade--;                 /* o topo passa a ser o item de baixo...   */',
      '    *saida = p->itens[p->quantidade];/* ...e copiamos o antigo topo para *saida */',
      '    return 1;',
      '}'] },
    estornar: { arquivo: 'sistema.c', linhas: [
      'int estornar(Sistema *s)',
      '{',
      '    if (!desempilhar(&s->efetivadas, &op)) {',
      '        printf("  Nada a estornar.\\n");      /* caso extremo: pilha vazia */',
      '        return RES_NADA_A_ESTORNAR;',
      '    }',
      '    if (desfazerOperacao(s, op) != RES_OK) {',
      '        empilhar(&s->efetivadas, op);        /* devolve ao topo: nada mudou */',
      '        return RES_ESTORNO_IMPOSSIVEL;',
      '    }',
      '    registrarHistorico(&s->historico, op, SIT_ESTORNADA, s->hoje);',
      '    return RES_OK;',
      '}'] },
    desfazerOperacao: { arquivo: 'sistema.c', linhas: [
      'int desfazerOperacao(Sistema *s, Operacao op)',
      '{',
      '    Conta *origem  = buscarConta(s, op.contaOrigem);',
      '    Conta *destino = buscarConta(s, op.contaDestino);',
      '',
      '    if (destino != NULL && destino->saldo + MEIO_CENTAVO < op.valor) {',
      '        return RES_ESTORNO_IMPOSSIVEL;',
      '    }',
      '    if (destino != NULL) destino->saldo -= op.valor;',
      '    if (origem != NULL)  origem->saldo  += op.valor;',
      '    return RES_OK;',
      '}'] },
    agendarPagamento: { arquivo: 'sistema.c', linhas: [
      'int agendarPagamento(Sistema *s, int conta, double valor, int data)',
      '{',
      '    if (!valorValido(valor))         return RES_VALOR_INVALIDO;',
      '    valor = arredondarCentavos(valor);',
      '    if (buscarConta(s, conta) == NULL) return RES_CONTA_INVALIDA;',
      '    if (data <= s->hoje)             return RES_DATA_INVALIDA;',
      '    if (agendaCheia(&s->agendados))  return RES_AGENDA_CHEIA;',
      '',
      '    op = criarOperacao(s->proximoNumero, TIPO_PAGAMENTO, conta, SEM_CONTA, valor);',
      '    op.data = data;',
      '    s->proximoNumero++;',
      '    agendar(&s->agendados, op);',
      '    registrarHistorico(&s->historico, op, SIT_AGENDADA, s->hoje);',
      '    return RES_OK;',
      '}'] },
    agendar: { arquivo: 'agendados.c', linhas: [
      'int agendar(Agenda *a, Operacao op)',
      '{',
      '    if (agendaCheia(a)) {',
      '        return 0;',
      '    }',
      '    a->itens[a->quantidade] = op;   /* coloca no fim...           */',
      '    a->quantidade++;',
      '    /* ...e reordena: vetor, quantos itens, tamanho de cada, comparação */',
      '    qsort(a->itens, a->quantidade, sizeof(Operacao), compararAgendados);',
      '    return 1;',
      '}'] },
    compararAgendados: { arquivo: 'agendados.c', linhas: [
      'int compararAgendados(const void *a, const void *b)',
      '{',
      '    const Operacao *x = (const Operacao *) a;',
      '    const Operacao *y = (const Operacao *) b;',
      '',
      '    /* 1º critério: data mais cedo vem antes */',
      '    if (x->data < y->data) return -1;',
      '    if (x->data > y->data) return 1;',
      '',
      '    /* 2º critério (desempate): quem entrou antes vem antes */',
      '    if (x->numero < y->numero) return -1;',
      '    if (x->numero > y->numero) return 1;',
      '    return 0;',
      '}'] },
    cancelarAgendado: { arquivo: 'agendados.c', linhas: [
      'int cancelarAgendado(Agenda *a, int numero, Operacao *cancelado)',
      '{',
      '    int i;',
      '    for (i = 0; i < a->quantidade; i++) {',
      '        if (a->itens[i].numero == numero) {',
      '            *cancelado = a->itens[i];',
      '            removerPosicao(a, i);',
      '            return 1;',
      '        }',
      '    }',
      '    return 0;   /* não está na agenda */',
      '}'] },
    avancarData: { arquivo: 'sistema.c', linhas: [
      'int avancarData(Sistema *s, int novaData)',
      '{',
      '    if (novaData <= s->hoje) {',
      '        return RES_DATA_INVALIDA;',
      '    }',
      '    s->hoje = novaData;',
      '',
      '    /* A agenda está ordenada: retiramos do primeiro em diante */',
      '    while (retirarVencido(&s->agendados, s->hoje, &op)) {',
      '        if (aplicarOperacao(s, op) == RES_OK)',
      '            registrarHistorico(..., SIT_AGENDADO_PAGO, op.data);',
      '        else',
      '            registrarHistorico(..., SIT_AGENDADO_RECUSADO, op.data);',
      '        /* Repare: agendados NÃO são empilhados (não entram no estorno) */',
      '    }',
      '    return RES_OK;',
      '}'] },
    registrarHistorico: { arquivo: 'historico.c', linhas: [
      'int registrarHistorico(Historico *h, Operacao op, int situacao, int data)',
      '{',
      '    NoHistorico *novo = (NoHistorico *) malloc(sizeof(NoHistorico));',
      '    if (novo == NULL) {',
      '        return 0;',
      '    }',
      '    novo->op = op;',
      '    novo->situacao = situacao;',
      '    novo->data = data;',
      '    novo->proximo = NULL;          /* será o último: não aponta para ninguém */',
      '',
      '    if (h->inicio == NULL) {       /* lista vazia: o novo é o primeiro e o último */',
      '        h->inicio = novo;',
      '    } else {',
      '        h->fim->proximo = novo;    /* o antigo último passa a apontar para o novo */',
      '    }',
      '    h->fim = novo;',
      '    h->quantidade++;',
      '    return 1;',
      '}'] }
  };

  /* Índice da primeira linha da função que contém o trecho. */
  function L(fn, trecho) {
    const i = CODIGO[fn].linhas.findIndex(l => l.includes(trecho));
    if (i < 0) throw new Error('Linha não encontrada: ' + fn + ' / ' + trecho);
    return i;
  }

  /* ---------------- Formatação igual ao printf do C ---------------- */
  function f2(v) { return v.toFixed(2); }
  function pad(texto, largura) { return String(texto).padStart(largura, ' '); }
  function textoData(d) {
    const dd = String(d % 100).padStart(2, '0');
    const mm = String(Math.floor(d / 100) % 100).padStart(2, '0');
    return dd + '/' + mm + '/' + String(Math.floor(d / 10000)).padStart(4, '0');
  }
  function textoOperacao(op) {
    let t = '#' + op.numero + ' ' + (NOME_TIPO[op.tipo] || 'DESCONHECIDO ') + '  R$ ' + pad(f2(op.valor), 8);
    if (op.contaOrigem !== SEM_CONTA && op.contaDestino !== SEM_CONTA) {
      t += '  (conta ' + op.contaOrigem + ' -> conta ' + op.contaDestino + ')';
    } else if (op.contaOrigem !== SEM_CONTA) {
      t += '  (conta ' + op.contaOrigem + ')';
    } else if (op.contaDestino !== SEM_CONTA) {
      t += '  (conta ' + op.contaDestino + ')';
    }
    if (op.data !== 0) t += '  para ' + textoData(op.data);
    return t;
  }
  function reais(v) {
    return 'R$ ' + v.toFixed(2).replace('.', ',').replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  }

  function arredondarCentavos(valor) { return Math.trunc(valor * 100 + 0.5) / 100; }

  function criarOperacao(numero, tipo, contaOrigem, contaDestino, valor) {
    return { numero, tipo, contaOrigem, contaDestino, valor, data: 0 };
  }

  /* ---------------- O banco ---------------- */
  class Banco {
    constructor(dataInicial = DATA_INICIAL) {
      this.contas = [
        { numero: 1, titular: 'Ana', saldo: 500.00 },
        { numero: 2, titular: 'Bruno', saldo: 200.00 },
        { numero: 3, titular: 'Carla', saldo: 50.00 }
      ];
      this.fila = { itens: new Array(CAPACIDADE_FILA).fill(null), inicio: 0, quantidade: 0 };
      this.pilha = [];
      this.agenda = [];
      this.historico = [];
      this.hoje = dataInicial;
      this.proximoNumero = 1;
      this.emMaos = null;      /* a variável local "op" da função C em execução */
      this.proximoNo = 1;      /* identificador visual dos nós do histórico */
    }

    buscarConta(numero) { return this.contas.find(c => c.numero === numero) || null; }

    foto() {
      const fila = [];
      for (let i = 0; i < this.fila.quantidade; i++) {
        const indice = (this.fila.inicio + i) % CAPACIDADE_FILA;
        fila.push({ indice, op: { ...this.fila.itens[indice] } });
      }
      return {
        hoje: this.hoje,
        contas: this.contas.map(c => ({ ...c })),
        fila,
        filaInicio: this.fila.inicio,
        filaQuantidade: this.fila.quantidade,
        emMaos: this.emMaos ? { ...this.emMaos } : null,
        pilha: this.pilha.map(op => ({ ...op })),
        agenda: this.agenda.map(op => ({ ...op })),
        historico: this.historico.map(h => ({ ...h, op: { ...h.op } }))
      };
    }

    passo(P, dados) {
      P.push({ tom: 'info', log: [], ...dados, foto: this.foto() });
    }

    valorValido(P, valor, fn, linha) {
      if (!(valor > 0) || valor > VALOR_MAXIMO) {
        this.passo(P, {
          fn, linha, tom: 'erro',
          legenda: 'Valor recusado antes de entrar em qualquer estrutura: precisa ser maior que zero e até R$ 1.000.000,00.',
          log: ['  Valor deve ser maior que zero e até R$ ' + f2(VALOR_MAXIMO) + '.']
        });
        return false;
      }
      return true;
    }

    registrar(P, op, situacao, data, extra) {
      const no = { id: this.proximoNo++, op: { ...op }, situacao, data };
      this.historico.push(no);
      this.passo(P, {
        fn: 'registrarHistorico', linha: L('registrarHistorico', 'h->fim = novo'),
        foco: { area: 'historico', chave: 'h' + no.id },
        legenda: 'malloc cria um nó novo e ele é ligado no fim da lista: o antigo último passa a apontar para ele.',
        ...extra
      });
    }

    /* Opções 1 a 4: pedido imediato entra na FILA */
    solicitarOperacao(tipo, origem, destino, valor) {
      const P = [];
      const fn = 'solicitarOperacao';
      if (!this.valorValido(P, valor, fn, L(fn, 'valorValido'))) return P;
      valor = arredondarCentavos(valor);

      const precisaOrigem = tipo === TIPO_SAQUE || tipo === TIPO_TRANSFERENCIA || tipo === TIPO_PAGAMENTO;
      const precisaDestino = tipo === TIPO_DEPOSITO || tipo === TIPO_TRANSFERENCIA;
      if ((precisaOrigem && !this.buscarConta(origem)) || (precisaDestino && !this.buscarConta(destino))) {
        this.passo(P, { fn, linha: L(fn, 'if ((precisaOrigem'), tom: 'erro',
          legenda: 'Só existem as contas 1, 2 e 3. Sem essa conferência, a conta 0 como origem "criaria" dinheiro do nada.',
          log: ['  Conta inexistente.'] });
        return P;
      }
      if (!precisaOrigem) origem = SEM_CONTA;
      if (!precisaDestino) destino = SEM_CONTA;
      if (tipo === TIPO_TRANSFERENCIA && origem === destino) {
        this.passo(P, { fn, linha: L(fn, 'origem == destino'), tom: 'erro',
          legenda: 'Transferir para a própria conta não faz sentido, então o pedido nem entra na fila.',
          log: ['  Origem e destino são a mesma conta.'] });
        return P;
      }
      if (this.fila.quantidade === CAPACIDADE_FILA) {
        this.passo(P, { fn, linha: L(fn, 'filaCheia'), tom: 'erro',
          legenda: 'O vetor da fila tem 50 posições e todas estão ocupadas.',
          log: ['  Fila cheia (' + CAPACIDADE_FILA + ' pedidos). Processe a fila antes.'] });
        return P;
      }

      const op = criarOperacao(this.proximoNumero, tipo, origem, destino, valor);
      this.proximoNumero++;
      this.emMaos = op;
      this.passo(P, { fn, linha: L(fn, 'criarOperacao'),
        foco: { area: 'op', chave: 'op' + op.numero },
        legenda: 'criarOperacao preenche a ficha #' + op.numero + ' (' + (NOME_CURTO[tipo] || 'operação').toLowerCase() + ' de ' + reais(valor) + '). O número de entrada guarda a ordem de chegada.' });

      const fim = (this.fila.inicio + this.fila.quantidade) % CAPACIDADE_FILA;
      this.fila.itens[fim] = op;
      this.fila.quantidade++;
      this.emMaos = null;
      this.passo(P, { fn: 'enfileirar', linha: L('enfileirar', 'f->itens[fim] = op'),
        foco: { area: 'fila', chave: 'op' + op.numero },
        legenda: 'A ficha entra no FIM da fila, em itens[' + fim + ']. Ela espera até todos que chegaram antes serem atendidos.',
        log: ['  Pedido na fila (posição ' + this.fila.quantidade + '): ' + textoOperacao(op)] });
      return P;
    }

    /* Opção 5: atende o primeiro da fila */
    processarProximo(P) {
      P = P || [];
      if (this.fila.quantidade === 0) {
        this.passo(P, { fn: 'processarProximo', linha: L('processarProximo', 'filaVazia'), tom: 'erro',
          legenda: 'Não há ninguém esperando na fila.', log: ['  Nenhum pedido na fila.'] });
        return 'vazia';
      }
      if (this.pilha.length === CAPACIDADE_PILHA) {
        this.passo(P, { fn: 'processarProximo', linha: L('processarProximo', 'pilhaCheia'), tom: 'erro',
          legenda: 'A pilha de estornos está cheia, então o pedido continua esperando na fila.',
          log: ['  Limite de ' + CAPACIDADE_PILHA + ' operações estornáveis atingido.'] });
        return 'pilhaCheia';
      }

      const indice = this.fila.inicio;
      const op = this.fila.itens[indice];
      this.fila.itens[indice] = null;
      this.fila.inicio = (this.fila.inicio + 1) % CAPACIDADE_FILA;
      this.fila.quantidade--;
      this.emMaos = op;
      this.passo(P, { fn: 'desenfileirar', linha: L('desenfileirar', '*saida = f->itens'),
        foco: { area: 'op', chave: 'op' + op.numero },
        legenda: 'FIFO: sai o primeiro da fila, itens[' + indice + ']. O início anda uma posição e o próximo passa a ser o primeiro.' });

      const ok = this.conferirEAplicar(P, op);
      if (ok) {
        this.pilha.push(op);
        this.emMaos = null;
        this.passo(P, { fn: 'empilhar', linha: L('empilhar', 'p->itens[p->quantidade] = op'),
          foco: { area: 'pilha', chave: 'op' + op.numero },
          legenda: 'Efetivada: a ficha vai para o TOPO da pilha. Se alguém pedir estorno, é ela que sai primeiro.' });
        this.registrar(P, op, SIT_EFETIVADA, this.hoje, { tom: 'ok', log: ['  [EFETIVADA] ' + textoOperacao(op)] });
        return 'ok';
      }
      this.emMaos = null;
      this.registrar(P, op, SIT_RECUSADA, this.hoje, { tom: 'erro',
        legenda: 'Recusada por saldo: nada muda nas contas e a ficha não vai para a pilha (não há o que estornar), mas fica registrada no histórico.',
        log: ['  [RECUSADA: saldo insuficiente] ' + textoOperacao(op)] });
      return 'recusada';
    }

    /* aplicarOperacao, mostrada em dois passos: conferir e mover o dinheiro */
    conferirEAplicar(P, op) {
      const origem = this.buscarConta(op.contaOrigem);
      const destino = this.buscarConta(op.contaDestino);
      const ok = !(origem && origem.saldo + MEIO_CENTAVO < op.valor);
      const fn = 'aplicarOperacao';
      if (origem) {
        this.passo(P, { fn, linha: L(fn, 'origem->saldo + MEIO_CENTAVO'), tom: ok ? 'ok' : 'erro',
          foco: { area: 'conta', chave: 'c' + origem.numero },
          legenda: origem.titular + ' tem ' + reais(origem.saldo) + ' e precisa de ' + reais(op.valor) + (ok ? ': tem saldo.' : ': saldo insuficiente.') });
      }
      if (!ok) return false;
      if (!origem && !destino) return true;   /* tipo sem contas: nada a mover */
      if (origem) origem.saldo -= op.valor;
      if (destino) destino.saldo += op.valor;
      const partes = [];
      if (origem) partes.push('sai ' + reais(op.valor) + ' de ' + origem.titular);
      if (destino) partes.push('entra em ' + destino.titular);
      this.passo(P, { fn, linha: L(fn, origem ? 'origem->saldo  -=' : 'destino->saldo +='), tom: 'ok',
        foco: { area: 'conta', chave: 'c' + (origem || destino).numero },
        legenda: 'Regra única do banco: ' + partes.join(' e ') + '.' });
      return true;
    }

    /* Opção 6 */
    processarTodos() {
      const P = [];
      if (this.fila.quantidade === 0) {
        this.passo(P, { fn: 'processarProximo', linha: L('processarProximo', 'filaVazia'), tom: 'erro',
          legenda: 'Não há ninguém esperando na fila.', log: ['  Nenhum pedido na fila.'] });
        return P;
      }
      while (this.fila.quantidade > 0) {
        if (this.processarProximo(P) === 'pilhaCheia') break;
      }
      return P;
    }

    /* Opção 7: estorno pela PILHA */
    estornar() {
      const P = [];
      if (this.pilha.length === 0) {
        this.passo(P, { fn: 'desempilhar', linha: L('desempilhar', 'pilhaVazia'), tom: 'erro',
          legenda: 'Pilha vazia: nenhuma operação foi efetivada, então não há o que desfazer.',
          log: ['  Nada a estornar.'] });
        return P;
      }
      const op = this.pilha.pop();
      this.emMaos = op;
      this.passo(P, { fn: 'desempilhar', linha: L('desempilhar', 'p->quantidade--'),
        foco: { area: 'op', chave: 'op' + op.numero },
        legenda: 'LIFO: sai o TOPO, a última operação efetivada (#' + op.numero + ').' });

      const origem = this.buscarConta(op.contaOrigem);
      const destino = this.buscarConta(op.contaDestino);
      const fn = 'desfazerOperacao';
      const ok = !(destino && destino.saldo + MEIO_CENTAVO < op.valor);
      if (destino) {
        this.passo(P, { fn, linha: L(fn, 'destino->saldo + MEIO_CENTAVO'), tom: ok ? 'ok' : 'erro',
          foco: { area: 'conta', chave: 'c' + destino.numero },
          legenda: 'Para desfazer, o dinheiro volta do destino. ' + destino.titular + ' tem ' + reais(destino.saldo) + (ok ? ', dá para devolver.' : ' e já não tem ' + reais(op.valor) + '.') });
      }
      if (!ok) {
        this.pilha.push(op);
        this.emMaos = null;
        this.passo(P, { fn: 'estornar', linha: L('estornar', 'empilhar(&s->efetivadas, op)'), tom: 'erro',
          foco: { area: 'pilha', chave: 'op' + op.numero },
          legenda: 'Estorno impossível: a ficha volta para o topo da pilha e nenhum saldo muda.',
          log: ['  Estorno impossível: a conta ' + op.contaDestino + ' já não tem R$ ' + f2(op.valor) + '.',
                '  A operação continua no topo da pilha: ' + textoOperacao(op)] });
        return P;
      }
      if (destino) destino.saldo -= op.valor;
      if (origem) origem.saldo += op.valor;
      const partes = [];
      if (destino) partes.push('sai de ' + destino.titular);
      if (origem) partes.push('volta para ' + origem.titular);
      this.passo(P, { fn, linha: L(fn, destino ? 'destino->saldo -=' : 'origem->saldo  +='), tom: 'ok',
        foco: { area: 'conta', chave: 'c' + (origem || destino).numero },
        legenda: 'O caminho inverso: ' + reais(op.valor) + ' ' + partes.join(' e ') + '. Só esta operação é desfeita; o efeito das outras continua.' });
      this.emMaos = null;
      this.registrar(P, op, SIT_ESTORNADA, this.hoje, { tom: 'ok', log: ['  [ESTORNADA] ' + textoOperacao(op)] });
      return P;
    }

    /* Opção 8: AGENDA ordenada com qsort */
    agendarPagamento(conta, valor, data) {
      const P = [];
      const fn = 'agendarPagamento';
      if (!this.valorValido(P, valor, fn, L(fn, 'valorValido'))) return P;
      valor = arredondarCentavos(valor);
      if (!this.buscarConta(conta)) {
        this.passo(P, { fn, linha: L(fn, 'buscarConta'), tom: 'erro',
          legenda: 'Só existem as contas 1, 2 e 3.', log: ['  Conta inexistente.'] });
        return P;
      }
      if (data <= this.hoje) {
        this.passo(P, { fn, linha: L(fn, 'data <= s->hoje'), tom: 'erro',
          legenda: 'A agenda é só para datas futuras. Para hoje, use o pagamento imediato (ele entra na fila).',
          log: ['  A data deve ser depois de hoje (' + textoData(this.hoje) + '). Para hoje, use o pagamento imediato.'] });
        return P;
      }
      if (this.agenda.length === CAPACIDADE_AGENDA) {
        this.passo(P, { fn, linha: L(fn, 'agendaCheia'), tom: 'erro',
          legenda: 'O vetor da agenda tem 50 posições e todas estão ocupadas.',
          log: ['  Agenda cheia (' + CAPACIDADE_AGENDA + ' pagamentos).'] });
        return P;
      }
      const op = criarOperacao(this.proximoNumero, TIPO_PAGAMENTO, conta, SEM_CONTA, valor);
      op.data = data;
      this.proximoNumero++;

      this.agenda.push(op);
      this.passo(P, { fn: 'agendar', linha: L('agendar', 'a->itens[a->quantidade] = op'),
        foco: { area: 'agenda', chave: 'op' + op.numero },
        legenda: 'A ficha #' + op.numero + ' (' + textoData(data) + ') é colocada no FIM do vetor, ainda fora de ordem.' });

      const empate = this.agenda.some(o => o !== op && o.data === op.data);
      const antes = this.agenda.map(o => o.numero).join(',');
      this.agenda.sort(compararAgendados);
      const mudou = antes !== this.agenda.map(o => o.numero).join(',');
      const pos = this.agenda.indexOf(op);
      let legenda;
      if (empate) {
        legenda = 'qsort com compararAgendados: mesma data de outro pagamento, então desempata pelo número de entrada. Quem entrou antes executa antes (FIFO no mesmo dia).';
      } else if (mudou) {
        legenda = 'qsort com compararAgendados: data mais cedo vem antes, então a #' + op.numero + ' sobe para a posição ' + (pos + 1) + '.';
      } else {
        legenda = 'qsort com compararAgendados: a #' + op.numero + ' já está no lugar certo (é a data mais distante).';
      }
      this.passo(P, { fn: 'compararAgendados', linha: L('compararAgendados', empate ? 'x->numero < y->numero' : 'x->data < y->data'),
        foco: { area: 'agenda', chave: 'op' + op.numero }, legenda });

      this.registrar(P, op, SIT_AGENDADA, this.hoje, { tom: 'ok',
        legenda: 'Fica registrado no histórico. Repare: agendado NÃO entra na pilha, ele só pode ser cancelado antes de executar.',
        log: ['  [AGENDADO] ' + textoOperacao(op)] });
      return P;
    }

    /* Opção 9 */
    cancelarAgendamento(numero) {
      const P = [];
      const i = this.agenda.findIndex(o => o.numero === numero);
      if (i < 0) {
        this.passo(P, { fn: 'cancelarAgendado', linha: L('cancelarAgendado', 'return 0'), tom: 'erro',
          legenda: 'O laço percorreu a agenda inteira e não achou esse número. Talvez já tenha sido executado.',
          log: ['  Não há pagamento agendado com número ' + numero + ' (talvez já tenha sido executado).'] });
        return P;
      }
      const op = this.agenda.splice(i, 1)[0];
      this.emMaos = op;
      this.passo(P, { fn: 'cancelarAgendado', linha: L('cancelarAgendado', 'removerPosicao'),
        foco: { area: 'op', chave: 'op' + op.numero },
        legenda: 'Achou a #' + op.numero + ' na posição ' + (i + 1) + '. removerPosicao puxa os de trás uma casa para frente, e a agenda continua ordenada.' });
      this.emMaos = null;
      this.registrar(P, op, SIT_CANCELADA, this.hoje, { tom: 'ok', log: ['  [CANCELADO] ' + textoOperacao(op)] });
      return P;
    }

    /* Opção 10 */
    avancarData(novaData) {
      const P = [];
      const fn = 'avancarData';
      if (novaData <= this.hoje) {
        this.passo(P, { fn, linha: L(fn, 'novaData <= s->hoje'), tom: 'erro',
          legenda: 'O tempo só anda para frente.',
          log: ['  A nova data precisa ser depois de ' + textoData(this.hoje) + '.'] });
        return P;
      }
      this.hoje = novaData;
      this.passo(P, { fn, linha: L(fn, 's->hoje = novaData'), foco: { area: 'data' },
        legenda: 'O calendário avança para ' + textoData(novaData) + '. Agora executamos os agendados que venceram.',
        log: ['  Data atual: ' + textoData(novaData)] });

      let executados = 0;
      while (this.agenda.length > 0 && this.agenda[0].data <= this.hoje) {
        const op = this.agenda.shift();
        executados++;
        this.emMaos = op;
        this.passo(P, { fn, linha: L(fn, 'while (retirarVencido'),
          foco: { area: 'op', chave: 'op' + op.numero },
          legenda: 'A agenda está ordenada, então basta olhar o primeiro: a #' + op.numero + ' venceu (' + textoData(op.data) + ').' });
        const ok = this.conferirEAplicar(P, op);
        this.emMaos = null;
        if (ok) {
          this.registrar(P, op, SIT_AGENDADO_PAGO, op.data, { tom: 'ok',
            legenda: 'Pago e registrado no histórico com a data do agendamento. Agendado não entra na pilha.',
            log: ['  [AGENDADO PAGO] ' + textoOperacao(op)] });
        } else {
          this.registrar(P, op, SIT_AGENDADO_RECUSADO, op.data, { tom: 'erro',
            legenda: 'Sem saldo na data: o pagamento é recusado e registrado no histórico.',
            log: ['  [AGENDADO RECUSADO: saldo insuficiente] ' + textoOperacao(op)] });
        }
      }
      if (executados === 0) {
        this.passo(P, { fn, linha: L(fn, 'while (retirarVencido'),
          legenda: 'O primeiro da agenda ainda não venceu, então nada executa.',
          log: ['  Nenhum pagamento agendado venceu.'] });
      }
      return P;
    }
  }

  function compararAgendados(x, y) {
    if (x.data < y.data) return -1;
    if (x.data > y.data) return 1;
    if (x.numero < y.numero) return -1;
    if (x.numero > y.numero) return 1;
    return 0;
  }

  /* ---------------- Roteiros prontos ---------------- */
  /* O mesmo roteiro de demo/entrada-demo.txt (as opções 11 e 12 são só consulta). */
  const ROTEIROS = {
    demo: {
      nome: 'Demonstração do EP',
      comandos: [
        { titulo: 'Opção 7: estornar com a pilha vazia', run: b => b.estornar() },
        { titulo: 'Opção 2: Carla pede saque de R$ 40', run: b => b.solicitarOperacao(TIPO_SAQUE, 3, 0, 40) },
        { titulo: 'Opção 2: Carla pede outro saque, de R$ 30', run: b => b.solicitarOperacao(TIPO_SAQUE, 3, 0, 30) },
        { titulo: 'Opção 3: Ana transfere R$ 150 para Bruno', run: b => b.solicitarOperacao(TIPO_TRANSFERENCIA, 1, 2, 150) },
        { titulo: 'Opção 6: processar a fila inteira', run: b => b.processarTodos() },
        { titulo: 'Opção 7: estornar a última efetivada', run: b => b.estornar() },
        { titulo: 'Opção 8: agendar R$ 100 para 10/11', run: b => b.agendarPagamento(1, 100, 20261110) },
        { titulo: 'Opção 8: agendar R$ 50 para 08/11', run: b => b.agendarPagamento(1, 50, 20261108) },
        { titulo: 'Opção 8: agendar R$ 30 para 10/11 (mesmo dia)', run: b => b.agendarPagamento(1, 30, 20261110) },
        { titulo: 'Opção 8: agendar R$ 20 para 12/11', run: b => b.agendarPagamento(1, 20, 20261112) },
        { titulo: 'Opção 9: cancelar o agendado #7', run: b => b.cancelarAgendamento(7) },
        { titulo: 'Opção 10: avançar a data para 10/11', run: b => b.avancarData(20261110) },
        { titulo: 'Opção 7: estornar', run: b => b.estornar() },
        { titulo: 'Opção 7: estornar de novo', run: b => b.estornar() }
      ]
    },
    estornoImpossivel: {
      nome: 'Estorno impossível',
      comandos: [
        { titulo: 'Opção 1: depósito de R$ 100 na conta da Carla', run: b => b.solicitarOperacao(TIPO_DEPOSITO, 0, 3, 100) },
        { titulo: 'Opção 5: processar o pedido', run: b => { const P = []; b.processarProximo(P); return P; } },
        { titulo: 'Opção 8: Carla agenda R$ 140 para 06/11', run: b => b.agendarPagamento(3, 140, 20261106) },
        { titulo: 'Opção 10: avançar a data para 06/11', run: b => b.avancarData(20261106) },
        { titulo: 'Opção 7: tentar estornar o depósito', run: b => b.estornar() }
      ]
    }
  };

  global.BancoEP = {
    Banco, CODIGO, ROTEIROS, NOME_CURTO, NOME_SIT,
    TIPO_DEPOSITO, TIPO_SAQUE, TIPO_TRANSFERENCIA, TIPO_PAGAMENTO, SEM_CONTA,
    SIT_EFETIVADA, SIT_RECUSADA, SIT_ESTORNADA, SIT_AGENDADA, SIT_CANCELADA,
    SIT_AGENDADO_PAGO, SIT_AGENDADO_RECUSADO, CAPACIDADE_FILA, DATA_INICIAL,
    textoData, textoOperacao, reais
  };
})(typeof window !== 'undefined' ? window : globalThis);
