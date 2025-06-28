# Real-Time Market Data Pipeline

> **Live on AWS · 2.3 M Lambda invocations in 88 min · 53 ms p95 latency**  
> **Cost:** ≈ \$1.19 per million events (14.1 M events · June 2025)

A **minimal, production-grade serverless backend** that ingests high-frequency market ticks through AWS Lambda, persists them in DynamoDB, and proves you can hit serious load for pocket change.

Built and maintained by **Andrei Vince**.

---

## Why this project exists 🚀
Open-source “real-time” demos often crumble above toy traffic or cost a fortune once requests pile up. **MarketStream** shows that an AWS-native design can:

* Handle **>30 k req / min** while staying under **150 ms p95**
* Cost **\< \$10 / million requests** (validated in Cost Explorer)
* Deploy end-to-end in **one CDK command**  

Use it as a template for trading bots, ETL spikes, or any write-heavy workload.

---

## Key features 🔑

|  |  |
|---|---|
| ⚡ **Performance** | 2.3 M events in 88 min • 53 ms p95 • 0 errors |
| 💸 **Cost** | \$16.76 for 14.1 M invocations → **\$1.19 / M** |
| 🏗️ **IaC** | Entire stack defined with **AWS CDK (TypeScript)** |
| 🔍 **Observability** | CloudWatch Logs Insights queries provided |
| 🖥️ **Traffic simulator** | High-frequency script to reproduce the load |
| 🪶 **Lightweight** | Only Lambda + DynamoDB + API Gateway REST |

*No fan-out, WebSocket, X-Ray, WAF, or CI/CD pipelines are included — see Roadmap.*

---

## Architecture 🗺️
```mermaid
graph TD
  Client["Traffic Simulator / cURL"] --> APIGW["API Gateway (/ingest)"]
  APIGW --> LambdaIngest["Lambda Ingest"]
  LambdaIngest --> Dynamo["DynamoDB TickTable (Streams ON)"]
````

* Streams are enabled for future fan-out, but \**no consumer Lambda is attached yet.*

---

## Latest metrics 📊

| Metric                 | Result                 |
| ---------------------- | ---------------------- |
| Total invocations      | **2 310 000 (88 min)** |
| Sustained throughput   | **≈ 30 000 req / min** |
| p95 execution latency  | **53 ms**              |
| Avg Lambda duration    | 24.6 ms                |
| DynamoDB write latency | 2.99 ms                |
| Errors / throttles     | 0                      |

*Collected with CloudWatch Logs Insights and CloudWatch Dashboard.

---

## Quick start 🛠️

### Prerequisites

* Node 18+ & npm
* AWS CLI configured (default profile)
* **AWS CDK v2** (`npm i -g aws-cdk`)

```bash
# 1 – clone
git clone https://github.com/andreivince/aws-real-time-pipeline
cd aws-real-time-pipeline/cdk          # CDK app lives here

# 2 – install deps
npm ci                                 # or `npm install` if no package-lock.json

# 3 – bootstrap + deploy
npx cdk bootstrap && npx cdk deploy

# 4 – simulate load  (optional)
cd traffic-simulator                             # run sendTIck.ts

```

After deploy, copy the API URL printed by CDK and create a `.env`:

```dotenv
INGEST_ENDPOINT=https://<api-id>.execute-api.<region>.amazonaws.com/prod/
```

The simulator reads that variable and fires authentic traffic.

---

## Roadmap 🗺️

* [ ] **Fan-out Lambda** consuming DynamoDB Streams
* [ ] **WebSocket broadcaster** for real-time dashboards
* [ ] **Least-privilege IAM policies** (remove AdministratorAccess)
* [ ] **GitHub Actions** for synth + deploy + lint + test
* [ ] **CloudWatch alarms via CDK** (error > 0, cost > \$5)
* [ ] **Query endpoint** for historical reads

Pull requests welcome — see [`CONTRIBUTING.md`](docs/CONTRIBUTING.md).

---

## License 📄

[MIT](./LICENSE) — free to use, fork, and deploy. Attribution appreciated.

