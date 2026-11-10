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

void mostrarMenu(void)
{
    printf("\n========== BANCO EP  |  hoje: ");
    imprimirData(banco.hoje);
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
    int opcao, origem, destino, conta, data;
    double valor;

    configurarConsole();
    iniciarSistema(DATA_INICIAL);

    printf("Bem-vindo ao Banco EP. Contas de demonstração:\n");
    mostrarContas();

    do {
        mostrarMenu();
        printf("Opção: ");
        opcao = lerInteiro();

        switch (opcao) {
            case 1:
                printf("Conta que recebe o depósito: ");
                destino = lerInteiro();
                printf("Valor: R$ ");
                valor = lerValor();
                solicitarOperacao(TIPO_DEPOSITO, SEM_CONTA, destino, valor);
                break;

            case 2:
                printf("Conta do saque: ");
                origem = lerInteiro();
                printf("Valor: R$ ");
                valor = lerValor();
                solicitarOperacao(TIPO_SAQUE, origem, SEM_CONTA, valor);
                break;

            case 3:
                printf("Conta de origem: ");
                origem = lerInteiro();
                printf("Conta de destino: ");
                destino = lerInteiro();
                printf("Valor: R$ ");
                valor = lerValor();
                solicitarOperacao(TIPO_TRANSFERENCIA, origem, destino, valor);
                break;

            case 4:
                printf("Conta que paga: ");
                origem = lerInteiro();
                printf("Valor: R$ ");
                valor = lerValor();
                solicitarOperacao(TIPO_PAGAMENTO, origem, SEM_CONTA, valor);
                break;

            case 5:
                processarProximo();
                break;

            case 6:
                processarTodos();
                break;

            case 7:
                estornar();
                break;

            case 8:
                printf("Conta que paga: ");
                conta = lerInteiro();
                printf("Valor: R$ ");
                valor = lerValor();
                printf("Data do pagamento (DD/MM/AAAA): ");
                data = lerData();
                agendarPagamento(conta, valor, data);
                break;

            case 9:
                printf("  Agenda atual:\n");
                mostrarAgenda();
                printf("Número do pagamento a cancelar: ");
                cancelarAgendamento(lerInteiro());
                break;

            case 10:
                printf("Nova data (DD/MM/AAAA): ");
                data = lerData();
                avancarData(data);
                break;

            case 11:
                mostrarSituacao();
                break;

            case 12:
                printf("Conta (0 = todas): ");
                conta = lerInteiro();
                printf("\n  HISTÓRICO\n");
                mostrarHistorico(conta);
                break;

            case 0:
                printf("Até logo!\n");
                break;

            default:
                printf("  Opção inválida.\n");
        }
    } while (opcao != 0);

    encerrarSistema();   /* zera o contador do histórico */
    return 0;
}
