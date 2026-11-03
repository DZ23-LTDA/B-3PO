# DEFECT — overlay "Acordando <perfil>…" não sai (Bot Mode)

**Sintoma:** ao abrir o chat de um bot e enviar uma mensagem, o overlay `Acordando <perfil>…`
permanece na tela indefinidamente e o composer fica bloqueado (`contextSwitching`).

**Impacto:** o turno é executado (há resposta real no transcript), mas o usuário não consegue
continuar a conversa — o produto parece travado.

## O que já foi provado como NÃO sendo a causa

| Hipótese | Como foi testado | Resultado |
|---|---|---|
| Provider sem endpoint (HTTP 404) | `hermes -z` no perfil | corrigido; turno responde `Ok` em 5 s |
| Turno não chega ao runtime | transcrito em `state.db` (`evidence/f5-session-messages.txt`) | **chega e responde**: `[user] Responda em uma frase…` → `[assistant] Este bot é um assistente especialista…` |
| Bundle antigo do renderer | `npm run build` + relançar | bundle novo confirmado (`Acordando` no bundle, `Waking up` ausente) e o overlay **continua** |
| `tileDelegate.resumeTile` sem deadline | `awaitTileResume` com o orçamento de hidratação, build, teste real | overlay **continua**; patch revertido (não resolveu e estourava o ratchet de health) |

## Onde o overlay é ligado e desligado

| Arquivo | Linha | O quê |
|---|---|---|
| `apps/desktop/src/store/profile.ts` | 682 | `$gatewaySwapTarget.set(target)` antes de `activateProfile` |
| `apps/desktop/src/store/profile.ts` | ~744 | `$gatewaySwapTarget.set(null)` no `finally` de `activateProfile` |
| `apps/desktop/src/sdk/index.ts` | 978 | `$gatewaySwapTarget.set(target)` no wake com `awaitHydration` |
| `apps/desktop/src/sdk/index.ts` | 1157 | limpeza no `finally` do wake |
| `apps/desktop/src/app/chat/index.tsx` | 829 | `ChatSwapOverlay profile={gatewaySwapTarget}` |
| `apps/desktop/src/app/chat/index.tsx` | 635 | `contextSwitching: Boolean(gatewaySwapTarget)` — é o que bloqueia o composer |

Como a limpeza está em `finally` nos dois caminhos, o overlay só sobrevive se o `await` que precede
**nunca** liquidar.

## Suspeito principal (próximo passo)

`activateProfile` (`store/profile.ts`) faz:

```ts
$gatewaySwapTarget.set(target)
gatewaySwitch = (async () => {
  const [connection] = await Promise.all([resolveConnectionForProfile(target), ensureGatewayForProfile(target)])
  ...
```

`ensureGatewayForProfile` → `HermesGateway.connect()`, que **não tem deadline de dial** (o próprio
comentário em `sdk/index.ts:500` diz isso). O único deadline existente é `awaitProfileActivation`,
aplicado **somente** no caminho do wake do sdk. Se a abertura do bot passar por
`ensureGatewayProfile` (store), um dial que aceita o socket e nunca completa o handshake deixa o
`await` pendente para sempre — e o `finally` nunca roda.

**Probe recomendado (próxima rodada):**

1. instrumentar `activateProfile` com `console.warn('[profile-activate] pending', { target, ms })`
   após 10 s sem liquidar;
2. aplicar o mesmo `awaitProfileActivation` de 20 s em `ensureGatewayForProfile` (com mensagem
   `Timed out loading <profile>'s session history.` para reusar a superfície de Retry);
3. reteste: o overlay deve sair em ≤20 s, com o botão Retry, e o composer voltar.

## Evidências

- `evidence/f5-session-messages.txt` — transcript real do turno
- `docs/b3po/F5-EVIDENCE-REPORT.md` §6–§8 — histórico do diagnóstico
- `evidence/f5-real-turn.png` — tela no momento do bloqueio
