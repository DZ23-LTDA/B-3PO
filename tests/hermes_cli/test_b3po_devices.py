"""Testes do cofre de dispositivos autorizados (envio de prompt pelo celular).

Contratos testados: a chave nunca é persistida, comparação é em tempo constante, revogação manda mais
que chave correta, escopo por perfil, janela de taxa, escrita atômica e leitura fail-closed.
"""

import json
from pathlib import Path

import pytest

from hermes_cli.b3po_devices import (
    DEFAULT_RATE_LIMIT,
    DEFAULT_RATE_WINDOW_MS,
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

NOW = 1_700_000_000_000


def test_create_device_returns_key_once_and_stores_only_hash():
    record, key = create_device(label="Pixel do Leandro", profile_id="revisor-codigo", now=NOW)

    assert key
    assert record.key_sha256
    assert key not in record.key_sha256
    assert len(record.key_sha256) == 64  # sha256 hex
    assert record.revoked is False
    assert record.profile_id == "revisor-codigo"


def test_create_device_rejects_empty_input():
    with pytest.raises(DeviceError) as empty_label:
        create_device(label="  ", profile_id="p", now=NOW)
    assert empty_label.value.code == "invalid_input"

    with pytest.raises(DeviceError) as empty_profile:
        create_device(label="ok", profile_id=" ", now=NOW)
    assert empty_profile.value.code == "invalid_input"


def test_verify_key_accepts_the_issued_key():
    record, key = create_device(label="celular", profile_id="p", now=NOW)

    verify_key(record, key)  # não levanta


def test_verify_key_rejects_wrong_and_empty_key():
    record, _ = create_device(label="celular", profile_id="p", now=NOW)

    with pytest.raises(DeviceError) as wrong:
        verify_key(record, "outra-chave")
    assert wrong.value.code == "invalid_key"

    with pytest.raises(DeviceError) as empty:
        verify_key(record, "")
    assert empty.value.code == "invalid_key"


def test_revoked_device_refuses_even_with_the_right_key():
    record, key = create_device(label="celular", profile_id="p", now=NOW)
    revoke_device(record, now=NOW + 1000)

    with pytest.raises(DeviceError) as revoked:
        verify_key(record, key)
    assert revoked.value.code == "revoked"


def test_key_for_one_profile_is_refused_for_another():
    record, key = create_device(label="celular", profile_id="revisor-codigo", now=NOW)

    with pytest.raises(DeviceError) as mismatch:
        authorize(record, key=key, profile_id="analista-financeiro", now=NOW)
    assert mismatch.value.code == "scope_mismatch"


def test_authorize_updates_seen_and_counter():
    record, key = create_device(label="celular", profile_id="p", now=NOW)

    updated = authorize(record, key=key, profile_id="p", now=NOW + 500)

    assert updated.last_seen_at == NOW + 500
    assert updated.tickets_minted == 1
    assert updated.recent_tickets == [NOW + 500]


def test_rate_limit_blocks_above_the_ceiling_and_recovers_after_the_window():
    record, key = create_device(label="celular", profile_id="p", now=NOW)

    for step in range(DEFAULT_RATE_LIMIT):
        authorize(record, key=key, profile_id="p", now=NOW + step)

    with pytest.raises(DeviceError) as limited:
        authorize(record, key=key, profile_id="p", now=NOW + DEFAULT_RATE_LIMIT)
    assert limited.value.code == "rate_limited"

    # fora da janela, volta a autorizar
    later = NOW + DEFAULT_RATE_WINDOW_MS + 1
    assert authorize(record, key=key, profile_id="p", now=later).tickets_minted == DEFAULT_RATE_LIMIT + 1


def test_public_view_never_exposes_hash_or_key():
    record, key = create_device(label="celular", profile_id="p", now=NOW)
    view = public_view(record)

    serialized = json.dumps(view)
    assert key not in serialized
    assert record.key_sha256 not in serialized
    assert set(view) == {
        "device_id",
        "label",
        "profile_id",
        "created_at",
        "last_seen_at",
        "revoked",
        "tickets_minted",
    }


def test_saved_file_does_not_contain_the_clear_key(tmp_path: Path):
    record, key = create_device(label="celular", profile_id="p", now=NOW)
    path = tmp_path / "devices.json"

    save_devices(path, [record])

    raw = path.read_text(encoding="utf-8")
    assert key not in raw
    assert record.key_sha256 in raw  # hash é o que fica


def test_roundtrip_preserves_state(tmp_path: Path):
    first, key_first = create_device(label="a", profile_id="p1", now=NOW)
    second, _key_second = create_device(label="b", profile_id="p2", now=NOW + 1)
    authorize(first, key=key_first, profile_id="p1", now=NOW + 10)
    revoke_device(second, now=NOW + 20)

    path = tmp_path / "devices.json"
    save_devices(path, [first, second])

    loaded = load_devices(path)
    assert [record.device_id for record in loaded] == [first.device_id, second.device_id]
    assert loaded[0].last_seen_at == NOW + 10
    assert loaded[0].tickets_minted == 1
    assert loaded[1].revoked is True

    # a chave original continua valendo depois do roundtrip
    verify_key(loaded[0], key_first)


def test_missing_file_loads_empty(tmp_path: Path):
    assert load_devices(tmp_path / "nao-existe.json") == []


def test_corrupt_file_fails_closed(tmp_path: Path):
    path = tmp_path / "devices.json"
    path.write_text("{ isso não é json", encoding="utf-8")

    assert load_devices(path) == []


def test_corrupt_record_is_skipped_without_losing_the_rest(tmp_path: Path):
    record, _ = create_device(label="ok", profile_id="p", now=NOW)
    payload = {
        "schema": 1,
        "devices": [record.as_json(), {"device_id": "quebrado"}],
    }
    path = tmp_path / "devices.json"
    path.write_text(json.dumps(payload), encoding="utf-8")

    loaded = load_devices(path)
    assert [item.device_id for item in loaded] == [record.device_id]


def test_save_is_atomic_and_leaves_no_temp_files(tmp_path: Path):
    record, _ = create_device(label="celular", profile_id="p", now=NOW)
    path = tmp_path / "nested" / "devices.json"

    save_devices(path, [record])

    assert path.exists()
    assert list(path.parent.glob(".b3po-devices-*")) == []


def test_find_device_is_exact():
    record, _ = create_device(label="celular", profile_id="p", now=NOW, device_id="dev-abc")

    assert find_device([record], "dev-abc") is record
    assert find_device([record], "dev-ab") is None
