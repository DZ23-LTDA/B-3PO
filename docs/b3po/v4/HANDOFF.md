---
tipo: documento-v4
agente: dsh
projeto: c3po-bot
data: 2026-11-07
---

# HANDOFF — onde o V4 parou, e como continuar

## Estado

- **Branch**: `b3po-brand` · **HEAD**: o commit desta rodada · `main` = `f4cf411f28` **intacto**
- **Gate**: 14/14 · **Tipos**: 0 erros · **Suíte desktop**: 27 falhas = baseline, **0 minhas**
- **`axe`**: 0 em 27 rotas do desktop · 0 em 15 do web · **0 rotas sem `h1`**
- **Docs V4**: 10 arquivos em `docs/b3po/v4/`

## O que o goal pedia, e onde está

| Pedido do goal | Estado | Onde foi provado |
|---|---|---|
| Seis modos com identidade visual | **READY** | 6/6 cores — `v4-home-r1.png` |
| Seis modos com navegação **distinta** | **READY** | 6/6 menus — r15, `FINDINGS A-01/A-02` |
| Sofia com dados reais | **READY** | 1 plano do backend — r2 |
| Agentes com dados reais | **READY** | 11 do roster — r1 |
| Projetos com dados reais | **READY** | 1 real, navegável — r1/r11 |
| Navegação com ações reais | **READY** | sem rota morta desde a r11 |
| Não inventar métricas | **READY** | `null` → `—`; 16 testes — `lib/home-dados.ts` |
| Não duplicar módulos | **READY** | `tambemEm`, um módulo em vários ambientes |
| Inspeção desktop | **READY** | 27 rotas |
| Inspeção web | **feita** | é o Hermes upstream — `v4-web-r12.png` |
| Inspeção mobile | **feita** | `mobile-r18.png`, fix do safe-area provado |

## Como continuar — em ordem de valor

### 1. `h2` nos painéis de configurações (**B-12b**)

A página tem `h1` desde a r22. As **seções internas** (modelo, aparência, plugins, conexões, voz,
atalhos) continuam usando `div`/`span` como título.

- **Arquivos**: `app/settings/*-settings.tsx` — não há componente comum de título de seção; a
  mudança é por painel (~12 arquivos).
- **Cuidado**: os títulos são `div`/`span` estilizados; trocar por `h2` exige preservar classes
  (`m-0` incluso) ou o layout desloca.
- **Aceite**: `heading-order` do axe limpo em `/settings` e navegação por heading descendo às seções.

### 2. A guarda de `kind: 'bot'` (**B-02g** — decisão do dono)

`podeOperarMaquina` não olha `kind`. Um bot com `EXECUTE_ALLOWED` **consegue spawnar shell local**
pela interface. O comportamento está travado em `terminal-guarda-maquina.test.ts` — mudar é decisão.

### 3. A matriz de plataformas (decisão do dono)

`PLATFORM_MATRIX.md` §6 tem as opções A/B/C/D. **C e D são compatíveis**: assumir que o desktop é o
produto e usar web/mobile como clientes operacionais.

### 4. A suíte do gateway (**B-03b**)

`aiohttp` instalado no `b3po-testenv` levou a coleta de **91 erros → 1** (13.337 testes). Falta
**rodar até o fim** — >30 min. Use `--ignore` para os 2 arquivos que não coletam.

## Armadilhas que custaram rodadas

1. **`git add -A` varre trabalho de terceiro** — commit lista os arquivos (r107 do ciclo anterior).
2. **`main.ts` está no teto do ratchet** — qualquer linha nova precisa compensar; use a mesma linha.
3. **`contextBridge` é congelado** — não dá para forçar falha de ponte em runtime; teste a camada de
   API, não a ponte.
4. **O backend roda de uma CÓPIA** em `%TEMP%\b3po-menu-view6\` — editar `hermes_cli/` no repo não
   chega no processo vivo.
5. **`ELECTRON_RUN_AS_NODE`** herdado quebra o `electron.exe` — remover antes de subir.
6. **Medir com ≥3 s** — abaixo disso o `axe` acusa `page-has-heading-one` falso.
7. **`axe` sem `runOnly`** — o filtro de tags esconde a família `best-practice` (landmarks).
8. **Antes de acusar o produto, verifique o instrumento.** Aconteceu **7 vezes** nesta sessão.

## Onde está o quê

```
docs/b3po/v4/
  BASELINE.md            números com o comando que os produziu
  CAPABILITY_INVENTORY   50 domínios IPC · 36 stores · 52 telas
  ARCHITECTURE_CURRENT   camadas, duas superfícies IPC, persistência
  RISKS.md               R1–R9 (R1 e R3 foram retratados)
  GAP_ANALYSIS.md        as 11 fases + backlog B-01…B-12b
  FINDINGS.md            A-01…A-06, com o erro de diagnóstico incluído
  PLATFORM_MATRIX.md     desktop × web × mobile
  RELEASE_READINESS.md   matriz por plataforma
  OPEN_BLOCKERS.md       EXT-3…EXT-9 com o comando de desbloqueio
  EVIDENCE_INDEX.md      onde cada afirmação foi provada
```
