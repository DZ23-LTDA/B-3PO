# As 22 telas não tinham menu — achado e conserto (rodada 96)

## O achado

O menu lateral **não** é montado a partir de `APP_ROUTES`. Ele é populado por contribuições na área
`SIDEBAR_NAV_AREA`, com `{ codicon, label, path }`.

Medido antes desta rodada, existiam **duas** dessas no código inteiro:

| Arquivo | Path |
|---|---|
| `plugins/kanban/plugin.tsx` | `/kanban` |
| `chat-sidebar.integration.test.tsx` (teste) | `/reports` |

**Nenhuma das 22 telas do produto tinha item de menu.** Elas resolviam por URL e mais nada.

## Por que nenhum teste pegou

`routes.test.ts` prova que **a rota resolve**. `surfaces.app-routes.test.tsx` prova que **toda rota tem
`<Route>`**. Nenhum dos dois prova que **alguém consegue chegar nela** — as duas pontas estavam testadas e
o meio não existia.

É a mesma família da r76 (CRM sem composição provada) e das r70/71/75 (declarar ausência sem seguir a
cadeia). Aqui a diferença é que a cadeia foi seguida até o fim: `SIDEBAR_NAV_AREA` → quem contribui →
o que o contribuinte fornece.

## O conserto

`src/plugins/b3po-nav/plugin.tsx` — um plugin que **não cria tela, rota nem dado**: registra 18 itens de
menu apontando para o que já existe.

Descoberto pelo glob de `plugins.ts:21` (`../plugins/*/plugin.{js,ts,tsx}`), ligado por padrão
(`defaultEnabled: true`): um menu que o usuário precisa ativar não é menu.

Ordem por operação, não alfabética: painel → CRM → atendimento → agenda → produtos → estoque → compras →
vendas → financeiro → serviços → RH → marketing → pós-venda → agentes → automações → documentos →
privacidade → empresa.

## O teste que faltava

`src/plugins/b3po-nav/plugin.test.ts` liga as duas pontas:

- **todo path do menu precisa existir em `APP_ROUTES`** — um menu apontando para path inexistente levaria a
  tela em branco;
- os 17 módulos do produto precisam estar no menu;
- cada item precisa de rótulo e ícone (um menu sem texto não é menu);
- nenhum path repetido.

**7 testes, 0 falhas.** Com rotas e app-routes: **31 testes**.

## O que muda para o usuário

Antes: as telas existiam e eram inalcançáveis pela interface. Depois: 18 itens no menu lateral.

## Limite desta verificação

O teste prova a **contribuição**. Não provou ainda que a barra lateral renderiza o item na tela construída —
isso exige abrir o app. A verificação visual continua pendente.
