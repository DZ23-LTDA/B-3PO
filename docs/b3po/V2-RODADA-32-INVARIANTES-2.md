# GOAL V2 — RODADA 32: A INVARIANTE ESTENDIDA AO QUE JÁ ESTAVA LIMPO

**Data**: 05/11/2026

---

## O QUE A r31 DEIXOU ABERTO

> *"O que ele **não** cobre: métodos duplicados em stores · handlers duplicados em `main.ts`."*

**Esta rodada cobriu os dois.**

---

## A AUDITORIA — feita antes de escrever o teste

| Alvo | Resultado |
|---|---|
| **26 stores** — métodos públicos duplicados | **0** |
| **`main.ts`** — 99 handlers, canais duplicados | **0** |

> **A duplicação foi só no `purchases-ipc.ts`.** A r30 já suspeitava; agora está medido.
>
> **Nada a consertar** — o que resta é **prevenir**.

---

## OS TRÊS TESTES NOVOS

### `main.ts` — nenhum canal duas vezes

```ts
expect(canais.length).toBeGreaterThan(50)   // guarda de vacuidade
const problemas = [...contagem.entries()].filter(([, n]) => n > 1).map(...)
expect(problemas).toEqual([])
```

**`main.ts` tem 99 handlers inline** — é o arquivo onde a duplicação seria **mais cara e menos visível**, porque não há um `registerXxxIpc` para conferir.

### Stores — nenhum método público duas vezes

```ts
for (const m of fonte.matchAll(/^ {2}(?:async )?([a-zA-Z_]\w*)\s*(?:<[^>]*>)?\(/gm)) { ... }
```

O padrão casa **métodos de classe** (coluna 2) e **não** casa funções de módulo (coluna 0) nem `private`, que são internos e podem repetir entre classes.

### O detector não pode passar por vacuidade

```ts
const amostra = metodosPublicos(readFileSync(join(DIR, 'finance-store.ts'), 'utf8'))
expect(amostra.length).toBeGreaterThan(2)
```

> **Se o regex parar de casar, o teste acima passaria sem verificar nada.** Este mede o **detector**.

---

## A PROVA — e um erro meu nela

**Tentei provar primeiro injetando `async listDuplicado(`** em `finance-store.ts`. O teste **passou** — e eu quase registrei "não funciona".

**O erro**: `listDuplicado` é um nome **diferente**. O detector procura nome **repetido**, não nome parecido.

**Refiz com o mesmo nome:**

```
finance-store.ts: list() declarado 2 vezes
```

**Detectado.** Revertido.

> **A prova de um detector tem de injetar exatamente o que ele procura.** Uma prova mal desenhada "confirma" que o detector não funciona — e a conclusão errada seria desligá-lo.

---

## MEDIÇÕES

| Medida | Valor |
|---|---|
| Testes no arquivo de invariantes | **7** (eram 4) |
| Arquivos cobertos | **26 stores** + **`main.ts`** + **20+ `*-ipc.ts`** |
| Handlers em `main.ts` verificados | **99** |
| Duplicatas encontradas | **0** |
| Prova do vermelho | **sim** (nas duas frentes: IPC e store) |
| Gate | **14 checks, ok** |
| Typecheck | **0 erros** |

---

## A COBERTURA COMPLETA DA CLASSE DE BUG

| Arquivo | Invariante | Desde |
|---|---|---|
| `*-ipc.ts` | nenhum canal duplicado no arquivo | r31 |
| `*-ipc.ts` | nenhum canal em dois arquivos | r31 |
| `*-ipc.ts` | `-ipc.ts` sem handler = nome que mente | r31 |
| **`main.ts`** | nenhum canal duplicado | **r32** |
| **`*-store.ts`** | nenhum método público duplicado | **r32** |

> **O bug da r27 nasceu de uma edição por script que triplicou um bloco.** As cinco invariantes cobrem **todos os arquivos onde aquele script poderia ter causado o mesmo dano**.

---

## O QUE **AINDA** NÃO ESTÁ COBERTO

| Lacuna | Por quê |
|---|---|
| **Duplicação semântica** | dois handlers distintos que fazem a mesma coisa. É intenção, não estrutura — nenhum teste estrutural pega |
| **Blocos duplicados em arquivos de tela** | `src/app/**` não tem invariante equivalente; o `compras/index.tsx` foi editado pelo mesmo método |
| **Duplicação histórica em branches antigas** | só medi o HEAD |

> **A segunda é a mais concreta**: as telas foram editadas pelas mesmas ferramentas que corromperam o IPC. **Nada garante que estão íntegras.**

---

## PRÓXIMA RODADA

**Verificar as telas.** O `compras/index.tsx` foi editado com `Replace` nas rodadas 28–30 — e passou de **371 para 503 linhas**. Não sei se o crescimento é todo legítimo.

**Um invariante possível**: *"nenhum bloco de JSX com mais de N linhas aparece duas vezes"* — grosseiro, mas pegaria o caso que me custou 4 rodadas.
