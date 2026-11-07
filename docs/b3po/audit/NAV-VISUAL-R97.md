# Verificação visual do menu (rodada 97)

## O que o teste não provava

O teste da r96 prova que o plugin **contribui** com 18 itens. Não prova que a barra lateral **renderiza**.
Só a tela prova.

## Como foi verificado

App construído (`npm run build`) aberto com CDP (`--remote-debugging-port`), Home capturada, e o texto
visível lido via `Runtime.evaluate`.

## Resultado

`document.body.innerText` na Home, na ordem renderizada:

```
Nova conversa · Capacidades · Mensageria · CRM · Artefatos · Tarefas agendadas
Painel · CRM · Atendimento · Agenda · Produtos · Estoque · Compras · Vendas
Financeiro · Serviços · RH · Marketing · Pós-venda · Agentes · Automações
Documentos · Privacidade · Empresa
```

**Os 18 itens aparecem.** Captura: `docs/b3po-preview/evidencias-r97/home-menu.png`.

## O defeito que só a captura mostrou

A primeira captura revelou **Compras, Financeiro e Empresa sem ícone** — `cart`, `wallet` e `building`
não existem no conjunto de codicons.

Um nome de ícone inválido **não quebra nada**: o item renderiza desalinhado, sem erro no console, sem
teste falhando. O typecheck aceita, porque é uma string.

Corrigido para `cloud-download`, `pulse` e `library` — conferidos um a um contra
`node_modules/@vscode/codicons/dist/codicon.css`.

## O teste que impede a repetição

```ts
const css = await readFile('../../node_modules/@vscode/codicons/dist/codicon.css', 'utf8')
for (const item of contribuicoes()) {
  expect(css.includes('.codicon-' + item.data.codicon + ':before')).toBe(true)
}
```

Lê a folha de ícones de verdade em vez de confiar numa lista escrita de memória. Como a captura, ele não
prova aparência — prova que o nome existe.

**8 testes, 0 falhas.**

## A lição

Três camadas, três provas diferentes:

| Camada | O que prova | Falhou em |
|---|---|---|
| `routes.test.ts` | a rota resolve | r96 |
| `plugin.test.ts` | o menu contribui e o ícone existe | r97 (ícone) |
| **captura** | **o usuário vê** | — |

As duas primeiras passaram enquanto o menu não existia (r96) e enquanto três itens ficaram sem ícone (r97).
**Nenhum teste substitui olhar a tela.**
