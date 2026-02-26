"""Testes para MemoryContextProvider."""

import sys
from pathlib import Path
from unittest.mock import MagicMock

import pytest

sys.path.insert(0, str(Path(__file__).parent.parent / "scripts"))

from memory_context import MemoryContextProvider
from memory_store import Memory


def make_memory(key: str, value: str, confidence: float = 1.0) -> Memory:
    """Cria uma Memory de teste com campos mínimos."""
    return Memory(
        user_id="user-test",
        key=key,
        value=value,
        confidence=confidence,
        source="explicit",
    )


@pytest.fixture()
def mock_store() -> MagicMock:
    """Fixture: MemoryStore mockado."""
    return MagicMock()


@pytest.fixture()
def provider(mock_store: MagicMock) -> MemoryContextProvider:
    """Fixture: MemoryContextProvider com store mockado."""
    return MemoryContextProvider(mock_store)


def test_get_context_block_formats_memories(
    provider: MemoryContextProvider, mock_store: MagicMock
) -> None:
    """get_context_block retorna bloco markdown com memórias do usuário."""
    mock_store.get_memories.return_value = [
        make_memory("formato", "bullet points", 1.0),
        make_memory("linguagem", "Python", 0.8),
    ]
    block = provider.get_context_block("user-123")
    assert "## Memórias do Usuário" in block
    assert "formato" in block
    assert "bullet points" in block
    assert "linguagem" in block


def test_empty_memories_returns_empty_string(
    provider: MemoryContextProvider, mock_store: MagicMock
) -> None:
    """Sem memórias, get_context_block retorna string vazia."""
    mock_store.get_memories.return_value = []
    block = provider.get_context_block("user-no-memories")
    assert block == ""


def test_respects_token_budget(
    provider: MemoryContextProvider, mock_store: MagicMock
) -> None:
    """Bloco gerado não ultrapassa o orçamento de tokens."""
    # Criar muitas memórias com valores longos
    memories = [
        make_memory(f"chave_{i}", "x" * 200, confidence=float(1.0 - i * 0.01))
        for i in range(50)
    ]
    mock_store.get_memories.return_value = memories

    max_tokens = 100
    block = provider.get_context_block("user-123", max_tokens=max_tokens)

    # Estimativa: max_tokens / TOKENS_PER_CHAR = 100 / 0.25 = 400 chars
    budget_chars = max_tokens / MemoryContextProvider.TOKENS_PER_CHAR
    assert len(block) <= budget_chars


def test_topic_boost_reorders_memories(
    provider: MemoryContextProvider, mock_store: MagicMock
) -> None:
    """Memórias relacionadas ao tópico aparecem antes das demais."""
    mock_store.get_memories.return_value = [
        make_memory("linguagem", "TypeScript", 0.5),
        make_memory("formato_output", "bullet points", 0.5),
    ]
    block = provider.get_context_block("user-123", topic="formato")
    # "formato_output" tem match no tópico "formato", deve vir primeiro
    assert block.index("formato_output") < block.index("linguagem")


def test_context_block_contains_confidence(
    provider: MemoryContextProvider, mock_store: MagicMock
) -> None:
    """Bloco de contexto inclui o valor de confidence de cada memória."""
    mock_store.get_memories.return_value = [
        make_memory("formato", "tabela", 0.85),
    ]
    block = provider.get_context_block("user-123")
    assert "0.85" in block


def test_context_block_header_present(
    provider: MemoryContextProvider, mock_store: MagicMock
) -> None:
    """Bloco contém o header 'Memórias do Usuário'."""
    mock_store.get_memories.return_value = [make_memory("k", "v", 1.0)]
    block = provider.get_context_block("user-123")
    assert "## Memórias do Usuário" in block


def test_format_with_budget_only_header_returns_empty(
    provider: MemoryContextProvider,
) -> None:
    """Quando nenhuma memória cabe no budget, retorna string vazia."""
    # max_tokens=1 → budget_chars=4, nenhuma linha de memória vai caber
    block = provider._format_with_budget(
        [make_memory("chave_muito_longa", "valor muito longo", 1.0)],
        max_tokens=1,
    )
    assert block == ""


def test_get_context_block_calls_store_with_correct_args(
    provider: MemoryContextProvider, mock_store: MagicMock
) -> None:
    """get_context_block passa user_id correto ao store."""
    mock_store.get_memories.return_value = []
    provider.get_context_block("user-xyz")
    mock_store.get_memories.assert_called_once_with("user-xyz", limit=20, min_confidence=0.0)


def test_boost_by_topic_returns_sorted_list(
    provider: MemoryContextProvider,
) -> None:
    """_boost_by_topic retorna lista com memórias relevantes ao tópico primeiro."""
    memories = [
        make_memory("outro", "irrelevante", 0.5),
        make_memory("formato_saida", "tabela", 0.5),
    ]
    boosted = provider._boost_by_topic(memories, "formato")
    # "formato_saida" tem match no key "formato", deve vir primeiro
    assert boosted[0].key == "formato_saida"
