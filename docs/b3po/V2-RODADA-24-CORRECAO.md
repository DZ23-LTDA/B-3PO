# GOAL V2 — RODADA 24: A CORREÇÃO DO MEU PRÓPRIO DOCUMENTO

**Data**: 05/11/2026 · **§13 — navegação**

---

## O QUE EU ESCREVI ERRADO NA r23

Na matriz de 31 rotas eu marquei 5 como *"sem menu"* e **interpretei como "inalcançável"**.

**Estava errado.** Medido nesta rodada:

| Rota | Onde está acessível |
|---|---|
| `/settings` | **statusbar** — `use-statusbar-items.tsx:762` |
| `/cron` | **statusbar** — `use-statusbar-items.tsx:645` |
| `/webhooks` | **statusbar** — `use-statusbar-items.tsx:653` |
| `/messaging` | **rail da sidebar de chat** — `chat/sidebar/index.tsx:229` |
| `/artifacts` | **rail da sidebar de chat** — `chat/sidebar/index.tsx:239` |

> **"Sem menu" significava: não estão no menu do B-3PO (`b3po-nav`). Não que o usuário não chega nelas.**
>
> **A diferença importa**: *"não está no menu do produto"* e *"não existe porta"* são **diagnósticos diferentes, com consertos diferentes**. Eu tratei os dois como o segundo — e isso teria me feito "consertar" o que não estava quebrado.

**Corrigido no documento**, com a tabela de onde cada uma está.

---

## FASE 1 DO §13 — IMPLEMENTADA

```ts
{ codicon: 'library', label: 'Organização', path: '/empresa' },
```

**O §13 pede literalmente**:

> *"'Empresa' como ambiente não deve ser confundida com configuração da organização; renomear a configuração para 'Organização' ou equivalente."*

### A rota **não** mudou — e o motivo é do próprio §13

> *"Não remover rotas nem funcionalidades existentes sem mapear consumidores."*

**`/empresa` tem 4 consumidores**:
- `use-statusbar-items.tsx`
- `profile-switcher.tsx`
- `toolset-detail.tsx`
- `plugin.test.ts`

**Trocar o rótulo resolve sem remover nada. Trocar a rota quebraria os quatro.**

---

## O QUE ISSO MUDA NA ORDEM DE IMPLEMENTAÇÃO

| Fase | Antes | Agora |
|---|---|---|
| 1 | rotular `/empresa` | ✅ **feito** |
| 2 | `/settings` para Configuração | **baixou de prioridade** — já tem porta na statusbar |
| 3 | expor `/artifacts` e `/cron` | **baixou** — idem |
| 4 | agrupamento visual | mantém |
| 5 | ambiente ENGENHARIA | mantém |
| 6 | seletor | mantém |

> **As fases 2 e 3 não eram conserto de alcançabilidade — eram conveniência.** Prioridade caiu, e a razão está escrita.

---

## MEDIÇÕES

| Medida | Valor |
|---|---|
| Rotas alteradas | **0** |
| Rótulos alterados | **1** (`Empresa` → `Organização`) |
| Consumidores de `/empresa` mapeados | **4** |
| Rotas "sem menu" que **têm** porta | **5 de 5** |
| Documento corrigido | **122 → 172 linhas** |
| Testes de navegação | **13 verdes** |
| Gate | **14 checks, ok** |
| Typecheck | **0 erros** |

---

## O QUE CONTINUA VALENDO DA r23

| Decisão | Por quê |
|---|---|
| **Ambiente ENGENHARIA não nasce com uma tela** | um produto que se apresenta como "ambiente de engenharia" com **uma tela** é pior que um que **não promete** |
| **Seletor espera o segundo ambiente** | **um controle que não muda nada é pior que a ausência dele** |
| **Agrupamento exige mudança de SDK** | `SidebarNavContribution` não tem `group` |
| **Nenhuma rota removida** | exigência do §13 |

---

## A LIÇÃO

> **Eu li a minha própria matriz e transformei "não está no menu do produto" em "o usuário não chega".**
>
> São duas afirmações diferentes. A primeira é **organização**; a segunda é **arquitetura quebrada**.
>
> Ter corrigido isso **antes** de "consertar" evitou adicionar itens ao menu para resolver um problema que não existia — e evitou registrar como dívida grave o que é conveniência.

---

## PRÓXIMA RODADA

O §13 está com os documentos entregues e a fase 1 feita. O próximo item do GOAL com peso real é o **§14 — Compras**, que o documento trata como **auditoria antes de modelo**:

> *"R256 afirma que Compras possui persistência em JSON real... **Isso deve ser reexecutado e confirmado, não presumido.**"*

E ele descreve a tela como *"simplificada"* — o que é uma acusação a verificar, não um fato.
