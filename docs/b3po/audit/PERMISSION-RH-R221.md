# RH com guarda: 9 de 40 (rodada 221)

## O domínio mais sensível do produto

RH carrega nome, cargo e **salário** (`withSalary`). É o dado que a LGPD chama de sensível por consequência
financeira e pessoal.

| Canal | Ação | Por quê |
|---|---|---|
| `departments`, `employees` | `read` | cadastro |
| `policy`, `offboarding`, `treinamentos` | `read` | **cálculo puro** sobre o que o chamador manda — não tocam o disco |
| `saveDepartment`, `saveEmployee` | `execute` | escrita |

## Uma decisão que eu deixei explícita no código

> `employees` com `withSalary: true` continua sendo **`read`**.
>
> **Salário é leitura do cadastro, não execução** — e esconder do nível READ o que a política já mostra seria
> **segurança de fachada**.

Se o produto decidir que salário exige nível próprio, isso é **política nova**, não uma guarda escondida.

## Medido

| | |
|---|---|
| Testes de RH | **82 verdes** |
| Ratchet | **5 passam** |
| Gate | **14 checks, ok** |
| Typecheck | **0 erros** |

## O ratchet

| | r220 | **r221** |
|---|---|---|
| Canais com guarda | 8 | **9** |
| Dívida | 32 | **31** |

## O que continua aberto no ERP

`purchases`, `scheduling`, `services`, `marketing`, `documents`, `companies`, `catalog`, `fiscal`, `privacy`,
`analytics`, `after-sales`, `service-desk`.

**`purchases` é o próximo mais importante**: cotações, pedidos e aprovação de compra.

## Nota de processo

Esta rodada fez **um canal** e não dois. `purchases-ipc.ts` tem **10 handlers** em 134 linhas e padrões de
assinatura diferentes — reescrevê-lo junto com o RH teria multiplicado a chance de erro pela metade do tempo
economizado. **O canal que ficou pronto está inteiro**; o outro fica para a próxima com atenção própria.
