# B-3PO Bot Platform — README de produto

> **Status:** MVP interno em desenvolvimento. **Não** é lançamento público. Ver
> [`docs/b3po/RELEASE-READINESS.md`](docs/b3po/RELEASE-READINESS.md) para o estado por plataforma.

B-3PO é uma plataforma de bots construída sobre o **Hermes Agent** (runtime de agente em Python, MIT,
Nous Research), com identidade visual própria da DZ23 e um aplicativo desktop Electron.

## O que já funciona (com evidência)

| Recurso | Estado | Onde está a prova |
|---|---|---|
| Agente executa um turno real | **validado** | `docs/b3po/TEST-RESULTS.md` (turno local, 13,4 s) |
| Desktop compila e empacota | **validado** | `B-3PO.exe` (não assinado) em `ARTIFACT-MANIFEST.md` |
| Identidade de marca (nome, ícone, paleta) | **validado** | `brand/` + `scripts/brand_check.py` (14 checagens) |
| Contrato do Bot (schema v1) | **implementado e testado**, não fiado na UI | `bot-schema.ts` + 12 testes |
| Adaptador de eventos do runtime | **implementado e testado**, não fiado na UI | `orchestration.ts` + 13 testes |
| Casca Android com a marca | **validado no emulador** | `docs/b3po/evidence/android-brand-shell.png` |

## O que **não** está pronto

- Criar/editar bot pela UI usando o schema v1 (ainda usa o caminho legado).
- Instalador assinado (não há certificado) e updater.
- macOS, iOS (sem macOS/Xcode) e Linux (container não executado).
- Cliente Android funcional (a casca não abre sessão; depende do contrato de eventos).
- `npm audit`/SBOM, acessibilidade e performance não auditados.

## Instalação (uso interno, Windows)

O artefato atual é **desempacotado**, não instalador:

```
apps/desktop/release/win-unpacked/B-3PO.exe
```

Requisitos: Windows 10/11 x64. O executável **não é assinado** — o SmartScreen pode alertar; isso é
esperado e está registrado em `ADR-007-release-signing.md`.

## Primeiro acesso

1. Abra `B-3PO.exe`.
2. Configure um provider de modelo (a interface de configuração do runtime) — no ambiente de teste foi
   usado **Ollama local** com `qwen3.5:4b` (janela ≥ 64K é exigência do runtime).
3. Crie um bot e escolha um avatar.

> O bot precisa de uma CLI/provider utilizável. Sem isso a criação funciona, mas o bot não executa turno —
> o runtime reporta erro explícito em vez de fingir sucesso.

## Marca e licença

- Nome de trabalho: **B-3PO Bot Platform** (DZ23-LTDA). Lançamento público depende de avaliação jurídica
  e aprovação do proprietário.
- Código: **MIT**, fork de [Hermes Agent](https://github.com/NousResearch/hermes-agent) — ver `LICENSE` e
  `NOTICE`. A marca, o robô e os 20 mascotes pertencem à DZ23 e **não** são cobertos pelo MIT.

## Documentação técnica

| Assunto | Arquivo |
|---|---|
| Baseline e decisão | `docs/b3po/BASELINE-REPORT.md`, `BASELINE-DECISION.md` |
| Contrato do runtime | `docs/b3po/RUNTIME-CONTRACT-REPORT.md` |
| Schema do bot | `docs/b3po/BOT-SCHEMA-AUDIT.md` |
| Plataformas e bloqueios | `docs/b3po/PLATFORM-MATRIX.md`, `MOBILE-FEASIBILITY-REPORT.md` |
| Segurança | `docs/b3po/SECURITY-GAP-REPORT.md` |
| Testes | `docs/b3po/TEST-PLAN.md`, `TEST-RESULTS.md` |
| Decisões de arquitetura | `docs/b3po/adr/ADR-001..007` |
| Log de execução | `docs/b3po/AUTONOMOUS-EXECUTION-LOG.md` |

## Limitações conhecidas

- `cliName` do runtime continua `hermes` (renomeação de nível 2 não autorizada pela Ata).
- O `userData` do desktop mudou com o rebranding; instalações antigas em `%APPDATA%\Hermes` não migram
  automaticamente.
- O ícone `.icns`/bundle macOS ainda usa a arte antiga (macOS bloqueado neste ambiente).
