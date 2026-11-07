# TEST-RESULTS — classificação completa das 40 falhas

## O resultado da suíte

```
Tests  40 failed | 4772 passed | 207 skipped (5019)
```

**40 falhas, 40 investigadas.** Os números abaixo vêm do relatório JSON (`--reporter=json`) e de execução isolada
de cada arquivo — não de estimativa.

## A tabela, e a conta que fecha

| # | Causa | Qtd | Como foi provado |
|---|---|---|---|
| 1 | **`python3` no PATH é o stub da Microsoft Store** | **13** | `WindowsApps\python3.exe` abre a loja em vez de executar |
| 2 | **`EPERM` ao criar symlink no Windows** | **12** | o teste precisa de symlink; Windows exige privilégio |
| 3 | **`sun_path` longo** | **4** | `control socket ... must fit sun_path (got 105: C:\Users\...)` |
| 4 | **`config.yaml` não lido** (`bundle-electron-main`) | **3** | `electron_flags: [--ozone-platform=x11]` ignorado; recebe `wayland` |
| 5 | **CRLF vs LF** | **2** | `expected 'reviewed\r\n' to be 'reviewed\n'` |
| 6 | **recuperação de lock lenta** (`desktop-installation`) | **1** | 41,9 s contra limite de 30 s |
| 7 | **`ruamel`/`hermes_cli` ausentes no Python global** | **1** | `ModuleNotFoundError: No module named 'ruamel'` |
| 8 | **ferramenta Windows ausente** | **1** | `Missing Windows tool` |
| 9 | **fixture `electron` sem export `session`** | **1** | `No matching export in "fixture:electron"` |
| 10 | **variável de ambiente do host** | **1** | `PATH` com 2 entradas vs 1 esperada |
| 11 | **path macOS vs Windows** | **1** | `/Applications/...` vs `D:\Applications\...` |
| | **TOTAL** | **40** | **13+12+4+3+2+1+1+1+1+1+1 = 40** ✓ |

## Por natureza

| Natureza | Qtd | Itens |
|---|---|---|
| **Ambiente comprovado** | **36** | 1, 2, 3, 5, 7, 8, 9, 10, 11 |
| **Indeterminado** | **3** | 4 — sintoma claro (`config` ignorado), causa entre caminho / YAML / bug |
| **Comportamento de produto** | **1** | 6 — launch que trava ~40 s no Windows |
| | **40** | |

## O que eu afirmei em cada rodada, e o que era verdade

| Rodada | Afirmação | O que era |
|---|---|---|
| 226 | *"40 falhas, todas `ENVIRONMENT-BLOCKED`"* | **sem mapeamento — alegação não sustentada** |
| 246 | *"37 de 40 classificadas"* | primeiro mapeamento real |
| 247 | *"39 de 40"* | otimista: contei `bundle` como ambiente sem investigar |
| 248 | *"35, 1 produto, 4 desconhecidas"* | melhor |
| 249 | *"34, 1, 3, 2"* | melhor |
| **250** | **"36 ambiente, 3 indeterminadas, 1 produto"** | **cada uma lida, e a soma fecha** |

> **A frase final é mais forte que a inicial em um sentido e mais fraca em outro**: agora eu **sei o que cada uma
> é** — mas **não posso mais dizer "nenhuma é do produto"**, porque **uma é**.

## O defeito de produto encontrado

`electron/desktop-installation.ts`:

```ts
for (let attempt = 0; attempt < 40; attempt++) {
  try { repairFd = fs.openSync(repairPath, 'wx', 0o600) }
  catch (error) {
    if (error?.code !== 'EEXIST') throw error
    ...
    emptyPolls = waitOnContendedRepairLock(...)   // julga o dono do lock
    continue
  }
}
```

`waitForRepair()` espera **25 ms** — mas `waitOnContendedRepairLock` consulta a **criação de processo** a cada
tentativa, e isso é lento no Windows. **40 × ~1 s ≈ 41 s antes de recusar.**

**Um usuário Windows com lock de reparo órfão espera ~40 segundos antes de o app decidir.** Não é falha de teste:
**é latência de produto.**

## O que NÃO foi feito

| Item | Por quê |
|---|---|
| Corrigir o lock lento | mexer em recuperação de lock sem medir pode **travar o launch para sempre** |
| Trocar `python3` por `python` nos testes | resolveria 13 aqui e **quebraria o CI em Linux** |
| Descobrir por que `config.yaml` não é lido | 3 sintomas, 3 causas possíveis, **nenhuma medida** |

## Medido

| Medida | Valor |
|---|---|
| Testes totais | **5019** |
| Verdes | **4772** |
| Pulados | **207** |
| **Falhas investigadas** | **40 de 40** |
| Ambiente comprovado | **36** |
| Indeterminadas | **3** |
| Comportamento de produto | **1** |
