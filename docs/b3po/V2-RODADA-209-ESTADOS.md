# GOAL V2 — RODADA 209: OS OUTROS QUATRO ESTADOS — DOIS ESTAVAM ERRADOS

**Data**: 06/11/2026 · **1ª ordem do owner** · *"proteger e reconciliar o estado"*

---

## O QUE A r208 DEIXOU PARA MEDIR

> *"Os outros quatro estados — `BLOCKERS` (30), `DECISIONS` (46), `TEST-RESULTS` (59) e `CHANGELOG` (69) — e a mesma pergunta para cada um: o que ele afirma ainda é verdade?"*

---

## `BLOCKERS` — **três coisas erradas**

| O que dizia | **O que é** |
|---|---|
| **"41 testes falhando — ambiente: `python3` não existe no Windows (r111)"** | **26**, e **a r188 resolveu o `python3`** (o `globalSetup` pulava no Windows) |
| **"B7: o host é pp/chat/sidebar"** | **`pp` é um `\r`**: o path virou `pp/chat/sidebar` por corrupção de encoding. **E o B7 ganhou a razão medida na r171** (`SidebarNavContribution` sem predicado) |
| ***(B8 não existia)*** | **`B8` registrado**: a concorrência do `Msix` sob carga |

> **O `41` era o número da r111** — **e ele justificava a si mesmo com uma causa que já não existe**. **A "dívida" que o arquivo separava de "parede" tinha um dos lados obsoleto.**

---

## `TEST-RESULTS` — **três números e uma conclusão antigos**

| Campo | Antes | **Agora** |
|---|---|---|
| Suíte `electron` | **5352 / 41 / 207 (5600)** | **5446 / 26 / 207 (5679)** — r205 |
| Seção | **"As 41 falhas"** | **"As 41 falhas da r111 → 26 na r205"** |
| Ratchet | **"17 de 46 sem guarda"** | **"16 de 46, 0 do produto"** (r176) |

> **Todos os três pioravam o produto**: **o arquivo de resultados de teste anunciava 41 falhas onde há 26, e 17 canais sem guarda onde há 16 — e nenhum deles é do produto.**

---

## `DECISIONS` E `CHANGELOG` — **os dois que estão certos**

> **`DECISIONS` (46 linhas)** registra **decisões**, e **decisão não envelhece**: *"um banco por operador"*, *"`(phone, tenant_id)` é a chave do CRM"*. **Elas continuam verdadeiras, e é por isso que são decisões.**
>
> **`CHANGELOG` (69 linhas)** registra **o que aconteceu** — **e o que aconteceu não muda**. **Ele cobre r1–r130, e as 79 rodadas seguintes têm os `V2-RODADA-*.md`.**
>
> **É o §23 outra vez**: *"Localizar arquivos equivalentes antes de criar novos."* **O changelog não precisa de 207 entradas** — **o diretório `V2-RODADA-*` é o changelog por rodada**, e **o resumo está no `CHANGELOG`**.

---

## O PADRÃO — e ele já tem nome

| Arquivo | Envelheceu? | Por quê |
|---|---|---|
| `CHECKPOINT.json` | ❌ **74 rodadas** | números que ninguém reescreve |
| `STATE.md` | ❌ **76 rodadas** | números que ninguém reescreve |
| **`BLOCKERS`** | ❌ **98 rodadas** (r111) | **um número e uma causa que já foi resolvida** |
| **`TEST-RESULTS`** | ❌ **97 rodadas** (r111) | **os mesmos números** |
| **`DECISIONS`** | ✅ | **decisão não muda** |
| **`CHANGELOG`** | ✅ | **o passado é o passado** |

> **Os quatro que envelheceram têm a mesma forma**: **eles afirmam NÚMEROS**. **Os dois que não envelheceram afirmam FATOS e DECISÕES.**

---

## A LIÇÃO — **o número é o que apodrece**

> **Um estado que diz "4 fluxos" apodrece; um que diz "o CRM não era órfão" não.**
>
> **E nenhum processo escreve nos números**: **o gate passa, o `wrapup_check` passa, e os números ficam.**
>
> **A correção de fundo não é atualizar quatro arquivos — é que a próxima sessão saiba QUAIS envelhecem.** **Este documento é essa lista.**

---

## MEDIÇÕES

| Medida | Valor |
|---|---|
| Arquivos medidos | **4** |
| **Desatualizados** | **2** (`BLOCKERS`, `TEST-RESULTS`) |
| **Corretos** | **2** (`DECISIONS`, `CHANGELOG`) |
| **Rodadas de atraso corrigidas** | **98** |
| Gate · Typecheck | **14 ok · 0 erros** |

---

## PRÓXIMA RODADA

**O `AUTONOMOUS-EXECUTION-STATE.md`** — **331 linhas, e o ponteiro do `STATE.md` aponta para ele.** **É o último da família, e o maior.**

> **209 rodadas.** **Quatro arquivos, dois apodrecidos, e a diferença entre eles é uma só**: **um afirma números, o outro afirma decisões.** **Números precisam de um dono; decisões têm um.**
