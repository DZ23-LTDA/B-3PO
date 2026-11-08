# GOAL V2 — RODADA 7: PÓS-VENDA — O CASO QUE PARECIA PROTEGIDO

**Data**: 05/11/2026 · **Fase 2 — IPC** · 5 de 8 arquivos de domínio fechados

---

## O ACHADO DESTA RODADA

`after-sales-ipc.ts` é **o caso mais instrutivo do inventário**.

```ts
export interface AfterSalesDeps {
  actorOf: () => Promise<Actor | null>   // ← JÁ ESTAVA AQUI
  afterSales: AfterSalesStore
  sales: { ... }
}
```

**A dependência existia. O resolvedor era passado na montagem. E nenhum dos quatro handlers chamava `exigirAtor`.**

`erp-ipc.ts` já fazia `registerAfterSalesIpc(ipcMain, { actorOf: () => actorOf(), ... })`.

**O código parecia protegido.** Quem lesse a interface veria `actorOf` e assumiria que ele era consultado.

### Por que o ratchet não mentiu

O ratchet procura **`exigirAtor`** no texto, **não `actorOf`**:

```ts
return fonte.includes('withPermission') || fonte.includes('guardedHandler') || fonte.includes('exigirAtor')
```

> **Se ele olhasse `actorOf`, este arquivo teria passado desde a primeira medição** — e os quatro canais estariam abertos com o carimbo de "protegido".

**A presença do resolvedor não prova que ele é chamado.** Uma dependência injetada e não usada é pior que a ausência dela: com a ausência, o erro é visível.

---

## O QUE FOI FECHADO

| Canal | Ação | Por quê |
|---|---|---|
| `hermes:aftersales:list` | `read` | ver acompanhamentos |
| `hermes:aftersales:indicators` | `read` | ver métricas |
| **`hermes:aftersales:create`** | **`execute`** | **agenda contato com cliente** |
| **`hermes:aftersales:setStatus`** | **`execute`** | **`descartado` encerra o relacionamento** |

> **`descartado` encerra o acompanhamento**: a venda deixa de contar como pendente e **ninguém mais vai contatar o cliente**. É uma decisão sobre relacionamento, não leitura.

---

## A PROVA — 6 testes, 3 provados vermelhos

| Estado | Resultado |
|---|---|
| **Com a guarda** | **6 de 6 passam** |
| **Sem a guarda** (mas **com** `actorOf` na interface) | **3 de 6 falham** |

```
× sem ator, os quatro recusam com sem_permissao
× sem ator, NAO cria acompanhamento nem muda status
× sem ator, a recusa acontece ANTES de validar o payload
```

**A versão sem a guarda é o estado anterior exato do repositório** — com `actorOf` declarado. Os três testes falharam mesmo assim.

---

## MEDIÇÕES

| Medida | Valor | Antes |
|---|---|---|
| Canais de domínio sem guarda | **9** | 30 |
| Arquivos na dívida do ratchet | **20** | 25 |
| Testes novos | **6** | — |
| **Provados vermelhos** | **3** | — |
| Regressão (after-sales + permissão + erp) | **49 verdes** | — |
| Gate | **14 checks, ok** | — |
| Typecheck | **0 erros** | — |

---

## O QUE FALTA NA FASE 2 — os 3 restantes

| Arquivo | Canais | Efeito |
|---|---|---|
| `scheduling-block-ipc.ts` | 3 | bloqueio de agenda — **impede horário de ser vendido** |
| `service-desk-ipc.ts` | 2 | abertura de ticket |
| `analytics-ipc.ts` | 1 | dashboard |
| **Total** | **6 canais em 3 arquivos** |

---

## PRÓXIMA RODADA

**`scheduling-block-ipc.ts`** — 3 canais. Um bloqueio de agenda **impede que um horário seja vendido**; é escrita com efeito operacional, e o teste precisa provar que sem ator nenhum bloqueio é criado.
