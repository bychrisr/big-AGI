"""KB Compressor: extrai chunks relevantes da knowledge base por tópico."""

import re
from pathlib import Path


def extract_relevant_chunks(
    kb_path: str | Path,
    topic: str,
    max_chunks: int = 10,
) -> str:
    """Extrai os chunks mais relevantes da KB para um tópico.

    Args:
        kb_path: Caminho para o diretório kb/ do mind.
        topic: Tópico do debate para filtrar relevância.
        max_chunks: Número máximo de chunks a retornar.

    Returns:
        String com chunks relevantes separados por "\\n\\n---\\n\\n".
        String vazia se KB não existir ou estiver vazia.
    """
    kb_dir = Path(kb_path)
    if not kb_dir.exists() or not kb_dir.is_dir():
        return ""

    chunks = sorted(kb_dir.glob("*.md"))
    if not chunks:
        return ""

    # Tokenizar tópico para keyword matching
    topic_keywords = _tokenize(topic)

    # Pontuar cada chunk por relevância
    scored: list[tuple[float, str]] = []
    for chunk_path in chunks:
        content = chunk_path.read_text(encoding="utf-8")
        score = _score_relevance(content, topic_keywords)
        scored.append((score, content))

    # Ordenar por score decrescente, pegar top-N
    scored.sort(key=lambda x: x[0], reverse=True)
    selected = [content for _, content in scored[:max_chunks]]

    return "\n\n---\n\n".join(selected)


def _tokenize(text: str) -> set[str]:
    """Converte texto em conjunto de tokens lowercase."""
    return set(re.findall(r"[a-záàâãéêíóôõúüçA-ZÁÀÂÃÉÊÍÓÔÕÚÜÇ]{3,}", text.lower()))


def _score_relevance(content: str, keywords: set[str]) -> float:
    """Pontua relevância de um chunk baseado em keyword matching.

    Returns:
        Score entre 0.0 e 1.0.
    """
    if not keywords:
        return 0.5  # sem tópico = todos iguais

    content_tokens = _tokenize(content)
    matches = keywords & content_tokens

    # Score = fração de keywords encontradas no chunk
    base_score = len(matches) / len(keywords) if keywords else 0.0

    # Boost se keyword aparece no início do chunk (mais relevante)
    first_200 = content[:200].lower()
    boost = sum(0.1 for kw in keywords if kw in first_200)

    return min(1.0, base_score + boost)
