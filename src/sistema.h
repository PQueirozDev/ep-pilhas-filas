/*
 * sistema.h
 * Junta todas as estruturas e define o caminho de cada operação:
 *
 *   pedido imediato  -> FILA FIFO -> processar -> efetivado? -> PILHA
 *   pedido agendado  -> AGENDADOS (por data) -> avançar data -> FILA FIFO
 *   estorno          -> desempilha o TOPO da PILHA e desfaz
 *   tudo isso        -> registrado no HISTÓRICO
 */
#ifndef SISTEMA_H
#define SISTEMA_H

#include "modelos.h"
#include "banco.h"
#include "fila.h"
#include "pilha.h"
#include "agendados.h"
#include "historico.h"

typedef struct {
    Banco banco;
    Fila fila;              /* pedidos imediatos (FIFO) */
    Agendados agendados;    /* pagamentos com data futura (ordenados) */
    Pilha pilha;            /* operações efetivadas (LIFO) */
    Historico historico;    /* tudo, em ordem */
    Data hoje;              /* data simulada */
    int proximo_id;
} Sistema;

void sistema_iniciar(Sistema *s, Data hoje);
void sistema_liberar(Sistema *s);

/* Coloca um pedido imediato na fila. id_gerado recebe o número do pedido. */
Resultado sistema_solicitar(Sistema *s, TipoOperacao tipo, int origem, int destino,
                            long valor, int *id_gerado);

/* Agenda um pagamento para uma data futura. */
Resultado sistema_agendar(Sistema *s, int conta, long valor, Data data, int *id_gerado);

/* Processa o próximo da fila. Retorna 0 se a fila estava vazia. */
int sistema_processar_proximo(Sistema *s, Pedido *processado, Resultado *resultado);

/* Avança a data e move os agendados vencidos para a fila.
   Retorna quantos moveu, ou -1 se a nova data seria inválida. */
int sistema_avancar_data(Sistema *s, int dias);

/* Desfaz a operação efetivada mais recente. */
Resultado sistema_estornar(Sistema *s, OperacaoEfetivada *estornada);

/*
 * Cancela um pagamento que ainda está na lista de agendados.
 * Depois que a data chega e ele entra na fila FIFO, não pode mais ser
 * cancelado (tirar do meio da fila quebraria a ordem de chegada);
 * se for efetivado, pode ser estornado normalmente.
 */
Resultado sistema_cancelar_agendamento(Sistema *s, int id);

#endif
