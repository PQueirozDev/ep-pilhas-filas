/*
 * modelos.c
 * Funções simples para criar e mostrar os tipos de modelos.h.
 */
#include <stdio.h>
#include <string.h>
#include <ctype.h>
#include <limits.h>
#include "modelos.h"

Conta criar_conta(int numero, const char *titular, long saldo_inicial) {
    Conta c;
    c.numero = numero;
    /* strncpy + '\0' no fim garante que o nome nunca estoura o vetor */
    strncpy(c.titular, titular, TAM_TITULAR - 1);
    c.titular[TAM_TITULAR - 1] = '\0';
    c.saldo = saldo_inicial;
    return c;
}

/* Mostra centavos no formato R$ 1234,56 */
void imprimir_valor(long centavos) {
    if (centavos < 0) {
        printf("-");
        centavos = -centavos;
    }
    printf("R$ %ld,%02ld", centavos / 100, centavos % 100);
}

void imprimir_conta(const Conta *c) {
    printf("Conta %d | %-20s | saldo: ", c->numero, c->titular);
    imprimir_valor(c->saldo);
    printf("\n");
}

/* Ex.: "#3 Transferência | conta 1 -> 2 | R$ 100,00" */
void imprimir_pedido(const Pedido *p) {
    printf("#%d %s | conta %d", p->id, nome_tipo(p->tipo), p->conta_origem);
    if (p->tipo == OP_TRANSFERENCIA) {
        printf(" -> %d", p->conta_destino);
    }
    printf(" | ");
    imprimir_valor(p->valor);
    if (p->agendado) {
        printf(" | para ");
        imprimir_data(p->data);
    }
}

const char *nome_tipo(TipoOperacao tipo) {
    switch (tipo) {
        case OP_SAQUE:         return "Saque";
        case OP_DEPOSITO:      return "Depósito";
        case OP_TRANSFERENCIA: return "Transferência";
        case OP_PAGAMENTO:     return "Pagamento";
    }
    return "?";
}

const char *nome_situacao(Situacao sit) {
    switch (sit) {
        case SIT_PENDENTE:  return "pendente";
        case SIT_EFETIVADO: return "efetivado";
        case SIT_RECUSADO:  return "recusado";
        case SIT_CANCELADO: return "cancelado";
        case SIT_ESTORNADO: return "estornado";
    }
    return "?";
}

/*
 * Converte o texto digitado em centavos.
 * Aceita "150", "150,5", "150,50", "150.50" e também "-10" (o sinal é
 * aceito aqui para que a regra "valor negativo é recusado" seja aplicada
 * pelo banco, e não pela leitura).
 */
int texto_para_centavos(const char *texto, long *centavos) {
    const char *s = texto;
    int negativo = 0;
    long long reais = 0;
    long long fracao = 0;
    int digitos = 0;

    while (*s == ' ') s++;
    if (*s == '-') {
        negativo = 1;
        s++;
    }
    while (isdigit((unsigned char)*s)) {
        reais = reais * 10 + (*s - '0');
        if (reais > LONG_MAX / 100) {
            return 0;   /* número grande demais para caber em long */
        }
        digitos++;
        s++;
    }
    if (digitos == 0) {
        return 0;
    }
    if (*s == ',' || *s == '.') {
        s++;
        if (!isdigit((unsigned char)*s)) {
            return 0;
        }
        fracao = (*s - '0') * 10;   /* "5" depois da vírgula vale 50 centavos */
        s++;
        if (isdigit((unsigned char)*s)) {
            fracao += *s - '0';
            s++;
        }
    }
    while (*s == ' ') s++;
    if (*s != '\0') {
        return 0;   /* sobrou algo que não é número (ex.: "12abc" ou 3 casas decimais) */
    }

    long long total = reais * 100 + fracao;
    if (total > LONG_MAX) {
        return 0;
    }
    *centavos = (long)(negativo ? -total : total);
    return 1;
}

/* ---------- Datas ---------- */

static int eh_bissexto(int ano) {
    return (ano % 4 == 0 && ano % 100 != 0) || ano % 400 == 0;
}

static int dias_no_mes(int mes, int ano) {
    int dias[] = {31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31};
    if (mes == 2 && eh_bissexto(ano)) {
        return 29;
    }
    return dias[mes - 1];
}

int data_valida(Data d) {
    if (d.ano < 1900 || d.ano > 9999) return 0;
    if (d.mes < 1 || d.mes > 12) return 0;
    if (d.dia < 1 || d.dia > dias_no_mes(d.mes, d.ano)) return 0;
    return 1;
}

/* Transforma a data no número aaaammdd: assim comparar datas vira comparar inteiros. */
int data_comparar(Data a, Data b) {
    int na = a.ano * 10000 + a.mes * 100 + a.dia;
    int nb = b.ano * 10000 + b.mes * 100 + b.dia;
    return na - nb;
}

/* Avança um dia por vez, virando o mês e o ano quando precisa. */
Data data_somar_dias(Data d, int dias) {
    for (int i = 0; i < dias; i++) {
        d.dia++;
        if (d.dia > dias_no_mes(d.mes, d.ano)) {
            d.dia = 1;
            d.mes++;
            if (d.mes > 12) {
                d.mes = 1;
                d.ano++;
            }
        }
    }
    return d;
}

void imprimir_data(Data d) {
    printf("%02d/%02d/%04d", d.dia, d.mes, d.ano);
}
