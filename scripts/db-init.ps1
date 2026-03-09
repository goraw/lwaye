param(
  [string]$ContainerName = "lwaye-postgres",
  [string]$Database = "lwaye",
  [string]$User = "lwaye"
)

$ErrorActionPreference = "Stop"

function Invoke-DockerPsqlFile {
  param(
    [string]$FilePath
  )

  & docker exec $ContainerName psql -U $User -d $Database -v ON_ERROR_STOP=1 -f $FilePath
  if ($LASTEXITCODE -ne 0) {
    throw "psql failed while applying $FilePath"
  }
}

function Invoke-DockerPsqlCommand {
  param(
    [string]$Sql
  )

  & docker exec $ContainerName psql -U $User -d $Database -v ON_ERROR_STOP=1 -c $Sql
  if ($LASTEXITCODE -ne 0) {
    throw "psql failed while executing setup SQL"
  }
}

& "$PSScriptRoot/db-up.ps1" -ContainerName $ContainerName

Invoke-DockerPsqlCommand "DROP SCHEMA IF EXISTS public CASCADE; CREATE SCHEMA public;"
& "$PSScriptRoot/db-migrate.ps1" -ContainerName $ContainerName -Database $Database -User $User

docker cp "apps/api/db/seed.sql" "${ContainerName}:/tmp/lwaye-seed.sql" | Out-Null
Invoke-DockerPsqlFile "/tmp/lwaye-seed.sql"

Write-Output "Database migrations and seed applied."
