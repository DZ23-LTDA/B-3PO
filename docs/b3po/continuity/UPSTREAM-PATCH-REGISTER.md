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


| **Estoque** | `apps/desktop/src/app/stock/stock-form.ts` | `StockRow.orfao` + `stockRows` inclui SKU de `balances` fora do catálogo (r48) | a tela dizia "0 produtos" com 6 movimentações; escondia o estado real |
| **Estoque** | `apps/desktop/src/app/stock/index.tsx` | linha do órfão marcada "não cadastrado — só tem movimentação" (r48) | mesma causa; a marca é o que dá nome ao estado |
| **A11y** | `apps/desktop/src/components/ui/tooltip.tsx` | `filhoSoIcone` desce a árvore (`temTexto`) em vez de só olhar string (r53) | injetava `aria-label` sobre botão com texto → `label-content-name-mismatch` (WCAG 2.5.3) |
| **Layout** | `apps/desktop/src/app/contrib/controller.tsx` | `<main>` ganhou `h-full` (r41) | `flex-1` não define altura em pai `block`; conteúdo 182 px acima em 30 rotas |
| **Vendas** | `apps/desktop/electron/sales-ipc.ts` | `recusaPorEstoque` separa `produto_nao_encontrado` de `saldo_insuficiente` (r23) | SKU fora do catálogo dava mensagem de saldo, que é outra coisa |
| **a11y web** | `web/src/components/{ThemeSwitcher,LanguageSwitcher}.tsx`, `web/src/pages/SessionsPage.tsx` | `aria-label` passa a conter o texto visível (r39) | 4 `label-content-name-mismatch`; o web não compartilha código com o desktop |

| **Tema** | `apps/desktop/src/main.tsx` | aplica `class="dark"` + `color-scheme` antes do React montar, lendo `hermes-boot-color-scheme` (r73) | o `ThemeProvider` so aplica no mount; entre a pintura do `styles.css` e o mount o app piscava o tema claro (FOUC). Medido com `axe`: 4 nos de `color-contrast` na home como primeira rota |
| **A11y** | `apps/desktop/src/components/ui/tooltip.tsx` | `filhoSoIcone` desce a árvore (`temTexto`) em vez de só olhar string (r53) | injetava `aria-label` sobre botão com texto → `label-content-name-mismatch` |
| **Estoque** | `apps/desktop/src/app/stock/stock-form.ts` | `StockRow.orfao` + `stockRows` inclui SKU de `balances` fora do catálogo (r48) | a tela dizia "0 produtos" com 6 movimentações |
| **Estoque** | `apps/desktop/src/app/stock/index.tsx` | linha do órfão marcada "não cadastrado — só tem movimentação" (r48) | mesma causa |
| **Layout** | `apps/desktop/src/app/contrib/controller.tsx` | `<main>` ganhou `h-full` (r41) | `flex-1` não define altura em pai `block`; 182 px errado em 30 rotas |
| **Vendas** | `apps/desktop/electron/sales-ipc.ts` | `recusaPorEstoque` separa `produto_nao_encontrado` de `saldo_insuficiente` (r23) | SKU fora do catálogo dava mensagem de saldo |
| **a11y web** | `web/src/components/{ThemeSwitcher,LanguageSwitcher}.tsx`, `web/src/pages/SessionsPage.tsx` | `aria-label` contém o texto visível (r39) | 4 `label-content-name-mismatch`; o web não compartilha o tooltip do desktop |

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

---

## 14. Patch de fornecedor: `@nous-research/ui` — `Select` descartava `aria-label`

**Rodada 99.** Decisão do dono #2: *"Primeiro investigue a API pública do Select; se insuficiente,
implemente um patch mínimo, versionado e testado, preservando compatibilidade upstream."*

### A API pública é insuficiente — medido

```js
function Select({ children, className, disabled, id, onValueChange, placeholder, style, value }) {
```

**Destructuring de props fixas, sem `...rest`.** Um `aria-label` passado de fora é silenciosamente
descartado. E o componente usa `role="combobox"`, que **não herda nome do conteúdo** (ARIA) — então o
botão fica sem nome acessível e o `axe` reporta `button-name` **critical**.

**A prova de que a intenção já existia e era ignorada**: `ChatWorkspacePicker.tsx` **já passava**
`aria-label={t.sessions.workspace}` e o botão continuava sem nome.

### O patch

| Arquivo | Mudança |
|---|---|
| `dist/ui/components/select.js` | `value` → `value, ...rest` no destructuring; `...rest` no `<button role="combobox">` |
| `dist/ui/components/select.d.ts` | `'aria-label'?` e `'aria-labelledby'?` opcionais |
| `src/ui/components/select.tsx` | o mesmo, para quem reconstruir o pacote |

**É aditivo**: quem não passa essas props vê exatamente o comportamento de antes — por isso o patch
pode ser removido quando o upstream publicar a correção, sem migração.

### Como é versionado e reaplicado

- `web/scripts/vendor-patches/nous-research-ui-select.mjs` — **idempotente**, e **falha alto** se a
  âncora não casar exatamente uma vez (um patch que não acha o alvo tem de gritar, não passar em
  silêncio);
- `web/package.json` → `"postinstall": "node scripts/vendor-patches/nous-research-ui-select.mjs"`;
- **sem dependência nova**: `patch-package` não está no projeto e instalá-lo exigiria rede.

### Como é testado

`web/src/components/vendor-select-patch.test.tsx` — **3 testes**:
`aria-label` chega ao `combobox` · `aria-labelledby` chega · **sem as props o comportamento do
upstream não muda**.

**Este teste é a garantia de que o patch continua aplicado**: se um `npm install` limpar
`node_modules` e o `postinstall` não rodar, é ali que quebra — não no `axe` de produção.

### Resultado

```
WEB · 15 rotas · 0 violações de axe
comboboxes com nome acessível: 15
testes do web: 478 (475 + 3 do patch)
```

E o `NamedSelect` que eu tinha criado na r98 como contorno **foi removido**: com o patch, o `<Select>`
cru já entrega o nome, e manter um wrapper por cima seria complexidade sem consumidor.
