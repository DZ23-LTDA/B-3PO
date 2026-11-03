# INSTALAÇÃO — B-3PO

Este documento separa o que **existe como artefato** do que está **bloqueado**. Não há release publicado.

## Windows (única plataforma com artefato)

### Artefatos que existem

| Arquivo | Formato | Assinatura | Como usar |
|---|---|---|---|
| `apps/desktop/release/win-unpacked/B-3PO.exe` | executável desempacotado | **não assinado** | rodar direto da pasta |
| `apps/desktop/release/B3PO-0.0.0-win-x64.msix` | instalador MSIX | **NotSigned** | **não instala** em Windows comum sem sideload + certificado confiável |

SHA-256 de ambos está em `ARTIFACT-MANIFEST.md`.

### Requisitos

- Windows 10/11 x64.
- Um **provider de modelo** utilizável. Validado com Ollama local (`qwen3.5:4b`, janela ≥ 64K).
- Espaço em disco: ~240 MB do app + o runtime Python que o app instala no primeiro uso.

### Primeiro uso (caminho real do app)

1. Execute `B-3PO.exe`.
2. A tela **"Set up B-3PO"** oferece duas opções:
   - **Install B-3PO locally** — baixa e cria o ambiente Python do runtime (é o caminho de quem não tem nada instalado);
   - **Connect to existing B-3PO runtime** — aponta para um gateway já rodando (URL + token ou sign-in no browser).
3. O SmartScreen pode avisar porque o artefato **não é assinado** — isso é esperado e está registrado em `ADR-007-release-signing.md`.

### Build a partir do código (desenvolvedor)

```powershell
# na raiz do repositório
./activate.ps1
cd apps/desktop
npm run build          # renderer + main (dist/)
npm run pack           # empacota em release/win-unpacked
npm run dist:win       # gera o MSIX
```

> **Atenção:** se a sessão exportar `ELECTRON_RUN_AS_NODE=1`, o app roda como Node puro e morre com
> `does not provide an export named 'BrowserWindow'`. Remova a variável antes de abrir.

## Linux — BLOCKED hoje

Não há artefato. Tentativas e resultado exato estão em `PLATFORM-MATRIX.md`:

- Docker: daemon parado (`npipe:////./pipe/dockerDesktopLinuxEngine`).
- WSL: sem Node nativo (só o npm do Windows via interop).

Alvos previstos pelo projeto: **AppImage** e, quando suportado, `.deb`. O caminho recomendado é rodar
`npm run test:e2e`/`electron-builder --linux` num runner `ubuntu-latest`.

## macOS — BLOCKED hoje

Não há `.app`, `.dmg` nem `.pkg`, e **não** há notarização. Exige macOS + Xcode + certificado Apple.
Nada neste relatório deve ser lido como "pronto para Mac".

## Android — só a casca

Existe `mobile/android-brand-shell/dist/b3po-android-shell-debug.apk` (301 KB, assinado com keystore de
debug), instalado e aberto no emulador como prova de marca.

**Não é o cliente do produto**: ele não lista bots, não recebe eventos e não executa nada. O app funcional
depende do contrato de eventos e da decisão de arquitetura em `MOBILE-ARCHITECTURE-DECISION.md`.

```powershell
# reconstruir a casca (sem Gradle: aapt2 + javac + d8 + zipalign + apksigner)
cd mobile/android-brand-shell
./build.ps1
adb install -r dist/b3po-android-shell-debug.apk
```

## iOS — BLOCKED hoje

Não há build, archive nem IPA. Exige macOS + Xcode + conta Apple Developer.

## Problemas comuns

| Sintoma | Causa provável | Saída |
|---|---|---|
| App fecha ao abrir no dev | `ELECTRON_RUN_AS_NODE=1` na sessão | remover a variável |
| Tela de setup não passa | nenhum gateway/runtime instalado | "Install B-3PO locally" ou conectar a um gateway |
| Bot não responde | provider sem janela ≥ 64K ou sem chave | configurar provider compatível |
| MSIX não instala | pacote não assinado | usar o `win-unpacked` ou assinar com certificado |
| Dados antigos "sumiram" | o rebranding mudou o `userData` | os dados antigos continuam no diretório anterior |
