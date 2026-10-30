# EP Pilhas e Filas — Sistema bancário em C

Sistema de linha de comando que processa pedidos bancários em **fila (FIFO)** e guarda as operações efetivadas em uma **pilha (LIFO)** para estorno. Pagamentos agendados esperam em uma fila ordenada por data, e tudo fica registrado em um histórico.

## Compilar e rodar (Windows)

Requer `gcc` (instalado: WinLibs, gcc 16.2.0).

```
compilar.bat          (gera banco.exe e testes.exe)
banco.exe             (menu interativo)
testes.exe            (63 testes automatizados)
banco.exe < demo\demo.txt   (demonstração completa, sem digitar)
```

Comando manual (qualquer sistema):

```
gcc -Wall -Wextra -o banco src/*.c
gcc -Wall -Wextra -Isrc -o testes testes/testes.c src/modelos.c src/fila.c src/banco.c src/pilha.c src/agendados.c src/historico.c src/sistema.c
```

## Como usar

O programa começa em 13/11/2026 com três contas: 1 Ana Souza (R$ 1000,00), 2 Bruno Lima (R$ 250,50), 3 Carla Dias (R$ 50,00).

| Opção | O que faz |
|---|---|
| 1 | Lista as contas |
| 2–5 | Depósito, saque, pagamento imediato, transferência: o pedido entra no **fim da fila** |
| 6 | Agenda um pagamento para uma data futura (`dd/mm/aaaa`) |
| 7 | Processa a fila **na ordem de chegada**; efetivados vão para a pilha |
| 8 | Avança a data simulada; agendados vencidos entram na fila |
| 9 | Estorna a operação do **topo da pilha** (a mais recente) |
| 10 | Cancela um pagamento ainda agendado |
| 11 | Mostra fila, agendados e pilha |
| 12 | Histórico completo |
| 0 | Sai |

Valores aceitam `150`, `150,50` ou `150.50`.

## Onde está cada parte

| Arquivo | Conteúdo |
|---|---|
| `src/fila.h`, `src/fila.c` | **Fila FIFO** em vetor circular: `enfileirar`, `desenfileirar`, `fila_vazia` |
| `src/pilha.h`, `src/pilha.c` | **Pilha LIFO** em lista encadeada: `empilhar`, `desempilhar`, `topo` |
| `src/agendados.h`, `src/agendados.c` | Fila de agendados com **inserção ordenada** por data (desempate FIFO) |
| `src/historico.h`, `src/historico.c` | Histórico em lista encadeada (inserção no fim) |
| `src/banco.h`, `src/banco.c` | Regras: depósito, saque, pagamento, transferência tudo ou nada, reversão |
| `src/sistema.h`, `src/sistema.c` | Caminho de cada operação pelas estruturas |
| `src/modelos.h`, `src/modelos.c` | Conta, Pedido, Data, conversão de valores |
| `src/main.c` | Menu e leitura do teclado |
| `testes/testes.c` | Testes automatizados com resultados previstos à mão |
| `demo/demo.txt` | Entrada da demonstração |
| `slides/index.html` | Slides para o professor (abrir no navegador; setas trocam o slide) |
| `roteiro.md` | Roteiro de 15 min e respostas para perguntas |
| `ensaio.md` | Texto falado, plano de treino, simulação de perguntas e plano B |
| `explicacao-codigo.md` | Explicação de cada arquivo e função, para estudo da equipe |

Registro do uso de IA: `processo-ia.md`. Plano da equipe: `PLANO-EP-pilhas-filas.md`.
