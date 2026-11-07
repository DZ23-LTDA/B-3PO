---
tipo: documento-v4
agente: dsh
projeto: c3po-bot
data: 2026-11-07
---

# EVIDENCE_INDEX — onde cada afirmação foi provada

> Regra: **toda afirmação deste conjunto de documentos aponta para uma evidência.** Se não há
> arquivo, comando ou captura, a afirmação não existe.

## Capturas (docs/b3po/evidence/)

| Arquivo | Prova | Rodada |
|---|---|---|
| `v4-home-r1.png` | home V4: 6 modos, 11 agentes, 1 projeto, KPIs 11/0/0 | r1 |
| `v4-home-r2.png` | Sofia com plano real + 5 ações rápidas | r2 |
| `v4-home-erro-r3.png` | estado de erro (via teste de componente) | r3 |
| `v4-home-400.png` | largura mínima suportada (`MIN_WIDTH = 400`) | r3 |
| `v4-home-r11.png` | roster expandido 4 → 11 | r11 |
| `v4-web-r12.png` | **o web é o dashboard do Hermes** — logo "HERMES AGENT", Nous Research | r12 |
| **`mobile-r18.png`** | **o app Android renderiza e o wordmark saiu de baixo do relógio** | **r18** |
| `v4-home-r30.png` | a home completa: 6 modos, 5 ações, Sofia, 4+7 agentes, KPIs com a legenda do `—` | r30 |
| `v4-sofia-r31.png` | plano real com dependência (`depende de t1`) e execuções (`exec-e2e-001`) | r31 |
| `v4-projetos-r31.png` | formulário real + invariante "sem critério não conclui" + contador `0 em andamento` | r31 |
| `t05-modos-r103.png` | identidade dos seis modos (ciclo anterior) | r103 |

## Comandos reproduzíveis

| Prova | Comando |
|---|---|
| Gate | `python scripts/check` → **14 checks, ok** |
| Tipos | `python scripts/check-b3po-types` → **0 erros** |
| Suíte desktop | `cd apps/desktop && npx vitest run` → **27 failed / 19.017 passed** |
| Suíte web | `cd web && npm test` → **478/478** |
| Suíte mobile | `cd mobile/b3po-app && npx vitest run` → **179 passed** |
| `axe` desktop (27 rotas) | CDP + `axe.run(document, {})` **sem `runOnly`** → **0 nós** |
| `axe` web (15 rotas) | idem → **0 nós** |
| Home com falha forçada | `home-b3po.test.tsx` (8 testes) — provam `erro`/`vazio`/`ok`/`indisponível` |
| Atomicidade dos stores | `electron/store-escrita-atomica.test.ts` (5 testes) — nenhum `.tmp` sobra |
| Guarda do terminal | `electron/terminal-guarda-maquina.test.ts` (5) — recusa sem ator, **sem spawnar** |
| Guarda do fs | `electron/fs-guarda-maquina.test.ts` (6) — recusa **antes do disco** |
| Seis modos distintos | r15: 6 combinações de menu medidas alternando o seletor real |
| **6/6 modos trocam `data-ambiente`** | r32: clicando cada cartão e lendo o atributo + os grupos da barra |
| A-02 (Engenharia sem módulos de engenharia) | r32: mostra Projetos, Trabalhos e Inteligência |
| **Console sem erro** | r28: **0 erros em 27 rotas** (varredura de `console`/`pageerror`) — pegou o T-12 quebrado |
| Ponte de tarifas funciona | r28: `hermesDesktop.tarifas.list()` → `{"politicas":[]}` |

## Provas que **não** existem (e por isso não são afirmações)

| O que eu gostaria de citar | Por que não existe |
|---|---|
| Suíte do gateway verde | rodou até 44%, interrompida |
| Screenshot do mobile com os 6 modos | **os 6 modos não existem no mobile** |
| Identidade B-3PO no web | o web é o upstream |
| Release assinado | sem certificado |
| Benchmark comparativo | nunca foi feito — **nenhuma afirmação de "melhor que X"** |

## Erros de medição que eu cometi, e o que os corrigiu

Registrados porque **um número errado num documento vale menos que um número ausente**.

| Rodada | O que eu disse | A verdade | O que corrigiu |
|---|---|---|---|
| r5 | 32 stores sem escrita atômica | **35 atômicos** | contar `writeFile` async, não só `writeFileSync` |
| r6 | 16 arquivos sem guarda | 2 não tinham canal | medir canal, não arquivo |
| r7 | `git-ipc` desprotegido | usava `podeOperarMaquina` | reconhecer o padrão |
| r9 | backend `NOT_TESTED` | coleta e roda | instalar `aiohttp` no env isolado |
| r10 | `test_feishu` quebrado | vazamento entre módulos | medir sozinho, importar direto, medir na pasta |
| r19 | "32 = baseline" | 3 eram **minhas** | rodar a suíte completa, não só o suspeito |
| r19/r21 | `/settings` não renderiza | **renderiza**; falta `h1` | ler o fim do texto, não o começo |
| r29 | 3 canais de ponte sem handler | **registro dinâmico** em laço | o runtime (varredura de console), não o texto |
