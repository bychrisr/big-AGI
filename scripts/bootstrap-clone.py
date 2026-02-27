#!/usr/bin/env python3
"""Bootstrap do clone cognitivo a partir de onboarding e DNA extraction."""

import argparse
import json
import sys
from datetime import datetime, timezone
from pathlib import Path

import yaml


MILESTONE_THRESHOLDS = {
    0.40: "Clone mínimo — pode auxiliar na geração de conteúdo simples",
    0.60: "Clone funcional — voz reconhecível",
    0.80: "Clone avançado — tomada de decisão alinhada",
    0.94: "Clone de produção — meta DNA Mental atingida",
}


def process_onboarding(onboarding_data: dict) -> dict:
    """Mapeia respostas de onboarding para layers do clone."""
    return {
        "L1_identidade": {
            "nome": onboarding_data.get("nome", ""),
            "como_prefere_ser_chamado": onboarding_data.get("como_prefere", ""),
        },
        "L3_comunicacao": {
            "linguagem_patterns": onboarding_data.get("estilo_comunicacao", ""),
        },
        "L5_expertise": {
            "area_trabalho": onboarding_data.get("area_trabalho", ""),
            "nivel_experiencia": onboarding_data.get("nivel_experiencia", ""),
        },
        "L6_contexto": {
            "desafio_atual": onboarding_data.get("desafio_atual", ""),
            "objetivo_principal": onboarding_data.get("objetivo", ""),
        },
        "L8_referencias": {
            "inspiracoes": onboarding_data.get("inspiracoes", []),
            "ferramentas_usadas": onboarding_data.get("ferramentas", []),
        },
        "recurring_interests": onboarding_data.get("interesses", []),
    }


def process_dna_extraction(dna_yaml: dict) -> dict:
    """Mapeia output do DNA extraction prompt para layers do clone."""
    dna = dna_yaml.get("dna_mental", dna_yaml)
    return {
        "L2_cognitivo": dna.get("cognitive_patterns", {}),
        "L3_comunicacao": dna.get("communication_style", {}),
        "L4_decisao": dna.get("decision_patterns", {}),
        "recurring_interests": dna.get("recurring_interests", []),
    }


def merge_sources(onboarding: dict, dna: dict) -> dict:
    """Combina onboarding (explícito) e DNA (inferido). Onboarding tem prioridade."""
    merged = {}

    all_keys = set(onboarding.keys()) | set(dna.keys())
    for key in all_keys:
        if key == "recurring_interests":
            # Merge de listas sem duplicatas
            interests_o = onboarding.get(key, []) or []
            interests_d = dna.get(key, []) or []
            merged[key] = list(dict.fromkeys(
                [str(i) for i in interests_o] + [str(i) for i in interests_d]
            ))
        elif key in onboarding and key in dna:
            # Merge de dicts: onboarding sobrescreve
            if isinstance(onboarding[key], dict) and isinstance(dna[key], dict):
                merged[key] = {**dna[key], **onboarding[key]}
            else:
                merged[key] = onboarding[key]  # onboarding tem prioridade
        else:
            merged[key] = onboarding.get(key) or dna.get(key)

    return merged


def calculate_fidelity(clone_data: dict) -> float:
    """Calcula fidelidade do clone (0.0 a 1.0) baseado em layers preenchidas."""
    layer_weights = {
        "L1_identidade": 0.10,
        "L2_cognitivo": 0.15,
        "L3_comunicacao": 0.15,
        "L4_decisao": 0.10,
        "L5_expertise": 0.20,
        "L6_contexto": 0.10,
        "L8_referencias": 0.10,
        "recurring_interests": 0.10,
    }

    total = 0.0
    for layer, weight in layer_weights.items():
        data = clone_data.get(layer)
        if not data:
            continue
        if isinstance(data, dict):
            filled = sum(1 for v in data.values() if v and v != "não determinado" and v != "")
            total_fields = max(len(data), 1)
            total += weight * (filled / total_fields)
        elif isinstance(data, list) and data:
            total += weight

    # Bonus se tem ambas as fontes
    has_onboarding = bool(clone_data.get("L1_identidade") or clone_data.get("L5_expertise"))
    has_dna = bool(clone_data.get("L2_cognitivo") or clone_data.get("L4_decisao"))
    if has_onboarding and has_dna:
        total = min(1.0, total + 0.05)

    return round(total, 3)


def check_clone_milestone(fidelity: float) -> str | None:
    """Retorna mensagem do milestone atingido, ou None."""
    for threshold in sorted(MILESTONE_THRESHOLDS.keys(), reverse=True):
        if fidelity >= threshold:
            return MILESTONE_THRESHOLDS[threshold]
    return None


def generate_clone_yaml(merged: dict, user: str, fidelity: float) -> str:
    """Gera YAML completo do clone."""
    clone_data = {
        "clone": {
            "version": "0.1-bootstrap",
            "user": user,
            "created_at": datetime.now(timezone.utc).isoformat(),
            "sources": ["onboarding", "dna_extraction"],
            "fidelity": fidelity,
            "milestone": check_clone_milestone(fidelity),
            "layers": merged,
        }
    }
    return yaml.dump(clone_data, allow_unicode=True, default_flow_style=False, sort_keys=False)


def main() -> None:
    parser = argparse.ArgumentParser(description="Bootstrap clone cognitivo do teamAI")
    parser.add_argument("--onboarding-file", help="JSON com respostas do onboarding")
    parser.add_argument("--dna-file", help="YAML output do dna-extraction-prompt")
    parser.add_argument("--user", required=True, help="Username no repo (ex: chris_rodrigues)")
    parser.add_argument("--output", help="Path de output (default: users/{user}/clone/clone-v0.1.yaml)")
    parser.add_argument("--repo-root", default=".", help="Raiz do repo teamAI")
    args = parser.parse_args()

    onboarding_data: dict = {}
    dna_data: dict = {}

    if args.onboarding_file:
        with open(args.onboarding_file) as f:
            onboarding_data = json.load(f)

    if args.dna_file:
        with open(args.dna_file) as f:
            dna_data = yaml.safe_load(f)

    if not onboarding_data and not dna_data:
        print("WARN: Nenhuma fonte de dados. Gerando clone vazio.", file=sys.stderr)

    onboarding_layers = process_onboarding(onboarding_data) if onboarding_data else {}
    dna_layers = process_dna_extraction(dna_data) if dna_data else {}
    merged = merge_sources(onboarding_layers, dna_layers)
    fidelity = calculate_fidelity(merged)

    output_path = args.output or f"{args.repo_root}/users/{args.user}/clone/clone-v0.1.yaml"
    Path(output_path).parent.mkdir(parents=True, exist_ok=True)

    with open(output_path, "w") as f:
        f.write(generate_clone_yaml(merged, args.user, fidelity))

    milestone = check_clone_milestone(fidelity)
    print(f"✓ Clone gerado: {output_path}")
    print(f"  Fidelidade: {fidelity:.1%}")
    if milestone:
        print(f"  Milestone: {milestone}")
    else:
        print(f"  Status: abaixo do threshold mínimo (40%) — adicione mais dados")


if __name__ == "__main__":
    main()
