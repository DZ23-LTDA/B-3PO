# Gravação da anonimização: tentada, não entregue (rodada 93)

## O que eu tentei

`aplicarAnonimizacao(telefone, deps)` — exportar, anonimizar, gravar o novo em cada store e remover o
original.

## O que falhou, e o que aprendi no caminho

**1. O marcador alfanumérico é recusado.** `anon_3f2a1b`, filtrado para dígitos, vira 3 caracteres e o
CRM responde `phone_too_short`. Corrigido: o marcador agora é numérico (`900` + 9 dígitos), com formato de
telefone e sem colidir com número real (que no Brasil começa em 1–8). **Esse conhecimento fica** — está no
código e nos testes.

**2. Eu não conferia o `upsert` antes de remover.** A ordem "escreve antes de remover" só protege se a
escrita for verificada; sem isso, um `upsert` recusado seguido do `remove` apaga o dado do titular sem
deixar substituto. Corrigido também.

**3. O pipeline não persistiu o anonimizado, e eu não descobri por quê.** Depois de escrever, conferir e
remover o original, `list()` voltou vazio. Com o contexto desta sessão no fim, investigar isso significa
mexer em gravação de dados sem entender o mecanismo — e a rodada 83 já mostrou o custo disso.

## A decisão

**Revertido.** `aplicarAnonimizacao` foi removida e o arquivo de teste dela também. Fica o que funciona e
está provado: `exportarTitular`, `preverEliminacao` e `anonimizarRegistros` (as três puras), com **14
testes**.

Entregar uma função que apaga registros e não grava o substituto seria **pior que não entregar**: o
proprietário acharia que o pedido foi atendido e o cliente teria sido apagado do CRM sem anonimização.

## O que a próxima rodada precisa

Reproduzir o caso com um store só (pipeline), imprimir o estado do arquivo entre `upsert` e `remove`, e
descobrir por que o `list()` não encontra o registro gravado. O suspeito é a interação entre `write` (que
grava o arquivo inteiro) e o tenant — a mesma família do bug da rodada 83.

## O que continua funcionando

| Função | Estado |
|---|---|
| `exportarTitular` | testada, 8 casos |
| `preverEliminacao` | testada |
| `anonimizarRegistros` | testada, 6 casos |
| `aplicarAnonimizacao` | **não existe** — sem tela e sem gravação |
