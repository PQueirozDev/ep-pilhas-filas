/*
 * main.c
 * ------
 * Menu interativo do banco. Aqui só lemos o que o cliente quer e chamamos
 * as funções de sistema.c, que fazem o trabalho com fila, pilha, agenda
 * e histórico.
 */

#include <stdio.h>
#include "entrada.h"
#include "sistema.h"

#define DATA_INICIAL 20261105   /* 05/11/2026 */

void mostrarMenu(Sistema *s)
{
    printf("\n========== BANCO EP  |  hoje: ");
    imprimirData(s->hoje);
    printf(" ==========\n");
    printf(" Pedidos imediatos (entram na FILA)\n");
    printf("   1 - Depósito\n");
    printf("   2 - Saque\n");
    printf("   3 - Transferência\n");
    printf("   4 - Pagamento imediato\n");
    printf(" Processamento\n");
    printf("   5 - Processar próximo pedido da fila\n");
    printf("   6 - Processar todos os pedidos da fila\n");
    printf("   7 - Estornar a última operação efetivada (PILHA)\n");
    printf(" Pagamentos agendados\n");
    printf("   8 - Agendar pagamento\n");
    printf("   9 - Cancelar pagamento agendado\n");
    printf("  10 - Avançar a data (executa os agendados vencidos)\n");
    printf(" Consultas\n");
    printf("  11 - Ver situação (contas, fila, pilha, agenda)\n");
    printf("  12 - Histórico\n");
    printf("   0 - Sair\n");
}

int main(void)
{
    Sistema banco;
    int opcao, origem, destino, conta, data;
    double valor;

    configurarConsole();
    iniciarSistema(&banco, DATA_INICIAL);

    printf("Bem-vindo ao Banco EP. Contas de demonstração:\n");
    mostrarContas(&banco);

    do {
        mostrarMenu(&banco);
        opcao = lerInteiro("Opção: ");

        switch (opcao) {
            case 1:
                destino = lerInteiro("Conta que recebe o depósito: ");
                valor   = lerValor("Valor: R$ ");
                solicitarOperacao(&banco, TIPO_DEPOSITO, SEM_CONTA, destino, valor);
                break;

            case 2:
                origem = lerInteiro("Conta do saque: ");
                valor  = lerValor("Valor: R$ ");
                solicitarOperacao(&banco, TIPO_SAQUE, origem, SEM_CONTA, valor);
                break;

            case 3:
                origem  = lerInteiro("Conta de origem: ");
                destino = lerInteiro("Conta de destino: ");
                valor   = lerValor("Valor: R$ ");
                solicitarOperacao(&banco, TIPO_TRANSFERENCIA, origem, destino, valor);
                break;

            case 4:
                origem = lerInteiro("Conta que paga: ");
                valor  = lerValor("Valor: R$ ");
                solicitarOperacao(&banco, TIPO_PAGAMENTO, origem, SEM_CONTA, valor);
                break;

            case 5:
                processarProximo(&banco);
                break;

            case 6:
                processarTodos(&banco);
                break;

            case 7:
                estornar(&banco);
                break;

            case 8:
                conta = lerInteiro("Conta que paga: ");
                valor = lerValor("Valor: R$ ");
                data  = lerData("Data do pagamento (DD/MM/AAAA): ");
                agendarPagamento(&banco, conta, valor, data);
                break;

            case 9:
                printf("  Agenda atual:\n");
                mostrarAgenda(&banco.agendados);
                cancelarAgendamento(&banco,
                                    lerInteiro("Número do pagamento a cancelar: "));
                break;

            case 10:
                data = lerData("Nova data (DD/MM/AAAA): ");
                avancarData(&banco, data);
                break;

            case 11:
                mostrarSituacao(&banco);
                break;

            case 12:
                conta = lerInteiro("Conta (0 = todas): ");
                printf("\n  HISTÓRICO\n");
                mostrarHistorico(&banco.historico, conta);
                break;

            case 0:
                printf("Até logo!\n");
                break;

            default:
                printf("  Opção inválida.\n");
        }
    } while (opcao != 0);

    encerrarSistema(&banco);   /* devolve a memória do histórico (free) */
    return 0;
}
