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
