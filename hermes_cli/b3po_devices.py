"""Registro de dispositivos autorizados a enviar prompt (GOAL §16 / envio pelo celular).

Um dispositivo pareado recebe uma **chave** uma única vez, no link de pareamento. O servidor guarda
apenas o **hash** dessa chave — igual a senha, não igual a token de sessão. Quem tem a chave pode pedir
um ticket de gateway curto para o perfil autorizado; não pode ler configuração, não pode trocar
provider, não pode aprovar ação sensível.

Regras que este módulo impõe (e os testes provam):

- a chave **nunca** é gravada nem devolvida depois da criação;
- comparação de chave em tempo constante (``hmac.compare_digest``);
- dispositivo revogado recusa mesmo com a chave correta;
- chave válida para um perfil não serve para outro (escopo)
- janela de taxa por dispositivo, para conter abuso de ticket;
- arquivo de estado é escrito de forma atômica (tmp + replace): falha no meio não corrompe o cofre.

Este módulo é a camada de decisão; a rota HTTP que minta o ticket fica em ``web_routers/b3po_devices``.
"""

from __future__ import annotations

import hashlib
import hmac
import json
import os
import secrets
import tempfile
from dataclasses import asdict, dataclass, field
from pathlib import Path
from typing import Any, Optional

KEY_BYTES = 32
MIN_LABEL = 1
DEFAULT_RATE_LIMIT = 20
DEFAULT_RATE_WINDOW_MS = 60_000


class DeviceError(RuntimeError):
    """Recusa de autorização, com código estável para a rota mapear em status HTTP."""

    def __init__(self, code: str):
        super().__init__(code)
        self.code = code


def _hash_key(key: str) -> str:
    return hashlib.sha256(key.encode("utf-8")).hexdigest()


@dataclass
class DeviceRecord:
    device_id: str
    label: str
    profile_id: str
    key_sha256: str
    created_at: int
    last_seen_at: Optional[int] = None
    revoked_at: Optional[int] = None
    tickets_minted: int = 0
    recent_tickets: list[int] = field(default_factory=list)

    @property
    def revoked(self) -> bool:
        return self.revoked_at is not None

    def as_json(self) -> dict[str, Any]:
        return asdict(self)


def new_device_id() -> str:
    return "dev-" + secrets.token_hex(8)


def create_device(*, label: str, profile_id: str, now: int, device_id: Optional[str] = None) -> tuple[DeviceRecord, str]:
    """Cria o registro e devolve ``(record, key)``. A chave em claro sai daqui uma única vez."""
    clean_label = (label or "").strip()
    clean_profile = (profile_id or "").strip()

    if len(clean_label) < MIN_LABEL or not clean_profile:
        raise DeviceError("invalid_input")

    key = secrets.token_urlsafe(KEY_BYTES)
    record = DeviceRecord(
        device_id=device_id or new_device_id(),
        label=clean_label,
        profile_id=clean_profile,
        key_sha256=_hash_key(key),
        created_at=now,
    )
    return record, key


def verify_key(record: DeviceRecord, key: str) -> None:
    """Levanta ``DeviceError`` quando a chave não autoriza. Não consome nada."""
    if record.revoked:
        raise DeviceError("revoked")

    if not isinstance(key, str) or not key:
        raise DeviceError("invalid_key")

    if not hmac.compare_digest(_hash_key(key), record.key_sha256):
        raise DeviceError("invalid_key")


def authorize(
    record: DeviceRecord,
    *,
    key: str,
    profile_id: str,
    now: int,
    limit: int = DEFAULT_RATE_LIMIT,
    window_ms: int = DEFAULT_RATE_WINDOW_MS,
) -> DeviceRecord:
    """Autoriza um pedido de ticket: chave, escopo e taxa. Devolve o registro atualizado.

    A taxa é contada em ``recent_tickets`` dentro da janela — sem isso, uma chave vazada poderia
    abrir sockets sem limite enquanto não fosse revogada.
    """
    verify_key(record, key)

    if (profile_id or "").strip() != record.profile_id:
        raise DeviceError("scope_mismatch")

    window_start = now - window_ms
    recent = [stamp for stamp in record.recent_tickets if stamp > window_start]

    if len(recent) >= limit:
        raise DeviceError("rate_limited")

    recent.append(now)
    record.recent_tickets = recent[-limit:]
    record.last_seen_at = now
    record.tickets_minted += 1
    return record


def revoke_device(record: DeviceRecord, *, now: int) -> DeviceRecord:
    if record.revoked:
        return record

    record.revoked_at = now
    record.recent_tickets = []
    return record


def public_view(record: DeviceRecord) -> dict[str, Any]:
    """O que a tela de Dispositivos pode mostrar: nunca o hash, nunca a chave."""
    return {
        "device_id": record.device_id,
        "label": record.label,
        "profile_id": record.profile_id,
        "created_at": record.created_at,
        "last_seen_at": record.last_seen_at,
        "revoked": record.revoked,
        "tickets_minted": record.tickets_minted,
    }


def save_devices(path: Path, records: list[DeviceRecord]) -> None:
    """Escrita atômica: um erro no meio não deixa arquivo pela metade."""
    path = Path(path)
    path.parent.mkdir(parents=True, exist_ok=True)
    payload = {"schema": 1, "devices": [record.as_json() for record in records]}

    handle, temp_name = tempfile.mkstemp(dir=str(path.parent), prefix=".b3po-devices-", suffix=".json")
    try:
        with os.fdopen(handle, "w", encoding="utf-8") as stream:
            json.dump(payload, stream, ensure_ascii=False, indent=2, sort_keys=True)
        os.replace(temp_name, path)
    finally:
        if os.path.exists(temp_name):
            os.unlink(temp_name)


def load_devices(path: Path) -> list[DeviceRecord]:
    path = Path(path)
    if not path.exists():
        return []

    try:
        raw = json.loads(path.read_text(encoding="utf-8-sig"))
    except (json.JSONDecodeError, OSError):
        # Cofre ilegível não libera ninguém: devolve vazio (fail closed).
        return []

    items = raw.get("devices") if isinstance(raw, dict) else None
    if not isinstance(items, list):
        return []

    records: list[DeviceRecord] = []
    for item in items:
        if not isinstance(item, dict):
            continue
        try:
            records.append(
                DeviceRecord(
                    device_id=str(item["device_id"]),
                    label=str(item["label"]),
                    profile_id=str(item["profile_id"]),
                    key_sha256=str(item["key_sha256"]),
                    created_at=int(item["created_at"]),
                    last_seen_at=item.get("last_seen_at"),
                    revoked_at=item.get("revoked_at"),
                    tickets_minted=int(item.get("tickets_minted", 0)),
                    recent_tickets=[int(stamp) for stamp in item.get("recent_tickets", [])],
                )
            )
        except (KeyError, TypeError, ValueError):
            # Registro corrompido é ignorado; não derruba o cofre inteiro.
            continue
    return records


def find_device(records: list[DeviceRecord], device_id: str) -> Optional[DeviceRecord]:
    for record in records:
        if record.device_id == device_id:
            return record
    return None
