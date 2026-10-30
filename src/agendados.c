/*
 * agendados.c
 * Lista encadeada mantida sempre em ordem de data.
 */
#include <stdio.h>
#include <stdlib.h>
#include "agendados.h"

void agendados_iniciar(Agendados *a) {
    a->inicio = NULL;
    a->quantidade = 0;
}

int agendados_vazia(const Agendados *a) {
    return a->inicio == NULL;
}

/*
 * Inserção ordenada: anda pela lista enquanto a data do nó for MENOR OU
 * IGUAL à do novo pedido. O "ou igual" faz o novo ficar DEPOIS dos que
 * já têm a mesma data, que é o desempate FIFO.
 */
int agendados_inserir(Agendados *a, Pedido p) {
    NoAgendado *novo = malloc(sizeof(NoAgendado));
    if (novo == NULL) {
        return 0;
    }
    novo->pedido = p;

    NoAgendado *anterior = NULL;
    NoAgendado *atual = a->inicio;
    while (atual != NULL && data_comparar(atual->pedido.data, p.data) <= 0) {
        anterior = atual;
        atual = atual->proximo;
    }

    novo->proximo = atual;
    if (anterior == NULL) {
        a->inicio = novo;          /* entrou na frente de todos */
    } else {
        anterior->proximo = novo;  /* entrou entre "anterior" e "atual" */
    }
    a->quantidade++;
    return 1;
}

/* Se o primeiro da lista já venceu (data <= hoje), tira ele. */
int agendados_retirar_vencido(Agendados *a, Data hoje, Pedido *saida) {
    if (agendados_vazia(a) || data_comparar(a->inicio->pedido.data, hoje) > 0) {
        return 0;
    }
    NoAgendado *removido = a->inicio;
    *saida = removido->pedido;
    a->inicio = removido->proximo;
    free(removido);
    a->quantidade--;
    return 1;
}

/* Procura pelo id e tira da lista, ligando o anterior ao próximo. */
int agendados_cancelar(Agendados *a, int id, Pedido *removido) {
    NoAgendado *anterior = NULL;
    NoAgendado *atual = a->inicio;
    while (atual != NULL && atual->pedido.id != id) {
        anterior = atual;
        atual = atual->proximo;
    }
    if (atual == NULL) {
        return 0;
    }

    if (anterior == NULL) {
        a->inicio = atual->proximo;
    } else {
        anterior->proximo = atual->proximo;
    }
    *removido = atual->pedido;
    free(atual);
    a->quantidade--;
    return 1;
}

void agendados_imprimir(const Agendados *a) {
    if (agendados_vazia(a)) {
        printf("  (nenhum pagamento agendado)\n");
        return;
    }
    int i = 1;
    for (const NoAgendado *no = a->inicio; no != NULL; no = no->proximo) {
        printf("  %d) ", i);
        imprimir_pedido(&no->pedido);
        printf("\n");
        i++;
    }
}

void agendados_liberar(Agendados *a) {
    while (a->inicio != NULL) {
        NoAgendado *proximo = a->inicio->proximo;
        free(a->inicio);
        a->inicio = proximo;
    }
    a->quantidade = 0;
}
