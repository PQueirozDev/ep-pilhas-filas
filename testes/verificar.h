/*
 * verificar.h
 * -----------
 * Mini-ferramenta de teste usada por todos os arquivos de teste.
 * Cada verificação imprime [OK] ou [FALHOU]; no fim, o main mostra o total.
 *
 * Aqui as funções ficam no próprio .h para simplificar (cada teste é um
 * programa separado que inclui este arquivo uma única vez).
 */

#ifndef VERIFICAR_H
#define VERIFICAR_H

#include <stdio.h>

int falhas = 0;

void verificar(int condicao, const char *descricao)
{
    if (condicao) {
        printf("  [OK]     %s\n", descricao);
    } else {
        printf("  [FALHOU] %s\n", descricao);
        falhas++;
    }
}

/* Mostra o resumo e devolve o código de saída do programa (0 = sucesso). */
int resumoDosTestes(void)
{
    printf("\nResultado: %s (%d falha(s))\n",
           falhas == 0 ? "TODOS OS TESTES PASSARAM" : "HÁ FALHAS", falhas);
    return falhas == 0 ? 0 : 1;
}

#endif
