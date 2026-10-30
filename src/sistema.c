/*
 * sistema.c
 * Caminho de cada operação pelas estruturas.
 */
#include <stddef.h>
#include "sistema.h"

void sistema_iniciar(Sistema *s, Data hoje) {
    banco_iniciar(&s->banco);
    fila_iniciar(&s->fila);
    agendados_iniciar(&s->agendados);
    pilha_iniciar(&s->pilha);
    historico_iniciar(&s->historico);
    s->hoje = hoje;
    s->proximo_id = 1;
}

void sistema_liberar(Sistema *s) {
    agendados_liberar(&s->agendados);
    pilha_liberar(&s->pilha);
    historico_liberar(&s->historico);
}

/* Registra no histórico com a data simulada de hoje. */
static void registrar(Sistema *s, const Pedido *p, const char *descricao) {
    historico_registrar(&s->historico, s->hoje, p, descricao);
}

/*
 * Pedido imediato: valida o que não depende do saldo e entra no FIM da fila.
 * O saldo só é conferido no processamento, porque depende dos pedidos
 * que estão na frente dele.
 */
Resultado sistema_solicitar(Sistema *s, TipoOperacao tipo, int origem, int destino,
                            long valor, int *id_gerado) {
    Pedido p = {0};
    p.id = s->proximo_id++;
    p.tipo = tipo;
    p.conta_origem = origem;
    p.conta_destino = destino;
    p.valor = valor;
    p.agendado = 0;
    p.situacao = SIT_PENDENTE;
    *id_gerado = p.id;

    Resultado r = validar_pedido(&s->banco, &p);
    if (r == RES_OK && !enfileirar(&s->fila, p)) {
        r = RES_FILA_CHEIA;
    }
    if (r != RES_OK) {
        p.situacao = SIT_RECUSADO;
        registrar(s, &p, mensagem_resultado(r));
    }
    return r;
}

/* Pagamento agendado: entra na lista de agendados, na posição pela data. */
Resultado sistema_agendar(Sistema *s, int conta, long valor, Data data, int *id_gerado) {
    Pedido p = {0};
    p.id = s->proximo_id++;
    p.tipo = OP_PAGAMENTO;
    p.conta_origem = conta;
    p.valor = valor;
    p.agendado = 1;
    p.data = data;
    p.situacao = SIT_PENDENTE;
    *id_gerado = p.id;

    Resultado r = validar_pedido(&s->banco, &p);
    if (r == RES_OK && !data_valida(data)) {
        r = RES_DATA_INVALIDA;
    }
    if (r == RES_OK && data_comparar(data, s->hoje) <= 0) {
        r = RES_DATA_PASSADA;
    }
    if (r == RES_OK && !agendados_inserir(&s->agendados, p)) {
        r = RES_SEM_MEMORIA;
    }

    if (r == RES_OK) {
        registrar(s, &p, "agendado");
    } else {
        p.situacao = SIT_RECUSADO;
        registrar(s, &p, mensagem_resultado(r));
    }
    return r;
}

/*
 * Tira o PRIMEIRO da fila (FIFO) e executa.
 * Só o que foi efetivado vai para a pilha: pedido recusado não pode ser estornado.
 */
int sistema_processar_proximo(Sistema *s, Pedido *processado, Resultado *resultado) {
    Pedido p;
    if (!desenfileirar(&s->fila, &p)) {
        return 0;
    }

    OperacaoEfetivada registro;
    Resultado r = processar_pedido(&s->banco, &p, &registro);

    if (r == RES_OK && !empilhar(&s->pilha, registro)) {
        /* Sem memória para guardar o estorno: desfaz, para não ficar
           uma operação que não poderia mais ser estornada. */
        reverter_operacao(&s->banco, &registro);
        p.situacao = SIT_RECUSADO;
        r = RES_SEM_MEMORIA;
    }

    registrar(s, &p, mensagem_resultado(r));
    *processado = p;
    *resultado = r;
    return 1;
}

/*
 * Avança a data simulada. Os agendados com data <= hoje saem da lista na
 * ordem dela (data, depois chegada) e entram no fim da fila FIFO.
 * Se a fila encher, os que sobraram continuam agendados para a próxima vez.
 */
int sistema_avancar_data(Sistema *s, int dias) {
    Data nova = data_somar_dias(s->hoje, dias);
    if (!data_valida(nova)) {
        return -1;   /* passaria do ano 9999: a data não muda */
    }
    s->hoje = nova;

    int movidos = 0;
    Pedido p;
    while (!fila_cheia(&s->fila) && agendados_retirar_vencido(&s->agendados, s->hoje, &p)) {
        enfileirar(&s->fila, p);
        movidos++;
    }
    return movidos;
}

/*
 * Estorno LIFO: olha o topo, tenta desfazer e só então desempilha.
 * Se o estorno for recusado, a operação continua no topo.
 */
Resultado sistema_estornar(Sistema *s, OperacaoEfetivada *estornada) {
    const OperacaoEfetivada *t = topo(&s->pilha);
    if (t == NULL) {
        return RES_NADA_A_ESTORNAR;   /* pilha vazia: nada muda */
    }

    Resultado r = reverter_operacao(&s->banco, t);
    if (r != RES_OK) {
        registrar(s, &t->pedido, mensagem_resultado(r));
        return r;
    }

    desempilhar(&s->pilha, estornada);
    estornada->pedido.situacao = SIT_ESTORNADO;
    registrar(s, &estornada->pedido, "estornado (operação desfeita)");
    return RES_OK;
}

/* Agendado que ainda não executou: só sai da lista, não passa pela pilha. */
Resultado sistema_cancelar_agendamento(Sistema *s, int id) {
    Pedido p;
    if (!agendados_cancelar(&s->agendados, id, &p)) {
        return RES_NAO_ENCONTRADO;
    }
    p.situacao = SIT_CANCELADO;
    registrar(s, &p, "agendamento cancelado");
    return RES_OK;
}
