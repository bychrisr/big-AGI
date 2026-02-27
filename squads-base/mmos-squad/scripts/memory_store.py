"""MemoryStore: persiste memórias do usuário no Supabase."""

import re
import unicodedata
from dataclasses import dataclass
from typing import Any


@dataclass
class Memory:
    """Uma memória do usuário."""

    user_id: str
    key: str
    value: str
    confidence: float
    source: str  # 'explicit' | 'checkpoint' | 'pattern'
    created_at: str = ""
    last_applied: str = ""


class MemoryStore:
    """Gerencia memórias persistidas no Supabase."""

    VALID_SOURCES = frozenset({"explicit", "checkpoint", "pattern"})
    DEFAULT_CONFIDENCE = 0.7

    def __init__(self, supabase_client: Any) -> None:
        """Args:
            supabase_client: Cliente Supabase (supabase-py).
        """
        self._db = supabase_client

    def record_explicit(
        self,
        user_id: str,
        key: str,
        value: str,
        source: str = "explicit",
    ) -> Memory:
        """Salva/atualiza uma memória no Supabase (upsert).

        Args:
            user_id: ID do usuário Supabase.
            key: Chave da memória (normalizada para snake_case).
            value: Valor da memória.
            source: Origem da memória.

        Returns:
            Memory com os dados persistidos.
        """
        if source not in self.VALID_SOURCES:
            msg = f"source inválido: {source!r}. Valores válidos: {self.VALID_SOURCES}"
            raise ValueError(msg)

        normalized_key = self._normalize_key(key)
        confidence = 1.0 if source == "explicit" else self.DEFAULT_CONFIDENCE

        data = {
            "user_id": user_id,
            "key": normalized_key,
            "value": value,
            "confidence": confidence,
            "source": source,
        }

        self._db.table("user_memories").upsert(
            data,
            on_conflict="user_id,key",
        ).execute()

        return Memory(
            user_id=user_id,
            key=normalized_key,
            value=value,
            confidence=confidence,
            source=source,
        )

    def get_memories(
        self,
        user_id: str,
        limit: int = 20,
        min_confidence: float = 0.0,
    ) -> list[Memory]:
        """Retorna memórias do usuário ordenadas por confidence DESC.

        Args:
            user_id: ID do usuário.
            limit: Máximo de memórias a retornar.
            min_confidence: Filtrar memórias abaixo deste threshold.

        Returns:
            Lista de Memory ordenada por confidence DESC, last_applied DESC.
        """
        response = (
            self._db.table("user_memories")
            .select("*")
            .eq("user_id", user_id)
            .gte("confidence", min_confidence)
            .order("confidence", desc=True)
            .order("last_applied", desc=True)
            .limit(limit)
            .execute()
        )
        return [
            Memory(
                user_id=row["user_id"],
                key=row["key"],
                value=row["value"],
                confidence=row["confidence"],
                source=row["source"],
                created_at=row.get("created_at", ""),
                last_applied=row.get("last_applied", ""),
            )
            for row in (response.data or [])
        ]

    def delete_memory(self, user_id: str, key: str) -> None:
        """Remove uma memória do Supabase."""
        normalized_key = self._normalize_key(key)
        (
            self._db.table("user_memories")
            .delete()
            .eq("user_id", user_id)
            .eq("key", normalized_key)
            .execute()
        )

    @staticmethod
    def _normalize_key(raw_key: str) -> str:
        """Normaliza chave para snake_case sem acentos.

        Ex: "preferência de formato" -> "preferencia_de_formato"
        """
        # Remove acentos via NFD normalization
        normalized = unicodedata.normalize("NFD", raw_key)
        ascii_only = normalized.encode("ascii", "ignore").decode("ascii")
        # Lowercase, substitui espaços/hífens por underscore, remove chars especiais
        snake = re.sub(r"[^a-z0-9_]", "_", ascii_only.lower().strip())
        # Remove underscores múltiplos
        return re.sub(r"_+", "_", snake).strip("_")
