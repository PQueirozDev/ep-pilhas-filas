/*
 * sistema.c
 * ---------
 * Regras do banco e caminho de cada operação pelas estruturas
 * (ver o resumo em sistema.h).
 */

#include <stdio.h>
#include <string.h>     /* strcpy */
#include "sistema.h"

/* Valores em double podem ter erros minúsculos de arredondamento
 * (ex.: 0.1 + 0.2 vira 0.30000000000000004). Para não recusar um saque
 * por causa disso, aceitamos uma diferença de até meio centavo. */
#define MEIO_CENTAVO 0.005

/* Maior valor aceito numa operação (evita números absurdos). */
#define VALOR_MAXIMO 1000000.00

/* Arredonda para centavos: 50.004 -> 50.00 ; 12.345 -> 12.35.
 * Multiplica por 100, soma meio, corta a parte decimal com (long long)
 * e divide de volta. Só usamos com valores positivos. */
double arredondarCentavos(double valor)
{
    return (long long) (valor * 100 + 0.5) / 100.0;
}

/* Confere o valor digitado. Escrevemos "!(valor > 0)" em vez de
 * "valor <= 0" de propósito: se o valor for "nan" (não é um número),
 * qualquer comparação com ele dá falso, e assim ele também é recusado. */
int valorValido(double valor)
{
    if (!(valor > 0) || valor > VALOR_MAXIMO) {
        printf("  Valor deve ser maior que zero e até R$ %.2f.\n", VALOR_MAXIMO);
        return 0;
    }
    return 1;
}

/* ------------------------------------------------------------------ */
/* Preparação                                                          */
/* ------------------------------------------------------------------ */

void criarConta(Conta *c, int numero, const char *titular, double saldo)
{
    c->numero = numero;
    strcpy(c->titular, titular);   /* texto não se copia com "=": usa strcpy */
    c->saldo = saldo;
}

void iniciarSistema(Sistema *s, int dataInicial)
{
    criarConta(&s->contas[0], 1, "Ana",   500.00);
    criarConta(&s->contas[1], 2, "Bruno", 200.00);
    criarConta(&s->contas[2], 3, "Carla",  50.00);

    /* "&s->pedidos" = endereço do campo pedidos do sistema apontado por s */
    iniciarFila(&s->pedidos);
    iniciarPilha(&s->efetivadas);
    iniciarAgenda(&s->agendados);
    iniciarHistorico(&s->historico);

    s->hoje = dataInicial;
    s->proximoNumero = 1;
}

void encerrarSistema(Sistema *s)
{
    liberarHistorico(&s->historico);
}

Conta *buscarConta(Sistema *s, int numero)
{
    int i;
    for (i = 0; i < NUM_CONTAS; i++) {
        if (s->contas[i].numero == numero) {
            return &s->contas[i];   /* endereço da conta dentro do vetor */
        }
    }
    return NULL;                    /* inclui SEM_CONTA (0): não existe conta 0 */
}

/* ------------------------------------------------------------------ */
/* Movimentar dinheiro                                                 */
/* ------------------------------------------------------------------ */

/*
 * Aplica a regra única de todas as operações:
 *   o dinheiro SAI da conta de origem (se houver) e ENTRA na de destino
 *   (se houver). Se a origem não tem saldo, nada é alterado.
 * Recebemos ponteiros para as contas (Conta *) porque precisamos alterar
 * o saldo das contas verdadeiras, não de cópias.
 */
int aplicarOperacao(Sistema *s, Operacao op)
{
    Conta *origem  = buscarConta(s, op.contaOrigem);
    Conta *destino = buscarConta(s, op.contaDestino);

    if (origem != NULL && origem->saldo + MEIO_CENTAVO < op.valor) {
        return RES_SALDO_INSUFICIENTE;          /* caso extremo: sem saldo */
    }
    if (origem != NULL)  origem->saldo  -= op.valor;
    if (destino != NULL) destino->saldo += op.valor;
    return RES_OK;
}

/*
 * O contrário de aplicarOperacao: o dinheiro volta do destino para a
 * origem. O destino pode não ter mais o valor (ex.: um pagamento agendado
 * gastou o depósito que queremos estornar). Nesse caso não mexemos em nada.
 */
int desfazerOperacao(Sistema *s, Operacao op)
{
    Conta *origem  = buscarConta(s, op.contaOrigem);
    Conta *destino = buscarConta(s, op.contaDestino);

    if (destino != NULL && destino->saldo + MEIO_CENTAVO < op.valor) {
        return RES_ESTORNO_IMPOSSIVEL;
    }
    if (destino != NULL) destino->saldo -= op.valor;
    if (origem != NULL)  origem->saldo  += op.valor;
    return RES_OK;
}

/* ------------------------------------------------------------------ */
/* Pedidos imediatos: FILA                                             */
/* ------------------------------------------------------------------ */

int solicitarOperacao(Sistema *s, int tipo, int origem, int destino, double valor)
{
    Operacao op;
    int precisaOrigem, precisaDestino;

    if (!valorValido(valor)) {
        return RES_VALOR_INVALIDO;
    }
    valor = arredondarCentavos(valor);

    /* Quais contas cada tipo exige (veja a tabela em operacao.h).
     * Sem esta conferência, digitar a conta 0 como origem de uma
     * transferência "criaria" dinheiro do nada. */
    precisaOrigem  = (tipo == TIPO_SAQUE || tipo == TIPO_TRANSFERENCIA ||
                      tipo == TIPO_PAGAMENTO);
    precisaDestino = (tipo == TIPO_DEPOSITO || tipo == TIPO_TRANSFERENCIA);

    if ((precisaOrigem && buscarConta(s, origem) == NULL) ||
        (precisaDestino && buscarConta(s, destino) == NULL)) {
        printf("  Conta inexistente.\n");
        return RES_CONTA_INVALIDA;
    }
    if (!precisaOrigem)  origem  = SEM_CONTA;   /* ignora conta que não se aplica */
    if (!precisaDestino) destino = SEM_CONTA;
    if (tipo == TIPO_TRANSFERENCIA && origem == destino) {
        printf("  Origem e destino são a mesma conta.\n");
        return RES_MESMA_CONTA;
    }
    if (filaCheia(&s->pedidos)) {
        printf("  Fila cheia (%d pedidos). Processe a fila antes.\n", CAPACIDADE_FILA);
        return RES_FILA_CHEIA;
    }

    op = criarOperacao(s->proximoNumero, tipo, origem, destino, valor);
    s->proximoNumero++;
    enfileirar(&s->pedidos, op);

    printf("  Pedido na fila (posição %d): ", s->pedidos.quantidade);
    imprimirOperacao(op);
    return RES_OK;
}

int processarProximo(Sistema *s)
{
    Operacao op;
    int resultado;

    if (filaVazia(&s->pedidos)) {
        printf("  Nenhum pedido na fila.\n");
        return RES_FILA_VAZIA;
    }
    /* Conferimos ANTES de tirar da fila: se a pilha estiver cheia, a
     * operação não poderia ser estornada, então ela espera na fila. */
    if (pilhaCheia(&s->efetivadas)) {
        printf("  Limite de %d operações estornáveis atingido.\n", CAPACIDADE_PILHA);
        return RES_PILHA_CHEIA;
    }

    desenfileirar(&s->pedidos, &op);         /* FIFO: sai o mais antigo */
    resultado = aplicarOperacao(s, op);

    if (resultado == RES_OK) {
        empilhar(&s->efetivadas, op);        /* LIFO: vira o novo topo  */
        registrarHistorico(&s->historico, op, SIT_EFETIVADA, s->hoje);
        printf("  [EFETIVADA] ");
    } else {
        registrarHistorico(&s->historico, op, SIT_RECUSADA, s->hoje);
        printf("  [RECUSADA: saldo insuficiente] ");
    }
    imprimirOperacao(op);
    return resultado;
}

int processarTodos(Sistema *s)
{
    int atendidos = 0;

    if (filaVazia(&s->pedidos)) {
        printf("  Nenhum pedido na fila.\n");
        return 0;
    }
    while (!filaVazia(&s->pedidos)) {
        if (processarProximo(s) == RES_PILHA_CHEIA) {
            break;
        }
        atendidos++;
    }
    return atendidos;
}

/* ------------------------------------------------------------------ */
/* Estorno: PILHA                                                      */
/* ------------------------------------------------------------------ */

int estornar(Sistema *s)
{
    Operacao op;

    if (!desempilhar(&s->efetivadas, &op)) {
        printf("  Nada a estornar.\n");      /* caso extremo: pilha vazia */
        return RES_NADA_A_ESTORNAR;
    }
    if (desfazerOperacao(s, op) != RES_OK) {
        empilhar(&s->efetivadas, op);        /* devolve ao topo: nada mudou */
        printf("  Estorno impossível: a conta %d já não tem R$ %.2f.\n",
               op.contaDestino, op.valor);
        printf("  A operação continua no topo da pilha: ");
        imprimirOperacao(op);
        return RES_ESTORNO_IMPOSSIVEL;
    }
    registrarHistorico(&s->historico, op, SIT_ESTORNADA, s->hoje);
    printf("  [ESTORNADA] ");
    imprimirOperacao(op);
    return RES_OK;
}

/* ------------------------------------------------------------------ */
/* Pagamentos agendados                                                */
/* ------------------------------------------------------------------ */

int agendarPagamento(Sistema *s, int conta, double valor, int data)
{
    Operacao op;

    if (!valorValido(valor)) {
        return RES_VALOR_INVALIDO;
    }
    valor = arredondarCentavos(valor);
    if (buscarConta(s, conta) == NULL) {
        printf("  Conta inexistente.\n");
        return RES_CONTA_INVALIDA;
    }
    if (data <= s->hoje) {
        printf("  A data deve ser depois de hoje (");
        imprimirData(s->hoje);
        printf("). Para hoje, use o pagamento imediato.\n");
        return RES_DATA_INVALIDA;
    }
    if (agendaCheia(&s->agendados)) {
        printf("  Agenda cheia (%d pagamentos).\n", CAPACIDADE_AGENDA);
        return RES_AGENDA_CHEIA;
    }

    op = criarOperacao(s->proximoNumero, TIPO_PAGAMENTO, conta, SEM_CONTA, valor);
    op.data = data;
    s->proximoNumero++;
    agendar(&s->agendados, op);
    registrarHistorico(&s->historico, op, SIT_AGENDADA, s->hoje);

    printf("  [AGENDADO] ");
    imprimirOperacao(op);
    return RES_OK;
}

int cancelarAgendamento(Sistema *s, int numero)
{
    Operacao op;

    if (!cancelarAgendado(&s->agendados, numero, &op)) {
        printf("  Não há pagamento agendado com número %d"
               " (talvez já tenha sido executado).\n", numero);
        return RES_NAO_ENCONTRADO;
    }
    registrarHistorico(&s->historico, op, SIT_CANCELADA, s->hoje);
    printf("  [CANCELADO] ");
    imprimirOperacao(op);
    return RES_OK;
}

int avancarData(Sistema *s, int novaData)
{
    Operacao op;
    int executados = 0;

    if (novaData <= s->hoje) {
        printf("  A nova data precisa ser depois de ");
        imprimirData(s->hoje);
        printf(".\n");
        return RES_DATA_INVALIDA;
    }
    s->hoje = novaData;
    printf("  Data atual: ");
    imprimirData(s->hoje);
    printf("\n");

    /* A agenda está ordenada: retiramos do primeiro em diante,
     * enquanto houver algum com data <= hoje. */
    while (retirarVencido(&s->agendados, s->hoje, &op)) {
        executados++;
        if (aplicarOperacao(s, op) == RES_OK) {
            registrarHistorico(&s->historico, op, SIT_AGENDADO_PAGO, op.data);
            printf("  [AGENDADO PAGO] ");
        } else {
            registrarHistorico(&s->historico, op, SIT_AGENDADO_RECUSADO, op.data);
            printf("  [AGENDADO RECUSADO: saldo insuficiente] ");
        }
        imprimirOperacao(op);
        /* Repare: agendados NÃO são empilhados (não entram no estorno). */
    }
    if (executados == 0) {
        printf("  Nenhum pagamento agendado venceu.\n");
    }
    return RES_OK;
}

/* ------------------------------------------------------------------ */
/* Consultas                                                           */
/* ------------------------------------------------------------------ */

void mostrarContas(Sistema *s)
{
    int i;
    for (i = 0; i < NUM_CONTAS; i++) {
        printf("   Conta %d  %-8s  R$ %9.2f\n",
               s->contas[i].numero, s->contas[i].titular, s->contas[i].saldo);
    }
}

void mostrarSituacao(Sistema *s)
{
    printf("\n  Data: ");
    imprimirData(s->hoje);
    printf("\n\n  CONTAS\n");
    mostrarContas(s);
    printf("\n  FILA de pedidos imediatos (1º = próximo a ser atendido)\n");
    mostrarFila(&s->pedidos);
    printf("\n  PILHA de efetivadas (topo = próximo estorno)\n");
    mostrarPilha(&s->efetivadas);
    printf("\n  AGENDA de pagamentos (ordem de execução)\n");
    mostrarAgenda(&s->agendados);
}
