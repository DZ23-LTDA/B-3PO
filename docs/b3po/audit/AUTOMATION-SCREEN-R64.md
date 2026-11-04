# Automações: IPC e tela validados (rodada 64)

## Medido no binário

```
ponte automations:  true
catalogo:           3 acoes executaveis · primeira inventory.append · 5 gatilhos
criacao:            total 1 · ativa true
recusa:             {"erro":"gatilho_invalido"}
titulo:             "Automacoes"
linha:              Repor ao vender R64 · Uma venda foi faturada -> inventory.append · Desativar
```

## O catálogo é o real, não uma lista paralela

`hermes:automations:tools` devolve as ferramentas do processo principal **filtradas por
`action !== 'read'`**. São 3, não as 7 do catálogo completo: consultar não muda nada e não deveria ser
oferecido como "ação de automação".

Uma lista escrita na UI envelheceria na primeira ferramenta nova e ofereceria ação inexistente.

## O que a tela avisa antes de salvar

*"A regra roda como o proprietário. Para mudar isso, use a tela de Agentes."*

Uma regra cujo ator não tem escopo para a ação falha em **toda** execução. Dizer isso na tela evita a
regra que parece configurada e nunca roda.

## Um erro meu, encontrado pelo teste de i18n

O `pt-coverage` acusou `settings.fieldLabels.updates.appName` como chave inventada. Era verdade: na
rodada 59 eu adicionei `appName` ao português **dentro do bloco errado** (`fieldLabels.updates`, com 4
espaços de indentação) em vez de `settings.updates` (2 espaços), onde o inglês o tem.

O português funcionava porque a chave existia em algum lugar — mas não era lida, e inventava estrutura.

## De novo o erro de rota que já cometi duas vezes

Nas rodadas 55 e 58 o `split` de `| 'painel'` atingiu só a primeira das duas listas (`AppView` e
`AppRouteId`). Nesta usei `split().join()` em vez de `replace()`, que troca **todas** as ocorrências, e
o typecheck passou de primeira.
