# GOAL V2 — RODADA 3: PRIVACIDADE (LGPD) PROTEGIDA

**Data**: 05/11/2026 · **Fase 2 — correção de IPC** · 1 de 30 canais de domínio fechados

---

## O QUE FOI FECHADO

`privacy-ipc.ts` — **3 canais**, todos passando pela guarda:

| Canal | Antes | Agora |
|---|---|---|
| `hermes:privacy:export` | aberto | **`read` + ator** |
| `hermes:privacy:preview` | aberto | **`read` + ator** |
| **`hermes:privacy:anonymize`** | aberto | **`execute` + ator** |

**Por que este primeiro**: anonimização de titular **não tem desfazer**. Era o único canal do inventário com efeito **permanente e irreversível** sobre dado pessoal.

---

## A MUDANÇA

### `privacy-ipc.ts`

```ts
export interface PrivacyDeps {
  store: PrivacyWriteDeps

  /**
   * Ator resolvido no processo principal. `null` recusa.
   *
   * Obrigatório de propósito: um parâmetro opcional com default "sem guarda" é pior que não ter
   * guarda, porque parece protegido.
   */
  actorOf: () => Promise<Actor | null>
}
```

E cada handler passa por `exigirAtor`:

```ts
ipcMain.handle('hermes:privacy:anonymize', async (_event, payload) =>
  exigirAtor(deps.actorOf, 'execute', 'privacy', async () => {
    if (!payload || typeof payload !== 'object') return { error: 'pedido_invalido' }
    if (p['confirmar'] !== true) return { error: 'confirmacao_obrigatoria' }

    return aplicarAnonimizacao(p['telefone'], deps.store)
  })
)
```

### Duas decisões que importam

**1. `anonymize` é `execute`, não `read`.**
Quem só pode ler não deve poder apagar. Usar `read` faria o canal parecer protegido e permitir apagar.

**2. A guarda roda ANTES da validação do payload.**
Sem ator, a resposta é `sem_permissao` — e **nem se avalia se o pedido estava bem formado**. Quem não tem permissão não precisa saber o formato.

### `erp-ipc.ts`

```ts
registerPrivacyIpc(ipcMain, {
  actorOf: () => actorOf(),   // o mesmo resolvedor dos outros domínios
  store: { ... }
})
```

---

## A PROVA — teste vermelho sem a correção

`privacy-ipc-permission.test.ts` — **6 testes novos**.

| Estado | Resultado |
|---|---|
| **Com a guarda** | **6 de 6 passam** |
| **Sem a guarda** (`git stash` no `privacy-ipc.ts`) | **3 de 6 falham** |

As 3 que falham sem a guarda:

```
× sem ator, os três recusam com sem_permissao
× sem ator, a recusa acontece ANTES de validar o payload
× sem ator, anonymize NAO apaga nada
```

> `AssertionError: hermes:privacy:export deveria recusar sem ator: expected false to be true`

**O terceiro é o mais importante**: ele conta quantas vezes o store foi chamado para apagar. **Sem a guarda, `apagou` deixa de ser 0.**

---

## O RATCHET PEGOU A MINHA PRÓPRIA MUDANÇA

Depois de proteger o canal, o gate falhou:

```
FAIL  electron/permission-coverage-ratchet.test.ts
```

**Por quê**: `privacy-ipc.ts` ganhou guarda **e continuou na lista de dívida**. O ratchet tem um teste para isso — `mentirosos`, canais que já têm guarda e seguem na lista.

**Isso é o ratchet funcionando.** Ele me obrigou a atualizar a dívida:

| Antes | Depois |
|---|---|
| `SEM_GUARDA` = **25** de 40 | **24** de 40 |

---

## MEDIÇÕES

| Medida | Valor |
|---|---|
| Canais fechados nesta rodada | **3** |
| Canais de domínio restantes sem guarda | **27** (eram 30) |
| Arquivos na dívida do ratchet | **24** (eram 25) |
| Testes novos | **6** |
| Provados vermelhos sem a correção | **3** |
| Regressão (privacy + permissão + erp + crm) | **225 verdes** |
| Gate | **14 checks, ok** |
| Typecheck | **0 erros** |

---

## PRÓXIMA RODADA

**`fiscal-ipc.ts`** — 4 canais, incluindo `hermes:fiscal:emitir`, que **emite documento com efeito legal**.

Depois: `automation-ipc.ts` (6) · `marketing-ipc.ts` (7) · `after-sales` (4) · `scheduling-block` (3) · `service-desk` (2) · `analytics` (1).
