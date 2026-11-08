"""r14 do V5 (G4) — a rota que torna a prontidão de conectores alcançável.

O contrato em `gateway/connector_readiness.py` era correto, testado (12 testes) e **não tinha
consumidor nenhum**: nem router, nem IPC, nem tela. Um operador que configura o Telegram e falha não
tinha, no produto, onde ver qual variável falta.

Este arquivo prova a rota:
  - ela responde com as linhas e o resumo;
  - o resumo é derivado da MESMA leitura (não resolve o registry duas vezes);
  - **nunca** carrega valor de credencial — só nomes de variável.
"""

from __future__ import annotations

from fastapi import FastAPI
from fastapi.testclient import TestClient

from hermes_cli.web_routers import connectors as connectors_routes


def _app() -> TestClient:
    app = FastAPI()
    app.include_router(connectors_routes.router)
    return TestClient(app)


def test_a_rota_responde_linhas_e_resumo():
    r = _app().get("/api/connectors/readiness")

    assert r.status_code == 200
    corpo = r.json()

    assert "connectors" in corpo
    assert "resumo" in corpo
    assert isinstance(corpo["connectors"], list)
    assert corpo["resumo"]["total"] == len(corpo["connectors"])


def test_o_resumo_bate_com_as_linhas(monkeypatch):
    """`resumo` deriva da MESMA leitura — `summary()` chamaria `all_connectors()` de novo."""

    def fake():
        return [
            {"platform": "a", "status": "ready", "required_env": [], "missing_env": [], "next_action": ""},
            {"platform": "b", "status": "missing_credential", "required_env": ["B_TOKEN"],
             "missing_env": ["B_TOKEN"], "next_action": ""},
            {"platform": "c", "status": "missing_credential", "required_env": ["B_TOKEN", "C_KEY"],
             "missing_env": ["B_TOKEN", "C_KEY"], "next_action": ""},
        ]

    monkeypatch.setattr(connectors_routes, "all_connectors", fake)

    corpo = _app().get("/api/connectors/readiness").json()

    assert corpo["resumo"]["total"] == 3
    assert corpo["resumo"]["prontos"] == 1
    assert corpo["resumo"]["por_status"] == {"ready": 1, "missing_credential": 2}
    # nomes de variavel, deduplicados e ordenados — nunca valores
    assert corpo["resumo"]["credenciais_faltando"] == ["B_TOKEN", "C_KEY"]


def test_ready_nao_significa_conectado(monkeypatch):
    """O contrato do goal: `ready` e "apto a conectar", nunca "conectado"."""

    monkeypatch.setattr(
        connectors_routes,
        "all_connectors",
        lambda: [{"platform": "x", "status": "ready", "required_env": ["X"], "missing_env": [],
                  "next_action": "Nada a fazer"}],
    )

    corpo = _app().get("/api/connectors/readiness").json()

    assert corpo["connectors"][0]["status"] == "ready"
    # Nao existe campo que afirme conexao ativa.
    assert "connected" not in corpo["connectors"][0]
    assert "conectado" not in corpo["connectors"][0]
