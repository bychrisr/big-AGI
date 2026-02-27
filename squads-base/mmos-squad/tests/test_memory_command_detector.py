"""Testes para memory_command_detector."""

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent / "scripts"))

from memory_command_detector import (
    detect_memory_command,
    extract_key_value,
    format_confirmation,
)


def test_detects_grava_na_memoria() -> None:
    """'grava na memoria que...' é detectado como comando de memória."""
    result = detect_memory_command("grava na memoria que eu prefiro bullet points")
    assert result.detected is True
    assert result.raw_phrase != ""


def test_detects_grava_na_memoria_com_acento() -> None:
    """'grava na memória que...' (com acento) é detectado."""
    result = detect_memory_command("grava na memória que eu prefiro bullet points")
    assert result.detected is True


def test_detects_lembra_que() -> None:
    """'lembra que eu...' é detectado como comando de memória."""
    result = detect_memory_command("lembra que eu uso Mac")
    assert result.detected is True
    assert result.raw_phrase != ""


def test_detects_anota_que() -> None:
    """'anota que...' é detectado como comando de memória."""
    result = detect_memory_command("anota que meu formato preferido é tabela")
    assert result.detected is True


def test_detects_memoriza_que() -> None:
    """'memoriza que...' é detectado como comando de memória."""
    result = detect_memory_command("memoriza que trabalho com Python")
    assert result.detected is True


def test_detects_salva_que() -> None:
    """'salva que...' é detectado como comando de memória."""
    result = detect_memory_command("salva que prefiro respostas curtas")
    assert result.detected is True


def test_detects_registra_que() -> None:
    """'registra que...' é detectado como comando de memória."""
    result = detect_memory_command("registra que minha linguagem é TypeScript")
    assert result.detected is True


def test_detects_guarda_na_memoria() -> None:
    """'guarda na memoria que...' é detectado como comando de memória."""
    result = detect_memory_command("guarda na memoria que prefiro bullet points")
    assert result.detected is True


def test_no_command_returns_not_detected() -> None:
    """Frase comum sem comando de memória retorna detected=False."""
    result = detect_memory_command("qual a capital do Brasil?")
    assert result.detected is False
    assert result.key == ""
    assert result.value == ""


def test_no_command_casual_lembro() -> None:
    """'eu lembro que ontem...' não é detectado como comando (pattern diferente)."""
    result = detect_memory_command("eu lembro que ontem você disse isso")
    assert result.detected is False


def test_no_command_empty_message() -> None:
    """Mensagem vazia não é detectada como comando."""
    result = detect_memory_command("")
    assert result.detected is False


def test_extract_key_value_e_pattern() -> None:
    """'formato é bullet points' extrai key='formato' e value='bullet points'."""
    key, value = extract_key_value("formato é bullet points")
    assert key == "formato"
    assert value == "bullet points"


def test_extract_key_value_colon_pattern() -> None:
    """'linguagem: Python' extrai key='linguagem' e value='Python'."""
    key, value = extract_key_value("linguagem: Python")
    assert key == "linguagem"
    assert value == "Python"


def test_extract_key_value_equals_pattern() -> None:
    """'formato = tabela' extrai key='formato' e value='tabela'."""
    key, value = extract_key_value("formato = tabela")
    assert key == "formato"
    assert value == "tabela"


def test_extract_key_value_prefiro_pattern() -> None:
    """'prefiro bullet points' resulta em key='preferencia'."""
    key, value = extract_key_value("prefiro bullet points")
    assert key == "preferencia"
    assert value == "bullet points"


def test_extract_key_value_gosto_de_pattern() -> None:
    """'gosto de respostas curtas' resulta em key='preferencia'."""
    key, value = extract_key_value("gosto de respostas curtas")
    assert key == "preferencia"
    assert value == "respostas curtas"


def test_extract_key_value_fallback() -> None:
    """Frase sem padrão reconhecível usa fallback com key='memoria'."""
    key, value = extract_key_value("qualquer coisa aqui")
    assert key == "memoria"
    assert value == "qualquer coisa aqui"


def test_detect_extracts_key_value_from_e_pattern() -> None:
    """detect_memory_command extrai key e value de 'formato é bullet points'."""
    result = detect_memory_command("grava na memoria que formato é bullet points")
    assert result.detected is True
    assert result.key == "formato"
    assert result.value == "bullet points"


def test_format_confirmation_output() -> None:
    """format_confirmation gera string de confirmação com key e value."""
    msg = format_confirmation("formato", "bullet points")
    assert "formato" in msg
    assert "bullet points" in msg


def test_detect_command_strips_trailing_period() -> None:
    """Ponto final no final da frase é removido do raw_phrase."""
    result = detect_memory_command("anota que prefiro Python.")
    assert result.detected is True
    assert not result.raw_phrase.endswith(".")


def test_detect_command_case_insensitive() -> None:
    """Detecção é case-insensitive."""
    result = detect_memory_command("GRAVA NA MEMORIA que prefiro tabelas")
    assert result.detected is True


def test_memory_command_not_detected_has_empty_fields() -> None:
    """MemoryCommand não detectado tem campos raw_phrase, key e value vazios."""
    result = detect_memory_command("bom dia, como vai?")
    assert result.detected is False
    assert result.raw_phrase == ""
    assert result.key == ""
    assert result.value == ""
