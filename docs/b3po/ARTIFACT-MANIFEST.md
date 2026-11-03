# ARTIFACT MANIFEST — B-3PO

Manifesto dos artefatos **deste** build. Os blocos antigos deste arquivo (que ainda diziam `Hermes.exe`)
foram substituídos por esta versão: manifesto com dado velho engana mais do que ajuda. O histórico de
builds anteriores vive em `DESKTOP-RELEASE-REPORT.md` e `MOBILE-REPORT.md`.

commit `9f181585eb` · branch `b3po-brand` · gerado em 2026-11-03 18:57 UTC

| Plataforma | Formato | Arquivo | Tamanho | SHA-256 | Construído |
|---|---|---|---|---|---|
| Windows x64 | MSIX (Store-only, NAO assinado) | `B3PO-0.0.0-win-x64.msix` | 190.9 MB | `5e111fe09a09011fe7bdc341fff464544fcf861ff0936efd98789c7e2b39f7ab` | 2026-11-03 18:55 UTC |
| Windows x64 | executavel (win-unpacked) | `B-3PO.exe` | 235.4 MB | `c7b5735d2cb46a4ca1e33ad701160928e3060514bc80b71a547d0f4b0e0e0a28` | 2026-11-03 18:54 UTC |
| Android | APK release (chave de debug) | `app-release.apk` | 44.2 MB | `1366a6a897d0389b5d3b5ee3deb09469817b92f5699fc06cbf9588a7e6445db2` | 2026-11-03 18:50 UTC |
| Android | APK debug | `app-debug.apk` | 93.2 MB | `10db8315f004768755cd6463470878d4a1289d94a6312eff9c5e0ba56532aca5` | 2026-11-03 15:28 UTC |
| Android | AAB release (chave de debug) | `app-release.aab` | 19.0 MB | `5b84826ff9b13347c588534b8f48f62646b086f7e34f5803d451410e8e787f18` | 2026-11-03 15:35 UTC |

## Assinatura e limites (declarado, não presumido)

- **MSIX Windows:** `[batch-sign] AZURE_SIGN_* not set` — pacote **não assinado**; o builder registra
  `AppX/MSIX package is not signed  reason=Windows Store only build`. Instalação por duplo clique não
  foi validada nesta máquina.
- **APK/AAB Android:** assinados com a **chave de debug**; não há keystore de release no repositório
  (é proibido commitar). Publicação em loja é impossível neste estado.
- **iOS:** nenhum artefato — BLOCKED_BY_EXTERNAL_DEPENDENCY (macOS + Xcode + certificado).
- **macOS / Linux:** nada construído aqui.

## O que este build contém de relevante

- Desktop com a UI em **pt-BR** (incluindo composer e statusbar) e datas no idioma da interface.
- Mobile com **reconexão**: espera crescente (1 s, 3 s, 8 s), contagem na tela e botão "Tentar de novo".

Os hashes foram calculados nesta máquina a partir dos arquivos listados. Nenhum valor é estimado.
