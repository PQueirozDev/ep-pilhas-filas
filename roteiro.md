# Roteiro da apresentação (15 min) — sexta, 13/11/2026

Distribuição sugerida entre os 3 integrantes (I1, I2, I3). Ajustem os nomes; **todos** devem conseguir responder qualquer pergunta.

## Antes de começar (preparação)

1. Abrir `slides/index.html` no navegador (setas do teclado trocam o slide).
2. Abrir um terminal na pasta do projeto e rodar `compilar.bat` (já deixar compilado).
3. Testar uma vez: `banco.exe < demo\demo.txt` (roda a demonstração inteira sozinho, como plano B).
4. Aumentar a fonte do terminal para o professor enxergar.

## 0:00 – 3:00 · O problema (I1) — slide 1

- Um banco recebe pedidos de vários clientes: saque, depósito, transferência, pagamento.
- **Por que fila?** A ordem muda o resultado. Exemplo: conta com R$ 100 e dois saques de R$ 80. Quem pediu primeiro leva; o segundo é recusado. Atender fora de ordem seria injusto.
- **Por que pilha?** O estorno desfaz a operação **mais recente**. Se desfizéssemos uma antiga, uma operação posterior poderia ter usado aquele dinheiro e o saldo ficaria inconsistente.
- Pagamentos agendados esperam a data; a data é simulada, avançada por comando.

## 3:00 – 4:00 · As estruturas (I2) — slide 2

- Fila FIFO em vetor circular (`fila.c`), pilha LIFO em lista encadeada (`pilha.c`), fila de agendados ordenada por data (`agendados.c`), histórico em lista encadeada (`historico.c`).
- Caminho: pedido → fila → processar → se efetivado, pilha → estorno desfaz o topo.

## 4:00 – 8:00 · Demonstração ao vivo (I2 digita, I3 narra) — slide 3

Rodar `banco.exe` e seguir (é o mesmo roteiro de `demo\demo.txt`):

| Passo | Opção | Entrada | O que mostrar |
|---|---|---|---|
| 1 | `1` | — | Contas: Ana R$ 1000, Bruno R$ 250,50, Carla R$ 50 |
| 2 | `2` | conta 3, 100 | Depósito #1 entra no fim da fila |
| 3 | `3` | conta 3, 500 | Saque #2 entra na fila (o saldo só é conferido no processamento) |
| 4 | `5` | 1 → 2, 200 | Transferência #3 |
| 5 | `5` | 2 → 2, 10 | **Recusada na hora**: mesma conta |
| 6 | `4` | conta 2, 50,50 | Pagamento #5 |
| 7 | `11` | — | Fila na ordem #1, #2, #3, #5 |
| 8 | `7` | — | Processa em ordem; **#2 recusado** (Carla tem só R$ 150) |
| 9 | `11` | — | Pilha: topo é o #5; o #2 recusado não está lá |
| 10 | `9` | — | Estorno desfaz o #5 (topo): Bruno volta a R$ 450,50 |
| 11 | `6` ×3 | 1/80/20/11, 2/30/15/11, 3/10/20/11 | Agendados fora de ordem |
| 12 | `6` | 1/10/10/11/2026 | **Recusado**: data passada |
| 13 | `11` | — | Lista ordenada: 15/11, 20/11 (#6), 20/11 (#8) — empate pela chegada |
| 14 | `10` | 8 | Cancela o #8 (não passa pela pilha) |
| 15 | `8` | 7 | Data vai para 20/11; 2 agendados entram na fila |
| 16 | `7` | — | Processa #7 e #6 |
| 17 | `12` | — | Histórico completo, inclusive recusados e estornos |
| 18 | `9` ×5 | — | Estornos em ordem LIFO até **"nada a estornar"** |

Se der tempo, rodar `testes.exe` (63 testes, 0 falhas).

## 8:00 – 8:30 · Casos extremos e aprendizados (I3) — slides 4 e 5

Passar rápido; os detalhes ficam para as perguntas.

## 8:30 – 15:00 · Perguntas (todos)

Respostas prontas para as perguntas mais prováveis:

**Por que a fila é vetor circular e a pilha é lista encadeada?**
A fila tem limite natural (100 pedidos esperando) e o vetor é simples: dois números (`inicio`, `quantidade`) e o `%` para dar a volta. A pilha recebe toda operação efetivada; com vetor fixo, uma pilha cheia obrigaria a recusar operações válidas só por falta de espaço para o estorno.

**Por que guardar `quantidade` e não `fim` na fila?**
No vetor circular, vazia e cheia teriam `inicio == fim`. Com a quantidade, vazia é `== 0` e cheia é `== 100`. O fim é calculado: `(inicio + quantidade) % 100`.

**Onde exatamente está o FIFO?** `enfileirar` grava no fim (`fila.c`); `desenfileirar` lê do `inicio`. `sistema_processar_proximo` (`sistema.c`) sempre usa `desenfileirar`.

**Onde está o LIFO?** `empilhar` faz o novo nó apontar para o antigo topo; `desempilhar` tira o topo (`pilha.c`). `sistema_estornar` só olha o `topo`.

**Por que o saldo só é conferido no processamento e não quando o pedido entra?**
Porque depende dos pedidos que estão na frente. No exemplo, o saque #2 seria válido se o depósito #1 fosse maior. Valor, conta e mesma conta não dependem de ordem, então são conferidos na entrada.

**Como a transferência é tudo ou nada?** `transferir` (`banco.c`) debita a origem; se o crédito no destino falhar (saldo passaria do limite do `long`), devolve o valor à origem. Há um teste que força essa falha.

**E se o dinheiro do depósito já tiver sido gasto?** O estorno é recusado e a operação continua no topo (regra da equipe). Pelo menu isso não chega a acontecer: como sempre desfazemos o topo, nada depois dele mexeu no saldo. A regra é uma proteção extra, testada simulando a saída do dinheiro.

**Por que centavos em `long` e não `float`?** `float` tem erro de arredondamento (0,1 + 0,2 não dá exatamente 0,3). Com inteiros a conta é exata.

**Como funciona a inserção ordenada?** Anda pela lista enquanto a data do nó for menor **ou igual** à nova. O "ou igual" coloca o novo depois dos de mesma data, que é o desempate FIFO. Não usamos `qsort`.

**Dá para cancelar um agendado que já entrou na fila?** Não: tirar do meio da fila quebraria a ordem de chegada. Depois de efetivado, ele pode ser estornado.

**O que acontece com a fila cheia?** O novo pedido é recusado e fica no histórico. No avanço de data, os agendados que não couberem continuam agendados.

**A memória é liberada?** Sim: `sistema_liberar` libera pilha, agendados e histórico ao sair.
