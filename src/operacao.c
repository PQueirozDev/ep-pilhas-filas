/*
 * operacao.c
 * ----------
 * Funções auxiliares da struct Operacao.
 */

#include <stdio.h>
#include "operacao.h"

/* Recebe os dados soltos e devolve uma Operacao com todos os campos
 * preenchidos. A struct é devolvida "por cópia" (como um int seria). */
Operacao criarOperacao(int numero, int tipo, int contaOrigem,
                       int contaDestino, double valor)
{
    Operacao op;
    op.numero       = numero;
    op.tipo         = tipo;
    op.contaOrigem  = contaOrigem;
    op.contaDestino = contaDestino;
    op.valor        = valor;
    op.data         = 0;
    return op;
}

/* A data é guardada como um único inteiro AAAAMMDD porque assim
 * comparar datas vira comparar números: 20261108 < 20261110.
 * Para separar as partes usamos divisão inteira (/) e resto (%):
 *   20261110 / 10000       = 2026  (ano)
 *   (20261110 / 100) % 100 = 11    (mês)
 *   20261110 % 100         = 10    (dia)                                */
void imprimirData(int data)
{
    printf("%02d/%02d/%04d", data % 100, (data / 100) % 100, data / 10000);
}

/* Imprime algo como:  #3 TRANSFERENCIA  R$    50.00  (conta 1 -> conta 2) */
void imprimirOperacao(Operacao op)
{
    printf("#%d ", op.numero);

    switch (op.tipo) {
        case TIPO_DEPOSITO:      printf("DEPÓSITO     "); break;
        case TIPO_SAQUE:         printf("SAQUE        "); break;
        case TIPO_TRANSFERENCIA: printf("TRANSFERÊNCIA"); break;
        case TIPO_PAGAMENTO:     printf("PAGAMENTO    "); break;
        default:                 printf("DESCONHECIDO "); break;
    }

    printf("  R$ %8.2f", op.valor);

    if (op.contaOrigem != SEM_CONTA && op.contaDestino != SEM_CONTA) {
        printf("  (conta %d -> conta %d)", op.contaOrigem, op.contaDestino);
    } else if (op.contaOrigem != SEM_CONTA) {
        printf("  (conta %d)", op.contaOrigem);
    } else if (op.contaDestino != SEM_CONTA) {
        printf("  (conta %d)", op.contaDestino);
    }

    if (op.data != 0) {
        printf("  para ");
        imprimirData(op.data);
    }
    printf("\n");
}
