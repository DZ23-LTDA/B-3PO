# §19 — XSS NO RENDERER: 5 PONTOS, 5 DEFESAS

**Data**: 05/11/2026 · **Rodada 74** · fecha o §19

---

## O QUE FOI PROCURADO

```
dangerouslySetInnerHTML  ·  .innerHTML =  ·  outerHTML =
```

**72 ocorrências no renderer.** **67 são em testes** (que montam DOM para exercitar). **5 são de produção.**

---

## OS 5 PONTOS DE PRODUÇÃO — e a defesa de cada um

| # | Arquivo | O que renderiza | Defesa |
|---|---|---|---|
| 1 | `assistant-ui/embeds/svg-embed.tsx` | **SVG de fence de código do chat** | **`DOMPurify.sanitize`** com `USE_PROFILES: { svg: true }` |
| 2 | `chat/right-rail/preview-artifact.tsx` | **SVG do artifact** | **`DOMPurify`** — *"same profile as the inline svg embed"* |
| 3 | `components/chat/shiki-block.tsx` | **HTML do shiki** (syntax highlight) | **`escapeHtml`** antes de entrar no highlighter |
| 4 | `plugins/hermes-bots/avatar.tsx` | **SVG do blobatar** (rosto do bot) | **escape + `replacer`** |
| 5 | `assistant-ui/embeds/mermaid-embed.tsx` | **HTML do mermaid** | **shadow DOM, só para medir** |

### **0 pontos sem defesa.**

---

## O PONTO 4 — e o detalhe que o código documenta

```ts
// The name goes in as escaped text, through a replacer so `$&`-style patterns in it s[urvive]
return blobatarSvg(seed, opts).replace('<svg ', () => `<svg data-bot-face="...">`)
```

> **Dois cuidados em uma linha**:
> 1. O **nome é escapado** antes de virar texto do SVG.
> 2. A substituição usa um **replacer function**, não uma string — porque `String.replace` com `$&` **interpolaria o match** se o nome contivesse esse padrão.
>
> **É o tipo de bug que só se vê quando se usa `$&` num nome de bot.** E o comentário **explica por quê**.

## O PONTO 5 — e por que ele **não** é um risco

```ts
probe.innerHTML = html
host.attachShadow({ mode: 'open' }).append(probe)
document.body.append(host)
const { height, width } = probe.getBoundingClientRect()
```

> **O HTML entra num `<span>` dentro de um shadow root invisível, e o que sai é `getBoundingClientRect()`** — números.
>
> **Nada é pintado, nada é clicável, nenhum script dispara** (script em `innerHTML` **não executa** — só em `<script>` criado). O nó é removido depois.
>
> **É medição, não renderização** — e o comentário diz que é para medir a altura com o zoom do app.

---

## A AUDITORIA — o que ela encontrou

| Esperado | Encontrado |
|---|---|
| markdown cru no `dangerouslySetInnerHTML` | **nenhum** |
| `innerHTML` com dado de usuário direto | **nenhum** |
| sanitizador **em todos** | **DOMPurify** nos 2 de SVG externo |
| escape manual | nos 2 que geram HTML próprio |
| exceção documentada | **a medição do mermaid** |

> **O produto sanitiza onde o conteúdo vem de fora (SVG de fence/artifact) e escapa onde gera o próprio HTML** — que é exatamente a diferença certa.

---

## MEDIÇÕES

| Medida | Valor |
|---|---|
| Ocorrências no renderer | **72** |
| Em testes | **67** |
| **De produção** | **5** |
| **Sem defesa** | **0** |
| Linhas de código alteradas | **0** |

---

## O §19 — **FECHADO**

| Item | Estado |
|---|---|
| níveis (5) · RBAC · tenant · Sofia · não-promoção | ✅ |
| ações sensíveis (campanha, publicação, preço) | ✅ r66 |
| replay de webhook | ✅ r68 + r69 |
| rate limiting (3 canais de dinheiro) | ✅ r70–r72 |
| dependências | ✅ r73 (0 críticas, 0 em runtime) |
| **XSS no renderer** | ✅ **r74 (5 pontos, 5 defesas)** |

> **O §19 está auditado por inteiro.** E o resultado não é "está perfeito": é **"cada item foi medido, e onde não há defesa não há superfície"**.

---

## O QUE O §19 **NÃO** COBRIU — e está nomeado

| Item | Por quê |
|---|---|
| **CSRF** | o produto **não tem servidor HTTP com sessão de navegador** — o canal é IPC |
| **SSRF** | existe em `web_fetch`/proxy do agente — **fora do ERP** |
| **teste de tenant B** | a r211 mediu **código**; um teste de intrusão real **não foi feito** |
| **rate limiting nos outros 60 canais** | **deliberado**: posto onde o dano é dinheiro |

---

## PRÓXIMA RODADA

O §19 pede: *"**Tenant A nunca acessa ou infere dados do Tenant B.** Testar API, armazenamento, cache, filas, jobs, arquivos, memória e agentes."*

> Hoje a **garantia é estrutural** (server-tenant em 24 stores) — e **nunca foi atacada por um teste**.
>
> **A próxima rodada tenta violar**, em vez de verificar que a função existe.

> **74 rodadas.** O §19 está medido por inteiro — e a auditoria de XSS encontrou **5 pontos e 5 defesas**, incluindo uma que precisou de **replacer function** para um `$&` num nome de bot.
