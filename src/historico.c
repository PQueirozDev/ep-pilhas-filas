/* Cada evento ocupa a próxima posição livre do vetor do histórico. */
#include <stdio.h>
#include "sistema.h"

void iniciarHistorico(void)
{
    banco.historico.quantidade = 0;
}

int historicoTemEspaco(int novos)
{
    return novos >= 0 && novos <= CAPACIDADE_HISTORICO - banco.historico.quantidade;
}

int registrarHistorico(Operacao op, int situacao, int data)
{
    int pos = banco.historico.quantidade;
    if (!historicoTemEspaco(1)) return 0;
    banco.historico.itens[pos].op = op;
    banco.historico.itens[pos].situacao = situacao;
    banco.historico.itens[pos].data = data;
    banco.historico.quantidade++;
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

void mostrarHistorico(int conta)
{
    int i, mostrados = 0;
    RegistroHistorico atual;
    for (i = 0; i < banco.historico.quantidade; i++) {
        atual = banco.historico.itens[i];
        if (conta != 0 && atual.op.contaOrigem != conta && atual.op.contaDestino != conta) continue;
        printf("   ");
        imprimirData(atual.data);
        printf("  ");
        imprimirSituacao(atual.situacao);
        imprimirOperacao(atual.op);
        mostrados++;
    }
    if (mostrados == 0) printf("   (nenhum registro)\n");
}
