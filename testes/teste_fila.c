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
#include "sistema.h"
#include "entrada.h"
#include "verificar.h"

int main(void)
{
    Operacao saida;
    int i, ordemCerta;

    configurarConsole();

    printf("== 1. Fila recém-criada ==\n");
    iniciarFila();
    verificar(filaVazia(), "fila começa vazia");
    verificar(desenfileirar().numero == 0, "desenfileirar fila vazia devolve 0");

    printf("\n== 2. Três pedidos chegam ==\n");
    enfileirar(criarOperacao(1, TIPO_DEPOSITO, SEM_CONTA, 1, 100.00));
    enfileirar(criarOperacao(2, TIPO_SAQUE, 1, SEM_CONTA, 30.00));
    enfileirar(criarOperacao(3, TIPO_PAGAMENTO, 2, SEM_CONTA, 20.00));
    mostrarFila();

    printf("\n== 3. Atendendo: devem sair 1, 2, 3 ==\n");
    saida = desenfileirar();
    verificar(saida.numero == 1, "1º atendido é o #1 (o primeiro que chegou)");
    saida = desenfileirar();
    verificar(saida.numero == 2, "2º atendido é o #2");
    saida = desenfileirar();
    verificar(saida.numero == 3, "3º atendido é o #3");
    verificar(filaVazia(), "fila vazia depois de atender todos");

    printf("\n== 4. Fila cheia ==\n");
    for (i = 1; i <= CAPACIDADE_FILA; i++) {
        enfileirar(criarOperacao(i, TIPO_DEPOSITO, SEM_CONTA, 1, 1.00));
    }
    verificar(filaCheia(), "fila cheia após 50 pedidos");
    verificar(enfileirar(criarOperacao(51, TIPO_DEPOSITO, SEM_CONTA, 1, 1.00)) == 0,
              "enfileirar na fila cheia devolve 0");

    printf("\n== 5. Vetor circular: tira 10, coloca 10, ordem mantida ==\n");
    for (i = 0; i < 10; i++) {
        saida = desenfileirar();            /* saem #1..#10 */
    }
    for (i = 51; i <= 60; i++) {
        enfileirar(criarOperacao(i, TIPO_DEPOSITO, SEM_CONTA, 1, 1.00));
    }
    verificar(filaCheia(), "posições liberadas no começo foram reaproveitadas");
    ordemCerta = 1;
    for (i = 11; i <= 60; i++) {
        saida = desenfileirar();
        if (saida.numero != i) {
            ordemCerta = 0;
        }
    }
    verificar(ordemCerta, "saíram #11 a #60 na ordem de chegada");

    return resumoDosTestes();
}
