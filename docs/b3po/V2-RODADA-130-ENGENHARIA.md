# GOAL V2 — RODADA 130: O AMBIENTE ENGENHARIA NÃO TINHA CONTEÚDO

**Data**: 05/11/2026 · **§25/P7** · no que ele permite

---

## A MEDIÇÃO QUE ABRIU A RODADA

| Ambiente | Grupos | **Módulos do produto neles** |
|---|---|---|
| Empresa | 7 | **23** |
| **Engenharia** | 4 | **0** |

> **A r121 definiu os dois ambientes. A r122 deu `grupo` aos 23 módulos — e todos os 23 são da Empresa.**
>
> **O ambiente Engenharia existia como regra e como preferência, e não tinha conteúdo.**

---

## O QUE FOI FEITO

`lib/engenharia.ts` — **o mapa do ambiente Engenharia**, com **11 módulos** em **4 grupos**.

| Grupo | Módulos |
|---|---|
| **Visão geral** | Painel · Busca |
| **Construção** | Projetos · Trabalhos · **Agentes** · Automações |
| **Qualidade** | **Artefatos** · **Capacidades** |
| **Configuração** | **Agendamentos** · **Webhooks** · Documentos |

---

## O QUE ELE É, E O QUE NÃO É

### É **o agrupamento** — que é o que o produto acrescenta

> `/artifacts`, `/cron`, `/agents`, `/capabilities` e `/webhooks` **são do Hermes**. **O produto não escreveu nenhuma delas — e não deve**: o §13:452 pede *"arquitetura, código, testes, CI/CD, artefatos"*, e **o runtime já tem os quatro**.
>
> **Hoje elas são ilhas no menu do núcleo; aqui viram uma árvore de trabalho.**

### Não é o filtro da barra

> **O host que desenha a sidebar é do upstream** (medido na r123/r124).
>
> **Este arquivo entrega o MAPA** — que é o que a tela `/ambiente` mostra e o que a barra vai usar **quando o host permitir**.

---

## A PROPORÇÃO — e ela é a resposta honesta

```ts
export function proporcaoDeOrigem(): Record<'produto' | 'upstream', number>
```

| Origem | Módulos |
|---|---|
| **upstream (Hermes)** | **6** |
| **produto (B-3PO)** | **5** |

> **Não é curiosidade: diz o quanto do ambiente Engenharia é produto e o quanto é runtime.**
>
> **Hoje é 5 a 6** — e essa proporção é **a resposta honesta para "o Modo Engenharia existe?"**: **existe como mapa, e a metade dele é do runtime.**

---

## A PROVA — 10 testes

| Teste | O que trava |
|---|---|
| **todo módulo num grupo da regra** | módulo em grupo desconhecido **é invisível nos dois ambientes** |
| **todo grupo tem módulo** | **o que a r122 exigia da Empresa e a Engenharia não tinha** |
| **nenhuma rota/rótulo repete** | dois itens para a mesma tela |
| **cada módulo DIZ o que é** | a frase que a tela usa |
| **a proporção soma o total** | contagem que não fecha |
| **a maior parte é do runtime** | se falhar, **o produto passou a sustentar o Modo Engenharia sozinho** |

---

## MEDIÇÕES

| Medida | Valor |
|---|---|
| Módulos de Engenharia | **11** (era **0**) |
| Grupos cobertos | **4 de 4** |
| Produto × upstream | **5 × 6** |
| Testes | **10** |
| Gate · Typecheck | **14 ok · 0 erros** |

---

## O §25/P7 — ONDE ESTÁ, AGORA COM NÚMERO

| Item | Antes | **Agora** |
|---|---|---|
| **Modo Engenharia: mapa** | ❌ | ✅ **11 módulos, 4 grupos** |
| **Modo Engenharia: telas** | ⚠️ **existem, espalhadas** | ✅ **agrupadas** |
| **Filtro na barra** | ❌ | ❌ **exige o host (upstream)** |
| **Adaptadores omnichannel (P7)** | ❌ | ❌ **BLOCKED pelo P5** |

> **O P7 continua `NOT_STARTED` como fase** — porque depende do **P5 (credenciais)** para a parte de comércio.
>
> **Mas a metade que não depende de credencial agora tem conteúdo medido** — e declarado como **metade do runtime**.

---

## PRÓXIMA RODADA

**A ligação entre a tela `/ambiente` e este mapa** — hoje a tela mostra os módulos da Empresa; ela precisa mostrar **também** os 11 da Engenharia, com a origem ao lado.

> **130 rodadas.** O §13 pediu **dois ambientes** em 2024; a r121 escreveu a regra, a r122 os grupos do produto, a r123 a preferência, a r124 a tela — e **nenhuma delas tinha olhado que o segundo ambiente estava vazio**.
