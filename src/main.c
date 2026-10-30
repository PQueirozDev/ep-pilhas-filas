/*
 * main.c
 * Menu do sistema bancário no terminal.
 * Aqui só ficam a leitura do teclado e a impressão; as regras estão em
 * banco.c e o caminho pelas estruturas está em sistema.c.
 */
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include "sistema.h"

#ifdef _WIN32
#include <windows.h>
#include <io.h>
#define entrada_eh_terminal() _isatty(_fileno(stdin))
#else
#include <unistd.h>
#define entrada_eh_terminal() isatty(fileno(stdin))
#endif

#define TAM_LINHA 128

/*
 * Quando a entrada vem de um arquivo (ex.: banco < demo/demo.txt), o que
 * foi "digitado" não aparece na tela. Nesse caso repetimos a linha lida,
 * para a saída ficar legível.
 */
static int ecoar_entrada = 0;

/* Lê uma linha inteira. Retorna 0 se a entrada acabou (fim de arquivo). */
static int ler_linha(char *buf, int tam) {
    if (fgets(buf, tam, stdin) == NULL) {
        return 0;
    }
    char *quebra = strchr(buf, '\n');
    if (quebra != NULL) {
        *quebra = '\0';
    } else if (strlen(buf) == (size_t)(tam - 1)) {
        /* Linha maior que o buffer: descarta o resto e devolve linha vazia,
           que toda leitura rejeita. Sem isso, o começo da linha seria aceito. */
        int c;
        while ((c = getchar()) != '\n' && c != EOF) {
        }
        buf[0] = '\0';
    }
    char *cr = strchr(buf, '\r');
    if (cr != NULL) {
        *cr = '\0';
    }
    if (ecoar_entrada) {
        printf("%s\n", buf);
    }
    return 1;
}

/* Pergunta até receber um inteiro válido. Retorna 0 se a entrada acabou. */
static int ler_inteiro(const char *pergunta, int *saida) {
    char linha[TAM_LINHA];
    while (1) {
        printf("%s", pergunta);
        if (!ler_linha(linha, TAM_LINHA)) {
            return 0;
        }
        char *fim;
        long n = strtol(linha, &fim, 10);
        int achou_numero = (fim != linha);   /* testar ANTES de pular espaços: "   " não é número */
        while (*fim == ' ') fim++;
        if (achou_numero && *fim == '\0' && n >= -1000000 && n <= 1000000) {
            *saida = (int)n;
            return 1;
        }
        printf("  Digite um número inteiro.\n");
    }
}

static int ler_valor(const char *pergunta, long *centavos) {
    char linha[TAM_LINHA];
    while (1) {
        printf("%s", pergunta);
        if (!ler_linha(linha, TAM_LINHA)) {
            return 0;
        }
        if (texto_para_centavos(linha, centavos)) {
            return 1;
        }
        printf("  Formato inválido. Exemplos: 150   150,50   150.50\n");
    }
}

static int ler_data(const char *pergunta, Data *d) {
    char linha[TAM_LINHA];
    while (1) {
        printf("%s", pergunta);
        if (!ler_linha(linha, TAM_LINHA)) {
            return 0;
        }
        int lidos = 0;
        /* %2d e %4d limitam os dígitos (um número enorme estouraria o int).
           %n guarda quantos caracteres o sscanf consumiu: assim "10/11/2026x" é rejeitado. */
        if (sscanf(linha, "%2d/%2d/%4d%n", &d->dia, &d->mes, &d->ano, &lidos) == 3
            && linha[lidos] == '\0') {
            return 1;
        }
        printf("  Use o formato dd/mm/aaaa.\n");
    }
}

static void mostrar_resultado_entrada(Resultado r, int id) {
    if (r == RES_OK) {
        printf("  Pedido #%d entrou no fim da fila.\n", id);
    } else {
        printf("  Pedido #%d %s.\n", id, mensagem_resultado(r));
    }
}

/* Saque, depósito e pagamento imediato: mesma leitura (conta e valor). */
static int acao_pedido_simples(Sistema *s, TipoOperacao tipo) {
    int conta, id;
    long valor;
    if (!ler_inteiro("  Conta: ", &conta)) return 0;
    if (!ler_valor("  Valor (R$): ", &valor)) return 0;
    /* Em duas linhas: o C não garante a ordem em que avalia os argumentos,
       então "id" precisa estar preenchido antes de ser passado. */
    Resultado r = sistema_solicitar(s, tipo, conta, 0, valor, &id);
    mostrar_resultado_entrada(r, id);
    return 1;
}

static int acao_transferencia(Sistema *s) {
    int origem, destino, id;
    long valor;
    if (!ler_inteiro("  Conta de origem: ", &origem)) return 0;
    if (!ler_inteiro("  Conta de destino: ", &destino)) return 0;
    if (!ler_valor("  Valor (R$): ", &valor)) return 0;
    Resultado r = sistema_solicitar(s, OP_TRANSFERENCIA, origem, destino, valor, &id);
    mostrar_resultado_entrada(r, id);
    return 1;
}

static int acao_agendar(Sistema *s) {
    int conta, id;
    long valor;
    Data data;
    if (!ler_inteiro("  Conta: ", &conta)) return 0;
    if (!ler_valor("  Valor (R$): ", &valor)) return 0;
    if (!ler_data("  Data do pagamento (dd/mm/aaaa): ", &data)) return 0;
    Resultado r = sistema_agendar(s, conta, valor, data, &id);
    if (r == RES_OK) {
        printf("  Pagamento #%d agendado para ", id);
        imprimir_data(data);
        printf(".\n");
    } else {
        printf("  Agendamento #%d %s.\n", id, mensagem_resultado(r));
    }
    return 1;
}

static void acao_processar(Sistema *s) {
    Pedido p;
    Resultado r;
    int processados = 0;
    while (sistema_processar_proximo(s, &p, &r)) {
        printf("  ");
        imprimir_pedido(&p);
        printf(" -> %s\n", mensagem_resultado(r));
        processados++;
    }
    if (processados == 0) {
        printf("  A fila está vazia.\n");
    } else {
        printf("\n  Saldos depois do processamento:\n");
        banco_imprimir_contas(&s->banco);
    }
}

static int acao_avancar_data(Sistema *s) {
    int dias;
    if (!ler_inteiro("  Avançar quantos dias? ", &dias)) return 0;
    if (dias < 1 || dias > 3650) {
        printf("  Informe de 1 a 3650 dias.\n");
        return 1;
    }
    int movidos = sistema_avancar_data(s, dias);
    if (movidos < 0) {
        printf("  Não é possível avançar além de 31/12/9999.\n");
        return 1;
    }
    printf("  Nova data: ");
    imprimir_data(s->hoje);
    printf(". %d pagamento(s) agendado(s) entraram na fila.\n", movidos);
    if (fila_cheia(&s->fila) && !agendados_vazia(&s->agendados)) {
        printf("  Atenção: a fila está cheia; processe a fila e avance a data de novo\n"
               "  para liberar os agendados restantes.\n");
    }
    return 1;
}

static void acao_estornar(Sistema *s) {
    OperacaoEfetivada op;
    Resultado r = sistema_estornar(s, &op);
    if (r != RES_OK) {
        printf("  %s.\n", mensagem_resultado(r));
        return;
    }
    printf("  Estornado: ");
    imprimir_pedido(&op.pedido);
    printf("\n  Conta %d voltou para ", op.pedido.conta_origem);
    imprimir_valor(op.saldo_anterior_origem);
    if (op.pedido.tipo == OP_TRANSFERENCIA) {
        printf("; conta %d voltou para ", op.pedido.conta_destino);
        imprimir_valor(op.saldo_anterior_destino);
    }
    printf(".\n");
}

static int acao_cancelar(Sistema *s) {
    int id;
    if (!ler_inteiro("  Número do pagamento agendado: ", &id)) return 0;
    if (sistema_cancelar_agendamento(s, id) == RES_OK) {
        printf("  Agendamento #%d cancelado.\n", id);
    } else {
        printf("  Não há pagamento agendado com o número #%d.\n", id);
    }
    return 1;
}

static void acao_ver_estruturas(Sistema *s) {
    printf("  FILA FIFO (o primeiro sai primeiro):\n");
    fila_imprimir(&s->fila);
    printf("  AGENDADOS (por data, empate pela chegada):\n");
    agendados_imprimir(&s->agendados);
    printf("  PILHA DE EFETIVADAS (o topo é estornado primeiro):\n");
    pilha_imprimir(&s->pilha);
}

static void mostrar_menu(const Sistema *s) {
    printf("\n============================================================\n");
    printf(" Data simulada: ");
    imprimir_data(s->hoje);
    printf(" | Fila: %d | Agendados: %d | Pilha: %d\n",
           s->fila.quantidade, s->agendados.quantidade, s->pilha.tamanho);
    printf("============================================================\n");
    printf("  1) Listar contas            7) Processar fila de pedidos\n");
    printf("  2) Depósito                 8) Avançar data simulada\n");
    printf("  3) Saque                    9) Estornar última operação\n");
    printf("  4) Pagamento imediato      10) Cancelar pagamento agendado\n");
    printf("  5) Transferência           11) Ver fila, agendados e pilha\n");
    printf("  6) Agendar pagamento       12) Histórico\n");
    printf("  0) Sair\n");
}

int main(void) {
#ifdef _WIN32
    /* Faz o terminal do Windows mostrar acentos (UTF-8) corretamente. */
    SetConsoleOutputCP(CP_UTF8);
#endif
    ecoar_entrada = !entrada_eh_terminal();

    printf("=== Sistema Bancário: Pilhas e Filas ===\n");

    Sistema s;
    Data inicio = {13, 11, 2026};
    sistema_iniciar(&s, inicio);

    /* Saldos em centavos: 100000 = R$ 1000,00 */
    banco_adicionar_conta(&s.banco, criar_conta(1, "Ana Souza", 100000));
    banco_adicionar_conta(&s.banco, criar_conta(2, "Bruno Lima", 25050));
    banco_adicionar_conta(&s.banco, criar_conta(3, "Carla Dias", 5000));

    int continuar = 1;
    while (continuar) {
        mostrar_menu(&s);
        int opcao;
        if (!ler_inteiro("Opção: ", &opcao)) {
            break;   /* fim da entrada */
        }
        printf("\n");

        switch (opcao) {
            case 0:  continuar = 0; break;
            case 1:  banco_imprimir_contas(&s.banco); break;
            case 2:  continuar = acao_pedido_simples(&s, OP_DEPOSITO); break;
            case 3:  continuar = acao_pedido_simples(&s, OP_SAQUE); break;
            case 4:  continuar = acao_pedido_simples(&s, OP_PAGAMENTO); break;
            case 5:  continuar = acao_transferencia(&s); break;
            case 6:  continuar = acao_agendar(&s); break;
            case 7:  acao_processar(&s); break;
            case 8:  continuar = acao_avancar_data(&s); break;
            case 9:  acao_estornar(&s); break;
            case 10: continuar = acao_cancelar(&s); break;
            case 11: acao_ver_estruturas(&s); break;
            case 12: historico_imprimir(&s.historico); break;
            default: printf("  Opção inválida.\n"); break;
        }
    }

    sistema_liberar(&s);
    printf("\nAté logo!\n");
    return 0;
}
