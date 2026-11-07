# Dominio de documentos (rodada 73)

## O que existe agora

`documents-store.ts` (registro) + `documents-ipc.ts` (3 canais), montado em `erp-ipc.ts:70`.
21 testes, 0 falhas.

## Decisao de design que precisa estar escrita

**Este dominio guarda metadados, nao binarios.**

Guardar um PDF assinado em JSON sob `userData` transformaria um arquivo de 5 MB em ~7 MB de base64,
relido por inteiro a cada gravacao do dominio. O arquivo fica onde ja esta (anexo do atendimento, pasta
da empresa, exportacao do contador) e o registro aponta para ele.

Por isso `ref` e **obrigatorio**: registro sem origem nao serve para abrir nada. E `size_bytes` e o que
o arquivo declarou — se o arquivo sumir, o registro continua contando a historia, que e o proposito de
um registro.

## Duas recusas que evitam lixo

| Entrada | Resposta | Porque |
|---|---|---|
| sem `name` | `nome_obrigatorio` | nao ha o que listar |
| sem `ref` | `origem_obrigatoria` | nao ha o que abrir |
| `scope` != `outro` e `scope_id` vazio | `entidade_obrigatoria` | documento solto que ninguem relaciona depois |

## Totais nunca inventam

`documentTotals` devolve **todos** os 6 tipos, com 0 explicito para o que nao tem documento. Tipo
ausente da resposta seria indistinguivel de "nao carregou".

## O que NAO foi feito, e por que

- **Nao ha upload.** O binario nao passa por este dominio; ver a decisao acima.
- **Nao ha tela ainda.** O backend esta montado e testado; a tela vem na proxima rodada. Registrar
  isso aqui evita o padrao das rodadas 45/52/62: backend pronto e ninguem sabendo.
- **Nao reusa `attachment-rules.ts` ainda.** O comentario no store diz que MIME/tamanho viriam de la,
  mas o registro nao valida MIME — ele aceita documento de qualquer tipo. Quando a tela existir, a
  validacao de upload e que precisa das regras. O comentario foi corrigido para nao prometer o que o
  codigo nao faz.
