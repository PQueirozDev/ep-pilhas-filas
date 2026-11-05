/*
 * operacao.h
 * ----------
 * Define o "molde" de uma operação bancária.
 *
 * CONCEITO NOVO: struct
 *   Uma struct junta várias variáveis relacionadas debaixo de um único nome.
 *   Em vez de ter 6 variáveis soltas (numero, tipo, contas, valor, data), temos
 *   UMA variável do tipo Operacao que carrega tudo junto, como uma ficha de
 *   papel com vários campos preenchidos. Acessamos cada campo com o ponto:
 *       op.valor = 100.0;
 *
 * CONCEITO NOVO: typedef
 *   "typedef struct { ... } Operacao;" dá o nome Operacao ao tipo, para
 *   podermos declarar variáveis simplesmente com:  Operacao op;
 */

#ifndef OPERACAO_H   /* estas 3 linhas (#ifndef/#define/#endif) evitam que este */
#define OPERACAO_H   /* .h seja lido duas vezes dentro do mesmo arquivo .c      */

/* Códigos dos tipos de operação. #define cria uma constante com nome,
 * assim escrevemos TIPO_SAQUE em vez de um número "mágico" como 2. */
#define TIPO_DEPOSITO        1
#define TIPO_SAQUE           2
#define TIPO_TRANSFERENCIA   3
#define TIPO_PAGAMENTO       4

/* Valor usado em contaOrigem/contaDestino quando o campo não se aplica
 * (ex.: depósito não tem conta de origem). Nenhuma conta tem número 0. */
#define SEM_CONTA 0

/*
 * Como cada tipo usa as contas:
 *   DEPOSITO       origem = SEM_CONTA   destino = conta que recebe
 *   SAQUE          origem = conta       destino = SEM_CONTA
 *   TRANSFERENCIA  origem = conta       destino = outra conta
 *   PAGAMENTO      origem = conta       destino = SEM_CONTA (vai para fora do banco)
 * Regra única: dinheiro SAI da origem (se houver) e ENTRA no destino (se houver).
 */
typedef struct {
    int    numero;        /* número de entrada: 1, 2, 3... (ordem de chegada) */
    int    tipo;          /* um dos TIPO_... acima                             */
    int    contaOrigem;   /* de onde o dinheiro sai  (SEM_CONTA se não houver) */
    int    contaDestino;  /* para onde o dinheiro vai (SEM_CONTA se não houver)*/
    double valor;         /* quantia em reais                                  */
    int    data;          /* só para agendados: AAAAMMDD (ex.: 20261110).
                             Nas demais operações fica 0.                      */
} Operacao;

/* Monta uma Operacao já preenchida (atalho para não repetir 6 atribuições).
 * A data começa em 0; o agendamento a preenche depois. */
Operacao criarOperacao(int numero, int tipo, int contaOrigem,
                       int contaDestino, double valor);

/* Mostra uma operação em uma linha, de forma legível (termina com \n). */
void imprimirOperacao(Operacao op);

/* Mostra uma data AAAAMMDD no formato DD/MM/AAAA (sem pular linha). */
void imprimirData(int data);

#endif
