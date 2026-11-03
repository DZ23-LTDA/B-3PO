# AUTONOMOUS-EXECUTION-LOG

Registro cronológico da execução autônoma autorizada pelo proprietário (Adendo).

## Rodada 1 — Fase A + B

| Hora | Ação | Resultado |
|---|---|---|
| 20:43 | Auditoria de baseline (12 checagens) | A1/A2/A8/A10 passam; A5 falha (sem provider) |
| 21:05 | Descoberto Ollama local (3 modelos) e provado `/v1/chat/completions` | provider disponível sem chave |
| 21:06 | `setup-hermes.ps1 -RuntimeOnly` | exit 0 — Python 3.14.9, node, venv, chromium |
| 21:12 | `hermes -z` com `qwen2.5-coder:7b` | **falhou**: janela 32K < mínimo 64K exigido pelo Hermes |
| 21:13 | Troca para `qwen3.5:4b` (262K) | **`B-3PO online ✅`**, exit 0, 13,4 s |

## Rodada 2 — Fase C (marca)

| Hora | Ação | Resultado |
|---|---|---|
| 21:16 | `brand/` + 20 mascotes + NOTICE + rename-map | criado |
| 21:18 | `brand_check` 14/14 | ok |
| 21:19 | `python scripts/check` | **reprovou**: 7 footguns de encoding + 3 blobs > 500 KiB |
| 21:21 | Correções (utf-8-sig, webp, ícone 512, master fora do repo) | `scripts/check` → **14 checks, ok** |
| 21:22 | Commits `d6345f1d` + `21595add` | `main` intacta |

## Rodada 3 — Fase D/E/F (parcial, esta rodada)

| Hora | Ação | Resultado |
|---|---|---|
| 21:23 | `npm ci` (autorizado pelo Adendo) | 1222 pacotes, exit 0 |
| 21:23 | `npm run typecheck` | exit 0 |
| 21:23 | `npm run build` | exit 0, 0,5 min |
| 21:24 | `npm run pack` | exit 0 — `Hermes.exe` 235,4 MB, **não assinado** |
| 21:24 | Relatórios A–C + matriz de plataformas + ADRs | `docs/b3po/` |

## Decisões tomadas autonomamente (permitidas pelo Adendo)

1. Usar Ollama local como provider de teste — sem custo, sem secret, escopo de workspace isolado.
2. Trocar o modelo de teste quando o runtime recusou janela < 64K (correção reversível).
3. Remover o PNG master do repositório e apontá-lo por SHA-256 (limite de blob do repo).
4. Não criar projeto mobile: a decisão de arquitetura foi registrada e a implementação depende de
   contrato congelado + toolchain; criar agora violaria a ordem aprovada.

## Bloqueios registrados

| # | Bloqueio | Dependência exata |
|---|---|---|
| B1 | macOS/iOS | hardware Apple + Xcode + certificado de assinatura/notarização |
| B2 | Android | projeto cliente inexistente + keystore (SDK e JDK presentes) |
| B3 | Linux | container com electron-builder (Docker/WSL presentes; não executado) |
| B4 | Windows assinado | certificado Code Signing (AZURE_SIGN_* ou PFX) |
| B5 | F5 na UI | execução do fluxo com display (app aberto) — não provado |

## Incidente — 21:26 (registrado, não omitido)

**O que aconteceu:** ao abrir o Pull Request, o `gh` não tinha repositório padrão definido
(`gh repo set-default --view` → "No default remote repository has been set"), e o comando com
`--head DZ23-LTDA:b3po-brand` resolveu o **repositório base como o upstream** e criou o PR
`NousResearch/hermes-agent#148220` — repositório público de terceiros.

**Ação imediata:** PR **fechado** em segundos, com comentário explicando que foi aberto por engano e que
nada daquele conteúdo se destina ao upstream. Nenhum merge ocorreu; nenhum commit foi enviado ao upstream;
a branch `b3po-brand` existe apenas no fork DZ23-LTDA/B-3PO.

**Correção aplicada:** `gh repo set-default DZ23-LTDA/B-3PO` e criação do PR com `--repo` explícito.
PR correto: `DZ23-LTDA/B-3PO#1` (draft, revisão apenas, sem merge em `main`).

**Lição para o próximo ciclo:** sempre passar `--repo <owner/name>`; nunca confiar no repo implícito; não
usar `--head owner:branch` (isso convida o gh a escolher o repositório "pai").

## Rodada 4 — Android (emulador disponibilizado pelo proprietário)

| Hora | Ação | Resultado |
|---|---|---|
| 21:27 | Inspeção do SDK | build-tools 36.0.0, platforms 35/37, AVD `dsh_pixel`, emulador ok |
| 21:28 | Scaffold `mobile/android-brand-shell` (Java, sem Gradle) | criado |
| 21:28 | 1ª build | falhou (d8 sem diretório de saída) → corrigido |
| 21:29 | 2ª build | falhou (7z sem `-tzip`, depois `classes.dex` em `dex\`) → corrigido |
| 21:30 | build + sign | **exit 0**, APK 301 KB, `apksigner verify` ok |
| 21:30 | install + launch | **Success**; app renderizou a marca; screenshot salvo |

Decisão autônoma: construir **casca de marca** nativa em vez de um cliente completo, porque o contrato de
sessão (Fase E) não está congelado — criar cliente agora duplicaria contrato e violaria a regra de não
fabricar funcionalidade. O emulador resolveu o "onde rodar"; o que falta é o contrato.

## Rodada 5 — Fase C parte 1 (schema v1)

| Hora | Ação | Resultado |
|---|---|---|
| 21:30 | `bot-schema.ts` + testes | 12 testes verdes |
| 21:31 | typecheck + eslint | exit 0 |
| 21:31 | `python scripts/check` | **falhou**: `profile-archives` (cache do electron-builder em `.cache/`) |
| 21:32 | cache removido (era artefato do `pack`, não do código) | gate voltou a **14 checks, ok** |

**Incidente menor:** o `npm run pack` deixa `.cache/desktop-inputs` dentro do checkout, e o gate do
repositório proíbe arquivos `.tar.gz` ali. Regra para as próximas rodadas: limpar `.cache` após
empacotar ou apontar o cache do electron-builder para fora do checkout.
