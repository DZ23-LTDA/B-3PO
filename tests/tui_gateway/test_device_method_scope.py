"""Um ticket de dispositivo B-3PO so conversa: nao aprova, nao muda sessao, nao mexe em config.

Especificacao: ``docs/b3po/DEVICE-AUTHORIZATION.md``. O ticket e emitido por
``/api/b3po/device-ticket`` com ``provider="b3po-device"`` e vale para os verbos de sessao; o gateway
recusa o resto antes de despachar (``tui_gateway/ws.py::_dispatch_one``).
"""

import pytest

from tui_gateway import device_scope


@pytest.mark.parametrize(
    "method",
    ["session.resume", "session.events.since", "prompt.submit", "prompt.cancel", "session.interrupt"],
)
def test_session_verbs_are_allowed_for_a_device_ticket(method):
    assert device_scope.method_refusal({"provider": "b3po-device"}, method) is None


@pytest.mark.parametrize(
    "method",
    ["approval.respond", "session.mutate", "config.set", "tools.invoke", "session.create", "commands.catalog"],
)
def test_everything_else_is_refused_for_a_device_ticket(method):
    refusal = device_scope.method_refusal({"provider": "b3po-device"}, method)

    assert refusal, f"{method} deveria ser recusado para um ticket de dispositivo"
    assert method in refusal


def test_refusal_text_carries_no_client_data():
    """A mensagem vai para a tela e para o log: nada de ecoar parametro do cliente."""
    refusal = device_scope.method_refusal({"provider": "b3po-device"}, "config.set")

    assert refusal == "device session may not call config.set"


def test_other_credentials_keep_full_surface():
    """Dono logado, desktop local e harness sem identidade nao sao afetados pela regra do dispositivo."""
    for identity in ({"provider": "local"}, {"provider": "nous"}, None, {}):
        assert device_scope.method_refusal(identity, "config.set") is None


def test_a_device_ticket_without_a_method_name_is_refused():
    assert device_scope.method_refusal({"provider": "b3po-device"}, None)
    assert device_scope.method_refusal({"provider": "b3po-device"}, "")


# ─── O gateway de verdade recusa: a regra nao pode ficar so no modulo puro ───


def _drive_one_frame(monkeypatch, *, auth_identity, method):
    """Run the real ``handle_ws`` for one request frame and return (frames, methods the dispatcher saw)."""
    import asyncio
    import json

    from tui_gateway import server, ws as ws_mod

    seen = []
    frames = []

    def _dispatch(req, transport=None):
        seen.append(req.get("method"))
        return {"jsonrpc": "2.0", "result": {"ok": True}, "id": req.get("id")}

    monkeypatch.setattr(server, "dispatch", _dispatch)
    monkeypatch.setattr(server, "resolve_skin", dict)
    monkeypatch.setattr(server, "_ensure_skin_watcher", lambda: None)
    monkeypatch.setattr(server, "register_live_transport", lambda *_a, **_k: None)
    monkeypatch.setattr(server, "_start_backend_heartbeat_refresher", lambda: None)
    monkeypatch.setattr(server, "_schedule_startup_orphan_sweep", lambda: None, raising=False)
    monkeypatch.setattr(server, "_WS_ORPHAN_REAP_GRACE_S", 0)

    calls = {"gone": False}

    class FakeWS:
        async def accept(self):
            pass

        async def send_text(self, line):
            frames.append(json.loads(line))

        async def receive_text(self):
            if calls["gone"]:
                raise ws_mod._WebSocketDisconnect()

            calls["gone"] = True

            return json.dumps({"jsonrpc": "2.0", "id": 7, "method": method, "params": {}})

        async def close(self):
            pass

    asyncio.run(ws_mod.handle_ws(FakeWS(), auth_identity=auth_identity))

    return frames, seen


def test_device_ticket_cannot_approve_through_the_real_gateway(monkeypatch):
    frames, seen = _drive_one_frame(monkeypatch, auth_identity={"provider": "b3po-device"}, method="approval.respond")

    errors = [f["error"] for f in frames if f.get("id") == 7 and "error" in f]

    assert errors and errors[0]["code"] == device_scope.DEVICE_METHOD_FORBIDDEN
    assert "approval.respond" not in seen, "o pedido recusado nao pode ter chegado ao dispatcher"


def test_device_ticket_can_still_submit_a_prompt(monkeypatch):
    frames, seen = _drive_one_frame(monkeypatch, auth_identity={"provider": "b3po-device"}, method="prompt.submit")

    assert "prompt.submit" in seen
    assert not [f for f in frames if f.get("id") == 7 and "error" in f]


def test_the_owner_credential_is_untouched_by_the_device_rule(monkeypatch):
    frames, seen = _drive_one_frame(monkeypatch, auth_identity={"provider": "local"}, method="approval.respond")

    assert "approval.respond" in seen
    assert not [f for f in frames if f.get("id") == 7 and "error" in f]
