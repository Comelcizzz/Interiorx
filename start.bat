@echo off
setlocal EnableExtensions
cd /d "%~dp0"

title INTERIORIX - startup
set "EXIT_CODE=0"

echo ============================================================
echo  INTERIORIX - Docker startup
echo  Folder: %CD%
echo ============================================================
echo.

if not exist ".env" (
	echo [env] Creating .env from .env.example ...
	copy /Y ".env.example" ".env" >nul
	if errorlevel 1 (
		echo [env] ERROR: could not copy .env.example to .env
		set "EXIT_CODE=1"
		goto finish
	)
)

where docker >nul 2>nul
if errorlevel 1 (
	echo [docker] ERROR: Docker CLI is not in PATH.
	echo          Install Docker Desktop, then open a NEW Command Prompt.
	set "EXIT_CODE=1"
	goto finish
)

echo [docker] Checking Docker engine...
docker info >nul 2>nul
if errorlevel 1 (
	echo [docker] Engine is not running - starting Docker Desktop...
	powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0scripts\ensure-docker-engine.ps1"
	if errorlevel 2 (
		echo [docker] ERROR: Docker Desktop is not installed or not found.
		echo          Install: https://www.docker.com/products/docker-desktop/
		set "EXIT_CODE=1"
		goto finish
	)
	if errorlevel 1 (
		echo [docker] ERROR: Docker engine did not start in time.
		echo          Open Docker Desktop, wait for Engine running, run start.bat again.
		set "EXIT_CODE=1"
		goto finish
	)
)
echo [docker] OK: Docker engine is running.
echo.

echo [1/3] docker compose up -d --build
docker compose up -d --build
if errorlevel 1 (
	echo [1/3] ERROR: docker compose up failed.
	echo          If Docker Desktop just started, wait a minute and run start.bat again.
	set "EXIT_CODE=1"
	goto fail_report
)

echo.
echo [2/3] Waiting for backend http://127.0.0.1:4000/health (up to ~2 min) ...
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0scripts\wait-backend-health.ps1"
if errorlevel 1 (
	echo [2/3] ERROR: API did not become healthy in time.
	echo        Check: Docker is running, port 4000 is free, backend logs below.
	set "EXIT_CODE=1"
	goto fail_report
)
echo [2/3] OK: backend responded on /health

echo.
echo [3/3] Seeding MongoDB demo data...
docker compose exec -T backend npm run seed --workspace=@tailored/backend
if errorlevel 1 (
	echo [3/3] ERROR: seed failed.
	set "EXIT_CODE=1"
	goto fail_report
)
echo [3/3] OK: seed finished

echo.
echo ============================================================
echo  READY
echo  Frontend: http://localhost:3000
echo  Backend:  http://localhost:4000
echo  Swagger:  http://localhost:4000/api/docs
echo  Health:   http://localhost:4000/health
echo  Demo:     admin@tailored.demo / Demo12345!
echo ============================================================
goto finish

:fail_report
echo.
echo ======================== DIAGNOSTICS ========================
echo docker compose ps:
docker compose ps 2>&1
echo.
echo docker compose logs backend (last 160 lines):
docker compose logs backend --tail=160 2>&1
echo ====================== END DIAGNOSTICS ======================

:finish
echo.
echo ---------------------------------------------------------------------------
echo  Done. Press any key to close...
echo ---------------------------------------------------------------------------
pause >nul
exit /b %EXIT_CODE%
