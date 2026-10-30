/*
 * banco.h
 * Contas do banco e execução das operações sobre os saldos.
 */
#ifndef BANCO_H
#define BANCO_H

#include "modelos.h"

#define MAX_CONTAS 20

typedef struct {
    Conta contas[MAX_CONTAS];
    int num_contas;
} Banco;

/* Resultado de uma operação: diz se deu certo ou por que foi recusada. */
typedef enum {
    RES_OK,
    RES_SALDO_INSUFICIENTE,
    RES_CONTA_INEXISTENTE,
    RES_VALOR_INVALIDO,
    RES_MESMA_CONTA,
    RES_LIMITE_SALDO,
    RES_OPERACAO_INVALIDA,
    RES_DATA_INVALIDA,
    RES_DATA_PASSADA,
    RES_FILA_CHEIA,
    RES_NADA_A_ESTORNAR,
    RES_SALDO_JA_USADO,
    RES_NAO_ENCONTRADO,
    RES_SEM_MEMORIA
} Resultado;

void banco_iniciar(Banco *b);
int banco_adicionar_conta(Banco *b, Conta c);   /* 1 = ok, 0 = banco cheio */
Conta *buscar_conta(Banco *b, int numero);      /* NULL se não existir */
void banco_imprimir_contas(const Banco *b);

/* Regras que não dependem do saldo: valor, contas existentes, mesma conta. */
Resultado validar_pedido(Banco *b, const Pedido *p);

/*
 * Executa o pedido e marca a situação dele.
 * Se der certo e "registro" não for NULL, preenche o registro para a pilha.
 */
Resultado processar_pedido(Banco *b, Pedido *p, OperacaoEfetivada *registro);

/* Desfaz uma operação efetivada (usado pelo estorno). */
Resultado reverter_operacao(Banco *b, const OperacaoEfetivada *op);

const char *mensagem_resultado(Resultado r);

#endif
