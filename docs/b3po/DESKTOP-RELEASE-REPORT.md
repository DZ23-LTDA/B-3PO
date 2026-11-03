# DESKTOP-RELEASE-REPORT — B-3PO (Windows)

## Artefatos

| Arquivo | Tamanho | Observação |
|---|---|---|
| `apps/desktop/release/win-unpacked/B-3PO.exe` | ~235 MB | portátil, abre direto |
| `apps/desktop/release/B3PO-0.0.0-win-x64.msix` | ~191 MB | instalador do Windows |

Hashes oficiais em `ARTIFACT-MANIFEST.md`. Os artefatos foram gerados a partir do commit
`2db0ab4e`; depois disso o código avançou (i18n, mobile), então **é preciso rebuild** para publicar.

## O que foi verificado

- identidade do executável: `ProductName` / `CompanyName` = B-3PO / DZ23 (VersionInfo lido do `.exe`);
- janela abre com título B-3PO e interface em português;
- instalador MSIX gera pacote instalável (não assinado);
- histórico completo em `INSTALLER-TEST-REPORT.md` e `DESKTOP-AUDIT.md`.

## Limitações declaradas

| Item | Estado |
|---|---|
| assinatura de código | 🔒 BLOCKED — exige certificado comercial (CN=DZ23-LTDA) |
| SmartScreen | aviso esperado em app não assinado |
| macOS / Linux | não construídos nesta máquina (macOS exige Mac; Linux sem container no momento) |
| atualização automática | existe no upstream; não validada ponta a ponta com artefato assinado |

## Próximo passo para release

1. rebuild a partir do HEAD atual (`npm run dist:win` em `apps/desktop`);
2. atualizar hashes em `ARTIFACT-MANIFEST.md`;
3. quando o certificado existir, assinar e registrar aqui o resultado real da assinatura.
