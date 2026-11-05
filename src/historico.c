/*
 * historico.c
 * -----------
 * Lista encadeada do histórico (ver historico.h).
 */

#include <stdio.h>
#include <stdlib.h>     /* malloc, free, NULL */
#include "historico.h"

void iniciarHistorico(Historico *h)
{
    h->inicio = NULL;
    h->fim = NULL;
    h->quantidade = 0;
}

int registrarHistorico(Historico *h, Operacao op, int situacao, int data)
{
    /*
     * CONCEITO NOVO: malloc
     *   Pede ao sistema um pedaço de memória do tamanho de um NoHistorico
     *   (sizeof calcula esse tamanho) e devolve o ENDEREÇO dele.
     *   Essa memória continua existindo depois que a função termina
     *   (diferente de uma variável local) e só é devolvida com free().
     *   Se não houver memória, malloc devolve NULL.
     */
    NoHistorico *novo = (NoHistorico *) malloc(sizeof(NoHistorico));
    if (novo == NULL) {
        return 0;
    }
    novo->op = op;
    novo->situacao = situacao;
    novo->data = data;
    novo->proximo = NULL;          /* será o último: não aponta para ninguém */

    if (h->inicio == NULL) {       /* lista vazia: o novo é o primeiro e o último */
        h->inicio = novo;
    } else {
        h->fim->proximo = novo;    /* o antigo último passa a apontar para o novo */
    }
    h->fim = novo;
    h->quantidade++;
    return 1;
}

void imprimirSituacao(int situacao)
{
    switch (situacao) {
        case SIT_EFETIVADA:         printf("EFETIVADA         "); break;
        case SIT_RECUSADA:          printf("RECUSADA (saldo)  "); break;
        case SIT_ESTORNADA:         printf("ESTORNADA         "); break;
        case SIT_AGENDADA:          printf("AGENDADA          "); break;
        case SIT_CANCELADA:         printf("AGEND. CANCELADA  "); break;
        case SIT_AGENDADO_PAGO:     printf("AGENDADO PAGO     "); break;
        case SIT_AGENDADO_RECUSADO: printf("AGEND. RECUSADO   "); break;
        default:                    printf("?                 "); break;
    }
}

void mostrarHistorico(Historico *h, int conta)
{
    NoHistorico *atual;
    int mostrados = 0;

    /* Percorrer a lista: começa no início e vai seguindo "proximo"
     * até chegar em NULL (fim da corrente). */
    for (atual = h->inicio; atual != NULL; atual = atual->proximo) {
        if (conta != 0 &&
            atual->op.contaOrigem != conta &&
            atual->op.contaDestino != conta) {
            continue;   /* não envolve a conta pedida: pula */
        }
        printf("   ");
        imprimirData(atual->data);
        printf("  ");
        imprimirSituacao(atual->situacao);
        imprimirOperacao(atual->op);
        mostrados++;
    }
    if (mostrados == 0) {
        printf("   (nenhum registro)\n");
    }
}

void liberarHistorico(Historico *h)
{
    NoHistorico *atual = h->inicio;
    NoHistorico *seguinte;

    while (atual != NULL) {
        seguinte = atual->proximo;  /* guarda o próximo ANTES de liberar,   */
        free(atual);                /* pois depois do free não podemos mais */
        atual = seguinte;           /* ler nada de dentro de "atual"        */
    }
    iniciarHistorico(h);            /* volta ao estado de lista vazia */
}
