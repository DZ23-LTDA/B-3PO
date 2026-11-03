# DEFEITO — overlay "Acordando <perfil>…" (RETRATADO)

> **RETRATAÇÃO (rodada 34).** Este defeito **não existe**. A sonda de DOM mostra o overlay com
> `opacity: 0`, `aria-hidden="true"` e o composer visível e utilizável:
>
> ```
> className: "... z-50 flex items-center justify-center transition-opacity ... opacity-0"
> opacity: "0"   ariaHidden: "true"   composer visivel: true
> ```
>
> O texto `Acordando <perfil>…` permanece no DOM (o componente mantém o rótulo para não piscar no
> fade-out), então `document.body.innerText` **inclui** esse texto. Minha verificação automática
> usava `innerText` e por isso relatou "overlay presente" por três rodadas — um falso positivo do meu
> teste, não um defeito do app.
>
> O que de fato acontecia, medido corretamente: o turno roda, o bot responde, o overlay desaparece
> visualmente e o composer continua aceitando texto. O app estava funcionando.
>
> As seções abaixo ficam como registro do diagnóstico (hipóteses testadas e eliminadas). As duas
> correções de deadline que sobreviveram são endurecimento legítimo de `await`s sem limite — não
> consertos deste "defeito".

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

## Rodada 33 — duas hipóteses a mais eliminadas (com build novo e app real)

| Hipótese | Correção aplicada | Reteste no app | Veredito |
|---|---|---|---|
| `ensureGatewayForProfile` sem deadline de dial | `openProfileBackend()` com `BACKEND_BOOT_WAIT_TIMEOUT_MS` (180 s) em `store/profile.ts` | overlay continua | **eliminada** |
| `resumeTile` sem deadline | `resumeExistingTile()` em `sdk/wake-tile.ts`, orçamento de hidratação, 3 testes | overlay continua | **eliminada** |

Descoberta relevante no caminho: o `desktop.log` mostra `active key=revisor-codigo ... profile=revisor-codigo`
— a **ativação do perfil conclui**. Logo o overlay que fica não é o de `activateProfile`: é o do wake
(`sdk/index.ts` → `$gatewaySwapTarget`), cujo `finally` só roda quando a promise do wake liquida.

As duas correções ficaram no repositório porque são corretas por si (um dial e um resume de tile sem
deadline podem pendurar para sempre), mas **nenhuma delas era a causa**.

## O que falta (instrumentação, não palpite)

O próximo passo não é outro patch especulativo: é **instrumentar o wake** e ler o resultado.

1. Envolver cada await do wake com um marcador: `wakeStep('activation' | 'openSession' | 'tileResume'
   | 'requestResume' | 'waitHydration')` gravando `console.warn('[bot-wake] step', { step, ms })`
   quando o passo passar de 5 s.
2. Reproduzir no app e ler o **console do renderer** (CDP `page.on('console')`): o último passo
   registrado é o `await` culpado.
3. Corrigir esse await específico (deadline + superfície de Retry) e retestar com o mesmo roteiro.

Critério de aceite: overlay sai em ≤ 25 s e o composer aceita novo envio; sem erro quando o wake é
saudável.

## Estado do código nesta rodada

- `apps/desktop/src/store/profile.ts` — `openProfileBackend()` (dial com deadline de cold boot)
- `apps/desktop/src/sdk/wake-tile.ts` — `resumeExistingTile()` (tile resume com deadline) + `wake-tile.test.ts` (3 testes)
- Gate `python scripts/check`: 14 ok; `tsc` limpo; `2307` testes de store/sdk verdes

## Lição de verificação

Medir presença de UI por `innerText` do documento é falso positivo para qualquer elemento que use
transição de opacidade. O teste correto é o que passou a ser usado:

```js
const cs = getComputedStyle(overlay)   // opacity, visibility
overlay.getAttribute('aria-hidden')
```

Regra para os próximos roteiros de E2E nesta base: **visibilidade se mede por `getComputedStyle` +
`aria-hidden`**, nunca por varredura de texto.
