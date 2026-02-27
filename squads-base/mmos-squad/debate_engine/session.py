"""DebateSession: gerencia estado e caching de uma sessão de debate."""

from __future__ import annotations

import uuid
from dataclasses import dataclass, field
from datetime import UTC, datetime
from typing import TYPE_CHECKING, Any

from debate_engine.engine import DebateEngine, TurnResult
from debate_engine.mind_loader import MindLoader
from debate_engine.token_counter import SessionTokenUsage

if TYPE_CHECKING:
    from debate_engine.session_store import SessionStore


@dataclass
class DebateTurn:
    """Um turno de debate."""

    mind_slug: str
    user_message: str
    response: str
    input_tokens: int
    output_tokens: int
    timestamp: str = field(
        default_factory=lambda: datetime.now(UTC).isoformat()
    )


@dataclass
class MindCache:
    """Cache do system prompt + KB para um mind na sessão."""

    system_prompt: str
    kb_context: str


class DebateSession:
    """Gerencia estado de uma sessão de debate com caching de system prompts."""

    def __init__(
        self,
        topic: str,
        minds: list[str],
        engine: DebateEngine,
        loader: MindLoader,
        session_id: str | None = None,
        session_store: SessionStore | None = None,
        user_id: str = "",
    ) -> None:
        """Inicializa sessão de debate.

        Args:
            topic: Tópico do debate.
            minds: Lista de slugs dos minds participantes.
            engine: DebateEngine configurado com API key.
            loader: MindLoader para carregar system prompts e KB.
            session_id: ID da sessão. Gerado automaticamente se None.
            session_store: SessionStore opcional para persistência automática.
            user_id: UUID do usuário autenticado (necessário se session_store for fornecido).
        """
        self.session_id = session_id or str(uuid.uuid4())
        self.topic = topic
        self.minds = minds
        self.engine = engine
        self.loader = loader
        self.session_store = session_store
        self.user_id = user_id
        self.turns: list[DebateTurn] = []
        self.token_usage = SessionTokenUsage()
        self.created_at = datetime.now(UTC).isoformat()
        self._mind_cache: dict[str, MindCache] = {}

    def _get_mind_cache(self, mind_slug: str) -> MindCache:
        """Retorna cache do mind, carregando na primeira vez (lazy loading)."""
        if mind_slug not in self._mind_cache:
            system_prompt = self.loader.load_system_prompt(mind_slug)
            kb_context = self.loader.load_kb(mind_slug, topic=self.topic)
            self._mind_cache[mind_slug] = MindCache(
                system_prompt=system_prompt,
                kb_context=kb_context,
            )
        return self._mind_cache[mind_slug]

    def run_turn(
        self,
        mind_slug: str,
        user_message: str,
        max_tokens: int | None = None,
    ) -> TurnResult:
        """Executa um turno do debate para um mind específico.

        System prompt e KB carregados apenas no primeiro turno de cada mind (cached).

        Args:
            mind_slug: Slug do mind que vai responder.
            user_message: Mensagem do usuário.
            max_tokens: Limite de tokens na resposta.

        Returns:
            TurnResult com resposta e token usage.
        """
        cache = self._get_mind_cache(mind_slug)
        result = self.engine.generate_response(
            mind_slug=mind_slug,
            system_prompt=cache.system_prompt,
            kb_context=cache.kb_context,
            user_message=user_message,
            max_tokens=max_tokens,
        )

        turn = DebateTurn(
            mind_slug=mind_slug,
            user_message=user_message,
            response=result.content,
            input_tokens=result.input_tokens,
            output_tokens=result.output_tokens,
        )
        self.turns.append(turn)
        self.token_usage.add_turn(mind_slug, result.input_tokens, result.output_tokens)

        # Auto-save após cada turno se SessionStore configurado
        if self.session_store and self.user_id:
            self.session_store.save(self.to_dict(), self.user_id)

        return result

    def to_dict(self) -> dict[str, Any]:
        """Serializa sessão para dict (para persistência no Supabase)."""
        return {
            "session_id": self.session_id,
            "topic": self.topic,
            "minds": self.minds,
            "turns": [
                {
                    "mind_slug": t.mind_slug,
                    "user_message": t.user_message,
                    "response": t.response,
                    "input_tokens": t.input_tokens,
                    "output_tokens": t.output_tokens,
                    "timestamp": t.timestamp,
                }
                for t in self.turns
            ],
            "token_usage": {
                "total_input": self.token_usage.total_input,
                "total_output": self.token_usage.total_output,
                "turns": self.token_usage.turns,
                "by_mind": self.token_usage.by_mind,
            },
            "created_at": self.created_at,
        }

    @classmethod
    def from_dict(
        cls,
        data: dict[str, Any],
        engine: DebateEngine,
        loader: MindLoader,
    ) -> "DebateSession":
        """Reconstrói sessão a partir de dict serializado."""
        session = cls(
            topic=data["topic"],
            minds=data["minds"],
            engine=engine,
            loader=loader,
            session_id=data["session_id"],
        )
        session.created_at = data.get("created_at", session.created_at)

        for t in data.get("turns", []):
            session.turns.append(
                DebateTurn(
                    mind_slug=t["mind_slug"],
                    user_message=t["user_message"],
                    response=t["response"],
                    input_tokens=t["input_tokens"],
                    output_tokens=t["output_tokens"],
                    timestamp=t.get("timestamp", ""),
                )
            )
            session.token_usage.add_turn(
                t["mind_slug"], t["input_tokens"], t["output_tokens"]
            )

        return session

    @classmethod
    def resume(
        cls,
        session_id: str,
        engine: DebateEngine,
        loader: MindLoader,
        session_store: SessionStore,
    ) -> "DebateSession":
        """Retoma uma sessao salva no Supabase.

        Args:
            session_id: ID da sessao a retomar.
            engine: DebateEngine configurado com API key.
            loader: MindLoader para carregar system prompts e KB.
            session_store: SessionStore para carregar e continuar persistindo.

        Returns:
            DebateSession reconstruida com historico de turnos.

        Raises:
            ValueError: Se a sessao nao for encontrada.
        """
        data = session_store.load(session_id)
        if data is None:
            msg = f"Sessao nao encontrada: {session_id}"
            raise ValueError(msg)
        session = cls.from_dict(data, engine=engine, loader=loader)
        session.session_store = session_store
        session.user_id = data.get("user_id", "")
        return session
