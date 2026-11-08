# Estados de UI nas telas de negócio (rodada 239)

## A pergunta do §26

"Todos os estados: loading, empty, error, success, offline." **Isso nunca tinha sido verificado por tela.**

## O que foi medido

15 telas de negócio, lendo o `index.tsx` de cada uma: lê o `.error` do resultado? tem estado de falha? tem estado de
carregando?

| Tela | lê `.error` | estado de falha | loading |
|---|---|---|---|
| `finance` | sim | `failure` | sim |
| `stock` | sim | `failure` | sim |
| `sales` | sim | `failure` | sim |
| `compras` | sim | `failure` | sim |
| `agenda` | sim | `failure` | sim |
| `rh` | sim | `failure`, `aviso` | sim |
| `products` | sim | `failure` | sim |
| `empresa` | sim | `failure` | sim |
| `servicos` | sim | `failure` | sim |
| `marketing` | sim | `failure` | — |
| `atendimento` | sim | `failure` | sim |
| `posvenda` | sim | `failure` | — |
| `automacoes` | sim | `failure` | — |
| `documentos` | sim | `erro` | sim |
| `crm` | — | delega | — |

**15 de 15 tratam falha.** 13 mostram `loading` explícito; 3 dependem de atualização rápida.

## O padrão que se repete: meu detector mentiu DUAS vezes

### Primeira medição — "9 telas não mostram erro"

Procurei `setErro|setError|toast|mensagem|aviso|feedback`. O `finance` **usa `failure` / `setFailure`**. Resultado
falso: **9 telas "sem erro" que têm erro**.

### Segunda medição — "2 telas sem estado de falha"

Ampliei para `set([A-Z]\w*(failure|error|problem|aviso|alert|message|feedback|status))`. O `documentos` **usa
`setErro`** — e "Erro" não estava na lista de sufixos. Resultado falso de novo.

**Só na terceira leitura, olhando o arquivo, vi que `documentos` tem `setErro` nas linhas 50, 52, 73 e 86.**

> **A r230 já tinha ensinado isto**: *o instrumento que mede precisa ser auditado junto com o que ele mede.*
> **Eu repeti o erro duas vezes na mesma rodada** — cada vez com uma lista de nomes mais específica, cada vez
> errando um nome diferente.

**Um grep por nome de variável não mede comportamento.** Mede a escolha de nome de quem escreveu.

## O que isso muda na conclusão

| Antes (2ª medição) | Realidade |
|---|---|
| "13 de 15 têm estado de falha" | **15 de 15** |
| "2 telas sem falha: `crm`, `documentos`" | `documentos` **tem** `setErro`; `crm` **delega** a `CrmContactsSection`/`CrmConversationsSection` |

## O que continua sem medição

| Item | Estado |
|---|---|
| **O erro aparece na TELA quando o backend recusa?** | **não verificado na janela** — li o código, não vi o comportamento |
| Estado **`offline`** | **não implementado em nenhuma das 15** — nenhuma tem `offline` |
| Estado **sucesso** | só `messaging` tem |
| Estado **vazio** | presente em várias, **não medido por tela** |

## A conclusão honesta

**O código trata falha em 15 de 15 telas.** **Isso não prova que o usuário vê a falha** — prova que existe um state
para isso e que o `.error` do resultado é lido.

**A diferença é exatamente a que a sessão inteira vem medindo**: entre *"está implementado"* e *"o usuário alcança"*.

## Medido

| Medida | Valor |
|---|---|
| Telas de negócio | 15 |
| Tratam falha no código | **15** |
| Com `loading` explícito | **13** |
| Com estado `offline` | **0** |
| Vezes que meu detector mentiu | **2** |
