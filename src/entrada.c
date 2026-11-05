/*
 * entrada.c
 * ---------
 * Leitura do teclado (ver entrada.h).
 *
 * Por que não usar só scanf("%d", ...)? Se a pessoa digita "abc", o scanf
 * falha e deixa "abc" parado na entrada, e o programa entra em laço.
 * Aqui lemos a LINHA inteira com fgets e depois interpretamos com sscanf
 * (o mesmo que scanf, mas lendo de um texto em vez do teclado).
 */

/* Pede ao compilador as funções isatty/fileno também no Linux. */
#define _POSIX_C_SOURCE 200809L

#include <stdio.h>
#include <string.h>
#include "entrada.h"

/* Partes específicas de cada sistema operacional. "#ifdef _WIN32" faz o
 * compilador usar o primeiro bloco só no Windows. */
#ifdef _WIN32
#include <windows.h>
#include <io.h>
#define isatty _isatty
#define fileno _fileno
#else
#include <unistd.h>
#endif

#define TAM_LINHA 100

void configurarConsole(void)
{
#ifdef _WIN32
    SetConsoleOutputCP(65001);   /* 65001 = UTF-8, a codificação dos acentos */
#endif
}

/* Lê uma linha. Devolve 1 se leu, 0 se a entrada acabou (fim do arquivo). */
int lerLinha(char linha[], int tamanho)
{
    if (fgets(linha, tamanho, stdin) == NULL) {
        return 0;
    }
    linha[strcspn(linha, "\r\n")] = '\0';   /* corta o ENTER do final */

    /* Na demonstração automática (banco.exe < demo\entrada.txt) a
     * entrada vem de um arquivo e não aparece na tela; então a mostramos. */
    if (!isatty(fileno(stdin))) {
        printf("%s\n", linha);
    }
    return 1;
}

int lerInteiro(const char *pergunta)
{
    char linha[TAM_LINHA];
    int numero;
    char sobra;

    while (1) {
        printf("%s", pergunta);
        if (!lerLinha(linha, TAM_LINHA)) {
            return 0;
        }
        /* sscanf devolve quantos itens conseguiu ler. Esperamos exatamente
         * 1: o número. Se ler também "sobra", havia lixo depois dele. */
        if (sscanf(linha, "%d %c", &numero, &sobra) == 1) {
            return numero;
        }
        printf("  Digite um número inteiro.\n");
    }
}

double lerValor(const char *pergunta)
{
    char linha[TAM_LINHA];
    double valor;
    char sobra;
    char *virgula;

    while (1) {
        printf("%s", pergunta);
        if (!lerLinha(linha, TAM_LINHA)) {
            return 0;
        }
        virgula = strchr(linha, ',');   /* procura uma vírgula no texto */
        if (virgula != NULL) {
            *virgula = '.';             /* 150,50 -> 150.50 */
        }
        if (sscanf(linha, "%lf %c", &valor, &sobra) == 1) {
            return valor;
        }
        printf("  Digite um valor, por exemplo 150,50.\n");
    }
}

/* Confere se dia/mês/ano formam uma data que existe. */
int dataExiste(int dia, int mes, int ano)
{
    int diasNoMes[] = {31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31};

    if (ano < 1900 || ano > 2999 || mes < 1 || mes > 12 || dia < 1) {
        return 0;
    }
    /* Ano bissexto: divisível por 4, exceto os de século que não são por 400. */
    if (mes == 2 && ((ano % 4 == 0 && ano % 100 != 0) || ano % 400 == 0)) {
        return dia <= 29;
    }
    return dia <= diasNoMes[mes - 1];
}

int lerData(const char *pergunta)
{
    char linha[TAM_LINHA];
    int dia, mes, ano;
    char sobra;

    while (1) {
        printf("%s", pergunta);
        if (!lerLinha(linha, TAM_LINHA)) {
            return 0;
        }
        if (sscanf(linha, "%d/%d/%d %c", &dia, &mes, &ano, &sobra) == 3 &&
            dataExiste(dia, mes, ano)) {
            return ano * 10000 + mes * 100 + dia;   /* vira AAAAMMDD */
        }
        printf("  Data inválida. Use DD/MM/AAAA, por exemplo 10/11/2026.\n");
    }
}
