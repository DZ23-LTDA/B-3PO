# B-3PO — BLOCKERS

**Checkpoint do §23** · atualizado em 2026-11-06T05:40:00-03:00 · commit `ae4829c5f0`

---

## BLOQUEIOS ATIVOS

| # | Item | Estado | Por quê |
|---|---|---|---|
| **B1** | **Assinatura Authenticode** | **BLOCKED_BY_EXTERNAL_DEPENDENCY** | `AZURE_SIGN_*` não existe nesta máquina |
| **B2** | **Marketplace BR** | BLOCKED | §16, sem credencial |
| **B3** | **WhatsApp Cloud API** | BLOCKED | §16, sem credencial |
| **B4** | **Gateway de pagamento** | BLOCKED | §16, sem credencial |
| **B5** | **Instalação real do MSIX** | **não testada** | exige instalar o pacote no Windows |
| **B6** | **Foco, tabulação, contraste** | não auditado | exige o app aberto |
| **B7** | **Filtro do ambiente na barra lateral** | **BLOCKED** | o host e app/chat/sidebar - codigo do upstream; o SidebarNavContribution NAO TEM PREDICADO DE VISIBILIDADE (medido na r171) |
| **B8** | **channel-build-version sob carga** | **BLOQUEADO_POR_TERCEIRO** | concorrencia no Msix/app-builder-lib: 1 de 4 testes falha so na suite completa. retry: 1 no config cobre (r203), mas o teste segue vulneravel ao redor da biblioteca |

> **O §22 diz**: *"Se uma credencial/serviço/hardware faltar, registrar BLOCKED_BY_EXTERNAL_DEPENDENCY e continuar tarefas independentes. **Nunca declarar sucesso simulado.**"*

---

## O QUE **NÃO** É BLOQUEIO — e por isso não está aqui

### As 13 falhas do `electron` — seis causas, nenhuma do produto (r228)

| Arquivo | Falhas | Causa | Natureza |
|---|---|---|---|
| `ssh-connection` | **4 de 89** | **`sun_path`** de 108 bytes e **sinais POSIX** | plataforma |
| `run-electron-builder` | **1 de 5** | **`prepared-packaging`** recusa os inputs | hospedeiro |
| `bundle-electron-main` | **3 de 5** | **`desktop.electron_flags`** não lido | hospedeiro |
| `desktop-plugin-install` | **3 de 54** | **CRLF do git em mais de um ponto** (`add`, `checkout`, `archive`) - o symlink saiu com `skipIf` na r233 | ambiente |
| `audit-store` | **2 de 13** (intermitente) | **flaky de longa data** - aparece e desaparece desde a r154 | ambiente |

> **A soma não é a soma das linhas**: em 06/11/2026 (r236) os quatro primeiros deram **11** e o total medido foi **13**, porque o `audit-store` entrou com 2. **Em outra rodada ele pode não entrar, e o total cai sem que nenhum arquivo mude.**
>
> **É por isso que esta tabela lista CAUSAS, não um total**: um total que muda de 11 para 13 sem código novo não informa nada.

> **Cinco são diferenças de plataforma; uma é uma garantia do app hospedeiro que não está sendo cumprida.**
> **Nenhuma é do B-3PO, e nenhuma é um defeito de funcionalidade do produto.**
>
> **A linha `13 failed | 5451 passed` é o mesmo número que esta tabela, sem a informação que a torna útil.**
> **Um vermelho sem causa é uma suspeita; um vermelho com causa é um fato sobre a máquina.**


| Item | Por quê |
|---|---|
| **26 testes falhando** | **ambiente**: eram 41 na r111; **a r188 resolveu o python3** (o globalSetup pulava no Windows) e **a r203 pôs
etry: 1**. Os 26 que restam são plugins, SSH, build de Electron, Linux e instalação |
| **shiki 19.5 MB** | **dívida medida**, não bloqueio (r112) |
| **2 imports dinâmicos ineficazes** | **dívida medida** (r112) |
| **MSIX não assinado** | **o próprio build diz**: `reason=Windows Store only build` |

> **Um bloqueio é uma parede. Uma dívida é um preço.** Misturar as duas faz o relatório mentir.

---

## O QUE **JÁ FOI** BLOQUEIO E SAIU

| Era | Ficou | Rodada |
|---|---|---|
| logística não existia | as 6 camadas | r56–r60 |
| MSIX em `0.0.0` | `1.0.0` verificado no manifesto | r114 |
| ambiguidade de dois MSIX | um só | r115 |
