# GOAL V2 — RODADA 36: A PORTA DA TRILHA — E A TELA QUE EU NÃO CONSEGUI FAZER

**Data**: 05/11/2026

---

## O QUE FOI CONSTRUÍDO

| Camada | Estado |
|---|---|
| 1. **Store** (ledger) | ✅ r35 |
| 2. **Canal** `hermes:auditoria:listar` | ✅ **r36** |
| 3. **Preload** `hermesDesktop.auditoria.listar` | ✅ **r36** |
| 4. **Wrapper** `src/api/auditoria.ts` | ✅ **r36** |
| 5. **Tela** | ❌ **revertida** |

---

## O CANAL

```ts
ipcMain.handle('hermes:auditoria:listar', ... exigirAtor(deps.actorOf, 'read', 'privacy', ...))
```

### Três decisões

| Decisão | Por quê |
|---|---|
| **`read`, não `execute`** | ler auditoria é consulta. **Quem pode apagar é outra pergunta — e a resposta é "ninguém"**: o store é append-only e **não tem método de remoção**. Um canal de exclusão não existe porque **uma auditoria que pode ser apagada não é auditoria** |
| **`privacy`, não `admin`** | a trilha registra quem tentou o quê **sobre dados de quem**. Um `admin` lendo a trilha de `finance` veria decisões de **um domínio que talvez não governe** |
| **limite com teto de 1000** | a tela não carrega 5.000 de uma vez; e um payload com `limite: 999999` não derruba a leitura |

### `descartadas` vai junto, sempre

> Uma lista que começa na *"mais antiga que restou"* **sem dizer que houve perda** daria a impressão de **histórico completo**.

---

## A TELA — RECUSADA, E POR QUÊ

Tentei inserir a seção na tela de Privacidade com um script PowerShell. O script tinha `//` como comentário na primeira linha — **não é sintaxe de PowerShell** — e o arquivo saiu com **4 erros de sintaxe** (303 linhas de 186).

**Revertida.** `privacidade/index.tsx` voltou a **186 linhas, 0 erros**.

> **É a quinta vez nesta sessão que uma edição por script corrompe um arquivo.** A diferença desta vez: **o erro apareceu no typecheck imediatamente**, e reverter custou um comando.
>
> **A tela fica para a próxima rodada, feita com `edit`.**

---

## O RATCHET FUNCIONOU COMO DEVERIA

O novo `audit-ipc.ts` fez o total de arquivos `*-ipc.ts` ir de **41 para 42**.

```
expected [ 'admin-ipc.ts', …(41) ] to have a length of 41 but got 42
```

**A dívida NÃO cresceu** — `audit-ipc.ts` nasceu **com guarda**. Só o **denominador** mudou:

```
17 de 41  →  17 de 42
```

> **É exatamente o comportamento desejado**: um canal novo com guarda **aumenta o total e deixa a dívida intacta**. Se tivesse nascido sem guarda, a dívida iria a **18** e o teste `a divida nao cresce` falharia.

---

## MEDIÇÕES

| Medida | Valor |
|---|---|
| Testes novos do canal | **7** |
| Testes totais da auditoria | **20** (13 do store + 7 do canal) |
| Regressão (audit + permission + erp + privacy + invariantes) | **94 verdes** |
| Ratchet | **17 de 42** (dívida intacta) |
| Linhas da tela | **186** (revertida) |
| Gate | **14 checks, ok** |
| Typecheck | **0 erros** |

---

## O QUE A TELA VAI PRECISAR DIZER

Já está escrito no wrapper (`src/api/auditoria.ts`), esperando a tela:

| Função | O que resolve |
|---|---|
| `quandoLabel(ms)` | `toLocaleString('pt-BR')` — a trilha é lida por quem investiga; ISO truncado é pior de escanear |
| `vereditoLabel(allowed)` | `'permitido'` / `'negado'` — **`false` não diz a ninguém o que aconteceu** |
| `motivoLabel(motivo)` | traduz `sem_ator`, `nivel_insuficiente`… — **mostrar o código cru obriga a procurar o que significa** |

**E o aviso obrigatório**, quando `descartadas > 0`:

> *"N entradas antigas foram descartadas por limite de espaço. A lista abaixo não é o histórico completo."*

---

## PRÓXIMA RODADA

**A tela de Privacidade, com `edit` — e prova de que a seção não quebra a tela existente.**

O wrapper, o preload e o canal estão prontos e testados. **Falta a última camada, que é a que o usuário vê.**
