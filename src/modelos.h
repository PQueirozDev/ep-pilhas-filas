/*
 * modelos.h
 * Tipos básicos do sistema: conta, pedido, data e os enums de tipo e situação.
 */
#ifndef MODELOS_H
#define MODELOS_H

#define TAM_TITULAR 50

/* Tipos de operação que um cliente pode pedir. */
typedef enum {
    OP_SAQUE,
    OP_DEPOSITO,
    OP_TRANSFERENCIA,
    OP_PAGAMENTO
} TipoOperacao;

/* Em que pé está um pedido. */
typedef enum {
    SIT_PENDENTE,   /* esperando na fila */
    SIT_EFETIVADO,  /* executado com sucesso */
    SIT_RECUSADO,   /* não executado (saldo, conta inválida etc.) */
    SIT_CANCELADO,  /* agendamento cancelado antes de executar */
    SIT_ESTORNADO   /* efetivado e depois desfeito */
} Situacao;

/* Data simulada (não usamos o relógio do computador). */
typedef struct {
    int dia;
    int mes;
    int ano;
} Data;

/*
 * Conta bancária.
 * O saldo fica em CENTAVOS (inteiro) para evitar erros de arredondamento
 * de float/double: R$ 10,50 é guardado como 1050.
 */
typedef struct {
    int numero;
    char titular[TAM_TITULAR];
    long saldo;
} Conta;

/* Pedido feito por um cliente. */
typedef struct {
    int id;              /* número sequencial, mostra a ordem de chegada */
    TipoOperacao tipo;
    int conta_origem;
    int conta_destino;   /* só usado na transferência */
    long valor;          /* em centavos */
    int agendado;        /* 1 = pagamento agendado, 0 = imediato */
    Data data;           /* só usada no pagamento agendado */
    Situacao situacao;
} Pedido;

/*
 * O que a pilha de estornos guarda: o pedido efetivado e os saldos
 * das contas ANTES dele, para mostrar e conferir o estorno.
 */
typedef struct {
    Pedido pedido;
    long saldo_anterior_origem;
    long saldo_anterior_destino;   /* só usado na transferência */
} OperacaoEfetivada;

Conta criar_conta(int numero, const char *titular, long saldo_inicial);
void imprimir_conta(const Conta *c);
void imprimir_valor(long centavos);
void imprimir_pedido(const Pedido *p);
const char *nome_tipo(TipoOperacao tipo);
const char *nome_situacao(Situacao sit);
int texto_para_centavos(const char *texto, long *centavos);   /* 1 = ok, 0 = formato inválido */

int data_valida(Data d);
int data_comparar(Data a, Data b);       /* <0 se a vem antes, 0 se igual, >0 se depois */
Data data_somar_dias(Data d, int dias);
void imprimir_data(Data d);

#endif
