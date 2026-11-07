# Guarda de permissão no financeiro: o primeiro canal de domínio (rodada 215)

## O que a r214 deixou em aberto

A r214 mediu **2 de 40 canais** com guarda e concluiu que ligar os 38 seria "autorização sem sujeito".

**Essa conclusão estava parcialmente errada.** Fui verificar e **o sujeito existe**:

```ts
// erp-ipc.ts
const actorOf = async () => {
  await actors.ensureOwner()          // cria o dono se a instalação é nova
  return primaryOwner(await actors.list())
}
```

`admin-ipc` já fazia isso. O que faltava **não era o sujeito — era a guarda ligada**.

## O que foi feito

`finance-ipc.ts` passou a exigir ator, com três decisões:

| Decisão | Por quê |
|---|---|
| **`actorOf` obrigatório**, não opcional | um parâmetro opcional com default "sem guarda" **volta a ser o buraco** que a r214 mediu: quem monta o canal esquece, e nada falha |
| **sem ator ⇒ `sem_permissao`**, não erro de sistema | o chamador precisa saber que **faltou permissão**, e não que o financeiro quebrou |
| a recusa **não carrega o dado** | uma recusa que devolve os lançamentos **não recusou nada** |

Acoes: `read` para `list`, `totals`, `costCenters`; `execute` para `append`, `settle`.

`erp-ipc` injeta: `registerFinanceIpc(ipcMain, finance, { actorOf: () => actorOf() })`.

## Medido nos testes (8 novos)

| Situação | Resultado |
|---|---|
| sem ator → `list` | recusa, **`entries` ausente** |
| sem ator → `append` | recusa, **nada gravado** |
| sem ator → `totals` / `costCenters` | recusa |
| sem ator → `settle` | recusa, **status continua `aberto`** |
| dono → `list` / `append` | funciona |
| **nível `READ` → `append`** | recusa com motivo, **nada gravado** |
| **nível `READ` → `list`** | **funciona** |

**O último é o que separa guarda boa de guarda burra**: uma guarda que transforma "não pode escrever" em "não pode ler" quebraria a tela para quem só consulta.

## O ratchet desceu

| | r214 | r215 |
|---|---|---|
| Canais com guarda | 2 | **3** |
| Dívida | 38 | **37** |

O teste `permission-coverage-ratchet.test.ts` agora **exige** que `finance-ipc.ts` continue com guarda — se alguém a remover, dois testes falham.

## O que isso muda no produto

Antes: **qualquer código no renderer lia e gravava o financeiro** — sem verificação e **sem deixar registro**.

Agora: a operação passa por `withPermission`, que **registra toda chamada, permitida ou negada** (`onAudit`). O dono continua fazendo tudo — o que se ganha é **o registro de quem fez e a recusa quando não há dono**.

## O que continua aberto

| Item | Estado |
|---|---|
| Guarda nos **37** canais restantes | pendente — o padrão agora está provado e replicável |
| Auditoria persistida (`onAudit` gravando em disco) | `permission-guard` só acumula em memória por default |
| Login com usuários distintos | **decisão do dono** — sem ele, todos os atores são o dono |

## Medido

| Medida | Valor |
|---|---|
| Canais com guarda | **3 de 40** (era 2) |
| Testes novos | **8** (permissão) + 5 (ratchet, com 1 asserção nova) |
| Typecheck | **0 erros** |
| Testes de financeiro | **45 verdes** |
