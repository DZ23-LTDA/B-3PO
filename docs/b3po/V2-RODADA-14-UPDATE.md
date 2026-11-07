# GOAL V2 — RODADA 14: ATUALIZAÇÃO — UMA FALHA CURADA, UMA RECUSADA

**Data**: 05/11/2026 · **Item 4 — atualização do Desktop**

---

## 1. `checkout-legacy` — CURADO

### O que estava errado

```ts
python: process.env.HERMES_PYTHON || 'python3',
```

No Windows, **`python3` é o stub da Microsoft Store**: existe no PATH, imprime *"Python não foi encontrado"* e sai com **9009**. O teste falhava com um erro de spawn que não dizia nada sobre o produto.

### A correção — `python-for-tests.ts`

```ts
export function resolverPython(env = process.env): null | string
```

Ordem: `HERMES_PYTHON` → `python` (Windows primeiro) → `python3` (Linux/macOS primeiro).

**Cada candidato é validado por execução** (`-c "import sys"`), não por existir no PATH — porque **o stub da Store existe no PATH e mesmo assim falha**. Só a execução prova.

**Quando nenhum responde**: devolve `null`, e o teste **pula com motivo** em vez de falhar com erro de spawn.

### Resultado

| Antes | Depois |
|---|---|
| `1 failed \| 1 passed \| 1 skipped` | **`2 passed \| 1 skipped`** |

**Uma das 40 falhas, curada na raiz** — sem trocar `python3` por `python` no código de produção (o que quebraria o CI em Linux).

---

## 2. `system-proxy-env` — RECUSADA

### O bug que eu achei

```ts
expect(restoreUserProxyEnv({ ...user, ...env })).toEqual(user)
// esperado: { PATH, NO_PROXY }
// recebido: { PATH, NO_PROXY, no_proxy }
```

**`restoreUserProxyEnv` removia `NO_PROXY` mas deixava `no_proxy`.**

### O probe

Rodei o cenário com `isWindows: false`:

```
ENV:        {..., "no_proxy": "...", "HERMES_UPDATE_SYSTEM_PROXY": "...,no_proxy"}
RESTAURADO: {"PATH":"/usr/bin","NO_PROXY":"corp.internal"}
USER:       {"PATH":"/usr/bin","NO_PROXY":"corp.internal"}
```

**Em Linux, funciona perfeitamente.** O marcador inclui `no_proxy`, e o restore a remove.

### A causa real

No **Windows**, `no_proxy` e `NO_PROXY` são a **mesma variável** para o filho, mas `userEnv` é um objeto **case-sensitive**. Com o usuário tendo só `NO_PROXY`, a chave `no_proxy` **não existe** — e o código a tratava como "tem valor herdado", salvando sem marcar como criada.

### Por que não corrigi

Tentei. A correção (`existiaNoUsuario` separado do valor herdado) **quebrou outro teste**:

```
× reads proxy settings in any letter case, as urllib and Windows do
  expected [ 'HTTPS_PROXY', 'https_proxy', …(4) ] to not include 'NO_PROXY'
```

**O comportamento antigo era intencional naquele caso.** Eu não entendi o design o suficiente para mexer com segurança — e "quebrar um teste para consertar outro" não é conserto.

**Revertido.** Fica documentado como o que é: **uma das 3 falhas indeterminadas** que a r250 já tinha classificado assim.

---

## MEDIÇÕES FINAIS

| Medida | Valor |
|---|---|
| Falhas curadas nesta rodada | **1** (`checkout-legacy`) |
| Correções recusadas com prova | **1** (`system-proxy-env`) |
| Suíte `updater/` | **222 verdes · 1 falha · 37 pulados** (era 221 + 2 falhas) |
| Gate | **14 checks, ok** |
| Typecheck | **0 erros** |
| Arquivos de produto alterados | **0** |

---

## O PADRÃO DAS DUAS ÚLTIMAS RODADAS

| Rodada | Tentei | O teste mostrou | Veredito |
|---|---|---|---|
| r13 | reduzir timeout de 15 s → 2 s | **roubo de lock** entre processos | **recusada** |
| r14 | corrigir restore de `no_proxy` | **quebra caso intencional** de case-insensitivity | **recusada** |
| r14 | resolver Python por execução | nada — passou | **aceita** |

> **Duas recusas e uma cura.** A taxa importa menos que o critério: **corrigir sem conseguir prever a consequência é trocar um bug conhecido por um desconhecido.**

---

## PRÓXIMA RODADA

**Item 5 — reorganizar a navegação contextual.** É o pedido direto do proprietário desde antes do GOAL: *"a criação da empresa está misturada com os demais"*. Hoje são **17 itens num bloco único**, com `Empresa` no fim, junto de `Documentos` e `Privacidade`.

O arquivo é `apps/desktop/src/plugins/b3po-nav/plugin.tsx`, com teste de contrato em `plugin.test.ts`.
