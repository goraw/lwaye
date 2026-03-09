param(
  [string]$ContainerName = "lwaye-postgres",
  [string]$Database = "lwaye",
  [string]$User = "lwaye"
)

$ErrorActionPreference = "Stop"

function Invoke-DockerPsqlCommand {
  param(
    [string]$Sql
  )

  & docker exec $ContainerName psql -U $User -d $Database -v ON_ERROR_STOP=1 -tA -c $Sql
  if ($LASTEXITCODE -ne 0) {
    throw "psql failed while executing SQL"
  }
}

function Invoke-DockerPsqlFile {
  param(
    [string]$FilePath
  )

  & docker exec $ContainerName psql -U $User -d $Database -v ON_ERROR_STOP=1 -f $FilePath
  if ($LASTEXITCODE -ne 0) {
    throw "psql failed while applying $FilePath"
  }
}

& "$PSScriptRoot/db-up.ps1" -ContainerName $ContainerName

Invoke-DockerPsqlCommand @"
CREATE TABLE IF NOT EXISTS schema_migrations (
  version TEXT PRIMARY KEY,
  applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
)
"@

$migrationFiles = Get-ChildItem "apps/api/db/migrations" -Filter *.sql | Sort-Object Name

foreach ($migration in $migrationFiles) {
  $version = $migration.BaseName
  $alreadyApplied = Invoke-DockerPsqlCommand "SELECT version FROM schema_migrations WHERE version = '$version' LIMIT 1"
  if ($alreadyApplied) {
    Write-Output "Skipping already applied migration $version"
    continue
  }

  $targetPath = "/tmp/$($migration.Name)"
  docker cp $migration.FullName "${ContainerName}:$targetPath" | Out-Null
  Invoke-DockerPsqlFile $targetPath
  Invoke-DockerPsqlCommand "INSERT INTO schema_migrations (version) VALUES ('$version')"
  Write-Output "Applied migration $version"
}
