/* Entrada por caracteres e índices: sem variáveis de endereço nem scanf. */
#define _POSIX_C_SOURCE 200809L
#include <stdio.h>
#include <stdlib.h>
#include <ctype.h>
#include <limits.h>
#include "entrada.h"
#ifdef _WIN32
#include <windows.h>
#include <io.h>
#define isatty _isatty
#define fileno _fileno
#else
#include <unistd.h>
#endif

#define TAM_LINHA 100
static char linha[TAM_LINHA];
static int posicao, leituraValida;

void configurarConsole(void)
{
#ifdef _WIN32
    SetConsoleOutputCP(65001);
#endif
}

/* Consome a linha inteira, mesmo se ela exceder o espaço disponível. */
static int lerLinha(void)
{
    int c, tamanho = 0, longa = 0;
    while ((c = getchar()) != EOF && c != '\n') {
        if (c == '\r') continue;
        if (tamanho < TAM_LINHA - 1) linha[tamanho++] = (char)c;
        else longa = 1;
    }
    linha[tamanho] = '\0';
    if (c == EOF && tamanho == 0 && !longa) return 0;
    if (!isatty(fileno(stdin))) printf("%s\n", linha);
    posicao = 0;
    leituraValida = !longa;
    return 1;
}

static void pularEspacos(void)
{
    while (isspace((unsigned char)linha[posicao])) posicao++;
}

/* Lê um inteiro do texto global e avança o índice até o próximo caractere. */
static int numeroInteiro(void)
{
    long long numero = 0, limite;
    int sinal = 1, digitos = 0;
    pularEspacos();
    if (linha[posicao] == '-' || linha[posicao] == '+') {
        if (linha[posicao] == '-') sinal = -1;
        posicao++;
    }
    limite = sinal < 0 ? -(long long)INT_MIN : INT_MAX;
    while (isdigit((unsigned char)linha[posicao])) {
        int digito = linha[posicao++] - '0';
        if (numero > (limite - digito) / 10) leituraValida = 0;
        else numero = numero * 10 + digito;
        digitos++;
    }
    if (!digitos) leituraValida = 0;
    return leituraValida ? (int)(sinal * numero) : 0;
}

int lerInteiro(void)
{
    int numero;
    while (lerLinha()) {
        numero = numeroInteiro();
        pularEspacos();
        if (leituraValida && linha[posicao] == '\0') return numero;
        printf("  Digite um número inteiro. Tente novamente: ");
    }
    return 0;
}

double lerValor(void)
{
    int digitos, expoente, i;
    while (lerLinha()) {
        for (i = 0; linha[i]; i++) if (linha[i] == ',') linha[i] = '.';
        pularEspacos();
        if (linha[posicao] == '+' || linha[posicao] == '-') posicao++;
        digitos = 0;
        while (isdigit((unsigned char)linha[posicao])) { posicao++; digitos++; }
        if (linha[posicao] == '.') {
            posicao++;
            while (isdigit((unsigned char)linha[posicao])) { posicao++; digitos++; }
        }
        if (!digitos) leituraValida = 0;
        if (linha[posicao] == 'e' || linha[posicao] == 'E') {
            posicao++;
            if (linha[posicao] == '+' || linha[posicao] == '-') posicao++;
            expoente = 0;
            while (isdigit((unsigned char)linha[posicao])) { posicao++; expoente++; }
            if (!expoente) leituraValida = 0;
        }
        pularEspacos();
        if (leituraValida && linha[posicao] == '\0') return atof(linha);
        printf("  Digite um valor, por exemplo 150,50. Tente novamente: ");
    }
    return 0;
}

int dataExiste(int dia, int mes, int ano)
{
    int diasNoMes[] = {31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31};
    if (ano < 1900 || ano > 2999 || mes < 1 || mes > 12 || dia < 1) return 0;
    if (mes == 2 && ((ano % 4 == 0 && ano % 100 != 0) || ano % 400 == 0)) return dia <= 29;
    return dia <= diasNoMes[mes - 1];
}

int lerData(void)
{
    int dia, mes, ano;
    while (lerLinha()) {
        dia = numeroInteiro();
        if (linha[posicao] != '/') leituraValida = 0;
        else posicao++;
        mes = numeroInteiro();
        if (linha[posicao] != '/') leituraValida = 0;
        else posicao++;
        ano = numeroInteiro();
        pularEspacos();
        if (leituraValida && linha[posicao] == '\0' && dataExiste(dia, mes, ano)) return ano * 10000 + mes * 100 + dia;
        printf("  Data inválida. Use DD/MM/AAAA. Tente novamente: ");
    }
    return 0;
}
