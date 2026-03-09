param(
  [string]$ContainerName = "lwaye-postgres"
)

$ErrorActionPreference = "Stop"

docker compose down -v
& "$PSScriptRoot/db-init.ps1" -ContainerName $ContainerName
