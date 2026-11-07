# GOAL V2 — RODADA 30: CÓDIGO DUPLICADO QUE EU COMMITEI, ENCONTRADO E CORRIGIDO

**Data**: 05/11/2026 · **§14 — Compras**

---

## A DESCOBERTA

Ao tentar adicionar a validação de aprovadores, medi:

```
purchases-ipc.ts: 30 handlers
canais duplicados: hermes:purchases:definirLimite x10 · hermes:purchases:limite x10
```

**O arquivo tinha 10 cópias de cada um dos dois canais.**

E não era das minhas edições de hoje. **Auditei o histórico**:

| Commit | Rodada | Linhas | Handlers |
|---|---|---|---|
| `789599289e` | r26 | 197 | **10** |
| `3555fecb2b` | **r27** | **319** | **30** |
| `f26da427bb` | **r28** | **319** | **30** |

> **A duplicação nasceu na r27 e foi commitada duas vezes.** Eu commitei código com **3 cópias de cada handler** e **não vi**, porque o typecheck passava — 10 handlers idênticos são TypeScript válido.

---

## POR QUE NINGUÉM PEGOU

| Verificação | Por que passou |
|---|---|
| **typecheck** | valida **sintaxe** — 10 handlers válidos compilam |
| **gate (14 checks)** | não inspeciona contagem de handlers |
| **testes de compras** | `registra exatamente os canais` compara a lista, **não a quantidade de handlers** |
| **meu `git diff`** | não rodei na r27 e na r28 |

> **O efeito real em produção**: `ipcMain.handle` para o mesmo canal **10 vezes** — a última vence. O comportamento seria correto e o custo invisível. Até alguém mudar **uma** das cópias.

---

## A CORREÇÃO

**Restaurado de `789599289e`** (r26 — 10 handlers, estado limpo) e **reaplicado os dois canais** de forma controlada, inserindo por **índice de linha** (determinístico), não por `Replace`.

```
purchases-ipc.ts   277 linhas   12 handlers   (eram 319 / 30)
```

**E a validação entrou, agora nos dois lugares:**

### No canal (`purchases-ipc.ts`)

```ts
if (deps.atores && lista.length > 0) {
  const existentes = new Set(await deps.atores())
  const faltando = lista.filter(id => !existentes.has(id))

  if (faltando.length > 0) {
    return { error: 'aprovador_inexistente', motivo: 'ator nao encontrado: ' + faltando.join(', ') }
  }
}
```

### Na tela (`compras/index.tsx`)

```ts
const reais = new Set((await listActors()).map(a => a.id))
const faltando = aprovadores.filter(id => !reais.has(id))

if (faltando.length > 0) {
  setAprovacaoErro('Nao existe ator com este id: ' + faltando.join(', ') + '. Use os ids da tela de Atores.')
  return
}
```

> **Duas camadas de validação de propósito**: o canal protege contra qualquer chamador; a tela diz **o que fazer** antes de o usuário clicar em Salvar.

---

## A AUDITORIA QUE FALTAVA

Depois de corrigir, varri **todos** os arquivos de produção:

```
NENHUM canal duplicado em arquivo de producao
```

**Só `purchases-ipc.ts` estava afetado** — os outros arquivos que editei nas r26–r28 estão íntegros.

---

## A LIÇÃO — e ela é sobre o que eu NÃO verifiquei

As rodadas 9, 14, 27 e 29 me ensinaram sobre **escape de caractere**. Esta é diferente:

> **O typecheck me deu confiança falsa.** Ele passou nas três rodadas em que o arquivo tinha 3 cópias de cada handler. Eu li "0 erros" e concluí "está certo".
>
> **A verificação que faltava não é de sintaxe — é de invariante.** "Este arquivo tem N handlers para N canais distintos?" é uma pergunta que nenhuma ferramenta do projeto fazia.

**Adicionada como verificação**: a varredura por canal duplicado agora existe e pode rodar em segundos.

---

## MEDIÇÕES

| Medida | Valor |
|---|---|
| Canais duplicados encontrados | **2** (`definirLimite`, `limite`), ×10 cada |
| Commits afetados | **2** (r27, r28) |
| Linhas removidas | **42** (319 → 277) |
| Canais duplicados após a correção | **0** em todo o `electron/` |
| Handlers | **12** (10 + 2) |
| Gate | **14 checks, ok** |
| Typecheck | **0 erros** |
| Regressão (compra + permissão + erp) | **116 verdes** |

---

## O QUE ISSO MUDA NO MÉTODO

Além das três regras da r29 (`edit` com âncora única, nunca `Replace` em código, `git diff` antes do typecheck), entra uma quarta:

> **Toda edição por script termina com uma verificação de INVARIANTE, não só de compilação.**
>
> Para arquivos IPC: *"quantos handlers existem, e cada canal aparece uma vez?"*
> Para arquivos de store: *"quantos métodos públicos, e cada um aparece uma vez?"*
>
> **É a diferença entre "compila" e "está certo".**
