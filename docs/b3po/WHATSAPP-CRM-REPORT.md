# WHATSAPP-CRM-REPORT

## Rodada 50 — caixa de entrada (GOAL 14.1)

Faltava a inbox: havia consentimento, webhook, contatos e funil, mas nenhuma forma de operar as
conversas. Criado `crm/src/inbox.ts` (13 testes) com as decisões que a tela precisa respeitar:

| Regra | Por quê |
|---|---|
| **não lida** = mensagem do cliente depois da última leitura | um flag manual mente com o tempo |
| **aguardando** = tempo desde a última mensagem recebida **sem resposta** | conversa já respondida não "aguarda" |
| resolvida não conta espera, mesmo antiga | senão o painel vive cheio de falso urgente |
| resolver **exige motivo** (≥3 caracteres) | fechar sem dizer o que foi feito perde informação |
| ordem padrão = mais tempo esperando → não lidas → atividade recente | ordem alfabética esconde o cliente irritado |
| etiquetas ordenadas, sem duplicar; atribuir vazio limpa o responsável | previsibilidade |
| `inboxRows()` monta rótulo de acessibilidade completo | leitor de tela anuncia estado, espera e responsável |

Filtros cobertos: busca (nome, telefone, última mensagem), status, não lidas, prioridade, etiquetas
(todas as pedidas) e responsável (incluindo "sem responsável").

### Erros meus nesta rodada

Três testes falharam porque **eu** tinha expectativa errada, não o código: eu criava a conversa com
`readAt = now` e mandava mensagem no mesmo instante, esperando que fosse "não lida". Não é — leitura
posterior ou igual à mensagem marca como lida. Corrigi os testes para criar a conversa com leitura
anterior, e deixei o comentário explicando a semântica.

**52 testes** no CRM (37 anteriores + 15 novos), `tsc --noEmit` limpo.

## Rodada 51 — tarefas e Kanban (GOAL 19)

`crm/src/tasks.ts` com **20 testes**. O módulo existe porque o `pendingTasks` do dashboard era `null`
por falta de fonte — agora há fonte real.

| Regra | Por quê |
|---|---|
| dependência aberta **impede** concluir (devolve `dependency_open`) | concluir por cima de bloqueio esconde trabalho não feito |
| pai não conclui com subtarefa aberta (`children_open`) | idem, no nível da hierarquia |
| histórico append-only com autor, de/para e quando | sem isso não há auditoria de quem mudou o quê |
| concluída **nunca** é atrasada, mesmo com prazo no passado | atraso é sinal de trabalho pendente |
| qualquer tarefa **com** prazo vem antes de tarefa sem prazo; urgência desempata prazo igual | o que tem data manda |
| subtarefa não vira card solto no Kanban | senão o quadro conta duas vezes |
| mover para coluna inexistente é erro | no-op silencioso faz a tela mentir |

Também: `assignTask` / `setPriority` registram no histórico, `pendingTaskCount` alimenta o dashboard,
e `taskSummary` monta o rótulo de acessibilidade do card.

### Erros meus nesta rodada

Dois testes falharam por expectativa **minha** errada, não por bug:

1. passei a mesma tarefa duas vezes (uma delas modificada, mesmo `id`) e esperei três cards;
2. esperei que tarefa sem prazo e urgente passasse na frente de tarefa com prazo — a regra real (e
   correta) é: com prazo primeiro, urgência só desempata prazo igual. Corrigi a expectativa e
   acrescentei um caso de desempate.

**86 testes** no CRM, `tsc --noEmit` limpo.

## Rodada 52 — motor de automações (GOAL 14.5)

`crm/src/automation.ts` com **16 testes**. O motor **não executa** nada: decide quais ações devem
acontecer, com que chave de idempotência, e o que foi recusado. A execução real (enviar template,
chamar bot, atualizar CRM) fica em outro módulo — por isso as regras de segurança são prováveis sem
tocar em serviço externo.

| Regra | Por quê |
|---|---|
| idempotência por `(evento, regra)` | webhook repete e cliente faz retry; ação duplicada manda mensagem duas vezes |
| deduplicação por `(regra, contato)` numa janela | rajada do mesmo assunto não vira enxurrada |
| limite de encadeamento (`depth` × `maxDepth`) | automação que dispara evento não entra em laço infinito |
| teto de ações por evento | regra não pode explodir em 20 ações de uma vez |
| pausada ≠ desligada | suspender sem apagar, e o motivo aparece na auditoria |
| ação sensível sai marcada `needsApproval` | `send_template`, `call_bot`, `update_crm` nunca viram envio silencioso |
| auditoria de tudo, inclusive recusa | responde "por que a automação não rodou" |
| estado imutável | cada execução devolve estado novo; nada de mutação escondida |

Também nesta rodada: teste de composição provando que `tasks` → `dashboard` fecha o `pendingTasks`
que antes era `null` (tarefa aberta conta, concluída não).

### Erro meu nesta rodada

Deixei no teste de composição uma linha sem sentido (`metrics.isNew(...)`, método que não existe) e só
percebi ao rodar. Removi. O hábito que pegou isso foi rodar a suíte inteira a cada mudança, não só o
arquivo novo.

**103 testes** no CRM, `tsc --noEmit` limpo.

## Rodada 53 — contatos em lote: importação, duplicidade, CSV e segmentação (GOAL 14.2)

`crm/src/contacts-bulk.ts` com **19 testes**. Separado de `contacts.ts` de propósito: aquele define o
contato e o telefone; este cuida do trabalho em lote — onde dado se perde calado.

| Regra | Por quê |
|---|---|
| importação **idempotente** (chave = telefone normalizado) | reimportar a mesma planilha não duplica contato |
| linha inválida volta em `skipped` com motivo | um CPF/telefone errado não pode derrubar o lote inteiro |
| campo vazio da planilha **não apaga** o que existe | importar coluna faltando não destrói cadastro |
| duplicidade é **detectada, não apagada** | mesclar é decisão humana; apagar por heurística não se perdoa |
| duplicidade por telefone, e-mail ou nome+empresa | três sinais reais, não só um |
| CSV escapa vírgula, aspas e quebra de linha | exportar "ACME, Ltda" sem escape quebra a planilha de quem abre |
| exportação determinística (nome, depois telefone) | dois exports iguais geram o mesmo arquivo |
| segmento é filtro declarado (etiquetas E, empresa, origem, consentimento, bloqueio, busca) | nada de "todos menos os que eu não gosto" |

### Nota de implementação

Ao ligar o módulo no `createContact` real descobri que ele **não aceita `id` nem `customFields`** — o
`id` é gerado e `customFields` não está no input. Ajustei o importador para criar pelo contrato real e
compor o `id`/campos extras depois, em vez de forçar uma assinatura que não existe.

**122 testes** no CRM, `tsc --noEmit` limpo.

### Correção obrigatória no mesmo dia (gate de saúde)

O commit `c30d1f35` entrou com o gate **falhando** em `health`: `importContacts` com complexidade 28 e
`segmentContacts` com 21, contra o teto de 20 para código novo.

Dividi em funções de uma responsabilidade: `patchFromRow` (o que a planilha pode atualizar),
`createFromRow` (criação pelo contrato real) e, no segmento, `matchesTags` / `matchesScalar` /
`matchesConsent` / `matchesSearch`. Comportamento idêntico — os 19 testes continuam verdes — e o gate
voltou a **14 checks ok**.

**Terceira vez que commitei com o gate vermelho nesta execução.** O erro não é técnico, é de processo:
o comando certo é `python scripts/check` **antes** do `git commit`, não depois. Registro aqui porque
relatório que esconde o próprio descuido não serve para nada.
