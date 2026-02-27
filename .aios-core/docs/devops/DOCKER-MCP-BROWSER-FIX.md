# Docker MCP Browser - Network Fix

**Date:** 2026-02-15
**Reporter:** @dev (durante implementacao de telemetry scope segregation)
**Resolved by:** @devops (Gage) - 2026-02-16
**Severity:** Medium - bloqueava debug visual via Claude Code
**Status:** RESOLVED

---

## Problema Original

O Playwright MCP rodando dentro do Docker Gateway **nao conseguia acessar servicos no host** (localhost do host). Todos os `browser_navigate`, `browser_take_screenshot` e `browser_snapshot` falhavam com timeout ao tentar acessar URLs do host.

---

## Causa Raiz (Diagnosticada)

Duas causas combinadas:

### 1. UFW bloqueando trafego Docker → Host

O firewall UFW estava com `DEFAULT_INPUT_POLICY="DROP"`, bloqueando conexoes da rede Docker bridge (`172.18.0.0/16`) para servicos no host.

### 2. Containers filhos sem `host.docker.internal`

No Linux, `host.docker.internal` nao e automatico. O gateway MCP resolve com `extra_hosts`, mas containers filhos (Playwright, Desktop Commander) spawned via Docker socket **nao herdam** essa config. O MCP Gateway nao propaga `extra_hosts` para containers filhos.

---

## Solucao Aplicada

### Fix 1: Regra UFW (permite Docker bridge → host)

```bash
sudo ufw allow from 172.18.0.0/16 to any comment "Docker MCP Central bridge network"
sudo ufw allow from 172.17.0.0/16 to any comment "Docker default bridge network"
```

Permanente, sobrevive reboot.

### Fix 2: `extra_hosts` no docker-compose.yml do MCP Central

```yaml
# /media/bychrisr/externo/AI-CORE/mcp-central/docker-compose.yml
services:
  mcp-gateway:
    extra_hosts:
      - "host.docker.internal:host-gateway"
```

Permite que o gateway resolva `host.docker.internal`. Containers filhos usam o IP do bridge gateway diretamente.

### Fix 3: Healthcheck adicionado ao docker-compose.yml

```yaml
healthcheck:
  test: ["CMD", "wget", "--no-verbose", "--tries=1", "--spider", "http://localhost:8080/health"]
  interval: 30s
  timeout: 10s
  retries: 3
  start_period: 15s
```

### Fix 4: Porta restrita a localhost

```yaml
ports:
  - "127.0.0.1:8080:8080"  # Antes: "8080:8080"
```

---

## Como Acessar Servicos do Host via Playwright

Usar o IP do bridge gateway da rede `mcp-central_mcp-network`:

```
http://172.18.0.1:<porta>/
```

Exemplos:
```
browser_navigate("http://172.18.0.1:5173/")        # Vite dev server
browser_navigate("http://172.18.0.1:3100/api/telemetry")  # API server
```

**NAO usar:**
- `localhost` (aponta para o container)
- `host.docker.internal` (nao resolve em containers filhos)
- `192.168.1.x` (bloqueado por UFW em algumas configs)

### Descobrir o IP atual do bridge gateway

```bash
docker network inspect mcp-central_mcp-network --format '{{range .IPAM.Config}}{{.Gateway}}{{end}}'
```

---

## Fix Permanente (Opcional): Docker Daemon `host-gateway-ip`

Para fixar o IP globalmente e evitar que mude se a rede for recriada:

### Passo 1: Criar/editar daemon.json

```bash
sudo mkdir -p /etc/docker
sudo tee /etc/docker/daemon.json << 'EOF'
{
  "host-gateway-ip": "172.17.0.1"
}
EOF
```

### Passo 2: Reiniciar Docker daemon

```bash
sudo systemctl restart docker
```

### Passo 3: Reiniciar MCP Central

```bash
cd /media/bychrisr/externo/AI-CORE/mcp-central
docker compose down && docker compose up -d
```

### Passo 4: Verificar

```bash
# Gateway container resolve host.docker.internal
docker exec mcp-gateway-central sh -c "getent hosts host.docker.internal"

# Containers filhos usam o IP do bridge
docker network inspect mcp-central_mcp-network --format '{{range .IPAM.Config}}{{.Gateway}}{{end}}'
```

**ATENCAO:** `host-gateway-ip` afeta TODOS os containers Docker no sistema. Se outros projetos dependem do default, avaliar antes de aplicar.

---

## Verificacao Pos-Fix

| Teste | Comando | Resultado Esperado |
|-------|---------|-------------------|
| Gateway resolve host | `docker exec mcp-gateway-central sh -c "getent hosts host.docker.internal"` | `172.17.0.1 host.docker.internal` |
| Gateway acessa API | `docker exec mcp-gateway-central sh -c "wget -qO- http://host.docker.internal:3100/api/telemetry \| head -c 100"` | JSON response |
| Playwright acessa Vite | `browser_navigate("http://172.18.0.1:5173/")` | Page title: "AIOS Telemetry Dashboard" |
| Screenshot funciona | `browser_take_screenshot()` | Imagem do dashboard |
| UFW rules ativas | `sudo ufw status \| grep Docker` | 2 regras ALLOW |
| Healthcheck OK | `docker inspect mcp-gateway-central --format '{{.State.Health.Status}}'` | `healthy` |

---

## Arquivos Modificados

| Arquivo | Mudanca |
|---------|---------|
| `mcp-central/docker-compose.yml` | +extra_hosts, +healthcheck, porta localhost-only |
| `mcp-central/.gitignore` | Criado (secrets, node_modules, data) |
| UFW rules (sistema) | +2 regras para Docker bridge networks |

---

## Limitacao Conhecida

O Docker MCP Gateway (docker/mcp-gateway) **nao propaga `extra_hosts`** para containers filhos spawned via Docker socket. Nao existe flag para isso. Feature request possivel em: https://github.com/docker/mcp-gateway/issues

Workaround: usar IP do bridge gateway (`172.18.0.1`) diretamente nas chamadas browser.

---

## Referencias

- [Docker MCP Gateway Docs](https://docs.docker.com/ai/mcp-catalog-and-toolkit/mcp-gateway/)
- [dockerd host-gateway-ip](https://docs.docker.com/reference/cli/dockerd/)
- [Baeldung: extra_hosts in Docker Compose](https://www.baeldung.com/ops/docker-compose-add-host)
- [Playwright MCP Issue #700](https://github.com/microsoft/playwright-mcp/issues/700)
