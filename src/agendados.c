/*
 * agendados.c
 * -----------
 * Agenda de pagamentos ordenada por data com qsort (ver agendados.h).
 */

#include <stdio.h>
#include <stdlib.h>     /* qsort */
#include "agendados.h"

void iniciarAgenda(Agenda *a)
{
    a->quantidade = 0;
}

int agendaVazia(Agenda *a)
{
    return a->quantidade == 0;
}

int agendaCheia(Agenda *a)
{
    return a->quantidade == CAPACIDADE_AGENDA;
}

/*
 * Função de comparação para o qsort.
 *
 * O qsort serve para QUALQUER tipo de vetor, por isso ele nos entrega
 * ponteiros genéricos "const void *" (endereço de "algo" que não deve ser
 * alterado). Nós sabemos que esse "algo" é uma Operacao, então
 * convertemos para "const Operacao *" e lemos os campos com "->".
 *
 * Regra do qsort: devolver número NEGATIVO se a vem antes de b,
 * POSITIVO se a vem depois, e 0 se tanto faz.
 */
int compararAgendados(const void *a, const void *b)
{
    const Operacao *x = (const Operacao *) a;
    const Operacao *y = (const Operacao *) b;

    /* 1º critério: data mais cedo vem antes */
    if (x->data < y->data) return -1;
    if (x->data > y->data) return 1;

    /* 2º critério (desempate): mesma data -> quem entrou antes vem antes.
     * Sem isso o qsort poderia inverter dois pagamentos do mesmo dia. */
    if (x->numero < y->numero) return -1;
    if (x->numero > y->numero) return 1;
    return 0;
}

int agendar(Agenda *a, Operacao op)
{
    if (agendaCheia(a)) {
        return 0;
    }
    a->itens[a->quantidade] = op;   /* coloca no fim...           */
    a->quantidade++;
    /* ...e reordena. Parâmetros: vetor, quantos itens, tamanho de cada
     * item em bytes (sizeof) e a função que compara dois itens. */
    qsort(a->itens, a->quantidade, sizeof(Operacao), compararAgendados);
    return 1;
}

/* Remove o item da posição "pos" puxando os seguintes uma casa para trás,
 * para o vetor continuar sem buracos e ordenado. */
void removerPosicao(Agenda *a, int pos)
{
    int i;
    for (i = pos; i < a->quantidade - 1; i++) {
        a->itens[i] = a->itens[i + 1];
    }
    a->quantidade--;
}

int cancelarAgendado(Agenda *a, int numero, Operacao *cancelado)
{
    int i;
    for (i = 0; i < a->quantidade; i++) {
        if (a->itens[i].numero == numero) {
            *cancelado = a->itens[i];
            removerPosicao(a, i);
            return 1;
        }
    }
    return 0;   /* não está na agenda */
}

int retirarVencido(Agenda *a, int hoje, Operacao *saida)
{
    /* Como o vetor está ordenado, basta olhar o primeiro (posição 0). */
    if (agendaVazia(a) || a->itens[0].data > hoje) {
        return 0;
    }
    *saida = a->itens[0];
    removerPosicao(a, 0);
    return 1;
}

void mostrarAgenda(Agenda *a)
{
    int i;
    if (agendaVazia(a)) {
        printf("   (nenhum pagamento agendado)\n");
        return;
    }
    for (i = 0; i < a->quantidade; i++) {
        printf("   ");
        imprimirOperacao(a->itens[i]);
    }
}
