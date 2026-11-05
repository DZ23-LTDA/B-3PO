# B-3PO — BLOCKERS

**Checkpoint do §23** · atualizado em 2026-11-05T15:58:32-03:00 · commit `df02a3d738c3`

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
| **B7** | **Filtro do ambiente na barra lateral** | **BLOCKED** | o host é pp/chat/sidebar — código do upstream |

> **O §22 diz**: *"Se uma credencial/serviço/hardware faltar, registrar BLOCKED_BY_EXTERNAL_DEPENDENCY e continuar tarefas independentes. **Nunca declarar sucesso simulado.**"*

---

## O QUE **NÃO** É BLOQUEIO — e por isso não está aqui

| Item | Por quê |
|---|---|
| **41 testes falhando** | **ambiente**: `python3` não existe no Windows (r111) |
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
