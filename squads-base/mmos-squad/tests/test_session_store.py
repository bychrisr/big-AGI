"""Testes para SessionStore com mock do cliente Supabase."""

from pathlib import Path
from unittest.mock import MagicMock, patch

import pytest

from debate_engine.engine import DebateEngine, TurnResult
from debate_engine.mind_loader import MindLoader
from debate_engine.session import DebateSession
from debate_engine.session_store import SessionStore


# ---------------------------------------------------------------------------
# Helpers e fixtures
# ---------------------------------------------------------------------------

USER_A = "user-uuid-aaaa-1111"
USER_B = "user-uuid-bbbb-2222"
SESSION_ID = "session-test-1234"


def _make_supabase_client(select_data: dict | None = None) -> MagicMock:
    """Cria mock do Supabase client com interface fluente."""
    client = MagicMock()

    # Resposta padrao para queries
    result_mock = MagicMock()
    result_mock.data = select_data

    # Cadeia fluente: table().select().eq().single().execute()
    table_mock = client.table.return_value
    table_mock.select.return_value = table_mock
    table_mock.eq.return_value = table_mock
    table_mock.single.return_value = table_mock
    table_mock.execute.return_value = result_mock
    table_mock.upsert.return_value = table_mock
    table_mock.delete.return_value = table_mock
    table_mock.update.return_value = table_mock
    table_mock.order.return_value = table_mock
    table_mock.range.return_value = table_mock

    return client


def _make_session_data(
    session_id: str = SESSION_ID,
    topic: str = "inovacao",
    turns: list | None = None,
) -> dict:
    """Cria dict no formato DebateSession.to_dict()."""
    return {
        "session_id": session_id,
        "topic": topic,
        "minds": ["mind_a", "mind_b"],
        "turns": turns or [],
        "token_usage": {
            "total_input": 100,
            "total_output": 50,
            "turns": 1,
            "by_mind": {"mind_a": {"input": 100, "output": 50}},
        },
        "created_at": "2026-01-01T00:00:00+00:00",
    }


@pytest.fixture()
def store() -> SessionStore:
    """SessionStore com client Supabase mockado."""
    client = _make_supabase_client()
    return SessionStore(client=client)


@pytest.fixture()
def engine() -> DebateEngine:
    return DebateEngine(api_key="fake-key")


@pytest.fixture()
def loader(tmp_path: Path) -> MindLoader:
    minds_dir = tmp_path / "minds"
    minds_dir.mkdir()
    return MindLoader(minds_dir)


# ---------------------------------------------------------------------------
# Testes de save()
# ---------------------------------------------------------------------------

def test_save_calls_upsert(store: SessionStore) -> None:
    """save() chama upsert com session_id como chave de conflito."""
    data = _make_session_data()
    store.save(data, USER_A)

    store.client.table.assert_called_with("debate_sessions")
    upsert_call = store.client.table.return_value.upsert
    upsert_call.assert_called_once()

    row_arg = upsert_call.call_args[0][0]
    assert row_arg["user_id"] == USER_A
    assert row_arg["session_id"] == SESSION_ID
    assert row_arg["topic"] == "inovacao"
    assert row_arg["minds"] == ["mind_a", "mind_b"]
    assert row_arg["turns"] == []


def test_save_computes_total_tokens(store: SessionStore) -> None:
    """save() calcula total_tokens a partir do token_usage."""
    data = _make_session_data()
    store.save(data, USER_A)

    upsert_call = store.client.table.return_value.upsert
    row_arg = upsert_call.call_args[0][0]
    # total_input=100 + total_output=50 = 150
    assert row_arg["total_tokens"] == 150


def test_save_with_empty_turns(store: SessionStore) -> None:
    """save() funciona com sessao sem turnos (turns=[])."""
    data = _make_session_data(turns=[])
    store.save(data, USER_A)

    upsert_call = store.client.table.return_value.upsert
    row_arg = upsert_call.call_args[0][0]
    assert row_arg["turns"] == []


# ---------------------------------------------------------------------------
# Testes de load()
# ---------------------------------------------------------------------------

def test_load_returns_session_data() -> None:
    """load() retorna dict com campos mapeados corretamente."""
    db_row = {
        "session_id": SESSION_ID,
        "topic": "estrategia",
        "minds": ["mind_a"],
        "turns": [{"mind_slug": "mind_a", "user_message": "msg", "response": "resp",
                   "input_tokens": 10, "output_tokens": 5, "timestamp": "2026-01-01T00:00:00"}],
        "token_usage": {"total_input": 10, "total_output": 5, "turns": 1, "by_mind": {}},
        "created_at": "2026-01-01T00:00:00+00:00",
        "user_id": USER_A,
    }
    client = _make_supabase_client(select_data=db_row)
    store = SessionStore(client=client)

    result = store.load(SESSION_ID)

    assert result is not None
    assert result["session_id"] == SESSION_ID
    assert result["topic"] == "estrategia"
    assert len(result["turns"]) == 1
    assert result["user_id"] == USER_A


def test_load_returns_none_when_not_found() -> None:
    """load() retorna None quando sessao nao existe."""
    client = _make_supabase_client(select_data=None)
    store = SessionStore(client=client)

    result = store.load("nao-existe")
    assert result is None


# ---------------------------------------------------------------------------
# Testes de list_sessions()
# ---------------------------------------------------------------------------

def test_list_sessions_filters_by_user_and_status() -> None:
    """list_sessions() aplica filtros de user_id e status."""
    sessions = [
        {"session_id": "s1", "topic": "T1", "minds": ["m1"], "total_tokens": 100,
         "status": "active", "created_at": "2026-01-02T00:00:00+00:00",
         "updated_at": "2026-01-02T00:00:00+00:00"},
    ]
    client = _make_supabase_client(select_data=sessions)
    store = SessionStore(client=client)

    result = store.list_sessions(USER_A, status="active", limit=10, offset=0)

    assert result == sessions
    table = client.table.return_value
    # Verifica que os filtros foram aplicados
    eq_calls = [call[0] for call in table.eq.call_args_list]
    assert ("user_id", USER_A) in eq_calls
    assert ("status", "active") in eq_calls


def test_list_sessions_returns_empty_list_when_none() -> None:
    """list_sessions() retorna [] quando query retorna None."""
    client = _make_supabase_client(select_data=None)
    store = SessionStore(client=client)

    result = store.list_sessions(USER_A)
    assert result == []


# ---------------------------------------------------------------------------
# Testes de delete()
# ---------------------------------------------------------------------------

def test_delete_returns_true_when_deleted() -> None:
    """delete() retorna True quando registro foi removido."""
    deleted_row = [{"session_id": SESSION_ID}]
    client = _make_supabase_client(select_data=deleted_row)
    store = SessionStore(client=client)

    result = store.delete(SESSION_ID)
    assert result is True


def test_delete_returns_false_when_not_found() -> None:
    """delete() retorna False quando nada foi removido."""
    client = _make_supabase_client(select_data=None)
    store = SessionStore(client=client)

    result = store.delete("nao-existe")
    assert result is False


# ---------------------------------------------------------------------------
# Testes de archive()
# ---------------------------------------------------------------------------

def test_archive_updates_status() -> None:
    """archive() chama update com status='archived'."""
    client = _make_supabase_client()
    store = SessionStore(client=client)

    store.archive(SESSION_ID)

    table = client.table.return_value
    table.update.assert_called_with({"status": "archived"})


# ---------------------------------------------------------------------------
# Testes de integração DebateSession + SessionStore
# ---------------------------------------------------------------------------

def test_run_turn_auto_saves(engine: DebateEngine, loader: MindLoader, tmp_path: Path) -> None:
    """run_turn() salva automaticamente quando session_store configurado."""
    # Criar mind temporario
    mind_slug = "mind_a"
    prompt_dir = loader.base / mind_slug / "system_prompts"
    prompt_dir.mkdir(parents=True)
    (prompt_dir / "main.md").write_text("Prompt.", encoding="utf-8")

    client = _make_supabase_client()
    store = SessionStore(client=client)

    session = DebateSession(
        topic="test",
        minds=[mind_slug],
        engine=engine,
        loader=loader,
        session_store=store,
        user_id=USER_A,
    )

    mock_result = TurnResult(
        mind_slug=mind_slug,
        content="resposta",
        input_tokens=10,
        output_tokens=5,
        model="claude-sonnet-4-20250514",
    )

    with patch.object(engine, "generate_response", return_value=mock_result):
        session.run_turn(mind_slug, "pergunta")

    # Deve ter chamado upsert uma vez apos o turno
    client.table.return_value.upsert.assert_called_once()


def test_run_turn_no_save_without_store(
    engine: DebateEngine, loader: MindLoader, tmp_path: Path
) -> None:
    """run_turn() nao tenta salvar quando session_store nao configurado."""
    mind_slug = "mind_a"
    prompt_dir = loader.base / mind_slug / "system_prompts"
    prompt_dir.mkdir(parents=True)
    (prompt_dir / "main.md").write_text("Prompt.", encoding="utf-8")

    session = DebateSession(
        topic="test",
        minds=[mind_slug],
        engine=engine,
        loader=loader,
        # sem session_store
    )

    mock_result = TurnResult(
        mind_slug=mind_slug,
        content="resposta",
        input_tokens=10,
        output_tokens=5,
        model="claude-sonnet-4-20250514",
    )

    with patch.object(engine, "generate_response", return_value=mock_result):
        session.run_turn(mind_slug, "pergunta")

    assert session.session_store is None


def test_resume_reconstructs_session(engine: DebateEngine, loader: MindLoader) -> None:
    """resume() reconstroi DebateSession a partir de dados salvos."""
    db_row = {
        "session_id": SESSION_ID,
        "topic": "estrategia",
        "minds": ["mind_a"],
        "turns": [
            {
                "mind_slug": "mind_a",
                "user_message": "Como crescer?",
                "response": "Foque no cliente.",
                "input_tokens": 50,
                "output_tokens": 25,
                "timestamp": "2026-01-01T00:00:00+00:00",
            }
        ],
        "token_usage": {"total_input": 50, "total_output": 25, "turns": 1, "by_mind": {}},
        "created_at": "2026-01-01T00:00:00+00:00",
        "user_id": USER_A,
    }
    client = _make_supabase_client(select_data=db_row)
    store = SessionStore(client=client)

    session = DebateSession.resume(
        session_id=SESSION_ID,
        engine=engine,
        loader=loader,
        session_store=store,
    )

    assert session.session_id == SESSION_ID
    assert session.topic == "estrategia"
    assert len(session.turns) == 1
    assert session.turns[0].user_message == "Como crescer?"
    assert session.session_store is store
    assert session.user_id == USER_A


def test_resume_raises_for_missing_session(engine: DebateEngine, loader: MindLoader) -> None:
    """resume() levanta ValueError se sessao nao existir."""
    client = _make_supabase_client(select_data=None)
    store = SessionStore(client=client)

    with pytest.raises(ValueError, match="nao encontrada"):
        DebateSession.resume(
            session_id="nao-existe",
            engine=engine,
            loader=loader,
            session_store=store,
        )
