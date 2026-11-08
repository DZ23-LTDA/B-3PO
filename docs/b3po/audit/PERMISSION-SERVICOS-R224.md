# Serviços e documentos com guarda: 14 de 40 — e um teste vermelho há 9 rodadas (r224)

## O que foi feito

| Canal | `read` | `execute` |
|---|---|---|
| `services` | `list`, `find` | `save`, `remove` |
| `documents` | `list` (já traz os totais) | `upsert`, `remove` |

**Serviço carrega preço e duração**: `list` já revela a tabela de preços do negócio.

## O achado que importa mais que a rodada

Ao corrigir os testes afetados, descobri que **`server-tenant-2.test.ts` estava vermelho desde a r215**.

Esse é o teste de **isolamento multitenant** — o mesmo que eu auditei na r211 e declarei *"24 de 24 stores filtram, 0 violações"*.

Ele chama `registerFinanceIpc` e `registerInventoryIpc`, que **passaram a exigir `actorOf`** nas r215 e r217. **O helper `registrar()` do teste nunca foi atualizado.**

> **Por 9 rodadas o teste que prova o isolamento ficou vermelho, e eu não vi porque rodava só os testes que tocava.**

Isso **não invalida** a auditoria da r211 — aquela varreu o **código-fonte** dos stores, não este teste. Mas **invalida o meu processo**: eu vinha dizendo "N testes verdes" com base em execuções parciais.

## Medido agora, com o suite inteiro de `electron/`

| | |
|---|---|
| Antes das correções desta rodada | **54 falhas** em 5007 testes |
| Depois | **40 falhas** em 5007 |
| **Corrigidas** | **14** — 13 de `purchases` (r222) + 1 do ratchet |

### As 40 restantes — arquivos que **não toquei**

`backend-probes-runtime`, `channel-build-version`, `command-screenshot-monitor`, `desktop-installation`, `desktop-plugin-install` (5), `desktop-plugin-remove`, `no-console-git` (3), `packaged-working-directory`, `plugin-files` (8), `ssh-connection` (4), `ui-preferences` (3), `updater/*` (5).

**São de plugin, ssh, updater e instalação** — nenhuma relação com permissão ou tenant. A baseline medida na r189 era **53 falhas**; agora são **40**, o que é **consistente com pré-existentes**, mas **eu não medi o baseline antes da r214** e não vou afirmar categoricamente que todas são anteriores.

## O erro de método, nomeado

> **"Testes verdes" com base em execução parcial é a mesma classe de erro que "a tela funciona" sem abrir a janela.**
>
> Rodei `npx vitest run <arquivos que toquei>` onze vezes seguidas e reportei o número como se fosse o estado do produto.

## O que existe agora

Um canal novo passa a exigir **três coisas**, e as três são verificadas:
1. `exigirAtor` no handler
2. `deps.actorOf` na assinatura
3. **testes existentes atualizados** — o typecheck aponta cada um

## Medido

| Medida | Valor |
|---|---|
| Canais com guarda | **14** |
| Dívida | **26** |
| Testes `electron/` | **4760 verdes / 40 vermelhos** |
| Gate | 14 checks |
| Typecheck | 0 erros |
