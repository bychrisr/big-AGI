"""
CrossProjectContextProvider: detecta similaridade semântica entre o problema atual
e decisões de outros projetos do usuário para surfar insights relevantes.
"""
from __future__ import annotations

import asyncio
import hashlib
import re
import unicodedata
from dataclasses import dataclass, field


@dataclass
class ProjectPattern:
    project_id: str
    project_name: str
    decisions: list[str]
    technologies: list[str]
    patterns: list[str]
    keywords: set[str] = field(default_factory=set)

    def __post_init__(self) -> None:
        if not self.keywords:
            all_text = ' '.join(self.decisions + self.technologies + self.patterns)
            self.keywords = _extract_keywords(all_text)


@dataclass
class CrossProjectInsight:
    source_project: str
    source_project_name: str
    relevant_decision: str
    confidence: float
    context: str = ''


def _normalize(text: str) -> str:
    """NFD normalization para suporte a acentos do português."""
    return unicodedata.normalize('NFD', text.lower())


def _extract_keywords(text: str) -> set[str]:
    """Extrai keywords significativas (3+ chars, ignora stopwords)."""
    stopwords = {
        'the', 'and', 'or', 'for', 'with', 'from', 'that', 'this',
        'are', 'was', 'has', 'not', 'but', 'can', 'use', 'get',
        'uma', 'para', 'com', 'que', 'por', 'não', 'mais', 'como',
        'ser', 'ter', 'foi', 'nos', 'das', 'dos', 'seu', 'sua',
    }
    words = re.findall(r'\w{3,}', _normalize(text))
    return {w for w in words if w not in stopwords}


def _keyword_similarity(kw_a: set[str], kw_b: set[str]) -> float:
    """Jaccard similarity entre dois conjuntos de keywords."""
    if not kw_a or not kw_b:
        return 0.0
    intersection = kw_a & kw_b
    union = kw_a | kw_b
    base = len(intersection) / len(union)
    # Boost para matches em textos mais curtos (mais específicos)
    return min(1.0, base * 1.2)


class CrossProjectContextProvider:
    """
    Detecta insights relevantes de outros projetos do usuário.

    Executa de forma assíncrona sem bloquear a sessão principal.
    Previne spam: mesmo insight não notifica 2x na mesma sessão.
    """

    def __init__(self, threshold: float = 0.7, timeout: float = 5.0) -> None:
        self.threshold = threshold
        self.timeout = timeout
        self._notified_insights: set[str] = set()  # reset por sessão

    def reset_session(self) -> None:
        """Reset do histórico de notificações (nova sessão)."""
        self._notified_insights.clear()

    async def load_user_projects(self, user_id: str) -> list[dict]:
        """Busca projetos do usuário da tabela user_projects no Supabase.

        Requer SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY nas env vars.
        Fallback: retorna lista vazia se Supabase não disponível.
        """
        import os
        try:
            supabase_url = os.environ.get('SUPABASE_URL', '')
            service_key = os.environ.get('SUPABASE_SERVICE_ROLE_KEY', '')
            if not supabase_url or not service_key:
                return []

            from supabase import create_client
            client = create_client(supabase_url, service_key)
            result = client.table('user_projects') \
                .select('project_name, claude_md, patterns') \
                .eq('user_id', user_id) \
                .execute()
            return result.data or []
        except Exception as e:
            print(f"[CrossProjectContextProvider] load_user_projects failed: {e}")
            return []

    async def find_relevant_past_decision(
        self,
        current_project: str,
        current_problem: str,
        user_projects: list[ProjectPattern],
    ) -> CrossProjectInsight | None:
        """
        Busca decision de outro projeto similar ao problema atual.

        Args:
            current_project: ID do projeto atual (excluído da busca)
            current_problem: Texto do problema/pergunta atual
            user_projects: Lista de padrões de outros projetos

        Returns:
            CrossProjectInsight se confidence > threshold, None caso contrário
        """
        try:
            return await asyncio.wait_for(
                self._find_insight(current_project, current_problem, user_projects),
                timeout=self.timeout,
            )
        except TimeoutError:
            return None

    async def _find_insight(
        self,
        current_project: str,
        current_problem: str,
        user_projects: list[ProjectPattern],
    ) -> CrossProjectInsight | None:
        problem_keywords = _extract_keywords(current_problem)

        best: CrossProjectInsight | None = None
        best_confidence = 0.0

        for project in user_projects:
            if project.project_id == current_project:
                continue  # Pular projeto atual

            # Calcular similarity com cada decisão do projeto
            for decision in project.decisions:
                decision_keywords = _extract_keywords(decision)
                confidence = _keyword_similarity(problem_keywords, decision_keywords)

                if confidence > best_confidence:
                    best_confidence = confidence
                    best = CrossProjectInsight(
                        source_project=project.project_id,
                        source_project_name=project.project_name,
                        relevant_decision=decision,
                        confidence=confidence,
                    )

        if best is None or best.confidence <= self.threshold:
            return None

        # Verificar spam prevention
        insight_hash = hashlib.md5(
            f"{best.source_project}:{best.relevant_decision}".encode()
        ).hexdigest()

        if insight_hash in self._notified_insights:
            return None  # Já notificado nesta sessão

        self._notified_insights.add(insight_hash)
        return best

    def format_insight(self, insight: CrossProjectInsight) -> str:
        """Formata insight para exibição inline."""
        confidence_pct = int(insight.confidence * 100)
        return (
            f"Detectei algo parecido em **{insight.source_project_name}**: "
            f'"{insight.relevant_decision}" '
            f"(confiança: {confidence_pct}%). Quer considerar isso aqui?"
        )
