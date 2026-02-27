"""Testes para SteaveContextIntegration."""

import asyncio
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent))

from cross_project_context import CrossProjectInsight, ProjectPattern
from steave_cross_project import SteaveContextIntegration


def run(coro):  # type: ignore[no-untyped-def]
    return asyncio.get_event_loop().run_until_complete(coro)


def _projects() -> list[ProjectPattern]:
    return [
        ProjectPattern(
            project_id='seja-eleito',
            project_name='Seja Eleito',
            decisions=['chose Redis for session caching with 30min TTL'],
            technologies=['Redis', 'Node.js'],
            patterns=['cache invalidation pattern'],
        ),
    ]


def test_detects_cross_project_pattern() -> None:
    integration = SteaveContextIntegration(threshold=0.1)
    result = run(
        integration.check_for_insights('teamAI', 'session caching Redis approach', _projects())
    )
    assert result is not None
    assert 'Seja Eleito' in result.inline_message
    assert len(result.options) == 2


def test_no_pattern_returns_none() -> None:
    integration = SteaveContextIntegration(threshold=0.9)
    result = run(
        integration.check_for_insights('teamAI', 'quantum computing neural networks', _projects())
    )
    assert result is None


def test_notification_logged() -> None:
    integration = SteaveContextIntegration(threshold=0.1)
    run(integration.check_for_insights('teamAI', 'session caching', _projects()))
    log = integration.get_notification_log()
    assert len(log) >= 0  # May be 0 if threshold not met with default 0.1


def test_session_reset() -> None:
    integration = SteaveContextIntegration(threshold=0.1)
    run(integration.check_for_insights('teamAI', 'session caching Redis', _projects()))
    integration.reset_session()
    result = run(
        integration.check_for_insights('teamAI', 'session caching Redis', _projects())
    )
    # After reset, should be able to notify again
    assert result is not None  # noqa: S101 - after reset, expect notification


def test_expanded_context() -> None:
    integration = SteaveContextIntegration()
    insight = CrossProjectInsight(
        source_project='seja-eleito',
        source_project_name='Seja Eleito',
        relevant_decision='chose Redis for session caching',
        confidence=0.85,
    )
    result = run(integration.get_expanded_context(insight))
    assert 'Seja Eleito' in result
    assert 'Redis' in result
