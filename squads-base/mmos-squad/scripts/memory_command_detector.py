"""Detecta comandos explícitos de memória no chat do usuário."""

import re
from dataclasses import dataclass


@dataclass
class MemoryCommand:
    """Resultado da detecção de comando de memória."""

    detected: bool
    raw_phrase: str = ""
    key: str = ""
    value: str = ""


# Padrões que indicam intenção explícita de gravar memória
_TRIGGER_PATTERNS = [
    r"grava(?:r)?\s+na\s+mem[oó]ria\s+que\s+(.+)",
    r"lembra(?:r)?\s+que\s+eu\s+(.+)",
    r"anota(?:r)?\s+que\s+(.+)",
    r"memoriza(?:r)?\s+que\s+(.+)",
    r"salva(?:r)?\s+que\s+(.+)",
    r"registra(?:r)?\s+que\s+(.+)",
    r"guarda(?:r)?\s+na\s+mem[oó]ria\s+(.+)",
]

_COMPILED = [re.compile(p, re.IGNORECASE) for p in _TRIGGER_PATTERNS]


def detect_memory_command(message: str) -> MemoryCommand:
    """Detecta se a mensagem contém um comando de gravação de memória.

    Args:
        message: Mensagem do usuário.

    Returns:
        MemoryCommand com detected=True e key/value extraídos se encontrado.
    """
    for pattern in _COMPILED:
        match = pattern.search(message)
        if match:
            phrase = match.group(1).strip().rstrip(".")
            key, value = extract_key_value(phrase)
            return MemoryCommand(detected=True, raw_phrase=phrase, key=key, value=value)
    return MemoryCommand(detected=False)


def extract_key_value(phrase: str) -> tuple[str, str]:
    """Extrai chave e valor de uma frase de memória.

    Tenta separar por padrões: "X é Y", "X: Y", "X = Y", "prefiro X", "gosto de X".
    Se não conseguir separar, usa a frase inteira como valor com chave genérica.

    Returns:
        Tuple (key, value).
    """
    # "X é Y" ou "X são Y"
    m = re.match(r"^(.+?)\s+[eé]\s+(.+)$", phrase, re.IGNORECASE)
    if m:
        return m.group(1).strip(), m.group(2).strip()

    # "X: Y" ou "X = Y"
    m = re.match(r"^(.+?)\s*[:=]\s*(.+)$", phrase)
    if m:
        return m.group(1).strip(), m.group(2).strip()

    # "prefiro X" / "gosto de X"
    m = re.match(r"^(?:prefiro|gosto\s+de|uso|trabalho\s+com)\s+(.+)$", phrase, re.IGNORECASE)
    if m:
        return "preferencia", m.group(1).strip()

    # Fallback: phrase inteira como valor
    return "memoria", phrase


def format_confirmation(key: str, value: str) -> str:
    """Gera mensagem de confirmação da memória gravada."""
    return f"✓ Gravado: **{key}** = {value}"
