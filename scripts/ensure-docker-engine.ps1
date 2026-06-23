# Ensures Docker CLI can talk to the engine. Starts Docker Desktop on Windows if needed.
param(
	[int]$TimeoutSeconds = 180
)

$ErrorActionPreference = 'SilentlyContinue'

function Test-DockerEngine {
	docker info 2>$null | Out-Null
	return $LASTEXITCODE -eq 0
}

if (Test-DockerEngine) {
	exit 0
}

function Find-DockerDesktopExe {
	$candidates = @(
		(Join-Path $env:ProgramFiles 'Docker\Docker\Docker Desktop.exe'),
		(Join-Path ${env:ProgramFiles(x86)} 'Docker\Docker\Docker Desktop.exe'),
		(Join-Path $env:LOCALAPPDATA 'Programs\Docker\Docker\Docker Desktop.exe')
	)
	foreach ($path in $candidates) {
		if ($path -and (Test-Path -LiteralPath $path)) {
			return $path
		}
	}
	return $null
}

$exe = Find-DockerDesktopExe
if (-not $exe) {
	Write-Host '[docker] Docker Desktop.exe not found (is Docker Desktop installed?).'
	exit 2
}

$proc = Get-Process -Name 'Docker Desktop' -ErrorAction SilentlyContinue
if ($proc) {
	Write-Host '[docker] Docker Desktop is already open — waiting for engine...'
} else {
	Write-Host "[docker] Starting Docker Desktop: $exe"
	Start-Process -FilePath $exe | Out-Null
}

$deadline = (Get-Date).AddSeconds($TimeoutSeconds)
$dots = 0
while ((Get-Date) -lt $deadline) {
	if (Test-DockerEngine) {
		Write-Host ''
		Write-Host '[docker] Engine is running.'
		exit 0
	}
	$dots = ($dots + 1) % 4
	Write-Host ("`r[docker] Waiting for engine{0}   " -f ('.' * $dots)) -NoNewline
	Start-Sleep -Seconds 3
}

Write-Host ''
Write-Host "[docker] Timed out after $TimeoutSeconds s. Open Docker Desktop manually and wait for 'Engine running'."
exit 1
