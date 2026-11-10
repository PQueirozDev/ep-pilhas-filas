/* Banco em vetores: acesso direto ao estado global, sem parâmetros de endereço. */
#include <stdio.h>

#include "sistema.h"

Sistema banco;

#define MEIO_CENTAVO 0.005

#define VALOR_MAXIMO 1000000.00

double arredondarCentavos(double valor)
{
    return (long long) (valor * 100 + 0.5) / 100.0;
}

int valorValido(double valor)
{
    if (!(valor > 0) || valor > VALOR_MAXIMO) {
        printf("  Valor deve ser maior que zero e até R$ %.2f.\n", VALOR_MAXIMO);
        return 0;
    }
    return 1;
}

void iniciarSistema(int dataInicial)
{
    banco.contas[0] = (Conta){1, "Ana", 500.00};
    banco.contas[1] = (Conta){2, "Bruno", 200.00};
    banco.contas[2] = (Conta){3, "Carla", 50.00};

    iniciarFila();
    iniciarPilha();
    iniciarAgenda();
    iniciarHistorico();

    banco.hoje = dataInicial;
    banco.proximoNumero = 1;
}

void encerrarSistema(void)
{
    iniciarHistorico();
}

int buscarConta(int numero)
{
    int i;
    for (i = 0; i < NUM_CONTAS; i++) {
        if (banco.contas[i].numero == numero) {
            return i;
        }
    }
    return -1;
}

int aplicarOperacao(Operacao op)
{
    int origem = buscarConta(op.contaOrigem);
    int destino = buscarConta(op.contaDestino);

    if (origem >= 0 && banco.contas[origem].saldo + MEIO_CENTAVO < op.valor) {
        return RES_SALDO_INSUFICIENTE;
    }
    if (origem >= 0)  banco.contas[origem].saldo  -= op.valor;
    if (destino >= 0) banco.contas[destino].saldo += op.valor;
    return RES_OK;
}

int desfazerOperacao(Operacao op)
{
    int origem = buscarConta(op.contaOrigem);
    int destino = buscarConta(op.contaDestino);

    if (destino >= 0 && banco.contas[destino].saldo + MEIO_CENTAVO < op.valor) {
        return RES_ESTORNO_IMPOSSIVEL;
    }
    if (destino >= 0) banco.contas[destino].saldo -= op.valor;
    if (origem >= 0)  banco.contas[origem].saldo  += op.valor;
    return RES_OK;
}

int solicitarOperacao(int tipo, int origem, int destino, double valor)
{
    Operacao op;
    int precisaOrigem, precisaDestino;

    if (!valorValido(valor)) {
        return RES_VALOR_INVALIDO;
    }
    valor = arredondarCentavos(valor);

    precisaOrigem  = (tipo == TIPO_SAQUE || tipo == TIPO_TRANSFERENCIA ||
                      tipo == TIPO_PAGAMENTO);
    precisaDestino = (tipo == TIPO_DEPOSITO || tipo == TIPO_TRANSFERENCIA);

    if ((precisaOrigem && buscarConta(origem) < 0) ||
        (precisaDestino && buscarConta(destino) < 0)) {
        printf("  Conta inexistente.\n");
        return RES_CONTA_INVALIDA;
    }
    if (!precisaOrigem)  origem  = SEM_CONTA;
    if (!precisaDestino) destino = SEM_CONTA;
    if (tipo == TIPO_TRANSFERENCIA && origem == destino) {
        printf("  Origem e destino são a mesma conta.\n");
        return RES_MESMA_CONTA;
    }
    if (filaCheia()) {
        printf("  Fila cheia (%d pedidos). Processe a fila antes.\n", CAPACIDADE_FILA);
        return RES_FILA_CHEIA;
    }

    op = criarOperacao(banco.proximoNumero, tipo, origem, destino, valor);
    banco.proximoNumero++;
    enfileirar(op);

    printf("  Pedido na fila (posição %d): ", banco.pedidos.quantidade);
    imprimirOperacao(op);
    return RES_OK;
}

/* Antes de alterar saldos ou estruturas, reservamos espaço para o registro. */
int conferirHistorico(int novos)
{
    if (historicoTemEspaco(novos)) return 1;
    printf("  Histórico cheio (%d registros). Nenhuma alteração realizada.\n", CAPACIDADE_HISTORICO);
    return 0;
}

int processarProximo(void)
{
    Operacao op;
    int resultado;

    if (filaVazia()) {
        printf("  Nenhum pedido na fila.\n");
        return RES_FILA_VAZIA;
    }

    if (pilhaCheia()) {
        printf("  Limite de %d operações estornáveis atingido.\n", CAPACIDADE_PILHA);
        return RES_PILHA_CHEIA;
    }

    if (!conferirHistorico(1)) return RES_HISTORICO_CHEIO;
    op = desenfileirar();
    resultado = aplicarOperacao(op);

    if (resultado == RES_OK) {
        empilhar(op);
        registrarHistorico(op, SIT_EFETIVADA, banco.hoje);
        printf("  [EFETIVADA] ");
    } else {
        registrarHistorico(op, SIT_RECUSADA, banco.hoje);
        printf("  [RECUSADA: saldo insuficiente] ");
    }
    imprimirOperacao(op);
    return resultado;
}

int processarTodos(void)
{
    int atendidos = 0, resultado;

    if (filaVazia()) {
        printf("  Nenhum pedido na fila.\n");
        return 0;
    }
    while (!filaVazia()) {
        if ((resultado = processarProximo()) == RES_PILHA_CHEIA || resultado == RES_HISTORICO_CHEIO) {
            break;
        }
        atendidos++;
    }
    return atendidos;
}

int estornar(void)
{
    Operacao op;

    if (!pilhaVazia() && !conferirHistorico(1)) return RES_HISTORICO_CHEIO;
    op = desempilhar();
    if (op.numero == 0) {
        printf("  Nada a estornar.\n");
        return RES_NADA_A_ESTORNAR;
    }
    if (desfazerOperacao(op) != RES_OK) {
        empilhar(op);
        printf("  Estorno impossível: a conta %d já não tem R$ %.2f.\n",
               op.contaDestino, op.valor);
        printf("  A operação continua no topo da pilha: ");
        imprimirOperacao(op);
        return RES_ESTORNO_IMPOSSIVEL;
    }
    registrarHistorico(op, SIT_ESTORNADA, banco.hoje);
    printf("  [ESTORNADA] ");
    imprimirOperacao(op);
    return RES_OK;
}

int agendarPagamento(int conta, double valor, int data)
{
    Operacao op;

    if (!valorValido(valor)) {
        return RES_VALOR_INVALIDO;
    }
    valor = arredondarCentavos(valor);
    if (buscarConta(conta) < 0) {
        printf("  Conta inexistente.\n");
        return RES_CONTA_INVALIDA;
    }
    if (data <= banco.hoje) {
        printf("  A data deve ser depois de hoje (");
        imprimirData(banco.hoje);
        printf("). Para hoje, use o pagamento imediato.\n");
        return RES_DATA_INVALIDA;
    }
    if (agendaCheia()) {
        printf("  Agenda cheia (%d pagamentos).\n", CAPACIDADE_AGENDA);
        return RES_AGENDA_CHEIA;
    }

    if (!conferirHistorico(1)) return RES_HISTORICO_CHEIO;
    op = criarOperacao(banco.proximoNumero, TIPO_PAGAMENTO, conta, SEM_CONTA, valor);
    op.data = data;
    banco.proximoNumero++;
    agendar(op);
    registrarHistorico(op, SIT_AGENDADA, banco.hoje);

    printf("  [AGENDADO] ");
    imprimirOperacao(op);
    return RES_OK;
}

int cancelarAgendamento(int numero)
{
    Operacao op;

    int i;
    for (i = 0; i < banco.agendados.quantidade; i++) {
        if (banco.agendados.itens[i].numero == numero && !conferirHistorico(1)) return RES_HISTORICO_CHEIO;
    }
    op = cancelarAgendado(numero);
    if (op.numero == 0) {
        printf("  Não há pagamento agendado com número %d"
               " (talvez já tenha sido executado).\n", numero);
        return RES_NAO_ENCONTRADO;
    }
    registrarHistorico(op, SIT_CANCELADA, banco.hoje);
    printf("  [CANCELADO] ");
    imprimirOperacao(op);
    return RES_OK;
}

int avancarData(int novaData)
{
    Operacao op;
    int executados = 0, vencidos = 0, i;

    if (novaData <= banco.hoje) {
        printf("  A nova data precisa ser depois de ");
        imprimirData(banco.hoje);
        printf(".\n");
        return RES_DATA_INVALIDA;
    }
    for (i = 0; i < banco.agendados.quantidade; i++) {
        if (banco.agendados.itens[i].data <= novaData) vencidos++;
    }
    if (!conferirHistorico(vencidos)) return RES_HISTORICO_CHEIO;
    banco.hoje = novaData;
    printf("  Data atual: ");
    imprimirData(banco.hoje);
    printf("\n");

    while ((op = retirarVencido(banco.hoje)).numero != 0) {
        executados++;
        if (aplicarOperacao(op) == RES_OK) {
            registrarHistorico(op, SIT_AGENDADO_PAGO, op.data);
            printf("  [AGENDADO PAGO] ");
        } else {
            registrarHistorico(op, SIT_AGENDADO_RECUSADO, op.data);
            printf("  [AGENDADO RECUSADO: saldo insuficiente] ");
        }
        imprimirOperacao(op);

    }
    if (executados == 0) {
        printf("  Nenhum pagamento agendado venceu.\n");
    }
    return RES_OK;
}

void mostrarContas(void)
{
    int i;
    for (i = 0; i < NUM_CONTAS; i++) {
        printf("   Conta %d  %-8s  R$ %9.2f\n",
               banco.contas[i].numero, banco.contas[i].titular, banco.contas[i].saldo);
    }
}

void mostrarSituacao(void)
{
    printf("\n  Data: ");
    imprimirData(banco.hoje);
    printf("\n\n  CONTAS\n");
    mostrarContas();
    printf("\n  FILA de pedidos imediatos (1º = próximo a ser atendido)\n");
    mostrarFila();
    printf("\n  PILHA de efetivadas (topo = próximo estorno)\n");
    mostrarPilha();
    printf("\n  AGENDA de pagamentos (ordem de execução)\n");
    mostrarAgenda();
}
