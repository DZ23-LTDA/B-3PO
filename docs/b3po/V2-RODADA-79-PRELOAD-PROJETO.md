# GOAL V2 — RODADA 79: PRELOAD E WRAPPER DO PROJETO

**Data**: 05/11/2026 · **§12** · o plano chega ao renderer

---

## O QUE FOI CONSTRUÍDO

| Camada | Estado |
|---|---|
| 1. Regra | ✅ r76 |
| 2. Store | ✅ r77 |
| 3. Canal | ✅ r78 |
| **4. Preload** | ✅ **r79** |
| **5. Wrapper** | ✅ **r79** |
| 6. Tela | ❌ |

---

## AS DECISÕES DO WRAPPER

### `rascunho` vira **"a começar"**, não "rascunho"

```ts
rascunho: 'a começar'
```

> **"Rascunho" sugere texto não salvo.** O projeto **está salvo** e **ninguém começou** — que é outra coisa, e a diferença importa para quem olha a lista.

### `sem_criterios` é a recusa que mais importa

```
'Antes de concluir, escreva como saber que terminou.
 Sem critério de aceite, "pronto" é uma opinião.'
```

> **Não é um erro de sistema** — é a informação de que o projeto **ainda não disse o que é "pronto"**.

### O código desconhecido é **mostrado**, não escondido

```ts
return PROJETO_ERRO[codigo] ?? `Não foi possível: ${codigo}`
```

> *"Se o código é novo, mostrar o código ajuda a achar o que faltou traduzir."*
>
> Um `"erro inesperado"` genérico **apagaria exatamente a informação que permite corrigir**.

### `situacaoDoProjeto` diz **"sem tarefas"** e **"sem critério"**

> **Esconder a ausência de critério faria o botão "concluir" parecer disponível** — e ele não está.

### A tela **não recalcula** `podeIniciar`

> **Quem decide é o processo principal**, com o mesmo grafo. O wrapper **delega**.

---

## MEDIÇÕES

| Medida | Valor |
|---|---|
| Canais no preload | **5** |
| Funções no wrapper | **8** |
| Recusas traduzidas | **10** |
| Gate | **14 checks, ok** |
| Typecheck | **0 erros** |
| Testes (ipc + invariantes + nav) | **30 verdes** |

---

## O P4 — ONDE FICOU

| Item | Estado |
|---|---|
| **Planos persistentes** | ✅ **5 de 6 camadas** |
| Project Builder | ⚠️ **falta a tela** |
| Organization Builder | ⚠️ `companies-store` existe; **o Builder não** |
| Agent Factory | ⚠️ agentes existem; **a fábrica não** |

---

## PRÓXIMA RODADA

**A tela de projetos** — `src/app/projetos/`, com o formulário de criação e a lista.

> **79 rodadas.** O plano do §12 atravessa **cinco camadas** — e a única que falta é **a que o usuário toca**. A recusa *"sem critério, pronto é uma opinião"* já está traduzida para a língua da tela; **falta só o lugar onde ela aparece**.
