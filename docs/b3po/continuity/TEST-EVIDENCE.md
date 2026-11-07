# B-3PO — TEST EVIDENCE

**Regra**: cada linha tem o comando, a saída e a data. O que não foi exercitado fica `NOT_TESTED`.
**Atualizado**: 06/11/2026 · **HEAD**: `673cd7f5af`

---

## E2E · Jornada de Compras (B4 do aditivo V3) — **PASSOU**

**Ferramenta**: Playwright sobre o Electron real (`dev:fake-boot`, CDP 9333), chamando o bridge
`hermesDesktop.purchases` — o MESMO que a tela usa. Nada de mock.

### Passo a passo, com saída real

| # | Etapa | Chamada | Resultado medido |
|---|---|---|---|
| 1 | **Solicitação** | `purchases.solicitar({motivo, product_sku, quantity_milli})` | `sol-673cd7f5af-b694-4ed2-b3b0-5bd8051fc5d4` · status `aberta` |
| 2 | **Fornecedor** | `purchases.saveSupplier({name, cnpj})` | `sup_1793997200272_u3nue2` · `active: true` |
| 3 | **Pedido** (da solicitação) | `purchases.atenderSolicitacao({id, supplier_id, unit_cost_cents})` | `po_1793997200286_p36vp8` · `status: rascunho` · `total_cents: 15000` |
| 4 | **Aprovação** | `purchases.aprovar({pedido_id})` | `{"error":"compra_nao_precisa"}` — **correto**: sem limite definido, não há aprovação a pedir |
| 5 | **Recebimento** | `purchases.receive({items:[…], supplier_id})` | `conferencia.semConferencia: true` · pedido novo com `status: "recebido"` |
| 6 | **Estoque** | `inventory.balances()` | **`{"balances":{"E2E-001":3000}}`** — 3.000 unidades entraram |
| 7 | **Financeiro** | veio dentro do `receive` | **`{amount_cents:15000, kind:"pagar", currency:"BRL", id:"fin_1793997249492_py51y9"}`** — conta a pagar de R$ 150,00 |

**As sete etapas do aditivo V3 existem e funcionam.** A UI dizia *"Receber um pedido coloca a
mercadoria no estoque"* — **é verdade, e está medido**.

### O que o código já sabia

`api/purchases.ts` documenta a armadilha que quase todo sistema de compras tem:

> *"zero não gera conta a pagar, então a compra existiria no estoque e não no financeiro"*
> (`atenderSolicitacao`, r49)

E resolve: o custo unitário é obrigatório na passagem para recebido. **É por isso que o
`finance` apareceu com 15000 e não com 0.**

---

## Auditoria dos seis modos (B3) — ver `AUDIT-MATRIX.md`

| Aspecto | Estado | Números |
|---|---|---|
| Persistência | **READY** | `engenharia` sobrevive ao reload |
| Foco | **READY** | `outline: solid 2px rgb(0,83,253)`, `:focus-visible` |
| Rolagem | **READY** | Empresa: 1215 de conteúdo em 937 visíveis |
| Rotas | **READY** | 27 itens clicados, 27 navegaram |
| RBAC | **PARCIAL** | filtra (27 vs 10), mas 5 de 6 modos sem item exclusivo |

---

## Gate e tipos (esta rodada)

| Comando | Saída |
|---|---|
| `python scripts/check` | **14 checks, ok** |
| `python scripts/check-b3po-types` | **0 erros** |
| `npm run build` | **exit 0** |

---

## NOT_TESTED (não foi exercitado — não é PASS)

| Item | Por quê | O que falta |
|---|---|---|
| Cotação com **dois fornecedores** e vencedor por SKU | o teste usou um fornecedor só | semear catálogo + 2 propostas |
| **Aprovação com limite** definido | o limite está `sem limite`, então `compra_nao_precisa` | definir limite + aprovador, refazer |
| Recebimento com **divergência de conferência** | `semConferencia: true` | enviar quantidade diferente da pedida |
| **Estorno** de compra recebida | não existe caminho exercitado | verificar se há e testar |
| Jornada **pela UI** (clique a clique) | exercitei o bridge, que é o que a UI chama | teste de clique completo |
| Financeiro em **tela própria** | `hermesDesktop.finance.payables` não existe como bridge | o dado VIVE no `receive`; conferir a tela |

---

## E2E · Vendas (B5 do aditivo V3) — **PASSOU com ressalvas**

**Mesmo método**: bridge `hermesDesktop.sales` no Electron real. Estoque herdado do E2E de compras
(3.000 unidades de `E2E-001`).

### A promessa da tela, verificada

A UI diz: *"Faturar dá baixa no estoque e lança a conta a receber."* **É verdade:**

```
estoqueAntes:  {"E2E-001": 3000}
faturar:       finance { amount_cents: 8000, kind: "receber", currency: "BRL",
                         id: "fin_1793997336388_oemw5w", status: "aberto" }
estoqueDepois: {"E2E-001": 2000}          ← baixou 1000
```

### Máquina de estados

| Operação | Status resultante |
|---|---|
| `sales.create(payload)` | **`orcamento`** |
| `sales.faturar(payload)` | **`faturado`** |
| `sales.cancel(id, motivo)` | **`cancelado`** |

**A venda cancelada NÃO baixou o estoque** — o saldo final foi 1000, compatível com as duas vendas
faturadas (1000 + 1000) e a cancelada (500) intocada. **É o comportamento correto.**

### Casos de borda — o que passou e o que NÃO passou

| Caso | Chamada | Resultado | Veredito |
|---|---|---|---|
| **Estoque insuficiente** | 9.999 unidades com 2.000 em saldo | `{"error":"saldo_insuficiente","message":"E2E-001"}` · **estoque permaneceu 2000** | **PASSOU** — rejeita e não corrompe |
| **SKU inexistente** | `product_sku: "NAO-EXISTE-999"` | `{"error":"saldo_insuficiente","message":"NAO-EXISTE-999"}` | **FALHOU** — o produto não existe, mas a mensagem culpa o saldo |
| **Preço zero** | `unit_price_cents: 0` | venda criada com `total_cents: 0`, **`finance: null`** | **FALHOU** — vende de graça e não lança nada no financeiro |

### O que isso significa, sem maquiar

- **O controle crítico está certo**: sem saldo, não fatura, e o estoque não é tocado. É o erro que
  mais dói num sistema de venda, e ele está coberto.
- **A mensagem do SKU inexistente é enganosa.** Quem lê "saldo insuficiente" para um produto que
  não existe vai procurar estoque em vez de cadastro. **É um bug de mensagem, não de controle.**
- **Preço zero é aceito.** Pode ser intencional (brinde, bonificação), mas **não há nada que diga
  isso ao operador** — e o financeiro fica sem registro. Precisa de decisão de produto: bloquear,
  ou marcar explicitamente como cortesia.

**Nenhuma dessas duas falhas foi corrigida nesta rodada** — a primeira exige saber o vocabulário de
erro que o backend usa para "produto não encontrado"; a segunda é decisão de negócio. Ficam
registradas como dívida com nome, não como "tudo certo".

---

## E2E · Sofia — plano persistido e execução verificável (B6) — **PASSOU**

**O critério mais difícil da lista**: provar que o plano **executou**, não que foi escrito.

### O contrato que existe

`api/sofia.ts` declara um modelo completo, com `SofiaTarefaRow` carregando `depende_de`,
`execucao_id`, `resultado` e seis estados (`bloqueada · concluida · executando · falhou · pendente ·
pronta`), e `PlanoComGrafo` com `grafo.valido`, `ciclos`, `dependencias_orfas` e `prontas`.

### O que foi medido

| # | Operação | Resultado |
|---|---|---|
| 1 | `sofia.criar({objetivo, escopo, tarefas:[t1, t2(depende_de:["t1"])]})` | `plano-mw5fr310-6ibo` · `status: rascunho` |
| 2 | `sofia.planos()` | o plano aparece — **persistiu** |
| 3 | **`sofia.aprovar`** | **`{"error":"autoaprovacao"}`** — o criador não aprova o próprio plano |
| 4 | `sofia.tarefa({plano_id, tarefa_id:'t1', patch:{status:'concluida', execucao_id:'exec-e2e-001', resultado:{feito:true, prova:'r282'}}})` | `t1` concluída · **`execucao_id` e `resultado` gravados** |
| 5 | ler de novo | **`prontas: ["t2"]`** — o grafo **recalculou** a dependência |
| 6 | concluir `t2` | `exec-e2e-002` |
| 7 | `sofia.status({status:'concluido'})` | plano `concluido` |
| 8 | **reload da janela** | **idêntico**: mesmo `plano_id`, mesmo status, mesmas execuções, visível na tela |

```
ANTES:  plano-mw5fr310-6ibo · concluido · t1:concluida:exec-e2e-001 · t2:concluida:exec-e2e-002
DEPOIS: plano-mw5fr310-6ibo · concluido · t1:concluida:exec-e2e-001 · t2:concluida:exec-e2e-002
```

**A execução é verificável de fora**: cada tarefa carrega o `execucao_id` que a executou e o
`resultado` que produziu. Não é um log de intenção — é o registro do que aconteceu.

### A governança que não é decorativa

`sofia-ipc.ts:131` diz, no código:

> *"o ator vem do resolvedor, nunca do payload. Se este canal deixasse o renderer mandar o nome do
> aprovador, a recusa seria decorativa: bastaria escrever o nome de outra pessoa."*

**Medido**: `aprovar` devolveu `autoaprovacao`. **A regra vale de fato.**

### Por que a primeira tentativa não funcionou

Chamei `sofia.tarefa({..., status, resultado})` e **nada mudou**. O contrato real é
`{ plano_id, tarefa_id, patch }` — o status vai dentro de `patch` (`sofia-ipc.ts:114`). **O canal
aceitou a chamada e ignorou os campos**: não houve erro, o plano ficou intacto. Isso é silencioso
por design (patch é opaco), e vale registrar como armadilha para quem for integrar.

### O que NÃO foi testado

| Item | Por quê |
|---|---|
| **Execução automática** por um agente | o `execucao_id` foi **fornecido por mim**, não por um executor real. A Sofia registra a execução; ela não a dispara neste teste |
| Plano com **ciclo** (`grafo.ciclos`) | precisaria de tarefas que se dependem mutuamente |
| **Dependência órfã** (`dependencias_orfas`) | precisaria de `depende_de` apontando para id inexistente |
| `escopo: 'projeto'` e `'trabalho_pontual'` | testei só `organizacao` |
| Aprovação por **outro ator** | o HOME tem um ator só; `autoaprovacao` é justamente o que impede o único ator de aprovar |

---

## E2E · Projetos / Trabalhos / Automações / Empresa (B7) — **PASSOU, 4 de 4**

**Os quatro domínios existem, criam e persistem.** Medido pelo bridge de cada um no Electron real,
com reload de janela entre criar e conferir.

| Domínio | bridge | criar | persistiu após reload |
|---|---|---|---|
| **Projetos** | `projetos` | `proj-1-1793997644973` · `rascunho` · 2 critérios | **1** — "Projeto E2E r283" |
| **Trabalhos** | `trabalhos` | `tp-673cd7f5af-…` · `pedido` · expira em 2026 | **1** — "Pesquisa E2E r283" |
| **Empresa** | `companies` | `emp_1793997645002_a4oz66` · `America/Sao_Paulo` | **1** — "Empresa E2E r283" |
| **Automações** | `automations` | `rule_1793997705174_mwp0cc` · `venda.faturada` | **1** — "Regra E2E r283" |

### O catálogo de automação é real, não uma lista escrita à mão

`automations.triggers()` devolveu **cinco eventos**:
`venda.faturada · estoque.zerado · ticket.aberto · ticket.atrasado · conta.vencendo`

`automations.tools()` devolveu as ações do catálogo REAL do processo principal, com descrição e
domínio: `inventory.append` ("Registra entrada, saída ou ajuste de estoque. Exige motivo e
referência única"), `sales.create` ("O total é derivado dos itens, nunca informado"), …

`api/automations.ts:4` explica o porquê: *"uma lista paralela envelhece na primeira ferramenta nova
e oferece ação que não existe."* **A tela não inventa ações.**

### A inconsistência que encontrei

`automation-store.ts:101` **exige `actor_id` no payload**:

> *"Sem ator não há escopo: a ação rodaria como ninguém, o que é o mesmo que rodar como todos."*

**A intenção é certa, o mecanismo é inconsistente com o resto do produto.** Em Sofia, o
`sofia-ipc.ts:131` diz o oposto e é mais seguro:

> *"o ator vem do resolvedor, nunca do payload. Se este canal deixasse o renderer mandar o nome do
> aprovador, a recusa seria decorativa."*

**Em automação, o renderer pode escrever qualquer `actor_id`.** O comentário protege contra "rodar
como ninguém", mas não contra "rodar como outra pessoa". **Não corrigi** — mudar esse contrato agora
mexeria em canal com teste de permissão próprio, e a decisão de qual dos dois padrões vale é de
arquitetura, não de rodada.

**Registrado como dívida de segurança, não como bug de UI.**

### Armadilhas de integração (todas custaram uma tentativa)

| Chamada | Campo que eu usei | Campo real |
|---|---|---|
| `projetos.criar` | `para_que_existe` | **`objetivo`** |
| `trabalhos.criar` | `descricao` | **`pedido`** |
| `companies.saveCompany` | `nome` | **`name`** |
| `automations.create` | `nome` | **`name`** + **`actor_id`** |

**Três domínios usam português e um usa inglês** (`companies` e `automations` em inglês;
`projetos` e `trabalhos` em português). Não é erro — mas é o tipo de coisa que faz quem integra
errar quatro vezes seguidas, como eu errei.

### O que NÃO foi testado

| Item | Por quê |
|---|---|
| **Execução real de uma automação** | criei a regra; não disparei `venda.faturada` para ver a ação rodar |
| `projetos.mudar` (status) e `podeIniciar` | só criei e listei |
| `trabalhos.mudar` (pedido→entregue) e `descartarVencidos` | idem |
| `companies.saveBranch` (filiais) | a tela tem "Adicionar filial"; não exercitei |
| `automations.setActive` e `sweep` | não exercitados |
| Projeto com **critério vazio** | a tela avisa *"Sem critério, ele não poderá ser concluído depois"* — não testei a recusa |

---

## E2E · Ciclo de Bot (B8) — **PARCIAL**: 5 de 8 etapas provadas

**Um bot é um PROFILE Hermes.** O ciclo vive em `/api/profiles` (REST, via `hermesDesktop.api`).

### O que foi provado, com saída

| # | Etapa do aditivo V3 | Chamada | Resultado |
|---|---|---|---|
| 1 | **criar** | `POST /api/profiles` | `{"ok":true,"name":"bot-e2e-283","soul_set":true,"path":"…\profiles\bot-e2e-283"}` |
| 2 | **editar** (SOUL) | `GET` + `PUT /api/profiles/:n/soul` | lê `"Bot de validacao E2E da r284"` · grava `{"ok":true}` |
| 3 | **editar** (nome) | `PATCH /api/profiles/:n` | `bot-e2e-283` → `bot-e2e-283b` · **SOUL sobreviveu à renomeação** |
| 4 | **revogar** | `DELETE /api/profiles/:n` | `{"ok":true}` · lista final `["default"]` |
| 5 | **guard** | `DELETE /api/profiles/default` | **recusou**: *"Profile 'default' is being deleted"* |

### As três etapas que **não** consegui provar

| # | Etapa | O que aconteceu |
|---|---|---|
| 6 | **reiniciar** | `/api/profiles/:n/restart` → **405**; `/api/profiles/:n/gateway/restart` → **405**. Só `/api/gateway/restart` existe, e **reinicia o gateway inteiro** (`{"ok":true,"pid":64744}`) — não um bot |
| 7 | **conversar** | `profiles.list` não trouxe `canonical_session` para o bot novo. A sessão "Bot Chat" nasce no **primeiro clique** na linha do bot, não na criação — e eu não cliquei |
| 8 | **ferramenta** | o bot nasceu com **`skill_count: 0`** enquanto o `default` tem **44** |

### O achado que mais importa

**`skill_count: 0`.** Um bot recém-criado **não herda ferramenta nenhuma** do profile padrão. O
aditivo V3 pede "ferramenta" como etapa do ciclo; **do jeito que está, um bot novo nasce sem
nenhuma** — e a tela de edição existe para preencher isso, mas **não foi ela que criou**.

**Não é bug de código; é decisão de produto**: `profiles.create` recebe `skills_disabled` e
`hub_installs` como parâmetros (o retorno trouxe os dois zerados), então a intenção de configurar
existe — o que falta é **o caminho que o usuário percorre para chegar lá**.

### Registrado, não corrigido

**Reiniciar um bot específico não existe como operação.** Só o gateway inteiro. Num produto onde o
bot é o conceito central, "reiniciar este bot" é uma ação que o usuário vai procurar — e ela não
tem porta. **Precisa de decisão de arquitetura** (reiniciar o gateway reinicia todos os bots juntos).

### Estado do HOME após os testes

`profiles.list` = `["default"]`. Os bots de teste (`bot-e2e-283`, `bot-e2e-283b`, `bot-e2e-284`)
foram criados e **revogados** — o HOME temporário voltou ao estado anterior neste quesito.
