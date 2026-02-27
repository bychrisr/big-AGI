"""Testes para MindLoader."""

import pytest

from debate_engine.mind_loader import MindLoader


@pytest.fixture()
def tmp_minds_dir(tmp_path):
    """Fixture: diretorio temporario com estrutura de minds."""
    minds_dir = tmp_path / "minds"

    # Mind completo
    mind_dir = minds_dir / "test_mind"
    (mind_dir / "system_prompts").mkdir(parents=True)
    (mind_dir / "kb").mkdir()
    (mind_dir / "system_prompts" / "main.md").write_text("# Test Mind\nVoce e especialista.")
    (mind_dir / "kb" / "chunk1.md").write_text("Conteudo chunk 1")
    (mind_dir / "kb" / "chunk2.md").write_text("Conteudo chunk 2")

    # Mind sem KB
    mind_no_kb = minds_dir / "mind_no_kb"
    (mind_no_kb / "system_prompts").mkdir(parents=True)
    (mind_no_kb / "system_prompts" / "main.md").write_text("Sem KB")

    return minds_dir


@pytest.fixture()
def loader(tmp_minds_dir):
    """Fixture: MindLoader apontando para tmp."""
    return MindLoader(tmp_minds_dir)


def test_load_system_prompt(loader):
    """load_system_prompt retorna conteudo correto."""
    prompt = loader.load_system_prompt("test_mind")
    assert "Test Mind" in prompt
    assert "especialista" in prompt


def test_load_kb_concatenates_chunks(loader):
    """load_kb concatena todos os chunks em ordem."""
    kb = loader.load_kb("test_mind")
    assert "Conteudo chunk 1" in kb
    assert "Conteudo chunk 2" in kb
    assert "---" in kb  # separador entre chunks


def test_load_kb_chunks_sorted(loader):
    """load_kb retorna chunks em ordem alfabetica."""
    kb = loader.load_kb("test_mind")
    idx1 = kb.index("Conteudo chunk 1")
    idx2 = kb.index("Conteudo chunk 2")
    assert idx1 < idx2


def test_load_kb_empty_when_no_kb_dir(loader):
    """load_kb retorna string vazia quando KB nao existe."""
    kb = loader.load_kb("mind_no_kb")
    assert kb == ""


def test_load_kb_empty_when_mind_not_found(loader):
    """load_kb retorna string vazia quando mind nao existe."""
    kb = loader.load_kb("nonexistent_mind")
    assert kb == ""


def test_system_prompt_not_found_raises(loader):
    """load_system_prompt levanta FileNotFoundError para mind inexistente."""
    with pytest.raises(FileNotFoundError, match="System prompt nao encontrado"):
        loader.load_system_prompt("nonexistent_mind")


def test_mind_exists_true_for_valid_mind(loader):
    """mind_exists retorna True para mind existente."""
    assert loader.mind_exists("test_mind") is True


def test_mind_exists_false_for_nonexistent(loader):
    """mind_exists retorna False para mind inexistente."""
    assert loader.mind_exists("ghost_mind") is False


def test_loader_accepts_string_path(tmp_minds_dir):
    """MindLoader aceita path como string."""
    loader = MindLoader(str(tmp_minds_dir))
    assert loader.mind_exists("test_mind") is True


def test_load_system_prompt_uses_utf8(loader, tmp_minds_dir):
    """load_system_prompt le arquivo com encoding utf-8."""
    mind_dir = tmp_minds_dir / "utf_mind"
    (mind_dir / "system_prompts").mkdir(parents=True)
    (mind_dir / "system_prompts" / "main.md").write_text(
        "Prompt com acento: negociacao", encoding="utf-8"
    )
    prompt = loader.load_system_prompt("utf_mind")
    assert "negociacao" in prompt
