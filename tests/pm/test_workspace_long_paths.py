"""Cópia de membro do workspace tem que aguentar caminho longo no Windows.

Regressão real: com ``LongPathsEnabled=0`` (padrão do Windows), o destino
``installs/<id>/environments/<id>/workspace/plugin-sources/<plugin>/...`` passa de MAX_PATH e
``shutil.copytree`` falha com ``WinError 3`` nos arquivos mais profundos — o bootstrap parava em
"Install Python dependencies". A correção é copiar para o root na forma verbatim (``\\\\?\\``).
"""
from __future__ import annotations

import os

import pytest

from pm import workspace


@pytest.mark.platforms("windows")
def test_member_copy_target_uses_verbatim_long_path(tmp_path, monkeypatch):
    plugin = tmp_path / "plugin"
    plugin.mkdir()
    (plugin / "pyproject.toml").write_text('[project]\nname = "demo"\nversion = "0"\n', encoding="utf-8")
    root = tmp_path / "installs" / "abc" / "environments" / "def" / "workspace"
    root.mkdir(parents=True)

    captured: dict[str, str] = {}

    def fake_copytree(src, dst, **kwargs):
        captured["dst"] = os.fspath(dst)
        raise RuntimeError("stop after capture")

    monkeypatch.setattr(workspace.shutil, "copytree", fake_copytree)

    with pytest.raises(RuntimeError):
        workspace._workspace_member(plugin, root, identity=plugin)

    assert captured["dst"].startswith("\\\\?\\"), captured["dst"]
    # o caminho verbatim precisa ser absoluto e não pode carregar `..`
    assert ".." not in captured["dst"]


@pytest.mark.platforms("windows")
def test_native_strips_the_verbatim_prefix(tmp_path):
    from pm.filesystem import long_root, native

    spelled = long_root(tmp_path / "workspace")
    assert os.fspath(spelled).startswith("\\\\?\\")
    assert native(spelled) == str(tmp_path / "workspace")
