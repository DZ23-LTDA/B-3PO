# GOAL V2 — RODADA 19: OS CANAIS DE SOFIA (PASSO 3 DE 5)

**Data**: 05/11/2026 · **Item 7 — o orquestrador**

---

## O QUE FOI CONSTRUÍDO

`apps/desktop/electron/sofia-ipc.ts` — **6 canais**, **todos com `exigirAtor` desde o primeiro commit**.

| Canal | Ação |
|---|---|
| `hermes:sofia:planos` | `read` — lista com grafo e prontas |
| `hermes:sofia:plano` | `read` — um plano com diagnóstico |
| `hermes:sofia:criar` | `execute` |
| `hermes:sofia:tarefa` | `execute` |
| `hermes:sofia:status` | `execute` |
| `hermes:sofia:aprovar` | `execute` |

---

## POR QUE NASCERAM PROTEGIDOS

A r2 mediu **219 canais `ipcMain.handle` e 1 com guarda**. Levaram **seis rodadas** (r3–r8) para fechar os 30 de domínio, e cada uma precisou **provar o vermelho** com o canal aberto.

> **Este arquivo não repete o erro.**

E a prova de que funcionou: **o ratchet falhou na primeira execução** — não porque faltou guarda, mas porque o **total de arquivos subiu de 40 para 41**. `sofia-ipc.ts` é `*-ipc.ts` e o ratchet o contou; **não entrou na lista de dívida, porque tem guarda**.

```
✓ a divida nao cresce: nenhum canal novo nasce sem guarda
× a divida medida hoje e 17 de 40    ← total mudou para 41
```

**Atualizado para `17 de 41`.** E o número que importa não mudou: **17 arquivos na dívida**, porque os 6 novos **não deviam nada**.

---

## AS DUAS DECISÕES DE SEGURANÇA

### 1. `ator_id` vem do **resolvedor**, nunca do payload

```ts
const ator = await deps.actorOf()

return deps.store.criar({
  ...raw,
  ator_id: ator?.id ?? '',     // ← sobrescreve o que o renderer mandou
  ...
})
```

**Teste:** o payload tenta se passar por outra pessoa (`ator_id: 'outra-pessoa'`); o plano é gravado com `ator-dono`.

> Se o renderer escolhesse o dono, **criar trabalho em nome de outra pessoa** seria um campo de texto.

### 2. `aprovador` também vem do resolvedor

```ts
return deps.store.aprovar(planoId, ator?.id ?? '')
```

**Teste:** o dono tenta se autoaprovar mandando `por: 'outra-pessoa'`. O store compara com o `ator_id` do plano e **recusa com `autoaprovacao`**.

> **Se o canal deixasse o renderer mandar o nome do aprovador, a recusa do store seria decorativa**: bastaria escrever o nome de outra pessoa.

---

## A PROVA — 12 testes novos, e o que cada um trava

| Teste | O que impede |
|---|---|
| **os seis existem** | alguém remover um canal sem perceber |
| **sem ator, os seis recusam** | um canal nascendo aberto |
| **sem ator, nenhum plano é criado** | escrita acontecendo sem responsável |
| **renderer não escolhe o dono** | escalada por campo de texto |
| **aprovador do resolvedor** | autoaprovação disfarçada |
| **outro ator aprova de verdade** | aprovação registrada com o id real |
| **planos vêm com grafo** | a tela recalcular topologia e divergir |
| **plano inexistente devolve `null`** | 404 virar erro de servidor |
| **ciclo é exposto, não escondido** | tela mostrar plano que parece normal e nunca termina |

**O último é o mais importante do ponto de vista de produto:**

```ts
expect(r.planos[0]?.grafo.valido).toBe(false)
expect(r.planos[0]?.grafo.ciclos).toHaveLength(1)
expect(r.planos[0]?.profundidade).toBeNull()
```

> **O plano grava; o diagnóstico diz que não roda.** Esconder o ciclo faria a tela mostrar um plano que **parece normal e nunca termina**.

---

## MEDIÇÕES

| Medida | Valor |
|---|---|
| Canais criados | **6** — **todos com guarda** |
| Testes novos | **12** |
| Suíte de Sofia | **59 verdes** (19 store + 28 grafo + 12 canais) |
| Regressão (sofia + permissão + erp) | **87 verdes** |
| Ratchet | **17 de 41** — os 6 novos não deviam nada |
| Gate | **14 checks, ok** |
| Typecheck | **0 erros** |

---

## ONDE ESTAMOS NA SPEC

| # | Passo | Estado |
|---|---|---|
| 1 | `sofia-store.ts` | ✅ r17 |
| 2 | grafo de dependência | ✅ r18 |
| **3** | **`sofia-ipc.ts`** | ✅ **r19** |
| 4 | Ponte com `agent-execution-store` (`parent_execution_id`) | próxima |
| 5 | Tela | depois |

---

## PRÓXIMA RODADA — passo 4

**A ponte com o `agent-execution-store`.** É o passo que **preenche o `parent_execution_id`** — o campo que existe no tipo desde que o store nasceu e **nunca foi usado**.

O que a ponte faz:
- Ao delegar uma tarefa, grava `execucao_id` na tarefa
- A execução recebe `parent_execution_id` da execução da tarefa da qual depende
- O status da tarefa **acompanha** o da execução — lendo, não copiando

**E é aqui que a invariante 1 da r17 fica provada de verdade**: se a ponte copiar o status em vez de ler, os dois podem divergir.
