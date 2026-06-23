# Waits until the backend /health endpoint responds (used by start.bat).
param(
	[string]$Url = 'http://127.0.0.1:4000/health',
	[int]$TimeoutSeconds = 120,
	[int]$IntervalSeconds = 2
)

$ErrorActionPreference = 'Stop'
$deadline = (Get-Date).AddSeconds($TimeoutSeconds)

while ((Get-Date) -lt $deadline) {
	try {
		$response = Invoke-WebRequest -Uri $Url -UseBasicParsing -TimeoutSec 5
		if ($response.StatusCode -ge 200 -and $response.StatusCode -lt 300) {
			exit 0
		}
	} catch {
		# still starting
	}
	Start-Sleep -Seconds $IntervalSeconds
}

Write-Error "Backend did not respond at $Url within ${TimeoutSeconds}s"
exit 1
