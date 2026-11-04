# Fluxo fiscal verificado na tela real (rodada 106)

## Por que esta rodada existe

A r105 entregou os botões **sem abrir o app** — e eu tinha acabado de quebrar o `useEffect` da tela de
vendas (as funções caíram dentro do corpo do efeito). O typecheck pegou, mas typecheck não prova que a tela
funciona.

## Método

O script prepara uma venda **faturada** no `userData` antes de abrir o app. Sem isso a tela mostra
"nenhuma venda" e o botão não tem onde aparecer — a primeira tentativa fez exatamente isso e não provou nada.

Depois: abre com CDP, navega para Vendas, clica em "Emitir nota", lê o resultado.

## Resultado — o ciclo completo

| Momento | O que a tela mostrou |
|---|---|
| antes do clique | `#1 · faturada · 1 item · R$ 50,00` + botão **Emitir nota** |
| após o clique | **Emitir nota** + **Imprimir nota** |
| erros de console | **nenhum** |

> "Imprimir nota" **só aparece com nota autorizada e `url_danfe`**. Então o clique emitiu, o registro foi
> gravado e a tela releu. **Não é o botão existindo: é o fluxo.**

Captura: `docs/b3po-preview/evidencias-r106/vendas-emitida.png`

## Três tentativas até funcionar

1. **`telas-r106.mjs` capturou a tela vazia** — sem venda faturada não há botão. Provou que a tela não
   quebrou, não que o botão aparece.

2. **O replace multi-linha não aplicou** (CRLF, de novo). O output saiu **idêntico** ao anterior. Se eu não
   tivesse comparado, teria registrado como "clicou" um script que **nunca clicou**.

3. **Escrevi o script de emissão do zero**, sem replace. Funcionou no primeiro.

> **A lição da tentativa 2:** o resultado era idêntico ao anterior e eu quase não notei. **Um script que não
> muda o que faz continua produzindo output plausível.** Comparar com a execução anterior é o que revela.

## O que continua faltando

| Item | Estado |
|---|---|
| Cancelar pela tela | canal existe; falta o botão |
| Adapter real do emissor | `BLOCKED_BY_EXTERNAL_DEPENDENCY` (credencial) |
| Tool de agente `fiscal.emitir` | pendente |
| Emissão real | sem credencial não há homologação |
