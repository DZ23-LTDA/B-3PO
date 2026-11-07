# GOAL V2 — RODADA 58: OS CANAIS DA LOGÍSTICA

**Data**: 05/11/2026 · **§17 — logística** · rodada 3

---

## O QUE FOI CONSTRUÍDO

`delivery-ipc.ts` — **4 canais**, todos com `exigirAtor` desde o primeiro commit:

| Canal | Ação |
|---|---|
| `hermes:logistica:entregas` | **read** |
| `hermes:logistica:porPedido` | **read** |
| `hermes:logistica:criar` | **execute** |
| `hermes:logistica:transitar` | **execute** |

---

## QUATRO DECISÕES

### 1. `read` e `execute` separados

> Saber **o que falta sair** não é agir. Separar permite um perfil **só de consulta** — o dono vê a operação sem poder mexer nela.

### 2. `porPedido` responde `null`, não `{ error }`

> *"Não tem entrega"* é **uma resposta, não uma falha**. Tratá-la como erro obrigaria a tela a distinguir dois erros que significam o contrário.

### 3. O `recebedor` é resolvido **com uma assimetria deliberada**

```ts
if (!recebedor && raw['status'] === 'em_rota') raw['recebedor'] = ator?.id ?? ''
```

| Status | Sem `recebedor` no payload |
|---|---|
| **`em_rota`** | assume o **ator** — quem despacha é quem está logado |
| **`entregue`** | **recusa** — o comprovante precisa de **quem recebeu** |

> **A tentação seria cair no ator nos dois casos. Seria registrar o operador como quem RECEBEU** — e o comprovante existe **justamente para ser prova contra a alegação de que ninguém recebeu**.

### 4. O `tenant` vem de `serverTenant`, não do payload cru

> O renderer não escolhe o tenant — o processo principal resolve.

---

## A PROVA — 6 testes

| Teste | O que trava |
|---|---|
| registra exatamente quatro canais | o contrato |
| criar e listar | o caminho |
| **`porPedido` responde `null`** | resposta, não falha |
| **`em_rota` sem recebedor assume o ator** | o despachante |
| **`entregue` sem recebedor é recusado** | **não registra o operador como recebedor** |
| `entregue` com recebedor grava aquele nome | o comprovante |

---

## O RATCHET — e ele fez o que devia

O novo `delivery-ipc.ts` fez o total de arquivos `*-ipc.ts` ir de **42 para 43**.

```
expected [...] to have a length of 42 but got 43
```

**A dívida NÃO cresceu**: `17 de 42` → **`17 de 43`**. O novo nasceu **com guarda**.

> **É a terceira vez que isso acontece** (r19, r36, r58) — e **é exatamente o comportamento desejado**: o denominador sobe, a dívida fica.

---

## MEDIÇÕES

| Medida | Valor |
|---|---|
| Canais novos | **4**, todos com guarda |
| Testes da logística | **37** (16 regra + 15 store + 6 canal) |
| Ratchet | **17 de 43 — dívida intacta** |
| Gate | **14 checks, ok** |
| Typecheck | **0 erros** |

---

## ONDE A LOGÍSTICA ESTÁ

| Camada | Estado |
|---|---|
| 1. Regra · 2. Store · **3. Canal** | ✅ r56 · r57 · **r58** |
| 4. Preload · 5. Wrapper · 6. Tela | ❌ |

---

## E O §17 — o vertical

| Etapa da distribuidora de gás | Estado |
|---|---|
| pedido · estoque · financeiro | ✅ |
| **entrega** | ⚠️ **regra + store + canal**, falta a tela |
| comprovante | ✅ persistido |

> **O caminhão já responde a comandos; falta o volante.**

---

## PRÓXIMA RODADA

**Preload + wrapper + tela** — as três últimas camadas, e as que o usuário toca.

> **58 rodadas.** A logística saiu de **ausente** (r54) para **3 de 6 camadas** em quatro rodadas — e a regra, que é a parte que **envelhece**, foi a primeira.
