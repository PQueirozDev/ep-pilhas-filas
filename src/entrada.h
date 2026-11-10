/* Leituras retornam valores. O menu imprime a pergunta antes de chamar. */
#ifndef ENTRADA_H
#define ENTRADA_H
void configurarConsole(void);
int lerInteiro(void);
double lerValor(void);
int lerData(void);
int dataExiste(int dia, int mes, int ano);
#endif
