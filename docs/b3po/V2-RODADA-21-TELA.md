# GOAL V2 — RODADA 21: A TELA (PASSO 5 DE 5 — SPEC CUMPRIDA)

**Data**: 05/11/2026 · **Item 7 — o orquestrador**

---

## O QUE FOI CONSTRUÍDO

| Arquivo | O que é |
|---|---|
| `src/app/sofia/index.tsx` | a tela: planos, tarefas, grafo, prestação de contas |
| `src/api/sofia.ts` | wrapper sobre o bridge (não recalcula nada) |
| **7 registrações** | as 5 da rota + preload + item de menu |

### As cinco registrações, verificadas

```
1. constante SOFIA_ROUTE:      sim
2. AppView 'sofia':            sim
3. AppRouteId 'sofia':         2 ocorrências (a união e o APP_ROUTES)
4. APP_ROUTES:                 sim
5. lazy + Route em surfaces:   sim (2)
+  preload bridge sofia:       sim
+  item no menu:               sim
```

---

## POR QUE A TELA É O PASSO 5, E NÃO UM EXTRA

> **Sem ela, o store, o grafo, os canais e a ponte são código inalcançável** — exatamente o padrão que a r2 mediu em **cinco camadas** (regra → canal → preload → wrapper → tela).
>
> **Um canal sem tela é tão inútil quanto uma tela sem canal.**

---

## AS DECISÕES DA TELA

### 1. Não recalcula o grafo

O canal já devolve `grafo`, `prontas` e `profundidade`. **Recalcular aqui criaria uma segunda topologia**, e as duas divergiriam no **primeiro plano com ciclo**.

### 2. O diagnóstico aparece com o **id das tarefas**

```
Ciclo: a → b → a — este plano nunca termina.
Dependência inexistente: b espera nao-existe
```

> **Um plano que não roda precisa dizer POR QUE**, com as tarefas envolvidas. "Erro no plano" não ajuda ninguém a corrigir.

### 3. A recusa do backend é **mostrada**, não engolida

```ts
if (r && 'error' in r) setErro(String(r.error))
```

> **Um botão desabilitado sem explicação é pior que um botão que explica por que não pode.** `sem_permissao`, `dependencias_pendentes` e `ja_delegada` aparecem como texto.

### 4. Estado vazio é honesto

> *"Nenhum plano ainda. Um plano nasce quando uma intenção vira tarefas com dependências."*
>
> **Não é "nenhum resultado de busca" — é "nada foi criado ainda".** São estados diferentes.

### 5. A profundidade aparece — é o limite de concorrência

`{plano.profundidade !== null && ` · ${plano.profundidade} níveis`}`

> A r18 devolve `null` para ciclo de propósito: **a profundidade de um ciclo é infinita**, e mostrar um número ali deixaria o limite de concorrência passar.

---

## A ENTRADA NO MENU — onde a r15 deixou o lugar

```
 7. O que automatiza    Agentes · Automações · Sofia
```

> A ordem da r15 já tinha a faixa *"o que automatiza"*. **Sofia entra nela**, depois de `Automações` — porque é a camada que **coordena** o que as automações disparam pontualmente.
>
> O teste de contrato foi de **17 para 18 itens**, e as asserções da r15 (Empresa em 2º, ordem comercial) **continuam passando**.

---

## MEDIÇÕES

| Medida | Valor |
|---|---|
| Arquivos novos | **2** (tela + wrapper) |
| Registrações | **7** |
| Itens no menu | **18** (eram 17) |
| Testes de navegação | **13 verdes** |
| Testes de rota | **35 verdes** |
| Gate | **14 checks, ok** |
| Typecheck | **0 erros** |

---

## A SPEC ESTÁ CUMPRIDA — os cinco passos

| # | Passo | Rodada |
|---|---|---|
| 1 | `sofia-store.ts` | ✅ r17 |
| 2 | grafo de dependência | ✅ r18 |
| 3 | `sofia-ipc.ts` (6 canais com guarda) | ✅ r19 |
| 4 | ponte com `agent-execution-store` | ✅ r20 |
| **5** | **tela** | ✅ **r21** |

**O orquestrador deixou de ser infraestrutura: tem contrato, dado, ordem, porta, ponte e rosto.**

---

## O QUE ELE **NÃO** FAZ AINDA — e é honesto dizer

| Capacidade | Estado |
|---|---|
| Interpretar intenção em linguagem natural | **não** — depende de modelo; a tela cria plano por dados |
| Criar plano pela interface | **não** — a tela lista e conclui tarefas; criar é por canal |
| Delegar pelo botão | **não** — a ponte existe, o botão não. Delegar hoje é `sofia:tarefa` via IPC |
| Escolher agente | **não** — o plano precisa vir com `agente_id` |

**A tela atual é de leitura e conclusão.** Ela prova que a cadeia inteira funciona ponta a ponta — do store ao pixel — mas a criação de plano ainda não tem formulário.

**Isso não é falha desta rodada**: a spec §8 lista a tela como o passo 5, e o passo 4 (ponte) e o 3 (canais) já permitem criar e delegar por IPC. O formulário é trabalho de produto, com decisão de UX que ninguém tomou ainda.

---

## PRÓXIMA RODADA

Expandir os negócios progressivamente — o §12 do GOAL: **Organization Builder, Project Builder e Agent Factory**.

O primeiro passo natural é **perguntar ao proprietário** qual dos três vem primeiro, porque cada um muda o que a tela de Sofia mostra. E o GOAL V2 não escolhe por mim.
