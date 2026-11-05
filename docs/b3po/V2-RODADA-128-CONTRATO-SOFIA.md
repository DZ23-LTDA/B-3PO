# GOAL V2 — RODADA 128: O CONTRATO DE SOFIA — A SPEC NÃO PODE DESCOLAR DO CÓDIGO

**Data**: 05/11/2026 · **a 6ª ordem do dono**: *"Definir tecnicamente Sofia"*

---

## O QUE JÁ EXISTIA — medido

| Artefato | Estado |
|---|---|
| `SOFIA-ORCHESTRATION-SPEC.md` | **220 linhas** (r16) |
| `SOFIA-AUDITORIA-§11.md` | **11 de 12** (r100) |
| `ADR-001-SOFIA.md` | a decisão de que Sofia é **camada**, não runtime |
| **5 módulos** | `store` (292) · `grafo` (193) · `ponte` (144) · `orquestrador` (153) · `ipc` (129) |
| **testes** | **117** (store 19 · grafo 28 · ponte 15 · orquestrador 22 · permissão 33) |

> **A 6ª ordem estava satisfeita na r100.** O que faltava era **a ligação entre o documento e o produto**.

---

## O QUE ESTA RODADA ACRESCENTOU

`sofia-contrato.test.ts` — **7 testes** que leem **a spec** e verificam que **o código tem o que ela promete**.

| Teste | O que trava |
|---|---|
| **as fronteiras existem** | `Sofia faz` / `Sofia não faz` |
| **o que Sofia NÃO faz** (6 itens) | *"uma definição que só diz o que a coisa faz descreve um desejo"* |
| **os 3 escopos** | os da spec **são** os do store |
| **os 6 status do plano** | na spec |
| **os 5 módulos existem** | a camada não perdeu arquivo |
| **`tarefa_id`, `status`, `depende_de`** | sem isso **o grafo não ordena** |

---

## A LIÇÃO — e ela é sobre **o teste que eu quase deixei**

**A primeira versão procurava `credencial` no `sofia-ponte.ts`** para provar que **a ponte não checa credencial** (a decisão da r20).

**Ela falhou** — porque **o comentário do arquivo explica exatamente o contrário do que a palavra sugere**.

> *"Sofia não transforma «sem credencial» em «plano falhou»: são fatos diferentes."*

> **Procurar texto para provar comportamento é o erro que esta sessão já cometeu cinco vezes.** Eu escrevi o teste **e caí nele na mesma rodada**.

**O teste foi removido**, e a remoção está no cabeçalho do arquivo — **não escondida**.

---

## TRÊS QUEBRAS DE ARQUIVO — e o script é o culpado nas três

| # | O que tentei | Resultado |
|---|---|---|
| 1 | script para remover o `it` | **`PARSE_ERROR: Unexpected token`** |
| 2 | `join(__dirname, '..', '..')` | **`ENOENT` em `apps\docs`** — faltava **um** nível |
| 3 | — | resolvido **reescrevendo o arquivo inteiro** |

> **A décima quinta vez** que um script corrompe um arquivo nesta sessão. **O `write` do arquivo completo nunca quebrou.**

---

## MEDIÇÕES

| Medida | Valor |
|---|---|
| Testes de Sofia | **117** (110 + 7 do contrato) |
| Módulos cobertos | **5** |
| Gate · Typecheck | **14 ok · 0 erros** |
| Scripts que quebraram arquivo | **2** nesta rodada |

---

## A 6ª ORDEM — ONDE ESTÁ

| Item | Estado |
|---|---|
| **Definição técnica** | ✅ **spec 220 linhas + ADR-001** |
| **Implementação** | ✅ **5 módulos, 117 testes** |
| **Auditoria §11** | ✅ **11 de 12** — e o que falta **é proibido pelo GOAL** |
| **Alinhamento spec ↔ código** | ✅ **r128** |
| **Execução real com o Hermes** | ❌ **B3: sem credencial** |

> **A 6ª ordem está fechada.** Sofia **está definida tecnicamente** — e agora há um teste que **impede a definição de mentir**.

---

## PRÓXIMA RODADA

**O §24 — Subagentes e Ferramentas**, a seção que **regula como eu delego** e que **nunca foi lida**.

> **128 rodadas.** A 6ª ordem pedia **definir Sofia**; ela estava definida desde a r16. **O que faltava era impedir que a definição descolasse** — e o teste que faz isso **quase nasceu errado**, procurando uma palavra que dizia o oposto do que eu queria provar.
