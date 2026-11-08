---
tipo: benchmark
agente: dsh
projeto: c3po-bot
data: 2026-11-07
fase: G5
---

# BENCHMARKS — V5. **Não existe harness.** Este documento diz por que e o que seria preciso

> G5 pede um harness de avaliação reproduzível e versionado, com tarefas representativas e métricas
> (sucesso, tempo, tokens/custo, latência, intervenções, retries, incidentes, qualidade).
>
> **Nada disso foi implementado.** Este arquivo existe para que a ausência seja um fato registrado — e
> não um vazio que alguém preencha com opinião.

## 1. O que o goal pede, e o estado

| Métrica pedida | Medida? |
|---|---|
| task success rate | **NÃO** |
| completude | **NÃO** |
| testes funcionais por tarefa | **NÃO** |
| incidentes | **NÃO** |
| latência p50/p95 | **NÃO** |
| custo por tarefa | **NÃO** |
| uso de tokens | **NÃO** |
| intervenções humanas | **NÃO** |
| regressões | **NÃO** |
| acessibilidade | **PARCIAL** — `axe` 0 em 27 rotas desktop e 15 web |
| satisfação UX | **NÃO** |

**Nenhuma linha permite afirmar "o B-3PO é melhor que X".** E este documento **não afirma isso**.

## 2. Por que não existe

| Razão | Detalhe |
|---|---|
| **Custo externo** | rodar tarefas contra concorrentes exige contas pagas — **decisão do dono** |
| **Credencial** | sem `EXT-3`, o conector externo não roda; metade das tarefas comparáveis depende dele |
| **Agente** | a execução de plano da Sofia **não existe** (`DEC-1`); sem ela, "tarefa executada por agente" não é medível |
| **Escopo** | G5 é posterior a G1/G2 no próprio goal |

**Não medi pouco — não medi nada.** A diferença importa.

## 3. O que **está** medido (saúde de código, não de tarefa)

| Item | Valor | Comando |
|---|---|---|
| Suíte desktop | **27 failed · 19.000 passed** | `npx vitest run` |
| Suíte web | **71 arquivos · 478 testes** | `npm test` |
| Suíte mobile | **20 arquivos · 179 testes · 8 skip** | `npx vitest run` |
| Gate | **15 checks** | `python scripts/check` |
| `axe` desktop | **0 / 27 rotas** | CDP + `axe.run(document, {})` |
| `axe` web | **0 / 15 rotas** | idem |
| Console desktop | **0 erros / 27 rotas** | varredura de `console`/`pageerror` |
| Build web | **✓ 5,28 s** | `npm run build` |
| APK | **44,2 MB** | `gradlew assembleRelease` |
| Gateway (amostra) | **263 passed** em 5 arquivos | `pytest` por arquivo |

**São números de saúde de código.** Um produto com 19 mil testes pode falhar toda tarefa real; o
inverso também é verdade.

## 3b. r47 — a razao exata pela qual nada pode ser medido

Nao e' "o harness nao existe". E' que **nenhum turno completa**.

Medido no app em execucao, via `/api/config` e `/api/status`:

```
model ....... "anthropic/claude-opus-4.6"
providers ... {}            <-- ZERO credenciais
platforms ... {}            <-- nenhuma plataforma conectada
```

E o teste direto: enviei `"teste de vinculo r45"` pelo composer.

| Passo | Resultado |
|---|---|
| sessao criada | ✅ `local-e2e76a5ad…` |
| mensagens persistidas | **0** |

A sessao nasce no envio; o turno **nao produz nada** porque nao ha chave de provedor. Um benchmark aqui
mediria **zero em toda tarefa** — e zero nao e' uma medicao, e' a ausencia de uma.

**Isto e' `EXT-3`, com o nome certo**: nao falta "credencial de conector", falta **credencial de modelo**
— sem ela, nenhuma tarefa de agente pode ser avaliada, nem por mim nem por qualquer harness.

## 4. O que seria preciso para um harness honesto

1. **Conjunto de tarefas** versionado no repo, por categoria: codificação, correção de bug, testes,
   pesquisa com fontes, extração de documento, automação, operação empresarial simulada (com dados de
   teste), segurança, recuperação de falhas.
2. **Critério objetivo de sucesso** — teste que passa, artefato que existe, fonte que confere. **Não**
   autoavaliação textual do agente.
3. **Métricas por execução**: sucesso, tempo, tokens, custo, retries, intervenções, incidentes.
4. **Ambiente fixo**: mesma versão, mesmo modelo, mesmo dataset. Sem isso a comparação não vale.
5. **Resultado bruto versionado** (`results/*.json`) + um resumo gerado.
6. **`NOT_TESTED` explícito** quando a tarefa depende de credencial ausente.

**Nenhum item foi implementado.** O item 3 depende do item 2 do G2 (execução real), que está em
`DEC-1`.

## 5. A regra que este documento protege

> O goal diz, no G5: *"sem alegar superioridade a concorrentes sem dados"*.
>
> **"Melhor" sem número é marketing.** A ausência está escrita para que nenhum handoff futuro encontre
> silêncio e preencha com opinião.
