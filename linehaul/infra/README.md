# Infrastructure

One Bicep file, resource-group scoped. It stands up:

| Resource | Purpose | Tier |
|---|---|---|
| App Service (Linux) | the .NET 9 API | B1, shared plan |
| App Service (Linux) | the Next.js front end | same plan |
| Function App | `OverdueSweep`, every 15 minutes | same plan |
| Azure SQL Database | the system of record | S0 |
| Storage account, `pod` container | proof-of-delivery photos via short-lived SAS | Standard LRS |
| Log Analytics + Application Insights | logs and traces from all three apps | PerGB2018 |

```bash
az group create -n rg-linehaul -l australiaeast
az deployment group create -g rg-linehaul -f main.bicep \
  -p sqlAdminPassword="$SQL_ADMIN_PASSWORD"
```

Then apply the database migrations (see `../db/README.md`) against the
`sqlServerFqdn` output, and point the deploy workflow at the three site names
it prints.

Deliberately small tiers: a product at this stage should start on the
cheapest configuration that is honest about production (TLS floors, no public
blobs, real observability) and scale when measurements say so. The obvious
next steps as it grows, in order: managed identity from the apps to SQL and
storage instead of connection strings, a Key Vault for what remains, then
splitting the plan when one workload starts starving another.
