"""MemoryContextProvider: injeta memórias do usuário no context dos agents."""

from typing import TYPE_CHECKING, Any

if TYPE_CHECKING:
    from scripts.memory_store import MemoryStore


class MemoryContextProvider:
    """Carrega e formata memórias para injeção no system prompt."""

    DEFAULT_MAX_TOKENS = 2000
    TOKENS_PER_CHAR = 0.25  # heurística: 1 token ≈ 4 chars

    def __init__(self, memory_store: "MemoryStore") -> None:
        self._store = memory_store

    def get_context_block(
        self,
        user_id: str,
        max_tokens: int = DEFAULT_MAX_TOKENS,
        topic: str | None = None,
    ) -> str:
        """Retorna bloco de memórias formatado para injeção no system prompt.

        Args:
            user_id: ID do usuário Supabase.
            max_tokens: Orçamento máximo de tokens para o bloco.
            topic: Tópico atual para boost de relevância.

        Returns:
            String markdown com memórias. String vazia se não houver memórias.
        """
        memories = self._store.get_memories(user_id, limit=20, min_confidence=0.0)
        if not memories:
            return ""

        # Boost memórias relacionadas ao tópico
        if topic:
            memories = self._boost_by_topic(memories, topic)

        # Formatar e truncar para caber no orçamento
        return self._format_with_budget(memories, max_tokens)

    def _boost_by_topic(self, memories: list[Any], topic: str) -> list[Any]:
        """Reordena memórias: as relacionadas ao tópico primeiro."""
        topic_words = set(topic.lower().split())

        def relevance(m: Any) -> float:
            text = f"{m.key} {m.value}".lower()
            matches = sum(1 for w in topic_words if w in text)
            return m.confidence + (matches * 0.1)

        return sorted(memories, key=relevance, reverse=True)

    def _format_with_budget(self, memories: list[Any], max_tokens: int) -> str:
        """Formata memórias respeitando orçamento de tokens."""
        lines = ["## Memórias do Usuário", "Preferências registradas pelo usuário:"]
        budget_chars = max_tokens / self.TOKENS_PER_CHAR
        current_chars = sum(len(line) for line in lines)

        for mem in memories:
            line = f"- **{mem.key}**: {mem.value} (confidence: {mem.confidence:.2f})"
            if current_chars + len(line) > budget_chars:
                break
            lines.append(line)
            current_chars += len(line)

        if len(lines) <= 2:
            return ""

        return "\n".join(lines)
