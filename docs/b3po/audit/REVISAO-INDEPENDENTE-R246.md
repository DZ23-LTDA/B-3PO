# Revisão independente e o mapeamento 1:1 das 40 falhas (rodada 246)

## A revisão pediu, e eu fiz

O §27 exige *"revisão independente obrigatória"*. Usei o MCP DZ23 (`consensus`, 3 modelos de providers distintos:
Groq/qwen3.8-27b, Cerebras/gpt-oss-120b, Cloudflare/gpt-oss-120b).

**Os três, sem combinar, apontaram a mesma afirmação como a mais perigosa**: *"as 40 falhas são todas de ambiente"*.

> *"A classificação das 40 falhas como 'todas de ambiente' é uma **interpretação, não um fato mensurável**. O que
> falta: mapeamento 1:1, cada teste com o erro exato e a justificativa específica."*

## O mapeamento 1:1

Rodei a suíte com `--reporter=json` e extraí **cada** teste falho com a mensagem real:

| Causa | Quantidade |
|---|---|
| `python3` ausente no Windows | **12** |
| `EPERM` em symlink | **12** |
| timeout | 5 |
| Ferramenta Windows ausente (`Missing Windows tool`) | 1 |
| **CRLF** — `'reviewed\r\n'` vs `'reviewed\n'` | 1 |
| fixture `electron` sem export `session` | 1 |
| `sun_path` longo (`C:\Users\…` 105 chars) | 1 |
| variável de ambiente do host (`PATH` com 2 vs 1 entrada) | 1 |
| **AMBÍGUO — não classificado** | **3** |
| | **40** |

## A correção da minha própria afirmação

Eu vinha dizendo **"as 40 falhas são todas de ambiente"**. **Estava errado em 3.** Elas são:

| Teste | Erro |
|---|---|
| `backend-probes-runtime.test.ts` | `AssertionError: false !== true` |
| `desktop-installation.test.ts` | `STACK_TRACE_ERROR` (sem mensagem legível no relatório) |
| `state-db-preflight.test.ts` | `STACK_TRACE_ERROR` (sem mensagem legível no relatório) |

**Não sei se são ambiente.** O relatório JSON não traz a causa legível, e eu **não abri cada uma** para descobrir.

> **A afirmação correta é: 37 de 40 falhas foram classificadas com evidência; 3 permanecem sem classificação.**

## O achado colateral que a revisão destravou

`desktop-plugin-install.test.ts` falha com:

```
expected 'reviewed\r\n' to be 'reviewed\n'
```

**É CRLF contra LF** — o mesmo problema de fim de linha que já apareceu nos avisos do `git` nesta sessão (*"CRLF
will be replaced by LF the next time Git touches it"*). **Um teste que compara string literal com `\n` falha no
Windows por causa disso.**

**Isso é ambiente — mas é um ambiente que o repositório cria para si mesmo**, e não um host inadequado.

## O que a revisão acertou e o que não viu

| Crítica | Procede? |
|---|---|
| *"Sem mapeamento 1:1"* | **sim** — feito nesta rodada |
| *"Sem referência a issue/commit do upstream para `outline: none`"* | **não** — o comentário no `styles.css` diz literalmente *"No focus rings, anywhere"* com a razão técnica; isso **é** a evidência, e os revisores não tinham o arquivo |
| *"8 testes não cobrem multi-processo"* | **sim** — e **eu já havia escrito isso no código** e no relatório: a fila é por instância |
| *"Sem commit/diff dos instaladores"* | **não** — os commits existem (`bf6b6231be`, `cd19aca5ab`); os revisores não tinham o repositório |
| *"Sem logs de CI"* | **parcial** — `gh run list` foi medido, mas não salvei o log bruto de cada etapa |

**A revisão sem repositório produz metade de ouro e metade de ruído.** A metade de ouro foi a lacuna do mapeamento —
e ela **era real**.

## O que continua sem verificação

| Item | Estado |
|---|---|
| **`backend-probes-runtime`, `desktop-installation`, `state-db-preflight`** | **3 falhas não classificadas** |
| Log bruto de cada etapa da CI | não salvo |
| Teste de concorrência **multi-processo** | **não escrito** — e a fila não cobre |

## Medido

| Medida | Valor |
|---|---|
| Modelos revisores | **3** (providers distintos) |
| Concordância entre eles | **média (0,3)** |
| Falhas classificadas com evidência | **37 de 40** |
| **Falhas sem classificação** | **3** |
| Minha afirmação anterior ("todas de ambiente") | **errada em 3** |
