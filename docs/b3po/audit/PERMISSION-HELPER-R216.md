# `exigirAtor`: o caminho que faltava para os 37 (rodada 216)

## O que eu tentei primeiro, e por que não deu

Tentei replicar a guarda no `inventory-ipc` directamente. **Quebrou o `erp-ipc`** — a assinatura mudou, e os
handlers não foram envolvidos porque a substituição em PowerShell falhou com CRLF.

**Reverti.** Um canal meio-envolvido com a assinatura trocada é pior que um canal intocado: ele passa a mentir
sobre estar protegido.

## O que o desvio revelou — um bug latente

`permission-guard.ts` tinha:

```ts
guardedHandler(actorOf: () => Actor, ...)   // promete que o ator existe
```

e dentro: `withPermission(actorOf(), ...)` — **sem verificar**.

Se `actorOf()` devolver `null`, `can(null, ...)` **explode com "cannot read properties of null"**.

> **Um canal de domínio escrito sobre `guardedHandler` parece protegido e quebra na primeira instalação sem
> dono.** O tipo prometia; ninguém checava.

## O que foi feito

`exigirAtor(actorOf: () => Promise<Actor | null>, action, resource, run, options?)`:

| Propriedade | Valor |
|---|---|
| Aceita `Actor \| null` | a ausência é **prevista**, não excepcional |
| Sem ator ⇒ `{ error: 'sem_permissao', reason: 'sem_ator' }` | **valor**, não exception — a tela mostra motivo em vez de "erro inesperado" |
| A recusa acontece **antes** do corpo | nada é gravado nem lido |
| Auditoria em **toda** chamada | inclusive nas negadas |

## Medido (9 testes)

| Situação | Resultado |
|---|---|
| sem ator + `execute` | recusa `sem_ator`, **corpo não roda** |
| sem ator + `read` | recusa `sem_ator`, **corpo não roda** |
| sem ator | **não lança** — devolve valor |
| `READ` + `execute` | recusa, **corpo não roda** |
| `READ` + `execute` | **motivo vem de `can`**, não texto genérico |
| **`READ` + `read`** | **funciona** |
| dono + `execute` | executa e devolve o resultado |
| dono + `read` | **audita a decisão permitida** |
| `READ` + `execute` | **audita também a negada** |

## Por que isto vale mais que dois canais

Copiar a lógica do financeiro em 37 arquivos seria **37 oportunidades de esquecer uma linha**.

`exigirAtor` faz cada canal passar a ser **uma linha de chamada** em vez de uma reimplementação. É a diferença
entre uma dívida que se paga **um canal por rodada** e uma que se paga **um canal por linha**.

## O estado real da dívida

| | |
|---|---|
| Canais com guarda | **3** (`admin`, `sales`, `finance`) |
| Dívida | **37** |
| Ratchet | **protege** — não cresce |
| **O helper que torna o resto trivial** | **existe agora** |

## O que não foi feito, e por que

O `inventory-ipc` **continua sem guarda**. Vou envolve-lo na próxima rodada com o helper, usando `edit` em vez
de `Replace` — e com os testes de estoque rodando antes do commit, não depois.

## Medido

| Medida | Valor |
|---|---|
| Testes da guarda | **69 verdes** (permission + finance) |
| Typecheck | **0 erros** |
| Reversão | `inventory-ipc.ts` voltou ao estado anterior |
| Bug latente encontrado | **`guardedHandler` não trata ator nulo** |
