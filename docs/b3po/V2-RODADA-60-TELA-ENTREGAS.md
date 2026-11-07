# GOAL V2 — RODADA 60: A TELA DE ENTREGAS — AS SEIS CAMADAS

**Data**: 05/11/2026 · **§17 — logística completa**

---

## O QUE A r59 RECUSOU, E POR QUÊ

> *"Uma tela nova é mais trabalho, e é menos arriscada que editar uma existente de 374 linhas — e o arquivo novo não tem `return (` ambíguo."*

**Esta rodada fez a tela nova.**

---

## O QUE FOI CONSTRUÍDO

`src/app/entregas/index.tsx` — **arquivo novo**, autocontido.

```
Entregas
O que saiu, o que chegou e o que voltou.
Uma entrega entregue ou recusada não volta.

Nova entrega                          2 em aberto
[ Venda ▾ ] [ Destino                      ]
[ Registrar entrega ]

Rua A, 10 · em rota · joao                    [ quem recebeu ] [Entregue] [Recusada]
Rua B, 20 · a sair                            [Saiu]
```

### Três decisões de tela

| Decisão | Por quê |
|---|---|
| **O recebedor é digitado, não assumido** | quem recebeu **pode não ser quem está no sistema** — e o comprovante **existe para ser prova** |
| **`catch` na lista de vendas devolve `[]`** | se o canal de vendas falhar, **a tela ainda funciona** com o id digitado |
| **`STATUS_LABEL`, não o código** | *"a sair"* e *"em rota"* são **coisas diferentes** — uma está no depósito, a outra está na rua |

---

## AS 6 CAMADAS — COMPLETAS

| Camada | Desde |
|---|---|
| 1. Regra | r56 |
| 2. Store | r57 |
| 3. Canal | r58 |
| 4. Preload | r59 |
| 5. Wrapper | r59 |
| **6. Tela** | **r60** |

### E os 6 registros que a r21 mapeou

| # | Onde | O que |
|---|---|---|
| 1 | `routes.ts` | `ENTREGAS_ROUTE = '/entregas'` |
| 2 | `routes.ts` | `AppView` += `'entregas'` |
| 3 | `routes.ts` | `AppRouteId` += `'entregas'` |
| 4 | `routes.ts` | `APP_ROUTES` += `{ id, path, view }` |
| 5 | `surfaces.tsx` | `lazy(() => import('../entregas'))` |
| 6 | `surfaces.tsx` | `<Route path="entregas" />` |
| + | `b3po-nav` | **Entregas** ao lado de Vendas |

> **Menu foi de 18 para 19.** O teste `o menu tem exatamente os 18 modulos` **falhou** — e **era o esperado**: um módulo novo entra no menu e no teste.

---

## A PROVA

| Verificação | Resultado |
|---|---|
| Typecheck | **0 erros** |
| Gate | **14 checks, ok** |
| Nav (13 testes) | ✅ |
| Logística (37 testes) | ✅ |
| Invariantes de IPC | ✅ |

### E as 3 falhas em `src/app`

`use-keybinds-browser` ×2 e um de gateway. **Verificado**: passam **isolados** (6/6), e **nenhum arquivo de keybind foi alterado nesta sessão**.

> **São as 3 falhas pré-existentes** documentadas desde a r15 — não uma regressão desta rodada.

---

## MEDIÇÕES

| Medida | Valor |
|---|---|
| Linhas da tela | **~230** |
| Registros | **7** (6 + menu) |
| Testes de menu corrigidos | **2** (`18 → 19`) |
| Gate | **14 checks, ok** |
| Typecheck | **0 erros** |

---

## E O §17 — O VERTICAL

| Etapa da distribuidora de gás | Estado |
|---|---|
| pedido · estoque · financeiro | ✅ |
| **entrega** | ✅ **6 de 6** |
| **comprovante** | ✅ persistido e provado |

> **O caminhão tem volante, chave e motorista.**

---

## O QUE ISSO MUCHOU NO PRODUTO

**Antes da r54**: 8 domínios, e o vertical do GOAL **não podia ser completado** — faltava logística, e ninguém tinha percebido.

**Agora**: os **9 domínios existem**, e o vertical tem **a última etapa com as 6 camadas**.

> **A r55 disse**: *"o produto tem o pedido e o dinheiro — e não tem o caminhão."*
>
> **Hoje tem.**

---

## PRÓXIMA RODADA

O §17 diz: *"expandir **depois** de comprovar fluxo ponta a ponta"*.

**Compras**: comprovado (r45).
**Venda → entrega**: **o caminho existe agora — e não há teste de fluxo**.

> **A próxima rodada é o teste de fluxo da venda**: `produto → pedido → pagamento → entrega → comprovante`, e ele **vai encontrar** o que ainda falta — como o da r45 encontrou.
