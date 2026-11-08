"""Connector readiness routes.

Exposes the honest readiness contract that :mod:`gateway.connector_readiness` computes.

WHY THIS EXISTS (r14 do V5, G4)

The contract was correct, tested (12 tests) and **had zero consumers**: a round of auditing found no
router, no IPC and no screen calling it. An operator who configures Telegram and it fails had nowhere
in the product to see *which* variable is missing.

WHAT THIS ROUTE PROMISES — AND WHAT IT DOES NOT

``ready`` means **able to connect when the gateway starts**, never *connected*. Nothing here starts a
connector or opens a socket. The payload carries variable **names**, never values: the readiness
module never reads a secret, and this route adds nothing it does not already return.

The read is blocking (it probes the platform registry), so it runs in a threadpool: the registry is
lazy and a cold process resolves each platform's adapter on demand.
"""

from __future__ import annotations

from typing import Any

from fastapi import APIRouter
from starlette.concurrency import run_in_threadpool

from gateway.connector_readiness import READY, all_connectors

router = APIRouter()


def _ler() -> dict[str, Any]:
    """Uma passada no registry: as linhas e o resumo derivam da MESMA leitura.

    ``summary()`` chama ``all_connectors()`` internamente; chamar os dois aqui resolveria o registry
    duas vezes. O resumo é calculado a partir das linhas que já temos.
    """
    linhas = all_connectors()
    por_status: dict[str, int] = {}

    for linha in linhas:
        por_status[linha["status"]] = por_status.get(linha["status"], 0) + 1

    return {
        "connectors": linhas,
        "resumo": {
            "por_status": por_status,
            "prontos": por_status.get(READY, 0),
            # Só nomes de variáveis: nunca um valor.
            "credenciais_faltando": sorted({nome for linha in linhas for nome in linha["missing_env"]}),
            "total": len(linhas),
        },
    }


@router.get("/api/connectors/readiness")
async def connectors_readiness() -> dict[str, Any]:
    """Prontidão de todos os conectores do gateway, por estado honesto."""
    return await run_in_threadpool(_ler)
