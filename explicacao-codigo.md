# Explicação do código inteiro

Guia para os três integrantes entenderem e defenderem **cada arquivo e cada função**. Leia na ordem: primeiro a visão geral, depois os conceitos de C, depois arquivo por arquivo, e por fim os três "passeios" que seguem uma operação do teclado até a memória.

> Dica: abra o arquivo citado ao lado deste guia e acompanhe linha a linha.

---

## 1. Visão geral

O programa é um banco de linha de comando. O cliente faz **pedidos**; eles não são executados na hora: entram numa **fila** e são processados na ordem de chegada. Toda operação que dá certo é guardada numa **pilha**, para poder ser desfeita (estorno) da mais recente para a mais antiga.

```
              teclado
                 │
             main.c  (menu, leitura)
                 │
            sistema.c  (caminho de cada operação)
     ┌──────┬────┴─────┬──────────┬─────────────┐
  fila.c  pilha.c  agendados.c  historico.c   banco.c (regras e saldos)
     └──────┴──────────┴──────────┴─────────────┘
                 │
             modelos.c  (tipos básicos: Conta, Pedido, Data)
```

**Regra de ouro da organização:** cada arquivo tem uma responsabilidade.

| Arquivo | Responsabilidade | Sabe de... |
|---|---|---|
| `modelos` | tipos básicos, datas, impressão, conversão de valor | nada além de si |
| `fila` | fila FIFO (estrutura pura) | `modelos` |
| `pilha` | pilha LIFO (estrutura pura) | `modelos` |
| `agendados` | lista ordenada por data (estrutura pura) | `modelos` |
| `historico` | lista de tudo que aconteceu (estrutura pura) | `modelos` |
| `banco` | contas e regras de negócio (saldo, transferência, reversão) | `modelos` |
| `sistema` | liga tudo: decide por qual estrutura cada operação passa | todos acima |
| `main` | menu, teclado e tela | `sistema` |
| `testes/testes.c` | testes automáticos | todos menos `main` |

As estruturas (fila, pilha, agendados, histórico) **não conhecem regras de banco**. A fila não sabe o que é saldo; ela só guarda e devolve pedidos em ordem. Isso deixa cada parte pequena e fácil de explicar.

---

## 2. Conceitos de C usados no projeto

### `.h` e `.c`
- O **`.h`** (cabeçalho) é o "cardápio": declara tipos e funções que outros arquivos podem usar.
- O **`.c`** é a "cozinha": tem o código das funções.
- `#include "fila.h"` dá acesso ao cardápio da fila.

### Proteção contra inclusão dupla
```c
#ifndef FILA_H
#define FILA_H
...
#endif
```
Se `fila.h` for incluído duas vezes (por caminhos diferentes), a segunda vez é ignorada. Sem isso, o compilador reclamaria de tipos definidos duas vezes.

### `struct` e `typedef`
`struct` junta vários dados em um só. `typedef` dá um nome curto:
```c
typedef struct { int numero; char titular[50]; long saldo; } Conta;
```
Depois basta escrever `Conta c;`.

### `enum`
Uma lista de nomes para números: `OP_SAQUE` vale 0, `OP_DEPOSITO` vale 1 etc. Deixa o código legível (`if (tipo == OP_SAQUE)` em vez de `if (tipo == 0)`).

### Ponteiros (`*`, `&`, `->`)
- `&x` = endereço de `x`.
- `Conta *c` = variável que guarda o endereço de uma conta.
- `c->saldo` = "o saldo da conta para onde `c` aponta" (o mesmo que `(*c).saldo`).
- Passamos ponteiros para as funções **alterarem** o original. `enfileirar(&f, p)` muda a fila `f` de verdade; sem o `&`, a função mexeria numa cópia.

### `const`
`const Fila *f` promete: "esta função só lê a fila, não altera". O compilador reclama se tentarmos alterar.

### `static` antes de uma função
`static Resultado debitar(...)` só pode ser chamada dentro do próprio arquivo. É uma função "interna", escondida dos outros arquivos.

### `malloc` e `free`
- `malloc(sizeof(NoPilha))` pede ao sistema memória para um nó novo. Pode devolver `NULL` se não houver memória, por isso sempre testamos.
- `free(no)` devolve a memória. Toda memória pedida com `malloc` precisa voltar com `free` (senão é **vazamento de memória**).

### `NULL`
Ponteiro que não aponta para nada. Usamos para dizer "fim da lista" ou "pilha vazia".

### Retornar 1/0 para "deu certo / não deu"
C não tem `true/false` sem biblioteca extra; usamos `int`: 1 = verdadeiro, 0 = falso. `if (!enfileirar(...))` lê-se "se não conseguiu enfileirar".

### `%` (resto da divisão)
`7 % 5 = 2`. Usamos para o índice da fila "dar a volta": `(99 + 1) % 100 = 0`.

---

## 3. `modelos.h` / `modelos.c` — tipos básicos

### Tipos
| Tipo | Campos | Para quê |
|---|---|---|
| `TipoOperacao` (enum) | `OP_SAQUE`, `OP_DEPOSITO`, `OP_TRANSFERENCIA`, `OP_PAGAMENTO` | qual operação o cliente pediu |
| `Situacao` (enum) | `PENDENTE`, `EFETIVADO`, `RECUSADO`, `CANCELADO`, `ESTORNADO` | em que pé está o pedido |
| `Data` | `dia`, `mes`, `ano` | data simulada |
| `Conta` | `numero`, `titular[50]`, `saldo` | conta do cliente |
| `Pedido` | `id`, `tipo`, `conta_origem`, `conta_destino`, `valor`, `agendado`, `data`, `situacao` | o que o cliente pediu |
| `OperacaoEfetivada` | `pedido`, `saldo_anterior_origem`, `saldo_anterior_destino` | o que a pilha guarda |

**Por que `saldo` e `valor` são `long` em centavos?** Números com vírgula (`float`, `double`) têm erro de arredondamento: `0.1 + 0.2` dá `0.30000000000000004`. Em banco isso é inaceitável. Guardando R$ 10,50 como `1050`, todas as contas são com inteiros e ficam exatas.

**Por que `id`?** É o número do pedido (#1, #2...). Mostra a ordem de chegada e permite cancelar um agendado pelo número.

### Funções
- **`criar_conta(numero, titular, saldo)`**: monta uma `Conta`. Usa `strncpy` com tamanho máximo e coloca `'\0'` no fim, para um nome grande não estourar o vetor de 50 caracteres.
- **`imprimir_valor(centavos)`**: mostra `1050` como `R$ 10,50`. `centavos / 100` dá os reais, `centavos % 100` dá os centavos; `%02ld` garante dois dígitos (`5` vira `05`).
- **`imprimir_conta`**, **`imprimir_pedido`**: mostram na tela. `imprimir_pedido` só mostra o destino se for transferência e só mostra a data se for agendado.
- **`nome_tipo`**, **`nome_situacao`**: transformam o enum em texto com `switch`.
- **`texto_para_centavos(texto, &centavos)`**: converte o que o usuário digitou. Passo a passo:
  1. pula espaços; aceita um `-` (o sinal é aceito para o **banco** recusar valor negativo com a mensagem certa);
  2. lê os dígitos dos reais, um por um (`reais = reais * 10 + dígito`), parando se ficar grande demais para caber em `long`;
  3. se vier `,` ou `.`, lê 1 ou 2 dígitos de centavos (`"5"` depois da vírgula vale 50 centavos);
  4. se sobrar qualquer outra coisa (`"12abc"`, `"1,234"`), devolve 0 (inválido).
- **Datas:**
  - `eh_bissexto(ano)`: divisível por 4, exceto séculos, a não ser que divisível por 400 (2000 foi, 1900 não).
  - `dias_no_mes(mes, ano)`: tabela com os dias de cada mês; fevereiro tem 29 no bissexto.
  - `data_valida(d)`: confere ano, mês (1 a 12) e dia (1 até o máximo do mês). Por isso 31/11 é recusada.
  - `data_comparar(a, b)`: transforma cada data no número `aaaammdd` (13/11/2026 vira `20261113`). Comparar datas vira comparar inteiros. Retorna negativo se `a` vem antes, 0 se igual, positivo se depois.
  - `data_somar_dias(d, dias)`: soma um dia por vez; quando passa do último dia do mês, vira o mês; quando passa de dezembro, vira o ano.
  - `imprimir_data`: mostra `dd/mm/aaaa`.

---

## 4. `fila.h` / `fila.c` — Fila FIFO em vetor circular

**FIFO** = *First In, First Out* = o primeiro a entrar é o primeiro a sair. Como fila de banco.

### A estrutura
```c
typedef struct {
    Pedido itens[100];   // CAPACIDADE_FILA
    int inicio;          // posição do próximo a sair
    int quantidade;      // quantos estão na fila
} Fila;
```

### Por que "circular"?
Num vetor comum, depois de tirar o primeiro sobraria um buraco no começo, e teríamos que mover todos os outros uma casa para trás (lento). No vetor circular **ninguém se move**: só o `inicio` anda. Quando um índice chega ao fim do vetor, ele volta para 0 graças ao `%`.

```
capacidade 5 (exemplo pequeno), inicio = 3, quantidade = 3

índice:   0     1     2     3     4
        [ #5 ][    ][    ][ #3 ][ #4 ]
                            ↑ inicio
ordem de saída: #3 (pos 3), #4 (pos 4), #5 (pos 0 — deu a volta)
próximo a entrar vai em (3 + 3) % 5 = 1
```

### Por que guardar `quantidade` e não `fim`?
Se guardássemos `inicio` e `fim`, a fila **vazia** e a fila **cheia** teriam `inicio == fim` e não daria para diferenciar. Com a quantidade, é simples: vazia é `quantidade == 0`, cheia é `quantidade == 100`. O fim é calculado quando precisa: `(inicio + quantidade) % 100`.

### Funções
- **`fila_iniciar`**: `inicio = 0`, `quantidade = 0`.
- **`fila_vazia`** / **`fila_cheia`**: comparam a quantidade com 0 e com 100.
- **`enfileirar(f, p)`**: se cheia, devolve 0 (pedido não entra). Senão calcula `fim = (inicio + quantidade) % 100`, grava o pedido lá e aumenta a quantidade. **Entra no fim.**
- **`desenfileirar(f, &saida)`**: se vazia, devolve 0. Senão copia `itens[inicio]` para `saida`, avança `inicio = (inicio + 1) % 100` e diminui a quantidade. **Sai do começo.**
- **`fila_imprimir`**: percorre `i` de 0 até `quantidade − 1`, na posição `(inicio + i) % 100`.

**Onde está o FIFO, em uma frase:** `enfileirar` escreve no fim e `desenfileirar` lê do início.

---

## 5. `pilha.h` / `pilha.c` — Pilha LIFO em lista encadeada

**LIFO** = *Last In, First Out* = o último a entrar é o primeiro a sair. Como pilha de pratos.

### A estrutura
```c
typedef struct NoPilha {
    OperacaoEfetivada op;
    struct NoPilha *abaixo;   // aponta para o nó de baixo
} NoPilha;

typedef struct {
    NoPilha *topo;            // NULL = pilha vazia
    int tamanho;
} Pilha;
```

```
topo
 │
 ▼
[#5 pagamento] → [#3 transferência] → [#1 depósito] → NULL
```

### Por que lista encadeada (e não vetor como a fila)?
Toda operação efetivada vai para a pilha. Com vetor de tamanho fixo, quando a pilha enchesse teríamos que **recusar operações válidas do cliente** só por falta de espaço para o estorno. A lista encadeada cresce um nó por vez, enquanto houver memória.

### Funções
- **`pilha_iniciar`**: `topo = NULL`, `tamanho = 0`.
- **`pilha_vazia`**: `topo == NULL`.
- **`empilhar(p, op)`**:
  1. `malloc` de um nó novo (se `NULL`, devolve 0);
  2. guarda a operação no nó;
  3. `novo->abaixo = p->topo` (o novo aponta para o antigo topo);
  4. `p->topo = novo` (o novo vira o topo).
- **`desempilhar(p, &saida)`**:
  1. se vazia, devolve 0;
  2. guarda o nó do topo em `removido` e copia a operação para `saida`;
  3. `p->topo = removido->abaixo` (o de baixo vira o topo);
  4. `free(removido)`.
  > A ordem importa: se fizéssemos `free` antes de ler `removido->abaixo`, leríamos memória já devolvida.
- **`topo(p)`**: devolve um ponteiro para a operação do topo **sem tirar** (ou `NULL`). O estorno usa isso para tentar desfazer antes de desempilhar.
- **`pilha_imprimir`**: anda de `topo` seguindo `abaixo` até `NULL`.
- **`pilha_liberar`**: desempilha tudo; cada `desempilhar` já faz o `free`.

**Onde está o LIFO, em uma frase:** `empilhar` e `desempilhar` só mexem no `topo`.

---

## 6. `agendados.h` / `agendados.c` — fila ordenada por data

Lista encadeada que está **sempre em ordem de data**. O primeiro da lista é o de data mais próxima.

```c
typedef struct NoAgendado { Pedido pedido; struct NoAgendado *proximo; } NoAgendado;
typedef struct { NoAgendado *inicio; int quantidade; } Agendados;
```

### `agendados_inserir` — inserção ordenada
Em vez de colocar no fim e ordenar depois (`qsort`), cada novo pedido já entra **no lugar certo**:

```c
while (atual != NULL && data_comparar(atual->pedido.data, p.data) <= 0) {
    anterior = atual;
    atual = atual->proximo;
}
```
Anda pela lista enquanto a data do nó for **menor ou igual** à nova. Para no primeiro nó com data **maior**, e o novo entra entre `anterior` e `atual`.

**O "ou igual" é o desempate FIFO:** com datas iguais, o novo passa por todos que já têm aquela data e fica depois deles. Quem agendou primeiro sai primeiro.

Exemplo (hoje 13/11): chegam #1 (20/11), #2 (15/11), #3 (20/11), #4 (15/11).
```
insere #1:  [#1 20/11]
insere #2:  [#2 15/11] → [#1 20/11]                    (15 < 20: entra na frente)
insere #3:  [#2 15/11] → [#1 20/11] → [#3 20/11]       (20 = 20: passa o #1)
insere #4:  [#2 15/11] → [#4 15/11] → [#1 20/11] → [#3 20/11]
```

Dois casos ao ligar o nó:
- `anterior == NULL`: o novo entrou na frente de todos, então vira o `inicio`;
- senão: `anterior->proximo = novo` e `novo->proximo = atual`.

### Outras funções
- **`agendados_retirar_vencido(a, hoje, &saida)`**: se o **primeiro** da lista tem data ≤ hoje, tira ele. Como a lista está em ordem, basta olhar o primeiro: se ele não venceu, nenhum outro venceu.
- **`agendados_cancelar(a, id, &removido)`**: procura o nó pelo `id` guardando o anterior; liga `anterior->proximo` ao `atual->proximo` (o nó some da corrente) e faz `free`.
- **`agendados_imprimir`**, **`agendados_liberar`**: percorrem a lista; liberar guarda o `proximo` **antes** do `free`.

---

## 7. `historico.h` / `historico.c` — tudo o que aconteceu

Lista encadeada com **inserção no fim**. Cada nó guarda: a data simulada, uma cópia do pedido naquele momento e um texto (`"efetivado"`, `"recusado: saldo insuficiente"`, `"estornado (operação desfeita)"`, `"agendado"`, `"agendamento cancelado"`).

```c
typedef struct { NoHistorico *inicio; NoHistorico *fim; int quantidade; } Historico;
```

**Por que guardar `fim`?** Para inserir no final sem percorrer a lista inteira toda vez.

- **`historico_registrar`**: cria o nó; se a lista está vazia, ele vira o `inicio`; senão, o antigo último (`fim->proximo`) passa a apontar para ele. Em todo caso, ele vira o novo `fim`.
- **`historico_imprimir`**: do `inicio` até `NULL`, na ordem em que aconteceu.

**Histórico × pilha:** o histórico guarda **tudo** (inclusive recusados e estornos) e nunca perde nada. A pilha guarda só o que **ainda pode ser estornado**.

O texto `descricao` não é copiado: ele aponta para textos fixos do programa (que existem enquanto o programa roda), então não precisa de `malloc` para ele.

---

## 8. `banco.h` / `banco.c` — contas e regras de negócio

### `Banco` e `Resultado`
```c
typedef struct { Conta contas[20]; int num_contas; } Banco;
```
`Resultado` é um enum que diz **se deu certo ou por que não deu**: `RES_OK`, `RES_SALDO_INSUFICIENTE`, `RES_CONTA_INEXISTENTE`, `RES_VALOR_INVALIDO`, `RES_MESMA_CONTA`, `RES_LIMITE_SALDO`, `RES_DATA_PASSADA`, `RES_FILA_CHEIA`, `RES_NADA_A_ESTORNAR`, `RES_SALDO_JA_USADO`... `mensagem_resultado` transforma cada um no texto mostrado ao usuário.

### Contas
- **`banco_iniciar`**, **`banco_adicionar_conta`** (recusa se já tem 20), **`banco_imprimir_contas`**.
- **`buscar_conta(b, numero)`**: busca linear (olha conta por conta). Devolve **ponteiro** para a conta (para quem chamou poder alterar o saldo de verdade) ou `NULL` se não existir.

### As operações básicas (internas, `static`)
- **`creditar(c, valor)`**: soma ao saldo. Recusa se o saldo passaria de `LONG_MAX` (o maior número que cabe num `long`; no Windows, cerca de R$ 21 milhões). Sem isso, a soma "estouraria" e o saldo viraria um número negativo absurdo.
  > A conta `c->saldo > LONG_MAX - valor` é o jeito seguro de testar `saldo + valor > LONG_MAX` sem fazer a soma que estouraria.
- **`debitar(c, valor)`**: se o saldo é menor que o valor, recusa **sem alterar nada**; senão subtrai.
- **`transferir(origem, destino, valor)`** — **tudo ou nada**:
  1. debita a origem; se falhar, retorna (nada mudou);
  2. credita o destino; se falhar, **devolve o valor à origem** (desfaz o passo 1) e retorna o erro.
  Resultado: ou as duas contas mudam, ou nenhuma muda.

### `validar_pedido(b, p)` — regras que não dependem do saldo
Na ordem: valor > 0; conta de origem existe; se for transferência, destino diferente da origem e destino existe. Essas regras são conferidas **quando o pedido entra** (não faz sentido um pedido com valor zero esperar na fila).

### `processar_pedido(b, p, &registro)` — executa um pedido
1. chama `validar_pedido`;
2. busca as contas e **guarda os saldos de antes** (para a pilha);
3. `switch` pelo tipo: depósito → `creditar`; saque e pagamento → `debitar`; transferência → `transferir`;
4. marca `p->situacao` como `EFETIVADO` ou `RECUSADO`;
5. se deu certo, preenche o `registro` (pedido + saldos anteriores) que vai para a pilha.

**Por que o saldo só é conferido aqui, no processamento?** Porque depende de quem está na frente na fila. Um saque pode ser válido ou não dependendo de um depósito que chegou antes.

### `reverter_operacao(b, op)` — usado pelo estorno
Faz a operação **contrária**:
| Operação original | Reversão | Pode falhar? |
|---|---|---|
| depósito | tira o valor da conta | sim, se o dinheiro já saiu (`RES_SALDO_JA_USADO`) |
| saque / pagamento | devolve o valor | só no limite do `long` |
| transferência | tira do destino e devolve à origem | sim, se o destino já gastou |

Se falhar, **nenhum saldo muda** (as verificações vêm antes das alterações).

> **Pergunta provável:** "esse caso do depósito já usado acontece?" Pelo menu, não: o estorno sempre desfaz a operação **mais recente**, então nada depois dela mexeu naquele saldo. A regra existe como proteção (decisão da equipe) e foi testada alterando o saldo direto no teste.

---

## 9. `sistema.h` / `sistema.c` — o caminho de cada operação

```c
typedef struct {
    Banco banco;
    Fila fila;              // pedidos imediatos (FIFO)
    Agendados agendados;    // pagamentos com data futura
    Pilha pilha;            // operações efetivadas (LIFO)
    Historico historico;    // tudo, em ordem
    Data hoje;              // data simulada
    int proximo_id;         // próximo número de pedido
} Sistema;
```

| Função | O que faz | Estruturas usadas |
|---|---|---|
| `sistema_iniciar` / `sistema_liberar` | inicia tudo / libera toda a memória ao sair | todas |
| `registrar` (interna) | grava no histórico com a data de hoje | histórico |
| `sistema_solicitar` | cria o pedido com o próximo `id`, valida e **enfileira**; se recusado, registra no histórico | fila, histórico |
| `sistema_agendar` | valida (valor, conta, data válida, **data depois de hoje**) e insere ordenado | agendados, histórico |
| `sistema_processar_proximo` | **desenfileira** o primeiro, executa; se efetivado, **empilha**; registra | fila, banco, pilha, histórico |
| `sistema_avancar_data` | soma dias a `hoje`; enquanto a fila não estiver cheia e houver agendado vencido, move-o para a fila | agendados, fila |
| `sistema_estornar` | olha o **topo**; tenta reverter; só se der certo, **desempilha** | pilha, banco, histórico |
| `sistema_cancelar_agendamento` | tira o agendado da lista pelo `id`; **não passa pela pilha** | agendados, histórico |

Detalhes importantes:
- **Pedido recusado nunca entra na pilha:** em `sistema_processar_proximo`, `empilhar` só é chamado se `r == RES_OK`.
- **Se faltar memória para empilhar**, a operação é desfeita (`reverter_operacao`) e marcada como recusada. Assim nunca existe uma operação efetivada que não possa ser estornada.
- **No estorno, primeiro tenta, depois desempilha.** Se a reversão for recusada, a operação continua no topo.
- **Agendado que já entrou na fila não é cancelável:** tirar do meio da fila quebraria a ordem de chegada. Depois de efetivado, pode ser estornado.
- **Se a fila encher no avanço de data**, os agendados restantes continuam na lista e entram no próximo avanço.

---

## 10. `main.c` — menu, teclado e tela

`main.c` não tem regra de negócio; ele só lê, chama o `sistema` e mostra o resultado.

### Leitura segura
Ler com `scanf("%d")` direto quebra fácil (se o usuário digita uma letra, o programa entra em laço). Por isso:
- **`ler_linha`**: lê a linha inteira com `fgets`; tira o `\n` e o `\r`. Se a linha for maior que o buffer (128), descarta o resto e devolve linha vazia, que toda leitura rejeita. Retorna 0 se a entrada acabou (fim do arquivo).
- **`ler_inteiro`**: usa `strtol` e só aceita se havia um número e nada além de espaços depois. Repete a pergunta até receber algo válido.
  > Detalhe: verifica se achou um número **antes** de pular os espaços finais. Antes dessa correção, uma linha só com espaços era aceita como 0, e no menu isso fechava o programa.
- **`ler_valor`**: usa `texto_para_centavos`.
- **`ler_data`**: `sscanf(linha, "%2d/%2d/%4d%n", ...)`. Os números `2` e `4` limitam os dígitos (um número enorme estouraria o `int`); `%n` diz quantos caracteres foram lidos, para recusar lixo no fim (`10/11/2026x`).
- **`ecoar_entrada`**: se a entrada vem de um arquivo (`banco.exe < demo\demo.txt`), o programa repete na tela o que leu, senão a saída ficaria sem as respostas "digitadas".

### Ações
Cada opção do menu tem uma função `acao_...` que lê os dados, chama a função do `sistema` e imprime. As que leem do teclado retornam 0 se a entrada acabou, e o `main` encerra.

> **Bug real que achamos aqui:** `mostrar_resultado_entrada(sistema_solicitar(..., &id), id);` mostrou `Pedido #-636777471`. Em C, **a ordem em que os argumentos são avaliados não é garantida**: o `id` foi lido antes de `sistema_solicitar` preenchê-lo. A correção foi separar em duas linhas.

### `main`
1. `SetConsoleOutputCP(CP_UTF8)` no Windows, para os acentos aparecerem;
2. cria o `Sistema` com data 13/11/2026 e as três contas;
3. laço: mostra o menu, lê a opção, `switch` chama a ação;
4. ao sair, `sistema_liberar` devolve toda a memória.

---

## 11. Três passeios completos

### Passeio 1 — um saque que dá certo
Ana (conta 1) tem R$ 1000,00. Usuário escolhe **3 (Saque)**, conta `1`, valor `300`.

1. `main` → `acao_pedido_simples(s, OP_SAQUE)`.
2. `ler_inteiro` lê `1`; `ler_valor` → `texto_para_centavos("300")` → `30000`.
3. `sistema_solicitar` cria o Pedido `#1 {tipo SAQUE, origem 1, valor 30000, PENDENTE}`.
4. `validar_pedido`: valor > 0 ✓, conta 1 existe ✓ → `RES_OK`.
5. `enfileirar`: `fim = (0 + 0) % 100 = 0`; `itens[0] = #1`; `quantidade = 1`.
6. Tela: "Pedido #1 entrou no fim da fila." **Saldo ainda é R$ 1000,00.**
7. Usuário escolhe **7 (Processar)** → `sistema_processar_proximo`.
8. `desenfileirar`: pega `itens[0]`; `inicio = 1`; `quantidade = 0`.
9. `processar_pedido`: guarda saldo anterior `100000`; `debitar(ana, 30000)`: `100000 ≥ 30000` → saldo `70000`; situação `EFETIVADO`; `registro = {#1, saldo_anterior_origem = 100000}`.
10. `empilhar(registro)`: novo nó vira o topo.
11. `registrar` no histórico: `[13/11/2026] #1 Saque | conta 1 | R$ 300,00 -> efetivado`.

### Passeio 2 — estorno
Continuando: usuário escolhe **9 (Estornar)**.

1. `sistema_estornar` → `topo()` devolve a operação #1.
2. `reverter_operacao`: é saque, então `creditar(ana, 30000)` → saldo `100000`.
3. Deu certo → `desempilhar` (o nó é liberado com `free`); situação vira `ESTORNADO`.
4. Histórico: `#1 Saque ... -> estornado (operação desfeita)`.
5. Tela: "Conta 1 voltou para R$ 1000,00" (o `saldo_anterior_origem` guardado).
6. Se escolher **9** de novo: `topo()` devolve `NULL` → "nada a estornar"; nada muda.

### Passeio 3 — pagamento agendado
Hoje 13/11/2026. Usuário escolhe **6**, conta `2`, valor `30`, data `15/11/2026`.

1. `ler_data` → `{15, 11, 2026}`.
2. `sistema_agendar`: valida valor e conta; `data_valida` ✓; `data_comparar(15/11, 13/11) = 20261115 − 20261113 = 2 > 0` ✓ (é futura).
3. `agendados_inserir`: anda na lista enquanto as datas forem ≤ 15/11 e insere ali.
4. Histórico: `... -> agendado`. **Não entra na fila nem na pilha ainda.**
5. Usuário escolhe **8**, `2` dias → `hoje = 15/11/2026`.
6. `agendados_retirar_vencido`: primeiro da lista tem 15/11 ≤ 15/11 → sai → `enfileirar`.
7. A partir daqui é igual ao Passeio 1: **7** processa, efetivado vai para a pilha.

---

## 12. `testes/testes.c` — testes automáticos

A macro `CONFERIR(condição, descrição)` conta o teste, imprime `[ok]` ou `[FALHA]` e soma as falhas. O programa termina com `63 testes, 0 falhas` e devolve código 0 (ou 1 se algo falhou).

`do { ... } while (0)` em volta da macro é um truque padrão de C para a macro se comportar como um único comando (funciona certo dentro de `if` sem chaves).

Cada teste foi escrito com o **resultado previsto à mão antes de rodar** (está nos comentários e no `processo-ia.md`). Grupos:

| Grupo | O que prova |
|---|---|
| Conversão de valor | `"150,5"` vira 15050; `"abc"` e `"1,234"` são rejeitados |
| Datas | bissexto, virada de ano, 31/11 inválida |
| Etapa 2 | ordem FIFO; fila vazia; fila cheia; ordem certa depois de dar a volta no vetor |
| Etapa 3 | depósito, saque, pagamento; saldo insuficiente não altera; valor zero/negativo; conta inexistente |
| Etapa 4 | transferência certa; sem saldo; mesma conta; destino inexistente; **falha na segunda parte desfaz a primeira** |
| Etapa 5 | estornos em ordem LIFO; pilha vazia; recusado não entra; estorno de transferência; depósito já usado |
| Etapa 6 | ordem por data com empate FIFO; datas recusadas; avanço move só os vencidos; cancelamento |
| Etapa 7 | histórico na ordem certa, com recusados e estornos |

Para rodar: `compilar.bat` e depois `testes.exe`.

---

## 13. Perguntas de checagem (respondam sem olhar)

1. Em que arquivo e função o pedido entra no fim da fila? E sai do começo?
2. Por que a fila guarda `quantidade` e não `fim`?
3. Desenhe a fila de capacidade 5 com `inicio = 4` e `quantidade = 2`. Onde estão os dois pedidos? Onde entra o próximo?
4. O que acontece com os ponteiros em `empilhar`? E em `desempilhar`? Por que o `free` vem depois de ler `abaixo`?
5. Por que a pilha é lista encadeada e a fila é vetor?
6. Na inserção ordenada, o que muda se trocarmos `<= 0` por `< 0`?
7. Um saque recusado aparece no histórico? E na pilha?
8. Por que o saldo é conferido no processamento e não quando o pedido entra?
9. Como a transferência garante "tudo ou nada"? Mostre no código.
10. Por que centavos em `long` e não `float`?
11. O que é vazamento de memória e onde o programa libera a memória?
12. Por que um agendado que já entrou na fila não pode ser cancelado?

<details>
<summary>Respostas curtas</summary>

1. `fila.c`: `enfileirar` (grava em `(inicio + quantidade) % 100`) e `desenfileirar` (lê `itens[inicio]`).
2. Com `inicio` e `fim`, vazia e cheia teriam `inicio == fim`.
3. Posições 4 e 0 (deu a volta); o próximo entra em `(4 + 2) % 5 = 1`.
4. Empilhar: novo aponta para o antigo topo e vira o topo. Desempilhar: topo passa a ser o de baixo e o nó é liberado; se liberasse antes, leria memória já devolvida.
5. Pilha cheia obrigaria a recusar operações válidas; a fila tem um limite natural de pedidos esperando.
6. O novo ficaria **antes** dos de mesma data: o empate viraria LIFO.
7. Histórico sim; pilha não.
8. Depende dos pedidos que estão na frente.
9. `transferir` em `banco.c`: se o crédito falhar, `origem->saldo += valor` desfaz o débito.
10. `float` tem erro de arredondamento; inteiro é exato.
11. Memória pedida com `malloc` e nunca devolvida com `free`. `sistema_liberar` chama `pilha_liberar`, `agendados_liberar` e `historico_liberar`.
12. Tirar do meio da fila quebraria a ordem de chegada; depois de efetivado, ele pode ser estornado.
</details>
