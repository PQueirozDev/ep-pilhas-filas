/* Histórico em vetor fixo, na ordem dos acontecimentos. */
#ifndef HISTORICO_H
#define HISTORICO_H
#include "operacao.h"

#define CAPACIDADE_HISTORICO 1000
#define SIT_EFETIVADA          1   /* pedido imediato realizado              */
#define SIT_RECUSADA           2   /* pedido imediato sem saldo suficiente   */
#define SIT_ESTORNADA          3   /* operação desfeita pelo estorno         */
#define SIT_AGENDADA           4   /* pagamento entrou na agenda             */
#define SIT_CANCELADA          5   /* agendado cancelado antes de executar   */
#define SIT_AGENDADO_PAGO      6   /* agendado executado na data             */
#define SIT_AGENDADO_RECUSADO  7   /* agendado sem saldo na data             */

typedef struct {
    Operacao op;
    int situacao;
    int data;
} RegistroHistorico;

typedef struct {
    RegistroHistorico itens[CAPACIDADE_HISTORICO];
    int quantidade;
} Historico;

void iniciarHistorico(void);
int historicoTemEspaco(int novos);
int registrarHistorico(Operacao op, int situacao, int data);
void mostrarHistorico(int conta);
#endif
