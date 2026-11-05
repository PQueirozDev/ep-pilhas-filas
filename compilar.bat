@echo off
rem Compila o programa (banco.exe) e os testes (teste_*.exe) com gcc.
set MODULOS=src\operacao.c src\pilha.c src\fila.c src\agendados.c src\historico.c src\sistema.c src\entrada.c
set FLAGS=-Wall -Wextra -std=c99 -Isrc -Itestes

gcc %FLAGS% %MODULOS% src\main.c -o banco.exe || goto erro
for %%t in (pilha fila agendados sistema) do (
    gcc %FLAGS% %MODULOS% testes\teste_%%t.c -o teste_%%t.exe || goto erro
)
echo Compilado: banco.exe, teste_pilha.exe, teste_fila.exe, teste_agendados.exe, teste_sistema.exe
exit /b 0

:erro
echo ERRO na compilacao.
exit /b 1
