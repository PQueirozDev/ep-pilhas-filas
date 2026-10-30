/*
 * pilha.c
 * Operações da pilha LIFO em lista encadeada.
 *
 * Por que lista encadeada e não vetor? A pilha recebe toda operação
 * efetivada. Num vetor de tamanho fixo, uma pilha cheia obrigaria a recusar
 * operações válidas do cliente só por falta de espaço para o estorno.
 */
#include <stdio.h>
#include <stdlib.h>
#include "pilha.h"

void pilha_iniciar(Pilha *p) {
    p->topo = NULL;
    p->tamanho = 0;
}

int pilha_vazia(const Pilha *p) {
    return p->topo == NULL;
}

/* Coloca a operação NO TOPO: o novo nó passa a apontar para o antigo topo. */
int empilhar(Pilha *p, OperacaoEfetivada op) {
    NoPilha *novo = malloc(sizeof(NoPilha));
    if (novo == NULL) {
        return 0;
    }
    novo->op = op;
    novo->abaixo = p->topo;
    p->topo = novo;
    p->tamanho++;
    return 1;
}

/* Tira a operação DO TOPO (a mais recente) e libera o nó. */
int desempilhar(Pilha *p, OperacaoEfetivada *saida) {
    if (pilha_vazia(p)) {
        return 0;
    }
    NoPilha *removido = p->topo;
    *saida = removido->op;
    p->topo = removido->abaixo;
    free(removido);
    p->tamanho--;
    return 1;
}

/* Só olha o topo, sem tirar. */
const OperacaoEfetivada *topo(const Pilha *p) {
    if (pilha_vazia(p)) {
        return NULL;
    }
    return &p->topo->op;
}

/* Mostra do topo (próximo a ser estornado) até a base. */
void pilha_imprimir(const Pilha *p) {
    if (pilha_vazia(p)) {
        printf("  (pilha vazia)\n");
        return;
    }
    int i = 1;
    for (const NoPilha *no = p->topo; no != NULL; no = no->abaixo) {
        printf("  %s ", (i == 1) ? "topo ->" : "       ");
        imprimir_pedido(&no->op.pedido);
        printf("\n");
        i++;
    }
}

void pilha_liberar(Pilha *p) {
    OperacaoEfetivada lixo;
    while (desempilhar(p, &lixo)) {
        /* desempilhar já faz o free de cada nó */
    }
}
