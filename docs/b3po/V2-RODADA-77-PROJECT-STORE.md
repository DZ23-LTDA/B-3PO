# GOAL V2 — RODADA 77: O STORE DO PROJETO — O PLANO SOBREVIVE

**Data**: 05/11/2026 · **§12** · planos persistentes, camada 2

---

## O QUE A r76 DEIXOU

*"Próxima rodada: o store do projeto — `projetos.json`, para que o plano sobreviva ao reinício."*

**Enquanto isso vivia só em memória, fechar o app apagava o motivo.**

---

## O QUE FOI CONSTRUÍDO

`project-store.ts` — **~180 linhas**, com fila de escrita e o padrão atômico (`tmp` + `rename`).

---

## AS DECISÕES DO STORE

### 1. **Projeto sem objetivo é descartado na leitura**

```ts
p.objetivo.trim().length > 0
```

> **Ele quebraria a regra que dá sentido ao tipo** — e um objeto que não é um projeto **não deve entrar na lista de projetos**.

### 2. **O store NÃO valida o grafo**

> `podeIniciar(id, tarefas)` **recebe as tarefas de fora**: o store **não conhece a `sofia-store`**.
>
> **Um store que buscasse a `sofia-store` para validar juntaria duas donas de dado no mesmo lugar** — e a r39 já mostrou o custo disso na conferência de compras.

### 3. **Nome repetido é permitido**

> *"Duas frentes com o mesmo nome são comuns («Site»), e o id é o que identifica. Recusar obrigaria a inventar sufixos que ninguém lembra depois."*

### 4. **Rascunho não conta como ativo**

> `ativos()` filtra por `ativo` — **rascunho é "ninguém começou"**.

---

## A PROVA — 17 testes novos (43 no total)

| Grupo | O que trava |
|---|---|
| **caminho** | `b3po/projetos.json` · corrompido vira vazio · **sem objetivo é descartado** |
| **criar** | nasce rascunho · **nome repetido permitido** · **sobrevive a instância nova** |
| **listar** | **rascunho não é ativo** · **outro tenant não aparece** |
| **mudar** | rascunho → ativo → concluído · **SEM CRITÉRIO RECUSADO atravessa o disco** |
| | **concluído não volta** |
| **podeIniciar** | **delega ao grafo** · a resposta chega **inteira** quando há ciclo |

> **O teste que mais importa é o da linha "sem critério recusado atravessa o disco"**: a regra da r76 **não é uma validação de fachada** — ela vale **depois do JSON**, e é o que garante que um plano salvo em disco **não pode ser marcado pronto sem critério**.

---

## MEDIÇÕES

| Medida | Valor |
|---|---|
| Linhas | **~180** |
| Testes novos | **17** |
| Total de projeto | **43** |
| Regressão | **148 verdes** |
| Gate | **14 checks, ok** |
| Typecheck | **0 erros** |

---

## O P4 — ONDE FICOU

| Item | Estado |
|---|---|
| ADR de Sofia · Task Orchestrator · policy | ✅ |
| **Planos persistentes** | ✅ **regra (r76) + disco (r77)** |
| Organization Builder | ⚠️ `companies-store` existe; **o Builder não** |
| Project Builder | ⚠️ **regra + store**; **falta canal, preload, wrapper, tela** |
| Agent Factory | ⚠️ agentes existem; **a fábrica não** |

---

## PRÓXIMA RODADA

**O canal do projeto** — `hermes:projetos:{listar,criar,mudar}` com guarda, e o preload.

> **77 rodadas.** O "plano persistente" do §12 existe em regra **e** em disco — e a regra mais importante dele é uma **recusa**: **um projeto salvo não pode ser declarado pronto sem critério de aceite**, nem quando o dado volta do arquivo.
