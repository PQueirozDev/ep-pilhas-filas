/*
 * teste_agendados.c
 * -----------------
 * Teste da agenda ordenada com qsort:
 *   - ordem por data
 *   - CASO EXTREMO: datas iguais -> desempate pelo número de entrada (FIFO)
 *   - cancelar antes de executar
 *   - só executa o que venceu
 */

#include "operacao.h"
#include "agendados.h"
#include "entrada.h"
#include "verificar.h"

/* Cria um pagamento agendado com número, conta, valor e data. */
Operacao pagamento(int numero, double valor, int data)
{
    Operacao op = criarOperacao(numero, TIPO_PAGAMENTO, 1, SEM_CONTA, valor);
    op.data = data;
    return op;
}

int main(void)
{
    Agenda a;
    Operacao saida;
    int i, ordemCerta;
    /* ordem esperada depois da ordenação: veja o comentário abaixo */
    int esperado[] = {2, 4, 1, 3, 6, 5};

    configurarConsole();
    iniciarAgenda(&a);

    printf("== 1. Agendando fora de ordem, com datas repetidas ==\n");
    agendar(&a, pagamento(1, 10.00, 20261110));
    agendar(&a, pagamento(2, 20.00, 20261108));
    agendar(&a, pagamento(3, 30.00, 20261110));   /* mesma data do #1 */
    agendar(&a, pagamento(4, 40.00, 20261108));   /* mesma data do #2 */
    agendar(&a, pagamento(5, 50.00, 20261120));
    agendar(&a, pagamento(6, 60.00, 20261110));   /* mesma data do #1 e #3 */
    mostrarAgenda(&a);

    /* Esperado: 08/11 -> #2, #4 ; 10/11 -> #1, #3, #6 ; 20/11 -> #5 */
    ordemCerta = 1;
    for (i = 0; i < 6; i++) {
        if (a.itens[i].numero != esperado[i]) {
            ordemCerta = 0;
        }
    }
    verificar(ordemCerta, "ordem 2,4,1,3,6,5: por data e, no empate, por chegada");

    printf("\n== 2. Comparação direta (datas iguais) ==\n");
    saida = pagamento(7, 1.00, 20261110);
    {
        Operacao outro = pagamento(8, 1.00, 20261110);
        verificar(compararAgendados(&saida, &outro) < 0, "mesma data: #7 vem antes do #8");
        verificar(compararAgendados(&outro, &saida) > 0, "mesma data: #8 vem depois do #7");
    }

    printf("\n== 3. Cancelar ==\n");
    verificar(cancelarAgendado(&a, 3, &saida) == 1 && saida.numero == 3,
              "cancelar o #3 funciona");
    verificar(cancelarAgendado(&a, 3, &saida) == 0, "cancelar o #3 de novo: não existe mais");
    verificar(cancelarAgendado(&a, 99, &saida) == 0, "cancelar número inexistente devolve 0");
    verificar(a.quantidade == 5, "restam 5 agendados");

    printf("\n== 4. Executar até 10/11/2026 ==\n");
    ordemCerta = 1;
    i = 0;
    {
        int esperadoAte10[] = {2, 4, 1, 6};
        while (retirarVencido(&a, 20261110, &saida)) {
            printf("   executa ");
            imprimirOperacao(saida);
            if (i >= 4 || saida.numero != esperadoAte10[i]) {
                ordemCerta = 0;
            }
            i++;
        }
        verificar(ordemCerta && i == 4, "executou #2, #4, #1, #6 nessa ordem");
    }
    verificar(a.quantidade == 1 && a.itens[0].numero == 5,
              "o #5 (20/11) continua esperando");
    verificar(retirarVencido(&a, 20261110, &saida) == 0, "nada mais vencido em 10/11");

    return resumoDosTestes();
}
