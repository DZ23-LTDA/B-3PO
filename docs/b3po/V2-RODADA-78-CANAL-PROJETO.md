# GOAL V2 — RODADA 78: O CANAL DO PROJETO — A REGRA ATRAVESSA A PORTA

**Data**: 05/11/2026 · **§12** · o plano chega a quem usa

---

## O QUE FOI CONSTRUÍDO

`projects-ipc.ts` — **5 canais**, todos com guarda:

| Canal | Ação | O que faz |
|---|---|---|
| `hermes:projetos:listar` | **`read`** | a lista do tenant |
| `hermes:projetos:ativos` | **`read`** | os que estão em andamento |
| `hermes:projetos:criar` | **`execute`** | cria em rascunho |
| `hermes:projetos:mudar` | **`execute`** | transição de status |
| `hermes:projetos:podeIniciar` | **`read`** | delega ao grafo |

---

## AS DECISÕES DO CANAL

### `read` e `execute` separados

> **Saber o que está em andamento não é agir.** Separar permite um perfil **só de consulta** — e o teste prova: **`LEITOR` lista, mas não cria**.

### O que vem do payload, e o que **não vem**

| Campo | Origem | Por quê |
|---|---|---|
| `equipe` | **payload** | é **informação sobre o trabalho**, não identidade de quem age |
| **quem age** | **`deps.actorOf()`** | *"se viesse do renderer, bastaria editar o JSON para agir como o dono"* |
| `status` | payload, mas **não é autoridade** | **`mudarProjeto` recusa as transições** — a regra mora lá, não aqui |

### `podeIniciar` aceita as tarefas do payload — e é aceitável aqui

> *"O store não conhece a `sofia-store`. Isso é aceitável aqui e **não seria** para uma decisão de segurança: `podeIniciar` só responde sobre o **grafo que o chamador entregou**, e a resposta **não muda dado nenhum**."*

---

## O RATCHET — e o que ele mostrou

O teste de cobertura falhou: **44 arquivos** em vez de 43.

> **Mas `projects-ipc.ts` TEM guarda.** Ele **aumenta o denominador, não a dívida** — e a dívida continua **17**.
>
> **É exatamente o comportamento que o ratchet existe para permitir**: código novo **com** política **não paga dívida**, e o número que conta (17) **não subiu**.

---

## A PROVA — 10 testes novos

| Teste | O que trava |
|---|---|
| **5 canais com o prefixo do domínio** | nada de canal fora do padrão |
| **sem ator, recusa** | projeto não é público |
| **LEITOR consulta, mas não cria** | `read` ≠ `execute` |
| **criar sem objetivo volta como erro** | não é exceção |
| **ativos não inclui rascunho** | até alguém começar |
| **SEM CRITÉRIO RECUSADO ATRAVÉS DO CANAL** | a regra da r76 chega na porta |
| **podeIniciar com ciclo recusa** | o grafo da r18 responde aqui |

---

## MEDIÇÕES

| Medida | Valor |
|---|---|
| Canais novos | **5** |
| Testes novos | **10** |
| Ratchet | **17 de 44** (a dívida **não subiu**) |
| Regressão | **65 verdes** |
| Gate | **14 checks, ok** |
| Typecheck | **0 erros** |

---

## O P4 — ONDE FICOU

| Item | Estado |
|---|---|
| ADR de Sofia · Task Orchestrator · policy | ✅ |
| **Planos persistentes** | ✅ **regra + disco + canal** |
| Project Builder | ⚠️ **3 de 5 camadas** — falta preload e tela |
| Organization Builder | ⚠️ `companies-store` existe; **o Builder não** |
| Agent Factory | ⚠️ agentes existem; **a fábrica não** |

---

## PRÓXIMA RODADA

**Preload + wrapper do projeto** — para a tela poder chamar os 5 canais.

> **78 rodadas.** A regra do projeto atravessou **três camadas** (regra → disco → canal) e **continua recusando**: *"sem critério, ninguém declara pronto"* vale **no arquivo, no store e na porta**.
