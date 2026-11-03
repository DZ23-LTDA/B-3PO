"""Perfil novo herda o endpoint de um provider embutido.

Regressão: `launch_model_seed` só copiava `providers.<key>` quando o provider era *custom* (ou
shadowed). Um provider embutido com endpoint próprio — `providers.ollama.base_url` apontando para o
Ollama local é o caso comum no B-3PO — ficava de fora, o perfil novo resolvia o provider sem URL e o
primeiro turno morria em **HTTP 404**. O bot era criado e ficava inutilizável.
"""
from __future__ import annotations

from hermes_cli.profile_model_seed import launch_model_seed


def test_builtin_provider_with_its_own_endpoint_travels_to_the_new_profile():
    seed = launch_model_seed(
        {
            "model": {"provider": "ollama", "default": "qwen3.5:4b"},
            "providers": {"ollama": {"base_url": "http://127.0.0.1:11434"}},
        }
    )

    assert seed["model"] == {"provider": "ollama", "default": "qwen3.5:4b"}
    assert seed["providers"]["ollama"]["base_url"] == "http://127.0.0.1:11434"


def test_builtin_provider_without_endpoint_still_seeds_only_the_model():
    """Sem endpoint declarado não há infraestrutura para copiar: o provider é built-in e resolve
    sozinho, então o seed continua mínimo."""
    seed = launch_model_seed({"model": {"provider": "ollama", "default": "qwen3.5:4b"}, "providers": {}})

    assert seed == {"model": {"provider": "ollama", "default": "qwen3.5:4b"}}


def test_endpoint_spellings_other_than_base_url_also_travel():
    for field in ("baseUrl", "url", "api"):
        seed = launch_model_seed(
            {
                "model": {"provider": "ollama", "default": "m"},
                "providers": {"ollama": {field: "http://127.0.0.1:9999"}},
            }
        )

        assert seed["providers"]["ollama"][field] == "http://127.0.0.1:9999", field


def test_custom_provider_is_unchanged():
    seed = launch_model_seed(
        {
            "model": {"provider": "custom:lab", "default": "m"},
            "providers": {"custom": {"base_url": "https://lab.example/v1"}},
            "custom_providers": [{"name": "lab", "base_url": "https://lab.example/v1", "provider_key": "custom"}],
        }
    )

    assert seed["model"]["provider"] == "custom:lab"
    assert "providers" in seed or "custom_providers" in seed


def test_missing_model_block_seeds_nothing():
    assert launch_model_seed({}) == {}
