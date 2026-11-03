# ARTIFACT-MANIFEST

| Campo | Windows (único artefato gerado nesta rodada) |
|---|---|
| Nome | `Hermes.exe` (nome de produto ainda **não** rebrandado) |
| Plataforma | Windows x64 |
| Versão do pacote | `0.0.0` (`apps/desktop/package.json`) |
| Commit | `21595add` + docs desta rodada (branch `b3po-brand`) |
| Caminho | `apps/desktop/release/win-unpacked/` |
| Formato | aplicativo desempacotado (`--dir`), **não** instalador |
| Tamanho | 235,4 MB |
| SHA-256 | `a570f6c626faf00a85738611d47c80792a722da1bde763b1a749fd4e12f62c43` |
| Assinatura | **NÃO ASSINADO** (`AZURE_SIGN_*` ausente — declarado pelo próprio empacotador) |
| Notarização | não se aplica (Windows) |
| Runner usado | Windows 11, Node v26.12.1, electron-builder |
| Limitações | não é instalador; nome ainda Hermes; sem assinatura; não testado em instalação limpa |
| Instalação | executar o `.exe` na pasta desempacotada (uso interno) |

## Artefatos ausentes (e por quê)

| Plataforma | Artefato | Motivo |
|---|---|---|
| Windows | MSIX/NSIS assinado | sem certificado e sem rodar `dist:win` nesta rodada |
| macOS | `.app`/`.dmg` | sem macOS/Xcode — **BLOCKED_BY_EXTERNAL_DEPENDENCY** |
| Linux | AppImage/deb/rpm | exige container Linux; viável, não executado |
| Android | APK/AAB | não existe projeto cliente mobile |
| iOS | archive/IPA | sem macOS/Xcode/certificado — **BLOCKED_BY_EXTERNAL_DEPENDENCY** |

Nenhum artefato acima pode ser anunciado como existente. O manifesto lista só o que foi produzido.

## Atualização 21:30 — Android (casca de marca)

| Campo | Valor |
|---|---|
| Nome | `b3po-android-shell-debug.apk` |
| Plataforma | Android (minSdk 24, targetSdk 35) |
| Versão | `0.0.0` |
| Commit | `606d2d4` + fonte `mobile/android-brand-shell/` |
| Formato | APK de debug |
| Tamanho | 301 KB |
| SHA-256 | `a96b4a332a153322b16488987b8295b531c71cb8ac8baa97da42338282f9648f` |
| Assinatura | keystore **de debug** (não é chave de distribuição) |
| Runner | Windows 11 + emulador `emulator-5554` (AVD `dsh_pixel`) |
| Instalação | `adb install -r` → **Success** |
| Execução | `am start` abriu `com.dz23.b3po.shell/.MainActivity`; screenshot em `evidence/android-brand-shell.png` |
| Limitações | **não é o cliente do produto**; não abre sessão, não lista bots, não recebe eventos |

## Atualização 21:50 — desktop rebrandado (Fase E parte 1)

Identidade do build mudou na fonte única `apps/desktop/product-identity.cjs`:

| Campo | Antes | Depois |
|---|---|---|
| displayName (padrão) | Hermes | **B-3PO** |
| displayName (light / bundled) | Hermes Light / Hermes Agent | **B-3PO Light / B-3PO Agent** |
| appId | com.nousresearch.hermes | **com.dz23.b3po** |
| msixAppIdWithOrg | NousResearch.Hermes | **DZ23.B3PO** |
| author / CompanyName | Nous Research | **DZ23-LTDA** |
| cliName | hermes | **hermes (inalterado — nível 2 não autorizado)** |

Ícone trocado para o da marca (`assets/icon.ico`/`icon.png` gerados de `brand/icons/b3po-icon-512.png`).
AUMID de fallback em `main.ts` corrigido para `com.dz23.b3po`.

**Artefato reconferido:** `release/win-unpacked/B-3PO.exe` — ProductName `B-3PO`, CompanyName `DZ23-LTDA`, **não assinado**, SHA-256 `41170c009afad4c4271306ecaacaeb047a510221856695971361371f2561f12d`.

**Migração de dados:** o userData do Electron passa a derivar de `B-3PO`; instalações antigas em `%APPDATA%\Hermes` não são tocadas nem migradas automaticamente. Aceitável em pré-lançamento; se houver build interno em uso, migração com cópia + rollback entra na Fase C/2.

## Atualização 21:53 — instalador Windows (MSIX)

| Campo | Valor |
|---|---|
| Arquivo | `apps/desktop/release/B3PO-0.0.0-win-x64.msix` |
| Tamanho | 185,53 MB |
| SHA-256 | `71f2b3ed45aa32353fc320a02d59ed825d7d27a0bd306e8c0252c049bb5486f0` |
| Assinatura | **NotSigned** (confirmado por `Get-AuthenticodeSignature`, não só pelo log) |
| Manifest | `assets/msix-manifest.xml` (custom, do projeto) |
| Runner | Windows 11 + `npm run dist:win` |

**Consequência:** MSIX não assinado **não instala** em Windows comum sem sideload habilitado e
certificado confiável. Ou seja: o artefato existe e é reproduzível, mas a prova de instalação limpa
depende de certificado (dependência externa) — não vou chamar de instalável.

---

## Tabela consolidada (formato exigido pelo GOAL, 2026-11-02 23:59)

Campos: nome, plataforma, versão, commit, **hash**, formato, assinatura, notarização, runner, limitações,
instrução de instalação.

### 1. Aplicativo desktop (Windows)

| Campo | Valor |
|---|---|
| Nome | `B-3PO.exe` |
| Plataforma | Windows 10/11 x64 |
| Versão | `0.0.0` |
| Commit | `707c3df2` (identidade) — UI de mascotes é posterior; ver limitação |
| Hash (SHA-256) | `41170c009afad4c4271306ecaacaeb047a510221856695971361371f2561f12d` |
| Formato | diretório desempacotado (`--dir`), **não** instalador |
| Assinatura | **não assinada** |
| Notarização | não se aplica |
| Runner | Windows 11, Node 26.12.1, electron-builder |
| Limitações | não é instalador; build anterior à fiação do mascote; sem assinatura; instalação limpa não testada |
| Instalação | executar o `.exe` na pasta |

### 2. Instalador (Windows MSIX)

| Campo | Valor |
|---|---|
| Nome | `B3PO-0.0.0-win-x64.msix` |
| Plataforma | Windows 10/11 x64 (MSIX) |
| Versão | `0.0.0` |
| Commit | `3c92a2ba` |
| Hash (SHA-256) | `71f2b3ed45aa32353fc320a02d59ed825d7d27a0bd306e8c0252c049bb5486f0` |
| Formato | MSIX (manifest custom em `assets/msix-manifest.xml`) |
| Assinatura | **NotSigned** (confirmado por `Get-AuthenticodeSignature`) |
| Notarização | não se aplica |
| Runner | Windows 11, `npm run dist:win` |
| Limitações | **não instala** em Windows comum sem sideload + certificado confiável; build anterior à UI de mascotes |
| Instalação | não recomendada — usar o desempacotado |

### 3. Casca Android

| Campo | Valor |
|---|---|
| Nome | `b3po-android-shell-debug.apk` |
| Plataforma | Android (minSdk 24, targetSdk 35) |
| Versão | `0.0.0` |
| Commit | `606d2d4` |
| Hash (SHA-256) | `a96b4a332a153322b16488987b8295b531c71cb8ac8baa97da42338282f9648f` |
| Formato | APK de debug |
| Assinatura | keystore **de debug** |
| Notarização | não se aplica |
| Runner | Windows 11 + emulador `emulator-5554` |
| Limitações | **não é o cliente do produto** (sem login, bots ou eventos) |
| Instalação | `adb install -r` (validado) |

**Nota:** as tabelas anteriores deste arquivo são históricas. Esta é a consolidada e a única que deve ser
citada em relatório.

### Correção de bookkeeping (2026-11-03 00:10)

O SHA-256 do `B-3PO.exe` registrado antes (`35269d02…`) era de um build **anterior** ao `dist:win`. O arquivo
em disco (mtime 21:52:24, mesmo minuto do MSIX) tem:

```
41170c009afad4c4271306ecaacaeb047a510221856695971361371f2561f12d
```

**Consequência real:** os artefatos Windows em `release/` correspondem ao commit **`3c92a2ba`** (21:52) —
portanto **não** incluem a UI de mascotes, o título B-3PO nem o rebranding de onboarding feitos depois. Para
gerar artefato fiel ao topo da branch é preciso rodar `npm run pack` / `npm run dist:win` de novo; isso não foi
feito para não republicar números sem revalidar.

## Rodada 28 — artefatos Windows no commit `2db0ab4e` (2026-11-03 09:11)

| Artefato | Tamanho | SHA-256 | Assinatura |
|---|---|---|---|
| `apps/desktop/release/win-unpacked/B-3PO.exe` | 235 MB | `E0DDAC4D7C5ACCB7E3170D3AA4AD676E8D7611BF1F38FBDC10C60063CDE03F0A` | não assinado |
| `apps/desktop/release/B3PO-0.0.0-win-x64.msix` | 191 MB | `9957874811ACE069CFC14803F3AF2703D53B6586BD47BFFA12A89684AB3B5CF7` | `NotSigned` (confirmado por `Get-AuthenticodeSignature`) |

Estes artefatos incluem: wordmark B-3PO, nome do agente B-3PO, sidebar/configurações em pt-BR,
catálogo de mascotes da marca (20) no lugar do petdex e ausência do strip de telemetria.
