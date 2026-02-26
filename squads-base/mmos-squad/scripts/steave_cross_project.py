"""
Integração do CrossProjectContextProvider no pipeline do Steave (squad-lead).
Detecta padrões cross-project e formata notificações inline.
"""
from __future__ import annotations

from dataclasses import dataclass, field

from cross_project_context import (
    CrossProjectContextProvider,
    CrossProjectInsight,
    ProjectPattern,
)


@dataclass
class CrossProjectNotification:
    """Notificação formatada para exibição inline na conversa."""

    insight: CrossProjectInsight
    inline_message: str
    options: list[str] = field(
        default_factory=lambda: ['Sim, conte mais', 'Não, foca no projeto atual']
    )


class SteaveContextIntegration:
    """
    Hook no pipeline do Steave para detectar e notificar padrões cross-project.

    Uso:
        integration = SteaveContextIntegration()
        notification = await integration.check_for_insights(
            current_project='teamAI',
            user_message='Como implementar caching de sessão?',
            user_projects=[...],
        )
        if notification:
            # Prepend inline_message before Steave's normal response
    """

    def __init__(self, threshold: float = 0.7) -> None:
        self._provider = CrossProjectContextProvider(threshold=threshold)
        self._notification_log: list[dict] = []

    def reset_session(self) -> None:
        self._provider.reset_session()
        self._notification_log.clear()

    async def check_for_insights(
        self,
        current_project: str,
        user_message: str,
        user_projects: list[ProjectPattern],
    ) -> CrossProjectNotification | None:
        """
        Verifica se há insights cross-project relevantes.
        Não bloqueia — timeout de 5s (configurado no provider).
        """
        insight = await self._provider.find_relevant_past_decision(
            current_project=current_project,
            current_problem=user_message,
            user_projects=user_projects,
        )

        if insight is None:
            return None

        inline_message = self._format_steave_notification(insight)

        # Log para análise de qualidade
        self._notification_log.append({
            'source_project': insight.source_project,
            'target_project': current_project,
            'insight_summary': insight.relevant_decision[:100],
            'confidence': insight.confidence,
        })

        return CrossProjectNotification(
            insight=insight,
            inline_message=inline_message,
        )

    def _format_steave_notification(self, insight: CrossProjectInsight) -> str:
        """Tom natural do Steave — direto, útil, não intrusivo."""
        confidence_pct = int(insight.confidence * 100)
        decision_preview = (
            insight.relevant_decision[:80]
            + ('...' if len(insight.relevant_decision) > 80 else '')
        )

        return (
            f"Lembro que em **{insight.source_project_name}** você resolveu algo parecido: "
            f'"{decision_preview}" ({confidence_pct}% de similaridade). '
            f"Quer que eu traga esse contexto?"
        )

    def get_notification_log(self) -> list[dict]:
        """Retorna log de notificações para análise."""
        return self._notification_log.copy()

    async def get_expanded_context(self, insight: CrossProjectInsight) -> str:
        """Traz contexto completo quando usuário responde 'Sim, conte mais'."""
        return (
            f"**Contexto de {insight.source_project_name}:**\n\n"
            f"Decisão: {insight.relevant_decision}\n\n"
            f"Esta abordagem pode ser relevante para o problema atual. "
            f"Como aplicar: adapte o padrão ao contexto específico do projeto atual, "
            f"considerando as diferenças de escala e tecnologia."
        )
