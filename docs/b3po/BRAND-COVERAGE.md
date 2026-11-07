# BRAND-COVERAGE — onde a marca aparece e o que já é B-3PO

**Data:** 2026-11-03 · **Branch:** `b3po-brand` · **Commit:** `65f880b9`

Mapa das superfícies visíveis. `Hermes` continua sendo o nome do **runtime** (módulos, comandos
`hermes`, variáveis `HERMES_*`, licença/NOTICE) — isso é atribuição legal, não marca de produto.

## 1. Corrigido e verificado no app real

| Superfície | Antes | Agora | Evidência |
|---|---|---|---|
| Wordmark da tela inicial | `HERMES AGENT` | **`B-3PO`** | `evidence/app-brand-verified.png` |
| Nome do agente/bot padrão | `Hermes` | **`B-3PO`** | `labels.ts` + skin `agent_name`, verificado por CDP |
| Sidebar (nav, busca, estados vazios) | inglês | **português** | `CONVERSAS`, `Nova conversa`, `Nenhuma conversa ainda` |
| Configurações (nav e subpáginas) | inglês | **português** | `Modelo`, `Aparência`, `Mascote`, `Cobrança` |
| Copy de boas-vindas (backend, 30+ locales) | "Welcome to Hermes Agent" | **"Welcome to B-3PO"** | `locales/*.yaml` |
| Catálogos de UI (desktop, web, instalador) | "Hermes Agent" | **"B-3PO"** (523 substituições) | catraca `tests/brand/test_product_name_guard.py` |
| Strip de telemetria | "Share with Nous" | **ausente** (sem endpoint de terceiro) | `consent_state` decidido-e-desligado |
| Persona do agente | "You are Hermes Agent" | **"You are B-3PO, built on Hermes Agent by Nous Research"** | `agent/prompt_builder.py` |
| Avatar do roster | sigilo gerado (roxo) | **mascote oficial quando escolhido**; bot novo nasce com um dos 20 | `rosterFaceFor`, `defaultMascotFor`, 5 testes |
| Ícones, `.ico`, `.icns`, MSIX, favicons | arte Nous | **marca B-3PO** (99 alvos regerados) | `generate_icons.py` |

## 2. Ainda com marca/arte de terceiro (pendente)

| Superfície | O que aparece | Ação |
|---|---|---|
| ~~Configurações → Aparência → Mascote~~ | **resolvido em `45f23954`** | os 20 mascotes oficiais são empacotados como pets locais (`scripts/generate_brand_pets.py`); a galeria lista só a marca ("20 pets"), sem petdex e sem "Hermes" |
| Título da aba de sessão nova | `NEW SESSION` | traduzir no catálogo |
| Texto de apresentação do chat vazio | inglês | traduzir `intro-copy` |
| PDFs/docs do site | "Hermes Agent" em páginas de marketing | rebrand de documentação (fora da UI do app) |

## 3. Regra que passou a valer

- Nome de produto vem de **`brand/brand.json`** (dado), não de string espalhada.
- O rebrand é aplicado por `scripts/rebrand_product_name.py` (idempotente) e **travado** pelo teste
  `tests/brand/test_product_name_guard.py`: reintroduzir "Hermes Agent" na interface falha o gate.
- Identificadores, imports, caminhos, comandos `hermes` e `HERMES_*` **não** são tocados.

## Rodada 38 — chrome do site (docs.docusaurus)

`website/docusaurus.config.ts` ainda anunciava o produto errado:

| Campo | Antes | Depois |
|---|---|---|
| `title` | Hermes Agent | **B-3PO** |
| `tagline` | The self-improving AI agent | **Bots that do real work — built on Hermes Agent** |
| `navbar.title` / `logo.alt` | Hermes Agent | **B-3PO** |
| `logo.src` / `srcDark` | `img/logo.png` / `img/logo-dark.png` | **`img/b3po-logo.png` / `img/b3po-logo-dark.png`** (já existiam em `website/static/img/`) |
| rodapé | "Built by Nous Research · MIT" | **"DZ23 · MIT License · built on Hermes Agent by Nous Research"** |

A atribuição upstream **permanece** (rodapé + tagline): remover seria violação da MIT, e o corpo da
documentação continua chamando o runtime de Hermes — o que ali é correto.

**Prova no build (rodada 39):** `npm ci` + `npm run build` no `website/` concluíram com
`[SUCCESS] Generated static files`. No HTML gerado (`website/build/index.html`):

```
navbar__title  ->  B-3PO
logo           ->  img/b3po-logo.png  +  img/b3po-logo-dark.png
footer         ->  DZ23 ... built on Hermes Agent by Nous Research
<title>Hermes Agent  ->  ausente
```

O aviso do próprio Docusaurus listou apenas *broken anchors* em páginas `zh-Hans` — documentação
traduzida do upstream, não relacionada a esta mudança.

**Nota de processo:** tentei primeiro um teste Python em `tests/brand/` que lia o `.ts` do config —
`tests/AGENTS.md` proíbe teste que lê código-fonte (e teste Python sobre TS não roda no lane JS).
Removi o teste em vez de contrariar a regra; a validação do chrome fica dependente do build do site.
