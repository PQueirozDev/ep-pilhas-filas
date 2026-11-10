/* Fila FIFO circular em vetor: as funções acessam banco.pedidos.
 * O estado fica no banco global declarado em sistema.h.
 * Remoções devolvem uma Operacao por valor; numero 0 indica ausência. */

#include <stdio.h>
#include "sistema.h"

void iniciarFila(void)
{
    banco.pedidos.inicio = 0;
    banco.pedidos.quantidade = 0;
}

int filaVazia(void)
{
    return banco.pedidos.quantidade == 0;
}

int filaCheia(void)
{
    return banco.pedidos.quantidade == CAPACIDADE_FILA;
}

int enfileirar(Operacao op)
{
    int fim;

    if (filaCheia()) {
        return 0;
    }
    fim = (banco.pedidos.inicio + banco.pedidos.quantidade) % CAPACIDADE_FILA;
    banco.pedidos.itens[fim] = op;
    banco.pedidos.quantidade++;
    return 1;
}

Operacao desenfileirar(void)
{
    Operacao saida = {0}; /* numero 0 indica que não havia operação. */
    if (filaVazia()) return saida;
    saida = banco.pedidos.itens[banco.pedidos.inicio];
    banco.pedidos.inicio = (banco.pedidos.inicio + 1) % CAPACIDADE_FILA;
    banco.pedidos.quantidade--;
    return saida;
}

void mostrarFila(void)
{
    int i, posicao;

    if (filaVazia()) {
        printf("   (fila vazia)\n");
        return;
    }
    for (i = 0; i < banco.pedidos.quantidade; i++) {
        posicao = (banco.pedidos.inicio + i) % CAPACIDADE_FILA;
        printf("   %dº  ", i + 1);
        imprimirOperacao(banco.pedidos.itens[posicao]);
    }
}
