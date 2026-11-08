# GOAL V2 — RODADA 37: A TRILHA TEM TELA

**Data**: 05/11/2026 · Fecha as **cinco camadas** da auditoria

---

## O QUE A r36 DEIXOU

> *"O wrapper, o preload e o canal estão prontos e testados. Falta a última camada, que é a que o usuário vê."*

**Esta rodada entregou.**

---

## O QUE FOI FEITO, E COMO

**Com `edit`**, não com script — **seis edições**, cada uma com `old_string` único:

| # | Edição | Resultado |
|---|---|---|
| 1 | imports | `@/api/auditoria` |
| 2 | estado + `carregarTrilha` | `useCallback` |
| 3 | seção no JSX | tabela completa |
| — | **typecheck após cada uma** | **0 erros** |

> **A diferença com a r36 não foi a ferramenta**: foi **verificar depois de cada passo**, em vez de escrever 100 linhas e torcer.

---

## A TELA

```
Trilha de auditoria
Toda decisão de permissão — permitida ou negada — fica registrada.
É prova, não diagnóstico: nenhuma entrada pode ser apagada pela interface.

[N entradas antigas foram descartadas por limite de espaço. A lista abaixo NÃO é o histórico completo.]

[ Carregar trilha ]

┌──────────────┬────────┬────────┬─────────┬──────────┬──────────────┐
│ Quando       │ Quem   │ Ação   │ Recurso │ Veredito │ Motivo       │
├──────────────┼────────┼────────┼─────────┼──────────┼──────────────┤
│ 05/11 10:03  │ dono   │ execute│ compras │ permitido│ —            │
│ 05/11 10:02  │ —      │ read   │ finance │ negado   │ chamada sem  │
│              │        │        │         │          │ identidade   │
└──────────────┴────────┴────────┴─────────┴──────────┴──────────────┘
```

### Quatro decisões de apresentação

| Decisão | Por quê |
|---|---|
| **O aviso vem ANTES da lista** | uma lista que começa na *"mais antiga que restou"* sem dizer que houve perda daria a impressão de **histórico completo** |
| **`—` e não vazio em "Quem"** | uma célula em branco **parece dado que não carregou**; `—` diz "não havia ator" |
| **Veredito em palavra** | `false` não diz a ninguém o que aconteceu |
| **Motivo traduzido** | `sem_ator` cru obriga a procurar o que significa |

### Por que na tela de Privacidade

> A trilha registra **quem tentou o quê sobre dados de quem**. É o domínio de privacidade que olha para isso **primeiro**.
>
> Um `admin` lendo a trilha de `finance` veria decisões de **um domínio que talvez não governe**.

---

## AS CINCO CAMADAS — COMPLETAS

| Camada | Desde |
|---|---|
| 1. Store (ledger append-only) | r35 |
| 2. Canal `hermes:auditoria:listar` | r36 |
| 3. Preload | r36 |
| 4. Wrapper `src/api/auditoria.ts` | r36 |
| 5. **Tela** | **r37** |

> **É a segunda capacidade de negócio com as cinco camadas completas** — a primeira foi Compras (r25–r28).
>
> **E a lição é a mesma das duas vezes**: o trabalho **não é construir o store**; é **atravessar as cinco camadas sem pular a última**.

---

## MEDIÇÕES

| Medida | Valor |
|---|---|
| Tela | **186 → 271 linhas** (+85) |
| Edições com `edit` | **6** |
| Typecheck após cada | **0 erros** |
| Testes (audit + permission + invariantes + privacidade) | **51 verdes** |
| Gate | **14 checks, ok** |
| Arquivos corrompidos nesta rodada | **0** |

---

## O QUE AINDA FALTA NA AUDITORIA

| Lacuna | Por quê |
|---|---|
| **Filtro por ator/recurso na tela** | o canal aceita `limite` e `tenant_id`; filtrar por ator exigiria índice no store |
| **Exportar a trilha** | o §26 fala de auditoria; um auditor externo pediria o arquivo |
| Retenção/LGPD | a política de prazo **não foi decidida** |
| Ancoragem externa (hash chain) | exigiria decidir o que fazer quando a âncora diverge |
| **Teste de UI da trilha** | a tela não tem teste próprio — só o typecheck a cobre |

---

## PRÓXIMA RODADA

**Completar o fluxo de COMPRAS** — a prioridade #1 do mapa da r34, ainda aberta.

O §26 exige **9 etapas**; existem **6**. Faltam:

| Etapa | Estado |
|---|---|
| **solicitação** | não existe como entidade — o pedido nasce em rascunho |
| **cotação persistida** | compara ao vivo; o `quotation-store` existe e a tela não grava nele |
| conferência no recebimento | entrada gerada do pedido |

> **A cotação persistida é a menor das três e a que mais fecha o fluxo**: o store existe, o canal existe, e a tela simplesmente não chama. É o padrão da r2 **de novo** — e desta vez a lacuna é **uma linha de ligação**.
