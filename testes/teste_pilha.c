/*
 * teste_pilha.c
 * -------------
 * Teste da pilha de efetivadas, incluindo os casos extremos:
 *   - estornar com a pilha vazia ("nada a estornar")
 *   - ordem LIFO (a última efetivada sai primeiro), conferida número a número
 *   - pilha cheia
 */

#include "operacao.h"
#include "sistema.h"
#include "entrada.h"
#include "verificar.h"

/* Simula o que o menu faz no estorno: tenta desempilhar e avisa.
 * Devolve o número da operação desfeita, ou 0 se não havia nada. */
int tentarEstornar(void)
{
    Operacao desfeita;

    if ((desfeita = desempilhar()).numero != 0) {
        printf("  Estornando: ");
        imprimirOperacao(desfeita);
        return desfeita.numero;
    }
    printf("  Nada a estornar.\n");
    return 0;
}

int main(void)
{
    Operacao saida;
    int i;

    configurarConsole();

    printf("== 1. Pilha recém-criada ==\n");
    iniciarPilha();
    verificar(pilhaVazia(), "pilha começa vazia");
    verificar(tentarEstornar() == 0, "estorno sem nada efetivado: nada a estornar");

    printf("\n== 2. Efetivando 3 operações ==\n");
    empilhar(criarOperacao(1, TIPO_DEPOSITO, SEM_CONTA, 1, 100.00));
    empilhar(criarOperacao(2, TIPO_SAQUE, 1, SEM_CONTA, 30.00));
    empilhar(criarOperacao(3, TIPO_TRANSFERENCIA, 1, 2, 50.00));
    mostrarPilha();
    verificar(!pilhaVazia(), "pilha não está mais vazia");

    printf("\n== 3. Estornando até esvaziar (e mais uma vez) ==\n");
    verificar(tentarEstornar() == 3, "1º estorno desfaz a #3 (a última)");
    verificar(tentarEstornar() == 2, "2º estorno desfaz a #2");
    verificar(tentarEstornar() == 1, "3º estorno desfaz a #1");
    verificar(tentarEstornar() == 0, "4º estorno: nada a estornar");
    verificar(pilhaVazia(), "pilha vazia de novo");

    printf("\n== 4. Pilha cheia ==\n");
    for (i = 1; i <= CAPACIDADE_PILHA; i++) {
        empilhar(criarOperacao(i, TIPO_DEPOSITO, SEM_CONTA, 1, 1.00));
    }
    verificar(pilhaCheia(), "pilha cheia após 100 empilhamentos");
    verificar(empilhar(criarOperacao(101, TIPO_DEPOSITO, SEM_CONTA, 1, 1.00)) == 0,
              "empilhar na pilha cheia devolve 0");
    saida = desempilhar();
    verificar(saida.numero == 100, "topo da pilha cheia é a operação #100");

    return resumoDosTestes();
}
