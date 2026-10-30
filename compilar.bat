@echo off
rem Compila o programa (banco.exe) e os testes (testes.exe).
gcc -Wall -Wextra -o banco.exe src\modelos.c src\fila.c src\banco.c src\pilha.c src\agendados.c src\historico.c src\sistema.c src\main.c
if errorlevel 1 exit /b 1
gcc -Wall -Wextra -Isrc -o testes.exe testes\testes.c src\modelos.c src\fila.c src\banco.c src\pilha.c src\agendados.c src\historico.c src\sistema.c
if errorlevel 1 exit /b 1
echo Compilado: banco.exe e testes.exe
