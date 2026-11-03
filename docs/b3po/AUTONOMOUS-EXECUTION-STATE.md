# AUTONOMOUS-EXECUTION-STATE — B-3PO

Estado corrente do trabalho autônomo. Atualizado a cada rodada; é o que permite retomar sem reiniciar.

## Onde estamos

| Campo | Valor |
|---|---|
| Branch de produto | `b3po-brand` (a `main` segue espelho limpo do upstream) |
| Commits DZ23 | 101 |
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
| Android: lista de bots e conversa na tela | ✅ | `MOBILE-REPORT.md` rodadas 55–56 + `mobile-conversa-real.png` |
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

## Como retomar

1. `git -C "C-3PO BOT" status` e `git log --oneline -5`;
2. `python scripts/check` (gate de 14 checks);
3. ler este arquivo + `AUTONOMOUS-EXECUTION-LOG.md` (última entrada);
4. pegar o primeiro item dos "critérios abertos".
