# MarketStream – Real‑Time Market Data Pipeline

> **Live on AWS · 2.3 M Lambda invocations in 88 min · 53 ms p95 latency**
> **Infra cost:** ≈ **\$1.19 per million events** (14.1 M events – June 2025)

A **production‑grade, open‑source, serverless backend** that ingests high‑frequency market ticks, persists them in DynamoDB, and serves them back on‑demand — **all for pocket change**.

Built & maintained by **Andrei Vince**.

---

## Why this project exists 🚀

Most “real‑time” demos break above toy traffic or explode your AWS bill. **MarketStream** proves an AWS‑native design can:

* Handle **> 30 k req/min** under **150 ms p95**
* Cost **< \$10 / million** requests (verified in Cost Explorer)
* Deploy end‑to‑end with **`cdk deploy` once**

Use it as a template for trading bots, ETL spikes, or any write‑heavy workload.

---

## Key Features 🔑

\| | |
|‑‑‑|‑‑‑|
\| ⚡ **Performance** | 2.3 M events / 88 min • 53 ms p95 • 0 errors |
\| 💸 **Cost** | \$16.76 for 14.1 M invocations → **\$1.19 / M** |
\| 🏗️ **IaC** | Full stack in **AWS CDK (TypeScript)** |
\| 📊 **Observability** | CloudWatch Logs Insights + metrics dashboards |
\| 🖥️ **Traffic simulator** | High‑freq script to reproduce the load |
\| 🪶 **Lean stack** | Only Lambda + DynamoDB + API Gateway |

*Two API flavours:* cheap **HTTP API** for `/ingest`, feature‑rich **REST API** for `/query` (quotas‑ready).

---

## Resilience & Failure Handling 🛡️

\| Mechanism | Status |
|‑‑‑|‑‑‑|
\| Lambda **`retryAttempts = 2`** | ✅ |
\| SQS **DLQ** via `onFailure` | ✅ |
\| Alerting / Replay Lambda | 🔜 Roadmap |

After two failed attempts, payloads land in the DLQ so you can inspect or replay — **no silent data loss**.

---

## Architecture 🗺️

```mermaid
graph TD
  Client["Traffic Simulator"] --> HTTPAPI[/HTTP API (/ingest)/]
  HTTPAPI --> LambdaIngest[(Ingest Lambda)]
  LambdaIngest --> Dynamo[(DynamoDB TickTable)]

  User["Dashboard / SDK"] --> RESTAPI[/REST API (/query)/]
  RESTAPI --> QueryLambda[(Query Lambda)]
  QueryLambda --> Dynamo
```

*Streams are ON for future fan‑out, but no consumer Lambda is attached yet.*

---

## Latest Metrics 📈

\| Metric | Value |
|‑‑‑|‑‑‑|
\| Total invocations | **2 310 000 (88 min)** |
\| Sustained throughput | **≈ 30 000 req/min** |
\| p95 execution | **53 ms** |
\| Avg Lambda duration | 24.6 ms |
\| Dynamo write latency | 2.99 ms |
\| Errors / throttles | 0 |

*Collected via CloudWatch Logs Insights.*

---

## Quick Start 🛠️

```bash
# 1 – clone
$ git clone https://github.com/andreivince/aws-real-time-pipeline
$ cd aws-real-time-pipeline/cdk

# 2 – deps
$ npm ci

# 3 – bootstrap + deploy
$ npx cdk bootstrap && npx cdk deploy

# 4 – ( optional ) simulate load
$ cd ../traffic-simulator && node sendTick.js
```

After deploy, grab the two endpoints printed by CDK:

```dotenv
INGEST_ENDPOINT=https://<http‑api‑id>.execute-api.<region>.amazonaws.com/ingest
QUERY_ENDPOINT=https://<rest‑api‑id>.execute-api.<region>.amazonaws.com/prod/query
```

The simulator uses `INGEST_ENDPOINT`; your dashboard hits `QUERY_ENDPOINT`.

---

## Roadmap 🗺️

* [ ] **Fan‑out Lambda** (Dynamo Streams → SQS per client)
* [ ] **WebSocket broadcast** for live dashboards
* [ ] **Least‑privilege IAM** (drop AdministratorAccess)
* [ ] **GitHub Actions CI/CD** (lint + test + deploy)
* [ ] **CloudWatch alarms** (error > 0, cost > \$5)
* [ ] **Replay Lambda** for DLQ

Contributions welcome — see **`docs/CONTRIBUTING.md`**.

---

## License 📄

[MIT](LICENSE) – free to fork & deploy. Attribution appreciated.
