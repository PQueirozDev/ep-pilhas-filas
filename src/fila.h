/*
 * fila.h
 * Fila FIFO (primeiro a entrar, primeiro a sair) de pedidos imediatos,
 * implementada com vetor circular.
 */
#ifndef FILA_H
#define FILA_H

#include "modelos.h"

#define CAPACIDADE_FILA 100

/*
 * inicio: posição do primeiro pedido (o próximo a sair).
 * quantidade: quantos pedidos estão na fila.
 * O fim não é guardado: ele é calculado como (inicio + quantidade) % CAPACIDADE_FILA.
 * Guardar a quantidade evita a confusão entre "fila vazia" e "fila cheia",
 * que no vetor circular teriam inicio == fim nos dois casos.
 */
typedef struct {
    Pedido itens[CAPACIDADE_FILA];
    int inicio;
    int quantidade;
} Fila;

void fila_iniciar(Fila *f);
int fila_vazia(const Fila *f);
int fila_cheia(const Fila *f);
int enfileirar(Fila *f, Pedido p);           /* 1 = ok, 0 = fila cheia */
int desenfileirar(Fila *f, Pedido *saida);   /* 1 = ok, 0 = fila vazia */
void fila_imprimir(const Fila *f);

#endif
