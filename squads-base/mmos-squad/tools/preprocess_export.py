#!/usr/bin/env python3
"""Pré-processa exports de ChatGPT/Gemini para uso no DNA extraction prompt."""

import json
import zipfile
from pathlib import Path


def preprocess_chatgpt(zip_path: str | Path, max_tokens: int = 100_000) -> str:
    """Extrai e formata conversas do export do ChatGPT.

    Args:
        zip_path: Caminho para o ZIP exportado do ChatGPT.
        max_tokens: Limite de tokens (heurística: chars/4). Prioriza mais recentes.

    Returns:
        String formatada pronta para inserir no prompt.
    """
    zip_path = Path(zip_path)

    with zipfile.ZipFile(zip_path) as zf:
        conversations_file = next(
            (n for n in zf.namelist() if n.endswith("conversations.json")),
            None,
        )
        if not conversations_file:
            msg = "conversations.json não encontrado no ZIP"
            raise FileNotFoundError(msg)

        with zf.open(conversations_file) as f:
            conversations: list[dict] = json.load(f)

    # Filtrar conversas com >= 3 turnos do usuário
    valid = [c for c in conversations if _count_user_turns_chatgpt(c) >= 3]

    # Ordenar por mais recentes (create_time ou índice reverso)
    valid.sort(key=lambda c: c.get("create_time", 0), reverse=True)

    output_parts: list[str] = []
    total_chars = 0
    max_chars = max_tokens * 4

    for conv in valid:
        formatted = _format_chatgpt_conversation(conv)
        if total_chars + len(formatted) > max_chars:
            break
        output_parts.append(formatted)
        total_chars += len(formatted)

    return "\n\n" + ("=" * 50) + "\n\n".join(output_parts)


def preprocess_gemini(zip_path: str | Path, max_tokens: int = 100_000) -> str:
    """Extrai e formata conversas do export do Gemini.

    Args:
        zip_path: Caminho para o ZIP exportado do Gemini.
        max_tokens: Limite de tokens.

    Returns:
        String formatada.
    """
    zip_path = Path(zip_path)

    with zipfile.ZipFile(zip_path) as zf:
        json_files = [n for n in zf.namelist() if n.endswith(".json")]
        if not json_files:
            msg = "Nenhum arquivo JSON encontrado no ZIP do Gemini"
            raise FileNotFoundError(msg)

        conversations: list[dict] = []
        for fname in json_files:
            with zf.open(fname) as f:
                try:
                    data = json.load(f)
                    if isinstance(data, list):
                        conversations.extend(data)
                    elif isinstance(data, dict):
                        conversations.append(data)
                except json.JSONDecodeError:
                    continue

    output_parts: list[str] = []
    total_chars = 0
    max_chars = max_tokens * 4

    for conv in conversations:
        formatted = _format_gemini_conversation(conv)
        if not formatted:
            continue
        if total_chars + len(formatted) > max_chars:
            break
        output_parts.append(formatted)
        total_chars += len(formatted)

    return "\n\n" + ("=" * 50) + "\n\n".join(output_parts)


def _count_user_turns_chatgpt(conversation: dict) -> int:
    """Conta turnos do usuário em uma conversa ChatGPT."""
    mapping = conversation.get("mapping", {})
    count = 0
    for node in mapping.values():
        msg = node.get("message")
        if msg and msg.get("author", {}).get("role") == "user":
            content = msg.get("content", {})
            if isinstance(content, dict) and content.get("parts"):
                count += 1
    return count


def _format_chatgpt_conversation(conversation: dict) -> str:
    """Formata uma conversa ChatGPT como texto legível."""
    title = conversation.get("title", "Sem título")
    mapping = conversation.get("mapping", {})
    lines = [f"### Conversa: {title}\n"]

    # Reconstruir ordem das mensagens (seguindo parent links)
    nodes_by_id = {nid: node for nid, node in mapping.items()}
    ordered_msgs: list[dict] = []

    # Encontrar raiz
    root_id = next((nid for nid, n in nodes_by_id.items() if n.get("parent") is None), None)
    if root_id:
        current_id: str | None = root_id
        while current_id:
            node = nodes_by_id.get(current_id, {})
            msg = node.get("message")
            if msg:
                ordered_msgs.append(msg)
            children = node.get("children", [])
            current_id = children[0] if children else None

    for msg in ordered_msgs:
        role = msg.get("author", {}).get("role", "")
        if role not in ("user", "assistant"):
            continue
        content = msg.get("content", {})
        parts = content.get("parts", []) if isinstance(content, dict) else []
        text = " ".join(str(p) for p in parts if isinstance(p, str)).strip()
        if text:
            prefix = "Usuário" if role == "user" else "IA"
            lines.append(f"**{prefix}**: {text[:1000]}")

    return "\n".join(lines)


def _format_gemini_conversation(conversation: dict) -> str:
    """Formata uma conversa Gemini como texto legível."""
    lines: list[str] = []
    messages = conversation.get("messages", conversation.get("turns", []))
    if not messages:
        return ""

    lines.append("### Conversa Gemini\n")
    for msg in messages:
        role = msg.get("role", msg.get("author", ""))
        text = msg.get("text", msg.get("content", ""))
        if isinstance(text, list):
            text = " ".join(str(t) for t in text)
        if role and text:
            prefix = "Usuário" if "user" in str(role).lower() else "IA"
            lines.append(f"**{prefix}**: {str(text)[:1000]}")

    return "\n".join(lines) if len(lines) > 1 else ""


if __name__ == "__main__":
    import argparse

    parser = argparse.ArgumentParser(description="Pré-processa exports de LLMs para DNA Mental")
    parser.add_argument("zip_path", help="Caminho para o ZIP exportado")
    parser.add_argument("--source", choices=["chatgpt", "gemini"], default="chatgpt")
    parser.add_argument("--max-tokens", type=int, default=100_000)
    args = parser.parse_args()

    if args.source == "chatgpt":
        result = preprocess_chatgpt(args.zip_path, args.max_tokens)
    else:
        result = preprocess_gemini(args.zip_path, args.max_tokens)

    print(result)
