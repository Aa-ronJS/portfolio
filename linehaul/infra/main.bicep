// Linehaul on Azure: App Service (API), Static-capable App Service (web),
// Functions (overdue sweep), SQL Database, Blob Storage (POD photos),
// Application Insights. One file, resource-group scoped, deployed with:
//
//   az deployment group create -g rg-linehaul -f main.bicep \
//     -p sqlAdminPassword=$SQL_ADMIN_PASSWORD
//
// Sized deliberately small (B1 / Basic / consumption): a growing logistics
// product should start on the cheapest tier that is honest about production,
// and scale when the numbers say so, not before.

@description('Prefix for every resource name; keep it short and lowercase.')
@maxLength(10)
param prefix string = 'linehaul'

param location string = resourceGroup().location

@description('SQL admin login name.')
param sqlAdminLogin string = 'linehauladmin'

@secure()
@description('SQL admin password. Supply from a pipeline secret or Key Vault, never a file.')
param sqlAdminPassword string

var suffix = uniqueString(resourceGroup().id)

// ---- Observability ---------------------------------------------------------

resource logs 'Microsoft.OperationalInsights/workspaces@2023-09-01' = {
  name: '${prefix}-logs'
  location: location
  properties: {
    retentionInDays: 30
    sku: { name: 'PerGB2018' }
  }
}

resource insights 'Microsoft.Insights/components@2020-02-02' = {
  name: '${prefix}-insights'
  location: location
  kind: 'web'
  properties: {
    Application_Type: 'web'
    WorkspaceResourceId: logs.id
  }
}

// ---- SQL -------------------------------------------------------------------

resource sqlServer 'Microsoft.Sql/servers@2023-08-01-preview' = {
  name: '${prefix}-sql-${suffix}'
  location: location
  properties: {
    administratorLogin: sqlAdminLogin
    administratorLoginPassword: sqlAdminPassword
    minimalTlsVersion: '1.2'
    publicNetworkAccess: 'Enabled'
  }
}

resource sqlDb 'Microsoft.Sql/servers/databases@2023-08-01-preview' = {
  parent: sqlServer
  name: 'linehaul'
  location: location
  sku: {
    name: 'S0'
    tier: 'Standard'
  }
  properties: {
    collation: 'SQL_Latin1_General_CP1_CI_AS'
  }
}

// Azure services (App Service, Functions) reach the database through the
// service firewall rule; developer IPs are added explicitly, never 0.0.0.0/0
// beyond this rule.
resource sqlAllowAzure 'Microsoft.Sql/servers/firewallRules@2023-08-01-preview' = {
  parent: sqlServer
  name: 'AllowAzureServices'
  properties: {
    startIpAddress: '0.0.0.0'
    endIpAddress: '0.0.0.0'
  }
}

// ---- Storage (POD photos) --------------------------------------------------

resource storage 'Microsoft.Storage/storageAccounts@2023-05-01' = {
  name: '${prefix}pod${suffix}'
  location: location
  kind: 'StorageV2'
  sku: { name: 'Standard_LRS' }
  properties: {
    minimumTlsVersion: 'TLS1_2'
    allowBlobPublicAccess: false
    supportsHttpsTrafficOnly: true
  }
}

resource blobService 'Microsoft.Storage/storageAccounts/blobServices@2023-05-01' = {
  parent: storage
  name: 'default'
}

resource podContainer 'Microsoft.Storage/storageAccounts/blobServices/containers@2023-05-01' = {
  parent: blobService
  name: 'pod'
  properties: { publicAccess: 'None' }
}

// ---- Compute ---------------------------------------------------------------

resource plan 'Microsoft.Web/serverfarms@2023-12-01' = {
  name: '${prefix}-plan'
  location: location
  kind: 'linux'
  sku: { name: 'B1' }
  properties: { reserved: true }
}

var sqlConnectionString = 'Server=tcp:${sqlServer.properties.fullyQualifiedDomainName},1433;Initial Catalog=linehaul;User ID=${sqlAdminLogin};Password=${sqlAdminPassword};Encrypt=True;Connection Timeout=30;'
var storageConnectionString = 'DefaultEndpointsProtocol=https;AccountName=${storage.name};AccountKey=${storage.listKeys().keys[0].value};EndpointSuffix=${environment().suffixes.storage}'

resource api 'Microsoft.Web/sites@2023-12-01' = {
  name: '${prefix}-api-${suffix}'
  location: location
  properties: {
    serverFarmId: plan.id
    httpsOnly: true
    siteConfig: {
      linuxFxVersion: 'DOTNETCORE|9.0'
      alwaysOn: true
      minTlsVersion: '1.2'
      appSettings: [
        { name: 'APPLICATIONINSIGHTS_CONNECTION_STRING', value: insights.properties.ConnectionString }
        { name: 'ConnectionStrings__Linehaul', value: sqlConnectionString }
        { name: 'ConnectionStrings__PodStorage', value: storageConnectionString }
      ]
    }
  }
}

resource web 'Microsoft.Web/sites@2023-12-01' = {
  name: '${prefix}-web-${suffix}'
  location: location
  properties: {
    serverFarmId: plan.id
    httpsOnly: true
    siteConfig: {
      linuxFxVersion: 'NODE|22-lts'
      alwaysOn: true
      minTlsVersion: '1.2'
      appCommandLine: 'node_modules/next/dist/bin/next start -p 8080'
      appSettings: [
        { name: 'LINEHAUL_API_URL', value: 'https://${api.properties.defaultHostName}' }
      ]
    }
  }
}

resource functionApp 'Microsoft.Web/sites@2023-12-01' = {
  name: '${prefix}-fn-${suffix}'
  location: location
  kind: 'functionapp,linux'
  properties: {
    serverFarmId: plan.id
    httpsOnly: true
    siteConfig: {
      linuxFxVersion: 'DOTNET-ISOLATED|9.0'
      minTlsVersion: '1.2'
      appSettings: [
        { name: 'AzureWebJobsStorage', value: storageConnectionString }
        { name: 'FUNCTIONS_EXTENSION_VERSION', value: '~4' }
        { name: 'FUNCTIONS_WORKER_RUNTIME', value: 'dotnet-isolated' }
        { name: 'APPLICATIONINSIGHTS_CONNECTION_STRING', value: insights.properties.ConnectionString }
        { name: 'LinehaulDb', value: sqlConnectionString }
      ]
    }
  }
}

output apiHostName string = api.properties.defaultHostName
output webHostName string = web.properties.defaultHostName
output functionHostName string = functionApp.properties.defaultHostName
output sqlServerFqdn string = sqlServer.properties.fullyQualifiedDomainName
