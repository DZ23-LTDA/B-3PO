# Validação no binário — /agentes (rodada 49)

## O ciclo, medido

| Etapa | Resultado |
|---|---|
| Tela monta | título **"Agentes"** |
| Aviso de escopo vazio | *"Sem escopo o agente não enxerga ferramenta nenhuma."* |
| Criação pelo formulário | `Agente R49 · agente · Executa · inventory` + botão Desativar |
| Desativação | `Agente R49 · inativo · agente · Executa · inventory`, sem botão |
| Quem sou eu | `Você é: Proprietário (Autonomia supervisionada)` |

A criação foi feita **pelo formulário** (preenche input, marca chip, clica), não pelo IPC: é o que
valida o `onClick` e o envio de escopos, que um teste de IPC não alcança.

## Um bug real que só o binário mostrou

A primeira execução exibiu `Você é: (Autonomia supervisionada)` — **sem nome**.

Causa: no `erp-ipc`, o `actorOf` montava o objeto do ator campo por campo e eu **esqueci o `name`**.
O tipo `Actor` não declara `name`, então o `tsc` aceitou; o renderer lia `undefined` e imprimia vazio.

Corrigido em dois lugares: o objeto passa a incluir `name`, e o retorno de `whoami` declara
`Actor & { name?: string }` para a tela não precisar de conversão.

## Dois erros meus no roteiro de validação

1. **Seletor errado.** `document.querySelector('input')` pegou o **campo de busca de conversas da
   sidebar**, não o campo Nome. A tela parecia recusar a criação ("Informe o nome.") quando o
   problema era o script digitar no lugar errado.
2. **Backtick em comentário via PowerShell.** Duas linhas foram corrompidas por escape de shell e
   quebraram o `tsc`; corrigi com editor e script Node. É a quarta vez nesta série — a regra já
   deveria estar sendo seguida sem exceção.

## O que não cobre

- Não testei criar agente com nível acima do próprio (o backend recusa, mas a tela não foi exercitada
  nesse caminho).
- Não confirmei no binário que desativar remove a credencial de MCP no boot seguinte; isso é
  consequência de `agentesComAcesso` filtrar por `active`, coberto por teste unitário da rodada 44.
