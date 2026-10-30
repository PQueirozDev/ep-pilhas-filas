/*
 * historico.c
 * Lista encadeada com inserção no fim.
 */
#include <stdio.h>
#include <stdlib.h>
#include "historico.h"

void historico_iniciar(Historico *h) {
    h->inicio = NULL;
    h->fim = NULL;
    h->quantidade = 0;
}

int historico_registrar(Historico *h, Data data, const Pedido *p, const char *descricao) {
    NoHistorico *novo = malloc(sizeof(NoHistorico));
    if (novo == NULL) {
        return 0;
    }
    novo->data = data;
    novo->pedido = *p;
    novo->descricao = descricao;
    novo->proximo = NULL;

    if (h->fim == NULL) {
        h->inicio = novo;          /* lista vazia: o novo é o primeiro */
    } else {
        h->fim->proximo = novo;    /* liga o antigo último ao novo */
    }
    h->fim = novo;
    h->quantidade++;
    return 1;
}

void historico_imprimir(const Historico *h) {
    if (h->inicio == NULL) {
        printf("  (histórico vazio)\n");
        return;
    }
    for (const NoHistorico *no = h->inicio; no != NULL; no = no->proximo) {
        printf("  [");
        imprimir_data(no->data);
        printf("] ");
        imprimir_pedido(&no->pedido);
        printf(" -> %s\n", no->descricao);
    }
}

void historico_liberar(Historico *h) {
    while (h->inicio != NULL) {
        NoHistorico *proximo = h->inicio->proximo;
        free(h->inicio);
        h->inicio = proximo;
    }
    h->fim = NULL;
    h->quantidade = 0;
}
