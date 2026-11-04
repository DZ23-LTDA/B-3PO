# Emissão fiscal — arquitetura e o que falta (rodada 104)

Pedido do proprietário: *"conectar a API ou MCP de terceiros para impressão de notas fiscais, para os
agentes completarem o processo todo"*.

## A restrição que decide a arquitetura

O GOAL tem duas frases que, juntas, proíbem o caminho óbvio:

> *"integração fiscal quando disponível"* (item 16)
> *"**Não afirmar emissão fiscal sem integração homologada**"* (item 16)

E concede a saída:

> *"Sem credenciais, preparar e testar em **sandbox**"* (item 13)

Então: **contrato de provedor + sandbox marcado**, e nenhum caminho que diga "autorizada" sem autoridade
tributária.

## O que existe agora

`electron/fiscal-provider.ts`:

| Peça | Função |
|---|---|
| `FiscalProvider` | contrato: `emitir`, `consultar`, `cancelar` |
| `sandboxProvider()` | simula o ciclo inteiro, **marcado** como homologação |
| `provedorNaoConfigurado()` | recusa com `nao_configurado` — diz a verdade em vez de esconder |
| `PROVEDORES_FISCAIS` | catálogo: Focus NFe, eNotas, Nuvem Fiscal, **MCP** do emissor |
| `resolverProvedor(env)` | sem `FISCAL_PROVEDOR` → sandbox |
| `variaveisFaltando(env)` | quais chaves faltam, para a tela poder dizer |

**14 testes, 0 falhas.**

## O que o sandbox garante

| Garantia | Como |
|---|---|
| Não dá para confundir com nota real | chave começa em `SANDBOX-`; `homologacao: true` |
| A mensagem diz que não vale | *"Documento de homologação. Não tem validade fiscal."* |
| Emitir duas vezes não cria duas notas | `ref` determinística → mesma chave |
| Sandbox não cancela chave real | recusa `chave_de_outro_provedor` |
| Cancelar exige motivo | `motivo_obrigatorio` (a SEFAZ recusa sem) |
| Devolve URL de DANFE | sem ela não há como imprimir |

## O que **não** foi feito — e por quê

**O adapter HTTP de cada emissor não foi escrito.** `resolverProvedor` devolve `nao_configurado` mesmo com
as variáveis presentes, e o código diz isso:

> *"Inventar um 'provavelmente funcionou' aqui seria pior que recusar: uma venda com nota fantasma é
> **passivo fiscal**, não bug de interface."*

## Dependência externa (BLOCKED_BY_EXTERNAL_DEPENDENCY)

| Falta | Impacto | Alternativa |
|---|---|---|
| Credencial de um emissor | emissão real | sandbox cobre o fluxo |
| Certificado A1 (se emissão direta) | não é necessário com provedor | — |
| Contrato com o provedor | custo e habilitação | — |

## Próximas rodadas

1. **`fiscal-store.ts`** — documento fiscal persistido: `pendente → autorizado → cancelado`, ligado à venda
   por `ref`, com URL do DANFE para impressão.
2. **Canal + tela** — botão "Emitir nota" na venda faturada, "Imprimir" quando autorizada.
3. **Adapter real** — Focus NFe primeiro (API REST simples), quando houver credencial.
4. **MCP** — expor `fiscal.emitir` como tool para os agentes, e o canal `FISCAL_MCP_URL` para um emissor
   que fale MCP.
