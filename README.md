# EP Pilhas e Filas: processamento de transações bancárias em C

Demonstração interativa no terminal. Clientes do banco pedem **depósito, saque, transferência e
pagamento** (imediato ou agendado) e podem **estornar** a última operação efetivada.

| Estrutura | Onde | Por quê |
|---|---|---|
| **Fila (FIFO)** | pedidos imediatos (`src/fila.c`) | quem pediu primeiro é atendido primeiro. A ordem decide quem fica sem saldo quando dois pedidos disputam o mesmo dinheiro |
| **Pilha (LIFO)** | operações efetivadas (`src/pilha.c`) | o estorno desfaz a **última** efetivada. Desfazer sempre a mais recente evita desmontar uma operação de que outras ainda dependem; se o dinheiro já foi usado, o estorno é recusado |
| **Vetor + `qsort`** | pagamentos agendados (`src/agendados.c`) | ordenados por data. Como o `qsort` não é estável, o **número de entrada** desempata datas iguais (mantém FIFO) |
| **Lista encadeada** | histórico (`src/historico.c`) | cresce sem limite fixo; cada registro é criado com `malloc` e liberado com `free` |

## Compilar

Precisa do `gcc` (no Windows: MinGW/WinLibs).

**Windows:**
```
compilar.bat      gera banco.exe e os 4 executáveis de teste
testar.bat        roda todos os testes
banco.exe         abre o menu
```

**Linux/macOS:** `make`, `make testes`, `./banco`

**Comando manual (qualquer sistema):**
```
gcc -Wall -Wextra -std=c99 -Isrc src/operacao.c src/pilha.c src/fila.c src/agendados.c src/historico.c src/sistema.c src/entrada.c src/main.c -o banco
```

## Usar

O programa começa em **05/11/2026** com três contas: **1 Ana (R$ 500)**, **2 Bruno (R$ 200)** e
**3 Carla (R$ 50)**.

| Opção | O que faz |
|---|---|
| 1 a 4 | Depósito, saque, transferência, pagamento imediato: o pedido entra no **fim da fila** |
| 5 | Processa o **primeiro** da fila: se houver saldo, efetiva e **empilha**; senão, recusa |
| 6 | Processa a fila inteira, em ordem |
| 7 | **Estorna** o topo da pilha (a última efetivada). Pilha vazia → "Nada a estornar." |
| 8 | Agenda um pagamento para uma data **futura** (`DD/MM/AAAA`) |
| 9 | Cancela um agendado que ainda não executou |
| 10 | Avança a data simulada e executa os agendados vencidos, em ordem |
| 11 | Mostra contas, fila, pilha e agenda |
| 12 | Histórico (de todas as contas ou de uma) |
| 0 | Sai (libera a memória do histórico) |

Valores aceitam `150`, `150.50` ou `150,50`. Entradas inválidas repetem a pergunta.

**Demonstração automática** (sem digitar nada):
```
banco.exe < demo\entrada-demo.txt
```
A saída esperada está em `demo/saida-demo.txt`.

## Simulador animado (site)

`slides/simulador.html` mostra as estruturas funcionando passo a passo: a ficha entra na fila,
sai pelo início, vira a variável `op`, vai para o topo da pilha, a agenda se reordena com o
`qsort` e cada nó é ligado no fim da lista. Ao lado aparecem a linha de C que está rodando e a
mesma saída que o `banco.exe` imprimiria.

- **Rodar a demonstração**: o mesmo roteiro de `demo/entrada-demo.txt`, animado.
- **Estorno impossível**: um agendado gasta o depósito e o estorno é recusado.
- Pedidos livres pelos formulários (inclusive os casos extremos), velocidade 0,5× a 2× e
  **modo passo a passo**.

O motor do simulador (`slides/js/banco.js`) é um espelho em JavaScript de `src/sistema.c`.
`node testes/teste_simulador.mjs` confere que ele imprime exatamente as mesmas linhas do
`banco.exe` no roteiro da demonstração e testa os casos extremos (25 verificações).

**Vídeo:** `slides/midia/banco-ep.mp4` mostra a demonstração inteira em capítulos (fila, pilha,
agenda, histórico). Ele é o próprio simulador em "modo filme" (`slides/simulador.html?filme`,
que também roda ao vivo no navegador), gravado quadro a quadro. Para regravar, com `ffmpeg` e
Chrome instalados: `cd ferramentas`, `npm install`, `node gravar-video.mjs`.

Para abrir localmente: `python -m http.server -d slides` e acesse `http://localhost:8000`.
Nos slides: setas para navegar, `O` para a visão geral, `S` para o simulador.

## Casos extremos tratados

| Caso | Comportamento | Teste |
|---|---|---|
| Estorno sem nada efetivado (pilha vazia) | "Nada a estornar." | `teste_pilha`, `teste_sistema` §1 |
| Saldo insuficiente | pedido recusado e registrado no histórico; saldo não muda | `teste_sistema` §3 |
| Dois pedidos disputando o saldo | o primeiro da fila leva; o segundo é recusado | `teste_sistema` §3 |
| Agendados com a mesma data | executam na ordem de entrada (desempate do `qsort`) | `teste_agendados`, `teste_sistema` §5 |
| Agendado para hoje ou para o passado | recusado (use pagamento imediato) | `teste_sistema` §5 |
| Cancelar agendado já executado | "não há pagamento agendado com esse número" | `teste_sistema` §5 |
| Estorno quando o dinheiro já foi usado (ex.: um agendado gastou o depósito) | estorno recusado; a operação volta ao topo e nada muda | `teste_sistema` §6 |
| Conta inexistente (inclusive conta 0), valor ≤ 0, acima de R$ 1.000.000 ou `nan`, transferência para a mesma conta | recusado antes de entrar na fila | `teste_sistema` §2 |
| Fila / pilha / agenda cheias | mensagem de limite; nada é perdido | `teste_fila`, `teste_pilha` |

## Arquivos

| Arquivo | Conteúdo |
|---|---|
| `src/operacao.h/.c` | struct `Operacao` (a "ficha" de cada operação) e impressão |
| `src/pilha.h/.c` | pilha LIFO em vetor: `empilhar`, `desempilhar`, `pilhaVazia` |
| `src/fila.h/.c` | fila FIFO em vetor circular: `enfileirar`, `desenfileirar`, `filaVazia` |
| `src/agendados.h/.c` | agenda ordenada com `qsort` e `compararAgendados` (data, depois número) |
| `src/historico.h/.c` | lista encadeada com `malloc`/`free` |
| `src/sistema.h/.c` | contas e regras: caminho de cada operação pelas estruturas |
| `src/entrada.h/.c` | leitura segura do teclado (`fgets` + `sscanf`) |
| `src/main.c` | menu |
| `testes/` | 4 programas de teste (62 verificações) |
| `demo/` | roteiro da demonstração e saída esperada |
| `processo-ia.md` | diário das iterações com a IA |
| `slides/index.html` | slides da apresentação, com mini animações de cada estrutura |
| `slides/simulador.html` | simulador animado (`js/banco.js` = motor, `js/simulador.js` = tela) |
| `slides/midia/banco-ep.mp4` | vídeo da demonstração (`js/filme.js` = roteiro, `ferramentas/gravar-video.mjs` = gravador) |
| `testes/teste_simulador.mjs` | confere o motor JS contra a saída real do `banco.exe` |
