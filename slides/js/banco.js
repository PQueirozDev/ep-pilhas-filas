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
 *   legenda  explicação para iniciantes (ligada ao código C)
 *   simples  a mesma ideia em linguagem do dia a dia (balão na tela)
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
  const CAPACIDADE_FILA = 50, CAPACIDADE_PILHA = 100, CAPACIDADE_AGENDA = 50, CAPACIDADE_HISTORICO = 1000;
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
  "arredondarCentavos": {
    "arquivo": "sistema.c",
    "linhas": [
      "double arredondarCentavos(double valor)",
      "{",
      "    return (long long) (valor * 100 + 0.5 + 0.000001) / 100.0;",
      "}"
    ]
  },
  "valorValido": {
    "arquivo": "sistema.c",
    "linhas": [
      "int valorValido(double valor)",
      "{",
      "    if (!(valor > 0) || valor > VALOR_MAXIMO || arredondarCentavos(valor) < 0.01) {",
      "        printf(\"  Valor deve ser de R$ 0.01 até R$ %.2f.\\n\", VALOR_MAXIMO);",
      "        return 0;",
      "    }",
      "    return 1;",
      "}"
    ]
  },
  "iniciarSistema": {
    "arquivo": "sistema.c",
    "linhas": [
      "void iniciarSistema(int dataInicial)",
      "{",
      "    banco.contas[0] = (Conta){1, \"Ana\", 500.00};",
      "    banco.contas[1] = (Conta){2, \"Bruno\", 200.00};",
      "    banco.contas[2] = (Conta){3, \"Carla\", 50.00};",
      "",
      "    iniciarFila();",
      "    iniciarPilha();",
      "    iniciarAgenda();",
      "    iniciarHistorico();",
      "",
      "    banco.hoje = dataInicial;",
      "    banco.proximoNumero = 1;",
      "}"
    ]
  },
  "encerrarSistema": {
    "arquivo": "sistema.c",
    "linhas": [
      "void encerrarSistema(void)",
      "{",
      "    iniciarHistorico();",
      "}"
    ]
  },
  "buscarConta": {
    "arquivo": "sistema.c",
    "linhas": [
      "int buscarConta(int numero)",
      "{",
      "    int i;",
      "    for (i = 0; i < NUM_CONTAS; i++) {",
      "        if (banco.contas[i].numero == numero) {",
      "            return i;",
      "        }",
      "    }",
      "    return -1;",
      "}"
    ]
  },
  "aplicarOperacao": {
    "arquivo": "sistema.c",
    "linhas": [
      "int aplicarOperacao(Operacao op)",
      "{",
      "    int origem = buscarConta(op.contaOrigem);",
      "    int destino = buscarConta(op.contaDestino);",
      "",
      "    if (origem >= 0 && banco.contas[origem].saldo + MEIO_CENTAVO < op.valor) {",
      "        return RES_SALDO_INSUFICIENTE;",
      "    }",
      "    if (origem >= 0)  banco.contas[origem].saldo  -= op.valor;",
      "    if (destino >= 0) banco.contas[destino].saldo += op.valor;",
      "    return RES_OK;",
      "}"
    ]
  },
  "desfazerOperacao": {
    "arquivo": "sistema.c",
    "linhas": [
      "int desfazerOperacao(Operacao op)",
      "{",
      "    int origem = buscarConta(op.contaOrigem);",
      "    int destino = buscarConta(op.contaDestino);",
      "",
      "    if (destino >= 0 && banco.contas[destino].saldo + MEIO_CENTAVO < op.valor) {",
      "        return RES_ESTORNO_IMPOSSIVEL;",
      "    }",
      "    if (destino >= 0) banco.contas[destino].saldo -= op.valor;",
      "    if (origem >= 0)  banco.contas[origem].saldo  += op.valor;",
      "    return RES_OK;",
      "}"
    ]
  },
  "solicitarOperacao": {
    "arquivo": "sistema.c",
    "linhas": [
      "int solicitarOperacao(int tipo, int origem, int destino, double valor)",
      "{",
      "    Operacao op;",
      "    int precisaOrigem, precisaDestino;",
      "",
      "    if (!valorValido(valor)) {",
      "        return RES_VALOR_INVALIDO;",
      "    }",
      "    valor = arredondarCentavos(valor);",
      "",
      "    precisaOrigem  = (tipo == TIPO_SAQUE || tipo == TIPO_TRANSFERENCIA ||",
      "                      tipo == TIPO_PAGAMENTO);",
      "    precisaDestino = (tipo == TIPO_DEPOSITO || tipo == TIPO_TRANSFERENCIA);",
      "",
      "    if ((precisaOrigem && buscarConta(origem) < 0) ||",
      "        (precisaDestino && buscarConta(destino) < 0)) {",
      "        printf(\"  Conta inexistente.\\n\");",
      "        return RES_CONTA_INVALIDA;",
      "    }",
      "    if (!precisaOrigem)  origem  = SEM_CONTA;",
      "    if (!precisaDestino) destino = SEM_CONTA;",
      "    if (tipo == TIPO_TRANSFERENCIA && origem == destino) {",
      "        printf(\"  Origem e destino são a mesma conta.\\n\");",
      "        return RES_MESMA_CONTA;",
      "    }",
      "    if (filaCheia()) {",
      "        printf(\"  Fila cheia (%d pedidos). Processe a fila antes.\\n\", CAPACIDADE_FILA);",
      "        return RES_FILA_CHEIA;",
      "    }",
      "",
      "    op = criarOperacao(banco.proximoNumero, tipo, origem, destino, valor);",
      "    banco.proximoNumero++;",
      "    enfileirar(op);",
      "",
      "    printf(\"  Pedido na fila (posição %d): \", banco.pedidos.quantidade);",
      "    imprimirOperacao(op);",
      "    return RES_OK;",
      "}"
    ]
  },
  "conferirHistorico": {
    "arquivo": "sistema.c",
    "linhas": [
      "int conferirHistorico(int novos)",
      "{",
      "    if (historicoTemEspaco(novos)) return 1;",
      "    printf(\"  Histórico cheio (%d registros). Nenhuma alteração realizada.\\n\", CAPACIDADE_HISTORICO);",
      "    return 0;",
      "}"
    ]
  },
  "processarProximo": {
    "arquivo": "sistema.c",
    "linhas": [
      "int processarProximo(void)",
      "{",
      "    Operacao op;",
      "    int resultado;",
      "",
      "    if (filaVazia()) {",
      "        printf(\"  Nenhum pedido na fila.\\n\");",
      "        return RES_FILA_VAZIA;",
      "    }",
      "",
      "    if (pilhaCheia()) {",
      "        printf(\"  Limite de %d operações estornáveis atingido.\\n\", CAPACIDADE_PILHA);",
      "        return RES_PILHA_CHEIA;",
      "    }",
      "",
      "    if (!conferirHistorico(1)) return RES_HISTORICO_CHEIO;",
      "    op = desenfileirar();",
      "    resultado = aplicarOperacao(op);",
      "",
      "    if (resultado == RES_OK) {",
      "        empilhar(op);",
      "        registrarHistorico(op, SIT_EFETIVADA, banco.hoje);",
      "        printf(\"  [EFETIVADA] \");",
      "    } else {",
      "        registrarHistorico(op, SIT_RECUSADA, banco.hoje);",
      "        printf(\"  [RECUSADA: saldo insuficiente] \");",
      "    }",
      "    imprimirOperacao(op);",
      "    return resultado;",
      "}"
    ]
  },
  "processarTodos": {
    "arquivo": "sistema.c",
    "linhas": [
      "int processarTodos(void)",
      "{",
      "    int atendidos = 0, resultado;",
      "",
      "    if (filaVazia()) {",
      "        printf(\"  Nenhum pedido na fila.\\n\");",
      "        return 0;",
      "    }",
      "    while (!filaVazia()) {",
      "        if ((resultado = processarProximo()) == RES_PILHA_CHEIA || resultado == RES_HISTORICO_CHEIO) {",
      "            break;",
      "        }",
      "        atendidos++;",
      "    }",
      "    return atendidos;",
      "}"
    ]
  },
  "estornar": {
    "arquivo": "sistema.c",
    "linhas": [
      "int estornar(void)",
      "{",
      "    Operacao op;",
      "",
      "    if (!pilhaVazia() && !conferirHistorico(1)) return RES_HISTORICO_CHEIO;",
      "    op = desempilhar();",
      "    if (op.numero == 0) {",
      "        printf(\"  Nada a estornar.\\n\");",
      "        return RES_NADA_A_ESTORNAR;",
      "    }",
      "    if (desfazerOperacao(op) != RES_OK) {",
      "        empilhar(op);",
      "        printf(\"  Estorno impossível: a conta %d já não tem R$ %.2f.\\n\",",
      "               op.contaDestino, op.valor);",
      "        printf(\"  A operação continua no topo da pilha: \");",
      "        imprimirOperacao(op);",
      "        return RES_ESTORNO_IMPOSSIVEL;",
      "    }",
      "    registrarHistorico(op, SIT_ESTORNADA, banco.hoje);",
      "    printf(\"  [ESTORNADA] \");",
      "    imprimirOperacao(op);",
      "    return RES_OK;",
      "}"
    ]
  },
  "agendarPagamento": {
    "arquivo": "sistema.c",
    "linhas": [
      "int agendarPagamento(int conta, double valor, int data)",
      "{",
      "    Operacao op;",
      "",
      "    if (!valorValido(valor)) {",
      "        return RES_VALOR_INVALIDO;",
      "    }",
      "    valor = arredondarCentavos(valor);",
      "    if (buscarConta(conta) < 0) {",
      "        printf(\"  Conta inexistente.\\n\");",
      "        return RES_CONTA_INVALIDA;",
      "    }",
      "    if (data <= banco.hoje) {",
      "        printf(\"  A data deve ser depois de hoje (\");",
      "        imprimirData(banco.hoje);",
      "        printf(\"). Para hoje, use o pagamento imediato.\\n\");",
      "        return RES_DATA_INVALIDA;",
      "    }",
      "    if (agendaCheia()) {",
      "        printf(\"  Agenda cheia (%d pagamentos).\\n\", CAPACIDADE_AGENDA);",
      "        return RES_AGENDA_CHEIA;",
      "    }",
      "",
      "    if (!conferirHistorico(1)) return RES_HISTORICO_CHEIO;",
      "    op = criarOperacao(banco.proximoNumero, TIPO_PAGAMENTO, conta, SEM_CONTA, valor);",
      "    op.data = data;",
      "    banco.proximoNumero++;",
      "    agendar(op);",
      "    registrarHistorico(op, SIT_AGENDADA, banco.hoje);",
      "",
      "    printf(\"  [AGENDADO] \");",
      "    imprimirOperacao(op);",
      "    return RES_OK;",
      "}"
    ]
  },
  "cancelarAgendamento": {
    "arquivo": "sistema.c",
    "linhas": [
      "int cancelarAgendamento(int numero)",
      "{",
      "    Operacao op;",
      "",
      "    int i;",
      "    for (i = 0; i < banco.agendados.quantidade; i++) {",
      "        if (banco.agendados.itens[i].numero == numero && !conferirHistorico(1)) return RES_HISTORICO_CHEIO;",
      "    }",
      "    op = cancelarAgendado(numero);",
      "    if (op.numero == 0) {",
      "        printf(\"  Não há pagamento agendado com número %d\"",
      "               \" (talvez já tenha sido executado).\\n\", numero);",
      "        return RES_NAO_ENCONTRADO;",
      "    }",
      "    registrarHistorico(op, SIT_CANCELADA, banco.hoje);",
      "    printf(\"  [CANCELADO] \");",
      "    imprimirOperacao(op);",
      "    return RES_OK;",
      "}"
    ]
  },
  "avancarData": {
    "arquivo": "sistema.c",
    "linhas": [
      "int avancarData(int novaData)",
      "{",
      "    Operacao op;",
      "    int executados = 0, vencidos = 0, i;",
      "",
      "    if (novaData <= banco.hoje) {",
      "        printf(\"  A nova data precisa ser depois de \");",
      "        imprimirData(banco.hoje);",
      "        printf(\".\\n\");",
      "        return RES_DATA_INVALIDA;",
      "    }",
      "    for (i = 0; i < banco.agendados.quantidade; i++) {",
      "        if (banco.agendados.itens[i].data <= novaData) vencidos++;",
      "    }",
      "    if (!conferirHistorico(vencidos)) return RES_HISTORICO_CHEIO;",
      "    banco.hoje = novaData;",
      "    printf(\"  Data atual: \");",
      "    imprimirData(banco.hoje);",
      "    printf(\"\\n\");",
      "",
      "    while ((op = retirarVencido(banco.hoje)).numero != 0) {",
      "        executados++;",
      "        if (aplicarOperacao(op) == RES_OK) {",
      "            registrarHistorico(op, SIT_AGENDADO_PAGO, op.data);",
      "            printf(\"  [AGENDADO PAGO] \");",
      "        } else {",
      "            registrarHistorico(op, SIT_AGENDADO_RECUSADO, op.data);",
      "            printf(\"  [AGENDADO RECUSADO: saldo insuficiente] \");",
      "        }",
      "        imprimirOperacao(op);",
      "",
      "    }",
      "    if (executados == 0) {",
      "        printf(\"  Nenhum pagamento agendado venceu.\\n\");",
      "    }",
      "    return RES_OK;",
      "}"
    ]
  },
  "mostrarContas": {
    "arquivo": "sistema.c",
    "linhas": [
      "void mostrarContas(void)",
      "{",
      "    int i;",
      "    for (i = 0; i < NUM_CONTAS; i++) {",
      "        printf(\"   Conta %d  %-8s  R$ %9.2f\\n\",",
      "               banco.contas[i].numero, banco.contas[i].titular, banco.contas[i].saldo);",
      "    }",
      "}"
    ]
  },
  "mostrarSituacao": {
    "arquivo": "sistema.c",
    "linhas": [
      "void mostrarSituacao(void)",
      "{",
      "    printf(\"\\n  Data: \");",
      "    imprimirData(banco.hoje);",
      "    printf(\"\\n\\n  CONTAS\\n\");",
      "    mostrarContas();",
      "    printf(\"\\n  FILA de pedidos imediatos (1º = próximo a ser atendido)\\n\");",
      "    mostrarFila();",
      "    printf(\"\\n  PILHA de efetivadas (topo = próximo estorno)\\n\");",
      "    mostrarPilha();",
      "    printf(\"\\n  AGENDA de pagamentos (ordem de execução)\\n\");",
      "    mostrarAgenda();",
      "}"
    ]
  },
  "iniciarFila": {
    "arquivo": "fila.c",
    "linhas": [
      "void iniciarFila(void)",
      "{",
      "    banco.pedidos.inicio = 0;",
      "    banco.pedidos.quantidade = 0;",
      "}"
    ]
  },
  "filaVazia": {
    "arquivo": "fila.c",
    "linhas": [
      "int filaVazia(void)",
      "{",
      "    return banco.pedidos.quantidade == 0;",
      "}"
    ]
  },
  "filaCheia": {
    "arquivo": "fila.c",
    "linhas": [
      "int filaCheia(void)",
      "{",
      "    return banco.pedidos.quantidade == CAPACIDADE_FILA;",
      "}"
    ]
  },
  "enfileirar": {
    "arquivo": "fila.c",
    "linhas": [
      "int enfileirar(Operacao op)",
      "{",
      "    int fim;",
      "",
      "    if (filaCheia()) {",
      "        return 0;",
      "    }",
      "    fim = (banco.pedidos.inicio + banco.pedidos.quantidade) % CAPACIDADE_FILA;",
      "    banco.pedidos.itens[fim] = op;",
      "    banco.pedidos.quantidade++;",
      "    return 1;",
      "}"
    ]
  },
  "desenfileirar": {
    "arquivo": "fila.c",
    "linhas": [
      "Operacao desenfileirar(void)",
      "{",
      "    Operacao saida = {0}; /* numero 0 indica que não havia operação. */",
      "    if (filaVazia()) return saida;",
      "    saida = banco.pedidos.itens[banco.pedidos.inicio];",
      "    banco.pedidos.inicio = (banco.pedidos.inicio + 1) % CAPACIDADE_FILA;",
      "    banco.pedidos.quantidade--;",
      "    return saida;",
      "}"
    ]
  },
  "mostrarFila": {
    "arquivo": "fila.c",
    "linhas": [
      "void mostrarFila(void)",
      "{",
      "    int i, posicao;",
      "",
      "    if (filaVazia()) {",
      "        printf(\"   (fila vazia)\\n\");",
      "        return;",
      "    }",
      "    for (i = 0; i < banco.pedidos.quantidade; i++) {",
      "        posicao = (banco.pedidos.inicio + i) % CAPACIDADE_FILA;",
      "        printf(\"   %dº  \", i + 1);",
      "        imprimirOperacao(banco.pedidos.itens[posicao]);",
      "    }",
      "}"
    ]
  },
  "iniciarPilha": {
    "arquivo": "pilha.c",
    "linhas": [
      "void iniciarPilha(void)",
      "{",
      "",
      "    banco.efetivadas.quantidade = 0;",
      "}"
    ]
  },
  "pilhaVazia": {
    "arquivo": "pilha.c",
    "linhas": [
      "int pilhaVazia(void)",
      "{",
      "    return banco.efetivadas.quantidade == 0;",
      "}"
    ]
  },
  "pilhaCheia": {
    "arquivo": "pilha.c",
    "linhas": [
      "int pilhaCheia(void)",
      "{",
      "    return banco.efetivadas.quantidade == CAPACIDADE_PILHA;",
      "}"
    ]
  },
  "empilhar": {
    "arquivo": "pilha.c",
    "linhas": [
      "int empilhar(Operacao op)",
      "{",
      "    if (pilhaCheia()) {",
      "        return 0;",
      "    }",
      "    banco.efetivadas.itens[banco.efetivadas.quantidade] = op;",
      "    banco.efetivadas.quantidade++;",
      "    return 1;",
      "}"
    ]
  },
  "desempilhar": {
    "arquivo": "pilha.c",
    "linhas": [
      "Operacao desempilhar(void)",
      "{",
      "    Operacao saida = {0}; /* numero 0 indica que não havia operação. */",
      "    if (pilhaVazia()) return saida;",
      "    banco.efetivadas.quantidade--;",
      "    saida = banco.efetivadas.itens[banco.efetivadas.quantidade];",
      "    return saida;",
      "}"
    ]
  },
  "mostrarPilha": {
    "arquivo": "pilha.c",
    "linhas": [
      "void mostrarPilha(void)",
      "{",
      "    int i;",
      "",
      "    if (pilhaVazia()) {",
      "        printf(\"   (pilha vazia)\\n\");",
      "        return;",
      "    }",
      "",
      "    for (i = banco.efetivadas.quantidade - 1; i >= 0; i--) {",
      "        printf(\"   %s \", (i == banco.efetivadas.quantidade - 1) ? \"TOPO ->\" : \"       \");",
      "        imprimirOperacao(banco.efetivadas.itens[i]);",
      "    }",
      "}"
    ]
  },
  "iniciarAgenda": {
    "arquivo": "agendados.c",
    "linhas": [
      "void iniciarAgenda(void)",
      "{",
      "    banco.agendados.quantidade = 0;",
      "}"
    ]
  },
  "agendaVazia": {
    "arquivo": "agendados.c",
    "linhas": [
      "int agendaVazia(void)",
      "{",
      "    return banco.agendados.quantidade == 0;",
      "}"
    ]
  },
  "agendaCheia": {
    "arquivo": "agendados.c",
    "linhas": [
      "int agendaCheia(void)",
      "{",
      "    return banco.agendados.quantidade == CAPACIDADE_AGENDA;",
      "}"
    ]
  },
  "compararAgendados": {
    "arquivo": "agendados.c",
    "linhas": [
      "int compararAgendados(Operacao x, Operacao y)",
      "{",
      "",
      "    if (x.data < y.data) return -1;",
      "    if (x.data > y.data) return 1;",
      "",
      "    if (x.numero < y.numero) return -1;",
      "    if (x.numero > y.numero) return 1;",
      "    return 0;",
      "}"
    ]
  },
  "ordenarAgenda": {
    "arquivo": "agendados.c",
    "linhas": [
      "void ordenarAgenda(void)",
      "{",
      "    int i, j;",
      "    Operacao atual;",
      "    for (i = 1; i < banco.agendados.quantidade; i++) {",
      "        atual = banco.agendados.itens[i];",
      "        j = i - 1;",
      "        while (j >= 0 && compararAgendados(banco.agendados.itens[j], atual) > 0) {",
      "            banco.agendados.itens[j + 1] = banco.agendados.itens[j];",
      "            j--;",
      "        }",
      "        banco.agendados.itens[j + 1] = atual;",
      "    }",
      "}"
    ]
  },
  "agendar": {
    "arquivo": "agendados.c",
    "linhas": [
      "int agendar(Operacao op)",
      "{",
      "    if (agendaCheia()) {",
      "        return 0;",
      "    }",
      "    banco.agendados.itens[banco.agendados.quantidade] = op;",
      "    banco.agendados.quantidade++;",
      "",
      "    /* Inserção: leva o último item até sua posição, por data e número. */",
      "    ordenarAgenda();",
      "    return 1;",
      "}"
    ]
  },
  "removerPosicao": {
    "arquivo": "agendados.c",
    "linhas": [
      "void removerPosicao(int pos)",
      "{",
      "    int i;",
      "    for (i = pos; i < banco.agendados.quantidade - 1; i++) {",
      "        banco.agendados.itens[i] = banco.agendados.itens[i + 1];",
      "    }",
      "    banco.agendados.quantidade--;",
      "}"
    ]
  },
  "cancelarAgendado": {
    "arquivo": "agendados.c",
    "linhas": [
      "Operacao cancelarAgendado(int numero)",
      "{",
      "    Operacao cancelado = {0};",
      "    int i;",
      "    for (i = 0; i < banco.agendados.quantidade; i++) {",
      "        if (banco.agendados.itens[i].numero == numero) {",
      "            cancelado = banco.agendados.itens[i];",
      "            removerPosicao(i);",
      "            return cancelado;",
      "        }",
      "    }",
      "    return cancelado;",
      "}"
    ]
  },
  "retirarVencido": {
    "arquivo": "agendados.c",
    "linhas": [
      "Operacao retirarVencido(int hoje)",
      "{",
      "    Operacao saida = {0};",
      "    if (agendaVazia() || banco.agendados.itens[0].data > hoje) return saida;",
      "    saida = banco.agendados.itens[0];",
      "    removerPosicao(0);",
      "    return saida;",
      "}"
    ]
  },
  "mostrarAgenda": {
    "arquivo": "agendados.c",
    "linhas": [
      "void mostrarAgenda(void)",
      "{",
      "    int i;",
      "    if (agendaVazia()) {",
      "        printf(\"   (nenhum pagamento agendado)\\n\");",
      "        return;",
      "    }",
      "    for (i = 0; i < banco.agendados.quantidade; i++) {",
      "        printf(\"   \");",
      "        imprimirOperacao(banco.agendados.itens[i]);",
      "    }",
      "}"
    ]
  },
  "iniciarHistorico": {
    "arquivo": "historico.c",
    "linhas": [
      "void iniciarHistorico(void)",
      "{",
      "    banco.historico.quantidade = 0;",
      "}"
    ]
  },
  "historicoTemEspaco": {
    "arquivo": "historico.c",
    "linhas": [
      "int historicoTemEspaco(int novos)",
      "{",
      "    return novos >= 0 && novos <= CAPACIDADE_HISTORICO - banco.historico.quantidade;",
      "}"
    ]
  },
  "registrarHistorico": {
    "arquivo": "historico.c",
    "linhas": [
      "int registrarHistorico(Operacao op, int situacao, int data)",
      "{",
      "    int pos = banco.historico.quantidade;",
      "    if (!historicoTemEspaco(1)) return 0;",
      "    banco.historico.itens[pos].op = op;",
      "    banco.historico.itens[pos].situacao = situacao;",
      "    banco.historico.itens[pos].data = data;",
      "    banco.historico.quantidade++;",
      "    return 1;",
      "}"
    ]
  },
  "imprimirSituacao": {
    "arquivo": "historico.c",
    "linhas": [
      "void imprimirSituacao(int situacao)",
      "{",
      "    switch (situacao) {",
      "        case SIT_EFETIVADA:         printf(\"EFETIVADA         \"); break;",
      "        case SIT_RECUSADA:          printf(\"RECUSADA (saldo)  \"); break;",
      "        case SIT_ESTORNADA:         printf(\"ESTORNADA         \"); break;",
      "        case SIT_AGENDADA:          printf(\"AGENDADA          \"); break;",
      "        case SIT_CANCELADA:         printf(\"AGEND. CANCELADA  \"); break;",
      "        case SIT_AGENDADO_PAGO:     printf(\"AGENDADO PAGO     \"); break;",
      "        case SIT_AGENDADO_RECUSADO: printf(\"AGEND. RECUSADO   \"); break;",
      "        default:                    printf(\"?                 \"); break;",
      "    }",
      "}"
    ]
  },
  "mostrarHistorico": {
    "arquivo": "historico.c",
    "linhas": [
      "void mostrarHistorico(int conta)",
      "{",
      "    int i, mostrados = 0;",
      "    RegistroHistorico atual;",
      "    for (i = 0; i < banco.historico.quantidade; i++) {",
      "        atual = banco.historico.itens[i];",
      "        if (conta != 0 && atual.op.contaOrigem != conta && atual.op.contaDestino != conta) continue;",
      "        printf(\"   \");",
      "        imprimirData(atual.data);",
      "        printf(\"  \");",
      "        imprimirSituacao(atual.situacao);",
      "        imprimirOperacao(atual.op);",
      "        mostrados++;",
      "    }",
      "    if (mostrados == 0) printf(\"   (nenhum registro)\\n\");",
      "}"
    ]
  }
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

  function arredondarCentavos(valor) { return Math.trunc(valor * 100 + 0.5 + 0.000001) / 100; }

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
      this.proximoNo = 1;      /* identificador visual dos registros do histórico */
    }

    buscarConta(numero) { return this.contas.find(c => c.numero === numero) || null; }

    /* A operação em palavras, para os balões: "o saque de R$ 40,00 de Carla" */
    nomeOp(op) {
      const titular = n => (this.buscarConta(n) || { titular: 'conta ' + n }).titular;
      const v = reais(op.valor);
      if (op.tipo === TIPO_DEPOSITO) return 'o depósito de ' + v + ' para ' + titular(op.contaDestino);
      if (op.tipo === TIPO_SAQUE) return 'o saque de ' + v + ' de ' + titular(op.contaOrigem);
      if (op.tipo === TIPO_TRANSFERENCIA) return 'a transferência de ' + v + ' de ' + titular(op.contaOrigem) + ' para ' + titular(op.contaDestino);
      return 'o pagamento de ' + v + ' de ' + titular(op.contaOrigem);
    }

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
      if (!(valor > 0) || valor > VALOR_MAXIMO || arredondarCentavos(valor) < 0.01) {
        this.passo(P, {
          fn, linha, tom: 'erro',
          simples: 'Valor inválido: precisa ser de R$ 0,01 até R$ 1.000.000,00. Nada mudou.',
          legenda: 'Valor recusado antes de entrar em qualquer estrutura: precisa ser de R$ 0,01 até R$ 1.000.000,00.',
          log: ['  Valor deve ser de R$ 0.01 até R$ ' + f2(VALOR_MAXIMO) + '.']
        });
        return false;
      }
      return true;
    }

    conferirHistorico(P, novos) {
      if (this.historico.length + novos <= CAPACIDADE_HISTORICO) return true;
      this.passo(P, { fn: 'conferirHistorico', linha: L('conferirHistorico', 'printf'), tom: 'erro',
        simples: 'O histórico está cheio, então nada foi feito.',
        legenda: 'O vetor do histórico está cheio. O comando é recusado antes de alterar saldos ou estruturas.',
        log: ['  Histórico cheio (' + CAPACIDADE_HISTORICO + ' registros). Nenhuma alteração realizada.'] });
      return false;
    }

    registrar(P, op, situacao, data, extra) {
      const no = { id: this.proximoNo++, op: { ...op }, situacao, data };
      this.historico.push(no);
      this.passo(P, {
        fn: 'registrarHistorico', linha: L('registrarHistorico', 'banco.historico.quantidade++'),
        foco: { area: 'historico', chave: 'h' + no.id },
        simples: 'Anotado no histórico.',
        legenda: 'O evento ocupa a próxima posição livre do vetor do histórico, e quantidade aumenta em 1.',
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
          simples: 'Essa conta não existe. Só há as contas 1, 2 e 3.',
          legenda: 'Só existem as contas 1, 2 e 3. Sem essa conferência, a conta 0 como origem "criaria" dinheiro do nada.',
          log: ['  Conta inexistente.'] });
        return P;
      }
      if (!precisaOrigem) origem = SEM_CONTA;
      if (!precisaDestino) destino = SEM_CONTA;
      if (tipo === TIPO_TRANSFERENCIA && origem === destino) {
        this.passo(P, { fn, linha: L(fn, 'origem == destino'), tom: 'erro',
          simples: 'Não dá para transferir para a própria conta.',
          legenda: 'Transferir para a própria conta não faz sentido, então o pedido nem entra na fila.',
          log: ['  Origem e destino são a mesma conta.'] });
        return P;
      }
      if (this.fila.quantidade === CAPACIDADE_FILA) {
        this.passo(P, { fn, linha: L(fn, 'filaCheia'), tom: 'erro',
          simples: 'A fila está cheia (50 pedidos). Atenda alguns antes.',
          legenda: 'O vetor da fila tem 50 posições e todas estão ocupadas.',
          log: ['  Fila cheia (' + CAPACIDADE_FILA + ' pedidos). Processe a fila antes.'] });
        return P;
      }

      const op = criarOperacao(this.proximoNumero, tipo, origem, destino, valor);
      this.proximoNumero++;
      this.emMaos = op;
      this.passo(P, { fn, linha: L(fn, 'criarOperacao'),
        foco: { area: 'op', chave: 'op' + op.numero },
        simples: 'Pedido recebido: ' + this.nomeOp(op) + '. Ele ganhou o número #' + op.numero + '.',
        legenda: 'criarOperacao preenche a ficha #' + op.numero + ' (' + (NOME_CURTO[tipo] || 'operação').toLowerCase() + ' de ' + reais(valor) + '). O número de entrada guarda a ordem de chegada.' });

      const fim = (this.fila.inicio + this.fila.quantidade) % CAPACIDADE_FILA;
      this.fila.itens[fim] = op;
      this.fila.quantidade++;
      this.emMaos = null;
      this.passo(P, { fn: 'enfileirar', linha: L('enfileirar', 'banco.pedidos.itens[fim] = op'),
        foco: { area: 'fila', chave: 'op' + op.numero },
        simples: 'O pedido #' + op.numero + ' entrou no fim da fila. ' + (this.fila.quantidade === 1 ? 'Não há ninguém na frente: ele é o próximo.' : this.fila.quantidade === 2 ? 'Há 1 pedido na frente dele.' : 'Há ' + (this.fila.quantidade - 1) + ' pedidos na frente dele.'),
        legenda: 'A ficha entra no FIM da fila, em itens[' + fim + ']. Ela espera até todos que chegaram antes serem atendidos.',
        log: ['  Pedido na fila (posição ' + this.fila.quantidade + '): ' + textoOperacao(op)] });
      return P;
    }

    /* Opção 5: atende o primeiro da fila */
    processarProximo(P) {
      P = P || [];
      if (this.fila.quantidade === 0) {
        this.passo(P, { fn: 'processarProximo', linha: L('processarProximo', 'filaVazia'), tom: 'erro',
          simples: 'A fila está vazia: não há pedido para atender.',
          legenda: 'Não há ninguém esperando na fila.', log: ['  Nenhum pedido na fila.'] });
        return 'vazia';
      }
      if (this.pilha.length === CAPACIDADE_PILHA) {
        this.passo(P, { fn: 'processarProximo', linha: L('processarProximo', 'pilhaCheia'), tom: 'erro',
          simples: 'A pilha está cheia, então o pedido continua esperando na fila.',
          legenda: 'A pilha de estornos está cheia, então o pedido continua esperando na fila.',
          log: ['  Limite de ' + CAPACIDADE_PILHA + ' operações estornáveis atingido.'] });
        return 'pilhaCheia';
      }

      if (!this.conferirHistorico(P, 1)) return 'historicoCheio';
      const indice = this.fila.inicio;
      const op = this.fila.itens[indice];
      this.fila.itens[indice] = null;
      this.fila.inicio = (this.fila.inicio + 1) % CAPACIDADE_FILA;
      this.fila.quantidade--;
      this.emMaos = op;
      this.passo(P, { fn: 'desenfileirar', linha: L('desenfileirar', 'saida = banco.pedidos.itens'),
        foco: { area: 'op', chave: 'op' + op.numero },
        simples: 'Atendendo o primeiro da fila: ' + this.nomeOp(op) + '.',
        legenda: 'FIFO: sai o primeiro da fila, itens[' + indice + ']. O início anda uma posição e o próximo passa a ser o primeiro.' });

      const ok = this.conferirEAplicar(P, op);
      if (ok) {
        this.pilha.push(op);
        this.emMaos = null;
        this.passo(P, { fn: 'empilhar', linha: L('empilhar', 'banco.efetivadas.itens[banco.efetivadas.quantidade] = op'),
          foco: { area: 'pilha', chave: 'op' + op.numero },
          simples: 'Deu certo! O #' + op.numero + ' foi para o topo da pilha. Se pedirem estorno, ele é o primeiro a ser desfeito.',
          legenda: 'Efetivada: a ficha vai para o TOPO da pilha. Se alguém pedir estorno, é ela que sai primeiro.' });
        this.registrar(P, op, SIT_EFETIVADA, this.hoje, { tom: 'ok', simples: 'Anotado no histórico como efetivado.', log: ['  [EFETIVADA] ' + textoOperacao(op)] });
        return 'ok';
      }
      this.emMaos = null;
      this.registrar(P, op, SIT_RECUSADA, this.hoje, { tom: 'erro',
        simples: 'Sem saldo: o #' + op.numero + ' foi recusado. Ele não vai para a pilha, só fica anotado no histórico.',
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
        this.passo(P, { fn, linha: L(fn, 'banco.contas[origem].saldo + MEIO_CENTAVO'), tom: ok ? 'ok' : 'erro',
          foco: { area: 'conta', chave: 'c' + origem.numero },
          simples: origem.titular + ' tem ' + reais(origem.saldo) + ' e precisa de ' + reais(op.valor) + (ok ? ': tem saldo.' : ': não tem saldo suficiente.'),
          legenda: origem.titular + ' tem ' + reais(origem.saldo) + ' e precisa de ' + reais(op.valor) + (ok ? ': tem saldo.' : ': saldo insuficiente.') });
      }
      if (!ok) return false;
      if (!origem && !destino) return true;   /* tipo sem contas: nada a mover */
      if (origem) origem.saldo -= op.valor;
      if (destino) destino.saldo += op.valor;
      const partes = [];
      if (origem) partes.push('sai ' + reais(op.valor) + ' de ' + origem.titular);
      if (destino) partes.push('entra em ' + destino.titular);
      this.passo(P, { fn, linha: L(fn, origem ? 'banco.contas[origem].saldo  -=' : 'banco.contas[destino].saldo +='), tom: 'ok',
        foco: { area: 'conta', chave: 'c' + (origem || destino).numero },
        simples: 'O dinheiro mudou de lugar: ' + partes.join(' e ') + '.',
        legenda: 'Regra única do banco: ' + partes.join(' e ') + '.' });
      return true;
    }

    /* Opção 6 */
    processarTodos() {
      const P = [];
      if (this.fila.quantidade === 0) {
        this.passo(P, { fn: 'processarProximo', linha: L('processarProximo', 'filaVazia'), tom: 'erro',
          simples: 'A fila está vazia: não há pedido para atender.',
          legenda: 'Não há ninguém esperando na fila.', log: ['  Nenhum pedido na fila.'] });
        return P;
      }
      while (this.fila.quantidade > 0) {
        if (['pilhaCheia', 'historicoCheio'].includes(this.processarProximo(P))) break;
      }
      return P;
    }

    /* Opção 7: estorno pela PILHA */
    estornar() {
      const P = [];
      if (this.pilha.length === 0) {
        this.passo(P, { fn: 'desempilhar', linha: L('desempilhar', 'pilhaVazia'), tom: 'erro',
          simples: 'A pilha está vazia: não há nada para desfazer.',
          legenda: 'Pilha vazia: nenhuma operação foi efetivada, então não há o que desfazer.',
          log: ['  Nada a estornar.'] });
        return P;
      }
      if (!this.conferirHistorico(P, 1)) return P;
      const op = this.pilha.pop();
      this.emMaos = op;
      this.passo(P, { fn: 'desempilhar', linha: L('desempilhar', 'banco.efetivadas.quantidade--'),
        foco: { area: 'op', chave: 'op' + op.numero },
        simples: 'Estorno: sai do topo da pilha o último que deu certo, ' + this.nomeOp(op) + '.',
        legenda: 'LIFO: sai o TOPO, a última operação efetivada (#' + op.numero + ').' });

      const origem = this.buscarConta(op.contaOrigem);
      const destino = this.buscarConta(op.contaDestino);
      const fn = 'desfazerOperacao';
      const ok = !(destino && destino.saldo + MEIO_CENTAVO < op.valor);
      if (destino) {
        this.passo(P, { fn, linha: L(fn, 'banco.contas[destino].saldo + MEIO_CENTAVO'), tom: ok ? 'ok' : 'erro',
          foco: { area: 'conta', chave: 'c' + destino.numero },
          simples: 'Para desfazer, o dinheiro precisa voltar de ' + destino.titular + ', que tem ' + reais(destino.saldo) + (ok ? '.' : ' e não tem mais os ' + reais(op.valor) + '.'),
          legenda: 'Para desfazer, o dinheiro volta do destino. ' + destino.titular + ' tem ' + reais(destino.saldo) + (ok ? ', dá para devolver.' : ' e já não tem ' + reais(op.valor) + '.') });
      }
      if (!ok) {
        this.pilha.push(op);
        this.emMaos = null;
        this.passo(P, { fn: 'estornar', linha: L('estornar', 'empilhar(op)'), tom: 'erro',
          foco: { area: 'pilha', chave: 'op' + op.numero },
          simples: 'Não dá para desfazer: o dinheiro já foi gasto. O #' + op.numero + ' volta para o topo da pilha.',
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
      this.passo(P, { fn, linha: L(fn, destino ? 'banco.contas[destino].saldo -=' : 'banco.contas[origem].saldo  +='), tom: 'ok',
        foco: { area: 'conta', chave: 'c' + (origem || destino).numero },
        simples: 'Desfeito: ' + reais(op.valor) + ' ' + partes.join(' e ') + '.',
        legenda: 'O caminho inverso: ' + reais(op.valor) + ' ' + partes.join(' e ') + '. Só esta operação é desfeita; o efeito das outras continua.' });
      this.emMaos = null;
      this.registrar(P, op, SIT_ESTORNADA, this.hoje, { tom: 'ok', simples: 'Anotado no histórico como estornado.', log: ['  [ESTORNADA] ' + textoOperacao(op)] });
      return P;
    }

    /* Opção 8: AGENDA ordenada por inserção */
    agendarPagamento(conta, valor, data) {
      const P = [];
      const fn = 'agendarPagamento';
      if (!this.valorValido(P, valor, fn, L(fn, 'valorValido'))) return P;
      valor = arredondarCentavos(valor);
      if (!this.buscarConta(conta)) {
        this.passo(P, { fn, linha: L(fn, 'buscarConta'), tom: 'erro',
          simples: 'Essa conta não existe. Só há as contas 1, 2 e 3.',
          legenda: 'Só existem as contas 1, 2 e 3.', log: ['  Conta inexistente.'] });
        return P;
      }
      if (data <= this.hoje) {
        this.passo(P, { fn, linha: L(fn, 'data <= banco.hoje'), tom: 'erro',
          simples: 'A data precisa ser depois de hoje. Para hoje, use um pedido normal.',
          legenda: 'A agenda é só para datas futuras. Para hoje, use o pagamento imediato (ele entra na fila).',
          log: ['  A data deve ser depois de hoje (' + textoData(this.hoje) + '). Para hoje, use o pagamento imediato.'] });
        return P;
      }
      if (this.agenda.length === CAPACIDADE_AGENDA) {
        this.passo(P, { fn, linha: L(fn, 'agendaCheia'), tom: 'erro',
          simples: 'A agenda está cheia (50 pagamentos).',
          legenda: 'O vetor da agenda tem 50 posições e todas estão ocupadas.',
          log: ['  Agenda cheia (' + CAPACIDADE_AGENDA + ' pagamentos).'] });
        return P;
      }
      if (!this.conferirHistorico(P, 1)) return P;
      const op = criarOperacao(this.proximoNumero, TIPO_PAGAMENTO, conta, SEM_CONTA, valor);
      op.data = data;
      this.proximoNumero++;

      this.agenda.push(op);
      this.passo(P, { fn: 'agendar', linha: L('agendar', 'banco.agendados.itens[banco.agendados.quantidade] = op'),
        foco: { area: 'agenda', chave: 'op' + op.numero },
        simples: 'Pagamento #' + op.numero + ' de ' + reais(valor) + ' marcado para ' + textoData(data).slice(0, 5) + '. Ele entra no fim da agenda e depois vai para o lugar certo.',
        legenda: 'A ficha #' + op.numero + ' (' + textoData(data) + ') é colocada no FIM do vetor, ainda fora de ordem.' });

      const empate = this.agenda.some(o => o !== op && o.data === op.data);
      const antes = this.agenda.map(o => o.numero).join(',');
      for (let i = 1; i < this.agenda.length; i++) {
        const atual = this.agenda[i];
        let j = i - 1;
        while (j >= 0 && compararAgendados(this.agenda[j], atual) > 0) {
          this.agenda[j + 1] = this.agenda[j];
          j--;
        }
        this.agenda[j + 1] = atual;
      }
      const mudou = antes !== this.agenda.map(o => o.numero).join(',');
      const pos = this.agenda.indexOf(op);
      let legenda, simples;
      if (empate) {
        simples = 'Já havia outro pagamento no mesmo dia: o #' + op.numero + ' fica depois dele, porque chegou depois.';
        legenda = 'Ordenação por inserção com compararAgendados: mesma data de outro pagamento, então desempata pelo número de entrada. Quem entrou antes executa antes (FIFO no mesmo dia).';
      } else if (mudou) {
        simples = 'A agenda se organiza por data: o #' + op.numero + ' passa para a ' + (pos + 1) + 'ª posição.';
        legenda = 'Ordenação por inserção com compararAgendados: data mais cedo vem antes, então a #' + op.numero + ' sobe para a posição ' + (pos + 1) + '.';
      } else {
        simples = this.agenda.length === 1 ? 'É o único pagamento da agenda, então já está no lugar certo.' : 'Ele já está no lugar certo: é a data mais distante.';
        legenda = 'Ordenação por inserção com compararAgendados: a #' + op.numero + ' já está no lugar certo (é a data mais distante).';
      }
      this.passo(P, { fn: 'compararAgendados', linha: L('compararAgendados', empate ? 'x.numero < y.numero' : 'x.data < y.data'),
        foco: { area: 'agenda', chave: 'op' + op.numero }, legenda, simples });

      this.registrar(P, op, SIT_AGENDADA, this.hoje, { tom: 'ok',
        simples: 'Anotado no histórico. Pagamento agendado não entra na pilha: ele só pode ser cancelado.',
        legenda: 'Fica registrado no histórico. Repare: agendado NÃO entra na pilha, ele só pode ser cancelado antes de executar.',
        log: ['  [AGENDADO] ' + textoOperacao(op)] });
      return P;
    }

    /* Opção 9 */
    cancelarAgendamento(numero) {
      const P = [];
      const i = this.agenda.findIndex(o => o.numero === numero);
      if (i < 0) {
        this.passo(P, { fn: 'cancelarAgendado', linha: L('cancelarAgendado', 'return cancelado;'), tom: 'erro',
          simples: 'Não há agendamento #' + numero + '. Talvez ele já tenha sido pago.',
          legenda: 'O laço percorreu a agenda inteira e não achou esse número. Talvez já tenha sido executado.',
          log: ['  Não há pagamento agendado com número ' + numero + ' (talvez já tenha sido executado).'] });
        return P;
      }
      if (!this.conferirHistorico(P, 1)) return P;
      const op = this.agenda.splice(i, 1)[0];
      this.emMaos = op;
      this.passo(P, { fn: 'cancelarAgendado', linha: L('cancelarAgendado', 'removerPosicao'),
        foco: { area: 'op', chave: 'op' + op.numero },
        simples: 'O agendamento #' + op.numero + ' foi tirado da agenda.',
        legenda: 'Achou a #' + op.numero + ' na posição ' + (i + 1) + '. removerPosicao puxa os de trás uma casa para frente, e a agenda continua ordenada.' });
      this.emMaos = null;
      this.registrar(P, op, SIT_CANCELADA, this.hoje, { tom: 'ok', simples: 'Anotado no histórico como cancelado.', log: ['  [CANCELADO] ' + textoOperacao(op)] });
      return P;
    }

    /* Opção 10 */
    avancarData(novaData) {
      const P = [];
      const fn = 'avancarData';
      if (novaData <= this.hoje) {
        this.passo(P, { fn, linha: L(fn, 'novaData <= banco.hoje'), tom: 'erro',
          simples: 'A data só pode ir para frente.',
          legenda: 'O tempo só anda para frente.',
          log: ['  A nova data precisa ser depois de ' + textoData(this.hoje) + '.'] });
        return P;
      }
      if (!this.conferirHistorico(P, this.agenda.filter(o => o.data <= novaData).length)) return P;
      this.hoje = novaData;
      this.passo(P, { fn, linha: L(fn, 'banco.hoje = novaData'), foco: { area: 'data' },
        simples: 'Agora é dia ' + textoData(novaData).slice(0, 5) + '. Vamos ver se algum pagamento agendado venceu.',
        legenda: 'O calendário avança para ' + textoData(novaData) + '. Agora executamos os agendados que venceram.',
        log: ['  Data atual: ' + textoData(novaData)] });

      let executados = 0;
      while (this.agenda.length > 0 && this.agenda[0].data <= this.hoje) {
        const op = this.agenda.shift();
        executados++;
        this.emMaos = op;
        this.passo(P, { fn, linha: L(fn, 'while ((op = retirarVencido'),
          foco: { area: 'op', chave: 'op' + op.numero },
          simples: 'O pagamento #' + op.numero + ' era para ' + textoData(op.data).slice(0, 5) + ': chegou a hora de pagar.',
          legenda: 'A agenda está ordenada, então basta olhar o primeiro: a #' + op.numero + ' venceu (' + textoData(op.data) + ').' });
        const ok = this.conferirEAplicar(P, op);
        this.emMaos = null;
        if (ok) {
          this.registrar(P, op, SIT_AGENDADO_PAGO, op.data, { tom: 'ok',
            simples: 'Pago e anotado no histórico.',
            legenda: 'Pago e registrado no histórico com a data do agendamento. Agendado não entra na pilha.',
            log: ['  [AGENDADO PAGO] ' + textoOperacao(op)] });
        } else {
          this.registrar(P, op, SIT_AGENDADO_RECUSADO, op.data, { tom: 'erro',
            simples: 'Sem saldo no dia: o pagamento foi recusado e anotado no histórico.',
            legenda: 'Sem saldo na data: o pagamento é recusado e registrado no histórico.',
            log: ['  [AGENDADO RECUSADO: saldo insuficiente] ' + textoOperacao(op)] });
        }
      }
      if (executados === 0) {
        this.passo(P, { fn, linha: L(fn, 'while ((op = retirarVencido'),
          simples: 'Nenhum pagamento vence hoje.',
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

  /* ---------------- Partes do simulador ---------------- */
  /* Um roteiro curto por estrutura. "preparo" roda em silêncio antes (o estado
   * de partida); "comandos" são os passos mostrados ao clicar em Rodar. */
  const PARTES = {
    fila: {
      nome: 'Fila',
      intro: 'Carla tem R$ 50,00 e pede dois saques: primeiro R$ 40, depois R$ 30. A fila atende na ordem de chegada, então o primeiro pedido leva o dinheiro e o segundo fica sem saldo.',
      preparo: [],
      comandos: [
        { titulo: 'Opção 2: Carla pede saque de R$ 40', run: b => b.solicitarOperacao(TIPO_SAQUE, 3, 0, 40) },
        { titulo: 'Opção 2: Carla pede outro saque, de R$ 30', run: b => b.solicitarOperacao(TIPO_SAQUE, 3, 0, 30) },
        { titulo: 'Opção 6: processar a fila inteira', run: b => b.processarTodos() }
      ]
    },
    pilha: {
      nome: 'Pilha',
      intro: 'Já aconteceram duas operações: o saque de R$ 40 da Carla e, depois, a transferência de R$ 150 da Ana para o Bruno. As duas estão na pilha. Cada estorno desfaz a de cima, a mais recente.',
      preparo: [
        { titulo: 'Opção 2: Carla pede saque de R$ 40', run: b => b.solicitarOperacao(TIPO_SAQUE, 3, 0, 40) },
        { titulo: 'Opção 3: Ana transfere R$ 150 para Bruno', run: b => b.solicitarOperacao(TIPO_TRANSFERENCIA, 1, 2, 150) },
        { titulo: 'Opção 6: processar a fila inteira', run: b => b.processarTodos() }
      ],
      comandos: [
        { titulo: 'Opção 7: estornar o topo da pilha', run: b => b.estornar() },
        { titulo: 'Opção 7: estornar o novo topo', run: b => b.estornar() },
        { titulo: 'Opção 7: estornar com a pilha vazia', run: b => b.estornar() }
      ]
    },
    agenda: {
      nome: 'Agenda',
      intro: 'Ana agenda dois pagamentos fora de ordem: R$ 100 para 10/11 e depois R$ 50 para 08/11. A agenda se organiza por data. Depois o calendário avança até 08/11 e o pagamento do dia é feito.',
      preparo: [],
      comandos: [
        { titulo: 'Opção 8: Ana agenda R$ 100 para 10/11', run: b => b.agendarPagamento(1, 100, 20261110) },
        { titulo: 'Opção 8: Ana agenda R$ 50 para 08/11', run: b => b.agendarPagamento(1, 50, 20261108) },
        { titulo: 'Opção 10: avançar a data para 08/11', run: b => b.avancarData(20261108) }
      ]
    },
    vetor: {
      nome: 'Vetor',
      intro: 'Tudo o que acontece no banco é anotado no histórico, um vetor: cada evento ocupa a próxima posição livre. Vamos fazer quatro operações e ver cada anotação entrar.',
      preparo: [],
      comandos: [
        { titulo: 'Opções 1 e 5: depósito de R$ 100 para Carla', run: b => { const P = b.solicitarOperacao(TIPO_DEPOSITO, 0, 3, 100); b.processarProximo(P); return P; } },
        { titulo: 'Opções 2 e 5: Carla tenta sacar R$ 500', run: b => { const P = b.solicitarOperacao(TIPO_SAQUE, 3, 0, 500); b.processarProximo(P); return P; } },
        { titulo: 'Opção 7: estornar o depósito', run: b => b.estornar() },
        { titulo: 'Opção 8: Ana agenda R$ 20 para 08/11', run: b => b.agendarPagamento(1, 20, 20261108) }
      ]
    }
  };

  global.BancoEP = {
    Banco, CODIGO, ROTEIROS, PARTES, NOME_CURTO, NOME_SIT,
    TIPO_DEPOSITO, TIPO_SAQUE, TIPO_TRANSFERENCIA, TIPO_PAGAMENTO, SEM_CONTA,
    SIT_EFETIVADA, SIT_RECUSADA, SIT_ESTORNADA, SIT_AGENDADA, SIT_CANCELADA,
    SIT_AGENDADO_PAGO, SIT_AGENDADO_RECUSADO, CAPACIDADE_FILA, DATA_INICIAL,
    textoData, textoOperacao, reais
  };
})(typeof window !== 'undefined' ? window : globalThis);
