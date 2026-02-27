"""Testes para CrossProjectContextProvider — Story 6.1."""

import asyncio
import sys
from pathlib import Path
from unittest.mock import patch

import pytest

sys.path.insert(0, str(Path(__file__).parent.parent / "scripts"))

from cross_project_context import (
    CrossProjectContextProvider,
    CrossProjectInsight,
    ProjectPattern,
)


# ─── Fixtures ────────────────────────────────────────────────────────────────

@pytest.fixture()
def provider() -> CrossProjectContextProvider:
    return CrossProjectContextProvider(threshold=0.3)


def make_project(pid: str, name: str, decisions: list[str]) -> ProjectPattern:
    return ProjectPattern(
        project_id=pid,
        project_name=name,
        decisions=decisions,
        technologies=["python"],
        patterns=["clean architecture"],
    )


# ─── find_relevant_past_decision ─────────────────────────────────────────────

@pytest.mark.asyncio()
async def test_find_relevant_returns_insight_for_similar_problem(
    provider: CrossProjectContextProvider,
) -> None:
    projects = [
        make_project("proj-B", "Projeto B", ["usar supabase para autenticação e dados"]),
    ]
    insight = await provider.find_relevant_past_decision(
        "proj-A", "autenticação com supabase", projects
    )
    assert insight is not None
    assert insight.source_project == "proj-B"
    assert insight.confidence > 0.3


@pytest.mark.asyncio()
async def test_find_relevant_returns_none_when_below_threshold(
    provider: CrossProjectContextProvider,
) -> None:
    projects = [
        make_project("proj-B", "Projeto B", ["receita de bolo de chocolate"]),
    ]
    insight = await provider.find_relevant_past_decision(
        "proj-A", "autenticação JWT supabase", projects
    )
    assert insight is None


@pytest.mark.asyncio()
async def test_find_relevant_skips_current_project(
    provider: CrossProjectContextProvider,
) -> None:
    projects = [
        make_project("proj-A", "Projeto A", ["usar supabase para autenticação"]),
        make_project("proj-B", "Projeto B", ["redis cache performance"]),
    ]
    insight = await provider.find_relevant_past_decision(
        "proj-A", "autenticação supabase", projects
    )
    # proj-A deve ser ignorado — só proj-B considerado, mas sem match
    assert insight is None or insight.source_project != "proj-A"


@pytest.mark.asyncio()
async def test_find_relevant_respects_timeout() -> None:
    """Timeout pequeno retorna None sem levantar TimeoutError."""
    provider = CrossProjectContextProvider(threshold=0.3, timeout=0.001)
    projects = [make_project("proj-B", "B", ["auth supabase"])]

    # Simula operação lenta que excede o timeout
    async def slow_find(*args: object, **kwargs: object) -> None:
        await asyncio.sleep(10)

    with patch.object(provider, "_find_insight", slow_find):
        result = await provider.find_relevant_past_decision("proj-A", "auth supabase", projects)
    assert result is None


# ─── Spam prevention ─────────────────────────────────────────────────────────

@pytest.mark.asyncio()
async def test_spam_prevention_same_insight_not_returned_twice(
    provider: CrossProjectContextProvider,
) -> None:
    projects = [
        make_project("proj-B", "Projeto B", ["usar supabase autenticacao"]),
    ]
    first = await provider.find_relevant_past_decision(
        "proj-A", "supabase autenticacao", projects
    )
    second = await provider.find_relevant_past_decision(
        "proj-A", "supabase autenticacao", projects
    )
    assert first is not None
    assert second is None  # já notificado


@pytest.mark.asyncio()
async def test_reset_session_clears_spam_prevention(
    provider: CrossProjectContextProvider,
) -> None:
    projects = [make_project("proj-B", "B", ["supabase autenticacao usuario"])]

    first = await provider.find_relevant_past_decision("proj-A", "supabase autenticacao", projects)
    assert first is not None

    provider.reset_session()

    second = await provider.find_relevant_past_decision("proj-A", "supabase autenticacao", projects)
    assert second is not None  # após reset, volta a notificar


# ─── format_insight ───────────────────────────────────────────────────────────

def test_format_insight_contains_project_name(
    provider: CrossProjectContextProvider,
) -> None:
    insight = CrossProjectInsight(
        source_project="proj-B",
        source_project_name="Meu Projeto B",
        relevant_decision="usar supabase para auth",
        confidence=0.80,
    )
    formatted = provider.format_insight(insight)
    assert "Meu Projeto B" in formatted


def test_format_insight_contains_decision(
    provider: CrossProjectContextProvider,
) -> None:
    insight = CrossProjectInsight(
        source_project="proj-B",
        source_project_name="B",
        relevant_decision="usar redis para cache",
        confidence=0.75,
    )
    formatted = provider.format_insight(insight)
    assert "usar redis para cache" in formatted


def test_format_insight_contains_confidence_percentage(
    provider: CrossProjectContextProvider,
) -> None:
    insight = CrossProjectInsight(
        source_project="proj-B",
        source_project_name="B",
        relevant_decision="usar supabase",
        confidence=0.80,
    )
    formatted = provider.format_insight(insight)
    assert "80%" in formatted
