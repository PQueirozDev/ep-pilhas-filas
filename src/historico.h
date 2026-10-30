/*
 * historico.h
 * Histórico completo em lista encadeada: TUDO que aconteceu, na ordem.
 * É diferente da pilha: a pilha só tem o que ainda pode ser estornado.
 */
#ifndef HISTORICO_H
#define HISTORICO_H

#include "modelos.h"

typedef struct NoHistorico {
    Data data;                 /* data simulada em que aconteceu */
    Pedido pedido;             /* cópia do pedido naquele momento */
    const char *descricao;     /* texto fixo, ex.: "efetivado" (não é copiado) */
    struct NoHistorico *proximo;
} NoHistorico;

/* Guardamos o fim para inserir no final sem percorrer a lista inteira. */
typedef struct {
    NoHistorico *inicio;
    NoHistorico *fim;
    int quantidade;
} Historico;

void historico_iniciar(Historico *h);
int historico_registrar(Historico *h, Data data, const Pedido *p, const char *descricao);
void historico_imprimir(const Historico *h);
void historico_liberar(Historico *h);

#endif
