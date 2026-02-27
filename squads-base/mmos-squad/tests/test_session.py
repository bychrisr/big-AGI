"""Testes para DebateSession."""

from pathlib import Path
from unittest.mock import patch

import pytest

from debate_engine.engine import DebateEngine, TurnResult
from debate_engine.mind_loader import MindLoader
from debate_engine.session import DebateSession, DebateTurn


def _make_turn_result(
    mind_slug: str = "test_mind",
    content: str = "Resposta do mind",
    input_tokens: int = 100,
    output_tokens: int = 50,
) -> TurnResult:
    return TurnResult(
        mind_slug=mind_slug,
        content=content,
        input_tokens=input_tokens,
        output_tokens=output_tokens,
        model="claude-sonnet-4-20250514",
    )


@pytest.fixture()
def engine() -> DebateEngine:
    """Fixture: DebateEngine com API key fake."""
    return DebateEngine(api_key="fake-key")


@pytest.fixture()
def loader(tmp_path: Path) -> MindLoader:
    """Fixture: MindLoader apontando para diretório temporário."""
    minds_dir = tmp_path / "minds"
    minds_dir.mkdir()
    return MindLoader(minds_dir)


@pytest.fixture()
def mind_with_files(loader: MindLoader) -> str:
    """Fixture: cria arquivos de mind no diretório do loader."""
    mind_slug = "test_mind"
    mind_dir = loader.base / mind_slug
    prompt_dir = mind_dir / "system_prompts"
    prompt_dir.mkdir(parents=True)
    (prompt_dir / "main.md").write_text("Você é um especialista.", encoding="utf-8")

    kb_dir = mind_dir / "kb"
    kb_dir.mkdir()
    (kb_dir / "chunk_001.md").write_text("Conteudo KB chunk 1.", encoding="utf-8")
    return mind_slug


@pytest.fixture()
def session(engine: DebateEngine, loader: MindLoader) -> DebateSession:
    """Fixture: DebateSession básica."""
    return DebateSession(
        topic="estrategia de crescimento",
        minds=["mind_a", "mind_b"],
        engine=engine,
        loader=loader,
    )


def test_run_turn_caches_system_prompt(
    engine: DebateEngine,
    loader: MindLoader,
    mind_with_files: str,
) -> None:
    """Segundo turno do mesmo mind não relê os arquivos (usa cache)."""
    session = DebateSession(
        topic="crescimento",
        minds=[mind_with_files],
        engine=engine,
        loader=loader,
    )
    mock_result = _make_turn_result(mind_with_files)

    with (
        patch.object(loader, "load_system_prompt", wraps=loader.load_system_prompt) as mock_sp,
        patch.object(loader, "load_kb", wraps=loader.load_kb) as mock_kb,
        patch.object(engine, "generate_response", return_value=mock_result),
    ):
        session.run_turn(mind_with_files, "Primeira mensagem")
        session.run_turn(mind_with_files, "Segunda mensagem")

    # load_system_prompt e load_kb devem ser chamados apenas uma vez (primeiro turno)
    assert mock_sp.call_count == 1
    assert mock_kb.call_count == 1


def test_run_turn_returns_result(
    engine: DebateEngine,
    loader: MindLoader,
    mind_with_files: str,
) -> None:
    """run_turn retorna TurnResult com campos corretos."""
    session = DebateSession(
        topic="topico",
        minds=[mind_with_files],
        engine=engine,
        loader=loader,
    )
    expected = _make_turn_result(mind_with_files, content="Minha resposta", input_tokens=200)

    with patch.object(engine, "generate_response", return_value=expected):
        result = session.run_turn(mind_with_files, "Pergunta")

    assert isinstance(result, TurnResult)
    assert result.mind_slug == mind_with_files
    assert result.content == "Minha resposta"
    assert result.input_tokens == 200


def test_token_tracking_accumulates(
    engine: DebateEngine,
    loader: MindLoader,
    mind_with_files: str,
) -> None:
    """token_usage acumula tokens entre turnos."""
    session = DebateSession(
        topic="topico",
        minds=[mind_with_files],
        engine=engine,
        loader=loader,
    )
    result1 = _make_turn_result(mind_with_files, input_tokens=100, output_tokens=50)
    result2 = _make_turn_result(mind_with_files, input_tokens=80, output_tokens=40)

    with patch.object(engine, "generate_response", side_effect=[result1, result2]):
        session.run_turn(mind_with_files, "Primeira")
        session.run_turn(mind_with_files, "Segunda")

    assert session.token_usage.total_input == 180
    assert session.token_usage.total_output == 90
    assert session.token_usage.turns == 2
    assert session.token_usage.by_mind[mind_with_files]["input"] == 180
    assert session.token_usage.by_mind[mind_with_files]["output"] == 90


def test_to_dict_round_trip(
    engine: DebateEngine,
    loader: MindLoader,
    mind_with_files: str,
) -> None:
    """from_dict(to_dict()) reconstrói sessão equivalente."""
    session = DebateSession(
        topic="inovacao",
        minds=[mind_with_files],
        engine=engine,
        loader=loader,
        session_id="fixed-session-id",
    )
    mock_result = _make_turn_result(mind_with_files, input_tokens=150, output_tokens=75)

    with patch.object(engine, "generate_response", return_value=mock_result):
        session.run_turn(mind_with_files, "Primeira pergunta")

    data = session.to_dict()
    restored = DebateSession.from_dict(data, engine=engine, loader=loader)

    assert restored.session_id == session.session_id
    assert restored.topic == session.topic
    assert restored.minds == session.minds
    assert restored.created_at == session.created_at
    assert len(restored.turns) == len(session.turns)
    assert restored.turns[0].mind_slug == session.turns[0].mind_slug
    assert restored.turns[0].response == session.turns[0].response
    assert restored.token_usage.total_input == session.token_usage.total_input
    assert restored.token_usage.total_output == session.token_usage.total_output


def test_multiple_minds_independent_cache(
    engine: DebateEngine,
    loader: MindLoader,
    tmp_path: Path,
) -> None:
    """Cache de minds A e B são independentes."""
    # Criar dois minds
    for slug in ("mind_a", "mind_b"):
        mind_dir = loader.base / slug
        prompt_dir = mind_dir / "system_prompts"
        prompt_dir.mkdir(parents=True)
        (prompt_dir / "main.md").write_text(f"Prompt de {slug}.", encoding="utf-8")

    session = DebateSession(
        topic="debate",
        minds=["mind_a", "mind_b"],
        engine=engine,
        loader=loader,
    )
    result_a = _make_turn_result("mind_a")
    result_b = _make_turn_result("mind_b")

    with (
        patch.object(loader, "load_system_prompt", wraps=loader.load_system_prompt) as mock_sp,
        patch.object(
            engine, "generate_response", side_effect=[result_a, result_b, result_a, result_b]
        ),
    ):
        session.run_turn("mind_a", "Msg para A")
        session.run_turn("mind_b", "Msg para B")
        session.run_turn("mind_a", "Segunda para A")
        session.run_turn("mind_b", "Segunda para B")

    # load_system_prompt chamado exatamente uma vez por mind
    assert mock_sp.call_count == 2
    calls = [c.args[0] for c in mock_sp.call_args_list]
    assert "mind_a" in calls
    assert "mind_b" in calls

    # Cache independente: cada mind tem seu próprio MindCache
    assert "mind_a" in session._mind_cache
    assert "mind_b" in session._mind_cache
    cache_a = session._mind_cache["mind_a"].system_prompt
    cache_b = session._mind_cache["mind_b"].system_prompt
    assert cache_a != cache_b


def test_session_stores_turns(
    engine: DebateEngine,
    loader: MindLoader,
    mind_with_files: str,
) -> None:
    """Cada run_turn adiciona um DebateTurn à lista de turnos."""
    session = DebateSession(
        topic="topico",
        minds=[mind_with_files],
        engine=engine,
        loader=loader,
    )
    mock_result = _make_turn_result(mind_with_files, content="Resposta A")

    with patch.object(engine, "generate_response", return_value=mock_result):
        session.run_turn(mind_with_files, "Pergunta do usuario")

    assert len(session.turns) == 1
    turn = session.turns[0]
    assert isinstance(turn, DebateTurn)
    assert turn.mind_slug == mind_with_files
    assert turn.user_message == "Pergunta do usuario"
    assert turn.response == "Resposta A"


def test_to_dict_has_required_keys(
    engine: DebateEngine,
    loader: MindLoader,
) -> None:
    """to_dict() inclui todas as chaves necessárias."""
    session = DebateSession(
        topic="test",
        minds=["mind_x"],
        engine=engine,
        loader=loader,
        session_id="test-id",
    )
    data = session.to_dict()

    assert "session_id" in data
    assert "topic" in data
    assert "minds" in data
    assert "turns" in data
    assert "token_usage" in data
    assert "created_at" in data
    assert data["session_id"] == "test-id"
    assert data["topic"] == "test"
    assert data["turns"] == []
