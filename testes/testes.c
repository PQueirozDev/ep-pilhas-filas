/*
 * testes.c
 * Testes automatizados. Cada CONFERIR compara o resultado com o valor
 * previsto à mão (escrito antes de rodar o teste).
 *
 * Compilar: veja compilar.bat ou o README.
 */
#include <stdio.h>
#include <string.h>
#include <limits.h>
#include "modelos.h"
#include "fila.h"
#include "banco.h"
#include "sistema.h"

#ifdef _WIN32
#include <windows.h>
#endif

static int total = 0;
static int falhas = 0;

#define CONFERIR(condicao, descricao) do {                 \
        total++;                                          \
        if (condicao) {                                   \
            printf("  [ok]    %s\n", descricao);          \
        } else {                                          \
            printf("  [FALHA] %s\n", descricao);          \
            falhas++;                                     \
        }                                                 \
    } while (0)

static Pedido novo_pedido(int id, TipoOperacao tipo, int origem, long valor) {
    Pedido p = {0};
    p.id = id;
    p.tipo = tipo;
    p.conta_origem = origem;
    p.valor = valor;
    p.situacao = SIT_PENDENTE;
    return p;
}

static Pedido nova_transferencia(int id, int origem, int destino, long valor) {
    Pedido p = novo_pedido(id, OP_TRANSFERENCIA, origem, valor);
    p.conta_destino = destino;
    return p;
}

static Data data(int dia, int mes, int ano) {
    Data d = {dia, mes, ano};
    return d;
}

/* Sistema com as mesmas contas do programa: Ana R$ 1000,00, Bruno R$ 250,50, Carla R$ 50,00. */
static void preparar_sistema(Sistema *s) {
    sistema_iniciar(s, data(13, 11, 2026));
    banco_adicionar_conta(&s->banco, criar_conta(1, "Ana Souza", 100000));
    banco_adicionar_conta(&s->banco, criar_conta(2, "Bruno Lima", 25050));
    banco_adicionar_conta(&s->banco, criar_conta(3, "Carla Dias", 5000));
}

static void processar_tudo(Sistema *s) {
    Pedido p;
    Resultado r;
    while (sistema_processar_proximo(s, &p, &r)) {
    }
}

static long saldo(Sistema *s, int conta) {
    return buscar_conta(&s->banco, conta)->saldo;
}

/* ---------- Leitura de valores e datas ---------- */

static void teste_conversao_valor(void) {
    printf("Conversão do valor digitado para centavos\n");
    long c = 0;
    CONFERIR(texto_para_centavos("150", &c) && c == 15000, "\"150\" vira 15000");
    CONFERIR(texto_para_centavos("150,5", &c) && c == 15050, "\"150,5\" vira 15050");
    CONFERIR(texto_para_centavos("150.50", &c) && c == 15050, "\"150.50\" vira 15050");
    CONFERIR(texto_para_centavos("-10", &c) && c == -1000, "\"-10\" vira -1000 (o banco recusa depois)");
    CONFERIR(!texto_para_centavos("abc", &c), "\"abc\" é rejeitado");
    CONFERIR(!texto_para_centavos("1,234", &c), "\"1,234\" (3 casas) é rejeitado");
    CONFERIR(!texto_para_centavos("", &c), "texto vazio é rejeitado");
}

static void teste_datas(void) {
    printf("Datas simuladas\n");
    Data d = data_somar_dias(data(28, 2, 2028), 1);
    CONFERIR(data_comparar(d, data(29, 2, 2028)) == 0, "28/02/2028 + 1 dia = 29/02/2028 (bissexto)");
    d = data_somar_dias(data(31, 12, 2026), 1);
    CONFERIR(data_comparar(d, data(1, 1, 2027)) == 0, "31/12/2026 + 1 dia = 01/01/2027");
    CONFERIR(!data_valida(data(31, 11, 2026)), "31/11/2026 é inválida");
    CONFERIR(!data_valida(data(29, 2, 2027)), "29/02/2027 é inválida (não bissexto)");
    CONFERIR(data_comparar(data(1, 12, 2026), data(30, 11, 2026)) > 0, "01/12/2026 vem depois de 30/11/2026");
}

/* ---------- Etapa 2: fila FIFO ---------- */

static void teste_fila_ordem(void) {
    printf("Etapa 2 - Fila: ordem de saída igual à de entrada\n");
    Fila f;
    fila_iniciar(&f);
    Pedido saida;

    CONFERIR(fila_vazia(&f), "fila nova está vazia");
    CONFERIR(!desenfileirar(&f, &saida), "desenfileirar de fila vazia falha");

    /* Previsão: entram 1, 2, 3 e saem 1, 2, 3. */
    enfileirar(&f, novo_pedido(1, OP_DEPOSITO, 1, 100));
    enfileirar(&f, novo_pedido(2, OP_SAQUE, 1, 100));
    enfileirar(&f, novo_pedido(3, OP_PAGAMENTO, 1, 100));

    desenfileirar(&f, &saida);
    CONFERIR(saida.id == 1, "1º a sair é o pedido 1");
    desenfileirar(&f, &saida);
    CONFERIR(saida.id == 2, "2º a sair é o pedido 2");
    desenfileirar(&f, &saida);
    CONFERIR(saida.id == 3, "3º a sair é o pedido 3");
    CONFERIR(fila_vazia(&f), "fila vazia depois de tirar todos");
}

static void teste_fila_circular(void) {
    printf("Etapa 2 - Fila: limite de capacidade e volta do vetor circular\n");
    Fila f;
    fila_iniciar(&f);
    Pedido saida;

    for (int i = 1; i <= CAPACIDADE_FILA; i++) {
        enfileirar(&f, novo_pedido(i, OP_DEPOSITO, 1, 100));
    }
    CONFERIR(fila_cheia(&f), "fila cheia com CAPACIDADE_FILA pedidos");
    CONFERIR(!enfileirar(&f, novo_pedido(999, OP_DEPOSITO, 1, 100)),
             "enfileirar em fila cheia falha");

    /* Tira 2 e coloca 2 novos: os novos ocupam as posições 0 e 1 do vetor. */
    desenfileirar(&f, &saida);
    desenfileirar(&f, &saida);
    enfileirar(&f, novo_pedido(101, OP_DEPOSITO, 1, 100));
    enfileirar(&f, novo_pedido(102, OP_DEPOSITO, 1, 100));

    /* Previsão: saem 3, 4, ..., 100, 101, 102 nessa ordem. */
    int ordem_certa = 1;
    int esperado = 3;
    while (desenfileirar(&f, &saida)) {
        if (saida.id != esperado) {
            ordem_certa = 0;
        }
        esperado++;
    }
    CONFERIR(ordem_certa && esperado == 103, "ordem mantida depois de dar a volta no vetor");
}

/* ---------- Etapa 3: depósito, saque e pagamento ---------- */

static void teste_operacoes_simples(void) {
    printf("Etapa 3 - Depósito, saque e pagamento imediato\n");
    Banco b;
    banco_iniciar(&b);
    banco_adicionar_conta(&b, criar_conta(1, "Ana Souza", 100000));   /* R$ 1000,00 */
    Conta *ana = buscar_conta(&b, 1);

    Pedido p = novo_pedido(1, OP_DEPOSITO, 1, 20000);
    CONFERIR(processar_pedido(&b, &p, NULL) == RES_OK && ana->saldo == 120000,
             "depósito de R$ 200,00: saldo R$ 1200,00");
    CONFERIR(p.situacao == SIT_EFETIVADO, "depósito fica com situação efetivado");

    p = novo_pedido(2, OP_SAQUE, 1, 30000);
    CONFERIR(processar_pedido(&b, &p, NULL) == RES_OK && ana->saldo == 90000,
             "saque de R$ 300,00: saldo R$ 900,00");

    p = novo_pedido(3, OP_SAQUE, 1, 500000);
    CONFERIR(processar_pedido(&b, &p, NULL) == RES_SALDO_INSUFICIENTE && ana->saldo == 90000,
             "saque de R$ 5000,00 recusado, saldo continua R$ 900,00");
    CONFERIR(p.situacao == SIT_RECUSADO, "saque recusado fica com situação recusado");

    p = novo_pedido(4, OP_PAGAMENTO, 1, 90000);
    CONFERIR(processar_pedido(&b, &p, NULL) == RES_OK && ana->saldo == 0,
             "pagamento de exatamente o saldo (R$ 900,00): saldo R$ 0,00");

    p = novo_pedido(5, OP_PAGAMENTO, 1, 1);
    CONFERIR(processar_pedido(&b, &p, NULL) == RES_SALDO_INSUFICIENTE && ana->saldo == 0,
             "pagamento de R$ 0,01 com saldo zero recusado");
}

static void teste_validacoes(void) {
    printf("Etapa 3 - Validações: valor e conta\n");
    Banco b;
    banco_iniciar(&b);
    banco_adicionar_conta(&b, criar_conta(1, "Ana Souza", 100000));
    Conta *ana = buscar_conta(&b, 1);

    Pedido p = novo_pedido(1, OP_DEPOSITO, 1, 0);
    CONFERIR(processar_pedido(&b, &p, NULL) == RES_VALOR_INVALIDO, "valor zero recusado");

    p = novo_pedido(2, OP_SAQUE, 1, -500);
    CONFERIR(processar_pedido(&b, &p, NULL) == RES_VALOR_INVALIDO && ana->saldo == 100000,
             "valor negativo recusado, saldo não muda");

    p = novo_pedido(3, OP_DEPOSITO, 99, 1000);
    CONFERIR(processar_pedido(&b, &p, NULL) == RES_CONTA_INEXISTENTE, "conta 99 inexistente recusada");
}

/* ---------- Etapa 4: transferência tudo ou nada ---------- */

static void teste_transferencia(void) {
    printf("Etapa 4 - Transferência tudo ou nada\n");
    Banco b;
    banco_iniciar(&b);
    banco_adicionar_conta(&b, criar_conta(1, "Ana Souza", 100000));   /* R$ 1000,00 */
    banco_adicionar_conta(&b, criar_conta(2, "Bruno Lima", 25050));   /* R$ 250,50 */
    Conta *ana = buscar_conta(&b, 1);
    Conta *bruno = buscar_conta(&b, 2);

    Pedido p = nova_transferencia(1, 1, 2, 10000);
    CONFERIR(processar_pedido(&b, &p, NULL) == RES_OK && ana->saldo == 90000 && bruno->saldo == 35050,
             "R$ 100,00 de 1 para 2: Ana R$ 900,00, Bruno R$ 350,50");

    p = nova_transferencia(2, 1, 2, 500000);
    CONFERIR(processar_pedido(&b, &p, NULL) == RES_SALDO_INSUFICIENTE
             && ana->saldo == 90000 && bruno->saldo == 35050,
             "R$ 5000,00 sem saldo: recusada, nenhum saldo muda");

    p = nova_transferencia(3, 1, 1, 1000);
    CONFERIR(processar_pedido(&b, &p, NULL) == RES_MESMA_CONTA && ana->saldo == 90000,
             "transferência para a mesma conta recusada");

    p = nova_transferencia(4, 1, 99, 1000);
    CONFERIR(processar_pedido(&b, &p, NULL) == RES_CONTA_INEXISTENTE && ana->saldo == 90000,
             "destino inexistente: recusada, origem não muda");

    /* Falha na PARTE 2: o destino já está quase no limite, então o crédito falha
       depois que o débito já aconteceu. A transferência precisa desfazer o débito. */
    bruno->saldo = LONG_MAX - 50;
    p = nova_transferencia(5, 1, 2, 100);
    CONFERIR(processar_pedido(&b, &p, NULL) == RES_LIMITE_SALDO
             && ana->saldo == 90000 && bruno->saldo == LONG_MAX - 50,
             "crédito no destino falha: débito na origem é desfeito");
}

/* ---------- Etapa 5: pilha e estorno LIFO ---------- */

static void teste_estorno_lifo(void) {
    printf("Etapa 5 - Pilha de efetivadas e estorno LIFO\n");
    Sistema s;
    preparar_sistema(&s);
    int id;
    OperacaoEfetivada op;

    sistema_solicitar(&s, OP_DEPOSITO, 1, 0, 20000, &id);   /* #1 */
    sistema_solicitar(&s, OP_SAQUE, 1, 0, 30000, &id);      /* #2 */
    processar_tudo(&s);
    CONFERIR(saldo(&s, 1) == 90000 && s.pilha.tamanho == 2,
             "depósito R$ 200 e saque R$ 300: saldo R$ 900,00, 2 na pilha");
    CONFERIR(topo(&s.pilha)->pedido.id == 2, "topo da pilha é o saque (#2), o mais recente");

    CONFERIR(sistema_estornar(&s, &op) == RES_OK && op.pedido.id == 2 && saldo(&s, 1) == 120000,
             "1º estorno desfaz o saque: saldo volta a R$ 1200,00 (antes do saque)");
    CONFERIR(op.saldo_anterior_origem == 120000, "saldo anterior guardado na pilha confere");
    CONFERIR(sistema_estornar(&s, &op) == RES_OK && op.pedido.id == 1 && saldo(&s, 1) == 100000,
             "2º estorno desfaz o depósito: saldo volta a R$ 1000,00");
    CONFERIR(sistema_estornar(&s, &op) == RES_NADA_A_ESTORNAR && saldo(&s, 1) == 100000,
             "3º estorno com pilha vazia: informa e nada muda");

    sistema_solicitar(&s, OP_SAQUE, 1, 0, 500000, &id);
    processar_tudo(&s);
    CONFERIR(pilha_vazia(&s.pilha), "saque recusado não entra na pilha");

    sistema_solicitar(&s, OP_TRANSFERENCIA, 1, 2, 10000, &id);
    processar_tudo(&s);
    CONFERIR(sistema_estornar(&s, &op) == RES_OK && saldo(&s, 1) == 100000 && saldo(&s, 2) == 25050,
             "estorno de transferência devolve os dois saldos");

    sistema_liberar(&s);
}

static void teste_estorno_saldo_usado(void) {
    printf("Etapa 5 - Estorno de depósito cujo dinheiro já foi usado\n");
    Sistema s;
    preparar_sistema(&s);
    int id;
    OperacaoEfetivada op;

    sistema_solicitar(&s, OP_DEPOSITO, 3, 0, 10000, &id);   /* Carla: R$ 50 -> R$ 150 */
    processar_tudo(&s);

    /* Simulação: o dinheiro saiu da conta por um caminho que não passa pela
       pilha. Pelo menu isso não acontece, porque o estorno é sempre do topo;
       a regra é uma proteção extra pedida pela equipe. */
    buscar_conta(&s.banco, 3)->saldo = 2000;

    CONFERIR(sistema_estornar(&s, &op) == RES_SALDO_JA_USADO && saldo(&s, 3) == 2000,
             "estorno recusado e saldo continua R$ 20,00 (nunca fica negativo)");
    CONFERIR(s.pilha.tamanho == 1 && topo(&s.pilha)->pedido.id == 1,
             "a operação continua no topo da pilha");
    sistema_liberar(&s);
}

/* ---------- Etapa 6: agendados ---------- */

static void teste_agendados(void) {
    printf("Etapa 6 - Pagamentos agendados (ordem por data, empate FIFO)\n");
    Sistema s;
    preparar_sistema(&s);   /* hoje = 13/11/2026 */
    int id_a, id_b, id_c, id_d, id;

    sistema_agendar(&s, 1, 1000, data(20, 11, 2026), &id_a);   /* #1 */
    sistema_agendar(&s, 1, 2000, data(15, 11, 2026), &id_b);   /* #2 */
    sistema_agendar(&s, 1, 3000, data(20, 11, 2026), &id_c);   /* #3 */
    sistema_agendar(&s, 1, 4000, data(15, 11, 2026), &id_d);   /* #4 */

    /* Previsão da ordem: #2 (15/11), #4 (15/11, chegou depois), #1 (20/11), #3 (20/11). */
    NoAgendado *no = s.agendados.inicio;
    int ordem[4] = {0};
    for (int i = 0; i < 4 && no != NULL; i++, no = no->proximo) {
        ordem[i] = no->pedido.id;
    }
    CONFERIR(ordem[0] == id_b && ordem[1] == id_d && ordem[2] == id_a && ordem[3] == id_c,
             "ordem na lista: #2, #4, #1, #3");

    CONFERIR(sistema_agendar(&s, 1, 1000, data(13, 11, 2026), &id) == RES_DATA_PASSADA,
             "agendar para hoje é recusado (precisa ser data futura)");
    CONFERIR(sistema_agendar(&s, 1, 1000, data(10, 11, 2026), &id) == RES_DATA_PASSADA,
             "agendar para data passada é recusado");
    CONFERIR(sistema_agendar(&s, 1, 1000, data(31, 11, 2026), &id) == RES_DATA_INVALIDA,
             "agendar para 31/11 é recusado (data inválida)");
    CONFERIR(sistema_agendar(&s, 1, 0, data(20, 11, 2026), &id) == RES_VALOR_INVALIDO,
             "agendar valor zero é recusado");
    CONFERIR(sistema_agendar(&s, 99, 1000, data(20, 11, 2026), &id) == RES_CONTA_INEXISTENTE,
             "agendar em conta inexistente é recusado");
    CONFERIR(s.agendados.quantidade == 4, "recusados não entram na lista");

    /* Avança para 15/11: só #2 e #4 vencem e vão para a fila, nessa ordem. */
    CONFERIR(sistema_avancar_data(&s, 2) == 2, "avançar 2 dias (15/11) move 2 agendados");
    CONFERIR(s.fila.quantidade == 2 && s.fila.itens[s.fila.inicio].id == id_b,
             "o primeiro da fila é o #2");
    CONFERIR(s.agendados.quantidade == 2, "#1 e #3 continuam agendados");

    CONFERIR(sistema_cancelar_agendamento(&s, id_a) == RES_OK && s.agendados.quantidade == 1,
             "cancelar #1 tira ele da lista");
    CONFERIR(sistema_cancelar_agendamento(&s, 999) == RES_NAO_ENCONTRADO,
             "cancelar número inexistente informa que não encontrou");

    CONFERIR(sistema_avancar_data(&s, 10) == 1, "avançar até 25/11 move só o #3");

    processar_tudo(&s);
    /* Ana: 1000,00 - 20 - 40 - 30 = 910,00. O cancelado (#1, R$ 10) não foi cobrado. */
    CONFERIR(saldo(&s, 1) == 91000, "saldo final R$ 910,00 (cancelado não foi cobrado)");
    CONFERIR(s.pilha.tamanho == 3 && topo(&s.pilha)->pedido.id == id_c,
             "3 efetivados na pilha, o #3 no topo; o cancelado não passou pela pilha");
    sistema_liberar(&s);
}

/* ---------- Etapa 7: histórico ---------- */

static void teste_historico(void) {
    printf("Etapa 7 - Histórico em ordem de ocorrência\n");
    Sistema s;
    preparar_sistema(&s);
    int id;
    OperacaoEfetivada op;

    sistema_solicitar(&s, OP_DEPOSITO, 1, 0, 5000, &id);     /* #1 efetivado */
    sistema_solicitar(&s, OP_SAQUE, 2, 0, 999999, &id);      /* #2 recusado no processamento */
    sistema_solicitar(&s, OP_DEPOSITO, 1, 0, 0, &id);        /* #3 recusado na entrada */
    processar_tudo(&s);
    sistema_estornar(&s, &op);                               /* estorno do #1 */

    /* Previsão: #3 recusado (na entrada, antes de processar), #1 efetivado,
       #2 recusado, #1 estornado. */
    const char *esperado_desc[] = {
        "recusado: valor deve ser maior que zero",
        "efetivado",
        "recusado: saldo insuficiente",
        "estornado (operação desfeita)"
    };
    int esperado_id[] = {3, 1, 2, 1};

    int certo = (s.historico.quantidade == 4);
    int i = 0;
    for (NoHistorico *no = s.historico.inicio; no != NULL && i < 4; no = no->proximo, i++) {
        if (no->pedido.id != esperado_id[i] || strcmp(no->descricao, esperado_desc[i]) != 0) {
            certo = 0;
        }
    }
    CONFERIR(certo, "histórico: #3 recusado, #1 efetivado, #2 recusado, #1 estornado");
    CONFERIR(s.pilha.tamanho == 0, "histórico guarda tudo, mas a pilha ficou vazia");
    sistema_liberar(&s);
}

int main(void) {
#ifdef _WIN32
    SetConsoleOutputCP(CP_UTF8);
#endif
    teste_conversao_valor();
    teste_datas();
    teste_fila_ordem();
    teste_fila_circular();
    teste_operacoes_simples();
    teste_validacoes();
    teste_transferencia();
    teste_estorno_lifo();
    teste_estorno_saldo_usado();
    teste_agendados();
    teste_historico();

    printf("\n%d testes, %d falhas\n", total, falhas);
    return falhas == 0 ? 0 : 1;
}
