# B-3PO — BLOCKERS (V3)

**Atualizado**: 2026-11-06T18:54:58Z UTC · **Rodada**: 61 · **Data**: 06/11/2026

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

---

## B1 do aditivo V3 — "Servidor inferência indisponível" (INVESTIGADO em r280)

**Estado**: `BLOCKED_BY_EXTERNAL_DEPENDENCY` para a PARTE invertível; **corrigido** o que era nosso.

### A causa raiz, medida

O `HERMES_HOME` de teste (`%TEMP%\b3po-menu-view6`) tem:

| Arquivo | Estado |
|---|---|
| `config.yaml` | `model.default: "anthropic/claude-opus-4.6"` — **modelo escolhido** |
| `.env` | **27,9 KB, 0 chaves ativas, 29 `*_API_KEY` COMENTADAS** |

**Nenhum provedor configurado.** O backend responde `AuthError` em
`hermes_cli/auth.py:1698` com `code="no_provider_configured"`:

> "Hermes is not connected to any AI provider yet. Run `hermes model` to pick one, type `/login` in
> chat, or add a key with `hermes auth add <provider>`."

**Não é bug do app, não é corrupção, não é "o servidor caiu".** É credencial ausente.

### O que EU corrigi (era nosso)

O aviso chegava **em inglês** ao painel do gateway, num produto em pt-BR, e **não dizia o caminho
para quem está no app** — mandava rodar `hermes model` num terminal.

**Correção** (`lib/gateway-health-pill.ts` + `app/shell/gateway-menu-panel.tsx`):

- `ehAvisoSemProvedor(motivo)` reconhece as DUAS formas do aviso num lugar só — a constante
  `DEFAULT_NOT_READY_REASON` e o texto livre do `AuthError` (comparação por trecho, porque a do
  servidor interpola o `HERMES_HOME` no fim);
- a UI troca pelo texto traduzido: **"Nenhum provedor de IA configurado. Abra Configurações →
  Provedores e adicione uma chave, ou escolha um modelo local."**
- a chave `gatewayMenu.gatewayNeedsProvider` foi para os **9 locales** + `types.ts`.

**Prova medida** (Playwright sobre o painel aberto):

```
antes:   "Hermes is not connected to any AI provider yet. Run `hermes model`…"   (inglês)
depois:  "Nenhum provedor de IA configurado. Abra Configurações → Provedores…"    (pt-BR)
         { pt: true, en: false, enDefault: false }
```

### O que NÃO posso resolver

**Adicionar a chave do provedor.** Isso exige uma credencial que só o dono tem.

**Ação exata de desbloqueio** (qualquer uma):

1. **No app**: Configurações → Provedores → escolher um provedor e colar a chave;
2. **No terminal**: `hermes model` (escolhe provedor) ou `hermes auth add <provider>`;
3. **No arquivo**: descomentar e preencher a chave em `%TEMP%\b3po-menu-view6\.env`
   (ex.: `OPENROUTER_API_KEY=sk-or-…`).

**Até lá, o status `Servidor · inferência indisponível` está CORRETO** — o app não tem com quem
falar. A diferença é que agora ele diz isso em português e aponta a porta.

### B1 — veredito por escopo

| Escopo | Estado |
|---|---|
| causa raiz identificada e medida | **READY** |
| aviso traduzido e acionável | **READY** (prova acima) |
| inferência funcionando de ponta a ponta | **BLOCKED_BY_EXTERNAL_DEPENDENCY** — chave do provedor |


---

## RISCO DE CONFORMIDADE — WCAG 2.4.7 (Focus Visible) nao atendido no app inteiro

**Medido na r67.**

```
elemento ativo apos Tab:  outline: none · box-shadow: none
regra no styles.css:      *:focus, *:focus-visible { outline: none }
                          *:focus-visible { --tw-ring-shadow: 0 0 #0000 !important }
```

**E uma decisao de produto EXPLICITA do upstream** (comentario no proprio CSS): *"nenhum anel de foco em
lugar nenhum"*. O r277 marcou duas superficies com `[data-b3po-foco]` (cartoes da home, seletor de modo);
o resto do app nao tem indicador.

**DECISAO NECESSARIA (proprietario):**

| Opcao | Consequencia |
|---|---|
| **A** manter a regra | WCAG 2.4.7 nao atendido; se "conformidade AA" for requisito, isto e BLOCKER |
| **B** reverter a regra global | todo controle focado ganha anel; muda a identidade visual do produto |
| **C** marcar superficie por superficie | meio-termo; exige escolher quais telas importam |

**Nao e regressao minha nem bug de codigo**: e conflito entre a identidade visual do upstream e a
norma. **Eu nao escolho por voce.**
