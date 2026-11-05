/*
 * entrada.h
 * ---------
 * Leitura segura do teclado. Se a pessoa digitar algo inválido
 * (ex.: letras onde se espera número), a pergunta é repetida.
 *
 * "const char *pergunta" é um texto passado para a função, só para leitura.
 */

#ifndef ENTRADA_H
#define ENTRADA_H

/* Faz o terminal do Windows mostrar acentos corretamente. */
void   configurarConsole(void);

/* Lê um número inteiro. Devolve 0 se a entrada acabou. */
int    lerInteiro(const char *pergunta);

/* Lê um valor em reais (aceita "150", "150.50" ou "150,50").
 * Devolve 0 se a entrada acabou. */
double lerValor(const char *pergunta);

/* Lê uma data DD/MM/AAAA e devolve AAAAMMDD. Devolve 0 se a entrada acabou. */
int    lerData(const char *pergunta);

#endif
