/*
 * fila.c
 * Operações da fila FIFO em vetor circular.
 */
#include <stdio.h>
#include "fila.h"

void fila_iniciar(Fila *f) {
    f->inicio = 0;
    f->quantidade = 0;
}

int fila_vazia(const Fila *f) {
    return f->quantidade == 0;
}

int fila_cheia(const Fila *f) {
    return f->quantidade == CAPACIDADE_FILA;
}

/* Coloca o pedido no FIM da fila. */
int enfileirar(Fila *f, Pedido p) {
    if (fila_cheia(f)) {
        return 0;
    }
    /* O % faz o índice "dar a volta" para o começo do vetor. */
    int fim = (f->inicio + f->quantidade) % CAPACIDADE_FILA;
    f->itens[fim] = p;
    f->quantidade++;
    return 1;
}

/* Tira o pedido do INÍCIO da fila (o que chegou primeiro). */
int desenfileirar(Fila *f, Pedido *saida) {
    if (fila_vazia(f)) {
        return 0;
    }
    *saida = f->itens[f->inicio];
    f->inicio = (f->inicio + 1) % CAPACIDADE_FILA;
    f->quantidade--;
    return 1;
}

/* Mostra do primeiro (próximo a sair) ao último. */
void fila_imprimir(const Fila *f) {
    if (fila_vazia(f)) {
        printf("  (fila vazia)\n");
        return;
    }
    for (int i = 0; i < f->quantidade; i++) {
        int pos = (f->inicio + i) % CAPACIDADE_FILA;
        printf("  %d) ", i + 1);
        imprimir_pedido(&f->itens[pos]);
        printf("\n");
    }
}
