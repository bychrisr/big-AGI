"""MemoryContextProvider: injeta memórias do usuário no context dos agents."""

import logging
from typing import TYPE_CHECKING, Any

if TYPE_CHECKING:
    from scripts.memory_store import MemoryStore

logger = logging.getLogger(__name__)


class MemoryContextProvider:
    """Carrega e formata memórias para injeção no system prompt."""

    DEFAULT_MAX_TOKENS = 2000
    TOKENS_PER_CHAR = 0.25  # heurística: 1 token ≈ 4 chars

    def __init__(self, memory_store: "MemoryStore") -> None:
        self._store = memory_store

    def _estimate_tokens(self, text: str) -> int:
        """Estima número de tokens de um texto.

        Heurística: len(text) * TOKENS_PER_CHAR (1 token ≈ 4 chars).

        Args:
            text: Texto a estimar.

        Returns:
            Estimativa do número de tokens.
        """
        return max(1, int(len(text) * self.TOKENS_PER_CHAR))

    def get_context_block(
        self,
        user_id: str,
        max_tokens: int = DEFAULT_MAX_TOKENS,
        topic: str | None = None,
    ) -> str:
        """Retorna bloco de memórias formatado para injeção no system prompt.

        Atualiza `last_applied` das memórias injetadas para tracking de uso.

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
        block, injected = self._format_with_budget_tracked(memories, max_tokens)
        if not block:
            return ""

        # Atualizar last_applied das memórias injetadas
        logger.info("[memory] Injetando %d memórias (%d tokens estimados)",
                    len(injected), self._estimate_tokens(block))
        for mem in injected:
            try:
                self._store.record_explicit(
                    user_id, mem.key, mem.value, source=mem.source
                )
            except Exception:  # noqa: BLE001
                pass  # Falha silenciosa — não bloquear o fluxo principal

        return block

    def _boost_by_topic(self, memories: list[Any], topic: str) -> list[Any]:
        """Reordena memórias: as relacionadas ao tópico primeiro."""
        topic_words = set(topic.lower().split())

        def relevance(m: Any) -> float:
            text = f"{m.key} {m.value}".lower()
            matches = sum(1 for w in topic_words if w in text)
            return m.confidence + (matches * 0.1)

        return sorted(memories, key=relevance, reverse=True)

    def _format_with_budget(self, memories: list[Any], max_tokens: int) -> str:
        """Formata memórias respeitando orçamento de tokens (sem tracking)."""
        block, _ = self._format_with_budget_tracked(memories, max_tokens)
        return block

    def _format_with_budget_tracked(
        self, memories: list[Any], max_tokens: int
    ) -> tuple[str, list[Any]]:
        """Formata memórias respeitando orçamento, retornando também as injetadas."""
        lines = ["## Memórias do Usuário", "Preferências registradas pelo usuário:"]
        budget_chars = max_tokens / self.TOKENS_PER_CHAR
        current_chars = sum(len(line) for line in lines)
        injected: list[Any] = []

        for mem in memories:
            line = f"- **{mem.key}**: {mem.value} (confidence: {mem.confidence:.2f})"
            if current_chars + len(line) > budget_chars:
                break
            lines.append(line)
            current_chars += len(line)
            injected.append(mem)

        if not injected:
            return "", []

        return "\n".join(lines), injected
