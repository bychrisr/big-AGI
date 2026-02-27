"""SessionStore: persistencia de sessoes de debate no Supabase."""

from __future__ import annotations

from typing import TYPE_CHECKING, Any

if TYPE_CHECKING:
    from supabase import Client


class SessionStore:
    """Persistencia de sessoes de debate no Supabase.

    O client Supabase deve ser inicializado com o JWT do usuario para que
    as RLS policies sejam aplicadas corretamente (auth.uid() = user_id).
    """

    TABLE = "debate_sessions"

    def __init__(self, client: Client) -> None:
        """Inicializa com client Supabase ja configurado.

        Args:
            client: Client Supabase autenticado com o JWT do usuario.
        """
        self.client = client

    def save(self, session_data: dict[str, Any], user_id: str) -> None:
        """Salva ou atualiza uma sessao de debate (upsert idempotente).

        Args:
            session_data: Dict retornado por DebateSession.to_dict().
            user_id: UUID do usuario autenticado.
        """
        token_usage = session_data.get("token_usage", {})
        total_tokens = token_usage.get("total_input", 0) + token_usage.get("total_output", 0)

        row = {
            "user_id": user_id,
            "session_id": session_data["session_id"],
            "topic": session_data["topic"],
            "minds": session_data["minds"],
            "turns": session_data.get("turns", []),
            "token_usage": token_usage,
            "total_tokens": total_tokens,
            "initialized": {},
        }
        self.client.table(self.TABLE).upsert(row, on_conflict="session_id").execute()

    def load(self, session_id: str) -> dict[str, Any] | None:
        """Carrega uma sessao pelo session_id.

        Args:
            session_id: ID unico da sessao.

        Returns:
            Dict compativel com DebateSession.from_dict(), ou None se nao encontrada.
        """
        result = (
            self.client.table(self.TABLE)
            .select("*")
            .eq("session_id", session_id)
            .single()
            .execute()
        )
        if not result.data:
            return None
        return self._row_to_session_data(result.data)

    def list_sessions(
        self,
        user_id: str,
        status: str = "active",
        limit: int = 20,
        offset: int = 0,
    ) -> list[dict[str, Any]]:
        """Lista sessoes do usuario com paginacao.

        Args:
            user_id: UUID do usuario.
            status: Filtro de status ('active', 'completed', 'archived').
            limit: Maximo de registros retornados.
            offset: Deslocamento para paginacao.

        Returns:
            Lista de resumos de sessoes (sem turns completos).
        """
        result = (
            self.client.table(self.TABLE)
            .select("session_id, topic, minds, total_tokens, status, created_at, updated_at")
            .eq("user_id", user_id)
            .eq("status", status)
            .order("created_at", desc=True)
            .range(offset, offset + limit - 1)
            .execute()
        )
        return result.data or []

    def delete(self, session_id: str) -> bool:
        """Remove uma sessao permanentemente (hard delete).

        Args:
            session_id: ID da sessao a remover.

        Returns:
            True se algum registro foi removido.
        """
        result = (
            self.client.table(self.TABLE)
            .delete()
            .eq("session_id", session_id)
            .execute()
        )
        return bool(result.data)

    def archive(self, session_id: str) -> None:
        """Arquiva uma sessao (soft delete — muda status para 'archived').

        Args:
            session_id: ID da sessao a arquivar.
        """
        self.client.table(self.TABLE).update(
            {"status": "archived"}
        ).eq("session_id", session_id).execute()

    @staticmethod
    def _row_to_session_data(row: dict[str, Any]) -> dict[str, Any]:
        """Converte row do Supabase para formato esperado por DebateSession.from_dict()."""
        return {
            "session_id": row["session_id"],
            "topic": row["topic"],
            "minds": row["minds"],
            "turns": row.get("turns") or [],
            "token_usage": row.get("token_usage") or {},
            "created_at": row.get("created_at", ""),
            "user_id": str(row["user_id"]),
        }
