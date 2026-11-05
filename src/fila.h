/*
 * fila.h
 * ------
 * Fila (FIFO = First In, First Out) de pedidos IMEDIATOS:
 * depósito, saque, transferência e pagamento imediato.
 *
 * POR QUE FILA AQUI?
 *   Pedidos devem ser atendidos na ordem em que chegaram, como a fila do
 *   caixa: quem chegou primeiro é atendido primeiro. A ordem importa de
 *   verdade: se a conta tem R$ 100 e chegam "saque de 80" e depois
 *   "saque de 50", o primeiro é efetivado e o segundo é recusado.
 *   Trocar a ordem trocaria qual cliente fica sem o dinheiro.
 *
 * COMO GUARDAMOS: vetor CIRCULAR.
 *   - "inicio" é a posição do primeiro da fila (o próximo a ser atendido).
 *   - "quantidade" diz quantos pedidos estão esperando.
 *   - O fim (onde entra o próximo) é  (inicio + quantidade) % CAPACIDADE_FILA.
 *   Ao sair alguém, só avançamos "inicio" (não empurramos os outros).
 *   Quando um índice passa da última posição, o "%" (resto da divisão)
 *   o faz voltar para 0, como os ponteiros de um relógio. Assim as
 *   posições liberadas no começo do vetor são reaproveitadas.
 */

#ifndef FILA_H
#define FILA_H

#include "operacao.h"

#define CAPACIDADE_FILA 50

typedef struct {
    Operacao itens[CAPACIDADE_FILA];
    int inicio;       /* índice do primeiro da fila   */
    int quantidade;   /* quantos pedidos estão na fila */
} Fila;

void iniciarFila(Fila *f);
int  filaVazia(Fila *f);
int  filaCheia(Fila *f);

/* Coloca "op" no FIM da fila. Devolve 1 se deu certo, 0 se estava cheia. */
int  enfileirar(Fila *f, Operacao op);

/* Tira o pedido do INÍCIO da fila e o escreve em *saida.
 * Devolve 1 se deu certo, 0 se a fila estava vazia. */
int  desenfileirar(Fila *f, Operacao *saida);

/* Mostra a fila do primeiro (próximo a ser atendido) ao último. */
void mostrarFila(Fila *f);

#endif
