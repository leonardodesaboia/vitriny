# Troubleshooting de Deploy — EasyPanel / Docker Swarm

> Postmortem e runbook da investigação do **502 Bad Gateway** (e do incidente de
> banco que veio depois) no deploy do vitriny no EasyPanel da Hostinger.
> Data: 2026-07-31.

---

## TL;DR

O app roda no EasyPanel, que usa **Docker Swarm** por baixo. O serviço
`vitriny_vitriny-app` fica em **duas redes overlay** ao mesmo tempo:

- `easypanel` — onde o **Traefik** (proxy do painel) alcança o app na porta 3000.
- `easypanel-vitriny` — rede interna do projeto, onde estão **postgres** e **minio**.

Estar em duas redes overlay é a raiz de **dois** problemas distintos do Swarm:

1. **502 no Traefik** — o load-balancer VIP do Swarm não roteia pro app.
   **Fix:** `endpoint_mode: dnsrr`.
2. **`P1001: Can't reach database server`** — o DNS interno resolve o postgres
   pro IP da rede errada de forma intermitente.
   **Fix:** estado de rede limpo do daemon (o problema foi agravado por churn de
   deploy). Hardening: retry de conexão no entrypoint.

---

## Ambiente

- VPS Hostinger, host `srv1473122`, Ubuntu 24.04.4, kernel 6.8.
- Docker **Swarm** (nó único), orquestrado pelo EasyPanel.
- Proxy/TLS: **Traefik** gerenciado pelo painel (não usa o Caddy do repo — esse é
  só pra VPS crua, ver `docker-compose.caddy.yml`).
- Domínio de teste: `https://vitriny-vitriny-app.vn6tpb.easypanel.host/`.

### Redes (swarm overlay)

| Rede               | Subnet         | Quem está nela                    |
|--------------------|----------------|-----------------------------------|
| `easypanel`        | `10.11.0.0/16` | Traefik + app (p/ roteamento)     |
| `easypanel-vitriny`| `10.0.2.0/24`  | app + postgres + minio (interna)  |

O `app` é o **único** serviço presente nas **duas** redes.

---

## Problema 1 — 502 Bad Gateway (Traefik → app)

### Diagnóstico

Sequência de testes que isolou a causa:

| Teste                                             | Resultado |
|---------------------------------------------------|-----------|
| App responde localhost dentro do container        | `200` ✅  |
| App na rede, **IP direto do task** (`10.11.5.x:3000`) | `200` ✅  |
| App na rede, **pela VIP** (`vitriny_vitriny-app:3000`) | falha ❌  |
| Público (via Traefik)                             | `502` ❌  |

O kernel tem `ip_vs` carregado e **outros serviços usam VIP normalmente** — logo
não é o kernel. Inspeção do IPVS nas sandboxes de LB (`nsenter` em
`/var/run/docker/netns/lb_*` + `ipvsadm -L -n`) mostrou que o real-server do app
até é criado (FWM → task IP), mas a **VIP não roteia** — comportamento do bug de
Swarm com **serviço em múltiplas redes overlay**: a marcação/plumbing da VIP
falha.

### Causa raiz

Bug conhecido do Docker Swarm: o **load-balancing por VIP** (IPVS via
firewall-mark) não funciona de forma confiável para serviços conectados a
**mais de uma rede overlay**.

### Fix — `endpoint_mode: dnsrr`

Com `dnsrr`, o nome do serviço resolve **direto pros IPs dos tasks**, sem passar
pela VIP. O Traefik já faz o balanceamento dele, então a VIP é redundante — é
inclusive o modo **recomendado pela doc do Traefik no Swarm**. Não é gambiarra.

```bash
docker service update --endpoint-mode dnsrr vitriny_vitriny-app
```

### Obstáculo — o EasyPanel ignora o `deploy:` do compose

O bloco `deploy: { endpoint_mode: dnsrr }` no `docker-compose.yml` **não tem
efeito**: o EasyPanel gerencia o spec do serviço por conta própria e recria o
serviço em modo **`vip`** a cada Deploy no painel. Ou seja, o dnsrr precisa ser
reaplicado por fora, depois de cada deploy.

### Solução durável — guardião systemd (event-driven)

Um serviço systemd fica escutando **eventos de container** (`docker events`) e,
sempre que o task do app reinicia (ex.: após um Deploy do painel), verifica o
endpoint mode e reaplica `dnsrr` se tiver voltado pra `vip`. É event-driven
(sem polling / sem IO ocioso).

> Nota: `docker events --filter type=service` **não emite** eventos de service
> confiavelmente neste host — por isso o gatilho é **evento de container**
> (`event=start`), que sempre dispara quando o Swarm recria o task.

**`/usr/local/bin/vitriny-dnsrr-guard.sh`**
```sh
#!/bin/sh
SVC=vitriny_vitriny-app

ensure_dnsrr() {
  mode=$(docker service inspect "$SVC" --format '{{.Spec.EndpointSpec.Mode}}' 2>/dev/null)
  if [ "$mode" = "vip" ]; then
    docker service update --endpoint-mode dnsrr "$SVC" >/dev/null 2>&1 \
      && logger -t vitriny-dnsrr-guard "reaplicado dnsrr (servico estava em vip)"
  fi
}

# Corrige o estado logo na largada (caso o serviço tenha subido em vip)
ensure_dnsrr

# Reage ao START do container do task (EasyPanel deploy recria o task)
docker events --filter type=container --filter event=start \
  --format '{{.Actor.Attributes.name}}' | \
while read name; do
  case "$name" in
    vitriny_vitriny-app.*) ensure_dnsrr ;;
  esac
done
```

**`/etc/systemd/system/vitriny-dnsrr-guard.service`**
```ini
[Unit]
Description=Mantem vitriny app em dnsrr (workaround VIP multi-rede do Swarm)
After=docker.service
Requires=docker.service

[Service]
ExecStart=/usr/local/bin/vitriny-dnsrr-guard.sh
Restart=always
RestartSec=5

[Install]
WantedBy=multi-user.target
```

**Instalar / operar:**
```bash
chmod +x /usr/local/bin/vitriny-dnsrr-guard.sh
systemctl daemon-reload
systemctl enable --now vitriny-dnsrr-guard.service
systemctl status vitriny-dnsrr-guard.service --no-pager
journalctl -t vitriny-dnsrr-guard -f      # ver reações
```

**Custo/trade-off:** cada Deploy do EasyPanel passa a causar **dois** restarts do
task (o painel sobe em `vip`, o guardião flipa pra `dnsrr` → recria). Segundos a
mais de indisponibilidade por deploy. Aceitável pra deploy manual/esporádico.

**Validação (simula o deploy do painel):**
```bash
docker service update --endpoint-mode vip vitriny_vitriny-app >/dev/null
sleep 12
docker service inspect vitriny_vitriny-app --format '{{.Spec.EndpointSpec.Mode}}'  # -> dnsrr
journalctl -t vitriny-dnsrr-guard --no-pager | tail -3                             # -> reaplicado dnsrr
```

---

## Problema 2 — `P1001: Can't reach database server` (app → postgres)

### Como apareceu

Ao **repetir muitas vezes** o flip de endpoint mode (vip↔dnsrr) durante os testes,
o Swarm recriou o task do app dezenas de vezes em sequência — uma **tempestade de
restarts**. Isso **poluiu o estado de DNS/VIP do daemon** e o app passou a falhar
no boot com `P1001` ao rodar `prisma migrate deploy`.

### Diagnóstico (o achado-chave)

Postgres estava **`Running` e saudável** o tempo todo. A diferença estava na
**resolução de DNS conforme o número de redes do container**:

| Container                                   | `vitriny_vitriny-postgres` resolve p/ | nc 5432 |
|---------------------------------------------|----------------------------------------|---------|
| netshoot em **1 rede** (easypanel-vitriny)  | `10.0.2.2` (certo) ✅                   | ok      |
| container em **2 redes** (= app)            | `10.11.4.16` (rede errada) ❌           | unreachable |

O DNS embutido do Docker, para um container **multi-rede**, devolvia pro postgres
um IP da rede `easypanel` (`10.11.x`), onde o postgres **nem existe** — uma
entrada **obsoleta/flaky**. As rotas do container estavam corretas
(`10.0.2.0/24 dev eth2`); o corte era puramente o DNS respondendo o IP errado, de
forma **intermitente** (às vezes resolvia um IP alcançável, às vezes não — o que
explica o app ter funcionado no início e depois quebrar).

### Causa raiz

Bug conhecido do Docker Swarm: **service discovery devolve o IP errado para
containers conectados a múltiplas redes**, agravado por **estado obsoleto** de
DNS/VIP acumulado pela churn de recriação de tasks.

### Fixes

1. **Imediato / limpeza de estado:** reiniciar o Docker daemon reconstrói todo o
   estado de rede do Swarm (DNS, VIP, IPVS, sandboxes) a partir do desejado,
   jogando fora as entradas obsoletas.
   ```bash
   systemctl restart docker      # ~1-2 min; reinicia TODOS os containers do host
   ```
   > Afeta todos os projetos do host (ex.: `allset_mvp`). É síncrono e silencioso:
   > fica 30-90s sem output. Só se preocupar se passar de ~3 min.

2. **Hardening (recomendado, ainda pendente):** o `docker-entrypoint.sh` usa
   `set -e`, então **qualquer** blip de DNS no boot mata o container e dispara
   nova recriação. Adicionar um **retry de conexão ao banco** antes do
   `migrate deploy` evita que um blip transitório derrube o app. Ver
   [Pendências](#pendências).

### Observação importante

O app **chegou a bootar com sucesso** (`✓ Ready`, migrations aplicadas) durante a
investigação — prova de que a **configuração de app e banco está correta**. O
`DATABASE_URL` aponta certo para `vitriny_vitriny-postgres:5432`. O problema é
puramente o estado de rede do Swarm.

---

## Segurança (verificado)

- `.env.production` **está no `.gitignore`** (`.env*`) e **nunca foi commitado**
  (verificado em todo o histórico). Só `.env.example` é versionado.
- Segredos reais (AUTH_SECRET, RESEND_API_KEY, senha do Postgres) foram
  compartilhados durante o troubleshooting — **rotacionar** se isso for
  considerado sensível.

---

## Runbook — diagnóstico rápido de 502 / app fora

```bash
# 1. O app está de pé e respondendo na 3000 (dentro do container)?
docker exec $(docker ps -qf name=vitriny_vitriny-app) \
  node -e "require('http').get('http://127.0.0.1:3000',r=>{console.log(r.statusCode);process.exit(0)}).on('error',e=>{console.log('ERR',e.message);process.exit(1)})"

# 2. Endpoint mode (tem que ser dnsrr; se 'vip', o guardião deveria ter corrigido)
docker service inspect vitriny_vitriny-app --format '{{.Spec.EndpointSpec.Mode}}'

# 3. Alcançável na rede do Traefik?
docker run --rm --network easypanel curlimages/curl:latest \
  -sS -o /dev/null -w '%{http_code}\n' -m 8 http://vitriny_vitriny-app:3000/

# 4. Público
curl -sS -o /dev/null -w '%{http_code}\n' -m 10 https://vitriny-vitriny-app.vn6tpb.easypanel.host/

# 5. Estado dos tasks / crash-loop?
docker service ps vitriny_vitriny-app --no-trunc | head -5
docker service logs vitriny_vitriny-app --tail 20

# 6. DB alcançável de um container multi-rede (espelho do app)?
docker rm -f netdebug 2>/dev/null
docker run -d --name netdebug --network easypanel nicolaka/netshoot sleep 600 >/dev/null
docker network connect easypanel-vitriny netdebug
docker exec netdebug sh -c "getent hosts vitriny_vitriny-postgres; nc -zv -w4 vitriny_vitriny-postgres 5432"
docker rm -f netdebug

# Guardião do dnsrr
systemctl status vitriny-dnsrr-guard.service --no-pager
journalctl -t vitriny-dnsrr-guard --no-pager | tail
```

### Reset limpo (quando o app está em crash-loop)

```bash
docker service scale vitriny_vitriny-app=0   # para a cascata
sleep 10
docker service scale vitriny_vitriny-app=1   # sobe 1 task limpo
```

### Reset profundo (estado de rede do Swarm corrompido)

```bash
systemctl restart docker    # reconstroi DNS/VIP/IPVS; ~1-2 min, afeta todo o host
```

---

## Pendências

- [ ] **Hardening do entrypoint:** retry de conexão ao Postgres antes do
      `prisma migrate deploy` (hoje `set -e` derruba o app em qualquer blip de
      DNS no boot). Ex.: loop com `pg_isready`/`nc` até o banco responder, com
      timeout.
- [ ] **Limpeza do compose:** remover `deploy: endpoint_mode: dnsrr` do
      `docker-compose.yml` (o EasyPanel ignora — dá falsa sensação de resolvido)
      e deixar comentário apontando pro guardião systemd.
- [ ] **`.env` de produção:** trocar placeholders (`SEU-DOMINIO`, `SEU-CDN`,
      credenciais Google) e conferir `PORT=3000`.
- [ ] **Avaliar fix arquitetural:** reduzir o app a uma única rede overlay
      eliminaria a raiz dos dois problemas — depende do que o EasyPanel permite.
- [ ] **Considerar rotacionar** os segredos compartilhados no troubleshooting.

---

## Referências

- Endpoint mode / dnsrr no Swarm — recomendado pelo Traefik para service
  discovery em Swarm.
- Bugs de Docker Swarm com serviços multi-rede: VIP não roteável e service
  discovery devolvendo IP da rede errada.
