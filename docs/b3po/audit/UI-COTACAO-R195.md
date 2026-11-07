# Cotação na tela real (rodada 195)

## O que esta rodada fez

A r194 montou o painel e cobriu com 132 testes. **Nenhuma pessoa e nenhuma captura tinham visto o painel
com dado dentro.** Esta rodada abriu a janela de verdade e fotografou.

## O primeiro resultado: o painel NÃO estava na tela

```
"painel_existe": false
"erro": "painel de cotacao nao encontrado na tela"
```

**A causa não era o código.** O Electron roda o bundle de `apps/desktop/dist/`. O painel foi escrito em
`src/` e **nunca foi buildado** — a r194 commitou código que o artefato em execução não continha.

**Lição:** um teste em vitest prova que o componente renderiza **em teste**. Ele **não** prova que a
aplicação em execução o carrega. São dois artefatos diferentes.

## O segundo resultado, depois do build

```
"total_secoes": 3        (eram 2)
"h2": "Comparar fornecedores"
"painel_existe": true
"botao_comparar": true
```

O painel está montado e alcançável por `#/compras`.

## O defeito que a captura achou

Com duas propostas adicionadas e o botão **Comparar fornecedores** clicado, a tela dizia:

> **"Melhor oferta"**

**Não havia oferta.** A quantidade do pedido estava vazia, a comparação devolveu `sem_proposta_valida`, e o
painel usava `copy.result` — que é o rótulo **"Melhor oferta"** — para o caso de **recusa**.

**Era um botão que mentia.** Violava o §26 do GOAL: *"Não apresentar módulos falsos. Todo botão deve
executar uma ação real."*

### A correção

Três mensagens distintas, porque são três ações distintas:

| Motivo | O que a tela diz | O que o usuário faz |
|---|---|---|
| `sem_cotacoes` | "Nenhum pedido de compra ainda." | adicionar propostas |
| quantidade = 0 | **"Informe a quantidade do pedido para comparar."** | digitar o volume |
| `sem_proposta_valida` | **"Nenhuma proposta atende a quantidade pedida."** | trazer proposta que atenda o volume |

E um **campo de volume próprio** no painel, porque depender do formulário de pedido fazia o botão parecer
quebrado quando o pedido ainda não tinha quantidade.

## O que a captura final mostra — e o que ela NÃO mostra

**Mostra, e está correto:**
- o painel renderiza em `#/compras`, com `h2`, `select`, campos e dois botões
- os fornecedores cadastrados aparecem na lista
- uma proposta foi adicionada e aparece na lista
- **a mensagem de recusa agora é honesta**: *"Nenhuma proposta atende a quantidade pedida."*

**Não mostra, e eu não vou afirmar:**
- **uma comparação bem-sucedida com a economia exibida** — não consegui capturar
- **o layout está errado**: os campos aparecem empilhados na vertical, sem os rótulos visíveis, e "Adicionar
  item" aparece como texto solto em vez de botão. O `Input` do design system ocupa a linha inteira e quebra
  o `flex-wrap`
- **os valores digitados não chegaram como esperado**: a linha mostra "Atacado Beta · 10.00 × 10" quando o
  script digitou 12,00. Pode ser timing do meu script ou um defeito do painel — **não sei qual**, e não vou
  escolher o lado que me favorece

## O que ficou provado

| Afirmação | Evidência |
|---|---|
| O painel está montado e alcançável | captura + `total_secoes: 3` |
| O botão não mente sobre recusa | captura + 3 mensagens distintas |
| O campo de volume existe | `volume_input_existe: true` |
| 123 testes passam em compras + i18n | vitest |
| Typecheck limpo nos 2 projetos | `check-b3po-types` |
| Gate de 14 checks | `scripts/check` |

## O que NÃO está provado

| Afirmação | Estado |
|---|---|
| Comparação bem-sucedida exibida na tela | **NÃO CAPTURADA** |
| Layout do painel apresentável | **ERRADO** — empilhado, rótulos ausentes |
| Valores digitados chegam corretos | **INCONSISTENTE** — causa não determinada |
| Um humano usando | **não** |

## Evidências

```
docs/b3po/audit/evidencias/tela-cotacao-r195.png
docs/b3po/audit/evidencias/cotacao-r195.json
docs/b3po-preview/ui-cotacao-r195.mjs        (fluxo)
docs/b3po-preview/ui-cotacao-diag-r195.mjs   (diagnostico)
docs/b3po-preview/ui-cotacao-final-r195.mjs  (captura final)
```

## Medido

| Medida | Valor |
|---|---|
| Seções na tela de compras | 2 → **3** |
| Defeitos de produto achados pela captura | **1** (botão dizia "Melhor oferta" sem oferta) |
| Defeitos corrigidos | **1** |
| Capturas que eu declarei sucesso antes de ver | **0** |
| Causa do "painel ausente" | **bundle não buildado** — não era o código |
