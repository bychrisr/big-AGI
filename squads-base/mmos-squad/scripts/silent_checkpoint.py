"""SilentCheckpoint: captura padrões implícitos de comportamento do usuário."""

import asyncio
import logging
import re
from dataclasses import dataclass, field
from typing import Any

logger = logging.getLogger(__name__)


@dataclass
class MemoryCandidate:
    """Candidato a memória detectado implicitamente."""

    key: str
    value: str
    confidence: float
    source_trigger: str = ""

    def is_committable(self) -> bool:
        """Retorna True se confidence acima do threshold mínimo."""
        return self.confidence > 0.65


@dataclass
class DebateSessionData:
    """Dados de sessão para análise do checkpoint."""

    turns: list[dict[str, Any]] = field(default_factory=list)
    user_messages: list[str] = field(default_factory=list)


# Padrões de correção de output
_CORRECTION_PATTERNS = [
    r"n[aã]o[,.]?\s+(?:eu\s+)?queria?\s+dizer",
    r"na\s+verdade[,.]",
    r"corrij[ae]\s+para",
    r"quis\s+dizer",
    r"errei[,.]",
    r"não\s+é\s+isso",
]

# Padrões de pedido de reformatação
_REFORMAT_PATTERNS = [
    r"coloca?\s+em\s+tabela",
    r"formato?\s+bullet\s+points?",
    r"mais\s+curto",
    r"lista\s+numerada",
    r"em\s+t[oó]picos?",
    r"reformata",
    r"reescreve\s+como",
    r"coloca?\s+em\s+markdown",
]

_CORRECTION_RE = [re.compile(p, re.IGNORECASE) for p in _CORRECTION_PATTERNS]
_REFORMAT_RE = [re.compile(p, re.IGNORECASE) for p in _REFORMAT_PATTERNS]


class SilentCheckpoint:
    """Observa sessões e detecta padrões implícitos de preferência."""

    CHECKPOINT_TIMEOUT_SECONDS = 30

    def __init__(self, memory_store: Any) -> None:
        """Args:
            memory_store: MemoryStore para commit dos candidatos.
        """
        self._store = memory_store

    def analyze(self, session: DebateSessionData) -> list[MemoryCandidate]:
        """Analisa sessão e retorna candidatos a memória.

        Args:
            session: Dados da sessão com turns e mensagens do usuário.

        Returns:
            Lista de MemoryCandidate com confidence > 0.
        """
        candidates: list[MemoryCandidate] = []

        correction = self._detect_user_corrected_output(session)
        if correction:
            candidates.append(correction)

        reformat = self._detect_user_reformatted(session)
        if reformat:
            candidates.append(reformat)

        if self._detect_theme_expanded(session):
            candidates.append(
                MemoryCandidate(
                    key="interesse_profundo",
                    value=f"tema debatido em profundidade ({len(session.turns)} turnos)",
                    confidence=0.60,
                    source_trigger="theme_expanded",
                )
            )

        return candidates

    def commit(self, user_id: str, candidates: list[MemoryCandidate]) -> int:
        """Persiste candidatos committable via MemoryStore.

        Args:
            user_id: ID do usuário.
            candidates: Lista de candidatos analisados.

        Returns:
            Número de memórias efetivamente commitadas.
        """
        committed = 0
        committable = [c for c in candidates if c.is_committable()]

        for candidate in committable:
            try:
                self._store.record_explicit(
                    user_id=user_id,
                    key=candidate.key,
                    value=candidate.value,
                    source="checkpoint",
                )
                committed += 1
                logger.debug(
                    "Checkpoint committed: %s = %s (conf: %.2f)",
                    candidate.key,
                    candidate.value,
                    candidate.confidence,
                )
            except Exception:
                logger.exception("Failed to commit candidate: %s", candidate.key)

        logger.info("Checkpoint: %d/%d candidates committed", committed, len(candidates))
        return committed

    async def run_async(self, user_id: str, session: DebateSessionData) -> None:
        """Executa análise e commit em background sem bloquear a sessão."""
        try:
            async with asyncio.timeout(self.CHECKPOINT_TIMEOUT_SECONDS):
                candidates = self.analyze(session)
                await asyncio.get_event_loop().run_in_executor(
                    None, self.commit, user_id, candidates
                )
        except TimeoutError:
            logger.warning(
                "SilentCheckpoint timed out after %ds", self.CHECKPOINT_TIMEOUT_SECONDS
            )
        except Exception:
            logger.exception("SilentCheckpoint failed silently")

    def _detect_user_corrected_output(
        self, session: DebateSessionData
    ) -> MemoryCandidate | None:
        for msg in session.user_messages:
            for pattern in _CORRECTION_RE:
                if pattern.search(msg):
                    return MemoryCandidate(
                        key="historico_correcoes",
                        value="usuário corrigiu output do agente",
                        confidence=0.80,
                        source_trigger="output_correction",
                    )
        return None

    def _detect_user_reformatted(
        self, session: DebateSessionData
    ) -> MemoryCandidate | None:
        for msg in session.user_messages:
            for pattern in _REFORMAT_RE:
                m = pattern.search(msg)
                if m:
                    return MemoryCandidate(
                        key="preferencia_formato",
                        value=msg.strip()[:100],
                        confidence=0.75,
                        source_trigger="reformat_request",
                    )
        return None

    def _detect_theme_expanded(self, session: DebateSessionData) -> bool:
        return len(session.turns) > 5
