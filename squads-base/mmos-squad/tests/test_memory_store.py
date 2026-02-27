"""Testes para MemoryStore e normalização de chaves."""

import sys
from pathlib import Path
from unittest.mock import MagicMock

import pytest

sys.path.insert(0, str(Path(__file__).parent.parent / "scripts"))

from memory_store import Memory, MemoryStore


@pytest.fixture()
def mock_db() -> MagicMock:
    """Fixture: supabase_client mockado com chain fluente."""
    db = MagicMock()
    # Chain: table().upsert().execute() e table().select()...execute()
    db.table.return_value = db
    db.upsert.return_value = db
    db.select.return_value = db
    db.eq.return_value = db
    db.gte.return_value = db
    db.order.return_value = db
    db.limit.return_value = db
    db.delete.return_value = db
    db.execute.return_value = MagicMock(data=[])
    return db


@pytest.fixture()
def store(mock_db: MagicMock) -> MemoryStore:
    """Fixture: MemoryStore com client mockado."""
    return MemoryStore(mock_db)


def test_normalize_key_converts_spaces_to_snake(store: MemoryStore) -> None:
    """'preferência de formato' é normalizado para 'preferencia_de_formato'."""
    result = store._normalize_key("preferência de formato")
    assert result == "preferencia_de_formato"


def test_normalize_key_removes_accents(store: MemoryStore) -> None:
    """Acentos são removidos na normalização."""
    result = store._normalize_key("Análise com NÚMEROS")
    assert result == "analise_com_numeros"


def test_normalize_key_lowercase(store: MemoryStore) -> None:
    """Chave é convertida para lowercase."""
    result = store._normalize_key("UPPERCASE KEY")
    assert result == "uppercase_key"


def test_normalize_key_collapses_multiple_underscores(store: MemoryStore) -> None:
    """Underscores múltiplos são colapsados para um único."""
    result = store._normalize_key("key  with   spaces")
    assert result == "key_with_spaces"


def test_record_explicit_confidence_is_1(store: MemoryStore, mock_db: MagicMock) -> None:
    """source='explicit' resulta em confidence=1.0."""
    memory = store.record_explicit("user-123", "formato", "bullet points", source="explicit")
    assert memory.confidence == 1.0


def test_record_checkpoint_confidence_default(store: MemoryStore, mock_db: MagicMock) -> None:
    """source='checkpoint' resulta em confidence=0.7 (DEFAULT_CONFIDENCE)."""
    memory = store.record_explicit("user-123", "formato", "bullet points", source="checkpoint")
    assert memory.confidence == MemoryStore.DEFAULT_CONFIDENCE


def test_record_pattern_confidence_default(store: MemoryStore, mock_db: MagicMock) -> None:
    """source='pattern' resulta em confidence=0.7 (DEFAULT_CONFIDENCE)."""
    memory = store.record_explicit("user-123", "formato", "bullet points", source="pattern")
    assert memory.confidence == MemoryStore.DEFAULT_CONFIDENCE


def test_invalid_source_raises_value_error(store: MemoryStore) -> None:
    """source inválido levanta ValueError com mensagem informativa."""
    with pytest.raises(ValueError, match="source inválido"):
        store.record_explicit("user-123", "key", "value", source="invalid")


def test_record_explicit_normalizes_key(store: MemoryStore, mock_db: MagicMock) -> None:
    """record_explicit normaliza a chave antes de persistir."""
    memory = store.record_explicit("user-123", "preferência de formato", "bullets")
    assert memory.key == "preferencia_de_formato"


def test_record_explicit_calls_upsert(store: MemoryStore, mock_db: MagicMock) -> None:
    """record_explicit chama upsert no Supabase com on_conflict correto."""
    store.record_explicit("user-123", "key", "value")
    mock_db.upsert.assert_called_once()
    call_kwargs = mock_db.upsert.call_args[1]
    assert call_kwargs["on_conflict"] == "user_id,key"


def test_record_explicit_returns_memory(store: MemoryStore, mock_db: MagicMock) -> None:
    """record_explicit retorna instância de Memory com dados corretos."""
    memory = store.record_explicit("user-abc", "formato", "tabela")
    assert isinstance(memory, Memory)
    assert memory.user_id == "user-abc"
    assert memory.value == "tabela"
    assert memory.source == "explicit"


def test_get_memories_returns_list(store: MemoryStore, mock_db: MagicMock) -> None:
    """get_memories retorna lista de Memory a partir dos dados do Supabase."""
    mock_db.execute.return_value = MagicMock(
        data=[
            {
                "user_id": "user-1",
                "key": "formato",
                "value": "bullets",
                "confidence": 1.0,
                "source": "explicit",
                "created_at": "2026-01-01T00:00:00",
                "last_applied": "2026-01-02T00:00:00",
            }
        ]
    )
    memories = store.get_memories("user-1")
    assert len(memories) == 1
    assert memories[0].key == "formato"
    assert memories[0].confidence == 1.0


def test_get_memories_empty_returns_empty_list(
    store: MemoryStore, mock_db: MagicMock
) -> None:
    """get_memories retorna lista vazia quando Supabase retorna nenhum dado."""
    mock_db.execute.return_value = MagicMock(data=[])
    memories = store.get_memories("user-no-memories")
    assert memories == []


def test_delete_memory_calls_delete(store: MemoryStore, mock_db: MagicMock) -> None:
    """delete_memory chama delete no Supabase com user_id e key corretos."""
    store.delete_memory("user-123", "formato")
    mock_db.delete.assert_called_once()
