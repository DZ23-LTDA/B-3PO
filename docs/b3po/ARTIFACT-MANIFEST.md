# ARTIFACT MANIFEST — B-3PO

Manifesto dos artefatos **deste** build. Manifesto com dado velho engana mais do que ajuda: os
hashes abaixo foram calculados nesta máquina a partir dos arquivos listados; nada é estimado.

commit `7391977387` · branch `b3po-brand` · 144 commits sobre `main` · gerado em 2026-11-03 20:29 UTC

| Plataforma | Formato | Arquivo | Tamanho | SHA-256 | Construído |
|---|---|---|---|---|---|
| Windows x64 | MSIX (Store-only, NAO assinado) | `B3PO-0.0.0-win-x64.msix` | 190.9 MB | `03d14a20fc6b370c851759e9a987d887f0f7d753f9d87a2003220aea000a667b` | 2026-11-03 20:29 UTC |
| Windows x64 | executavel (win-unpacked) | `B-3PO.exe` | 235.4 MB | `7fa6b5a7d52535380e673a73d45869bf1b8d94f23ca53f2c1495e8da8c7c6643` | 2026-11-03 20:28 UTC |
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
