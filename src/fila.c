/*
 * fila.c
 * ------
 * Implementação da fila circular de pedidos imediatos (ver fila.h).
 */

#include <stdio.h>
#include "fila.h"

void iniciarFila(Fila *f)
{
    f->inicio = 0;
    f->quantidade = 0;
}

int filaVazia(Fila *f)
{
    return f->quantidade == 0;
}

int filaCheia(Fila *f)
{
    return f->quantidade == CAPACIDADE_FILA;
}

int enfileirar(Fila *f, Operacao op)
{
    int fim;

    if (filaCheia(f)) {
        return 0;
    }
    fim = (f->inicio + f->quantidade) % CAPACIDADE_FILA;  /* 1ª posição livre */
    f->itens[fim] = op;
    f->quantidade++;
    return 1;
}

int desenfileirar(Fila *f, Operacao *saida)
{
    if (filaVazia(f)) {
        return 0;
    }
    *saida = f->itens[f->inicio];                    /* copia o primeiro       */
    f->inicio = (f->inicio + 1) % CAPACIDADE_FILA;   /* o segundo vira primeiro */
    f->quantidade--;
    return 1;
}

void mostrarFila(Fila *f)
{
    int i, posicao;

    if (filaVazia(f)) {
        printf("   (fila vazia)\n");
        return;
    }
    for (i = 0; i < f->quantidade; i++) {
        posicao = (f->inicio + i) % CAPACIDADE_FILA;
        printf("   %dº  ", i + 1);
        imprimirOperacao(f->itens[posicao]);
    }
}
