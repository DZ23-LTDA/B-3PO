"""T-06 — prontidão de um conector externo, sem usar credencial real.

O QUE ESTE MÓDULO RESPONDE

*"Para este conector ficar ATIVO, o que falta — e o que exatamente eu faço agora?"*

Ele existe porque a resposta anterior era um booleano mudo: `configured: 0`. Quem opera não sabia se
faltava token, se faltava dependência, ou se a plataforma simplesmente não estava escolhida.

TRÊS GARANTIAS, e as três são o motivo de o arquivo ser puro

1. **Nunca lê nem devolve valor de segredo.** Compara nomes de variável de ambiente e devolve
   `missing_env: ["TELEGRAM_BOT_TOKEN"]` — o **nome**, jamais o conteúdo. Uma função que devolvesse o
   valor vazaria credencial por log, por tela e por relatório.
2. **Nunca inventa o que falta.** A lista de credenciais vem do `PlatformEntry.required_env` do
   próprio adapter (o mesmo campo que o `hermes setup` usa). Se a plataforma não está no registry,
   o resultado é `unknown_platform` — não um palpite.
3. **Nunca toca a rede.** `check_fn` é uma sonda **passiva** de dependência (importável agora), por
   contrato do registry; `is_connected` lê a configuração. Nenhuma conexão é tentada aqui.

POR QUE ISSO É "PREPARAR SEM CREDENCIAL"

A integração fica provada até o limite do que não exige segredo: o adapter existe, as dependências
são sondáveis, a configuração é lida, e o que falta é **nomeado com a ação de desbloqueio**. O que
não dá para provar sem credencial é dito como tal — não simulado.
"""

from __future__ import annotations

import os
from collections.abc import Mapping
from typing import Any

#: Estados possíveis. Enum de string para atravessar JSON sem conversão.
READY = "ready"
MISSING_CREDENTIAL = "missing_credential"
DEPS_MISSING = "deps_missing"
NOT_CONFIGURED = "not_configured"
UNKNOWN_PLATFORM = "unknown_platform"


def _env_present(nome: str, env: Mapping[str, str]) -> bool:
    return bool(str(env.get(nome) or "").strip())


def _next_action(status: str, entry: Any, missing: list[str]) -> str:
    """A ação concreta, escrita para quem opera — não para quem programa."""
    if status == UNKNOWN_PLATFORM:
        return "Instale/registre o plugin que traz esta plataforma; o registry não a conhece."

    if status == MISSING_CREDENTIAL:
        nomes = ", ".join(missing)

        return f"Defina {nomes} (config.yaml não guarda segredo: use o .env do perfil) e reinicie o gateway."

    if status == DEPS_MISSING:
        return str(getattr(entry, "install_hint", "") or "Instale as dependências desta plataforma.")

    if status == NOT_CONFIGURED:
        return "Escolha esta plataforma na configuração do gateway para que ela suba."

    return "Nada a fazer: o conector está pronto para conectar quando o gateway subir."


def connector_readiness(platform: str, *, env: Mapping[str, str] | None = None) -> dict[str, Any]:
    """Prontidão de UMA plataforma. `env` é injetável para o teste não depender da máquina."""
    from gateway.platform_registry import platform_registry

    ambiente: Mapping[str, str] = env if env is not None else os.environ
    entry = platform_registry.get(platform)

    if entry is None:
        return {
            "next_action": _next_action(UNKNOWN_PLATFORM, None, []),
            "platform": platform,
            "required_env": [],
            "missing_env": [],
            "status": UNKNOWN_PLATFORM,
        }

    required = [str(n) for n in (getattr(entry, "required_env", None) or [])]
    missing = [n for n in required if not _env_present(n, ambiente)]

    # Sonda PASSIVA de dependência: por contrato do registry é import-check, sem efeito colateral.
    try:
        deps_ok = bool(entry.check_fn())
    except Exception:  # health: allow BLE001 -- sonda de dependencia de terceiro: qualquer excecao aqui significa "nao importavel", que e exatamente o que a sonda responde
        deps_ok = False

    if missing:
        status = MISSING_CREDENTIAL
    elif not deps_ok:
        status = DEPS_MISSING
    else:
        status = READY
        # `is_connected` responde "esta plataforma está escolhida?"; sem ele não há como saber.
        probe = getattr(entry, "is_connected", None) or getattr(entry, "validate_config", None)

        if probe is not None:
            try:
                if not probe(None):
                    status = NOT_CONFIGURED
            except Exception:  # health: allow BLE001 -- probe de configuracao de terceiro: um probe que exige PlatformConfig real levanta TypeError, e isso NAO e "nao configurado" (ver comentario abaixo)
                # Um probe que exige um PlatformConfig real não decide prontidão de credencial:
                # mantém READY. Inventar NOT_CONFIGURED aqui seria adivinhar.
                status = READY

    return {
        "next_action": _next_action(status, entry, missing),
        "platform": platform,
        "required_env": required,
        "missing_env": missing,
        "status": status,
    }


def all_connectors(*, env: Mapping[str, str] | None = None) -> list[dict[str, Any]]:
    """Prontidão de todas as plataformas registradas, ordenada por nome.

    r107 — enumera por `registered_names()`, não por `all_entries()`.

    O registry é **lazy** e `all_entries()` resolve TODOS os loaders de uma vez — caro, e vazio num
    processo que ainda não importou os adapters. `registered_names()` devolve os nomes **sem**
    carregar nada, e `connector_readiness()` (que chama `get()` por plataforma) resolve só o loader
    daquela. O resultado é o mesmo quando o registry está quente, e passa a ser **correto** quando
    está frio — em vez de `[]` silencioso.
    """
    from gateway.platform_registry import platform_registry

    nomes = sorted(platform_registry.registered_names())

    return [connector_readiness(nome, env=env) for nome in nomes]


def summary(*, env: Mapping[str, str] | None = None) -> dict[str, Any]:
    """Contagem por estado — o que o dashboard mostra sem abrir 27 linhas."""
    linhas = all_connectors(env=env)
    por_status: dict[str, int] = {}

    for linha in linhas:
        por_status[linha["status"]] = por_status.get(linha["status"], 0) + 1

    return {
        "por_status": por_status,
        "prontos": por_status.get(READY, 0),
        "total": len(linhas),
        # Nunca há credencial aqui: só nomes de variáveis ausentes.
        "credenciais_faltando": sorted(
            {nome for linha in linhas for nome in linha["missing_env"]},
        ),
    }
