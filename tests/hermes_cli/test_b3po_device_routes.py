"""Testes da rota de ticket de dispositivo (envio de prompt pelo celular).

A rota é chamada diretamente (sem subir o app inteiro): o que interessa aqui é a decisão —
quem recebe ticket, quem é recusado, com qual status e sem vazar segredo.
"""

import json
from pathlib import Path

import pytest
from fastapi import HTTPException

from hermes_cli import b3po_devices as store
from hermes_cli.web_routers import b3po_devices as routes


@pytest.fixture
def device_file(tmp_path: Path, monkeypatch):
    path = tmp_path / "b3po" / "devices.json"
    monkeypatch.setattr(routes, "device_store_path", lambda: path)
    return path


def _pair(label="celular", profile="revisor-codigo"):
    """Cria um dispositivo pela própria rota de pareamento e devolve (device, key)."""
    import asyncio

    result = asyncio.run(routes.b3po_device_pair(routes.PairRequest(label=label, profile=profile)))

    return result["device"], result["key"]


def test_pair_returns_key_once_and_hides_it_in_the_device_view(device_file: Path):
    device, key = _pair()

    assert key
    assert "key" not in device
    assert "key_sha256" not in device
    assert device_file.exists()
    assert key not in device_file.read_text(encoding="utf-8")


def test_ticket_is_minted_for_the_paired_device(device_file: Path):
    import asyncio

    device, key = _pair()
    result = asyncio.run(
        routes.b3po_device_ticket(routes.TicketRequest(), x_b3po_device_key=key)
    )

    assert result["ticket"]
    assert result["profile"] == device["profile_id"]
    assert result["ttl_seconds"] > 0


def test_missing_key_is_401(device_file: Path):
    import asyncio

    _pair()

    with pytest.raises(HTTPException) as error:
        asyncio.run(routes.b3po_device_ticket(routes.TicketRequest(), x_b3po_device_key=None))

    assert error.value.status_code == 401
    assert error.value.detail == "invalid_key"


def test_wrong_key_is_401_with_the_same_detail(device_file: Path):
    import asyncio

    _pair()

    with pytest.raises(HTTPException) as error:
        asyncio.run(routes.b3po_device_ticket(routes.TicketRequest(), x_b3po_device_key="chave-errada"))

    # mesma mensagem de chave ausente: não enumera dispositivos
    assert error.value.status_code == 401
    assert error.value.detail == "invalid_key"


def test_revoked_device_cannot_get_a_ticket(device_file: Path):
    import asyncio

    device, key = _pair()
    asyncio.run(routes.b3po_device_revoke(device["device_id"]))

    with pytest.raises(HTTPException) as error:
        asyncio.run(routes.b3po_device_ticket(routes.TicketRequest(), x_b3po_device_key=key))

    assert error.value.status_code == 401
    assert error.value.detail in {"invalid_key", "revoked"}


def test_profile_outside_scope_is_403(device_file: Path):
    import asyncio

    _, key = _pair(profile="revisor-codigo")

    with pytest.raises(HTTPException) as error:
        asyncio.run(
            routes.b3po_device_ticket(
                routes.TicketRequest(profile="analista-financeiro"), x_b3po_device_key=key
            )
        )

    assert error.value.status_code == 403
    assert error.value.detail == "scope_mismatch"


def test_rate_limit_returns_429(device_file: Path):
    import asyncio

    _, key = _pair()

    for _ in range(store.DEFAULT_RATE_LIMIT):
        asyncio.run(routes.b3po_device_ticket(routes.TicketRequest(), x_b3po_device_key=key))

    with pytest.raises(HTTPException) as error:
        asyncio.run(routes.b3po_device_ticket(routes.TicketRequest(), x_b3po_device_key=key))

    assert error.value.status_code == 429


def test_devices_list_never_leaks_the_hash(device_file: Path):
    import asyncio

    _pair()
    listing = asyncio.run(routes.b3po_devices_list())

    serialized = json.dumps(listing)
    assert "key_sha256" not in serialized
    assert "key" not in listing["devices"][0]
    assert listing["devices"][0]["profile_id"] == "revisor-codigo"


def test_revoke_unknown_device_is_404(device_file: Path):
    import asyncio

    with pytest.raises(HTTPException) as error:
        asyncio.run(routes.b3po_device_revoke("dev-nao-existe"))

    assert error.value.status_code == 404


def test_ticket_attributes_it_to_the_device_not_a_user_login(device_file: Path):
    """O ticket precisa carregar a identidade do dispositivo, não a de um usuário logado."""
    import asyncio

    from hermes_cli.dashboard_auth.ws_tickets import consume_ticket

    device, key = _pair()
    result = asyncio.run(routes.b3po_device_ticket(routes.TicketRequest(), x_b3po_device_key=key))
    info = consume_ticket(result["ticket"])

    assert info["provider"] == "b3po-device"
    assert info["device_id"] == device["device_id"]
    assert info["user_id"].startswith("b3po-device:")

def test_device_ticket_path_is_public_but_self_authenticating():
    """Contrato entre a rota e o gate: a rota precisa ser pública (o celular não tem login),
    e a segurança vem da chave do dispositivo verificada no próprio handler."""
    from hermes_cli.dashboard_auth.public_paths import PUBLIC_API_PATHS

    assert "/api/b3po/device-ticket" in PUBLIC_API_PATHS
    # o pareamento NÃO é público: só o desktop autenticado cria dispositivo
    assert "/api/b3po/devices" not in PUBLIC_API_PATHS
