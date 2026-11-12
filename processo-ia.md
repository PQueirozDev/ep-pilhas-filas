# Diário do processo com IA

Projeto: EP de Algoritmos (Senac): pilhas e filas aplicadas a transações bancárias.

**Versão atual (iteração 11):** a pedido do usuário, o programa usa vetores, índices,
um banco global e retorno por valor, sem ponteiros explícitos. O histórico é um vetor
de 1.000 registros, e a agenda usa ordenação por inserção. As referências a lista
encadeada, ponteiros e `qsort` nas iterações 1 a 10 documentam versões anteriores.

## Como a IA foi usada

| Papel | Quem |
|---|---|
| Requisitos e decisões de estrutura (fila, pilha, agenda ordenada com desempate, histórico; na versão atual em vetores) | equipe |
| Implementação em incrementos pequenos, comentada para iniciantes | Claude (assistente de código) |
| Revisão independente do código | Codex (segunda IA), com cada apontamento conferido antes de corrigir |
| Verificação | testes automáticos em C (72 verificações), no simulador (32) e no terminal (12) |

As decisões da iteração 1 foram tratadas como fixas: nenhuma foi reaberta sem consultar a
equipe. Cada entrada abaixo segue o formato **pedido · solução proposta · alteração · motivo ·
resultado**.

| # | Data | Assunto | Resultado |
|---|---|---|---|
| 1 | 05/11 | Recomeço, decisões e pilha de efetivadas | 11 verificações OK |
| 2 | 05/11 | Ritmo de trabalho | incrementos seguidos, cada um testado |
| 3 | 05/11 | Fila de pedidos imediatos (FIFO) | 10 verificações OK |
| 4 | 05/11 | Agenda com qsort e desempate | 10 verificações OK |
| 5 | 05/11 | Histórico em lista encadeada | testado no `teste_sistema` |
| 6 | 05/11 | Sistema, menu e entrada | demonstração automática completa |
| 7 | 05/11 | Revisão do Codex no projeto inteiro | 1 bug real corrigido; 62 verificações OK |
| 8 | 05/11 | README e slides | slides publicados |
| 9 | 10/11 | Simulador animado e slides novos | 25 verificações novas OK |
| 10 | 10/11 | Vídeo da demonstração | MP4 gravado quadro a quadro |
| 11 | 10/11 | Remoção dos ponteiros explícitos | 72 verificações em C, 32 no simulador e 12 no terminal |
| 12 | 11/11 | Revisão final do Codex e preparação da apresentação | 2 correções de valor, textos atualizados; testes OK |
| 13 | 11/11 | Conferência com o enunciado | README com operações de pilha/fila e roteiro de apresentação |

## Commits

As conversas com o agente não foram anexadas ao repositório; este diário registra, por iteração,
os pedidos, as soluções propostas, as alterações, os motivos e os resultados.

| Commit | Data | Descrição |
|---|---|---|
| [`1eaf94b`](https://github.com/PQueirozDev/ep-pilhas-filas/commit/1eaf94b) | 30/10 | EP Pilhas e Filas: sistema bancário em C (primeira versão) |
| [`25c125a`](https://github.com/PQueirozDev/ep-pilhas-filas/commit/25c125a) | 30/10 | Slide 3: demonstração animada da saída real do banco.exe |
| [`b110f58`](https://github.com/PQueirozDev/ep-pilhas-filas/commit/b110f58) | 05/11 | Recomeço do EP: fila, pilha, qsort e lista (iterações 1 a 8) |
| [`f062b22`](https://github.com/PQueirozDev/ep-pilhas-filas/commit/f062b22) | 10/11 | Simulador animado, slides interativos e vídeo (iterações 9 e 10) |
| [`e7c58c3`](https://github.com/PQueirozDev/ep-pilhas-filas/commit/e7c58c3) | 10/11 | README com acesso à demonstração |
| [`6a73744`](https://github.com/PQueirozDev/ep-pilhas-filas/commit/6a73744) | 10/11 | Remove ponteiros explícitos; vetores (iteração 11) |
| [`bee5c93`](https://github.com/PQueirozDev/ep-pilhas-filas/commit/bee5c93) | 11/11 | Corrige arredondamento e atualiza documentação (iteração 12) |
| [`b53ee97`](https://github.com/PQueirozDev/ep-pilhas-filas/commit/b53ee97) | 11/11 | Regrava o vídeo com a legenda corrigida |
| [`93304a7`](https://github.com/PQueirozDev/ep-pilhas-filas/commit/93304a7) | 11/11 | README enxuto |

A lista completa e sempre atualizada está em `git log` e na [página de commits](https://github.com/PQueirozDev/ep-pilhas-filas/commits/main).

---

## Iteração 1 · 2026-11-05 · Recomeço, decisões e pilha de efetivadas

**Pedido:** descartar a versão anterior da pasta e recomeçar do zero, com código para
iniciantes (sem conhecimento prévio de struct/ponteiro), em incrementos pequenos. Manter o
mesmo repositório GitHub (`PQueirozDev/ep-pilhas-filas`) e o mesmo domínio Vercel (para os
slides, mais tarde). Primeiro incremento: struct da operação + pilha de efetivadas + teste.
Usar o Codex como assistente de revisão.

**Decisões da equipe (não serão reabertas sem consultá-la):**
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

---

## Iteração 2 · 2026-11-05 · Ritmo de trabalho

**Pedido:** com as decisões de estrutura já fechadas na iteração 1, seguir com os incrementos
restantes em sequência, sem pausas entre eles.

**Solução proposta:** cada incremento continua pequeno e só avança depois de compilar sem avisos
e passar no próprio teste. Tudo fica registrado neste diário para a equipe acompanhar.

**Alteração:** nenhuma no código; muda só o ritmo.

**Motivo:** as escolhas que exigiam decisão da equipe já estavam tomadas; o que faltava era
implementar o que foi decidido.

**Resultado:** iterações 3 a 7 feitas em sequência, cada uma com seu teste.

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

**Resultado:** `testes/teste_fila.c`, com 10 verificações: vazia, ordem 1, 2, 3, cheia, volta
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

---

## Iteração 9 · 2026-11-10 · Simulador animado e slides novos

**Pedido:** os slides eram estáticos demais. A equipe queria ver o processo acontecendo
(a ficha andando pela fila, pela pilha, pela agenda e pela lista) e um visual mais caprichado.
Usar o Codex para revisar e deixar o código mais limpo.

**Solução proposta:**
- `slides/js/banco.js`: motor em JavaScript que espelha `src/sistema.c` (mesmas contas,
  validações e mensagens). Cada comando devolve uma lista de **passos**, cada um com uma foto
  do estado, a função C em execução, a linha acesa e uma explicação para iniciantes.
- `slides/simulador.html` + `slides/js/simulador.js`: tela que toca os passos. A ficha passa
  pela fila, pela variável `op` e pela pilha; a agenda se reordena com o `qsort`; os nós do
  histórico são ligados até `NULL`. Ao lado: o trecho de C com a linha acesa e o terminal com
  a saída do `banco.exe`. Velocidade, modo passo a passo, roteiro da demonstração e roteiro de
  estorno impossível.
- Slides: mini animação em cada estrutura (fila, pilha, agenda, lista), fluxo animado na visão
  geral, entrada em cascata, visão geral pela tecla `O` e link para o simulador.
- `testes/teste_simulador.mjs`: roda o roteiro de `demo/entrada-demo.txt` no motor e compara
  linha a linha com `demo/saida-demo.txt`.

**Alteração:** só arquivos do site e um teste novo. O código C não mudou.

**Motivo:** o motor separado da tela permite testar as regras no Node, sem navegador, e
garante que o que o simulador mostra é o que o programa em C faz.

**Revisões do Codex:** duas rodadas, 18 apontamentos, todos conferidos no código e corrigidos.
Os principais:
1. Uma legenda dizia que o estorno "volta a um estado que já existiu", o que é falso quando um
   agendado executou no meio. Reescrita nos slides, no simulador e no README.
2. Linhas do painel de código que resumiam o C em vez de mostrar o código real (validação das
   contas, pilha cheia, arredondamento na agenda) foram trocadas pelas linhas reais.
3. **Bug real no simulador:** no roteiro, o primeiro comando era exibido e substituído no mesmo
   instante. Agora o roteiro inteiro entra na fila antes de começar a tocar.
4. Entrada igual ao C: conta `1.9` recusada (como `lerInteiro`), ano fora de 1900 a 2999
   recusado (como `dataExiste`), valor `1e2` aceito (como `%lf`).
5. Acessibilidade: mensagens de erro ligadas aos campos, visão geral fora do Tab quando
   fechada, espaço não atropela botões focados, botão de pausar nas animações e animação que
   roda uma vez só com "movimento reduzido".

**Resultado:** `node testes/teste_simulador.mjs`: 25 verificações, todas OK; as 19 linhas da
demonstração são idênticas às do `banco.exe`. Páginas conferidas no Chrome (desktop e 390 px
de largura, sem rolagem horizontal e sem erros no console).

---

## Iteração 10 · 2026-11-10 · Vídeo da demonstração

**Pedido:** um vídeo animado mostrando como o sistema funciona, para a apresentação.

**Solução proposta:**
- **Modo filme** do próprio simulador (`slides/simulador.html?filme`, com `slides/js/filme.js` e
  `slides/css/filme.css`): palco de 1920×1080, legenda grande e um cartão de título por
  capítulo (fila, pilha, agenda, pilha de novo, histórico). Os comandos são os mesmos de
  `demo/entrada-demo.txt`, executados pelo motor já testado.
- **Gravador** `ferramentas/gravar-video.mjs`: abre o filme no Chrome sem janela, troca o
  relógio da página por um relógio falso, avança 1/60 s por vez e manda um print de cada quadro
  para o `ffmpeg`.

**Motivo:** reaproveitar o simulador garante que o vídeo mostra o comportamento real do
programa, e não uma animação desenhada à parte. Gravar quadro a quadro (em vez de filmar a
tela) deixa o vídeo liso e permite regravar com um comando se o roteiro mudar.

**Alteração:** `simulador.js` ganhou uma API pequena (`window.Simulador`) usada só pelo filme.
O código C e o motor `banco.js` não mudaram.

**Resultado da conferência final (Codex):** vídeo completo em
`slides/midia/banco-ep.mp4`, com 144,85 segundos, 1920×1080 e 60 quadros por segundo.
Metadados conferidos com FFprobe e quadro final extraído com FFmpeg: o filme chega
ao cartão de resumo. Os quatro executáveis de teste em C passaram sem falhas;
as 25 verificações do simulador também passaram, incluindo as 19 linhas da demonstração.
O link “Ver o vídeo” está nos slides. Revisão local aprovada pelo usuário para commit.

---

## Iteração 11 · 2026-11-10 · Versão sem ponteiros explícitos

**Pedido:** retirar os ponteiros do trabalho. O usuário confirmou a alteração após
ser informado de que isso substituiria a lista encadeada e o `qsort`.

**Solução e alterações:**
- Um único `Sistema banco` global guarda contas e estruturas. As funções usam campos
  acessados pelo ponto e índices dos vetores; não recebem endereços de estruturas.
- Retiradas da fila, pilha e agenda devolvem `Operacao` por valor. `numero == 0`
  indica ausência. A busca de conta devolve o índice ou `-1`.
- Agenda ordenada por inserção, comparando data e número de entrada por valor.
- Histórico em vetor de 1.000 registros. Ao faltar espaço, o comando é recusado
  antes de alterar saldos ou estruturas; o avanço de data reserva espaço para todos
  os vencidos, evitando execução parcial por falta de registro.
- Entrada lida por caracteres e índices, sem variáveis de ponteiro, `scanf`,
  `sscanf` ou passagem de endereços. Valores decimais aceitam ponto, vírgula e
  notação científica; inteiros fora da faixa e linhas longas são recusados.
- README, slides, simulador e roteiro do filme passam a explicar a implementação
  em vetores. `ferramentas/sincronizar-codigo.mjs` atualiza o painel com as funções
  reais dos fontes C.

**Motivo:** simplificar os conceitos usados no código conforme solicitado. A versão
mantém um banco por execução e troca o crescimento dinâmico do histórico por um
limite explícito. As bibliotecas padrão de C continuam recebendo vetores de texto
conforme suas APIs; não há manipulação explícita de endereços no código do trabalho.

**Validação:** compilação com `gcc -Wall -Wextra -std=c99`, sem avisos; 72 verificações
em C, 32 no motor JavaScript e 12 testes de terminal passaram. As 19 linhas de eventos
da demonstração continuam iguais à referência. Chrome conferido em 1440 px e 390 px:
14 slides, 13 registros no roteiro, saldos finais corretos, sem erros JavaScript e
sem rolagem horizontal da página.

**Vídeo atualizado:** filme regravado com 145,5 segundos, em 1920×1080 a 60 fps;
decodificação completa validada com FFmpeg, capa substituída e quadros do histórico
em vetor e do encerramento conferidos visualmente.

---

## Iteração 12 · 2026-11-11 · Revisão final do Codex e preparação da apresentação

**Pedido:** revisar todos os arquivos com o Codex antes da apresentação, organizar o GitHub
e o README e preparar um roteiro com as perguntas prováveis do professor.

**Revisão do Codex (14 apontamentos, todos conferidos no código):**
- Corrigido: `arredondarCentavos` perdia um centavo por erro do `double`
  (1,005 virava 1,00). Somamos uma pequena folga antes de truncar, em C e no motor JS.
- Corrigido: valores abaixo de meio centavo (ex.: 0,001) viravam operações de R$ 0,00.
  `valorValido` agora recusa o que arredonda para zero, em C e no JS.
- Corrigido: legenda do filme dizia "vetor encadeada"; o slide da demonstração passou a
  dizer "saída resumida", porque abrevia linhas da saída real; resumo deste diário atualizado.
- Mantidos como limitações conhecidas (não alcançáveis pelo menu): tipo de operação
  inexistente e data fora do calendário em chamadas diretas às funções, teste do simulador
  com referência fixa, animação da agenda usando `.sort()` nos slides, falta de teste
  para agenda cheia.

**Organização:** descrição e tópicos do repositório no GitHub; README com começo rápido,
tabela de complexidade e limites das estruturas.

**Validação:** testes em C, no simulador e no terminal executados novamente após as correções.

---

## Iteração 13 · 2026-11-11 · Conferência com o enunciado

**Pedido:** enxugar o README e conferir se tudo o que o enunciado pede está no repositório.

**Conferência com o PDF do enunciado:**
- Entregável A (demonstração funcional com instruções de uso e de apresentação): `banco.exe`,
  `compilar.bat`, site, simulador e vídeo. Faltava no README uma seção sobre **como apresentar**;
  foi adicionada.
- Entregável B (código-fonte que permita localizar as operações de pilha/fila): o README ganhou
  uma tabela com **cada operação e o arquivo e a função onde ela está**.
- Entregável C (registro integral): este diário cobre todas as iterações; foi acrescentada a
  tabela de commits com links. A equipe decidiu não publicar as transcrições das conversas.
- Roteiro de 15 minutos (3 de problema, 5 de demonstração e 7 de perguntas): o material de preparação
  da equipe foi refeito nesses tempos.

**Alteração:** README sem as seções de manutenção (regravação do vídeo, sincronização do painel);
ficaram o que o projeto é, como rodar, como apresentar, onde estão as operações, testes e arquivos.

**Contribuidores:** a tag `versao-antiga` (primeira versão, de 30/10) foi removida do GitHub porque
seu commit era de outra conta; ela continua guardada no repositório local.

**Validação:** links do README e deste diário conferidos; testes em C, no simulador e no terminal passando.


---

## Iteração 14 · 2026-11-12 · Simulador dividido em partes e autoexplicativo

**Pedido:** a simulação do site estava difícil de entender, com informação demais na tela e
um roteiro longo demais para avançar passo a passo. A equipe quer operar sozinha na apresentação,
com uma parte para cada estrutura, sem nada rodando automaticamente ao abrir e sem mexer no painel
do código C ao vivo.

**Como ficou (`slides/simulador.html`, `slides/js/simulador.js`):**
- A coluna de comandos saiu. No lugar, abas **Fila · Pilha · Agenda · Vetor (histórico)** com
  **Rodar** e **Reiniciar**. Cada aba mostra só as contas e a estrutura daquela parte.
- Cada parte tem um roteiro curto (`BancoEP.PARTES`, em `slides/js/banco.js`): fila 7 passos,
  pilha 6, agenda 8 e vetor 4. Passos que não mudam o que está na tela (por exemplo, o registro no
  histórico fora da parte do vetor) são juntados ao passo seguinte, sem perder as linhas do terminal.
- **Balão autoexplicativo:** a cada passo, uma frase em linguagem simples aparece colada na parte
  que mudou. O motor ganhou o campo `simples` em todos os passos, ao lado da `legenda` técnica.
- Nada roda sozinho: os passos esperam **Próximo passo** (botão menor) ou a tecla →. O interruptor
  **Avançar sozinho** liga o modo automático e mostra a velocidade.
- O interruptor **Detalhes técnicos** mostra os índices do vetor (`itens[0]`, `inicio`, `quantidade`),
  o nome `op` e a explicação ligada ao código C. Desligado, a tela mostra só "próximo", "TOPO", "1º"...
- No celular, Próximo passo e Ir para o fim ficam presos embaixo da tela.
- `?roteiro=demo` (link dos slides) continua rodando a demonstração completa com todas as estruturas;
  `?parte=pilha` abre direto numa parte.
- Painel do código C, terminal e modo filme sem mudanças.

**Testes:** `testes/teste_simulador.mjs` ganhou 6 verificações (frase simples em todos os passos e o
resultado de cada parte). `ferramentas/verificar-site.mjs` liga o modo automático antes de rodar.

**Revisão com o Codex** (`codex review --uncommitted`, duas rodadas): na primeira, um apontamento de
que o modo filme dependeria do antigo interruptor `modoPasso`; conferido, nenhum arquivo usa esse ID.
Na segunda, sobre a versão final, nenhum problema encontrado.

**Validação:** `node testes/teste_simulador.mjs` (38 de 38), `verificar-site.mjs` em 1440 px e 390 px
e uso manual no navegador das quatro partes, de Detalhes técnicos e do modo filme.

---

## Iteração 15 · 2026-11-12 · Modo manual, atalhos de teclado e modo claro

**Pedido:** um botão para operar o simulador manualmente durante a apresentação, a seta ← para
voltar um passo, o espaço para passar para a próxima parte (já rodando), o Backspace para voltar e um modo claro.

**Alterações (`slides/simulador.html`, `slides/js/simulador.js`):**
- Botão **Modo manual**: mostra todas as estruturas juntas e um painel com as ações do menu do
  banco.exe (pedido com tipo, contas e valor; processar o próximo ou todos; estornar; agendar com
  conta, valor e data; cancelar um agendado escolhido na lista; avançar a data). As datas sugeridas
  partem do "hoje" do banco. Clicar de novo no botão volta para as partes.
- **← volta um passo** (também pelo botão ao lado de Próximo passo): todos os passos da rodada ficam
  guardados e cada um traz a foto do estado, então voltar só redesenha a foto anterior; as linhas do
  terminal daquele passo em diante são apagadas e reaparecem ao avançar de novo.
- **Espaço** passa para a próxima parte (Fila → Pilha → Agenda → Vetor → Fila) e **Backspace** volta
  para a anterior, sem acionar o botão em foco. Depois do primeiro clique em **Rodar**, a parte nova
  já começa a rodar sozinha.
- Partes **Fila** e **Pilha** encadeadas: a Fila mostra os dois saques da Carla e a transferência da
  Ana entrando na fila, cada operação efetivada subindo para a pilha e a recusa do saque sem saldo
  (6 passos, com a pilha visível). A Pilha começa exatamente onde a Fila terminou (o mesmo roteiro
  roda em silêncio como preparo) e mostra só os estornos. Numa primeira tentativa os dois roteiros
  ficaram misturados na parte da Pilha; corrigido a pedido da equipe.
- Botão **Modo claro** na barra de cima, lembrado neste navegador (`localStorage`, com proteção para
  quando não houver armazenamento). Os tokens do tema claro ficam em `slides/css/base.css`, sob
  `html[data-tema="claro"]`; código C e terminal continuam escuros, com as cores originais. O filme é sempre escuro.
- Painel do código C, terminal e modo filme sem mudanças.

**Revisão com o Codex** (`codex review --uncommitted`): nenhum problema encontrado.

**Validação:** `node testes/teste_simulador.mjs` (38 de 38), `verificar-site.mjs` em 1440 px e 390 px
e uso no navegador (voltar e avançar com as setas, espaço entre as partes, depósito e processamento
no modo manual).

## Iteração 16 · 2026-11-12 · Slides de conclusão separados

**Pedido:** tirar os slides 11 a 14 (demonstração, testes, uso de IA e encerramento) da apresentação
principal e abri-los a partir do simulador com a tecla **.** (ponto).

**Alterações:**
- `slides/final.html`: nova página só com os quatro slides de conclusão, usando a mesma navegação
  (`js/slides.js`): setas, **O** para a visão geral e **S** para voltar ao simulador.
- `slides/index.html`: fica com os slides 1 a 10. O estilo dos slides saiu do `<style>` da página para
  `slides/css/slides.css`, compartilhado pelas duas páginas.
- `slides/js/simulador.js` e `slides/simulador.html`: a tecla **.** abre `final.html` (fora do modo
  filme e quando não se está digitando num campo); a dica de atalhos mostra a tecla nova.
- `ferramentas/verificar-site.mjs` confere 10 slides na apresentação e 4 na conclusão; o README cita o atalho.

## Iteração 17 · 2026-11-12 · Visão geral estática

**Pedido:** tirar a animação do slide 3 (Visão geral), em que um destaque percorria os blocos um a um.

**Alterações:** o slide 3 fica estático. Saíram a função `criarFluxo` de `slides/js/slides.js`, os
atributos `data-fluxo` de `slides/index.html` e os estilos `.aceso` de `slides/css/slides.css`.

## Iteração 18 · 2026-11-12 · Slide de objetivo

**Pedido:** trocar o slide 4 ("Base de tudo", com a struct `Operacao`) por um slide de objetivo que
liste só as estruturas usadas no EP.

**Alterações (`slides/index.html`):** o slide 4 passa a se chamar **Objetivo**, com o título
"Estruturas que usamos no EP" e quatro cartões: Fila, Pilha, Agenda e Vetor, cada um com a cor da sua estrutura.

## Iteração 19 · 2026-11-12 · Sem o slide de visão geral

**Pedido:** tirar o slide "Visão geral" (o fluxo de cada operação).

**Alterações:** a apresentação passa a ter 9 slides. Saíram o slide de `slides/index.html` e os estilos
do fluxo (`.fluxo`, `.no`, `.seta`) de `slides/css/slides.css`. `ferramentas/verificar-site.mjs`
confere 9 slides e o roteiro do README cita os slides 1 a 3.

## Iteração 20 · 2026-11-12 · Slides de objetivo e justificativa

**Pedido:** trazer de volta o slide do fluxo de cada operação, agora com o nome **Objetivo**, e
renomear o slide das estruturas para **Justificativa**.

**Alterações:** `slides/index.html`, `slides/css/slides.css`, `ferramentas/verificar-site.mjs` e o
README voltam ao estado da iteração 18 (10 slides, fluxo estático). O slide 3 passa a se chamar
Objetivo e o slide 4 (Fila, Pilha, Agenda e Vetor), Justificativa.

## Iteração 21 · 2026-11-12 · Texto do slide Objetivo

**Pedido:** no slide Objetivo, trocar o fluxo das operações por três frases: simular um sistema
bancário em C, processar operações bancárias e aplicar estruturas de dados na organização das operações.

**Alterações:** o slide 3 de `slides/index.html` passa a ser uma lista com essas três frases, em letra
maior (`ul.lista.grande`, em `slides/css/slides.css`). Os estilos do fluxo (`.fluxo`, `.no`, `.seta`),
que só esse slide usava, saíram.
