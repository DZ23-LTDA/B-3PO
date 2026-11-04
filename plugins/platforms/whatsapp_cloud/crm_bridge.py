"""Ponte do adapter oficial para o CRM do desktop.

O adapter e dono do CANAL (sessao do runtime). O CRM do B-3PO e dono da visao de produto. Este modulo apenas
**repassa** o payload ja recebido para o listener local do desktop, sem guardar nada e sem interpretar nada.

Tres propriedades que nao podem regredir:

1. **opcional**: sem `B3PO_CRM_INGEST_PORT` (ou token), `forward_to_crm` nao faz nada. Quem nao tem o desktop aberto nao
   paga nada;
2. **nao bloqueia o canal**: qualquer erro (timeout, conexao recusada, 4xx) e engolido. Mensagem do cliente nao pode
   deixar de ser respondida porque o CRM esta fechado;
3. **nao inventa autenticacao**: repassa a assinatura original da Meta. O desktop revalida — se este processo for
   comprometido e mandar corpo forjado, a assinatura nao fecha.

Sem `urllib` de terceiros e sem retry: o retry da Meta ja existe; duplicar aqui criaria tempestade.
"""

from __future__ import annotations

import json
import os
import urllib.error
import urllib.request
from typing import Any, Callable, Mapping, Optional

DEFAULT_TIMEOUT_SECONDS = 2.0


def crm_endpoint_port() -> Optional[int]:
    """Porta do listener local, ou None quando a ponte nao esta habilitada."""
    bruto = os.environ.get("B3PO_CRM_INGEST_PORT", "").strip()

    if not bruto:
        return None

    try:
        porta = int(bruto)
    except ValueError:
        return None

    return porta if 0 < porta < 65536 else None


def crm_token() -> Optional[str]:
    token = os.environ.get("B3PO_CRM_INGEST_TOKEN", "").strip()

    return token or None


def build_request(
    raw_body: bytes, signature: Optional[str], port: int, token: str
) -> tuple[str, dict[str, str]]:
    """Monta URL e headers do repasse. Funcao pura, para o contrato ser testavel sem socket."""
    headers = {
        "content-type": "application/json",
        "x-b3po-token": token,
    }

    if signature:
        headers["x-hub-signature-256"] = signature

    return f"http://127.0.0.1:{port}/", headers


def forward_to_crm(
    raw_body: bytes,
    signature: Optional[str],
    *,
    opener: Optional[Callable[..., Any]] = None,
    timeout: float = DEFAULT_TIMEOUT_SECONDS,
) -> Optional[int]:
    """Repassa o payload ao desktop. Devolve o status HTTP, ou None se a ponte esta desligada ou falhou.

    Nunca levanta excecao: o canal nao pode depender do CRM.
    """
    porta = crm_endpoint_port()
    token = crm_token()

    if porta is None or token is None:
        return None

    url, headers = build_request(raw_body, signature, porta, token)
    pedido = urllib.request.Request(url, data=raw_body, headers=headers, method="POST")
    abrir = opener or urllib.request.urlopen

    try:
        with abrir(pedido, timeout=timeout) as resposta:  # type: ignore[attr-defined]
            return int(getattr(resposta, "status", 200))
    except (urllib.error.URLError, OSError, ValueError, TimeoutError):
        return None


def payload_signature(headers: Mapping[str, str]) -> Optional[str]:
    """Le a assinatura do header como a Meta manda (case-insensitive)."""
    for chave, valor in headers.items():
        if chave.lower() == "x-hub-signature-256":
            return valor

    return None


def raw_json(payload: Any) -> bytes:
    return json.dumps(payload, ensure_ascii=False, separators=(",", ":")).encode("utf-8")
