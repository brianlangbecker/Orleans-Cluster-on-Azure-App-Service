# Project Goals: Observability Solution Demo

## Purpose
Build a simple application that demonstrates observability features (metrics, logs, traces) across a full-stack setup. The app will be deployed on a hybrid platform and connect to a cloud database.

## Functional Requirements

### Frontend
- Simple UI with basic forms and data display
- Interacts with backend via REST APIs
- Uses HTML/CSS/JavaScript or any frontend framework (React, Angular, etc.)
- **Deployment**: Separate from backend APIs, deployed on Non-Azure cloud machine
- Implements real user monitoring (RUM) instrumentation using OpenTelemetry

### Backends
- **2 backends required**: Non-Azure and Azure
- RESTful APIs with endpoints for CRUD operations
- **Current services**: .NET Orleans application and Python FastAPI inventory service
- **Non-Azure Backend**: .NET Orleans application deployed on separate cloud machine from frontend
- **Azure Backend**: Python FastAPI inventory service deployed to Azure App Services
- Both connect to shared cloud database in Azure
- Implements logging, metrics, and tracing instrumentation using OpenTelemetry

### Database
- **Shared cloud database**: Azure SQL or PostgreSQL hosted in Azure
- Used by both Non-Azure and Azure backend services
- Stores simple entities
- No migration of existing local database contents required
- Implements logging, metrics, and tracing instrumentation using OpenTelemetry

### Observability Platform
- **Honeycomb.io** cloud SaaS, external to all of the above
- Receives data from all components and provides a unified view of the system's health and performance
- Uses standard OpenTelemetry protocol
- **OpenTelemetry Collectors**: Setup may differ across environments/machines (configuration to be determined)

## Use Cases to Demonstrate

### 1. Core Observability & Incident Management
**Infrastructure Monitoring**
- Metrics collection for CPU, memory, disk, and network across both on-prem & cloud resources
- Network performance monitoring
- Native integrations with AWS CloudWatch, Azure Monitor, and GCP Operations Suite
- Configure alert thresholds, health checks, and node/service availability checks

### 2. APM (Application Performance Monitoring)
- Instrument the hybrid demo app for end-to-end distributed tracing across services
- Show latency breakdown, errors/exceptions, and database/external-call timings
- Include code-level profiling and release markers
- Real-time application profiling and performance benchmarks

### 3. Synthetic Monitoring
- Set up synthetic monitors for different APIs and web pages with custom scripts/assertions
- Test status, headers, payload
- Multi-location tests, uptime/SLA reports, alert routing
- Page-load/Core Web Vitals tests

### 4. Digital Experience Monitoring
- Instrument demo app for RUM
- Capture user sessions, page views, errors, JS exceptions, Core Web Vitals
- Geo/device breakdowns
- Synthetic monitors and baselining/seasonality for comparisons

### 5. Business Intelligence
- Dashboard correlating technical performance (latency, error rate, throughput) with business KPIs
- Transaction volume, conversion, revenue metrics
- Cohort filters and drill-downs
- Create SLI from existing telemetry; define SLO and error budget
- Show burn-rate alerts; overlay business events (release, feature flags)
- Customer segments; dependency-aware alerting

### 6. Telemetry Pipelines
- Configure OpenTelemetry/agent pipeline with sampling, enrichment, PII redaction
- Routing to multiple backends
- Hot-reload (without full restart of agents) and back-pressure handling
- Custom metrics instrumentation

### 7. SIEM (Security Information and Event Management) _(not required for this implementation)_
- Correlate SIEM detections with telemetry data
- MITRE ATT&CK mapping
- Threat intel enrichment
- SOAR playbook execution
- UEBA and anomaly detection with tuning

### 8. AI/ML, Automation and Remediation
**Automated RCA (Root Cause Analysis)**
- Simulate an outage (e.g., increased latency in downstream DB or API)
- Walk through RCA workflow using correlated metrics, logs, traces, events
- Change/release markers to reduce MTTD and MTTR

### 9. AI/ML Insight (Predictive Anomaly Detection)
- Simulate an issue and show anomaly detection on metrics/traces/logs
- Baseline models, predictions, alert deduplication/noise reduction
- Incident correlation, automated workflows, and remediation templates

### 10. Automation & Remediation
- Automated alert enrichment with related metrics/logs/traces
- Runbook links, CMDB/service context, and recent changes
- Trigger automated remediation (scale out, restart service) with approvals and rollback
- Show automatic remediation capabilities

### 11. End-to-End LLM Application Observability
- Instrument LLM-backed workflow
- Show prompt/response traces, prompt variables, model/endpoint selection
- Latency, token counts/costs, error categorization (timeouts/refusals)
- Eval scores and safety guardrails

### 12. GenAI Capabilities
- On-call engineer natural-language questions on recent incidents/logs/metrics
- Get RCA hypotheses, summaries, and automated runbook actions
- Include guardrails and data governance options

### 13. Integration & Ecosystem Compatibility
**Shift Left of Monitoring & Integrating with CI/CD Pipeline**
- Demonstrate integration with CI/CD pipeline (Azure DevOps, AWS Code pipeline)
- Measure and monitor performance deviations from code changes or application promotions

### 14. Integrate with ITSM (ServiceNow)
**Service/Topology Mapping and CMDB**
- Bidirectional integration with ServiceNow
- Auto-create and update incidents from alerts with deduplication
- Resolve against CMDB CIs and service maps
- Update CI relationships from application discovery
- Sync change records and maintenance windows

## Current Architecture
The existing Orleans Cluster project provides:
- .NET Orleans application (Silo)
- Python inventory microservice (FastAPI)
- Unified service management scripts
- Local development environment

## Next Steps
1. Implement comprehensive observability instrumentation across all components
2. Set up hybrid deployment (on-premise + cloud)
3. Connect to cloud database
4. Implement all required use cases for demonstration
