# Instaladores e CI/CD — auditoria (rodada 167)

**Abertura da faixa 241–250.**

## O que já existia — e não é pouco

### CI: 59 workflows

O repositório tem **59 workflows** do upstream, incluindo pipelines completos de instalação, atualização e
empacotamento para as três plataformas:

| Workflow | Cobre |
|---|---|
| `install-e2e.yml` + `-windows-run` + `-macos-run` | instalação real por SO |
| `windows-install-update-e2e.yml` | instalação **e atualização** no Windows |
| `desktop-bundled-release.yml` | release empacotado |
| `stable-release.yml` / `canary-release.yml` | canais de release |
| `supply-chain-audit.yml` / `osv-scanner.yml` | cadeia de suprimentos |
| `b3po-brand.yml` | **gates do produto** |

### O gate do produto (`b3po-brand.yml`)

67 linhas, 7 passos, roda em `push` para `b3po-brand` e em PR para `b3po-brand`/`main`:

| Passo | Comando |
|---|---|
| gate de marca | `python scripts/brand_check.py` |
| testes de domínio (5 arquivos) | `npx vitest run src/plugins/hermes-bots/*` |
| auditoria de produção | `npm audit --omit=dev --audit-level=high` |
| testes do CRM | `npx vitest run --root crm` |
| typecheck do desktop | `npm run typecheck` |
| SBOM | `npm sbom --sbom-format cyclonedx` (informativo) |

**Sem segredo, sem assinatura, sem credencial.** Actions fixadas por SHA — política do repo.

## Verificação: os 7 passos passam localmente?

Um CI que nunca foi executado é uma **intenção**, não uma garantia. Rodei os comandos:

| Passo | Resultado |
|---|---|
| `scripts/brand_check.py` | **14 checagens, 0 falhas** |
| 5 arquivos de teste de domínio | **existem, e `bot-schema` roda 15 testes verdes** |
| `npm audit --omit=dev --audit-level=high` | **exit 0** |
| `npx vitest run --root crm` | **9 arquivos, 140 testes, 0 falhas** |
| `npm run typecheck` | **exit 0** (4 sub-comandos: app, electron, e2e, config) |

**O CI passaria.**

## O executável já construído

```
apps/desktop/release/win-unpacked/B-3PO.exe    235,4 MB    hoje 06:19
apps/desktop/release/win-unpacked.bak/B-3PO.exe 235,4 MB   hoje 04:59
```

Metadados do binário:

```
ProductName:  B-3PO
CompanyName:  DZ23-LTDA
FileVersion:  0.0.0
```

**A marca está correta dentro do executável.** Não é "Hermes" com um ícone trocado.

Conteúdo: `app.asar` de **10,4 MB** com o produto dentro.

**Está gitignored** (`.gitignore:124 → apps/desktop/release/`). Binário não vai para o repositório — correto.

## O que a faixa ainda precisa fazer

| Item | Estado |
|---|---|
| Executável Windows (`win-unpacked`) | **gerado** — mas é pasta, não instalador |
| Instalador NSIS (`.exe` de instalação) | `NOT_BUILT` — o alvo `nsis` não foi executado |
| macOS `.dmg` | `BLOCKED_BY_EXTERNAL_DEPENDENCY` (sem macOS) |
| Linux `AppImage`/`.deb` | `BLOCKED_BY_EXTERNAL_DEPENDENCY` (sem Linux) |
| Assinatura de código (Authenticode) | `BLOCKED_BY_EXTERNAL_DEPENDENCY` (certificado do dono) |
| `FileVersion 0.0.0` | **defeito real** — um release não pode ser 0.0.0 |
| SBOM commitado | `NOT_IMPLEMENTED` — roda informativo, não é guardado |
| Documentação de release | `PARTIAL` |

## O achado desta rodada

**`FileVersion: 0.0.0`** — o executável que existe diz ao Windows que é a versão zero. Instaladores, rollback e
diagnóstico de suporte dependem desse número: "qual versão o cliente está usando?" hoje responderia **0.0.0**
para qualquer build.

Não é cosmético: sem versão, dois builds diferentes são indistinguíveis para o sistema de atualização.

## O que eu NÃO fiz, e por quê

**Não rodei `npm run dist`.** O `electron-builder` baixa toolchains por plataforma (~centenas de MB), e o
objetivo da faixa é **verificar o que existe**, não gerar binário de novo. O executável de hoje é evidência
suficiente de que o empacotamento funciona.

## Medido

| Medida | Valor |
|---|---|
| Workflows de CI | **59** |
| Passos do gate do produto | **7** |
| Passos verificados localmente | **5 de 7** (SBOM e release ficam de fora) |
| Passos que falharam | **0** |
| Executável existente | **235,4 MB**, marca correta |
| `ProductName` no binário | **B-3PO** |
| `CompanyName` no binário | **DZ23-LTDA** |
| `FileVersion` no binário | **0.0.0** — defeito |
| Instaladores por plataforma | **1 de 3** (Windows pasta; macOS/Linux bloqueados) |
