/*
 * teste_sistema.c
 * ---------------
 * Teste do sistema completo, com os casos extremos pedidos no EP:
 *   - estorno sem nada efetivado (pilha vazia)
 *   - saldo insuficiente (e a ordem FIFO decidindo quem é recusado)
 *   - estorno na ordem LIFO, devolvendo os saldos
 *   - agendado com data igual (desempate) e que não entra na pilha
 *   - estorno impossível porque o dinheiro já foi usado
 *
 * Contas iniciais: 1 Ana R$ 500, 2 Bruno R$ 200, 3 Carla R$ 50.
 */

#include <math.h>
#include "sistema.h"
#include "entrada.h"
#include "verificar.h"

/* Compara dois valores em reais com tolerância de meio centavo. */
int igual(double a, double b)
{
    double diferenca = a - b;
    return diferenca < 0.005 && diferenca > -0.005;
}

double saldo(int conta)
{
    return banco.contas[buscarConta(conta)].saldo;
}

int main(void)
{

    configurarConsole();
    iniciarSistema(20261105);

    printf("== 1. Estorno sem nada efetivado ==\n");
    verificar(estornar() == RES_NADA_A_ESTORNAR, "pilha vazia: nada a estornar");

    printf("\n== 2. Validações do pedido ==\n");
    verificar(solicitarOperacao(TIPO_SAQUE, 9, SEM_CONTA, 10) == RES_CONTA_INVALIDA,
              "conta 9 não existe");
    verificar(solicitarOperacao(TIPO_SAQUE, 1, SEM_CONTA, 0) == RES_VALOR_INVALIDO,
              "valor zero é recusado");
    verificar(solicitarOperacao(TIPO_TRANSFERENCIA, 1, 1, 10) == RES_MESMA_CONTA,
              "transferência para a mesma conta é recusada");
    verificar(solicitarOperacao(TIPO_TRANSFERENCIA, SEM_CONTA, 2, 10) == RES_CONTA_INVALIDA,
              "transferência com origem 0 é recusada (não cria dinheiro)");
    verificar(solicitarOperacao(TIPO_SAQUE, SEM_CONTA, SEM_CONTA, 10) == RES_CONTA_INVALIDA,
              "saque da conta 0 é recusado");
    verificar(solicitarOperacao(TIPO_DEPOSITO, SEM_CONTA, 1, 2000000) == RES_VALOR_INVALIDO,
              "valor acima do máximo é recusado");
    /* NAN é o valor especial "não é um número". */
    verificar(solicitarOperacao(TIPO_DEPOSITO, SEM_CONTA, 1, NAN)
              == RES_VALOR_INVALIDO, "valor nan é recusado");
    verificar(filaVazia(), "nenhum pedido inválido entrou na fila");

    printf("\n== 3. FIFO decide quem fica sem saldo (Carla tem R$ 50) ==\n");
    solicitarOperacao(TIPO_SAQUE, 3, SEM_CONTA, 40);   /* #1 */
    solicitarOperacao(TIPO_SAQUE, 3, SEM_CONTA, 30);   /* #2 */
    verificar(processarProximo() == RES_OK, "#1 (saque 40) chegou primeiro: efetivado");
    verificar(processarProximo() == RES_SALDO_INSUFICIENTE,
              "#2 (saque 30) sobra só R$ 10: recusado");
    verificar(igual(saldo(3), 10), "Carla fica com R$ 10");
    verificar(banco.efetivadas.quantidade == 1, "só o efetivado foi para a pilha");

    printf("\n== 4. Mais operações e estorno LIFO ==\n");
    solicitarOperacao(TIPO_DEPOSITO, SEM_CONTA, 2, 100);   /* #3 */
    solicitarOperacao(TIPO_TRANSFERENCIA, 1, 2, 150);      /* #4 */
    solicitarOperacao(TIPO_PAGAMENTO, 2, SEM_CONTA, 80);   /* #5 */
    verificar(processarTodos() == 3, "processou os 3 pedidos da fila");
    verificar(igual(saldo(1), 350) && igual(saldo(2), 370),
              "Ana R$ 350, Bruno R$ 370 (200 + 100 + 150 - 80)");
    verificar(banco.efetivadas.itens[banco.efetivadas.quantidade - 1].numero == 5,
              "topo da pilha é o #5 (o último efetivado)");

    verificar(estornar() == RES_OK && igual(saldo(2), 450),
              "estorno desfaz o #5: Bruno volta a R$ 450");
    verificar(estornar() == RES_OK && igual(saldo(1), 500) && igual(saldo(2), 300),
              "estorno desfaz o #4: Ana R$ 500, Bruno R$ 300");

    printf("\n== 5. Agendados: datas iguais e fora da pilha ==\n");
    verificar(agendarPagamento(1, 10, 20261105) == RES_DATA_INVALIDA,
              "agendar para hoje é recusado");
    agendarPagamento(1, 100, 20261110);   /* #6 */
    agendarPagamento(1, 50,  20261108);   /* #7 */
    agendarPagamento(1, 30,  20261110);   /* #8: mesma data do #6 */
    agendarPagamento(1, 20,  20261112);   /* #9 */
    verificar(banco.agendados.itens[0].numero == 7 &&
              banco.agendados.itens[1].numero == 6 &&
              banco.agendados.itens[2].numero == 8,
              "ordem 7, 6, 8: no empate de 10/11 o #6 (entrou antes) vem primeiro");
    verificar(cancelarAgendamento(9) == RES_OK, "#9 cancelado antes de executar");
    verificar(avancarData(20261108) == RES_OK && igual(saldo(1), 450),
              "em 08/11 paga só o #7: Ana R$ 450");
    verificar(avancarData(20261107) == RES_DATA_INVALIDA, "não dá para voltar a data");
    avancarData(20261115);
    verificar(igual(saldo(1), 320), "em 15/11 pagou #6 e #8: Ana R$ 320");
    verificar(agendaVazia(), "agenda vazia");
    verificar(cancelarAgendamento(6) == RES_NAO_ENCONTRADO,
              "não dá para cancelar agendado já executado");
    verificar(banco.efetivadas.quantidade == 2, "agendados não entraram na pilha (continua com #1 e #3)");

    printf("\n== 6. Estorno impossível (dinheiro já usado) ==\n");
    /* Topo é o #3: depósito de 100 no Bruno (que tem R$ 300). Gastamos tudo. */
    solicitarOperacao(TIPO_PAGAMENTO, 2, SEM_CONTA, 300);  /* #10 */
    processarProximo();
    estornar();                     /* desfaz o #10: Bruno volta a R$ 300 */
    agendarPagamento(2, 250, 20261120);                    /* #11 */
    avancarData(20261120);        /* Bruno fica com R$ 50 */
    verificar(estornar() == RES_ESTORNO_IMPOSSIVEL,
              "estornar depósito de R$ 100 com Bruno tendo R$ 50: impossível");
    verificar(igual(saldo(2), 50) &&
              banco.efetivadas.itens[banco.efetivadas.quantidade - 1].numero == 3,
              "nada mudou: saldo R$ 50 e #3 continua no topo");

    printf("\n== 7. Histórico ==\n");
    mostrarHistorico(0);
    verificar(banco.historico.quantidade == 19, "19 registros no histórico");

    encerrarSistema();
    verificar(banco.historico.quantidade == 0, "histórico zerado ao encerrar");

    printf("\n== 8. Limite do histórico em vetor ==\n");
    iniciarSistema(20261105);
    {
        Operacao op = criarOperacao(1, TIPO_DEPOSITO, SEM_CONTA, 1, 10);
        int i, numero;
        for (i = 0; i < CAPACIDADE_HISTORICO; i++) registrarHistorico(op, SIT_EFETIVADA, banco.hoje);
        verificar(!registrarHistorico(op, SIT_RECUSADA, banco.hoje) &&
                  banco.historico.quantidade == CAPACIDADE_HISTORICO,
                  "histórico cheio recusa novo registro sem ultrapassar o vetor");
        verificar(banco.historico.itens[0].situacao == SIT_EFETIVADA &&
                  banco.historico.itens[CAPACIDADE_HISTORICO - 1].situacao == SIT_EFETIVADA,
                  "registros anteriores são preservados");
        solicitarOperacao(TIPO_DEPOSITO, SEM_CONTA, 1, 10);
        verificar(processarProximo() == RES_HISTORICO_CHEIO && banco.pedidos.quantidade == 1 && igual(saldo(1), 500),
                  "processamento sem espaço mantém pedido na fila e saldo intacto");
        verificar(processarTodos() == 0 && banco.pedidos.quantidade == 1,
                  "processar todos para quando o histórico está cheio");
        numero = banco.proximoNumero;
        verificar(agendarPagamento(1, 10, 20261106) == RES_HISTORICO_CHEIO &&
                  banco.agendados.quantidade == 0 && banco.proximoNumero == numero,
                  "agendamento sem espaço não cria operação nem avança número");

        iniciarSistema(20261105);
        solicitarOperacao(TIPO_DEPOSITO, SEM_CONTA, 1, 10);
        processarProximo();
        agendarPagamento(1, 20, 20261106);
        agendarPagamento(1, 30, 20261106);
        while (historicoTemEspaco(1)) registrarHistorico(op, SIT_EFETIVADA, banco.hoje);
        verificar(estornar() == RES_HISTORICO_CHEIO && banco.efetivadas.quantidade == 1 && igual(saldo(1), 510),
                  "estorno sem espaço preserva topo e saldo");
        verificar(cancelarAgendamento(2) == RES_HISTORICO_CHEIO && banco.agendados.quantidade == 2,
                  "cancelamento sem espaço mantém o pagamento na agenda");
        verificar(cancelarAgendamento(99) == RES_NAO_ENCONTRADO,
                  "cancelamento inexistente continua sendo identificado com histórico cheio");
        banco.historico.quantidade--; /* Sobra uma vaga, mas há dois vencidos. */
        verificar(avancarData(20261106) == RES_HISTORICO_CHEIO && banco.hoje == 20261105 &&
                  banco.agendados.quantidade == 2 && igual(saldo(1), 510),
                  "avanço da data exige espaço para todos os vencidos antes de alterar o banco");
        banco.historico.quantidade--;
        verificar(avancarData(20261106) == RES_OK && banco.agendados.quantidade == 0 &&
                  banco.historico.quantidade == CAPACIDADE_HISTORICO && igual(saldo(1), 460),
                  "duas vagas permitem executar e registrar os dois vencidos");
    }
    return resumoDosTestes();
}
