"""TokenCounter: rastreia uso de tokens por sessao de debate."""

from dataclasses import dataclass, field


@dataclass
class SessionTokenUsage:
    """Uso de tokens de uma sessao de debate."""

    total_input: int = 0
    total_output: int = 0
    turns: int = 0
    by_mind: dict[str, dict[str, int]] = field(default_factory=dict)

    @property
    def total(self) -> int:
        """Total de tokens consumidos."""
        return self.total_input + self.total_output

    def add_turn(self, mind_slug: str, input_tokens: int, output_tokens: int) -> None:
        """Registra um turno de debate.

        Args:
            mind_slug: Slug do mind que respondeu.
            input_tokens: Tokens de input do turno.
            output_tokens: Tokens de output do turno.
        """
        self.total_input += input_tokens
        self.total_output += output_tokens
        self.turns += 1
        if mind_slug not in self.by_mind:
            self.by_mind[mind_slug] = {"input": 0, "output": 0}
        self.by_mind[mind_slug]["input"] += input_tokens
        self.by_mind[mind_slug]["output"] += output_tokens
