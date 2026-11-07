# Agenda com guarda: 15 de 40 — e o fim da faixa de segurança (r225)

## O que foi feito

`scheduling-ipc.ts`: 5 handlers.

| Canal | Ação |
|---|---|
| `list`, `day` | **`read`** |
| `book`, `cancel`, `confirm` | **`execute`** |

**Agendamento carrega nome de cliente, serviço e horário** — dado pessoal e a operação do dia.

## O método que finalmente funcionou

Três tentativas anteriores com regex sobre parênteses aninhados falharam (r223, r224 **duas vezes**). Nesta rodada:

**substituição literal de blocos exatos**, sem regex:

```js
const subs = [[de, para], ...]   // 5 pares, cada um copiado do arquivo real
for (const [de, para] of subs) if (c.includes(de)) c = c.replace(de, para)
```

**5 de 5 handlers envolvidos, zero erros no typecheck.**

> **A lição não é "regex é ruim" — é que regex sobre estrutura aninhada tenta adivinhar o que eu já tinha lido.** Quando o texto exato está disponível, **copiar é mais seguro que descrever.**

## Medido

| | |
|---|---|
| Testes de agenda | **96 verdes** |
| Ratchet | **5 passam** |
| Gate | **14 checks, ok** |
| Typecheck | **0 erros** |

## O ratchet e o fecho da faixa

| | r211 (início) | r214 | r220 | r223 | r224 | **r225** |
|---|---|---|---|---|---|---|
| Canais com guarda | 2 | 2 | 8 | 12 | 14 | **15** |
| Dívida | 38 | 38 | 32 | 28 | 26 | **25** |

## O que a faixa 211–225 entregou

| Rodada | Entrega |
|---|---|
| 211 | **Auditoria de multitenancy**: 24/24 stores, 0 violações, invariante virou teste |
| 212 | **LGPD**: acesso e eliminação já existiam; **retenção** criada |
| 213 | **`npm audit`** medido: 15 total, **6 em produção, 0 alta** |
| 214 | **Achado**: 2 de 40 canais com RBAC; dívida virou **ratchet** |
| 215 | **Financeiro** protegido — primeira correção do diagnóstico da r214 |
| 216 | **`exigirAtor`** + bug latente em `guardedHandler` (`null` explodia) |
| 217 | **Estoque** protegido; dois bugs de instrumento corrigidos |
| 218–220 | **CRM inteiro fechado** (contatos, funil, tarefas, conversas) |
| 221 | **RH** — o domínio mais sensível |
| 222 | **Compras** — dinheiro e estoque no mesmo ato |
| 223 | **Catálogo e empresas** |
| 224 | **Serviços e documentos** + **teste vermelho há 9 rodadas descoberto** |
| **225** | **Agenda** — 15 canais, dívida em 25 |

## O que continua aberto na faixa

| Item | Estado |
|---|---|
| 25 canais sem guarda | `marketing`, `documents`*, `fiscal`, `privacy`, `analytics`, `after-sales`, `service-desk`, `fs`, `git`, `terminal`, `plugin-files`, … |
| Auditoria **persistida** | `onAudit` só acumula em memória |
| Login com usuários distintos | **decisão do dono** |
| 40 testes vermelhos em `electron/` | plugin, ssh, updater — **não relacionados** |

## Medido

| Medida | Valor |
|---|---|
| Handlers protegidos | 5 |
| Tentativas de regex que falharam antes | 3 |
| Tentativas de substituição literal | **1, bem-sucedida** |
