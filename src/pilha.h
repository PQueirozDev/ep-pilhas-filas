/*
 * pilha.h
 * Pilha LIFO (último a entrar, primeiro a sair) de operações efetivadas,
 * implementada com lista encadeada. O estorno sempre desfaz o TOPO,
 * ou seja, a operação mais recente.
 */
#ifndef PILHA_H
#define PILHA_H

#include "modelos.h"

/* Cada nó guarda uma operação e aponta para a que está logo abaixo. */
typedef struct NoPilha {
    OperacaoEfetivada op;
    struct NoPilha *abaixo;
} NoPilha;

typedef struct {
    NoPilha *topo;    /* NULL quando a pilha está vazia */
    int tamanho;
} Pilha;

void pilha_iniciar(Pilha *p);
int pilha_vazia(const Pilha *p);
int empilhar(Pilha *p, OperacaoEfetivada op);              /* 1 = ok, 0 = sem memória */
int desempilhar(Pilha *p, OperacaoEfetivada *saida);       /* 1 = ok, 0 = pilha vazia */
const OperacaoEfetivada *topo(const Pilha *p);             /* NULL se vazia */
void pilha_imprimir(const Pilha *p);
void pilha_liberar(Pilha *p);

#endif
