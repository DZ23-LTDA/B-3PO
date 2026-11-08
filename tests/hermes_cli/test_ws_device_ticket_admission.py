"""O gate de upgrade aceita o ticket de dispositivo em modo gated e carimba a identidade certa.

Fecha a cadeia que o teste de recusa (`tests/tui_gateway/test_device_method_scope.py`) deixa aberta: la se
prova que `provider="b3po-device"` e recusado fora dos verbos de sessao; aqui se prova que um ticket de
dispositivo **vira** essa identidade no upgrade — e que no modo loopback (token estatico) ele nao abre a
rota, que era a causa real do HTTP 403 visto na prova ao vivo.
"""

from types import SimpleNamespace

import pytest


class _Headers(dict):
    def items(self):
        return super().items()


class _FakeWS:
    """O mínimo que `_ws_auth_reason` toca num upgrade real."""

    def __init__(self, query, *, headers=None, host="127.0.0.1"):
        self.query_params = dict(query)
        self.headers = _Headers(headers or {})
        self.client = SimpleNamespace(host=host)
        self.url = SimpleNamespace(path="/api/ws")
        self.scope = {}
        self.app = SimpleNamespace(state=SimpleNamespace())


@pytest.fixture
def gated_app(monkeypatch):
    """Coloca o app do dashboard em modo gated (login), como numa implantacao real."""
    from hermes_cli import web_server

    monkeypatch.setattr(web_server.app.state, "auth_required", True, raising=False)

    return web_server.app


def _mint_device_ticket():
    from hermes_cli.dashboard_auth.ws_tickets import mint_ticket

    return mint_ticket(user_id="b3po-device:dev-1", provider="b3po-device", issuer="b3po",
                       extra={"device_id": "dev-1", "profile": "default"})


def test_gated_gate_accepts_a_device_ticket_and_stamps_device_identity(gated_app):
    from hermes_cli.web_server_chat import _ws_auth_reason

    ws = _FakeWS({"ticket": _mint_device_ticket()})

    reason, credential = _ws_auth_reason(ws, socket="gateway")

    assert reason is None, f"gate recusou o ticket de dispositivo: {reason}"
    assert credential == "ticket"
    assert ws._hermes_auth_identity["provider"] == "b3po-device"
    assert ws._hermes_auth_identity["user_id"] == "b3po-device:dev-1"


def test_loopback_gate_does_not_accept_a_ticket(monkeypatch):
    """A causa do HTTP 403 da prova ao vivo: sem login, `?ticket=` so abre a superficie webapp."""
    from hermes_cli import web_server
    from hermes_cli.web_server_chat import _ws_auth_reason

    monkeypatch.setattr(web_server.app.state, "auth_required", False, raising=False)
    monkeypatch.setattr(web_server.app.state, "ui_surface", "dashboard", raising=False)

    ws = _FakeWS({"ticket": _mint_device_ticket()})

    reason, _credential = _ws_auth_reason(ws, socket="gateway")

    assert reason == "no_credential"
