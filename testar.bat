@echo off
rem Roda todos os testes automatizados (compile antes com compilar.bat).
set FALHOU=0
for %%t in (pilha fila agendados sistema) do (
    echo ===== teste_%%t =====
    .\teste_%%t.exe || set FALHOU=1
    echo.
)
if %FALHOU%==1 (echo ALGUM TESTE FALHOU & exit /b 1)
echo TODOS OS TESTES PASSARAM
