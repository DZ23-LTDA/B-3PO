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

## Rodada 6 — Fase D parte 1 (adaptador de eventos)

| Hora | Ação | Resultado |
|---|---|---|
| 21:33 | `orchestration.ts` + testes | 13 testes |
| 21:34 | 1ª execução | 1 falha no teste de ids (contador global) → teste corrigido |
| 21:35 | typecheck | **erro TS2322** (array congelado sem tipo) → `as ExecutionEventType[]` |
| 21:36 | typecheck | exit 0 |
| 21:37 | suíte completa do plugin | 932 ok, **2 falhas pré-existentes (`cron-*`)** |
| 21:37 | `python scripts/check` | 14 checks ok |

## Rodada 7 — Fase E parte 1 (identidade do desktop)

| Hora | Ação | Resultado |
|---|---|---|
| 21:44 | product-identity.cjs, package.json, main.ts, set-exe-identity | rebrand aplicado |
| 21:45 | teste de identidade | 3 falhas de nome esperado → tabela atualizada → 10/10 |
| 21:46 | ícones gerados de brand/icons | `icon.ico` + `icon.png` |
| 21:48 | `npm run pack` | **B-3PO.exe**, ProductName B-3PO |
| 21:49 | CompanyName ainda Nous Research | corrigido no package.json + set-exe-identity → **DZ23-LTDA** |
| 21:50 | health gate | **+1 linha em main.ts** (Set-Content) → corrigido, health ok |

**Incidente evitado (registrado):** apaguei `assets/icon.icon/` pensando ser lixo de build; era um
**bundle versionado** do Icon Composer para macOS. Detectado no `git status` antes do commit e
**restaurado com `git checkout`**. Nenhum arquivo de terceiro perdido.

**Pendências desta frente:** `assets/icon.icns` e o bundle `icon.icon` ainda têm a arte antiga (macOS
bloqueado); `cliName` continua `hermes` (nível 2 não autorizado).

## Rodada 8 — Fase E parte 2 (instalador)

| Hora | Ação | Resultado |
|---|---|---|
| 21:52 | `npm run dist:win` | exit 0 — MSIX gerado (185,53 MB) |
| 21:53 | verificação de assinatura | `NotSigned` via Authenticode |
| 21:53 | cache do builder | removido do checkout (regra do repo) |

Instalação limpa fica **bloqueada por certificado** — o artefato é reproduzível, mas não instalável em
Windows comum sem sideload/assinatura. Registrado em `ADR-007`.

## Rodada 9 — segurança, privacidade, testes e placar

| Hora | Ação | Resultado |
|---|---|---|
| 21:58 | `npm audit` | 37 vulns: **0 críticas, 4 altas, 33 moderadas** |
| 22:00 | leitura da config de telemetria | **desligada por padrão**, duplo opt-in |
| 22:00 | descoberto `auth.adopt_external_logins: true` | risco de privacidade → decisão do proprietário |
| 22:09 | suíte de UI completa | **12760/12766**; 6 falhas ambientais/pré-existentes |
| 22:20 | relatórios SECURITY/PRIVACY/ACCESSIBILITY/PERFORMANCE | criados com dados reais |

## Rodada 10 — CI (Fase I)

| Hora | Ação | Resultado |
|---|---|---|
| 22:12 | workflow criado com actions pinadas por SHA | — |
| 22:16 | 1º run | **failure** `EBADENGINE` (node 24 × engine-strict >=26) |
| 22:19 | correção para `node-version: '26'` | push + PR **success** |

CI agora cobre: gate de marca, testes de domínio (schema + orquestração) e typecheck — sem secrets.

## Rodada 11 — Linux (bloqueio documentado) + changelog

| Hora | Ação | Resultado |
|---|---|---|
| 22:30 | `docker run node:26-bookworm` | falhou: daemon Docker parado |
| 22:31 | `wsl -d Ubuntu -e node -v` | sem Node nativo; npm do Windows via interop |
| 22:32 | decisão | registrar **BLOCKED_BY_EXTERNAL_DEPENDENCY** para Linux; não fabricar artefato |
| 22:34 | CHANGELOG + corpo do PR atualizados | — |

## Rodada 12 — fiação na persistência

| Hora | Ação | Resultado |
|---|---|---|
| 22:24 | `mascot_id` e `permission_policy` no `BotMeta` | persistidos pelo caminho existente |
| 22:25 | helpers `botRecordFromMeta` / `botMetaPatchFromRecord` | 3 testes novos |
| 22:26 | lint + typecheck + `scripts/check` | verdes |

## Rodada 13 — mascotes empacotados no app

| Hora | Ação | Resultado |
|---|---|---|
| 22:31 | 20 PNGs copiados para o bundle | 2,9 MB |
| 22:31 | `mascots.ts` gerado (imports estáticos + `mascotById`) | — |
| 22:32 | 1ª tentativa: `@/assets` | **reprovada** pela regra de isolamento de plugins (`no-restricted-imports`) |
| 22:33 | assets movidos para dentro do plugin (`./assets/mascots/`) | lint 0, 6 testes |
| 22:34 | typecheck + `scripts/check` | verdes |

**Achado arquitetural:** plugins só podem importar `@hermes/plugin-sdk` e `react`. Assets da marca para o
bot precisam morar dentro do plugin — o que é a decisão certa (o plugin é dono do que usa).

## Rodada 14 — aba de mascotes (parcial) e bloqueio do ratchet

| Hora | Ação | Resultado |
|---|---|---|
| 22:39 | `MascotGrid` (20 botões, `aria-pressed`, clique devolve o mascote) | 4 testes |
| 22:40 | aba `B-3PO` no `AvatarPicker`, condicional a `onMascot` | lint/tsc verdes |
| 22:42 | fiação no `create-dialog` (`mascot_id` nos dois payloads) | **reprovada pelo ratchet** |
| 22:50 | tentativa de compensar extraindo `buildBotLook` e `persistRemoteLook` | medido **357 → 358** |
| 22:53 | extração do efeito de conexões para hook | medido **358** |
| 22:54 | `create-dialog.tsx` revertido | `scripts/check` 14 ok |

**Fato medido:** `FUNC_LINES` de `CreateAgentDialog` está em **355 (valor de main, acima do alvo 300)** e o
componente **só pode diminuir**. Minhas extrações (payload visual → `buildBotLook`; persistência remota →
`persistRemoteLook`; efeito de conexões → `useConnectionsWhenOpen`) **não reduziram o número medido** — ele
subiu 1. Ou seja, a unidade que o medidor conta não é a que eu removi.

**Consequência:** a fiação do mascote no fluxo de criação fica **aberta** até um refactor dedicado desse
componente (3.5k linhas). Não vou mascarar com waiver nem apagar linhas em branco para passar no número.

**O que ficou pronto e utilizável:** `MascotGrid` (componente + 4 testes) e a aba condicional no
`AvatarPicker`. Ela aparece quando um pai passar `onMascot` — o que ainda não acontece.

## Rodada 15 — fiação do mascote no fluxo de criação (ratchet resolvido)

**Causa raiz do bloqueio:** `FUNC_LINES` conta apenas as **linhas próprias** da função — closures internas
são unidades separadas. Minhas extrações anteriores mexeram em código de closures, então o número não caía
(e a linha de estado + as props eram próprias, então subia).

**Compensação correta (3 linhas próprias removidas):**

| Extração | O que saiu da função |
|---|---|
| `connectionLabel(connections, targetConnection)` | ternário de 3 linhas → 1 chamada |
| `useConnectionTarget(targetConnection)` | `activeConnectionId` + comentário + `remoteTarget` → 1 chamada |

Resultado: **355 = valor de main** (permitido: só pode cair), sem waiver e sem apagar linhas em branco.

**Fiação concluída no fluxo de criação:**

- `const [mascotId, setMascotId] = useState<null | string>(null)`
- `<AvatarPicker mascotId={mascotId} onMascot={mascot => setMascotId(mascot.id)} />` → a aba **B-3PO** agora aparece
- `mascot_id: mascotId ?? undefined` nos **dois** payloads (profile remoto e `saveBotMeta` local)

**Evidência:** `scripts/check` 14 ok · tsc 0 · eslint 0 · 47 testes (criação + schema + mascotes) verdes.

**Ainda falta:** o mesmo em `edit-profile-dialog` (edição de bot existente).

## Rodada 16 — mascote na edição de bot existente (F5 completo no domínio)

| Hora | Ação | Resultado |
|---|---|---|
| 23:04 | `EditProfileLook` ganha `mascotId` + diff em `editedLook` | patch só quando muda |
| 23:05 | `edit-profile-dialog` passa `mascotId`/`onMascot` ao picker | aba B-3PO também na edição |
| 23:06 | fixture do teste poluída pelo meu regex de fallback (25 linhas) | corrigida linha a linha |
| 23:08 | `CC 21 > 20` em `EditProfileDialog` (dois `??`) | helper `openingMascotId` → CC 19 |
| 23:10 | `scripts/check` + tsc + eslint + 37 testes | **verdes** |

**Contrato coberto:** escolher, trocar e limpar mascote geram patch; **desmarcar** grava `mascot_id: null`
(não remove a chave); o mascote não arrasta título/forma/imagem para o patch.

Com isso o F5 tem o caminho completo no domínio: criar com mascote → persistir → editar → persistir.
O que continua sem prova é o **roteiro visual ponta a ponta** (abrir o app, escolher, reiniciar, ver o
mascote de volta).

## Rodada 17 — metadados de loja e índice de evidências

| Hora | Ação | Resultado |
|---|---|---|
| 23:18 | `npm audit fix --dry-run` | **2 pacotes**, sem remover as 4 altas; o resto exige `--force` (major) |
| 23:19 | decisão | **não** aplicar `--force` em fork com deps pinadas; registrar como dependência de decisão |
| 23:20 | `STORE-METADATA.md` | rascunhos Microsoft/Google/Apple, com bloqueios explícitos |
| 23:21 | `EVIDENCE-INDEX.md` | tabela de provas por arquivo de teste |

Nenhuma submissão, conta, certificado ou pagamento foi feito — e nenhum artefato é chamado de assinado.

## Atualização 23:32 — tentativa de E2E visual (bloqueada no Windows)

Escrevi `e2e/bot-mascot-tab.spec.ts` (boot real: Electron + `hermes serve` + provider mock, clicar em
"New bot or group chat" → aba "B-3PO" → grade de mascotes). Execução:

```
npx playwright test e2e/bot-mascot-tab.spec.ts
→ 1 failed: Error: Process failed to launch!
   at launchDesktop (e2e/fixtures.ts:294)
```

Diagnóstico feito:

| Verificação | Resultado |
|---|---|
| `dist/electron-main.mjs` e `dist/index.html` | existem |
| binário do Electron (`v24.22.0`) | executa (`npx electron --version`) |
| `electron . --disable-gpu --no-sandbox` manual | sobe sem erro |
| processos Electron residuais do repo | **nenhum** (lock de instância descartado) |
| `buildAppEnv` herda `process.env` | sim (`stripCredentials(process.env)`) |

**Conclusão:** o harness de e2e do repo é escrito para o devshell nix / CI Linux (o próprio
`boot.spec.ts` diz "Run from the nix devshell"). Neste Windows o launch do Playwright falha antes de
qualquer janela.

**Decisão:** removi o spec. Não entrego teste que não rodei, e não deixo um spec não verificado no
caminho do CI principal (o `test:e2e` do repo o executaria).

**O que continua faltando:** a prova visual ponta a ponta. A alternativa segura é rodar
`npm run test:e2e` num runner Linux (o workflow do B-3PO hoje só roda testes de domínio e typecheck).
