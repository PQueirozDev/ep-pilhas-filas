/* Agenda em vetor, ordenada por inserção (data, depois número).
 * O estado fica no banco global declarado em sistema.h.
 * Remoções devolvem uma Operacao por valor; numero 0 indica ausência. */

#include <stdio.h>

#include "sistema.h"

void iniciarAgenda(void)
{
    banco.agendados.quantidade = 0;
}

int agendaVazia(void)
{
    return banco.agendados.quantidade == 0;
}

int agendaCheia(void)
{
    return banco.agendados.quantidade == CAPACIDADE_AGENDA;
}

int compararAgendados(Operacao x, Operacao y)
{

    if (x.data < y.data) return -1;
    if (x.data > y.data) return 1;

    if (x.numero < y.numero) return -1;
    if (x.numero > y.numero) return 1;
    return 0;
}

void ordenarAgenda(void)
{
    int i, j;
    Operacao atual;
    for (i = 1; i < banco.agendados.quantidade; i++) {
        atual = banco.agendados.itens[i];
        j = i - 1;
        while (j >= 0 && compararAgendados(banco.agendados.itens[j], atual) > 0) {
            banco.agendados.itens[j + 1] = banco.agendados.itens[j];
            j--;
        }
        banco.agendados.itens[j + 1] = atual;
    }
}

int agendar(Operacao op)
{
    if (agendaCheia()) {
        return 0;
    }
    banco.agendados.itens[banco.agendados.quantidade] = op;
    banco.agendados.quantidade++;

    /* Inserção: leva o último item até sua posição, por data e número. */
    ordenarAgenda();
    return 1;
}

void removerPosicao(int pos)
{
    int i;
    for (i = pos; i < banco.agendados.quantidade - 1; i++) {
        banco.agendados.itens[i] = banco.agendados.itens[i + 1];
    }
    banco.agendados.quantidade--;
}

Operacao cancelarAgendado(int numero)
{
    Operacao cancelado = {0};
    int i;
    for (i = 0; i < banco.agendados.quantidade; i++) {
        if (banco.agendados.itens[i].numero == numero) {
            cancelado = banco.agendados.itens[i];
            removerPosicao(i);
            return cancelado;
        }
    }
    return cancelado;
}

Operacao retirarVencido(int hoje)
{
    Operacao saida = {0};
    if (agendaVazia() || banco.agendados.itens[0].data > hoje) return saida;
    saida = banco.agendados.itens[0];
    removerPosicao(0);
    return saida;
}

void mostrarAgenda(void)
{
    int i;
    if (agendaVazia()) {
        printf("   (nenhum pagamento agendado)\n");
        return;
    }
    for (i = 0; i < banco.agendados.quantidade; i++) {
        printf("   ");
        imprimirOperacao(banco.agendados.itens[i]);
    }
}
