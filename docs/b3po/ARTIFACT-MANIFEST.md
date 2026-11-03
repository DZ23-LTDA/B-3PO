# ARTIFACT MANIFEST — B-3PO

Manifesto dos artefatos **deste** build. Manifesto com dado velho engana mais do que ajuda: os
hashes abaixo foram calculados nesta máquina a partir dos arquivos listados; nada é estimado.

commit `b68bd72ec4` · branch `b3po-brand` · 137 commits sobre `main` · gerado em 2026-11-03 20:02 UTC

| Plataforma | Formato | Arquivo | Tamanho | SHA-256 | Construído |
|---|---|---|---|---|---|
| Windows x64 | MSIX (Store-only, NAO assinado) | `B3PO-0.0.0-win-x64.msix` | 190.9 MB | `30992b1922a362c671c421e34c6fbb9d3ac6b91dc95e3a336509e1f5d5c4e0ae` | 2026-11-03 20:02 UTC |
| Windows x64 | executavel (win-unpacked) | `B-3PO.exe` | 235.4 MB | `15584fc64fca82b1756e1cded580464f94b701b604ffa648280e87be44ad7933` | 2026-11-03 20:01 UTC |
| Android | APK release (chave de debug) | `app-release.apk` | 44.2 MB | `78962e274391b4a67bfc968fdb251fd19fbedcac2edbe6564739e4e6bf52b650` | 2026-11-03 19:42 UTC |
| Android | APK debug | `app-debug.apk` | 93.5 MB | `8548a635904760483eeadfad5b0f43114aca90d3a447f782e2f9c38dc8c3ca98` | 2026-11-03 19:46 UTC |
| Android | AAB release (chave de debug) | `app-release.aab` | 19.0 MB | `218d0dd316724ef732c5f5ea9d2d9a561d5204d59db63add5463334a7c417656` | 2026-11-03 19:46 UTC |

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
