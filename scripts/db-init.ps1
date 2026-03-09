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

docker cp "apps/api/db/schema.sql" "${ContainerName}:/tmp/lwaye-schema.sql" | Out-Null
docker cp "apps/api/db/seed.sql" "${ContainerName}:/tmp/lwaye-seed.sql" | Out-Null

Invoke-DockerPsqlCommand "DROP SCHEMA IF EXISTS public CASCADE; CREATE SCHEMA public;"
Invoke-DockerPsqlFile "/tmp/lwaye-schema.sql"
Invoke-DockerPsqlFile "/tmp/lwaye-seed.sql"

Write-Output "Database schema and seed applied."
