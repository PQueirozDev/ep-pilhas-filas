/* Pilha LIFO em vetor: as funções acessam banco.efetivadas.
 * O estado fica no banco global declarado em sistema.h.
 * Remoções devolvem uma Operacao por valor; numero 0 indica ausência. */

#ifndef PILHA_H
#define PILHA_H

#include "operacao.h"

#define CAPACIDADE_PILHA 100

typedef struct {
    Operacao itens[CAPACIDADE_PILHA];
    int quantidade;
} Pilha;

void iniciarPilha(void);

int pilhaVazia(void);

int pilhaCheia(void);

int empilhar(Operacao op);

Operacao desempilhar(void);

void mostrarPilha(void);

#endif
