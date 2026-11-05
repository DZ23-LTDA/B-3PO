# GOAL V2 — RODADA 35: A AUDITORIA PASSOU A EXISTIR

**Data**: 05/11/2026 · **Prioridade #2 do mapa da r34**

---

## O QUE ESTAVA PROMETIDO E NÃO EXISTIA

O `permission-guard` tem `onAudit` desde sempre. O comentário no topo diz:

> *"A auditoria é registrada em toda chamada, permitida ou negada: auditoria que só guarda o permitido esconde a tentativa."*

**Medido na r35**: `onAudit` **nunca era passado na montagem**. `erp-ipc.ts` tinha **zero ocorrências**.

> **A trilha vivia só enquanto o processo vivia.** Fechou o app, sumiu.

E o §26 é explícito: **três dos quatro fluxos de aceite terminam em auditoria**.

---

## O QUE FOI CONSTRUÍDO

`apps/desktop/electron/audit-store.ts` — **ledger append-only** em `userData/b3po/auditoria.json`.

### Quatro decisões

| Decisão | Por quê |
|---|---|
| **Append-only** | Auditoria não é log de diagnóstico: é **prova**. Nunca se apaga nem se reescreve |
| **Truncagem pelo INÍCIO** | Um ledger que cresce para sempre derruba o app; um que apaga o **recente** esconde o que acabou de acontecer — que é o que se investiga primeiro |
| **Perda contada** | `descartadas` registra quantas saíram. **Se houve perda, ela aparece** |
| **Não guarda corpo nem resultado** | Só **quem, o quê, sobre o quê, permitido, quando, por quê** — o suficiente para reconstruir a decisão, sem vazar dado de negócio |

### Por que um coletor global e não `onAudit` em 30 lugares

> Este arquivo é chamado em **30 canais**, cada um com o seu objeto `deps`. Passar `onAudit` em todos exigiria tocar em **30 assinaturas** — e **a primeira esquecida seria um buraco silencioso na trilha**.
>
> **Um lugar**: a montagem configura o coletor; toda chamada sem `onAudit` próprio cai nele.

**E `onAudit` próprio continua tendo precedência** — quem instrumenta o domínio não recebe a entrada duas vezes.

---

## O ACHADO QUE O TESTE REVELOU

O teste *"sem ator, a recusa também é auditada"* **falhou**.

**Causa**: `exigirAtor` retorna `{ error: 'sem_permissao', reason: 'sem_ator' }` **antes** de chamar `withPermission` — onde o `audit` acontece.

> **"Alguém tentou agir sem identidade" é exatamente o evento que uma auditoria existe para mostrar** — e era o único que nunca era registrado.

**Corrigido**: a recusa sem ator agora vai para a trilha, com `actorId: ''`.

> **Vazio de propósito**: não há ator, e **inventar `anonimo` faria a trilha sugerir uma identidade que não existe**.

---

## A PROVA — 13 testes

| Teste | O que trava |
|---|---|
| decisão permitida chega ao disco **sem `onAudit`** | o caminho existe |
| **decisão negada também** | auditoria só do permitido esconde a tentativa |
| **recusa sem ator também** | o achado desta rodada |
| `onAudit` próprio tem precedência | sem entrada dupla |
| append-only: ordem preservada | o ledger é histórico |
| **trunca pelo início e conta** | perda visível, não silenciosa |
| tenant acompanha a entrada | dado de A não se lê como de B |
| sem coletor, nada lança | auditoria ausente não derruba o canal |

---

## MEDIÇÕES

| Medida | Valor |
|---|---|
| Linhas do store | **203** |
| Testes novos | **13** |
| Teto do ledger | **5.000** entradas |
| Regressão (permissão + erp + audit + sofia) | **137 verdes** |
| Gate | **14 checks, ok** |
| Typecheck | **0 erros** |

---

## O QUE ISSO MUDA NO §26

| Fluxo | Etapa "auditoria" antes | Agora |
|---|---|---|
| **COMPRAS** | ⚠️ memória | ✅ **disco** |
| **VENDA** | ⚠️ memória | ✅ **disco** |
| **PROJETO** | ⚠️ memória | ✅ **disco** |
| **ORQUESTRAÇÃO** | ⚠️ memória | ✅ **disco** |

> **Três dos quatro fluxos do §26 exigiam auditoria.** Agora os quatro têm — e a trilha é **do sistema**, não da ação.

---

## O QUE **NÃO** FOI FEITO

| Item | Por quê |
|---|---|
| **Canal IPC para ler a trilha** | o store existe; a tela não. **Padrão da r2, quarta vez** |
| Retenção/LGPD sobre a trilha | a política de prazo não foi decidida |
| Ancoragem externa (hash chain) | exigiria decidir o que fazer quando a âncora diverge |
| Rotação por dia | truncagem por quantidade basta para 5.000 decisões |

---

## PRÓXIMA RODADA

**O canal de leitura da trilha** — e a tela.

> Sem ele, a auditoria existe **para quem abrir o JSON no disco**. É o padrão que se repetiu nas rodadas 3–8, 25–28: **a capacidade sem porta**.
