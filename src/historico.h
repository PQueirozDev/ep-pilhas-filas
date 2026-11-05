/*
 * historico.h
 * -----------
 * Histórico de tudo o que aconteceu, em LISTA ENCADEADA.
 *
 * CONCEITO NOVO: lista encadeada
 *   Cada registro é um "nó" criado na hora, com malloc. Cada nó guarda os
 *   dados e um ponteiro para o PRÓXIMO nó, formando uma corrente:
 *       inicio -> [nó 1] -> [nó 2] -> [nó 3] -> NULL
 *   NULL é o endereço "nenhum lugar": marca o fim da corrente.
 *   Vantagem sobre o vetor: não há tamanho máximo fixo. O histórico só
 *   cresce, então essa vantagem é útil aqui.
 *   Guardamos também "fim" (o último nó) para inserir no final sem
 *   precisar percorrer a lista inteira.
 */

#ifndef HISTORICO_H
#define HISTORICO_H

#include "operacao.h"

/* O que aconteceu com a operação (situação do registro). */
#define SIT_EFETIVADA          1   /* pedido imediato realizado              */
#define SIT_RECUSADA           2   /* pedido imediato sem saldo suficiente   */
#define SIT_ESTORNADA          3   /* operação desfeita pelo estorno         */
#define SIT_AGENDADA           4   /* pagamento entrou na agenda             */
#define SIT_CANCELADA          5   /* agendado cancelado antes de executar   */
#define SIT_AGENDADO_PAGO      6   /* agendado executado na data             */
#define SIT_AGENDADO_RECUSADO  7   /* agendado sem saldo na data             */

/*
 * Aqui a struct precisa de um nome próprio ("struct No") porque ela
 * aponta para outra struct do mesmo tipo (o próximo nó). Dentro dela o
 * apelido NoHistorico ainda não existe, então usamos "struct No *".
 */
typedef struct No {
    Operacao   op;         /* a operação registrada              */
    int        situacao;   /* um dos SIT_... acima               */
    int        data;       /* data (simulada) do acontecimento   */
    struct No *proximo;    /* endereço do próximo nó, ou NULL    */
} NoHistorico;

typedef struct {
    NoHistorico *inicio;   /* primeiro nó (ou NULL se vazio) */
    NoHistorico *fim;      /* último nó   (ou NULL se vazio) */
    int quantidade;
} Historico;

void iniciarHistorico(Historico *h);

/* Cria um nó novo no FIM da lista (ordem cronológica).
 * Devolve 1 se deu certo, 0 se faltou memória. */
int  registrarHistorico(Historico *h, Operacao op, int situacao, int data);

/* Mostra os registros. Se conta == 0 mostra todos; senão só os que
 * envolvem essa conta (como origem ou destino). */
void mostrarHistorico(Historico *h, int conta);

/* Devolve toda a memória pedida com malloc (chamar ao sair). */
void liberarHistorico(Historico *h);

#endif
