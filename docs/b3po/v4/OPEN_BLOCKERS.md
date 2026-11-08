---
tipo: documento-v4
agente: dsh
projeto: c3po-bot
data: 2026-11-07
---

# OPEN_BLOCKERS — o que impede o quê, e o comando exato que destrava

> Todo bloqueio aqui é **`BLOCKED_BY_EXTERNAL_DEPENDENCY`**: falta credencial, hardware, permissão ou
> dado. **Nenhum é bloqueio por falta de trabalho meu.** Classificação do GOAL V4, linha 27.

## Bloqueios externos

| ID | Bloqueio | Impede | Comando / ação exata |
|---|---|---|---|
| **EXT-3** | Sem certificado Authenticode | release assinado · instalador confiável | obter certificado e assinar o `.exe`; hoje `NOT_READY` |
| **EXT-4** | Sem macOS | iOS inteiro · build macOS | rodar `npm run build` num macOS com Xcode |
| **EXT-6** | Sem credencial de plataforma | conector ativo ponta a ponta | `hermes auth add <provider>` **ou** `<PLATAFORMA>_BOT_TOKEN` no `.env` do perfil + reiniciar o gateway |
| **EXT-7** | Developer Mode do Windows desligado (`AppModelUnlock` ausente) | **3** testes de `desktop-plugin-install` (de 54) | `ms-settings:developers` → ligar Modo de Desenvolvedor. **Não alterei — é configuração de segurança do SO** |
| **EXT-8** | Emulador instável (`systemui` em ANR) | inspeção contínua do mobile | `adb shell am force-stop com.android.systemui` (+ tap em "Aguarde"). **Sem `-wipe-data`** — foi assim que destravou na r18 |
| **EXT-9** | Sem GPU Linux nesta máquina | `linux-nvidia-egl-recovery` (2 testes) | rodar num host com GPU NVIDIA |

## Bloqueios de verificação (não de produto)

| Item | Estado | Por quê |
|---|---|---|
| Suíte completa do gateway | `NOT_TESTED` | 13.337 testes, >30 min; rodei até 44% e interrompi |
| `test_boot_reserve_lock_probe.py` | não coleta | `import fcntl` — Unix-only |
| `test_feishu_card_action_gateway_authz.py` | não coleta **na pasta** | vazamento de estado entre módulos de teste; passa sozinho (17 testes) e importa direto. Invisível no CI, que isola por subprocesso |
| IDOR / multitenant | `NOT_TESTED` | exige threat model e dois tenants reais |
| Performance (LCP/INP/CLS) | `NOT_RUN` | não medi nesta sessão |

## Decisões que **só o dono** toma

| ID | Pergunta | Estado atual |
|---|---|---|
| **B-02g** | Um `kind: 'bot'` pode spawnar shell local pela interface? | `podeOperarMaquina` **não olha `kind`**; um bot com `EXECUTE_ALLOWED` **passa**. Comportamento **travado por teste** para que mudá-lo seja decisão consciente |
| **Plataformas** | portar os 6 modos ao mobile · rebrandar o web · assumir desktop como produto · focar em profundidade | recomendação registrada: **C e D são compatíveis** |
| **B-12b** | `h2` por painel de configurações | a página tem `h1` desde a r22; as seções internas continuam sem heading |

## O que **não** é bloqueio, apesar de parecer

| Aparência | Realidade |
|---|---|
| "27 falhas na suíte" | baseline histórico; **0 introduzidas**, classificação por nome em `BASELINE.md` §5 |
| "backend sem testes" | **coleta e roda**; a suíte completa é que não terminou (r9) |
| "settings vazio" | **errado meu (r19/r21)**; a tela renderiza, e o defeito real era a ausência de `h1`, corrigida na r22 |
| "110 falhas de symlink" | **eram 3**; número perpetuado por cópia de handoff |
