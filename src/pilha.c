/*
 * pilha.c
 * -------
 * Implementação da pilha de operações efetivadas (ver explicação em pilha.h).
 */

#include <stdio.h>
#include "pilha.h"

void iniciarPilha(Pilha *p)
{
    /* Não precisamos apagar o vetor: basta dizer que há 0 itens.
     * O que estiver nas posições "livres" será sobrescrito ao empilhar. */
    p->quantidade = 0;
}

int pilhaVazia(Pilha *p)
{
    return p->quantidade == 0;   /* a comparação já vale 1 ou 0 */
}

int pilhaCheia(Pilha *p)
{
    return p->quantidade == CAPACIDADE_PILHA;
}

int empilhar(Pilha *p, Operacao op)
{
    if (pilhaCheia(p)) {
        return 0;                /* sem espaço: quem chamou decide o que avisar */
    }
    p->itens[p->quantidade] = op;   /* grava na primeira posição livre (novo topo) */
    p->quantidade++;
    return 1;
}

int desempilhar(Pilha *p, Operacao *saida)
{
    if (pilhaVazia(p)) {
        return 0;                /* caso extremo: nada a estornar */
    }
    p->quantidade--;                 /* o topo passa a ser o item de baixo...   */
    *saida = p->itens[p->quantidade];/* ...e copiamos o antigo topo para *saida */
    return 1;
}

void mostrarPilha(Pilha *p)
{
    int i;

    if (pilhaVazia(p)) {
        printf("   (pilha vazia)\n");
        return;
    }
    /* Percorre de trás para frente: do topo (último) até a base (primeiro). */
    for (i = p->quantidade - 1; i >= 0; i--) {
        printf("   %s ", (i == p->quantidade - 1) ? "TOPO ->" : "       ");
        imprimirOperacao(p->itens[i]);
    }
}
