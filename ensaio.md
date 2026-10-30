# Ensaio da apresentação

Complementa o `roteiro.md` (tempos e passo a passo da demonstração) com **o texto falado**, **o plano de treino** e **as simulações de perguntas**. Para entender o código a fundo, use o `explicacao-codigo.md`.

Formato da avaliação: 15 minutos = 3 min problema + 5 min demonstração + 7 min perguntas.

Nomes usados aqui: **I1**, **I2**, **I3**. Troquem pelos nomes de vocês.

---

## 1. Plano de treino (até sexta, 13/11)

| Quando | Ensaio | Objetivo |
|---|---|---|
| Ensaio 1 | Cada um lê o `explicacao-codigo.md` e responde às 12 perguntas da seção 13 **sem olhar** | Todos entendem o código inteiro |
| Ensaio 2 | Cada um faz o "desafio do código" (seção 5 deste arquivo) | Todos acham qualquer função rápido |
| Ensaio 3 | Apresentação completa, cronometrada, com as falas da seção 3 | Caber em 8 minutos (sobram 7 para perguntas) |
| Ensaio 4 | Simulação de perguntas (seção 4): um faz o professor e sorteia perguntas para os outros | Responder em até 30 segundos, apontando o código |
| Ensaio 5 | Apresentação completa, **trocando os papéis** | Qualquer um consegue cobrir o outro |
| Véspera | Checklist técnico (seção 2) no computador da apresentação | Nenhuma surpresa no dia |

Regras dos ensaios:
- Cronometrem de verdade. Se passar de 8 minutos na parte falada, cortem frases, não a demonstração.
- Quem não está falando anota o que ficou confuso.
- O professor pode perguntar a **qualquer** integrante sobre **qualquer** parte. Ninguém responde só "foi o outro que fez".

---

## 2. Checklist técnico (véspera e 10 minutos antes)

- [ ] `compilar.bat` roda sem erro no computador da apresentação (se não tiver `gcc`, levar `banco.exe` e `testes.exe` já compilados num pendrive).
- [ ] `testes.exe` mostra `63 testes, 0 falhas`.
- [ ] `banco.exe < demo\demo.txt` roda até "Até logo!" (plano B).
- [ ] Terminal com fonte grande (Ctrl + roda do mouse) e janela maximizada.
- [ ] Acentos aparecem certos no terminal (se não, rodar `chcp 65001` antes).
- [ ] `slides\index.html` aberto no navegador, em tela cheia (F11), no slide 1.
- [ ] Editor de código aberto com `src\fila.c`, `src\pilha.c` e `src\sistema.c` em abas (para mostrar o código nas perguntas).
- [ ] Este arquivo e o `roteiro.md` impressos ou abertos num celular.

---

## 3. Texto falado (8 minutos)

O texto é uma base: falem com as próprias palavras, mas mantenham os pontos em **negrito**, porque é o que a avaliação pede.

### Slide 1 — o problema · I1 · 0:00 a 2:30

> "Nosso projeto é um sistema bancário de linha de comando, em C. Os clientes fazem pedidos de saque, depósito, transferência e pagamento.
>
> O primeiro problema é a **ordem**. Imaginem uma conta com 100 reais e dois pedidos de saque de 80. Só um pode ser atendido. Qual? **O que chegou primeiro.** Atender fora de ordem seria injusto. Por isso os pedidos entram numa **fila FIFO**: o primeiro a entrar é o primeiro a sair.
>
> O segundo problema é **desfazer um erro**. Se o banco precisa estornar uma operação, qual desfazer? **A mais recente.** Se desfizéssemos uma antiga, uma operação que veio depois poderia já ter usado aquele dinheiro, e o saldo ficaria errado. Desfazer sempre a última é exatamente o comportamento de uma **pilha LIFO**: o último a entrar é o primeiro a sair.
>
> Por fim, há os pagamentos agendados. Eles esperam a data chegar. Para a demonstração ser sempre igual, **a data é simulada** e avança por um comando."

### Slide 2 — as estruturas · I2 · 2:30 a 3:30

> "Usamos quatro estruturas, cada uma com um motivo.
>
> A **fila FIFO** é um **vetor circular**: quando um pedido sai, ninguém se move, só o índice do início anda, e o resto da divisão faz o índice voltar ao começo do vetor.
>
> A **pilha LIFO** é uma **lista encadeada**: cada operação aponta para a de baixo. Escolhemos lista porque toda operação efetivada vai para a pilha, e com vetor fixo uma pilha cheia nos obrigaria a recusar operações válidas.
>
> Os **agendados** ficam numa lista sempre ordenada por data; cada um entra direto na posição certa, e datas iguais saem por ordem de chegada. E o **histórico** guarda tudo, inclusive o que foi recusado.
>
> O caminho é este [apontar a linha de baixo do slide]: o pedido entra na fila, é processado e, **só se for efetivado**, vai para a pilha."

### Demonstração · I2 digita, I3 narra · 3:30 a 7:30

Trocar para o terminal e rodar `banco.exe`. As teclas são as do `roteiro.md`. O que I3 fala em cada momento:

| Momento | Fala de I3 |
|---|---|
| Opção 1 (contas) | "Começamos com três contas. Reparem na Carla: 50 reais." |
| Opções 2, 3, 5, 4 (quatro pedidos) | "Os pedidos **não são executados na hora**: cada um entra no **fim da fila**. O saldo ainda não mudou." |
| Transferência 2 → 2 | "Esta é recusada na hora: **transferência para a mesma conta**. Isso não depende de saldo, então nem entra na fila." |
| Opção 11 (ver fila) | "A fila está na ordem de chegada: 1, 2, 3, 5. O 4 foi recusado." |
| Opção 7 (processar) | "Processando **na ordem**: o depósito da Carla entra primeiro, ela fica com 150; aí o saque de 500 é **recusado por saldo insuficiente**. Se a ordem fosse outra, o resultado seria outro." |
| Opção 11 (ver pilha) | "Na pilha estão só as operações efetivadas. **O saque recusado não está aqui**, porque não há o que desfazer. O topo é o pagamento 5, o mais recente." |
| Opção 9 (estornar) | "O estorno **desfaz o topo**: o pagamento 5. O saldo do Bruno volta exatamente ao valor de antes." |
| Opção 6 ×4 (agendar) | "Agora agendamos três pagamentos **fora de ordem**: dia 20, dia 15, dia 20. O quarto, para o dia 10, é recusado: **a data já passou**." |
| Opção 11 | "A lista ficou ordenada: o do dia 15 primeiro. Os dois do dia 20 ficaram **na ordem em que foram agendados**: é o desempate FIFO." |
| Opção 10 (cancelar 8) | "Cancelar um agendado que ainda não executou só tira ele da lista; ele **não passa pela pilha**." |
| Opção 8 (avançar 7 dias) | "Avançamos a data para o dia 20. Os dois agendados vencidos **entram na fila FIFO**." |
| Opção 7 | "E são processados como qualquer pedido." |
| Opção 12 (histórico) | "O histórico mostra **tudo, na ordem em que aconteceu**: efetivados, recusados, estornos, agendamentos." |
| Opção 9 ×5 | "Estornando até o fim: sai sempre o mais recente. 6, 7, 3, 1... e quando a pilha esvazia, **o sistema informa e nada muda**." |

Se sobrar tempo: rodar `testes.exe` — "São 63 testes automáticos; escrevemos o resultado esperado de cada um **antes** de rodar."

### Slides 4 e 5 — casos extremos e aprendizados · I3 · 7:30 a 8:00

> "Neste slide estão os casos extremos que testamos: saldo insuficiente, valor zero ou negativo, conta inexistente, fila cheia, pilha vazia, data inválida, transferência que falha no meio.
>
> O principal aprendizado: **a estrutura certa já resolve a regra de negócio**. A fila garante a justiça na ordem; a pilha garante que o estorno nunca desfaz algo de que outra operação depende. Estamos prontos para as perguntas."

---

## 4. Simulação de perguntas

Um integrante faz o professor e sorteia. Quem responde deve **falar em até 30 segundos e mostrar o código** quando a pergunta pedir. As respostas completas estão no `roteiro.md` e no `explicacao-codigo.md`; aqui ficam as perguntas mais difíceis e o que não pode faltar na resposta.

### Sobre FIFO e LIFO
| Pergunta | Não pode faltar |
|---|---|
| "Mostre onde está o FIFO no código." | `fila.c`: `enfileirar` grava no fim, `desenfileirar` lê do `inicio`. `sistema_processar_proximo` sempre usa `desenfileirar`. |
| "Mostre onde está o LIFO." | `pilha.c`: `empilhar` e `desempilhar` só mexem no `topo`. `sistema_estornar` usa `topo()`. |
| "A pilha não é decorativa? O que aconteceria sem ela?" | Sem ela não teríamos como saber qual foi a última operação efetivada nem os dados para desfazê-la. O histórico não serve, porque tem recusados e estornos misturados. |
| "Por que não usar uma fila para os estornos?" | Uma fila desfaria a operação **mais antiga**; operações posteriores podem depender dela e o saldo ficaria inconsistente (ou negativo). |
| "E se usássemos uma pilha para os pedidos?" | O último cliente a chegar seria atendido primeiro: injusto, e o resultado mudaria (exemplo dos dois saques de 80). |

### Sobre a implementação
| Pergunta | Não pode faltar |
|---|---|
| "Explique o vetor circular. O que acontece na posição 99?" | `(99 + 1) % 100 = 0`: o índice volta ao começo. Ninguém se move no vetor. |
| "Como vocês sabem que a fila está cheia?" | `quantidade == CAPACIDADE_FILA`. Por isso guardamos quantidade e não fim. |
| "Desenhe o `empilhar` no quadro." | Nó novo → `novo->abaixo = topo` → `topo = novo`. |
| "Por que lista encadeada na pilha e vetor na fila?" | Pilha cheia obrigaria a recusar operações válidas; a fila tem limite natural e o vetor é mais simples. |
| "Como funciona a ordenação dos agendados? Usaram `qsort`?" | Não. Inserção ordenada: anda enquanto a data for **≤** e insere ali. O "igual" dá o desempate FIFO. |
| "Onde vocês liberam a memória?" | `sistema_liberar` → `pilha_liberar`, `agendados_liberar`, `historico_liberar`. A fila é vetor, não usa `malloc`. |
| "Por que centavos?" | `float` tem erro de arredondamento; inteiro é exato. |

### Casos extremos (o professor vai testar ao vivo)
Treinem digitando estes casos no programa durante o ensaio:

| O professor pede... | O que acontece | Onde está no código |
|---|---|---|
| Estornar com a pilha vazia | "nada a estornar", nada muda | `sistema_estornar`: `topo()` devolve `NULL` |
| Sacar mais que o saldo | entra na fila; ao processar, recusado; saldo igual; fora da pilha | `debitar` e `sistema_processar_proximo` |
| Valor `0`, `-10` | recusado na entrada | `validar_pedido` |
| Valor `abc` ou `1,234` | pergunta de novo | `texto_para_centavos` / `ler_valor` |
| Conta `99` | recusado | `validar_pedido` / `buscar_conta` |
| Transferir para a mesma conta | recusado na entrada | `validar_pedido` |
| Agendar para hoje ou ontem | recusado: precisa ser depois de hoje | `sistema_agendar` |
| Agendar para 31/11 ou 29/02/2027 | recusado: data inválida | `data_valida` |
| Dois agendados no mesmo dia | saem na ordem em que foram agendados | `agendados_inserir` (`<= 0`) |
| Processar com a fila vazia | "A fila está vazia." | `acao_processar` |
| Opção `abc` no menu | "Digite um número inteiro." | `ler_inteiro` |
| Cancelar um agendado que não existe | "Não há pagamento agendado com o número..." | `agendados_cancelar` |

### Perguntas "pegadinha"
| Pergunta | Resposta |
|---|---|
| "O estorno de depósito com saldo já usado pode acontecer de verdade?" | Pelo menu, não: sempre desfazemos o topo, e nada depois dele mexeu naquele saldo. A regra é uma proteção extra pedida pela equipe; testamos alterando o saldo direto no teste. (Ser honesto aqui conta ponto.) |
| "A transferência pode falhar no meio?" | Sim, se o crédito no destino passar do limite do `long`. Nesse caso o débito na origem é desfeito. Há um teste que força isso. |
| "Por que o saldo não é conferido quando o pedido entra?" | Porque depende de quem está na frente na fila. Valor e contas não dependem, então esses são conferidos na entrada. |
| "Por que não dá para cancelar um agendado que já está na fila?" | Tirar do meio da fila quebraria a ordem de chegada. Depois de efetivado, ele pode ser estornado. |
| "O que a IA fez e o que vocês fizeram?" | Está tudo no `processo-ia.md`, por iteração: o que pedimos, o que foi proposto, as decisões da equipe (vetor circular, regra do depósito, data por comando) e os testes previstos à mão. Mostrar que **entendemos e conferimos** cada parte. |
| "Qual bug vocês encontraram?" | `Pedido #-636777471`: a ordem de avaliação dos argumentos em C não é garantida; separamos em duas linhas. Também uma linha só com espaços no menu fechava o programa; corrigido em `ler_inteiro`. |

---

## 5. Desafio do código (cronometrado)

Um integrante fala o nome; o outro abre o arquivo e mostra a linha. Meta: **menos de 20 segundos cada**.

1. Onde o índice da fila "dá a volta"?
2. Onde o novo nó vira o topo da pilha?
3. Onde o pedido recusado é impedido de entrar na pilha?
4. Onde a transferência desfaz o débito?
5. Onde está o "ou igual" do desempate FIFO dos agendados?
6. Onde a data de hoje é recusada no agendamento?
7. Onde os agendados vencidos vão para a fila FIFO?
8. Onde o estorno é recusado se o dinheiro já foi usado?
9. Onde a memória do histórico é liberada?
10. Onde os acentos são ativados no terminal do Windows?

<details>
<summary>Gabarito</summary>

1. `fila.c`, `enfileirar` e `desenfileirar` (o `% CAPACIDADE_FILA`).
2. `pilha.c`, `empilhar` (`p->topo = novo`).
3. `sistema.c`, `sistema_processar_proximo` (`if (r == RES_OK && !empilhar(...))`).
4. `banco.c`, `transferir` (`origem->saldo += valor`).
5. `agendados.c`, `agendados_inserir` (`data_comparar(...) <= 0`).
6. `sistema.c`, `sistema_agendar` (`data_comparar(data, s->hoje) <= 0`).
7. `sistema.c`, `sistema_avancar_data` (laço com `agendados_retirar_vencido` e `enfileirar`).
8. `banco.c`, `reverter_operacao` (`RES_SALDO_JA_USADO`).
9. `historico.c`, `historico_liberar`.
10. `main.c`, `main` (`SetConsoleOutputCP(CP_UTF8)`).
</details>

---

## 6. Se algo der errado no dia

| Problema | O que fazer |
|---|---|
| Computador sem `gcc` | Usar `banco.exe` e `testes.exe` já compilados (levar no pendrive). |
| Acentos estranhos no terminal | `chcp 65001` e rodar de novo. |
| Alguém digitou errado na demonstração | Sem pânico: o programa pede de novo. Aproveitar: "reparem que a entrada inválida é rejeitada". |
| Os números não batem com o roteiro | Opção 1 mostra os saldos atuais; seguir a partir deles, ou fechar (0) e abrir de novo para recomeçar. |
| Programa travou ou fechou | Plano B: `banco.exe < demo\demo.txt` e narrar em cima da saída, rolando a tela. |
| Projetor sem navegador | Os slides são um arquivo só (`slides\index.html`); qualquer navegador abre. Sem internet a fonte muda, mas o conteúdo aparece. |
| Pergunta que ninguém sabe | "Não testamos esse caso; o que aconteceria é..." e raciocinem pelo código em voz alta. Inventar resposta é pior. |

---

## 7. Autoavaliação final (cada integrante marca)

- [ ] Explico FIFO e LIFO com um exemplo do banco, sem olhar nada.
- [ ] Explico por que a fila é vetor circular e a pilha é lista encadeada.
- [ ] Desenho o vetor circular dando a volta e o `empilhar`/`desempilhar` com setas.
- [ ] Sigo o caminho de um saque do teclado até a pilha (Passeio 1 do `explicacao-codigo.md`).
- [ ] Explico a inserção ordenada e o desempate FIFO.
- [ ] Explico o "tudo ou nada" da transferência.
- [ ] Sei os casos extremos e onde cada um é tratado.
- [ ] Faço a demonstração inteira sozinho, sem o roteiro.
- [ ] Sei o que está no `processo-ia.md` e explico as decisões que a equipe tomou.
