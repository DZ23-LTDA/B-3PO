# GOAL V2 — RODADA 123: A CAMADA QUE FALTAVA ENTRE A REGRA E A TELA

**Data**: 05/11/2026 · **§13:413-419** · onde a escolha fica guardada

---

## O QUE JÁ EXISTIA

| Rodada | O que entregou |
|---|---|
| **r121** | a **regra**: quais grupos em qual ambiente, e o que fica de fora |
| **r122** | os grupos **reais**: campo em `ItemDeMenu`, 23 de 23, 6 testes |

**Faltava uma coisa entre a regra e a tela: onde a escolha fica guardada.**

---

## A DECISÃO — e ela é sobre **autoridade**

> **`apps/desktop/AGENTS.md`: "decida o estado pela AUTORIDADE".**

O ambiente é **o que esta janela mostra na barra lateral**. **Não muda dado, não muda permissão, não é compartilhado com outra sessão do mesmo perfil.**

> **Um segundo Desktop aberto no mesmo `userData` pode estar em outro ambiente — e os dois estão certos.**

**Então ele vive no `localStorage`** — como `chat-text-scale` e `session-list-density` — e **não no `ui-preferences` do main**.

> **Persistir no main faria uma janela decidir pela outra.**

---

## O QUE ELE **NÃO** É

> **Não é permissão.** Trocar de ambiente **não autoriza nada**: `permission-guard` continua sendo **a única porta**.

**A mesma frase da r121, repetida no código e num teste** — porque é o erro mais fácil de cometer ao acrescentar um seletor.

---

## AS QUATRO FUNÇÕES

| Função | O que faz |
|---|---|
| `$ambiente` | o átomo, lido do `localStorage` na carga |
| `setAmbiente(valor)` | **normaliza** e grava |
| `alternarAmbiente()` | o que o botão faz |
| `recarregarAmbiente()` | **relê** — porque o evento `storage` **não dispara na aba que escreveu** |

### O padrão é `'empresa'`

> **Não é neutro**: é o ambiente de quem **abre o produto para tocar o negócio**, que é a maioria — e é o que o **§13:417 põe primeiro**. Quem constrói troca **uma vez**, e a escolha fica.

---

## A PROVA — 7 testes

| Grupo | O que trava |
|---|---|
| **o padrão** | Empresa |
| **trocar** | grava **e** muda o átomo · alterna vai e volta |
| **valor inválido** | `'outro'`, `''`, `'EMPRESA'`, `null`, `42`, `{}` → **o PADRÃO, não um terceiro estado** |
| **recarregar** | outra janela trocou → adota · **gravado com lixo → volta ao padrão** |
| **a chave** | tem `.v1` — **uma mudança de forma não lê o antigo como novo** |

### O teste que mais importa

```ts
for (const ruim of ['outro', '', 'EMPRESA', null, undefined, 42, {}]) {
  setAmbiente(ruim)
  expect($ambiente.get()).toBe('empresa')
}
```

> **Um valor corrompido no `localStorage` não pode deixar a tela sem ambiente nenhum.** Ele volta ao padrão — e **`'EMPRESA'` em maiúsculas é lixo**, não um apelido.

---

## MEDIÇÕES

| Medida | Valor |
|---|---|
| Linhas | **~95** |
| Testes | **7** |
| Gate · Typecheck | **14 ok · 0 erros** |

---

## O §13 — ONDE ESTÁ

| Item | Estado |
|---|---|
| **Grupos do §13** | ✅ r122 |
| **Regra do ambiente** | ✅ r121 |
| **Onde a escolha vive** | ✅ **r123** |
| **Seletor visível (o botão)** | ❌ **falta — e é a r124** |
| **Filtro aplicado ao menu** | ❌ **exige o HOST, não o plugin** |

---

## O QUE A r124 VAI ENCONTRAR — e já está medido

> **O plugin contribui; o HOST renderiza.** `SIDEBAR_NAV_AREA` é o contrato, e **quem desenha a barra lateral é o upstream** — não o `b3po-nav`.
>
> **Filtrar o menu a partir do plugin não funciona**: ele devolve uma lista, e o host a desenha **inteira**.
>
> **Então a r124 tem duas rotas**: (a) um **botão de troca** que já muda o que a tela mostra onde o produto controla, ou (b) **mexer no host**, que é código do upstream e **não é nosso para mudar sem cuidado**.

> **123 rodadas.** O §13 pediu **navegação por ambiente**. A regra existe, os grupos são reais, a escolha é guardada — e **o botão ainda não existe**, porque **a barra lateral não é nossa**. **Dizer isso agora é melhor que entregar um seletor que não filtra nada.**
