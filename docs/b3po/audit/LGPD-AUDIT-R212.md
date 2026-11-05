# LGPD: o que existe e o que faltava (rodada 212)

## O que já existia (e eu não sabia que era tanto)

`electron/privacy.ts` cobre **art. 18 I** (acesso) e **art. 18 VI** (eliminação):

| Função | Direito |
|---|---|
| `exportarTitular()` | **Acesso/portabilidade** — devolve tudo que o sistema tem sobre um telefone |
| `preverEliminacao()` | **Eliminação** — mostra o que seria apagado, antes de apagar |
| `aplicarAnonimizacao()` | **Eliminação** — anonimiza mantendo o fato fiscal |
| `normalizarTelefone()` / `telefoneValido()` | chave canônica do titular |

Canais: `hermes:privacy:export`, `hermes:privacy:preview`, `hermes:privacy:anonymize`. Há tela em `/privacidade`.

**Isso é mais completo do que eu esperava**, e a decisão registrada no módulo é correta:

> *"O primeiro é somente leitura e não pode causar dano. O segundo mexe em armazenamento que não tem lixeira:
> apagar um contato do CRM leva junto as tarefas e as oportunidades ligadas a ele."*

## O que faltava: prazo

Nenhuma categoria de dado tinha **prazo de retenção**. Guardar para sempre é o padrão que a LGPD não admite
(art. 15/16: término do tratamento).

## O que foi feito

`electron/privacy-retention.ts` + 14 testes.

```ts
vencidos(registros, prazos, agora)      -> { vencidos: [], sem_prazo: n }
resumoPorCategoria(resultado)           -> { categoria: { quantidade, mais_antigo_dias } }
```

## A regra que governa o módulo

**Retenção não apaga. Ela diz "este dado venceu" e o humano decide.**

O `privacy.ts` já documenta que exclusão é destrutiva e que **o armazenamento não tem lixeira**. Um prazo que
apagasse sozinho transformaria **uma política de conformidade num incidente de perda de dado**.

## As decisões que evitam erro silencioso

| Decisão | Por quê |
|---|---|
| **categoria sem prazo nunca vence** | `null` é ausência de política, não "prazo zero" — tratar como zero marcaria **todo o banco** no primeiro dia |
| **`agora` é parâmetro** | um relatório de conformidade não pode mudar de resposta entre duas execuções do mesmo dia |
| **no limite exato ainda não venceu** | prazo de 365 vence no 366 |
| **ordem estável** (mais antigo, empate pelo id) | dois relatórios do mesmo conjunto concordam |
| **prazo negativo/NaN conta como sem prazo** | um `-1` digitado por engano não pode virar "vencido sempre" |

## O que NÃO foi feito, e é a dívida

| Item | Estado |
|---|---|
| Canal IPC para retenção | **NÃO existe** |
| Tela de retenção | **NÃO existe** |
| Os prazos em si | **NÃO decididos** — são política do dono, não do código |
| Anonimização por categoria | só por telefone (o titular), não por lote vencido |

**É o mesmo formato de sempre**: regra provada, caminho até o usuário inexistente. Registrado como `PARTIAL`.

## Classificação do §25 (LGPD)

| Direito / dever | Estado |
|---|---|
| Acesso e portabilidade (art. 18 I, V) | **IMPLEMENTED + canal + tela** |
| Eliminação (art. 18 VI) | **IMPLEMENTED + canal + tela**, com prévia e sem lixeira |
| **Retenção (art. 15/16)** | **regra IMPLEMENTED + TESTED; sem canal nem tela; prazos não decididos** |
| Consentimento | r185 no contato, r208 na tela |
| Isolamento multitenant | auditado na r211: 24/24 stores, 0 violações |

## Medido

| Medida | Valor |
|---|---|
| Funções de LGPD que já existiam | 4 (+3 canais +1 tela) |
| O que faltava | **prazo de retenção** |
| Testes novos | **14** |
| Typecheck | 0 erros |
| Canal/tela da retenção | **não** |
