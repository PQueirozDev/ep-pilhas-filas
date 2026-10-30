/*
 * banco.c
 * Regras de negócio: depósito, saque, pagamento, transferência e reversão.
 */
#include <stdio.h>
#include <stddef.h>
#include <limits.h>
#include "banco.h"

void banco_iniciar(Banco *b) {
    b->num_contas = 0;
}

int banco_adicionar_conta(Banco *b, Conta c) {
    if (b->num_contas == MAX_CONTAS) {
        return 0;
    }
    b->contas[b->num_contas] = c;
    b->num_contas++;
    return 1;
}

/* Busca linear: percorre as contas até achar o número. */
Conta *buscar_conta(Banco *b, int numero) {
    for (int i = 0; i < b->num_contas; i++) {
        if (b->contas[i].numero == numero) {
            return &b->contas[i];
        }
    }
    return NULL;
}

void banco_imprimir_contas(const Banco *b) {
    for (int i = 0; i < b->num_contas; i++) {
        imprimir_conta(&b->contas[i]);
    }
}

/*
 * Credita a conta. Recusa se o saldo passar do maior número que cabe em
 * um long (no Windows, cerca de R$ 21 milhões). Sem isso a soma "estouraria"
 * e o saldo viraria um número negativo sem sentido.
 */
static Resultado creditar(Conta *c, long valor) {
    if (c->saldo > LONG_MAX - valor) {
        return RES_LIMITE_SALDO;
    }
    c->saldo += valor;
    return RES_OK;
}

/* Debita a conta (usado no saque e no pagamento). Recusa se faltar saldo. */
static Resultado debitar(Conta *c, long valor) {
    if (c->saldo < valor) {
        return RES_SALDO_INSUFICIENTE;   /* saldo não é alterado */
    }
    c->saldo -= valor;
    return RES_OK;
}

/*
 * Transferência TUDO OU NADA:
 * parte 1 debita a origem; parte 2 credita o destino.
 * Se a parte 2 falhar, a parte 1 é desfeita, e nenhum saldo muda.
 */
static Resultado transferir(Conta *origem, Conta *destino, long valor) {
    Resultado r = debitar(origem, valor);
    if (r != RES_OK) {
        return r;                 /* parte 1 falhou: nada mudou */
    }
    r = creditar(destino, valor);
    if (r != RES_OK) {
        origem->saldo += valor;   /* desfaz a parte 1 */
        return r;
    }
    return RES_OK;
}

Resultado validar_pedido(Banco *b, const Pedido *p) {
    if (p->valor <= 0) {
        return RES_VALOR_INVALIDO;
    }
    if (buscar_conta(b, p->conta_origem) == NULL) {
        return RES_CONTA_INEXISTENTE;
    }
    if (p->tipo == OP_TRANSFERENCIA) {
        if (p->conta_destino == p->conta_origem) {
            return RES_MESMA_CONTA;
        }
        if (buscar_conta(b, p->conta_destino) == NULL) {
            return RES_CONTA_INEXISTENTE;
        }
    }
    return RES_OK;
}

/*
 * Executa um pedido e marca a situação dele (efetivado ou recusado).
 * As validações vêm antes de mexer em qualquer saldo.
 */
Resultado processar_pedido(Banco *b, Pedido *p, OperacaoEfetivada *registro) {
    Resultado r = validar_pedido(b, p);

    if (r == RES_OK) {
        Conta *origem = buscar_conta(b, p->conta_origem);
        Conta *destino = NULL;
        if (p->tipo == OP_TRANSFERENCIA) {
            destino = buscar_conta(b, p->conta_destino);
        }

        /* Guarda os saldos de antes, para a pilha de estornos. */
        long saldo_origem = origem->saldo;
        long saldo_destino = (destino != NULL) ? destino->saldo : 0;

        switch (p->tipo) {
            case OP_DEPOSITO:
                r = creditar(origem, p->valor);
                break;
            case OP_SAQUE:
            case OP_PAGAMENTO:
                r = debitar(origem, p->valor);
                break;
            case OP_TRANSFERENCIA:
                r = transferir(origem, destino, p->valor);
                break;
            default:
                r = RES_OPERACAO_INVALIDA;   /* tipo desconhecido nunca é efetivado */
                break;
        }

        if (r == RES_OK && registro != NULL) {
            registro->saldo_anterior_origem = saldo_origem;
            registro->saldo_anterior_destino = saldo_destino;
        }
    }

    p->situacao = (r == RES_OK) ? SIT_EFETIVADO : SIT_RECUSADO;
    if (r == RES_OK && registro != NULL) {
        registro->pedido = *p;
    }
    return r;
}

/*
 * Faz a operação contrária:
 *   depósito      -> tira o valor da conta
 *   saque/pagto   -> devolve o valor à conta
 *   transferência -> tira do destino e devolve à origem
 * Se o dinheiro que entrou já não está mais na conta, o estorno é recusado
 * (regra da equipe: a conta nunca fica negativa) e nenhum saldo muda.
 */
Resultado reverter_operacao(Banco *b, const OperacaoEfetivada *op) {
    const Pedido *p = &op->pedido;
    Conta *origem = buscar_conta(b, p->conta_origem);

    switch (p->tipo) {
        case OP_DEPOSITO:
            if (origem->saldo < p->valor) {
                return RES_SALDO_JA_USADO;
            }
            origem->saldo -= p->valor;
            return RES_OK;

        case OP_SAQUE:
        case OP_PAGAMENTO:
            return creditar(origem, p->valor);

        case OP_TRANSFERENCIA: {
            Conta *destino = buscar_conta(b, p->conta_destino);
            if (destino->saldo < p->valor) {
                return RES_SALDO_JA_USADO;
            }
            Resultado r = creditar(origem, p->valor);
            if (r != RES_OK) {
                return r;
            }
            destino->saldo -= p->valor;
            return RES_OK;
        }
    }
    return RES_OPERACAO_INVALIDA;
}

const char *mensagem_resultado(Resultado r) {
    switch (r) {
        case RES_OK:                 return "efetivado";
        case RES_SALDO_INSUFICIENTE: return "recusado: saldo insuficiente";
        case RES_CONTA_INEXISTENTE:  return "recusado: conta inexistente";
        case RES_VALOR_INVALIDO:     return "recusado: valor deve ser maior que zero";
        case RES_MESMA_CONTA:        return "recusado: origem e destino são a mesma conta";
        case RES_LIMITE_SALDO:       return "recusado: saldo passaria do limite da conta";
        case RES_OPERACAO_INVALIDA:  return "recusado: operação inválida";
        case RES_DATA_INVALIDA:      return "recusado: data inválida";
        case RES_DATA_PASSADA:       return "recusado: a data precisa ser depois de hoje";
        case RES_FILA_CHEIA:         return "recusado: fila de pedidos cheia";
        case RES_NADA_A_ESTORNAR:    return "nada a estornar: nenhuma operação efetivada";
        case RES_SALDO_JA_USADO:     return "estorno recusado: o dinheiro já foi usado";
        case RES_NAO_ENCONTRADO:     return "não encontrado";
        case RES_SEM_MEMORIA:        return "recusado: memória insuficiente";
    }
    return "?";
}
