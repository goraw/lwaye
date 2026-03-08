param(
  [string]$ContainerName = "lwaye-postgres"
)

$ErrorActionPreference = "Stop"

& "$PSScriptRoot/db-up.ps1" -ContainerName $ContainerName

docker compose down -v
docker compose up -d postgres | Out-Null
& "$PSScriptRoot/db-init.ps1" -ContainerName $ContainerName
