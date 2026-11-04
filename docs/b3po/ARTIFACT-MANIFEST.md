# ARTIFACT MANIFEST — B-3PO

Manifesto dos artefatos **deste** build. Manifesto com dado velho engana mais do que ajuda: os
hashes abaixo foram calculados nesta máquina a partir dos arquivos listados; nada é estimado.

commit `bb3a49a1a7` · branch `b3po-brand` · 239 commits sobre `main` · gerado em 2026-11-04 06:15 UTC

| Plataforma | Formato | Arquivo | Tamanho | SHA-256 | Construído |
|---|---|---|---|---|---|
| Windows x64 | MSIX (Store-only, NAO assinado) | `B3PO-0.0.0-win-x64.msix` | 191.4 MB | `1ad09642a0b4f393bb0d0e58fc68ae8bdf9457e3e8de38c359babc28be4c7e66` | 2026-11-04 06:14 UTC |
| Windows x64 | executavel (win-unpacked) | `B-3PO.exe` | 235.4 MB | `9e9f5e56f2bcf37630f305c8a096bce09aede39b5c761178bdd5b170451de6fb` | 2026-11-04 06:13 UTC |
| Android | APK release (chave de debug) | `app-release.apk` | 44.2 MB | `3a337404ce6c2391b5339fe6aa6a85149ee7fc282f04422c01599abeadfe68eb` | 2026-11-03 20:27 UTC |
| Android | APK debug | `app-debug.apk` | 93.5 MB | `8548a635904760483eeadfad5b0f43114aca90d3a447f782e2f9c38dc8c3ca98` | 2026-11-03 19:46 UTC |
| Android | AAB release (chave de debug) | `app-release.aab` | 19.0 MB | `47fdfe557cf61a765287533d08abe38357a371a3cf227c22c5b67a97c8df8f61` | 2026-11-03 20:27 UTC |

## Assinatura e limites (declarado, não presumido)

- **MSIX Windows:** não assinado (`AZURE_SIGN_*` ausente; o builder registra *AppX/MSIX package is
  not signed — Windows Store only build*). Instalação por duplo clique não foi validada.
- **APK/AAB Android:** assinados com a **chave de debug**; não há keystore de release no repositório.
- **iOS:** nenhum artefato — BLOCKED_BY_EXTERNAL_DEPENDENCY (macOS + Xcode + certificado).
- **macOS / Linux:** nada construído aqui.

## O que este build contém de relevante

- Desktop em **pt-BR**, com datas no idioma da interface.
- Gateway com **allowlist de métodos por ticket de dispositivo** (4030 fora dos verbos de sessão).
- Mobile: lista de conversas por bot, reconexão com espera crescente, desconectar e reparear por link.
