# GOAL V2 — RODADA 31: A LIÇÃO DA r30 VIROU GUARDA

**Data**: 05/11/2026

---

## O QUE FOI CONSTRUÍDO

`apps/desktop/electron/ipc-invariants.test.ts` — **4 testes** que respondem a pergunta que **nenhuma ferramenta do projeto fazia**:

> *"Este arquivo tem N handlers para N canais distintos?"*

---

## O BUG QUE ELE IMPEDE

A r30 descobriu que `purchases-ipc.ts` tinha **10 cópias** de dois canais. A duplicação nasceu na r27 e foi **commitada duas vezes**.

| Verificação | Por que não pegou |
|---|---|
| typecheck | valida **sintaxe** — 10 handlers idênticos compilam |
| gate | não inspeciona contagem |
| testes de compras | compara a **lista**, não a **quantidade** |

---

## OS QUATRO TESTES

### 1. O detector não pode passar por vacuidade

```ts
expect(canais.size).toBeGreaterThan(20)
expect(total).toBeGreaterThan(100)
```

> **Um regex errado faria todos os testes abaixo passarem sem verificar nada.** Este é o teste do teste.

### 2. Nenhum canal duas vezes no **mesmo** arquivo

```ts
if (n > 1) problemas.push(`${arquivo}: '${canal}' registrado ${n} vezes`)
```

**É a asserção que a r30 precisava.**

### 3. Nenhum canal em **dois arquivos diferentes**

> **Dois `ipcMain.handle` para o mesmo canal em arquivos distintos significa que a ordem de import decide qual vence** — e **ordem de import não é contrato.**

### 4. Arquivo `-ipc.ts` sem handler é nome que mente

A r26 renomeou `purchase-approval-ipc.ts` → `-decision.ts` exatamente por isto. **Este teste impede que o erro volte.**

---

## A PROVA — o teste falha quando deve

Injetei deliberadamente um canal duplicado em `purchases-ipc.ts`:

```
purchases-ipc.ts: 'hermes:purchases:limite' registrado 2 vezes
```

**Detectado.** E revertido logo em seguida.

---

## AS DUAS EXCEÇÕES — cada uma dizendo por quê

O teste 4 apontou dois arquivos. **Os dois são legítimos**, e a exceção é **escrita**, não silenciosa:

| Arquivo | Por que não tem handler próprio |
|---|---|
| **`erp-ipc.ts`** | é a **montagem**: chama 23 `registerXxxIpc` e não registra canal próprio. Renomear mexeria em 23 imports |
| **`ui-preferences-ipc.ts`** | é um **adaptador**: recebe `hermesHome` e delega para `ui-preferences.ts`, que tem os handlers |

> **Uma exceção silenciosa é um buraco invisível.** Elas estão num `Set` nomeado `MONTAGEM_OU_ADAPTADOR`, com o motivo ao lado.

---

## MEDIÇÕES

| Medida | Valor |
|---|---|
| Testes novos | **4** |
| Canais verificados | **100+** em **20+** arquivos |
| Duplicatas encontradas agora | **0** |
| Exceções justificadas | **2** |
| Prova do vermelho | **sim** (injeção detectada) |
| Gate | **14 checks, ok** |
| Typecheck | **0 erros** |
| Regressão | **116 verdes** |

---

## POR QUE ESTA RODADA VALE MAIS QUE UMA FEATURE

A r30 encontrou o bug **duas rodadas tarde**. Se o teste existisse na r26, a duplicação **nunca teria sido commitada** — e as rodadas 27, 28, 29 e 30 teriam ido para outro lugar.

> **O teste não previne um bug: previne uma CLASSE de bug** — "editei por script e o arquivo cresceu sem eu ver".
>
> **E vale para qualquer arquivo futuro**: qualquer `*-ipc.ts` novo passa por ele automaticamente.

---

## O QUE ELE **NÃO** COBRE

| Lacuna | Por quê |
|---|---|
| Métodos duplicados em **stores** | o padrão do bug se aplica, mas a assinatura é diferente (`async metodos(`) e não medi se houve duplicação histórica |
| Handlers duplicados em **main.ts** | registra por outra forma (`ipcMain.handle` inline em 99 pontos); merece teste próprio |
| O **conteúdo** do handler | dois handlers distintos para canais distintos podem fazer a mesma coisa — isso é duplicação semântica, não estrutural |

> **A última é a mais honesta**: este teste garante **estrutura**, não **intenção**.

---

## PRÓXIMA RODADA

**Métodos duplicados em stores** — aplicar a mesma invariante onde o padrão do bug também se aplica.

E depois: **`main.ts` com 99 handlers inline** é o arquivo onde a duplicação seria mais cara e menos visível.
