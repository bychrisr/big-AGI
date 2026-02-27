# DNA Mental™ — Prompt de Extração Cognitiva

## Objetivo

Você é um especialista em análise cognitiva. Sua tarefa é analisar conversas exportadas entre um usuário e uma IA (ChatGPT, Gemini ou similar) e extrair padrões comportamentais e cognitivos do **USUÁRIO** (não da IA).

## Instruções de Análise

### O que observar
- Padrões que se repetem em **múltiplas** conversas (ignorar comportamentos isolados)
- Como o usuário formula perguntas e problemas
- Reações a respostas: o que satisfaz vs. o que gera follow-ups
- Vocabulário recorrente, metáforas, referências
- Velocidade e estilo de tomada de decisão
- Nível de abstração preferido

### O que NÃO fazer
- Não analise as respostas da IA — só o comportamento do usuário
- Não analise conversas com menos de 3 turnos do usuário
- Não confunda comportamento situacional (em um tema específico) com padrão geral

## Formato de Output

Retorne **exclusivamente** um bloco YAML válido neste formato exato:

```yaml
dna_mental:
  metadata:
    source: "chatgpt"  # chatgpt | gemini | claude | outro
    extraction_date: "YYYY-MM-DD"
    conversations_analyzed_count: 0
    confidence_overall: 0.0  # 0.0 a 1.0

  cognitive_patterns:
    problem_framing: ""      # Como o usuário enquadra problemas (ex: "top-down, começa com o porquê")
    hypothesis_style: ""     # Como formula hipóteses (ex: "experimental, testa rápido")
    framework_preference: "" # Frameworks preferidos (ex: "sistemas, causalidade, primeiros princípios")
    abstraction_level: ""    # Nível preferido (ex: "alto nível com exemplos concretos")
    reaction_to_contradiction: "" # Como reage quando contestado

  communication_style:
    tone: ""                      # Tom predominante (ex: "direto, sem rodeios")
    question_style: ""            # Tipo de pergunta (ex: "abertas, exploratórias")
    response_length_preference: "" # (ex: "respostas longas e detalhadas")
    formality_level: ""           # (ex: "informal, tuteamento")
    language_patterns: ""         # Padrões linguísticos recorrentes

  recurring_interests:
    - ""  # Lista de temas que aparecem com frequência

  decision_patterns:
    speed: ""              # (ex: "rápido, decide com 70% das informações")
    validation_seeking: "" # (ex: "busca segunda opinião frequentemente")
    risk_tolerance: ""     # (ex: "alto, aceita incerteza")
    iteration_style: ""    # (ex: "prototipa rápido, refina depois")
```

## Notas sobre Confiança

Para cada campo, use estes critérios:
- **confidence_overall > 0.8**: Padrão claro em 5+ conversas distintas
- **confidence_overall 0.5-0.8**: Padrão observado em 2-4 conversas
- **confidence_overall < 0.5**: Inferência com base limitada — marque campos incertos com "(inferido)"

Para campos sem dados suficientes, use `"não determinado"`.

---

## Como Exportar seus Dados

### ChatGPT
1. Acesse: Settings → Data Controls → Export Data
2. Clique "Export" → aguarde o email
3. Baixe o ZIP → extraia → use o arquivo `conversations.json`
4. O JSON contém um array de objetos com `title` e `mapping` (mensagens)

### Gemini
1. Acesse: myaccount.google.com → Data & Privacy → Download your data
2. Selecione "Gemini Apps" → Continue → Create Export
3. Baixe o ZIP → extraia → arquivo JSON com histórico de conversas

### Recomendação
Inclua pelo menos **20-30 conversas substanciais** (>5 turnos cada) para extração significativa. Mais conversas = maior fidelidade.

---

## Conversas para Análise

[CONVERSAS EXPORTADAS AQUI]

Retorne apenas o bloco YAML, sem texto adicional.
