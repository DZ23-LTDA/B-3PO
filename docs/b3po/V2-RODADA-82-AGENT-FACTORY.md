# GOAL V2 — RODADA 82: O AGENT FACTORY — A RESPOSTA PADRÃO É "REAPROVEITAR"

**Data**: 05/11/2026 · **§12** · o quarto componente

---

## O QUE O §12 PEDE

> *"Agent Factory reutiliza agentes, skills, providers e ferramentas existentes, configurando especialização, escopo, permissão, ferramentas e contexto."*
>
> *"**Não criar bots duplicados para cada tarefa.**"*

---

## O QUE EXISTIA

`agent-roster.ts` (r142) declara **os onze agentes** e o teto de cada capacidade por domínio. `agent-tools` declara as ferramentas.

> **Faltava a decisão de contratar**: dada uma necessidade, **reaproveitar quem já existe ou criar alguém novo?**

---

## A DECISÃO — e a resposta padrão é **reaproveitar**

> *"Criar um segundo agente para o mesmo domínio duplica a permissão, a memória e o erro — e a segunda cópia envelhece sem que ninguém saiba qual das duas está certa."*

**Criar só é sugerido quando o domínio não tem cobertura** — e mesmo aí o Factory **não cria**: ele **diz o que falta**, e **quem decide é uma pessoa**.

---

## AS TRÊS RECUSAS DE `validarProposta`

| Recusa | O que protege |
|---|---|
| **`duplicata`** | dois agentes com a mesma identidade |
| **`dominio_ja_coberto`** | o §12: *"não criar bots duplicados"* |
| **`nivel_acima_do_permitido`** | **um agente novo não nasce no topo** |

### O bug que o teste encontrou

O teste `nível inválido também é recusado` falhou: `DEUS` passava.

**Causa**: `ordemDoNivel('DEUS')` devolve um valor que **não é maior** que `EXECUTE_ALLOWED` — então a comparação dizia "está dentro do limite".

> **Um nível inventado passava como se fosse o mais baixo.** Corrigido: **o nível precisa existir** antes de ser comparado.

---

## A SEGUNDA PROTEÇÃO — o nível devolvido é o **do agente**

```ts
nivelDoAgente: capacidade?.nivel ?? 'READ'
```

> **O teto é por domínio (r142), e um pedido maior não o eleva.** A resposta é *"esta pessoa já cuida disso, e no nível dela"* — **subir o nível é uma decisão separada, e ela não acontece aqui**.

---

## A PROVA — 18 testes

| Grupo | O que trava |
|---|---|
| **candidatos** | acha quem cobre · **domínio sem dono devolve vazio** |
| | **a ordem é estável** — lista que muda faz a tela parecer quebrada |
| **contratar** | **devolve o agente existente** · o nível é **o do agente** |
| | **domínio sem dono: sugestão, não criação** |
| **validarProposta** | **id repetido** · **domínio coberto** |
| | **nível acima do permitido** · **nível inválido** · **sem capacidade é aceito** |
| **recomendacao** | **começa pelo que NÃO vai acontecer** · diz a razão |

---

## MEDIÇÕES

| Medida | Valor |
|---|---|
| Linhas | **~170** |
| Testes | **18** |
| Regressão (agent + organization + project) | **190 verdes** |
| Gate | **14 checks, ok** |
| Typecheck | **0 erros** |

---

## O §12 — **OS QUATRO COMPONENTES**

| Componente | Estado |
|---|---|
| **Organization Builder** | ✅ r81 |
| **Project Builder** | ✅ r76–r80 (6 camadas) |
| **Agent Factory** | ✅ **r82** |
| **Task Orchestrator** | ✅ r22 |

> **O §12 está completo nos quatro componentes.**

---

## O QUE **AINDA** FALTA — e é o terceiro tipo de trabalho

> O §12 define **três tipos de trabalho**: organização permanente, projeto e **trabalho pontual**.
>
> *"TRABALHO PONTUAL: documento, pesquisa, apresentacao, analise, codigo ou artefato temporario."*

**Os dois primeiros existem. O terceiro — trabalho pontual — não.**

---

## PRÓXIMA RODADA

**O trabalho pontual** — o que não é organização nem projeto: uma pesquisa, um documento, uma análise que **começa e termina** e não vira estrutura.

> **82 rodadas.** O §12 pede quatro componentes e três tipos de trabalho. **Os quatro componentes estão de pé** — e o Agent Factory, o último deles, **não cria nada**: ele **reaproveita**, e diz *"não crie outro"* quando alguém tenta duplicar um domínio.
