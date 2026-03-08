param(
  [string]$ContainerName = "lwaye-postgres"
)

function Assert-DockerAvailable {
  & cmd /c "docker info >nul 2>nul"
  if ($LASTEXITCODE -ne 0) {
    throw "Docker Desktop is not running or the current shell cannot reach the Docker daemon. Start Docker Desktop, then rerun the database command."
  }
}

$ErrorActionPreference = "Stop"

Assert-DockerAvailable

docker compose up -d postgres | Out-Null

for ($i = 0; $i -lt 30; $i++) {
  & cmd /c "docker exec $ContainerName pg_isready -U lwaye -d lwaye >nul 2>nul"
  if ($LASTEXITCODE -eq 0) {
    Write-Output "Postgres is ready."
    exit 0
  }
  Start-Sleep -Seconds 2
}

throw "Postgres did not become ready in time."
