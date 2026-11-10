/* Banco em vetores: acesso direto ao estado global, sem parâmetros de endereço. */
#ifndef SISTEMA_H
#define SISTEMA_H

#include "operacao.h"
#include "fila.h"
#include "pilha.h"
#include "agendados.h"
#include "historico.h"

#define NUM_CONTAS 3

typedef struct {
    int    numero;
    char   titular[20];
    double saldo;
} Conta;

typedef struct {
    Conta     contas[NUM_CONTAS];
    Fila      pedidos;
    Pilha     efetivadas;
    Agenda    agendados;
    Historico historico;
    int       hoje;
    int       proximoNumero;
} Sistema;

/* Único estado do programa; as funções acessam seus campos pelo ponto. */
extern Sistema banco;

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
#define RES_HISTORICO_CHEIO    13

void  iniciarSistema(int dataInicial);

void  encerrarSistema(void);

/* Devolve o índice da conta, ou -1 quando ela não existe. */
int buscarConta(int numero);

int solicitarOperacao(int tipo, int origem, int destino, double valor);

int processarProximo(void);

int processarTodos(void);

int estornar(void);

int agendarPagamento(int conta, double valor, int data);
int cancelarAgendamento(int numero);

int avancarData(int novaData);

void mostrarContas(void);
void mostrarSituacao(void);

#endif
