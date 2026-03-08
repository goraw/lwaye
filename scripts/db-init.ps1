param(
  [string]$ContainerName = "lwaye-postgres",
  [string]$Database = "lwaye",
  [string]$User = "lwaye"
)

$ErrorActionPreference = "Stop"

& "$PSScriptRoot/db-up.ps1" -ContainerName $ContainerName

docker cp "apps/api/db/schema.sql" "${ContainerName}:/tmp/lwaye-schema.sql" | Out-Null
docker cp "apps/api/db/seed.sql" "${ContainerName}:/tmp/lwaye-seed.sql" | Out-Null

docker exec $ContainerName psql -U $User -d $Database -v ON_ERROR_STOP=1 -f /tmp/lwaye-schema.sql
docker exec $ContainerName psql -U $User -d $Database -v ON_ERROR_STOP=1 -f /tmp/lwaye-seed.sql

Write-Output "Database schema and seed applied."
