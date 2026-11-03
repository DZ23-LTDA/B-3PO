"""Rota de ticket de gateway para dispositivo pareado (envio de prompt pelo celular).

Fluxo: o celular guarda a chave recebida no pareamento; pede um ticket curto aqui; usa o ticket no
WebSocket do gateway. A chave nunca é persistida em claro e o ticket é de uso único.

Esta rota **não** autentica por sessão de dashboard: ela existe exatamente para o cliente pareado que
não tem login. Por isso a decisão de autorização é toda delegada a :mod:`hermes_cli.b3po_devices`, que
checa hash da chave, escopo do perfil, revogação e taxa antes de qualquer ticket ser mintado.

Erros → status HTTP:

===========================  ======
``invalid_key``               401
``revoked``                    401
``scope_mismatch``             403
``rate_limited``               429
``invalid_input``              400
===========================  ======
"""

from __future__ import annotations

import time
from pathlib import Path
from typing import Optional

from fastapi import APIRouter, Header, HTTPException
from fastapi.responses import JSONResponse
from pydantic import BaseModel

from hermes_cli.b3po_devices import (
    DeviceError,
    authorize,
    create_device,
    find_device,
    load_devices,
    public_view,
    revoke_device,
    save_devices,
    verify_key,
)

router = APIRouter()

DEVICE_KEY_HEADER = "x-b3po-device-key"

_STATUS = {
    "invalid_key": 401,
    "revoked": 401,
    "scope_mismatch": 403,
    "rate_limited": 429,
    "invalid_input": 400,
}


def device_store_path() -> Path:
    """Cofre fica no home do perfil ativo, ao lado do resto do estado do produto."""
    from hermes_constants import get_hermes_home

    return Path(get_hermes_home()) / "b3po" / "devices.json"


class TicketRequest(BaseModel):
    profile: Optional[str] = None


class PairRequest(BaseModel):
    label: str
    profile: str


def _raise(error: DeviceError) -> None:
    raise HTTPException(status_code=_STATUS.get(error.code, 400), detail=error.code)


@router.post("/api/b3po/device-ticket", name="b3po_device_ticket")
async def b3po_device_ticket(
    body: TicketRequest,
    x_b3po_device_key: Optional[str] = Header(default=None, alias=DEVICE_KEY_HEADER),
):
    """Minta um ticket de gateway de uso único para o dispositivo pareado."""
    key = x_b3po_device_key or ""

    if not key.strip():
        raise HTTPException(status_code=401, detail="invalid_key")

    path = device_store_path()
    records = load_devices(path)
    now = int(time.time() * 1000)

    # A chave identifica o dispositivo; sem o device_id no pedido, procura qual registro aceita a chave.
    target = None
    for record in records:
        try:
            verify_key(record, key)
        except DeviceError:
            continue
        target = record
        break

    if target is None:
        # Mensagem idêntica para "não existe" e "chave errada": não vaza enumeração de dispositivos.
        raise HTTPException(status_code=401, detail="invalid_key")

    profile = (body.profile or target.profile_id).strip()

    try:
        authorize(target, key=key, profile_id=profile, now=now)
    except DeviceError as error:
        _raise(error)

    save_devices(path, records)

    from hermes_cli.dashboard_auth.ws_tickets import TTL_SECONDS, mint_ticket

    ticket = mint_ticket(
        user_id="b3po-device:" + target.device_id,
        provider="b3po-device",
        issuer="b3po",
        extra={"device_id": target.device_id, "profile": target.profile_id},
    )

    return {"ticket": ticket, "ttl_seconds": TTL_SECONDS, "profile": target.profile_id}


@router.post("/api/b3po/devices", name="b3po_device_pair")
async def b3po_device_pair(body: PairRequest):
    """Cria um dispositivo e devolve a chave UMA vez (o desktop faz isso ao gerar o link de pareamento)."""
    path = device_store_path()
    records = load_devices(path)
    now = int(time.time() * 1000)

    try:
        record, key = create_device(label=body.label, profile_id=body.profile, now=now)
    except DeviceError as error:
        _raise(error)

    records.append(record)
    save_devices(path, records)

    return {"device": public_view(record), "key": key}


@router.get("/api/b3po/devices", name="b3po_devices_list")
async def b3po_devices_list():
    """Lista para a tela de Dispositivos: sem hash e sem chave."""
    return {"devices": [public_view(record) for record in load_devices(device_store_path())]}


@router.delete("/api/b3po/devices/{device_id}", name="b3po_device_revoke")
async def b3po_device_revoke(device_id: str):
    path = device_store_path()
    records = load_devices(path)
    record = find_device(records, device_id)

    if record is None:
        raise HTTPException(status_code=404, detail="not_found")

    revoke_device(record, now=int(time.time() * 1000))
    save_devices(path, records)

    return JSONResponse({"device": public_view(record)})
