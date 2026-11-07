"""O que um ticket de dispositivo B-3PO pode chamar no gateway.

Um ticket de dispositivo (`provider="b3po-device"`, emitido por `/api/b3po/device-ticket`) existe para o
celular falar com UM bot: ler a conversa e mandar/parar turno. Ele nao e um login do dono — nao pode
mexer em sessao, aprovar acao, trocar config nem falar com ferramentas. Sem esta lista, o ticket valia
como qualquer outro login e a separacao de capacidades que o pareamento promete nao existia.

A regra vive aqui, fora do transporte, para poder ser testada sem WebSocket; `tui_gateway/ws.py` apenas
consulta antes de despachar.
"""

from __future__ import annotations

from typing import Optional

#: Verbos de sessao que o dispositivo precisa para conversar com o bot.
DEVICE_SESSION_METHODS = frozenset(
    {
        "session.resume",
        "session.events.since",
        "prompt.submit",
        "prompt.cancel",
        "session.interrupt",
        "subagent.list",
        "subagent.tail",
    }
)

#: Erro devolvido ao cliente. 4030 fica fora da faixa do JSON-RPC e da faixa 4000/4001 de params para o
#: cliente distinguir "seu ticket nao vale para isto" de "seu payload esta errado".
DEVICE_METHOD_FORBIDDEN = 4030


def is_device_ticket(identity: Optional[dict]) -> bool:
    """True when the WS-upgrade credential carried a B-3PO device ticket."""
    return isinstance(identity, dict) and identity.get("provider") == "b3po-device"


def method_refusal(identity: Optional[dict], method: object) -> Optional[str]:
    """Motivo da recusa, ou None quando o pedido pode seguir.

    Devolve texto fixo (nunca ecoa parametros): o cliente mostra a mensagem e o log fica sem dado do usuario.
    """
    if not is_device_ticket(identity):
        return None

    if not isinstance(method, str) or not method:
        return "device session requires a method name"

    if method in DEVICE_SESSION_METHODS:
        return None

    return f"device session may not call {method}"
