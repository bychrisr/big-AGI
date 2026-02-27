#!/usr/bin/env python3
"""Valida output YAML do DNA Mental extraction prompt."""

import sys
import yaml


REQUIRED_SECTIONS = ["dna_mental"]
REQUIRED_METADATA = ["source", "extraction_date", "conversations_analyzed_count", "confidence_overall"]
REQUIRED_SECTIONS_INNER = ["cognitive_patterns", "communication_style", "recurring_interests", "decision_patterns"]


def validate_dna_yaml(yaml_content: str) -> tuple[bool, list[str]]:
    """Valida um bloco YAML de DNA Mental.

    Args:
        yaml_content: String YAML para validar.

    Returns:
        Tuple (is_valid, warnings). is_valid=True mesmo com warnings (campos parciais aceitos).
    """
    warnings: list[str] = []

    try:
        data = yaml.safe_load(yaml_content)
    except yaml.YAMLError as e:
        return False, [f"YAML inválido: {e}"]

    if not isinstance(data, dict) or "dna_mental" not in data:
        return False, ["Estrutura inválida: chave 'dna_mental' não encontrada"]

    dna = data["dna_mental"]

    # Verificar metadata
    metadata = dna.get("metadata", {})
    for field in REQUIRED_METADATA:
        if field not in metadata:
            warnings.append(f"metadata.{field} ausente")

    # Verificar seções principais
    for section in REQUIRED_SECTIONS_INNER:
        if section not in dna:
            warnings.append(f"Seção '{section}' ausente")
        elif isinstance(dna[section], dict):
            empty_fields = [k for k, v in dna[section].items() if not v or v == "não determinado"]
            if empty_fields:
                warnings.append(f"{section}: campos não determinados: {empty_fields}")

    # Campos extras são aceitos (forward compatibility)
    return True, warnings


if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: validate_dna_yaml.py <yaml_file>")
        sys.exit(1)

    yaml_file = sys.argv[1]
    with open(yaml_file) as f:
        content = f.read()

    is_valid, warnings = validate_dna_yaml(content)

    if warnings:
        print("Warnings:")
        for w in warnings:
            print(f"  - {w}")

    if is_valid:
        print("✓ YAML válido")
        sys.exit(0)
    else:
        print("✗ YAML inválido")
        sys.exit(1)
