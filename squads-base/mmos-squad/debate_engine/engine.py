"""DebateEngine: motor principal usando Anthropic API."""

from dataclasses import dataclass

from anthropic import Anthropic, AuthenticationError, BadRequestError, RateLimitError


class DebateEngineError(Exception):
    """Erro base do debate engine."""


class TokenOverflowError(DebateEngineError):
    """Context window excedido."""


class RateLimitExceededError(DebateEngineError):
    """Rate limit da API atingido."""


class InvalidAPIKeyError(DebateEngineError):
    """API key invalida ou expirada."""


@dataclass
class TurnResult:
    """Resultado de um turno de debate."""

    mind_slug: str
    content: str
    input_tokens: int
    output_tokens: int
    model: str


class DebateEngine:
    """Motor de debate usando Anthropic API."""

    DEFAULT_MODEL = "claude-sonnet-4-20250514"
    MAX_TOKENS = 4096

    def __init__(
        self,
        api_key: str,
        model: str | None = None,
    ) -> None:
        """Inicializa o DebateEngine.

        Args:
            api_key: Chave da API Anthropic do usuario.
            model: Modelo a usar. Default: claude-sonnet-4-20250514.
        """
        self.client = Anthropic(api_key=api_key)
        self.model = model or self.DEFAULT_MODEL

    def generate_response(
        self,
        mind_slug: str,
        system_prompt: str,
        kb_context: str,
        user_message: str,
        max_tokens: int | None = None,
        topic: str = "",
    ) -> TurnResult:
        """Gera resposta de um mind para uma mensagem.

        Args:
            mind_slug: Identificador unico do mind (ex: 'alex_hormozi').
            system_prompt: Prompt de sistema do mind.
            kb_context: Conteudo da knowledge base do mind.
            user_message: Mensagem do usuario para o mind responder.
            max_tokens: Limite de tokens na resposta. Default: 4096.
            topic: Tópico do debate (informacional, usado pelo caller para KB compression).

        Returns:
            TurnResult com conteudo, contagem de tokens e modelo usado.

        Raises:
            RateLimitExceededError: API rate limit atingido.
            TokenOverflowError: Context window excedido.
            InvalidAPIKeyError: API key invalida ou expirada.
            DebateEngineError: Outros erros de API.
        """
        full_system = (
            f"{system_prompt}\n\n## Knowledge Base\n{kb_context}" if kb_context else system_prompt
        )
        try:
            response = self.client.messages.create(
                model=self.model,
                max_tokens=max_tokens or self.MAX_TOKENS,
                system=full_system,
                messages=[{"role": "user", "content": user_message}],
            )
        except RateLimitError as e:
            raise RateLimitExceededError(
                "Rate limit atingido. Aguarde alguns segundos e tente novamente."
            ) from e
        except BadRequestError as e:
            if "token" in str(e).lower():
                raise TokenOverflowError(
                    f"Context window excedido para mind '{mind_slug}'. "
                    "Considere usar KB compression."
                ) from e
            raise DebateEngineError(f"Erro na requisicao: {e}") from e
        except AuthenticationError as e:
            raise InvalidAPIKeyError(
                "API key invalida ou expirada. Verifique sua key Anthropic."
            ) from e

        return TurnResult(
            mind_slug=mind_slug,
            content=response.content[0].text,
            input_tokens=response.usage.input_tokens,
            output_tokens=response.usage.output_tokens,
            model=self.model,
        )

    def generate_response_stream(
        self,
        mind_slug: str,
        system_prompt: str,
        kb_context: str,
        user_message: str,
        max_tokens: int | None = None,
        topic: str = "",
    ):
        """Gera resposta com streaming.

        Args:
            mind_slug: Identificador unico do mind.
            system_prompt: Prompt de sistema do mind.
            kb_context: Conteudo da knowledge base do mind.
            user_message: Mensagem do usuario.
            max_tokens: Limite de tokens na resposta.
            topic: Tópico do debate (informacional, usado pelo caller para KB compression).

        Yields:
            Chunks de texto da resposta em streaming.
        """
        full_system = (
            f"{system_prompt}\n\n## Knowledge Base\n{kb_context}" if kb_context else system_prompt
        )
        with self.client.messages.stream(
            model=self.model,
            max_tokens=max_tokens or self.MAX_TOKENS,
            system=full_system,
            messages=[{"role": "user", "content": user_message}],
        ) as stream:
            yield from stream.text_stream
