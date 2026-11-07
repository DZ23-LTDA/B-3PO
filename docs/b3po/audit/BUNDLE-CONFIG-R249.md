# Os 3 timeouts de `bundle-electron-main`: config não lido (rodada 249)

## O que a r248 deixou

Eu disse *"4 dos 5 timeouts não foram investigados"*. Investiguei os 3 do maior grupo.

## O que os testes fazem

`scripts/bundle-electron-main.test.mjs` — 5 testes, **2 passam, 3 falham**:

| Teste | Resultado |
|---|---|
| relaunches native Wayland sessions | **passa** |
| keeps the WSLg Wayland relaunch | **passa** |
| **lets `desktop.electron_flags` choose the ozone platform** | **falha** |
| **reads `electron_flags` through a suffixed home** | **falha** |
| **reads `electron_flags` from the parent of a profiles/-rooted home** | **falha** |

## A asserção exata

```
- Expected:  --ozone-platform=x11
+ Received:  --ozone-platform=wayland
```

O teste escreve um `config.yaml` com `electron_flags: [--ozone-platform=x11]` e espera que **a configuração
sobreponha** a detecção automática. **Ela não sobrepõe.**

## O padrão que separa os dois grupos

**Os 2 que passam não leem config.** Eles só olham variáveis de ambiente (`XDG_SESSION_TYPE`, `WSL_DISTRO_NAME`).

**Os 3 que falham precisam que o `config.yaml` seja lido.**

> **A detecção de Wayland funciona. A leitura do arquivo de configuração, não.**

## O que isso significa, e o que não significa

| Pergunta | Resposta |
|---|---|
| Afeta o usuário Windows? | **provavelmente não** — `ozone-platform` é conceito de Linux |
| Afeta outra leitura de config? | **não sei** — pode ser só este caminho, pode ser o leitor inteiro |
| É defeito de produto ou ambiente? | **indeterminado** |

## Por que não vou chamar de "ambiente" e encerrar

O teste **roda no Windows** e **falha onde precisa de arquivo**. Isso é compatível com:

1. **Caminho Windows diferente** do que o teste monta (`home` com `/` vs `\`) — ambiente;
2. **Leitor YAML ausente** no ambiente de teste — ambiente;
3. **Bug real na resolução de `HERMES_HOME` no Windows** — **defeito**.

**As três produzem o mesmo sintoma.** E eu **não medi qual é**.

## O placar revisado

| Causa | Qtd | Natureza |
|---|---|---|
| `python3` stub da Store | 13 | ambiente |
| `EPERM` em symlink | 12 | ambiente |
| **config não lido em `bundle-electron-main`** | **3** | **indeterminado** |
| lock lento no Windows | 1 | comportamento de produto |
| `ruamel`/`hermes_cli` ausentes | 1 | ambiente |
| Ferramenta Windows ausente | 1 | ambiente |
| CRLF | 1 | ambiente |
| fixture sem export | 1 | ambiente de teste |
| `sun_path` longo | 1 | ambiente |
| Variável do host | 1 | ambiente |
| Outros timeouts | 5 | **não investigados** |
| | **40** | **34 ambiente · 1 produto · 8 indeterminados** |

## A afirmação que eu posso sustentar hoje

> **34 de 40 falhas têm causa de ambiente comprovada. 1 é comportamento de produto (lock lento). 3 têm sintoma
> claro (config não lido) mas causa não determinada. 2 continuam sem investigação.**

**"Todas de ambiente" era falso. "39 de 40" também não era.** O número honesto é **34 + 1 + 3 + 2**.
