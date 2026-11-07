# GOAL V2 — RODADA 117: OS CHECKPOINTS DO §23

**Data**: 05/11/2026 · **§23** · os arquivos que regulam como este trabalho continua

---

## O QUE O §23 PEDE

> *"**Localizar arquivos equivalentes antes de criar novos. Atualizar, não duplicar.**"*

**Essa frase é a instrução, e ela muda o resultado.**

---

## OS 7 ARQUIVOS — o que foi feito com cada

| Arquivo esperado | Estado | Ação |
|---|---|---|
| `B3PO-MASTER-STATE.md` | **tem equivalente** | ✅ **atualizado** `AUTONOMOUS-EXECUTION-STATE.md` |
| `B3PO-MASTER-ROADMAP.md` | **tem equivalente** | ✅ `BUSINESS-CORE-ROADMAP.md` (48 linhas) |
| `B3PO-MASTER-CHANGELOG.md` | **tem equivalente** | ✅ `CHANGELOG.md` (36 linhas) |
| **`B3PO-MASTER-DECISIONS.md`** | ❌ não existia | ✅ **criado** — 46 linhas |
| **`B3PO-MASTER-BLOCKERS.md`** | ❌ não existia | ✅ **criado** — 29 linhas |
| **`B3PO-MASTER-TEST-RESULTS.md`** | ❌ não existia | ✅ **criado** — 59 linhas |
| **`B3PO-MASTER-CHECKPOINT.json`** | ❌ não existia | ✅ **criado** — 60 linhas, **JSON válido** |

> **3 atualizados, 4 criados, 0 duplicados.** O §23 pediu para **não duplicar**, e duplicar o STATE seria ter **dois** estados para a mesma sessão.

---

## O STATE — e o que estava errado nele

```
antes:  | Commits DZ23 | 232 (HEAD acc399c120) |
depois: | Commits DZ23 | 247 (HEAD df02a3d738c3) |
```

> **Ele estava congelado no commit de 01h32 da manhã** — e o HEAD de agora é **`df02a3d738`**.
>
> **Um STATE com o commit errado é pior que nenhum**: ele faz a próxima sessão **validar o estado errado**.

---

## O QUE CADA ARQUIVO NOVO DIZ

### `DECISIONS.md` — 46 linhas

**Um índice, não o texto.** Aponta para os 8 ADRs de `adr/` e para as **10 decisões técnicas que mudaram o produto** — r20 (a ponte não checa credencial), r62 (a reserva vence), r70 (20/min), r76 (sem critério não há pronto), r88 (estrutura em store próprio), r109 (capacidade sem porta).

### `BLOCKERS.md` — 29 linhas

| # | Bloqueio |
|---|---|
| **B1** | **assinatura Authenticode** — `AZURE_SIGN_*` ausente |
| B2–B4 | marketplace · WhatsApp · pagamento — §16 |
| B5–B6 | instalação do MSIX · foco/tabulação/contraste |

> **E uma seção que os arquivos de bloqueio costumam não ter**: *"O que **não** é bloqueio"* — as **41 falhas de ambiente**, o **shiki de 19.5 MB**, os **2 imports ineficazes**.
>
> **"Um bloqueio é uma parede. Uma dívida é um preço. Misturar as duas faz o relatório mentir."**

### `TEST-RESULTS.md` — 59 linhas

**Os comandos, os números e o que falhou** — §20: *"registrar comando, ambiente, exit code, contagem"*.
**E os 4 fluxos provados** (compras, venda, orquestração, atendimento) e **os 5 testes que impedem regressão**.

### `CHECKPOINT.json` — 60 linhas, **JSON válido**

```json
{ "checkpoint": { "branch": "b3po-brand", "commit": "df02a3d738…",
                  "fase": "GOAL V2 — rodada 117 de 256", "status": "IN_PROGRESS" },
  "medido": { "gate": "14 checks, ok", "typecheck": "0 erros", … },
  "bloqueios": [ B1…B6 ],
  "proximaAcao": "rodada 118 — consolidar o STATE e o ROADMAP" }
```

> **`status: IN_PROGRESS`**, não `VERIFIED` — porque o §23 diz *"VERIFIED exige evidência reproduzível"*, e **117 de 256 não é uma entrega**.

---

## MEDIÇÕES

| Medida | Valor |
|---|---|
| Arquivos esperados | **7** |
| **Atualizados** | **3** |
| **Criados** | **4** |
| **Duplicados** | **0** |
| Gate · Typecheck | **14 ok · 0 erros** |

---

## PRÓXIMA RODADA

O **`B3PO-MASTER-ROADMAP.md`** — o §23 o pede, e o equivalente (`BUSINESS-CORE-ROADMAP`, 48 linhas) **não tem as fases P0–P8** que o §25 define.

> **117 rodadas.** Os checkpoints existem agora — e o mais importante deles **não foi criado**: foi **atualizado**, porque **um STATE duplicado é dois estados**, e o antigo estava com **o commit de 15 rodadas atrás**.
