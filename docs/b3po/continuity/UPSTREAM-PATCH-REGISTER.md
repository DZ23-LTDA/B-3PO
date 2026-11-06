# B-3PO — UPSTREAM PATCH REGISTER

**Regra**: `main` é espelho do upstream (`NousResearch/hermes-agent`) e **nunca recebe commit de
produto**. Toda alteração nossa vive em `b3po-brand`. Este arquivo registra o que é **nosso** para que
um futuro rebase saiba o que preservar.

---

## Patches de produto (nossos, vivem em `b3po-brand`)

| Área | Arquivo(s) | O que muda | Por quê |
|---|---|---|---|
| i18n pt-BR | `apps/desktop/src/i18n/{pt,en,de,es,fr,ja,zh,zh-hant_chrome,ar_chrome,types}.ts` | `gatewayNeedsProvider` nos 9 locales | aviso acionável no lugar de texto inglês (B1) |
| i18n pt-BR | `apps/desktop/src/i18n/*` (chrome) | `gatewayMenu` e `statusbar` completos | painel do gateway 100% em português |
| Bot Mode | `apps/desktop/src/plugins/hermes-bots/i18n.ts` | `bot` de 6 → 50 chaves | modal "Novo bot" em português (B2) |
| Bot Mode | `apps/desktop/src/plugins/hermes-bots/plugin.tsx` | `label: ctx.i18n.t('bot.newTitle')` | último rótulo hardcoded do plugin |
| Performance | `apps/desktop/src/app/settings/index.tsx` | 7 painéis `lazy` + `<Suspense>` | 55 → 4 long tasks |
| A11y | `apps/desktop/src/components/ui/sidebar.tsx` | `role="navigation"` + `aria-label` nas 3 variantes | landmarks ausentes |
| A11y | `apps/desktop/src/app/contrib/controller.tsx` | `<main>` em volta do pane do workspace | landmarks ausentes |

## O que NÃO toca upstream

- `docs/b3po/**` — documentação de auditoria, só nossa.
- `docs/b3po/continuity/**` — estado, gates, evidências.
- `docs/b3po/evidence/**` — capturas.

## Regra de rebase

1. `git fetch upstream`
2. `git rebase upstream/main` **em `b3po-brand`** — nunca em `main`
3. Conflitos esperados: `i18n/*.ts` (nossas chaves) e `sidebar.tsx` (nosso `role`)
4. **Nunca** force-push em `main`. `main` só recebe `git push upstream` do espelho.

## Estado do espelho

```
main          = f4cf411f28f90ab2cb0a8ffd7427a64bde386fbb
origin/main   = f4cf411f28f90ab2cb0a8ffd7427a64bde386fbb
b3po-brand    = 9f662fc67c  (+ commits de produto, adiante do main)
```

**Verificado**: `main` == `origin/main` — espelho intacto, sem commit de produto.
