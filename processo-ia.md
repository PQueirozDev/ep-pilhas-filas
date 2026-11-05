# Diário do processo com IA

Projeto: EP de Algoritmos (Senac): pilhas e filas aplicadas a transações bancárias.
Formato de cada entrada: data · pedido · solução proposta · alteração · motivo · resultado.

---

## Iteração 1 · 2026-11-05 · Recomeço, decisões e pilha de efetivadas

**Pedido:** descartar a versão anterior da pasta e recomeçar do zero, com código para
iniciantes (sem conhecimento prévio de struct/ponteiro), em incrementos pequenos. Manter o
mesmo repositório GitHub (`PQueirozDev/ep-pilhas-filas`) e o mesmo domínio Vercel (para os
slides, mais tarde). Primeiro incremento: struct da operação + pilha de efetivadas + teste.
Usar o Codex como assistente de revisão.

**Decisões registradas (não serão reabertas sem consultar a equipe):**
- Fila (FIFO) para pedidos imediatos: depósito, saque, transferência, pagamento imediato.
  Motivo: quem pediu primeiro é atendido primeiro.
- Pilha (LIFO) de operações **efetivadas**, usada no estorno: estornar desfaz a última
  efetivada (topo). Pilha vazia → "nada a estornar".
- Pagamentos agendados não entram na pilha; só podem ser cancelados antes de executar.
- Agendados ordenados por data com `qsort()`. Como `qsort` não é estável, o número de
  entrada é o critério de desempate para datas iguais (mantém a ordem FIFO).
- Histórico em lista encadeada.
- Slides ficam para depois (site só de apresentação).

**Solução proposta:**
- `src/operacao.h/.c`: struct `Operacao` (número de entrada, tipo, conta de origem, conta de
  destino, valor) + `criarOperacao` e `imprimirOperacao`.
- `src/pilha.h/.c`: pilha em vetor de tamanho fixo (100) com contador `quantidade`.
  Funções: `iniciarPilha`, `pilhaVazia`, `pilhaCheia`, `empilhar`, `desempilhar`, `mostrarPilha`.
  `empilhar`/`desempilhar` devolvem 1 (sucesso) ou 0 (cheia/vazia); quem chama decide a
  mensagem.
- `testes/teste_pilha.c`: pilha vazia, estorno sem nada efetivado, ordem LIFO conferida
  número a número, pilha cheia.

**Alteração:** versão antiga marcada com a tag git `versao-antiga` e removida da pasta;
criadas as pastas `src/` e `testes/` e os arquivos acima.

**Motivo das escolhas:**
- Vetor em vez de lista encadeada na pilha: é mais simples para o primeiro contato e
  ainda não exige `malloc`. A lista encadeada (com `malloc`/`free`) aparece no histórico.
- Ponteiro (`Pilha *p`) introduzido aqui porque é indispensável: sem ele a função alteraria
  só uma cópia da pilha.
- Constantes com `#define` em vez de `enum`, para não acrescentar outro conceito agora.

**Revisão do Codex:** 3 apontamentos, todos confirmados e corrigidos:
1. Comentário sobre `typedef` dava a entender que existia `struct Operacao` (a struct é
   anônima) → comentário reescrito.
2. Comentário do `#ifndef` dizia "na mesma compilação" → corrigido para "no mesmo .c".
3. O teste só exibia a ordem LIFO, não a conferia → `tentarEstornar` passou a devolver o
   número da operação desfeita e o teste verifica 3, 2, 1 e depois 0.

**Resultado:** compila sem avisos (`gcc -Wall -Wextra -std=c99`); 11 verificações, todas OK.
Ficou aguardando a previsão da equipe sobre a saída do teste (ver iteração 2).

---

## Iteração 2 · 2026-11-05 · Mudança de fluxo: fazer tudo sem parar

**Pedido:** "eu quero que você faça tudo, não que fique me perguntando, apenas faça".

**Solução proposta:** abandonar as paradas por incremento e as perguntas de previsão. Implementar
os incrementos restantes em sequência, testando cada um, e registrar tudo aqui.

**Alteração:** nenhuma no código; muda o processo.

**Motivo:** pedido explícito da equipe para agilizar a entrega.

**Resultado:** iterações 3 a 7 feitas em sequência na mesma sessão.

---

## Iteração 3 · 2026-11-05 · Fila de pedidos imediatos (FIFO)

**Pedido:** fila para depósito, saque, transferência e pagamento imediato.

**Solução proposta:** `src/fila.h/.c`, fila em **vetor circular** (`inicio` + `quantidade`; o
fim é `(inicio + quantidade) % CAPACIDADE_FILA`). Funções: `iniciarFila`, `filaVazia`,
`filaCheia`, `enfileirar`, `desenfileirar`, `mostrarFila`. A struct `Operacao` ganhou o campo
`data` (AAAAMMDD, usado só nos agendados) e `imprimirData`.

**Motivo:** o vetor circular reaproveita as posições liberadas sem "empurrar" os itens. A
justificativa do FIFO no domínio é que a ordem de chegada decide quem fica sem saldo quando
dois pedidos disputam o mesmo dinheiro.

**Resultado:** `testes/teste_fila.c`, com 10 verificações: vazia, ordem 1-2-3, cheia, volta
completa no vetor com a ordem mantida. Todas OK.

---

## Iteração 4 · 2026-11-05 · Agenda com qsort e desempate

**Pedido:** pagamentos agendados ordenados por data com `qsort`, mantendo FIFO em datas iguais.

**Solução proposta:** `src/agendados.h/.c`. A função `compararAgendados` compara primeiro a data
e, no empate, o número de entrada. `agendar` acrescenta e reordena. `cancelarAgendado` remove
pelo número. `retirarVencido` tira o primeiro se a data já chegou.

**Motivo:** `qsort` não é estável. Sem o 2º critério, dois pagamentos do mesmo dia poderiam
inverter de lugar.

**Resultado:** `testes/teste_agendados.c`, com 10 verificações. A ordem 2,4,1,3,6,5 confere o
desempate em dois dias diferentes, e também cancelamento e execução só do que venceu. Todas OK.

---

## Iteração 5 · 2026-11-05 · Histórico em lista encadeada

**Pedido:** histórico em lista encadeada.

**Solução proposta:** `src/historico.h/.c`. Cada evento é um nó criado com `malloc`, com
ponteiros `inicio` e `fim` para inserir no final em tempo constante. O filtro por conta mostra
só os registros de um cliente. `liberarHistorico` faz o `free` nó a nó (guardando o próximo
antes). Os 7 tipos de situação vão de efetivada até agendado recusado.

**Motivo:** aqui aparecem pela primeira vez `malloc`/`free`/`NULL` e a struct
autorreferente (`struct No *proximo`). Os comentários explicam cada um.

**Resultado:** testado dentro do `teste_sistema` (19 registros, lista liberada ao encerrar).

---

## Iteração 6 · 2026-11-05 · Sistema, menu e entrada

**Pedido:** menu interativo com todas as operações e estorno.

**Solução proposta:**
- `src/sistema.h/.c`: struct `Sistema` com contas, fila, pilha, agenda, histórico, data simulada
  e próximo número. Uma regra única de movimentação, `aplicarOperacao`: sai da origem e entra no
  destino. O inverso é `desfazerOperacao`.
- Pedido imediato → validação → fila. Processar → se houver saldo, efetiva e **empilha**; se
  não houver, recusa. Estornar → **desempilha**. Se o dinheiro já foi usado (ex.: um agendado
  gastou o depósito), o estorno é recusado e a operação volta ao topo.
- Agendados não entram na pilha e só podem ser cancelados antes de executar. "Avançar a data"
  executa os vencidos em ordem.
- `src/entrada.h/.c`: leitura com `fgets` + `sscanf` (letras não travam o programa), valores
  com vírgula ou ponto, datas validadas (inclusive ano bissexto), acentos no terminal do
  Windows (`SetConsoleOutputCP`), eco da entrada quando ela vem de arquivo, saída limpa no fim
  da entrada.
- `src/main.c`: menu com 12 opções.
- `compilar.bat`, `testar.bat`, `Makefile`, `demo/entrada-demo.txt` e `demo/saida-demo.txt`.

**Problema encontrado:** neste ambiente, o `cmd` não procura executáveis na pasta atual, e
`testar.bat` falhava. **Correção:** chamar `.\teste_X.exe`.

**Resultado:** `testes/teste_sistema.c` cobre todos os casos extremos do enunciado. A
demonstração automática roda do começo ao fim.

---

## Iteração 7 · 2026-11-05 · Revisão do Codex no projeto inteiro

**Pedido:** usar o Codex como assistente de revisão.

**Resultado da revisão:** 11 apontamentos, cada um conferido no código.
- **Corrigidos:**
  1. **Bug real:** digitar a conta 0 como origem de uma transferência criava dinheiro (a
     validação ignorava `SEM_CONTA`). Agora cada tipo exige as suas contas.
  2. Valores `nan`/`inf`/gigantes passavam pela validação. Agora a condição é
     `!(valor > 0) || valor > R$ 1.000.000`.
  3. A tolerância de meio centavo permitia sacar R$ 50,004 de um saldo de R$ 50. Agora os
     valores são arredondados para centavos ao entrar.
  4. O comentário de `titular[20]` falava em "19 letras"; o certo é 19 bytes (acentos ocupam 2).
- **Não corrigidos (decisão consciente):** estouro de `int` ao digitar números com mais de 10
  dígitos, linhas com mais de 99 caracteres, falha de `malloc` ignorada e `proximoNumero`
  chegando a `INT_MAX`. São improváveis na demonstração, e a correção acrescentaria recursos
  (`strtol`, `errno`) que fogem do nível do projeto.

**Resultado:** 4 testes de regressão novos. Total de **62 verificações em 4 programas, todas
OK**, compilando sem avisos com `gcc -Wall -Wextra -std=c99`.

---

## Iteração 8 · 2026-11-05 · README e slides

**Pedido:** entregáveis A (README) e slides de apresentação, publicados no mesmo domínio Vercel
(`ep-pilhas-filas.vercel.app`) e no mesmo repositório GitHub.

**Solução proposta:**
- `README.md`: compilação (Windows, Linux, comando manual), tabela do menu, demonstração
  automática, tabela de casos extremos com o teste que cobre cada um, mapa de arquivos.
- `slides/index.html`: 14 slides em HTML puro, no mesmo caminho da versão anterior. O Vercel
  está ligado ao GitHub e publica a cada push na `main`. Conteúdo: problema, visão geral,
  struct, fila, pilha, ponteiro, agenda/qsort, lista encadeada, casos extremos, saída real da
  demo, testes, uso de IA e resumo. Navegação por setas; no celular os slides viram rolagem.

**Resultado:** slides conferidos em Chrome headless a 1440×900.
