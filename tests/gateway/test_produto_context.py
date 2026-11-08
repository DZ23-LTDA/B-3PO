"""O contexto do produto no turno (B-3PO, r273).

**O contrato que este arquivo guarda** — e é o que a missão final exige no G5:

1. O ``produto_contexto`` chega ao modelo como **nota na mensagem do usuário**, nunca no system
   prompt. É o mesmo seam das notas de voz/HUD, e é o que mantém o **prefixo congelado** do
   prompt intacto (a invariante mais cara do projeto: um contexto que mudasse o prefixo custaria
   o cache inteiro a cada troca de ambiente).
2. Ele é **descritivo**. A nota diz explicitamente que **não é permissão de acesso** — o
   ``permission-guard`` continua sendo a única porta. Um contexto que se apresentasse como
   autorização seria uma segunda permissão disfarçada, e o renderer já o cortou pelo RBAC.
3. **Sem valor não há nota.** Um campo vazio produziria uma frase que diz "o usuário está
   trabalhando em nada", que é pior que silêncio.
"""
from gateway.session_surface import admit_surface, surface_note


def _committed(params):
    return admit_surface(params).get('surface_v1', {})


def test_produto_contexto_is_committed_without_any_surface():
    """Um ambiente não precisa de HUD nem de voice-live para ser significativo."""
    assert _committed({'produto_contexto': 'Empresa · 3 escopos'}) == {
        'produto_contexto': 'Empresa · 3 escopos'
    }


def test_absent_context_commits_nothing_and_notes_nothing():
    assert _committed({}) == {}
    assert surface_note({}) == ''


def test_blank_context_commits_nothing():
    """Espaço em branco não é contexto: um campo vazio viraria "trabalhando em nada"."""
    assert _committed({'produto_contexto': '   '}) == {}


def test_the_note_says_it_is_NOT_a_permission():
    """A metade que impede a nota de virar autorização."""
    nota = surface_note({'produto_contexto': 'Empresa · 3 escopos'})

    assert 'Empresa · 3 escopos' in nota
    assert 'não é uma permissão' in nota


def test_the_note_carries_a_denied_reading_too():
    """O renderer manda "sem permissão de leitura" quando o ator não lê — e o modelo precisa
    disso para não inventar escopo que a pessoa não tem."""
    nota = surface_note({'produto_contexto': 'Empresa · sem permissão de leitura'})

    assert 'sem permissão de leitura' in nota


def test_context_is_bounded():
    """Um cliente não escolhe o tamanho do que entra no turno."""
    assert len(_committed({'produto_contexto': 'x' * 5000})['produto_contexto']) == 400


def test_context_survives_alongside_a_surface():
    """Os dois convivem: o contexto do produto não substitui a nota de voz/HUD."""
    committed = _committed({'produto_contexto': 'IA e Agentes', 'interrupted': True})

    assert committed['produto_contexto'] == 'IA e Agentes'
    assert committed['interrupted'] is True


def test_non_string_context_is_refused():
    import pytest

    from hermes_state_runtime import RuntimeStoreError

    with pytest.raises(RuntimeStoreError):
        admit_surface({'produto_contexto': {'ambiente': 'empresa'}})
