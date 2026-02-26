"""Testes para SilentCheckpoint."""

import sys
from pathlib import Path
from unittest.mock import MagicMock

import pytest

sys.path.insert(0, str(Path(__file__).parent.parent / "scripts"))

from silent_checkpoint import DebateSessionData, MemoryCandidate, SilentCheckpoint


@pytest.fixture()
def mock_store() -> MagicMock:
    """Fixture: MemoryStore mockado."""
    store = MagicMock()
    store.record_explicit.return_value = MagicMock()
    return store


@pytest.fixture()
def checkpoint(mock_store: MagicMock) -> SilentCheckpoint:
    """Fixture: SilentCheckpoint com store mockado."""
    return SilentCheckpoint(mock_store)


def test_analyze_detects_correction(checkpoint: SilentCheckpoint) -> None:
    """Mensagem com 'na verdade' gera MemoryCandidate com confidence=0.80."""
    session = DebateSessionData(
        turns=[{"role": "user", "content": "pergunta"}],
        user_messages=["na verdade, eu quis dizer outra coisa"],
    )
    candidates = checkpoint.analyze(session)
    correction_candidates = [c for c in candidates if c.source_trigger == "output_correction"]
    assert len(correction_candidates) == 1
    assert correction_candidates[0].confidence == 0.80


def test_analyze_detects_nao_queria_dizer(checkpoint: SilentCheckpoint) -> None:
    """Mensagem com 'não queria dizer' gera MemoryCandidate de correção."""
    session = DebateSessionData(
        turns=[],
        user_messages=["não queria dizer isso, corrija"],
    )
    candidates = checkpoint.analyze(session)
    correction_candidates = [c for c in candidates if c.source_trigger == "output_correction"]
    assert len(correction_candidates) == 1
    assert correction_candidates[0].confidence == 0.80


def test_analyze_detects_reformat(checkpoint: SilentCheckpoint) -> None:
    """'coloca em tabela' gera MemoryCandidate com confidence=0.75."""
    session = DebateSessionData(
        turns=[],
        user_messages=["coloca em tabela por favor"],
    )
    candidates = checkpoint.analyze(session)
    reformat_candidates = [c for c in candidates if c.source_trigger == "reformat_request"]
    assert len(reformat_candidates) == 1
    assert reformat_candidates[0].confidence == 0.75
    assert reformat_candidates[0].key == "preferencia_formato"


def test_analyze_detects_bullet_points(checkpoint: SilentCheckpoint) -> None:
    """'formato bullet points' gera MemoryCandidate de reformatação."""
    session = DebateSessionData(
        turns=[],
        user_messages=["formato bullet points por favor"],
    )
    candidates = checkpoint.analyze(session)
    reformat_candidates = [c for c in candidates if c.source_trigger == "reformat_request"]
    assert len(reformat_candidates) == 1


def test_analyze_no_triggers_returns_empty(checkpoint: SilentCheckpoint) -> None:
    """Sessão sem triggers não gera candidatos de correção ou reformatação."""
    session = DebateSessionData(
        turns=[{"role": "user"} for _ in range(3)],
        user_messages=["ok", "entendi", "obrigado"],
    )
    candidates = checkpoint.analyze(session)
    # Só pode ter o theme_expanded (turns=3 ≤ 5, então não)
    assert all(c.source_trigger != "output_correction" for c in candidates)
    assert all(c.source_trigger != "reformat_request" for c in candidates)


def test_analyze_theme_expanded_above_5_turns(checkpoint: SilentCheckpoint) -> None:
    """Sessão com mais de 5 turnos gera candidato theme_expanded."""
    session = DebateSessionData(
        turns=[{"role": "user"} for _ in range(6)],
        user_messages=["mensagem normal"],
    )
    candidates = checkpoint.analyze(session)
    theme_candidates = [c for c in candidates if c.source_trigger == "theme_expanded"]
    assert len(theme_candidates) == 1
    assert theme_candidates[0].confidence == 0.60


def test_analyze_theme_not_expanded_5_or_fewer_turns(checkpoint: SilentCheckpoint) -> None:
    """Sessão com 5 turnos não gera candidato theme_expanded."""
    session = DebateSessionData(
        turns=[{"role": "user"} for _ in range(5)],
        user_messages=[],
    )
    candidates = checkpoint.analyze(session)
    theme_candidates = [c for c in candidates if c.source_trigger == "theme_expanded"]
    assert len(theme_candidates) == 0


def test_candidate_committable_above_threshold() -> None:
    """MemoryCandidate com confidence=0.66 é committable."""
    candidate = MemoryCandidate(key="k", value="v", confidence=0.66)
    assert candidate.is_committable() is True


def test_candidate_not_committable_below_threshold() -> None:
    """MemoryCandidate com confidence=0.65 NÃO é committable (threshold é estrito)."""
    candidate = MemoryCandidate(key="k", value="v", confidence=0.65)
    assert candidate.is_committable() is False


def test_candidate_not_committable_low_confidence() -> None:
    """MemoryCandidate com confidence=0.50 não é committable."""
    candidate = MemoryCandidate(key="k", value="v", confidence=0.50)
    assert candidate.is_committable() is False


def test_commit_filters_low_confidence(
    checkpoint: SilentCheckpoint, mock_store: MagicMock
) -> None:
    """commit persiste apenas candidatos com confidence > 0.65."""
    candidates = [
        MemoryCandidate(key="alto", value="v1", confidence=0.80),
        MemoryCandidate(key="abaixo", value="v2", confidence=0.65),
        MemoryCandidate(key="muito_baixo", value="v3", confidence=0.50),
    ]
    committed = checkpoint.commit("user-123", candidates)
    assert committed == 1
    mock_store.record_explicit.assert_called_once()
    call_kwargs = mock_store.record_explicit.call_args[1]
    assert call_kwargs["key"] == "alto"


def test_commit_returns_count(
    checkpoint: SilentCheckpoint, mock_store: MagicMock
) -> None:
    """commit retorna o número de candidatos efetivamente commitados."""
    candidates = [
        MemoryCandidate(key="k1", value="v1", confidence=0.80),
        MemoryCandidate(key="k2", value="v2", confidence=0.75),
    ]
    committed = checkpoint.commit("user-123", candidates)
    assert committed == 2


def test_commit_uses_checkpoint_source(
    checkpoint: SilentCheckpoint, mock_store: MagicMock
) -> None:
    """commit chama record_explicit com source='checkpoint'."""
    candidates = [MemoryCandidate(key="k", value="v", confidence=0.80)]
    checkpoint.commit("user-123", candidates)
    call_kwargs = mock_store.record_explicit.call_args[1]
    assert call_kwargs["source"] == "checkpoint"


def test_commit_handles_store_exception(
    checkpoint: SilentCheckpoint, mock_store: MagicMock
) -> None:
    """commit continua operando mesmo se um candidato falhar."""
    mock_store.record_explicit.side_effect = [Exception("DB error"), None]
    candidates = [
        MemoryCandidate(key="k1", value="v1", confidence=0.80),
        MemoryCandidate(key="k2", value="v2", confidence=0.80),
    ]
    committed = checkpoint.commit("user-123", candidates)
    # Primeiro falhou, segundo commitado
    assert committed == 1


@pytest.mark.asyncio()
async def test_run_async_does_not_raise(
    checkpoint: SilentCheckpoint,
) -> None:
    """run_async executa sem levantar exceções para sessão normal."""
    session = DebateSessionData(
        turns=[],
        user_messages=["mensagem normal"],
    )
    # Deve completar sem raise
    await checkpoint.run_async("user-123", session)


@pytest.mark.asyncio()
async def test_run_async_handles_exception_silently(
    mock_store: MagicMock,
) -> None:
    """run_async não propaga exceções do store para o caller."""
    mock_store.record_explicit.side_effect = Exception("Falha no DB")
    cp = SilentCheckpoint(mock_store)
    session = DebateSessionData(
        turns=[],
        user_messages=["na verdade quero outra coisa"],
    )
    # Não deve levantar exceção
    await cp.run_async("user-123", session)
