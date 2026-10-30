/*
 * agendados.h
 * Fila de pagamentos agendados, ordenada por data.
 * Cada novo agendamento é inserido já na posição certa (inserção ordenada).
 * Datas iguais saem na ordem de chegada (desempate FIFO).
 */
#ifndef AGENDADOS_H
#define AGENDADOS_H

#include "modelos.h"

typedef struct NoAgendado {
    Pedido pedido;
    struct NoAgendado *proximo;
} NoAgendado;

typedef struct {
    NoAgendado *inicio;   /* o agendado de data mais próxima */
    int quantidade;
} Agendados;

void agendados_iniciar(Agendados *a);
int agendados_vazia(const Agendados *a);
int agendados_inserir(Agendados *a, Pedido p);                        /* 1 = ok, 0 = sem memória */
int agendados_retirar_vencido(Agendados *a, Data hoje, Pedido *saida); /* 1 = tirou um, 0 = nenhum vencido */
int agendados_cancelar(Agendados *a, int id, Pedido *removido);       /* 1 = ok, 0 = id não encontrado */
void agendados_imprimir(const Agendados *a);
void agendados_liberar(Agendados *a);

#endif
