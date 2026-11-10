/* Fila FIFO circular em vetor: as funções acessam banco.pedidos.
 * O estado fica no banco global declarado em sistema.h.
 * Remoções devolvem uma Operacao por valor; numero 0 indica ausência. */

#ifndef FILA_H
#define FILA_H

#include "operacao.h"

#define CAPACIDADE_FILA 50

typedef struct {
    Operacao itens[CAPACIDADE_FILA];
    int inicio;
    int quantidade;
} Fila;

void iniciarFila(void);
int  filaVazia(void);
int  filaCheia(void);

int  enfileirar(Operacao op);

Operacao desenfileirar(void);

void mostrarFila(void);

#endif
