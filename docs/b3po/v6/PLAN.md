---
tipo: plano
agente: dsh
projeto: c3po-bot
data: 2026-11-08
fase: V6-§9
revisao: r1
---

# V6 — Plano de execução

> Ordem por **dependência**, não por tamanho: cada degrau desbloqueia o seguinte. O contrato proíbe
> acumular rodadas; o que manda é o critério de aceite.

## O degrau que segura tudo

**Nada consome uma execução `pendente`.** Medido na r1: `grep` por `assumirPendente|consomePendente|
executarPendente|pendente.*executar` em `apps/desktop/{electron,src}` e `hermes_cli` → **0 resultados**;
`agent_execution` em `hermes_cli` → **0**.

O store de execuções vive no **main do desktop**; o gateway — que é o runtime Hermes — **não o conhece**.
Enquanto isso valer, nenhuma jornada de desenvolvimento pode acontecer: a Sofia produz planos, delega,
monta o pedido, e **o trabalho fica parado**.

## Degraus

| # | Entrega | Depende de | Critério verificável |
|---|---|---|---|
| **D1** | **Consumo de `pendente`**: o trabalho delegado sai do estado parado | — | uma execução `pendente` transita para `executando` **por ação do runtime**, com dono e sessão verificada |
| **D2** | **Projeto ↔ pasta**: o registro ganha caminho e o explorador abre nele | D1 (opcional) | criar projeto em pasta nova; reabrir e ver os arquivos |
| **D3** | **Ações de teste/build**: rodar e **ler resultado**, não só abrir terminal | D2 | comando disparado pela UI, exit code e saída capturados, estado refletido |
| **D4** | **Preview + console/rede** | D2 | app do projeto em porta própria, console e rede legíveis |
| **D5** | **Provedor configurável sem segredo no frontend** | — | segredo entra no main/gateway; renderer só vê "configurado/não configurado" |
| **D6** | **Benchmark §7** | D1, D3, D5 | projeto de distribuidora, testes executados, falha corrigida, artefato entregue |
| **D7** | **Deploy com aprovação** | D3, D4 | fluxo com aprovação identificada e registro |
| **D8** | **DEC-5 e DEC-6** (do §2) | — | tema do primeiro paint e papel do overlay, corrigidos e verificados |

**D1 primeiro** porque D6 — o benchmark, que é o critério de aceite mais caro — **não pode ser honesto sem
ele**: sem runtime consumindo o trabalho, "o B-3PO construiu o sistema" seria simulação.

## Decisões de produto já dadas no §2 (não são minhas)

- **DEC-2**: identidade B-3PO na web, preservando o funcionamento.
- **DEC-3**: mobile com experiência específica (conversas, agentes, tarefas, aprovações, projetos).
- **DEC-5**: tema inicial = preferência salva, senão o sistema.
- **DEC-6**: overlays e rotas com semântica acessível adequada.

**DEC-5 e DEC-6 são implementáveis agora** (não dependem de D1) — entram como D8, em paralelo.

## Bloqueios que não dependem de mim

| ID | Bloqueio | Efeito na V6 |
|---|---|---|
| `EXT-3` | **sem credencial de modelo** (`providers: {}`) | **nenhum benchmark real**; D5 implementa a configuração, mas a credencial é sua |
| `EXT-1` | sem certificado Authenticode | release assinado |
| `EXT-2` | sem macOS | iOS |
| `EXT-4` | sem bash | suíte completa do gateway |

**D5 pode ser entregue sem credencial** (a configuração funciona; o teste de conectividade dá
`BLOCKED_BY_EXTERNAL_DEPENDENCY` até haver chave). **D6 não pode.**

## Regra de honestidade desta fase

- `IMPLEMENTED` só com o caminho completo: UI → canal → autorização → efeito → teste.
- `PARTIAL` quando o efeito existe mas o produto não o alcança.
- **Nenhum benchmark declarado sem inferência real.** Se `EXT-3` persistir, o §7 fica `BLOCKED` com o
  motivo, e a plataforma fica `PARTIAL` — não `READY`.
