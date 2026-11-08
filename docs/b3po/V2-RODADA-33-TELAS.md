# GOAL V2 — RODADA 33: AS TELAS ESTÃO ÍNTRERIAS — E O DETECTOR TAMBÉM

**Data**: 05/11/2026

---

## O QUE EU FUI VERIFICAR

A r32 deixou aberto: *"blocos duplicados em telas — `src/app/**` não tem invariante equivalente; o `compras/index.tsx` foi editado pelo mesmo método."*

> O `compras/index.tsx` passou de **371 para 504 linhas** nas rodadas 28–32. **Não sabia se o crescimento era todo legítimo.**

---

## PRIMEIRO, O DETECTOR MENTIU — OUTRA VEZ

Meu primeiro detector procurou blocos de 10 linhas repetidos. Resultado: **58 arquivos com "duplicação"**.

**Era falso.** O que ele achava era **sobreposição deslocada em 1 linha**:

```
L103~L119
L104~L120     ← o MESMO bloco, deslocado
L105~L121
```

**Um bloco de 10 linhas gera 10 "duplicatas" de si mesmo, cada uma deslocada em 1.**

> **É a quarta vez nesta sessão que o instrumento mentiu** — e a lição é a mesma: **quando o número é absurdo, o defeito costuma estar na medição.**

### O detector corrigido

Duas condições que faltavam:

```powershell
if (($i - $ant) -ge $distanciaMin -and $i -ge ($ant + $tam)) { $dups += ... }
```

> **Distância mínima** (40 linhas) e **não-sobreposição**. Um bloco deslocado em 1 **não é** uma duplicata — é o mesmo bloco.

**Resultado**: **58 → 8**.

---

## OS 8 NÃO SÃO MEUS — E ISSO ESTÁ PROVADO

| Arquivo | Difere de `main`? |
|---|---|
| `app/chat/sidebar/profile-switcher.tsx` | **idêntico** |
| `app/chat/new-session-drag.ts` | **idêntico** |
| `app/settings/credential-key-ui.tsx` | **idêntico** |
| `lib/preview-annotate/handoff.ts` | **idêntico** |
| `plugins/hermes-bots/group-chat.ts` | **idêntico** |
| `plugins/hermes-bots/profile-config.tsx` | **idêntico** |
| `store/gateway.ts` | **idêntico** |
| `themes/presets.ts` | **idêntico** |

**Os oito existem em `main` e não foram tocados.** São padrões do upstream — provavelmente tabelas de configuração e switches com ramos parecidos.

> **Não são bug meu, e não são bug do produto**: são código do Hermes que herdamos. Mexer neles seria reescrever o upstream sem motivo.

---

## AS MINHAS TELAS

| Arquivo | Estado | Duplicação |
|---|---|---|
| `app/compras/index.tsx` | meu (diverge de `main`) | **0** |
| `app/sofia/index.tsx` | meu | **0** |
| `api/purchases.ts` | meu | **0** |
| `plugins/b3po-nav/plugin.tsx` | meu | **0** |

**O crescimento de 371 → 504 é legítimo**: painel de limite (~50 linhas), botão de aprovar (~15), validação (~18), estados e imports.

> Confirmei lendo os blocos, não só contando linhas: **não há repetição**.

---

## A LIÇÃO QUE ESTA RODADA CONFIRMA

| Rodada | O instrumento | O que ele disse | A verdade |
|---|---|---|---|
| r30 | typecheck | "0 erros" | **10 handlers duplicados** |
| r33 | detector de blocos | "58 arquivos duplicados" | **8, todos upstream** |

> **Duas ferramentas diferentes na mesma sessão, e as duas mentiram — uma por omitir, outra por exagerar.**
>
> **A que omitiu** (typecheck) deu confiança falsa. **A que exagerou** (detector bruto) quase me fez "consertar" 50 arquivos que não tinham problema.

---

## MEDIÇÕES

| Medida | Valor |
|---|---|
| Falsos positivos do detector bruto | **50** de 58 |
| Duplicatas reais nos meus arquivos | **0** |
| Duplicatas em código upstream | **8** (não tocadas) |
| Linhas do `compras/index.tsx` | **504** — crescimento legítimo |
| Gate | **14 checks, ok** |
| Código alterado nesta rodada | **0** |

---

## O QUE FICA REGISTRADO

**Um detector de duplicação por bloco de texto não serve como invariante automática** — ele precisa de distância mínima e não-sobreposição, e mesmo assim só pega repetição **literal**. Duas telas que fazem a mesma coisa com nomes diferentes passariam.

> **Por isso a r31/r32 usou invariante ESTRUTURAL** (canais, métodos) em vez de textual: `ipcMain.handle('x')` duplicado é **inequívoco**; um bloco de JSX parecido **não é**.

---

## PRÓXIMA RODADA

O §14 está fechado nas cinco camadas. O GOAL V2 tem mais itens — o próximo por ordem de seção é o **§15 em diante**, que ainda não li.

**Vou ler o que resta do documento antes de escolher.** Trinta e três rodadas de contexto, e ainda não sei o que os §15–§33 pedem.
