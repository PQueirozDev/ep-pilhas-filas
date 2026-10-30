# EP Pilhas e Filas: Processamento de transações bancárias (em C)

Contexto para o Claude Code. Este arquivo consolida o que a equipe decidiu com o tutor. Leia tudo antes de começar.

## 1. Contexto da disciplina

- Disciplina: Algoritmos, Senac, 2º semestre de 2026. Equipe de 3 integrantes.
- Entregáveis obrigatórios:
  - A) Demonstração funcional, com instruções de uso e apresentação.
  - B) Código-fonte, com os arquivos necessários para localizar as operações de pilha e fila.
  - C) Registro integral do processo com IA (`processo-ia.md`): cronológico, com cada solicitação, solução proposta, alteração, motivo e resultado, organizado por iteração com data.
- Apresentação: sexta-feira, 13/11/2026, 15 min (3 min problema, 5 min demonstração, 7 min perguntas).
- Avaliação: pertinência do problema, uso correto de pilha e fila (não pode ser decorativo), funcionamento, clareza na explicação do código, justificativa de LIFO/FIFO e casos extremos.
- Todos os integrantes precisam entender e conseguir defender o código.

## 2. Problema

Um sistema bancário de linha de comando usado por clientes do banco. Ele recebe pedidos de saque, depósito, transferência e pagamento. Os pedidos entram em fila e são processados na ordem de chegada. Cada operação efetivada é registrada em uma pilha, para permitir o estorno da última operação.

- Linguagem: C.
- Site: apenas como slides de apresentação para o professor. O site não executa o código. A demonstração é o programa rodando ao vivo no terminal.
- Tema diferente do exemplo dado em aula.

## 3. Operações e modelo de estruturas (decisão da equipe)

| Operação | Estrutura | Justificativa |
|---|---|---|
| Depósitos, saques, transferências, pagamentos imediatos | Fila FIFO | Ordem de chegada |
| Pagamentos agendados | Fila ordenada por data, desempate FIFO | Executa primeiro o mais próximo |
| Estornos | Pilha LIFO de operações efetivadas | Desfaz a operação mais recente primeiro |
| Histórico | Lista encadeada | Registra todas as operações em ordem |

Ajustes aceitos:

- A pilha guarda operações efetivadas, não solicitações de estorno. Um estorno desempilha a última operação efetivada e reverte seu efeito. Motivo: manter o saldo consistente quando operações dependem umas das outras.
- Os agendados usam inserção ordenada (cada novo agendado é colocado na posição certa). Não usar `qsort()` em lote para isso.
- O histórico completo (todas as operações) é separado da pilha de efetivadas (só o que pode ser estornado).

## 4. Dados

- **Conta:** número, titular, saldo.
- **Pedido:** tipo (saque, depósito, transferência, pagamento), conta de origem, conta de destino (só na transferência), valor, data (só no agendado), situação.
- **Fila FIFO:** pedidos imediatos prontos para processar.
- **Fila de agendados:** pedidos com data futura, ordenados por data.
- **Pilha de efetivadas:** operações já efetivadas, com os dados necessários para desfazê-las (tipo, contas, valores e saldos anteriores).
- **Histórico:** lista encadeada com todas as operações.

## 5. Operações do sistema

- **Saque e pagamento imediato:** debitam a conta. Recusados se o saldo não cobrir o valor.
- **Depósito:** credita a conta.
- **Transferência:** debita a origem e credita o destino. Tudo ou nada: se qualquer parte falhar, nenhum saldo muda.
- **Agendar pagamento:** insere o pedido na fila de agendados, na posição pela data.
- **Avançar data simulada:** move o tempo e envia para a fila FIFO os agendados cuja data chegou.
- **Estorno:** desempilha a última operação efetivada e reverte seu efeito.
- **Histórico:** imprime todas as operações na ordem em que aconteceram.

## 6. Regras de negócio e casos-limite

Regras confirmadas pela equipe ou necessárias para o escopo:

- Saldo insuficiente em saque, pagamento ou transferência: pedido recusado, sem alterar saldos.
- Pedido recusado não entra na pilha de efetivadas.
- Estorno com pilha vazia: nada muda e o sistema informa.
- Estorno de pagamento agendado ainda não executado: cancela o agendamento e não passa pela pilha.
- Agendamento com data já passada: recusado.
- Valor zero ou negativo: recusado.
- Conta inexistente: recusado.
- Transferência para a mesma conta: recusada.

Regras confirmadas pela equipe em 30/10/2026 (ver `processo-ia.md`, Iteração 2; fila FIFO em vetor circular):

- Estorno de depósito quando o saldo já foi usado: recusar e manter a operação na pilha, para a conta não ficar negativa sem regra.
- Data simulada: avançada por comando, e não pelo relógio real, para a demonstração ser reproduzível.

## 7. Etapas de implementação

Implementar em incrementos pequenos. A cada etapa: explicar as funções e decisões, criar testes com resultados previstos à mão antes de rodar, e registrar a iteração no `processo-ia.md`.

**Etapa 0. Esqueleto do projeto.** Pastas, arquivos-fonte e comando de compilação com `gcc`. Teste: o programa compila e imprime uma mensagem.

**Etapa 1. Modelos.** `struct` para conta, pedido e tipo de operação (`enum`). Teste: criar duas contas e exibi-las.

**Etapa 2. Fila FIFO.** Funções `enfileirar`, `desenfileirar` e `fila_vazia`.
- Escolha pendente: implementação em vetor circular (recomendado, mais simples para iniciantes) ou lista encadeada.
- Teste: a ordem de saída é a mesma de entrada.

**Etapa 3. Depósito, saque e pagamento imediato.** Com a regra de saldo.
- Teste: saque acima do saldo é recusado e não altera o saldo.

**Etapa 4. Transferência tudo ou nada.** Debita a origem e credita o destino, revertendo se a segunda parte falhar.
- Teste: uma falha não altera nenhum dos saldos.

**Etapa 5. Pilha de efetivadas e estorno LIFO.** Funções `empilhar`, `desempilhar` e `topo`. Estorno desfaz a operação mais recente.
- Teste: após depósito, saque e estorno, o saldo volta ao valor de antes do saque.
- Casos-limite: pilha vazia; pedido recusado não entra na pilha.

**Etapa 6. Agendados.** Fila ordenada por data com inserção ordenada, desempate FIFO. Avanço da data simulada envia os vencidos para a fila FIFO.
- Teste: agendados saem na ordem de data, e agendados de mesma data saem na ordem de chegada.

**Etapa 7. Histórico em lista encadeada.** Inserção no fim e impressão de todas as operações.
- Teste: o histórico imprime na ordem de ocorrência.

**Etapa 8. Menu no terminal e testes.** Menu interativo com as operações. Conjunto de testes automatizados, com a previsão de resultado escrita antes da execução.

**Etapa 9. Slides e roteiro.** Cinco slides para o professor (problema, estruturas, demonstração, casos-limite, o que aprendemos) e roteiro de 15 minutos.

## 8. Como trabalhar (combinado com a equipe)

- Antes de implementar, perguntar à equipe nas escolhas pendentes e aguardar a resposta.
- Explicar cada função e cada decisão de forma compatível com nível iniciante.
- Quem está usando o código precisa conseguir explicar LIFO e FIFO e o caminho de cada operação no código.
- Manter o `processo-ia.md` atualizado a cada iteração: solicitação, solução proposta, alteração, motivo e resultado.
- Não incluir senhas ou credenciais no repositório nem no registro.
