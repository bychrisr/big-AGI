"""Testes para kb_compressor."""

from pathlib import Path

import pytest

from debate_engine.kb_compressor import extract_relevant_chunks


@pytest.fixture()
def kb_dir(tmp_path: Path) -> Path:
    """Fixture: diretório kb/ com arquivos .md."""
    kb = tmp_path / "kb"
    kb.mkdir()
    return kb


def _write_chunks(kb: Path, count: int, prefix: str = "Conteudo generico do chunk") -> None:
    """Escreve `count` arquivos .md no diretório kb/."""
    for i in range(count):
        (kb / f"chunk_{i:03d}.md").write_text(f"{prefix} {i}.", encoding="utf-8")


def test_extract_relevant_chunks_returns_top_n(kb_dir: Path) -> None:
    """KB com 15 chunks e max_chunks=5 retorna exatamente 5 chunks."""
    _write_chunks(kb_dir, 15)

    result = extract_relevant_chunks(kb_dir, topic="generico", max_chunks=5)

    # 5 chunks separados por "---" = 4 separadores
    parts = result.split("\n\n---\n\n")
    assert len(parts) == 5


def test_relevance_scoring_prefers_topic_matches(kb_dir: Path) -> None:
    """Chunks com keywords do tópico têm score maior e aparecem primeiro."""
    # Chunk relevante ao tópico "machine learning"
    (kb_dir / "relevant.md").write_text(
        "Machine learning and deep learning are transforming AI.", encoding="utf-8"
    )
    # Chunk irrelevante
    (kb_dir / "irrelevant.md").write_text(
        "Receita de bolo de chocolate com cobertura.", encoding="utf-8"
    )

    result = extract_relevant_chunks(kb_dir, topic="machine learning", max_chunks=10)

    # O chunk relevante deve aparecer antes do irrelevante
    assert result.index("Machine learning") < result.index("Receita de bolo")


def test_empty_kb_returns_empty_string(tmp_path: Path) -> None:
    """KB vazia ou inexistente retorna string vazia."""
    # Diretório inexistente
    assert extract_relevant_chunks(tmp_path / "nao_existe", topic="qualquer") == ""

    # Diretório existente mas sem arquivos .md
    empty_kb = tmp_path / "empty_kb"
    empty_kb.mkdir()
    assert extract_relevant_chunks(empty_kb, topic="qualquer") == ""


def test_no_topic_returns_all_chunks_up_to_max(kb_dir: Path) -> None:
    """Sem tópico (topic=''), retorna até max_chunks chunks."""
    _write_chunks(kb_dir, 8)

    # max_chunks maior que total de chunks: retorna todos
    result_all = extract_relevant_chunks(kb_dir, topic="", max_chunks=20)
    assert len(result_all.split("\n\n---\n\n")) == 8

    # max_chunks menor que total: retorna exatamente max_chunks
    result_limited = extract_relevant_chunks(kb_dir, topic="", max_chunks=3)
    assert len(result_limited.split("\n\n---\n\n")) == 3


def test_max_chunks_zero_returns_empty_string(kb_dir: Path) -> None:
    """max_chunks=0 retorna string vazia."""
    _write_chunks(kb_dir, 5)
    result = extract_relevant_chunks(kb_dir, topic="algo", max_chunks=0)
    assert result == ""


def test_chunks_separated_by_correct_delimiter(kb_dir: Path) -> None:
    """Chunks são separados pelo delimitador correto '\\n\\n---\\n\\n'."""
    _write_chunks(kb_dir, 3)

    result = extract_relevant_chunks(kb_dir, topic="", max_chunks=3)

    assert "\n\n---\n\n" in result


def test_nonexistent_path_as_string_returns_empty() -> None:
    """Caminho inexistente passado como string retorna string vazia."""
    result = extract_relevant_chunks("/caminho/que/nao/existe/kb", topic="topico")
    assert result == ""


def test_kb_with_single_chunk_returns_without_delimiter(kb_dir: Path) -> None:
    """KB com um único chunk não inclui o delimitador."""
    (kb_dir / "unico.md").write_text("Conteudo unico.", encoding="utf-8")

    result = extract_relevant_chunks(kb_dir, topic="unico", max_chunks=10)

    assert result == "Conteudo unico."
    assert "---" not in result
