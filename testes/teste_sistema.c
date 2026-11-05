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

#include <stdlib.h>     /* strtod */
#include "sistema.h"
#include "entrada.h"
#include "verificar.h"

/* Compara dois valores em reais com tolerância de meio centavo. */
int igual(double a, double b)
{
    double diferenca = a - b;
    return diferenca < 0.005 && diferenca > -0.005;
}

double saldo(Sistema *s, int conta)
{
    return buscarConta(s, conta)->saldo;
}

int main(void)
{
    Sistema s;

    configurarConsole();
    iniciarSistema(&s, 20261105);

    printf("== 1. Estorno sem nada efetivado ==\n");
    verificar(estornar(&s) == RES_NADA_A_ESTORNAR, "pilha vazia: nada a estornar");

    printf("\n== 2. Validações do pedido ==\n");
    verificar(solicitarOperacao(&s, TIPO_SAQUE, 9, SEM_CONTA, 10) == RES_CONTA_INVALIDA,
              "conta 9 não existe");
    verificar(solicitarOperacao(&s, TIPO_SAQUE, 1, SEM_CONTA, 0) == RES_VALOR_INVALIDO,
              "valor zero é recusado");
    verificar(solicitarOperacao(&s, TIPO_TRANSFERENCIA, 1, 1, 10) == RES_MESMA_CONTA,
              "transferência para a mesma conta é recusada");
    verificar(solicitarOperacao(&s, TIPO_TRANSFERENCIA, SEM_CONTA, 2, 10) == RES_CONTA_INVALIDA,
              "transferência com origem 0 é recusada (não cria dinheiro)");
    verificar(solicitarOperacao(&s, TIPO_SAQUE, SEM_CONTA, SEM_CONTA, 10) == RES_CONTA_INVALIDA,
              "saque da conta 0 é recusado");
    verificar(solicitarOperacao(&s, TIPO_DEPOSITO, SEM_CONTA, 1, 2000000) == RES_VALOR_INVALIDO,
              "valor acima do máximo é recusado");
    /* strtod("nan") produz o valor especial "não é um número" */
    verificar(solicitarOperacao(&s, TIPO_DEPOSITO, SEM_CONTA, 1, strtod("nan", NULL))
              == RES_VALOR_INVALIDO, "valor nan é recusado");
    verificar(filaVazia(&s.pedidos), "nenhum pedido inválido entrou na fila");

    printf("\n== 3. FIFO decide quem fica sem saldo (Carla tem R$ 50) ==\n");
    solicitarOperacao(&s, TIPO_SAQUE, 3, SEM_CONTA, 40);   /* #1 */
    solicitarOperacao(&s, TIPO_SAQUE, 3, SEM_CONTA, 30);   /* #2 */
    verificar(processarProximo(&s) == RES_OK, "#1 (saque 40) chegou primeiro: efetivado");
    verificar(processarProximo(&s) == RES_SALDO_INSUFICIENTE,
              "#2 (saque 30) sobra só R$ 10: recusado");
    verificar(igual(saldo(&s, 3), 10), "Carla fica com R$ 10");
    verificar(s.efetivadas.quantidade == 1, "só o efetivado foi para a pilha");

    printf("\n== 4. Mais operações e estorno LIFO ==\n");
    solicitarOperacao(&s, TIPO_DEPOSITO, SEM_CONTA, 2, 100);   /* #3 */
    solicitarOperacao(&s, TIPO_TRANSFERENCIA, 1, 2, 150);      /* #4 */
    solicitarOperacao(&s, TIPO_PAGAMENTO, 2, SEM_CONTA, 80);   /* #5 */
    verificar(processarTodos(&s) == 3, "processou os 3 pedidos da fila");
    verificar(igual(saldo(&s, 1), 350) && igual(saldo(&s, 2), 370),
              "Ana R$ 350, Bruno R$ 370 (200 + 100 + 150 - 80)");
    verificar(s.efetivadas.itens[s.efetivadas.quantidade - 1].numero == 5,
              "topo da pilha é o #5 (o último efetivado)");

    verificar(estornar(&s) == RES_OK && igual(saldo(&s, 2), 450),
              "estorno desfaz o #5: Bruno volta a R$ 450");
    verificar(estornar(&s) == RES_OK && igual(saldo(&s, 1), 500) && igual(saldo(&s, 2), 300),
              "estorno desfaz o #4: Ana R$ 500, Bruno R$ 300");

    printf("\n== 5. Agendados: datas iguais e fora da pilha ==\n");
    verificar(agendarPagamento(&s, 1, 10, 20261105) == RES_DATA_INVALIDA,
              "agendar para hoje é recusado");
    agendarPagamento(&s, 1, 100, 20261110);   /* #6 */
    agendarPagamento(&s, 1, 50,  20261108);   /* #7 */
    agendarPagamento(&s, 1, 30,  20261110);   /* #8: mesma data do #6 */
    agendarPagamento(&s, 1, 20,  20261112);   /* #9 */
    verificar(s.agendados.itens[0].numero == 7 &&
              s.agendados.itens[1].numero == 6 &&
              s.agendados.itens[2].numero == 8,
              "ordem 7, 6, 8: no empate de 10/11 o #6 (entrou antes) vem primeiro");
    verificar(cancelarAgendamento(&s, 9) == RES_OK, "#9 cancelado antes de executar");
    verificar(avancarData(&s, 20261108) == RES_OK && igual(saldo(&s, 1), 450),
              "em 08/11 paga só o #7: Ana R$ 450");
    verificar(avancarData(&s, 20261107) == RES_DATA_INVALIDA, "não dá para voltar a data");
    avancarData(&s, 20261115);
    verificar(igual(saldo(&s, 1), 320), "em 15/11 pagou #6 e #8: Ana R$ 320");
    verificar(agendaVazia(&s.agendados), "agenda vazia");
    verificar(cancelarAgendamento(&s, 6) == RES_NAO_ENCONTRADO,
              "não dá para cancelar agendado já executado");
    verificar(s.efetivadas.quantidade == 2, "agendados não entraram na pilha (continua com #1 e #3)");

    printf("\n== 6. Estorno impossível (dinheiro já usado) ==\n");
    /* Topo é o #3: depósito de 100 no Bruno (que tem R$ 300). Gastamos tudo. */
    solicitarOperacao(&s, TIPO_PAGAMENTO, 2, SEM_CONTA, 300);  /* #10 */
    processarProximo(&s);
    estornar(&s);                     /* desfaz o #10: Bruno volta a R$ 300 */
    agendarPagamento(&s, 2, 250, 20261120);                    /* #11 */
    avancarData(&s, 20261120);        /* Bruno fica com R$ 50 */
    verificar(estornar(&s) == RES_ESTORNO_IMPOSSIVEL,
              "estornar depósito de R$ 100 com Bruno tendo R$ 50: impossível");
    verificar(igual(saldo(&s, 2), 50) &&
              s.efetivadas.itens[s.efetivadas.quantidade - 1].numero == 3,
              "nada mudou: saldo R$ 50 e #3 continua no topo");

    printf("\n== 7. Histórico ==\n");
    mostrarHistorico(&s.historico, 0);
    verificar(s.historico.quantidade == 19, "19 registros no histórico");

    encerrarSistema(&s);
    verificar(s.historico.inicio == NULL, "histórico liberado (free) ao encerrar");

    return resumoDosTestes();
}
