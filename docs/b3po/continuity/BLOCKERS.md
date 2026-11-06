# B-3PO — BLOCKERS (V3)

**Atualizado**: 2026-11-06T18:54:58Z UTC · **HEAD**: `05034dd5c99ec09882c99d83e654ec2bcc955f58`

---

## BLOCKED_BY_EXTERNAL_DEPENDENCY

**Ação exata para desbloquear** em cada linha. Nenhum segredo deve ser colado no chat.

| ID | Bloqueio | O que falta | Ação exata | Impacto hoje |
|---|---|---|---|---|
| **EXT-1** | **Credencial de provedor de modelo** | chave de API de um provedor (Anthropic/OpenAI/etc.) | o proprietário configura em **Configurações → Provedores**, na própria máquina | **"Servidor inferência indisponível"** — a Sofia não responde; **B1 e G2 dependem disto** |
| **EXT-2** | **Authenticode** | certificado de assinatura de código Windows | emitir/instalar o certificado; `AZURE_SIGN_*` ou `signtool` | o MSIX **existe** mas não é assinado |
| **EXT-3** | **Conta Google Play** | conta de desenvolvedor + upload | criar conta; o **APK já está assinado** (`CN=B-3PO, O=DZ23-LTDA`, v2+v3) | não publicado |
| **EXT-4** | **iOS** | **`.p12` (chave privada) + provisioning profile** + macOS/Xcode | o `distribution.cer` sozinho **não assina** | o iOS **compila no CI** (`macos-15`), mas não gera IPA instalável |
| **EXT-5** | **Marketplaces / canais** | credenciais de sandbox (Mercado Livre, TikTok Shop, WhatsApp Cloud) | contas de desenvolvedor + app review de cada plataforma | nenhuma integração externa pode ser declarada READY |
| **EXT-6** | **Homologação fiscal** | certificado digital A1/A3 + contador | providenciar fora do código | documento fiscal fica como **homologação**, nunca como válido |

---

## BLOQUEIOS TÉCNICOS DO REPOSITÓRIO (V2, reclassificados no G8)

**12 testes que falham SEMPRE** — infraestrutura, não UX:

| Arquivo | Testes | Causa |
|---|---|---|
| `electron/ssh-connection.test.ts` | 4 | `sun_path` 108 bytes e sinais POSIX |
| `scripts/bundle-electron-main.test.mjs` | 3 | `desktop.electron_flags` não é lido |
| `electron/desktop-plugin-install.test.ts` | 3 | CRLF em mais de um ponto do git |
| `electron/linux-nvidia-egl-recovery.native.test.ts` | 2 | recuperação de EGL — **sem GPU NVIDIA nesta máquina** |
| `scripts/stage-native-deps.test.mjs` | 1 | espera `/desktop packaging continues/` |
| `scripts/run-electron-builder.test.mjs` | 1 | `Cannot consume packaging inputs` |

> **7 flaky** adicionais passam sozinhos (provado arquivo por arquivo). **0 de UX.**
