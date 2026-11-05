/*
 * sistema.h
 * ---------
 * Junta tudo: contas, fila de pedidos, pilha de efetivadas, agenda e
 * histórico. Cada função aqui é um "caso de uso" do menu.
 *
 * Caminho de um pedido imediato:
 *   cliente pede -> entra no FIM da FILA -> processar tira do INÍCIO ->
 *   tem saldo?  sim -> efetiva, EMPILHA na pilha de efetivadas, histórico
 *               não -> recusa, histórico
 *   estornar -> DESEMPILHA o topo (a última efetivada) e a desfaz
 *
 * Caminho de um pagamento agendado:
 *   agenda (ordenada por data, qsort com desempate) -> data avança ->
 *   executa os vencidos em ordem -> histórico (NÃO vai para a pilha)
 */

#ifndef SISTEMA_H
#define SISTEMA_H

#include "operacao.h"
#include "fila.h"
#include "pilha.h"
#include "agendados.h"
#include "historico.h"

#define NUM_CONTAS 3

/* Um texto em C é um vetor de char terminado pelo caractere '\0'.
 * "char titular[20]" guarda até 19 caracteres + o '\0' final
 * (letras acentuadas ocupam 2 caracteres cada). */
typedef struct {
    int    numero;
    char   titular[20];
    double saldo;
} Conta;

typedef struct {
    Conta     contas[NUM_CONTAS];
    Fila      pedidos;       /* FIFO: pedidos imediatos esperando        */
    Pilha     efetivadas;    /* LIFO: operações efetivadas, p/ estorno    */
    Agenda    agendados;     /* pagamentos futuros, ordenados por data    */
    Historico historico;     /* lista encadeada com todos os eventos      */
    int       hoje;          /* data simulada, AAAAMMDD                   */
    int       proximoNumero; /* número de entrada do próximo pedido       */
} Sistema;

/* Códigos de resultado devolvidos pelas funções abaixo. */
#define RES_OK                  0
#define RES_VALOR_INVALIDO      1
#define RES_CONTA_INVALIDA      2
#define RES_MESMA_CONTA         3
#define RES_FILA_CHEIA          4
#define RES_FILA_VAZIA          5
#define RES_SALDO_INSUFICIENTE  6
#define RES_PILHA_CHEIA         7
#define RES_NADA_A_ESTORNAR     8
#define RES_ESTORNO_IMPOSSIVEL  9
#define RES_DATA_INVALIDA      10
#define RES_AGENDA_CHEIA       11
#define RES_NAO_ENCONTRADO     12

/* Prepara contas de exemplo, estruturas vazias e a data inicial. */
void  iniciarSistema(Sistema *s, int dataInicial);

/* Libera a memória do histórico. Chamar antes de sair. */
void  encerrarSistema(Sistema *s);

/* Devolve o ENDEREÇO da conta com esse número, ou NULL se não existe. */
Conta *buscarConta(Sistema *s, int numero);

/* Pedido imediato: valida e coloca no fim da fila (o saldo só é
 * conferido ao processar, pois ele pode mudar até lá). */
int solicitarOperacao(Sistema *s, int tipo, int origem, int destino, double valor);

/* Atende o primeiro da fila. */
int processarProximo(Sistema *s);

/* Atende a fila inteira, em ordem. Devolve quantos foram atendidos. */
int processarTodos(Sistema *s);

/* Desfaz a última operação efetivada (topo da pilha). */
int estornar(Sistema *s);

int agendarPagamento(Sistema *s, int conta, double valor, int data);
int cancelarAgendamento(Sistema *s, int numero);

/* Muda a data simulada e executa os agendados que venceram. */
int avancarData(Sistema *s, int novaData);

void mostrarContas(Sistema *s);
void mostrarSituacao(Sistema *s);

#endif
