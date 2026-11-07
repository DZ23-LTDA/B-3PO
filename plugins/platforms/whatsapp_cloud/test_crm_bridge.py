import io
import json
import urllib.error
from unittest.mock import patch

from plugins.platforms.whatsapp_cloud.crm_bridge import (
    build_request,
    crm_endpoint_port,
    crm_token,
    forward_to_crm,
    payload_signature,
    raw_json,
)


def test_sem_porta_nao_faz_nada(monkeypatch):
    monkeypatch.delenv("B3PO_CRM_INGEST_PORT", raising=False)
    monkeypatch.setenv("B3PO_CRM_INGEST_TOKEN", "tok")

    assert crm_endpoint_port() is None
    assert forward_to_crm(b"{}", None) is None


def test_porta_invalida_e_ignorada(monkeypatch):
    for lixo in ("", "abc", "0", "70000", "-1"):
        monkeypatch.setenv("B3PO_CRM_INGEST_PORT", lixo)
        assert crm_endpoint_port() is None, lixo


def test_sem_token_nao_faz_nada(monkeypatch):
    monkeypatch.setenv("B3PO_CRM_INGEST_PORT", "5555")
    monkeypatch.delenv("B3PO_CRM_INGEST_TOKEN", raising=False)

    assert crm_token() is None
    assert forward_to_crm(b"{}", None) is None


def test_build_request_repassa_a_assinatura_original():
    url, headers = build_request(b"{}", "sha256=abc", 4321, "tok")

    assert url == "http://127.0.0.1:4321/"
    assert headers["x-b3po-token"] == "tok"
    assert headers["x-hub-signature-256"] == "sha256=abc"


def test_build_request_sem_assinatura_nao_inventa_header():
    _, headers = build_request(b"{}", None, 4321, "tok")

    assert "x-hub-signature-256" not in headers


def test_forward_devolve_status_quando_o_desktop_responde(monkeypatch):
    monkeypatch.setenv("B3PO_CRM_INGEST_PORT", "5555")
    monkeypatch.setenv("B3PO_CRM_INGEST_TOKEN", "tok")

    class Resposta:
        status = 200

        def __enter__(self):
            return self

        def __exit__(self, *args):
            return False

    assert forward_to_crm(b"{}", "sha256=abc", opener=lambda *a, **k: Resposta()) == 200


def test_forward_engole_erro_de_conexao(monkeypatch):
    monkeypatch.setenv("B3PO_CRM_INGEST_PORT", "5555")
    monkeypatch.setenv("B3PO_CRM_INGEST_TOKEN", "tok")

    def explode(*args, **kwargs):
        raise urllib.error.URLError("conexao recusada")

    assert forward_to_crm(b"{}", None, opener=explode) is None


def test_forward_engole_http_error(monkeypatch):
    monkeypatch.setenv("B3PO_CRM_INGEST_PORT", "5555")
    monkeypatch.setenv("B3PO_CRM_INGEST_TOKEN", "tok")

    def nao_autorizado(*args, **kwargs):
        raise urllib.error.HTTPError("u", 401, "unauthorized", {}, io.BytesIO(b""))

    assert forward_to_crm(b"{}", None, opener=nao_autorizado) is None


def test_payload_signature_le_header_em_qualquer_caixa():
    assert payload_signature({"X-Hub-Signature-256": "sha256=1"}) == "sha256=1"
    assert payload_signature({"x-hub-signature-256": "sha256=2"}) == "sha256=2"
    assert payload_signature({}) is None


def test_raw_json_preserva_acento():
    assert json.loads(raw_json({"a": "sao joao"}).decode("utf-8")) == {"a": "sao joao"}
