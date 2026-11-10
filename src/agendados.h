/* Agenda em vetor, ordenada por inserção (data, depois número).
 * O estado fica no banco global declarado em sistema.h.
 * Remoções devolvem uma Operacao por valor; numero 0 indica ausência. */

#ifndef AGENDADOS_H
#define AGENDADOS_H

#include "operacao.h"

#define CAPACIDADE_AGENDA 50

typedef struct {
    Operacao itens[CAPACIDADE_AGENDA];
    int quantidade;
} Agenda;

void iniciarAgenda(void);
int  agendaVazia(void);
int  agendaCheia(void);

void ordenarAgenda(void);
int  agendar(Operacao op);

Operacao cancelarAgendado(int numero);

Operacao retirarVencido(int hoje);

int compararAgendados(Operacao x, Operacao y);

void mostrarAgenda(void);

#endif
