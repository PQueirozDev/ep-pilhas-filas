/*
 * agendados.h
 * -----------
 * Agenda de pagamentos com data futura.
 *
 * COMO FUNCIONA:
 *   Os agendados ficam num vetor sempre ORDENADO por data, com qsort().
 *   Quando a data simulada avança, executamos do primeiro em diante,
 *   enquanto a data dele já tiver chegado.
 *
 * CASO EXTREMO: datas iguais
 *   qsort NÃO é estável: se dois itens são "iguais" para a comparação,
 *   ele pode trocar a ordem entre eles. Por isso a comparação usa um
 *   critério de desempate: o número de entrada. Com datas iguais, quem foi
 *   agendado antes (número menor) vem antes. Assim mantemos a ordem FIFO
 *   entre pagamentos do mesmo dia.
 *
 * Agendados NÃO entram na pilha de estorno: enquanto não executam, podem
 * ser cancelados; depois de executados, não são estornáveis.
 */

#ifndef AGENDADOS_H
#define AGENDADOS_H

#include "operacao.h"

#define CAPACIDADE_AGENDA 50

typedef struct {
    Operacao itens[CAPACIDADE_AGENDA];
    int quantidade;
} Agenda;

void iniciarAgenda(Agenda *a);
int  agendaVazia(Agenda *a);
int  agendaCheia(Agenda *a);

/* Acrescenta "op" (com op.data preenchida) e reordena com qsort.
 * Devolve 1 se deu certo, 0 se a agenda estava cheia. */
int  agendar(Agenda *a, Operacao op);

/* Remove da agenda o pagamento com esse número, copiando-o para *cancelado.
 * Devolve 1 se achou, 0 se não existe (ou já foi executado). */
int  cancelarAgendado(Agenda *a, int numero, Operacao *cancelado);

/* Se o primeiro da agenda tem data <= hoje, remove-o, copia para *saida
 * e devolve 1. Caso contrário devolve 0 (nada vencido). */
int  retirarVencido(Agenda *a, int hoje, Operacao *saida);

/* Função de comparação usada pelo qsort (exposta para os testes). */
int  compararAgendados(const void *a, const void *b);

void mostrarAgenda(Agenda *a);

#endif
