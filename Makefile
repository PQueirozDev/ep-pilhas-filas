# Para Linux/macOS (ou Windows com make): "make", "make testes", "make demo"
CC      = gcc
CFLAGS  = -Wall -Wextra -std=c99 -Isrc -Itestes
MODULOS = src/operacao.c src/pilha.c src/fila.c src/agendados.c src/historico.c src/sistema.c src/entrada.c
TESTES  = teste_pilha teste_fila teste_agendados teste_sistema

all: banco $(TESTES)

banco: $(MODULOS) src/main.c src/*.h
	$(CC) $(CFLAGS) $(MODULOS) src/main.c -o banco

teste_%: testes/teste_%.c $(MODULOS) src/*.h testes/verificar.h
	$(CC) $(CFLAGS) $(MODULOS) $< -o $@

testes: $(TESTES)
	@for t in $(TESTES); do ./$$t || exit 1; done

demo: banco
	./banco < demo/entrada-demo.txt

clean:
	rm -f banco $(TESTES) *.exe

.PHONY: all testes demo clean
