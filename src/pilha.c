/* Pilha LIFO em vetor: as funções acessam banco.efetivadas.
 * O estado fica no banco global declarado em sistema.h.
 * Remoções devolvem uma Operacao por valor; numero 0 indica ausência. */

#include <stdio.h>
#include "sistema.h"

void iniciarPilha(void)
{

    banco.efetivadas.quantidade = 0;
}

int pilhaVazia(void)
{
    return banco.efetivadas.quantidade == 0;
}

int pilhaCheia(void)
{
    return banco.efetivadas.quantidade == CAPACIDADE_PILHA;
}

int empilhar(Operacao op)
{
    if (pilhaCheia()) {
        return 0;
    }
    banco.efetivadas.itens[banco.efetivadas.quantidade] = op;
    banco.efetivadas.quantidade++;
    return 1;
}

Operacao desempilhar(void)
{
    Operacao saida = {0}; /* numero 0 indica que não havia operação. */
    if (pilhaVazia()) return saida;
    banco.efetivadas.quantidade--;
    saida = banco.efetivadas.itens[banco.efetivadas.quantidade];
    return saida;
}

void mostrarPilha(void)
{
    int i;

    if (pilhaVazia()) {
        printf("   (pilha vazia)\n");
        return;
    }

    for (i = banco.efetivadas.quantidade - 1; i >= 0; i--) {
        printf("   %s ", (i == banco.efetivadas.quantidade - 1) ? "TOPO ->" : "       ");
        imprimirOperacao(banco.efetivadas.itens[i]);
    }
}
