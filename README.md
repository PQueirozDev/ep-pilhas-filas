# EP Pilhas e Filas: processamento de transações bancárias em C

Projeto acadêmico de Algoritmos que demonstra **filas, pilhas, ordenação e vetores**
por meio de um sistema bancário em C. Clientes pedem depósito, saque, transferência e pagamento
(imediato ou agendado) e podem estornar a última operação efetivada.

Explore o programa pelo terminal ou acompanhe as estruturas no simulador web, com animações,
explicações de cada passo e trechos do código C.

**[Apresentação online](https://ep-pilhas-filas.vercel.app/)** ·
**[Simulador interativo](https://ep-pilhas-filas.vercel.app/simulador.html)** ·
**[Assistir ao vídeo](https://ep-pilhas-filas.vercel.app/midia/banco-ep.mp4)**

[![Prévia da demonstração animada](slides/midia/banco-ep-capa.jpg)](https://ep-pilhas-filas.vercel.app/midia/banco-ep.mp4)

## Começo rápido (Windows)

```powershell
git clone https://github.com/PQueirozDev/ep-pilhas-filas.git
cd ep-pilhas-filas
.\compilar.bat                              # gera banco.exe e os testes
.\testar.bat                                # 72 verificações em C
cmd /c "banco.exe < demo\entrada-demo.txt"  # demonstração automática
.\banco.exe                                 # uso interativo
```

Requisito: `gcc` no `PATH` (MinGW/WinLibs). Linux/macOS: `make && make testes && ./banco`.

## Como as estruturas trabalham juntas

Um pedido imediato entra na **fila**. Ao processá-lo, o sistema verifica o saldo: operações
efetivadas vão para a **pilha de estornos**, e o resultado fica no **histórico**.
Pagamentos agendados seguem outro caminho: aguardam na **agenda ordenada** até o avanço da data
e são registrados no histórico ao executar. **Agendados não entram na pilha de estornos.**

| Estrutura | Onde | Por quê |
|---|---|---|
| **Fila (FIFO)** | pedidos imediatos (`src/fila.c`) | quem pediu primeiro é atendido primeiro. A ordem decide quem fica sem saldo quando dois pedidos disputam o mesmo dinheiro |
| **Pilha (LIFO)** | operações imediatas efetivadas (`src/pilha.c`) | o estorno tenta desfazer a **última** empilhada; se o dinheiro necessário já foi usado, o estorno é recusado |
| **Vetor + ordenação por inserção** | pagamentos agendados (`src/agendados.c`) | ordenados por data; o **número de entrada** desempata datas iguais (mantém FIFO) |
| **Vetor de registros** | histórico (`src/historico.c`) | cada evento ocupa a próxima posição livre; capacidade de 1.000 registros |

### Custo das operações

| Operação | Função | Complexidade |
|---|---|---|
| Entrar na fila / sair da fila | `enfileirar`, `desenfileirar` | O(1): índice circular com `%`, sem deslocar itens |
| Empilhar / desempilhar | `empilhar`, `desempilhar` | O(1) |
| Agendar pagamento | `agendar` + `ordenarAgenda` | O(n): o vetor já está ordenado, o novo item anda até sua posição |
| Cancelar agendado / retirar vencido | `cancelarAgendado`, `retirarVencido` | O(n): busca e deslocamento no vetor |
| Registrar no histórico | `registrarHistorico` | O(1): próxima posição livre |

| Limite | Valor | Onde |
|---|---|---|
| Fila de pedidos | 50 | `CAPACIDADE_FILA` em `src/fila.h` |
| Pilha de estornos | 100 | `CAPACIDADE_PILHA` em `src/pilha.h` |
| Agenda | 50 | `CAPACIDADE_AGENDA` em `src/agendados.h` |
| Histórico | 1.000 | `CAPACIDADE_HISTORICO` em `src/historico.h` |

### Implementação sem ponteiros explícitos

As funções acessam um único `Sistema banco` global, com vetores e índices. Não há declarações
de ponteiros, uso de `->`, passagem de endereços com `&`, alocação dinâmica ou `qsort` nos fontes
do trabalho. As funções que removem operações devolvem uma `Operacao` por valor;
`numero == 0` indica que não havia operação disponível. A busca de conta devolve seu índice,
ou `-1` quando ela não existe.

Essa organização atende à versão didática com um banco por execução. Textos continuam sendo
vetores de caracteres; as bibliotecas padrão de C recebem esses vetores conforme suas APIs.
Quando o histórico fica cheio, comandos que precisam registrar eventos são recusados antes
de alterar saldos, fila, pilha ou agenda. O avanço da data exige espaço para todos os vencidos.

## Compilar

Execute os comandos na raiz do repositório. É necessário ter `gcc` no `PATH`
(no Windows, por exemplo, via MinGW/WinLibs). Em Linux/macOS, os atalhos também usam `make`.

**Windows (PowerShell ou Prompt de Comando):**
```powershell
.\compilar.bat
.\testar.bat
.\banco.exe
```

O primeiro comando gera o programa e os quatro executáveis de teste; o segundo executa os testes.

**Linux/macOS:**

```sh
make
make testes
./banco
```

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
| 0 | Sai (zera o contador do histórico) |

Valores aceitam `150`, `150.50` ou `150,50`. Entradas inválidas repetem a pergunta.

**Demonstração automática** (sem digitar nada, no Prompt de Comando do Windows):
```bat
banco.exe < demo\entrada-demo.txt
```
No PowerShell, use `cmd /c "banco.exe < demo\entrada-demo.txt"`. Em Linux/macOS, use `make demo`.
A saída esperada está em [demo/saida-demo.txt](demo/saida-demo.txt).

Para observar o FIFO manualmente, peça dois saques da conta **3 (Carla)**: primeiro R$ 40,
depois R$ 30. Processe a fila com a opção **6**: o primeiro será efetivado e o segundo recusado,
pois restarão R$ 10. Use a opção **7** para estornar o saque efetivado e devolver o saldo a R$ 50.

## Simulador animado (site)

`slides/simulador.html` mostra as estruturas funcionando passo a passo: a ficha entra na fila,
sai pelo início, vira a variável `op`, vai para o topo da pilha, a agenda se ordena por
inserção e cada registro ocupa uma posição do vetor do histórico. Ao lado aparecem a linha de C que está rodando e a
mesma saída que o `banco.exe` imprimiria.

- **Rodar a demonstração**: o mesmo roteiro de `demo/entrada-demo.txt`, animado.
- **Estorno impossível**: um agendado gasta o depósito e o estorno é recusado.
- Pedidos livres pelos formulários (inclusive os casos extremos), velocidade 0,5× a 2× e
  **modo passo a passo**.

O motor do simulador (`slides/js/banco.js`) é um espelho em JavaScript de `src/sistema.c`.
`node testes/teste_simulador.mjs` confere que ele imprime exatamente as mesmas linhas do
`banco.exe` no roteiro da demonstração e testa os casos extremos (32 verificações).

**Vídeo:** [slides/midia/banco-ep.mp4](slides/midia/banco-ep.mp4) mostra a demonstração inteira em capítulos (fila, pilha,
agenda, histórico). Ele é o próprio simulador em "modo filme" (`slides/simulador.html?filme`,
que também roda ao vivo no navegador), gravado quadro a quadro: **aproximadamente 2min26s, Full HD, 60 fps**.

### Abrir o site localmente

Com Python instalado, execute na raiz do repositório:

```sh
python -m http.server 8000 --bind 127.0.0.1 --directory slides
```

Acesse [os slides](http://127.0.0.1:8000/) ou [o simulador](http://127.0.0.1:8000/simulador.html).
Nos slides, use **← / →** para navegar, **O** para a visão geral e **S** para o simulador.
O site usa fontes e ícones externos; a aparência completa depende de conexão à internet.

### Regravar o vídeo

Requer Node.js com npm, Chrome instalado e `ffmpeg` no `PATH`. Execute:

```sh
cd ferramentas
npm ci
npm run previa
npm run gravar
```

`previa` gera apenas os primeiros 20 segundos em `ferramentas/previa.mp4`;
`gravar` gera o filme completo em `slides/midia/banco-ep.mp4`.
Se o Chrome não for encontrado, defina a variável de ambiente `CHROME` com o caminho do executável.

## Testes e validação

| Conjunto | Como executar | Cobertura |
|---|---|---|
| C | `make testes` ou `.\testar.bat` após compilar | 72 verificações em quatro programas: estruturas, validações, saldo, estorno, agenda e histórico cheio |
| JavaScript | `node testes/teste_simulador.mjs` | 32 verificações: roteiro, casos extremos, fila circular, histórico cheio e passos da animação |
| Terminal | `node testes/teste_terminal.mjs` após compilar | 12 verificações: execução real da demonstração, entradas inválidas e ausência de ponteiros explícitos nos fontes |

O teste JavaScript usa Node.js e não precisa instalar dependências. Ele compara **19 linhas**
do roteiro com a saída de referência do programa em C, além de conferir saldos e estruturas finais.

Após editar os fontes C, execute `node ferramentas/sincronizar-codigo.mjs` para atualizar os
trechos exibidos no painel do simulador. Para verificar a interface em desktop e celular,
inicie o servidor local e execute `npm run verificar` na pasta `ferramentas` após `npm ci`.

## Casos extremos tratados

| Caso | Comportamento | Teste |
|---|---|---|
| Estorno sem nada efetivado (pilha vazia) | "Nada a estornar." | `teste_pilha`, `teste_sistema` §1 |
| Saldo insuficiente | pedido recusado e registrado no histórico; saldo não muda | `teste_sistema` §3 |
| Dois pedidos disputando o saldo | o primeiro da fila leva; o segundo é recusado | `teste_sistema` §3 |
| Agendados com a mesma data | executam na ordem de entrada (data, depois número) | `teste_agendados`, `teste_sistema` §5 |
| Agendado para hoje ou para o passado | recusado (use pagamento imediato) | `teste_sistema` §5 |
| Cancelar agendado já executado | "não há pagamento agendado com esse número" | `teste_sistema` §5 |
| Estorno quando o dinheiro já foi usado (ex.: um agendado gastou o depósito) | estorno recusado; a operação volta ao topo e nada muda | `teste_sistema` §6 |
| Conta inexistente (inclusive conta 0), valor ≤ 0, acima de R$ 1.000.000 ou `nan`, transferência para a mesma conta | recusado antes de entrar na fila | `teste_sistema` §2 |
| Fila / pilha / agenda cheias | mensagem de limite; nada é perdido | `teste_fila`, `teste_pilha` |
| Histórico cheio | comandos que precisam de registro são recusados antes de alterar o banco | `teste_sistema` §8, `teste_simulador.mjs` §6 |

## Arquivos

| Arquivo | Conteúdo |
|---|---|
| `src/operacao.h/.c` | struct `Operacao` (a "ficha" de cada operação) e impressão |
| `src/pilha.h/.c` | pilha LIFO em vetor: `empilhar`, `desempilhar`, `pilhaVazia` |
| `src/fila.h/.c` | fila FIFO em vetor circular: `enfileirar`, `desenfileirar`, `filaVazia` |
| `src/agendados.h/.c` | agenda em vetor com ordenação por inserção (data, depois número) |
| `src/historico.h/.c` | histórico em vetor de 1.000 registros |
| `src/sistema.h/.c` | contas e regras: caminho de cada operação pelas estruturas |
| `src/entrada.h/.c` | leitura por caracteres e validação por índices, sem `scanf` |
| `src/main.c` | menu |
| `testes/` | quatro programas de teste em C e o teste do motor JavaScript |
| `demo/` | roteiro da demonstração e saída esperada |
| `processo-ia.md` | diário das iterações com a IA |
| `slides/index.html` | slides da apresentação, com mini animações de cada estrutura |
| `slides/simulador.html` | simulador animado (`js/banco.js` = motor, `js/simulador.js` = tela) |
| `slides/midia/banco-ep.mp4` | vídeo da demonstração (`js/filme.js` = roteiro, `ferramentas/gravar-video.mjs` = gravador) |
| `testes/teste_simulador.mjs` | confere o motor JS contra a saída real do `banco.exe` |
| `testes/teste_terminal.mjs` | testa a entrada do programa compilado e confere os fontes |
| `ferramentas/sincronizar-codigo.mjs` | atualiza o painel do simulador com o código C atual |
| `ferramentas/verificar-site.mjs` | confere slides e simulador no Chrome em desktop e celular |

## Processo de desenvolvimento

O [diário de uso de IA](processo-ia.md) registra os pedidos, as decisões de implementação,
as revisões e os resultados das validações. O programa em C está em `src/`; o motor
JavaScript e a interface da apresentação estão em `slides/`.
