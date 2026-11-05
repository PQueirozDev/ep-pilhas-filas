/*
 * teste_fila.c
 * ------------
 * Teste da fila de pedidos imediatos:
 *   - fila vazia
 *   - ordem FIFO (o primeiro que entra é o primeiro que sai)
 *   - fila cheia
 *   - "dar a volta" no vetor circular sem perder a ordem
 */

#include "operacao.h"
#include "fila.h"
#include "entrada.h"
#include "verificar.h"

int main(void)
{
    Fila f;
    Operacao saida;
    int i, ordemCerta;

    configurarConsole();

    printf("== 1. Fila recém-criada ==\n");
    iniciarFila(&f);
    verificar(filaVazia(&f), "fila começa vazia");
    verificar(desenfileirar(&f, &saida) == 0, "desenfileirar fila vazia devolve 0");

    printf("\n== 2. Três pedidos chegam ==\n");
    enfileirar(&f, criarOperacao(1, TIPO_DEPOSITO, SEM_CONTA, 1, 100.00));
    enfileirar(&f, criarOperacao(2, TIPO_SAQUE, 1, SEM_CONTA, 30.00));
    enfileirar(&f, criarOperacao(3, TIPO_PAGAMENTO, 2, SEM_CONTA, 20.00));
    mostrarFila(&f);

    printf("\n== 3. Atendendo: devem sair 1, 2, 3 ==\n");
    desenfileirar(&f, &saida);
    verificar(saida.numero == 1, "1º atendido é o #1 (o primeiro que chegou)");
    desenfileirar(&f, &saida);
    verificar(saida.numero == 2, "2º atendido é o #2");
    desenfileirar(&f, &saida);
    verificar(saida.numero == 3, "3º atendido é o #3");
    verificar(filaVazia(&f), "fila vazia depois de atender todos");

    printf("\n== 4. Fila cheia ==\n");
    for (i = 1; i <= CAPACIDADE_FILA; i++) {
        enfileirar(&f, criarOperacao(i, TIPO_DEPOSITO, SEM_CONTA, 1, 1.00));
    }
    verificar(filaCheia(&f), "fila cheia após 50 pedidos");
    verificar(enfileirar(&f, criarOperacao(51, TIPO_DEPOSITO, SEM_CONTA, 1, 1.00)) == 0,
              "enfileirar na fila cheia devolve 0");

    printf("\n== 5. Vetor circular: tira 10, coloca 10, ordem mantida ==\n");
    for (i = 0; i < 10; i++) {
        desenfileirar(&f, &saida);            /* saem #1..#10 */
    }
    for (i = 51; i <= 60; i++) {
        enfileirar(&f, criarOperacao(i, TIPO_DEPOSITO, SEM_CONTA, 1, 1.00));
    }
    verificar(filaCheia(&f), "posições liberadas no começo foram reaproveitadas");
    ordemCerta = 1;
    for (i = 11; i <= 60; i++) {
        desenfileirar(&f, &saida);
        if (saida.numero != i) {
            ordemCerta = 0;
        }
    }
    verificar(ordemCerta, "saíram #11 a #60 na ordem de chegada");

    return resumoDosTestes();
}
