# GOAL V2 — RODADA 170: O MENU CONFORME O RBAC — E OS DOIS NÍVEIS QUE EU INVENTEI

**Data**: 05/11/2026 · **§13** · a lacuna do menu

---

## A MEDIÇÃO

| Peça | Estado |
|---|---|
| `ItemDeMenu` | `codicon`, `label`, `path`, `grupo` — **nenhum campo de permissão** |
| Plugin `b3po-nav` | **ZERO** referências a `role`, `actor`, `can`, `rbac` |
| Canais que exigem `read` | **56** |
| Canais que exigem `execute` | **58** |

> **O menu mostra os 23 módulos para qualquer ator**, e o `exigirAtor` de cada canal **só recusa quando a tela já abriu**.
>
> **O operador clica e bate numa parede** — e a parede está **atrás de todas as portas**, não na frente de uma.

---

## O QUE JÁ EXISTIA — e ninguém perguntava

```
hermes:admin:whoami   →  existe desde antes desta sessão
preload.ts:148        →  whoami: () => ipcRenderer.invoke('hermes:admin:whoami')
api/admin.ts:59       →  export async function whoami(): Promise<ActorRow | null>
```

> **O renderer podia saber o ator e nunca perguntava.** **Não faltava canal: faltava pergunta.**
>
> **É a mesma família da r161–r166, um nível acima**: lá era **um campo que a tela não mostrava**; aqui é **um canal que a tela não consulta**.

---

## A DECISÃO

O critério é **`read`**, não `execute`.

> **Quem só LÊ um módulo deve vê-lo**: esconder o que a pessoa pode consultar **transformaria permissão em segredo**.
>
> **E `read` é o que o canal exige para LISTAR** — então a tela abre e mostra.

### As três regras

| # | Regra | Por quê |
|---|---|---|
| **1** | **Sem ator (`null`), o menu aparece inteiro** | o `whoami` devolve `null` quando a ponte não está pronta; **esconder tudo aí deixaria a barra vazia por um erro de carregamento** |
| **2** | **Nível `null` não lê** | `null` **não é "todos os poderes"**: é nível não atribuído |
| **3** | **Bot vê o que o humano vê** | não há menu de bot |

---

## O ERRO QUE EU COMETI — e o teste o pegou

**Escrevi `ORDEM_DO_NIVEL` de memória:**

```ts
EXECUTE_ALLOWED: 4,   // ERRADO
WRITE: 3              // NÃO EXISTE
```

**O `RANK` real da L80 do `rbac.ts`:**

```ts
EXECUTE_ALLOWED: 3, SUPERVISED_AUTONOMY: 4, PREPARE: 2, RECOMMEND: 1, READ: 0
```

> **Dois números inventados e um nível que não existe.**
>
> **Duas listas de níveis com ordens diferentes fariam o menu discordar do canal** — e **o canal é quem manda, porque é ele que recusa**.
>
> **O teste agora trava os cinco valores e afirma que `WRITE` é `undefined`** — para que a invenção não volte.

---

## A PROVA — 8 testes

| Grupo | O que trava |
|---|---|
| **o nível** | `READ` vê · **quem executa também lê** · **`null` não lê** · desconhecido não lê |
| **sem ator** | **lista inteira** · **com nível `null`, lista vazia** |
| **a ordem** | **os cinco valores reais** · **`WRITE` não existe** |

---

## MEDIÇÕES

| Medida | Valor |
|---|---|
| Linhas | **~75** |
| Testes | **8** |
| Canais que exigem `read` | **56** |
| Gate · Typecheck | **14 ok · 0 erros** |

---

## O QUE FALTA — e está dito

| Item | Estado |
|---|---|
| **a decisão** | ✅ r170 |
| **a montagem no `b3po-nav`** | ❌ **falta** |
| **o fluxo (o menu muda com o ator)** | ❌ **falta** |

> **Quinta vez** (r133, r140, r146, r151, r170) — e **as quatro anteriores foram montadas na rodada seguinte**.

---

## PRÓXIMA RODADA

**A montagem: o plugin chama `whoami()` e filtra `MODULOS_DO_PRODUTO`** — com um teste provando que o menu de um `viewer` e o de um `owner` diferem.

> **170 rodadas.** **O canal existia desde antes desta sessão, e o menu nunca perguntou.** **57 canais exigem permissão e a barra não conhecia nenhuma** — **a mesma distância entre "o dado está lá" e "a tela pergunta", agora do lado do ator.**
