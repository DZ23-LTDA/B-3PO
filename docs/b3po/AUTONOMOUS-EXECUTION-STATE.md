# AUTONOMOUS-EXECUTION-STATE — B-3PO

Estado corrente do trabalho autônomo. Atualizado a cada rodada; é o que permite retomar sem reiniciar.

## Onde estamos

| Campo | Valor |
|---|---|
| Branch de produto | `b3po-brand` (a `main` segue espelho limpo do upstream) |
| Commits DZ23 | 113 |
| Gate do repositório | `python scripts/check` → 14 checks, ok |
| Testes | desktop: bots 960 · i18n 104 · store/sdk 2307 · CRM 66 · mobile 101 (+5 live pulados) |
| Status do produto | **NOT_READY** (há critérios abertos, listados abaixo) |

## Frentes e estado

| Frente | Estado | Evidência |
|---|---|---|
| Marca B-3PO (desktop, site, instaladores) | ✅ | `BRAND-COVERAGE.md`, `logo`, `B-3PO.exe` VersionInfo |
| i18n pt-BR (superfície do produto) | ✅ | `PT-BR-VALIDATION.md`, 104 testes |
| Bots: criar, mascote, conversar, cancelar | ✅ | `F5-EVIDENCE-REPORT.md`, screenshots |
| WhatsApp CRM: consentimento, webhook, contatos, funil, inbox, métricas, tarefas/Kanban, automações, contatos em lote, funil completo | ✅ núcleo | `WHATSAPP-CRM-REPORT.md`, 140 testes |
| Envio real WhatsApp | 🔒 BLOCKED (conta Meta) | `WHATSAPP-CRM-SETUP.md` |
| Android: projeto nativo, APK, AAB, pareamento, conexão REST real | ✅ | `MOBILE-REPORT.md` (rodadas 42–49) |
| Android: lista de bots, conversa e ENVIO | ✅ | `MOBILE-REPORT.md` rodadas 55–56 + `mobile-conversa-real.png` |
| Desktop Windows: instalador e MSIX | 🟡 artefatos prontos, não assinados | `ARTIFACT-MANIFEST.md` |
| macOS / iOS | 🔒 BLOCKED (macOS/Xcode/certificado) | `RELEASE-READINESS.md` |
| Tool calling ponta a ponta (F5 passo 12) | ⬜ aberto (modelo local sem tool calling ≥64k) | `F5-EVIDENCE-REPORT.md` |

## Critérios abertos (ordenados por valor)

2. cofre seguro no mobile (`react-native-keychain` não compila no RN 0.81 deste ambiente);
3. keystore de release para APK/AAB publicáveis;
4. tool calling com modelo ≥64k;
5. 3 vulnerabilidades dev bloqueadas por `min-release-age` até 2026-11-17.

## Regra de processo (aprendida na prática)

Rodar `python scripts/check` **antes** do commit, nunca depois: três commits entraram com o gate
vermelho nesta execução por inverter a ordem.

## Bloqueio de desenho (não é bug) — especificado

Envio de mensagem pelo celular precisa de ticket de WebSocket, e o endpoint de ticket exige sessão de
login do dashboard (401 com o token de pareamento). O contrato do `prompt.submit` já está levantado em
`MOBILE-REPORT.md` rodada 59. Desenho completo em `DEVICE-AUTHORIZATION.md` (chave por
dispositivo, rota de ticket, allowlist de métodos, revogação, 9 critérios de aceite).

## Como retomar

1. `git -C "C-3PO BOT" status` e `git log --oneline -5`;
2. `python scripts/check` (gate de 14 checks);
3. ler este arquivo + `AUTONOMOUS-EXECUTION-LOG.md` (última entrada);
4. pegar o primeiro item dos "critérios abertos".

## PR #1 — atualizado em 2026-11-03

| Campo | Valor |
|---|---|
| URL | https://github.com/DZ23-LTDA/B-3PO/pull/1 |
| estado | OPEN (não mesclar — `main` é espelho do upstream, F2-A) |
| head → base | `b3po-brand` → `main` |
| commits no PR | 100 |
| arquivos | 594 |
| diff | +42.242 / −1.111 |
| título | "B-3PO: marca, sistema de Bots, WhatsApp CRM, mobile com envio e autorização de dispositivo [REVISAO - NAO MESCLAR: main e espelho]" |
| corpo | 4,9 KB / 106 linhas |

O corpo agora traz, em seções: o que está entregue e comprovado (desktop, Bots, CRM com a tabela de
testes por módulo, mobile com envio comprovado, autorização de dispositivo, documentação), a lista de
evidências em `docs/b3po/evidence/`, a tabela de **limitações e bloqueios** (MSIX não assinado, iOS
bloqueado, keystore, cofre seguro, ticket de dispositivo no WS, tool calling, WhatsApp real,
vulnerabilidades dev) e os comandos de revisão (`scripts/check`, vitest do CRM e do mobile).

Nada de "pronto": o status declarado no PR é **NOT_READY**, com a lista do que falta.
