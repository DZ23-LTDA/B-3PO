# Anonimização: o que sai e o que fica (rodada 92)

Decisão do proprietário: **anonimizar o contato, manter o fato fiscal**.

## O que sai

| Campo | Vira |
|---|---|
| `name` | `Titular removido` |
| `email`, `company` | vazio |
| `tags` | `[]` |
| `messages` | `[]` (o texto da conversa) |
| `notes`, `last_message_preview` | vazio |
| `title` (conversa) | `Titular removido` |
| `title` (oportunidade, tarefa) | `Oportunidade` / `Tarefa` |
| `phone` e `contact_phone` | `anon_<sha256 curto>` |

## O que fica

`value_cents`, `stage`, `status`, `created_at`, `due_at` — **o fato**. A venda aconteceu, o valor existe,
a data existe. O financeiro continua fechando.

## O telefone também sai, e por um motivo técnico

Ele é a chave que liga os registros entre domínios. Apagá-lo sem substituir quebraria a ligação —
conversa sem contato, oportunidade sem origem — e o histórico deixaria de fazer sentido interno.

O marcador é **derivado e irreversível** (`sha256` truncado) e é **o mesmo em todos os domínios**: a
ligação sobrevive, a pessoa não é mais alcançável pelo dado.

## Um vazamento que o teste pegou

Os `id` dos registros são gerados a partir do telefone: `c_5511999998888`, `o_5511999998888`. Anonimizar
só os campos de contato deixaria **o telefone dentro do identificador** — e um JSON exportado continuaria
identificando a pessoa.

O teste `expect(tudo).not.toContain(TELEFONE)` falhou por isso. Agora o id também é derivado.

## O que esta função não faz

**Não apaga nada.** Devolve os registros anonimizados para quem for gravar. Apagar é do store, e cada
store grava o arquivo inteiro — a armadilha do `write` da rodada 83.

## Falta

- tela para o proprietário executar o pedido
- gravar a anonimização em cada store (hoje a função é pura)
- registro de consentimento por contato
