# B-3PO — CHANGELOG

**Checkpoint do §23** · atualizado em 2026-11-05T16:02:11-03:00 · commit `4ed887f660b6`

---

## O QUE ESTE ARQUIVO É

> **O §23 pede `B3PO-MASTER-CHANGELOG.md`. Ele já existia (`CHANGELOG.md`, 36 linhas) — e o §23 manda atualizar, não duplicar.**
>
> **Mas o `CHANGELOG.md` existente cobre até 02/11 e não tem as 118 rodadas desta sessão.** Este arquivo é **o registro delas**, e **não substitui** o existente: ele **continua** a partir dele.

---

## A SESSÃO — 153 commits, medidos do `git log`

| Tipo | Commits |
|---|---|
| `feat` | **63** |
| `docs` | **51** |
| `fix` | **29** |
| `test` | **8** |
| outros | 2 |

> **29 `fix`** — quase um em cada cinco commits foi **conserto**, e **nenhum** foi de um bug que o produto tinha antes: **todos foram de algo que eu quebrei ou afirmei errado.**

---

## AS RODADAS — o que cada bloco entregou

### r1–r15 · recebimento e base (P0)
Reconciliação do PC com o GitHub, backup, `main` preservada, gate e typecheck reexecutados.

### r16–r22 · Sofia (P4)
`ADR-001`, `SOFIA-ORCHESTRATION-SPEC`, store, grafo, ponte, orquestrador.

### r25–r53 · compras (P6)
Fluxo completo, limite de compra, aprovação, segregação, reconciliação, conferência, solicitação. **6 camadas.**

### r54–r64 · logística e venda (P6, P8)
Spikes (§16, bloqueados), os 9 domínios medidos, **logística do zero às 6 camadas**, **reserva** (r62–r64).

### r66–r75 · segurança (§19)
**8 ações sensíveis → 5 em HUMAN_ONLY** · replay de webhook · rate limiting (3 canais) · dependências · XSS · **isolamento de tenant ATACADO**.

### r76–r91 · §12 completo
**Projeto** (6 camadas), **organização** (6 camadas), **trabalho pontual** (6 camadas), **Agent Factory**.

### r92–r99 · §13
**7 grupos de menu**, ambiguidade `Organização` corrigida, **busca global** (regra, catálogo, tela), **mapa de rotas como teste**.

### r100–r108 · §11 e P8
**Sofia auditada: 11 de 12**, e o que falta **é o que o GOAL proíbe**. Build, pack, MSIX, a11y.

### r109–r118 · verificação
**3 canais nunca montados** descobertos e consertados, **teste de montagem** criado, **41 falhas diagnosticadas como ambiente**, **checkpoints do §23**.

---

## AS CORREÇÕES — e todas foram minhas

| Rodada | O que eu afirmei | O que era |
|---|---|---|
| r64 | *"ninguém confirma pagamento"* | **existia** |
| r93 | *"3 duplicatas de menu"* | **0 duplicatas** |
| r94 | *"o CRM está órfão"* | **está no menu do núcleo** |
| r101 | *"a interface é X"* | **era Y** |
| r104 | *"20 atributos de a11y"* | **nos lugares errados** |
| r105 | *"não há teste de backup"* | **458 testes** |
| r106 | *"i18n em 64%"* | **96%** |
| r107 | *"3 botões de ícone"* | **1** |
| r109 | *"as 3 montagens entraram"* | **só os imports** |

> **Nove correções em 118 rodadas** — e o padrão é o mesmo: **eu olho uma parte e falo do todo**.

---

## O QUE MUDOU NO MÉTODO

| Antes | Depois |
|---|---|
| confiar no teste verde | **o teste prova o que ele verifica, não o todo** |
| contar arquivos | **contar o que importa** (r106) |
| afirmar "não existe" | **procurar o símbolo primeiro** (r65) |
| editar por script | **`edit` com âncora única** — o script quebrou 11 vezes |

---

## O ESTADO — medido

| Item | Valor |
|---|---|
| Commits desta sessão | **153** |
| Rodadas | **119 de 256** |
| Gate | **14 checks, ok** |
| Typecheck | **0 erros** |
| Fluxos provados | **4** |
| Fases VERIFIED (P0–P8) | **4 de 9** |
