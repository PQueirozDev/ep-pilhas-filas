# Registro do processo com IA

Registro cronológico do uso de IA (Claude Code) no EP de Pilhas e Filas. Cada iteração traz: solicitação, solução proposta, alteração feita, motivo e resultado.

---

## Iteração 1 — 30/10/2026 — Etapas 0 e 1 (esqueleto e modelos)

**Solicitação:** "continue o projeto" (seguindo o `PLANO-EP-pilhas-filas.md`).

**Solução proposta:**
- Etapa 0: criar a pasta `src/` com `main.c`, e o comando de compilação com `gcc`.
- Etapa 1: criar `modelos.h` / `modelos.c` com `Conta`, `Pedido`, `Data` e os `enum` `TipoOperacao` e `Situacao`.

**Alterações:**
- `src/modelos.h`: declarações dos tipos e das funções `criar_conta`, `imprimir_conta`, `imprimir_valor`, `nome_tipo`, `nome_situacao`.
- `src/modelos.c`: implementação dessas funções.
- `src/main.c`: imprime uma mensagem de boas-vindas e duas contas de exemplo.
- `README.md`: como compilar e rodar.

**Motivos das decisões:**
- **Saldo e valores em centavos (`long`)**, não em `float`/`double`: números com vírgula em ponto flutuante têm erros de arredondamento (ex.: 0,1 + 0,2 ≠ 0,3). Com inteiros, R$ 10,50 vira 1050 e as contas ficam exatas.
- **`Data` como struct própria** (dia, mês, ano): a data é simulada e avançada por comando, sem depender do relógio do computador.
- **`SetConsoleOutputCP(CP_UTF8)`** só no Windows: sem isso o terminal mostra os acentos errados.
- Separar modelos em arquivo próprio facilita localizar o código no entregável B.

**Testes (previsão escrita antes de rodar):**
- Compilar com `gcc -Wall -Wextra -o banco src/*.c` sem erros nem avisos.
- Saída prevista:
  ```
  === Sistema Bancário: Pilhas e Filas ===

  Conta 1 | Ana Souza            | saldo: R$ 1000,00
  Conta 2 | Bruno Lima           | saldo: R$ 250,50
  ```

**Resultado:** o `gcc` não estava instalado; com a autorização da equipe, foi instalado o WinLibs (gcc 16.2.0, MinGW-w64 UCRT) via `winget`. Compilou sem avisos e a saída foi idêntica à prevista.

---

## Iteração 2 — 30/10/2026 — Decisões pendentes

**Solicitação:** a IA perguntou à equipe as escolhas que o plano deixava em aberto.

**Respostas da equipe:**
- Fila FIFO: **vetor circular**.
- Estorno de depósito cujo dinheiro já foi usado: **recusar o estorno e manter a operação na pilha** (a conta nunca fica negativa).
- Data simulada: **avançada por comando no menu**, não pelo relógio real (demonstração reproduzível).

**Resultado:** regras incorporadas ao plano de implementação das próximas etapas.

---

## Iteração 3 — 30/10/2026 — Etapas 2 e 3 (fila FIFO; depósito, saque e pagamento)

**Solicitação:** continuar o projeto com as escolhas da Iteração 2.

**Solução proposta:**
- Etapa 2: fila em vetor circular com `inicio` e `quantidade`; funções `fila_iniciar`, `fila_vazia`, `fila_cheia`, `enfileirar`, `desenfileirar`.
- Etapa 3: módulo `banco` com o vetor de contas, `buscar_conta` e `processar_pedido`, que valida o pedido e chama `depositar` ou `debitar`.

**Alterações:**
- `src/fila.h`, `src/fila.c`: a fila FIFO.
- `src/banco.h`, `src/banco.c`: contas, enum `Resultado` (motivo de recusa) e as operações.
- `testes/testes.c`: testes automatizados com a macro `CONFERIR`.

**Motivos das decisões:**
- **Guardar `quantidade` em vez de `fim`**: no vetor circular, "vazia" e "cheia" teriam `inicio == fim`; com a quantidade, cada caso tem um teste simples (`== 0` e `== CAPACIDADE_FILA`).
- **`%` (resto da divisão)** faz o índice voltar para 0 ao passar do fim do vetor.
- **Fila cheia vira caso-limite**: `enfileirar` devolve 0 e o pedido não entra.
- **Saque e pagamento usam a mesma função `debitar`**: as duas operações têm a mesma regra (debita se houver saldo).
- **Validar tudo antes de alterar saldo**: valor ≤ 0 e conta inexistente são recusados sem tocar em nenhuma conta.
- **`processar_pedido` marca a situação** (`efetivado` ou `recusado`), que será usada para decidir o que entra na pilha (Etapa 5).
- Transferência ainda devolve "operação inválida"; será feita na Etapa 4.

**Testes (previsão escrita antes de rodar):**
- Fila: entram 1, 2, 3 → saem 1, 2, 3; desenfileirar de fila vazia falha; com 100 pedidos a fila fica cheia e o 101º é recusado; depois de tirar 2 e pôr 101 e 102, saem 3…100, 101, 102.
- Conta com R$ 1000,00: depósito R$ 200,00 → R$ 1200,00; saque R$ 300,00 → R$ 900,00; saque R$ 5000,00 recusado, continua R$ 900,00; pagamento de R$ 900,00 → R$ 0,00; pagamento de R$ 0,01 com saldo zero recusado.
- Valor zero, valor negativo e conta 99 recusados.

**Resultado:** `19 testes, 0 falhas`; compilação sem avisos com `-Wall -Wextra`.

---

## Iteração 4 — 30/10/2026 — Etapa 4 (transferência tudo ou nada)

**Solicitação:** "pode completar todas as etapas".

**Solução proposta:** função `transferir` em `banco.c` em duas partes: debita a origem; credita o destino; se a segunda parte falhar, desfaz a primeira. Validações antes de tudo em `validar_pedido`: valor > 0, origem existe, destino diferente da origem, destino existe.

**Alterações:** `src/banco.c`, `src/banco.h` (novos resultados `RES_MESMA_CONTA` e `RES_LIMITE_SALDO`).

**Motivos:**
- Para a segunda parte poder falhar de verdade (e o "desfazer" ser testável), `creditar` recusa o crédito se o saldo passar do maior valor que cabe em um `long` (`LONG_MAX`). No Windows o `long` tem 32 bits (cerca de R$ 21 milhões); sem essa verificação a soma "estouraria" e viraria um saldo negativo.
- `validar_pedido` ficou separado porque também é usado na entrada do pedido (ver Iteração 6).

**Testes (previsão):** Ana R$ 1000,00 e Bruno R$ 250,50. Transferir R$ 100,00 → Ana R$ 900,00 e Bruno R$ 350,50. R$ 5000,00 → recusada, saldos iguais. Para a mesma conta → recusada. Para a conta 99 → recusada, origem igual. Bruno com saldo `LONG_MAX − 50` e transferência de R$ 1,00 → crédito falha e Ana continua com R$ 900,00.

**Resultado:** todos passaram.

---

## Iteração 5 — 30/10/2026 — Etapa 5 (pilha de efetivadas e estorno LIFO)

**Solução proposta:** pilha em lista encadeada (`pilha.c`) com `empilhar`, `desempilhar`, `topo`, `pilha_vazia`. Cada item é uma `OperacaoEfetivada`: o pedido e os saldos de antes. `reverter_operacao` (`banco.c`) faz a operação contrária; `sistema_estornar` olha o topo, tenta desfazer e só desempilha se der certo.

**Motivos:**
- **Lista encadeada na pilha** (a fila é vetor): toda operação efetivada vai para a pilha; com vetor fixo, uma pilha cheia obrigaria a recusar operações válidas só por falta de espaço para o estorno. Essa escolha não estava entre as pendentes do plano; a IA decidiu e registra aqui o motivo.
- **Desfazer pela operação contrária** (e não copiando o saldo anterior): é a forma correta se outras contas mudarem no meio. Os saldos anteriores são guardados para mostrar ao usuário e conferir nos testes.
- **Regra da equipe (Iteração 2):** estorno de depósito cujo dinheiro já saiu é recusado e a operação fica no topo. Observação: como o estorno sempre desfaz o topo, nada depois dele mexeu no saldo, então pelo menu essa situação não acontece. A regra fica como proteção e foi testada simulando a saída do dinheiro direto na conta.
- Só o que é efetivado entra na pilha: `sistema_processar_proximo` só chama `empilhar` quando o resultado é `RES_OK`.

**Testes (previsão):** depósito R$ 200 e saque R$ 300 em conta de R$ 1000 → R$ 900, 2 na pilha, topo = saque. 1º estorno → R$ 1200 (o valor de antes do saque). 2º estorno → R$ 1000. 3º estorno → "nada a estornar", nada muda. Saque recusado → pilha continua vazia. Estorno de transferência devolve os dois saldos. Depósito de R$ 100 em Carla (R$ 50 → R$ 150), saldo forçado para R$ 20, estorno → recusado, saldo R$ 20, operação continua no topo.

**Resultado:** todos passaram.

---

## Iteração 6 — 30/10/2026 — Etapa 6 (pagamentos agendados)

**Solução proposta:** lista encadeada mantida em ordem de data (`agendados.c`). `agendados_inserir` anda pela lista enquanto a data do nó for **menor ou igual** à nova, e insere ali. `sistema_avancar_data` soma dias à data simulada e move para a fila FIFO os agendados com data ≤ hoje, na ordem da lista. `sistema_cancelar_agendamento` tira um agendado pelo número, sem passar pela pilha.

**Motivos:**
- O "ou igual" na comparação coloca o novo **depois** dos que já têm a mesma data: é o desempate FIFO. Inserção um a um, sem `qsort`, como o plano pede.
- **Data de hoje também é recusada** (só data futura): um pagamento para hoje é um pagamento imediato (opção 4).
- **Validação na entrada:** valor, conta e data são conferidos ao agendar (e os pedidos imediatos também têm valor e contas conferidos ao entrar na fila). O saldo só é conferido no processamento, porque depende dos pedidos que estão na frente.
- Se a fila FIFO encher durante o avanço de data, os agendados restantes continuam na lista para a próxima vez.
- Datas: `data_valida` (inclusive ano bissexto), `data_comparar` (transforma em aaaammdd), `data_somar_dias`.

**Testes (previsão):** hoje 13/11/2026. Agendar #1 20/11, #2 15/11, #3 20/11, #4 15/11 → ordem #2, #4, #1, #3. Recusados: hoje, 10/11, 31/11, valor zero, conta 99. Avançar 2 dias → #2 e #4 vão para a fila, #2 primeiro. Cancelar #1 → sai da lista; cancelar #999 → não encontrado. Avançar 10 dias → só o #3. Processar → Ana R$ 1000 − 20 − 40 − 30 = R$ 910 (o cancelado não foi cobrado), 3 na pilha, #3 no topo. Datas: 28/02/2028 + 1 = 29/02/2028; 31/12/2026 + 1 = 01/01/2027.

**Resultado:** todos passaram.

---

## Iteração 7 — 30/10/2026 — Etapa 7 (histórico)

**Solução proposta:** lista encadeada com ponteiros `inicio` e `fim` (`historico.c`); `historico_registrar` insere no fim. Cada nó guarda a data simulada, uma cópia do pedido e um texto fixo ("efetivado", "recusado: saldo insuficiente", "estornado (operação desfeita)", "agendado", "agendamento cancelado").

**Motivos:** guardar o `fim` evita percorrer a lista inteira a cada inserção. O histórico é separado da pilha: ele guarda **tudo** (inclusive recusados), a pilha só o que ainda pode ser estornado.

**Teste (previsão):** depósito #1, saque sem saldo #2, depósito de valor zero #3, processar, estornar → histórico: #3 recusado (na entrada), #1 efetivado, #2 recusado, #1 estornado; pilha vazia.

**Resultado:** passou.

---

## Iteração 8 — 30/10/2026 — Etapa 8 (menu e testes)

**Solução proposta:** `main.c` só com menu e leitura do teclado; a lógica ficou em `sistema.c`. Leituras seguras: `ler_inteiro`, `ler_valor`, `ler_data` repetem a pergunta enquanto a entrada for inválida. Se a entrada vem de arquivo (`banco.exe < demo\demo.txt`), o programa repete o que leu, para a saída ficar legível. `compilar.bat` compila programa e testes.

**Bug encontrado na demonstração:** a saída mostrou `Pedido #-636777471`. Causa: em `mostrar_resultado_entrada(sistema_solicitar(..., &id), id)` o C não garante a ordem de avaliação dos argumentos, e `id` foi lido antes de ser preenchido. Correção: chamar `sistema_solicitar` em uma linha e `mostrar_resultado_entrada` na seguinte.

**Revisão independente (Codex CLI, outro assistente de IA):** 13 apontamentos, conferidos um a um no código.
- Corrigidos: (1) uma linha só com espaços era lida como o número 0 (no menu, isso saía do programa); (2) linha longa demais tinha o começo aceito; agora é rejeitada; (3) `sscanf("%d")` com número enorme na data era comportamento indefinido; agora usa `%2d/%2d/%4d`; (4) avançar a data além de 31/12/9999 gerava data inválida; agora é recusado; (5) tipo de operação desconhecido passaria como efetivado; agora é recusado; (6) vetor `ordem` do teste sem valor inicial.
- Não alterados, com motivo: falha de memória ao registrar no histórico, estouro do contador de ids, contas duplicadas/saldo inicial negativo, data inicial inválida e conta inexistente na reversão (situações que o programa não produz: as contas e a data inicial são fixas, a reversão só recebe operações que já passaram pela validação, e o limite de pedidos é muito maior que uma demonstração); cancelar agendado que já entrou na fila FIFO (decisão: tirar do meio da fila quebraria a ordem de chegada; depois de efetivado ele pode ser estornado; documentado em `sistema.h`).

**Testes:** 63 testes automatizados (Etapas 2 a 7, conversão de valores e datas), sem avisos com `-Wall -Wextra`. Demonstração completa por `demo/demo.txt` conferida à mão. Entradas inválidas testadas: só espaços, linha de 200 caracteres, data `99999999999/11/2026`, 3000000 dias.

**Resultado:** `63 testes, 0 falhas`.

---

## Iteração 9 — 30/10/2026 — Etapa 9 (slides e roteiro)

**Solução proposta:** `slides/index.html`, página única com 5 slides (problema, estruturas, demonstração, casos extremos, o que aprendemos), navegação por setas do teclado ou botões. Não executa o código: a demonstração é o programa no terminal. `roteiro.md` com a divisão dos 15 minutos entre os 3 integrantes, o passo a passo da demonstração e respostas prontas para as perguntas prováveis.

**Motivo:** o plano define o site apenas como slides; o roteiro repete exatamente `demo/demo.txt`, então a demonstração ao vivo é reproduzível e há um plano B que roda sozinho.

**Verificação:** capturas de tela no navegador (Edge sem interface) em 1440×900 e 500 px de largura. Corrigidos: a indentação da pilha no terminal do slide 3 sumia (HTML junta espaços; resolvido com `white-space: pre`), e no celular cada slide ocupava a altura inteira da tela.

**Resultado:** 5 slides legíveis no computador e no celular; navegação por setas, botões e pontos.

---

## Iteração 10 — 30/10/2026 — Decisões finais e material de estudo

**Solicitação:** "pode escolher você mesmo isso, e depois cria um ensaio de apresentação e uma explicação do código inteiro".

**Decisões confirmadas** (a equipe delegou a escolha à IA, que manteve o que já estava implementado):
- Pilha em **lista encadeada** (com vetor fixo, uma pilha cheia obrigaria a recusar operações válidas).
- Agendamento só para **data depois de hoje** (para hoje existe o pagamento imediato).
- Agendado que já entrou na fila FIFO **não pode ser cancelado** (tirar do meio da fila quebraria a ordem de chegada); depois de efetivado, pode ser estornado.

**Alterações:**
- `explicacao-codigo.md`: visão geral, conceitos de C usados (ponteiros, `malloc`/`free`, `static`, `const`, `%`), explicação de cada arquivo e de cada função, desenhos do vetor circular e das listas, três passeios completos (saque, estorno, agendado) e perguntas de checagem com respostas.
- `ensaio.md`: plano de treino até 13/11, checklist técnico, texto falado de cada integrante com tempos, falas para cada passo da demonstração, simulação de perguntas (incluindo "pegadinhas" e casos que o professor pode testar ao vivo), desafio de achar funções no código, plano B e autoavaliação.

**Motivo:** a avaliação exige que todos os integrantes entendam e defendam o código; o material foi escrito para nível iniciante e aponta sempre o arquivo e a função.

**Resultado:** as falas do ensaio foram conferidas contra a saída real de `demo/demo.txt` (ordem da fila 1, 2, 3, 5; saque #2 recusado; estornos 6, 7, 3, 1 e pilha vazia no fim).
