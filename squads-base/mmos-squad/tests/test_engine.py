"""Testes para DebateEngine."""

from unittest.mock import MagicMock, patch

import pytest

from debate_engine.engine import (
    DebateEngine,
    DebateEngineError,
    InvalidAPIKeyError,
    RateLimitExceededError,
    TokenOverflowError,
    TurnResult,
)


@pytest.fixture()
def engine():
    """Fixture: DebateEngine com API key fake."""
    return DebateEngine(api_key="test-key-fake")


@pytest.fixture()
def mock_response():
    """Fixture: resposta mock da API Anthropic."""
    response = MagicMock()
    response.content = [MagicMock(text="Resposta do mind")]
    response.usage = MagicMock(input_tokens=100, output_tokens=50)
    return response


def test_generate_response_returns_turn_result(engine, mock_response):
    """generate_response retorna TurnResult com campos corretos."""
    with patch.object(engine.client.messages, "create", return_value=mock_response):
        result = engine.generate_response(
            mind_slug="test_mind",
            system_prompt="Voce e um especialista.",
            kb_context="Contexto da KB.",
            user_message="Qual sua perspectiva?",
        )

    assert isinstance(result, TurnResult)
    assert result.mind_slug == "test_mind"
    assert result.content == "Resposta do mind"
    assert result.input_tokens == 100
    assert result.output_tokens == 50
    assert result.model == DebateEngine.DEFAULT_MODEL


def test_generate_response_empty_kb(engine, mock_response):
    """generate_response funciona com KB vazia."""
    with patch.object(engine.client.messages, "create", return_value=mock_response):
        result = engine.generate_response(
            mind_slug="test_mind",
            system_prompt="Prompt.",
            kb_context="",
            user_message="Mensagem.",
        )

    assert result.content == "Resposta do mind"


def test_generate_response_system_with_kb(engine, mock_response):
    """generate_response concatena system_prompt e kb_context quando KB presente."""
    with patch.object(engine.client.messages, "create", return_value=mock_response) as mock_create:
        engine.generate_response(
            mind_slug="test_mind",
            system_prompt="Sistema base.",
            kb_context="Conteudo KB.",
            user_message="Pergunta.",
        )
        call_kwargs = mock_create.call_args[1]
        assert "Sistema base." in call_kwargs["system"]
        assert "Conteudo KB." in call_kwargs["system"]
        assert "## Knowledge Base" in call_kwargs["system"]


def test_generate_response_system_without_kb(engine, mock_response):
    """generate_response usa system_prompt diretamente quando KB vazia."""
    with patch.object(engine.client.messages, "create", return_value=mock_response) as mock_create:
        engine.generate_response(
            mind_slug="test_mind",
            system_prompt="So o prompt.",
            kb_context="",
            user_message="Pergunta.",
        )
        call_kwargs = mock_create.call_args[1]
        assert call_kwargs["system"] == "So o prompt."


def test_rate_limit_raises_correct_error(engine):
    """RateLimitError da API e convertido para RateLimitExceededError."""
    from anthropic import RateLimitError

    with patch.object(
        engine.client.messages,
        "create",
        side_effect=RateLimitError("rate limit", response=MagicMock(), body={}),
    ), pytest.raises(RateLimitExceededError, match="Rate limit atingido"):
        engine.generate_response("mind", "prompt", "kb", "msg")


def test_auth_error_raises_invalid_key(engine):
    """AuthenticationError e convertido para InvalidAPIKeyError."""
    from anthropic import AuthenticationError

    with patch.object(
        engine.client.messages,
        "create",
        side_effect=AuthenticationError("auth", response=MagicMock(), body={}),
    ), pytest.raises(InvalidAPIKeyError, match="API key invalida"):
        engine.generate_response("mind", "prompt", "kb", "msg")


def test_token_overflow_raises_correct_error(engine):
    """BadRequestError com 'token' e convertido para TokenOverflowError."""
    from anthropic import BadRequestError

    with patch.object(
        engine.client.messages,
        "create",
        side_effect=BadRequestError("too many tokens", response=MagicMock(), body={}),
    ), pytest.raises(TokenOverflowError, match="Context window excedido"):
        engine.generate_response("mind", "prompt", "kb", "msg")


def test_bad_request_without_token_raises_engine_error(engine):
    """BadRequestError sem 'token' e convertido para DebateEngineError."""
    from anthropic import BadRequestError

    with patch.object(
        engine.client.messages,
        "create",
        side_effect=BadRequestError("invalid request", response=MagicMock(), body={}),
    ), pytest.raises(DebateEngineError, match="Erro na requisicao"):
        engine.generate_response("mind", "prompt", "kb", "msg")


def test_custom_model_used(mock_response):
    """Modelo custom e usado quando especificado."""
    custom_engine = DebateEngine(api_key="test", model="claude-opus-4-5")
    with patch.object(
        custom_engine.client.messages, "create", return_value=mock_response
    ) as mock_create:
        custom_engine.generate_response("mind", "prompt", "kb", "msg")
        call_kwargs = mock_create.call_args[1]
        assert call_kwargs["model"] == "claude-opus-4-5"


def test_default_model_is_claude_sonnet(engine):
    """Modelo default e claude-sonnet-4-20250514."""
    assert engine.model == "claude-sonnet-4-20250514"


def test_custom_max_tokens(engine, mock_response):
    """max_tokens custom e passado para API."""
    with patch.object(engine.client.messages, "create", return_value=mock_response) as mock_create:
        engine.generate_response("mind", "prompt", "kb", "msg", max_tokens=1024)
        call_kwargs = mock_create.call_args[1]
        assert call_kwargs["max_tokens"] == 1024


def test_default_max_tokens(engine, mock_response):
    """max_tokens default e 4096 quando nao especificado."""
    with patch.object(engine.client.messages, "create", return_value=mock_response) as mock_create:
        engine.generate_response("mind", "prompt", "kb", "msg")
        call_kwargs = mock_create.call_args[1]
        assert call_kwargs["max_tokens"] == DebateEngine.MAX_TOKENS


def test_generate_response_stream_yields_chunks(engine):
    """generate_response_stream yields texto em chunks."""
    mock_stream = MagicMock()
    mock_stream.__enter__ = MagicMock(return_value=mock_stream)
    mock_stream.__exit__ = MagicMock(return_value=False)
    mock_stream.text_stream = iter(["Chunk 1", " Chunk 2", " Chunk 3"])

    with patch.object(engine.client.messages, "stream", return_value=mock_stream):
        chunks = list(
            engine.generate_response_stream(
                mind_slug="test_mind",
                system_prompt="Prompt.",
                kb_context="KB.",
                user_message="Pergunta.",
            )
        )

    assert chunks == ["Chunk 1", " Chunk 2", " Chunk 3"]
