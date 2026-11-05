/*
 * pilha.h
 * -------
 * Pilha (LIFO = Last In, First Out) de operações EFETIVADAS.
 *
 * POR QUE PILHA AQUI?
 *   O estorno desfaz a ÚLTIMA operação que foi efetivada. "A última que
 *   entrou é a primeira que sai" é exatamente a regra da pilha, como uma
 *   pilha de pratos: você só mexe no prato de cima (o topo).
 *   Pagamentos agendados NÃO entram aqui (só são cancelados antes de rodar).
 *
 * COMO GUARDAMOS:
 *   Um vetor (array) de Operacao com tamanho fixo + um contador "quantidade".
 *   - quantidade == 0              -> pilha vazia
 *   - o topo fica em itens[quantidade - 1]
 *   - empilhar  = escrever em itens[quantidade] e somar 1
 *   - desempilhar = subtrair 1 e ler itens[quantidade]
 */

#ifndef PILHA_H
#define PILHA_H

#include "operacao.h"

#define CAPACIDADE_PILHA 100   /* máximo de operações guardadas para estorno */

typedef struct {
    Operacao itens[CAPACIDADE_PILHA];
    int quantidade;            /* quantos itens existem agora na pilha */
} Pilha;

/*
 * CONCEITO NOVO: ponteiro (o "*" em  Pilha *p )
 *   Quando passamos uma variável comum para uma função, o C entrega uma
 *   CÓPIA. Se a função alterasse a cópia, a pilha original não mudaria.
 *   Um ponteiro é o ENDEREÇO da variável na memória: com ele a função
 *   mexe na pilha original. Na chamada usamos "&" para pegar o endereço:
 *       Pilha efetivadas;
 *       iniciarPilha(&efetivadas);
 *   Dentro da função, "p->quantidade" significa "o campo quantidade da
 *   pilha para a qual p aponta" (é um atalho de (*p).quantidade).
 */

/* Deixa a pilha vazia. Chamar uma vez antes de usar. */
void iniciarPilha(Pilha *p);

/* Devolve 1 (verdadeiro) se não há nada na pilha, 0 caso contrário. */
int pilhaVazia(Pilha *p);

/* Devolve 1 se a pilha atingiu CAPACIDADE_PILHA, 0 caso contrário. */
int pilhaCheia(Pilha *p);

/* Coloca "op" no topo. Devolve 1 se deu certo, 0 se a pilha estava cheia. */
int empilhar(Pilha *p, Operacao op);

/* Tira a operação do topo e a escreve em *saida.
 * Devolve 1 se deu certo, 0 se a pilha estava vazia ("nada a estornar").
 * "saida" também é ponteiro: é por ele que a função "devolve" a operação. */
int desempilhar(Pilha *p, Operacao *saida);

/* Mostra a pilha do topo até a base (útil na demonstração). */
void mostrarPilha(Pilha *p);

#endif
