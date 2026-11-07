---
tipo: documento-v4
agente: dsh
projeto: c3po-bot
data: 2026-11-07
---

# BENCHMARKS — **não existe**. Este documento diz por que, e o que seria preciso

> O GOAL V4 (FASE 9) pede benchmark local reproduzível e comparação com produtos externos.
> **Nada disso foi feito.** Este arquivo existe para que a ausência seja um fato registrado, e não um
> vazio que alguém preencha com opinião.

## 1. O que o goal pede

| Métrica pedida | Medida? |
|---|---|
| task success rate | **não** |
| completude | **não** |
| testes funcionais por tarefa | **não** |
| incidentes | **não** |
| latência p50/p95 | **não** |
| custo por tarefa | **não** |
| uso de tokens | **não** |
| intervenções humanas | **não** |
| regressões | **não** |
| acessibilidade | **parcial** — `axe` 0 em 27 rotas, mas `axe` ≠ conformidade |
| satisfação UX | **não** |

**Nenhuma linha desta tabela permite afirmar "o B-3PO é melhor que X".** E este documento **não
afirma isso**.

## 2. Por que não foi feito

| Razão | Detalhe |
|---|---|
| **Custo externo** | rodar tarefas reais contra produtos concorrentes exige contas pagas — **decisão do dono**, não minha |
| **Credencial** | sem `EXT-6`, o conector externo não roda; metade das tarefas comparáveis depende dele |
| **Ambiente** | o gateway Python não completou a suíte (>30 min), então a base de comparação interna é parcial |
| **Escopo** | o goal desta sessão é **implementar** os seis modos e a home; benchmark é FASE 9, explicitamente posterior |

**Não medi pouco — não medi nada.** A diferença importa.

## 3. O que **está** medido, e serve de linha de base técnica

Estes números existem, são reproduzíveis, e **não são benchmark de produto**:

| Item | Valor | Comando |
|---|---|---|
| Suíte desktop | **19.017 passed / 27 failed** | `npx vitest run` |
| Suíte web | **478/478** | `npm test` |
| Suíte mobile | **179 passed** | `npx vitest run` |
| Gate | **14 checks** | `python scripts/check` |
| `axe` desktop | **0 nós / 27 rotas** | CDP + `axe.run(document, {})` |
| `axe` web | **0 nós / 15 rotas** | idem |
| Build web | exit 0 · 60 arquivos | `npm run build` |
| APK release | 44,2 MB · `BUILD SUCCESSFUL` | `gradlew assembleRelease` |
| Store mais testado | `purchases` 86 · `sales` 96 · `scheduling` 98 | contagem de `it(` |

**São números de saúde de código, não de qualidade de tarefa.** Um produto com 19 mil testes pode
falhar toda tarefa real; o inverso também é verdade.

## 4. O que seria preciso para um benchmark honesto

1. **Dataset de tarefas** — 30–50 tarefas reais por domínio (programação, automação, pesquisa, CRM,
   compras/estoque, planejamento multiagente, recuperação de falha, isolamento de tenant).
2. **Critério de sucesso objetivo** — teste que passa, artefato que existe, fonte que confere. **Não**
   autoavaliação textual.
3. **Custo e latência** — tokens, chamadas de modelo, segundos p50/p95.
4. **Intervenções humanas** — quantas vezes alguém precisou corrigir.
5. **Ambiente fixo** — mesma versão, mesmo modelo, mesmo dataset; sem isso a comparação não vale.
6. **Autorização** — para produtos externos, contas e cotas. **É onde entra o dono.**

## 5. A regra que este documento protege

> **"Melhor" sem número é marketing.** O GOAL V4 diz, na linha 117: *"Não inventar ranking, não
> afirmar 'melhor de mercado' sem dados reproduzíveis."*

Este arquivo é a garantia de que ninguém, em nenhum handoff futuro, encontre silêncio e preencha com
uma opinião. **A ausência está escrita.**

---

## Adendo r28 — a varredura que devia ser rotina

`console`/`pageerror` em **27 rotas: 0 erros**. Antes da correção: **2**, os dois em `/medidores`.

Custa ~90 segundos e **encontrou sozinha** o que quatro camadas de teste não encontraram: um IPC
importado e nunca registrado. Passa a ser parte do censo.
