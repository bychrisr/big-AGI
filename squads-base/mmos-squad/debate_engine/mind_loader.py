"""MindLoader: carrega system_prompt e KB de um mind."""

from pathlib import Path


class MindLoader:
    """Carrega system_prompt e KB de um mind."""

    def __init__(self, minds_base_path: str | Path) -> None:
        """Inicializa o MindLoader.

        Args:
            minds_base_path: Caminho base para o diretorio de minds.
        """
        self.base = Path(minds_base_path)

    def load_system_prompt(self, mind_slug: str) -> str:
        """Carrega o system prompt principal do mind.

        Args:
            mind_slug: Slug do mind (ex: 'alex_hormozi').

        Returns:
            Conteudo do system prompt.

        Raises:
            FileNotFoundError: Se system prompt nao encontrado.
        """
        prompt_dir = self.base / mind_slug / "system_prompts"
        prompt_file = prompt_dir / "main.md"
        if not prompt_file.exists():
            msg = f"System prompt nao encontrado: {prompt_file}"
            raise FileNotFoundError(msg)
        return prompt_file.read_text(encoding="utf-8")

    def load_kb(self, mind_slug: str, topic: str = "") -> str:
        """Carrega KB do mind, comprimida por tópico se fornecido.

        Args:
            mind_slug: Slug do mind.
            topic: Tópico do debate para filtrar relevância. Vazio = KB completa.

        Returns:
            Conteudo da knowledge base. String vazia se KB nao existir.
        """
        from debate_engine.kb_compressor import extract_relevant_chunks

        kb_dir = self.base / mind_slug / "kb"
        if not kb_dir.exists():
            return ""

        if topic:
            return extract_relevant_chunks(kb_dir, topic)

        # Sem tópico: retorna KB completa
        chunks = sorted(kb_dir.glob("*.md"))
        return "\n\n---\n\n".join(f.read_text(encoding="utf-8") for f in chunks)

    def mind_exists(self, mind_slug: str) -> bool:
        """Verifica se um mind existe.

        Args:
            mind_slug: Slug do mind.

        Returns:
            True se o mind existe, False caso contrario.
        """
        return (self.base / mind_slug).is_dir()
