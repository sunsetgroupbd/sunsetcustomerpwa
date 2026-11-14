# ==============================================================================
# Sunset Group Customer Application Platform - Backend Quick Setup (Windows)
# ==============================================================================

Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host " Sunset Customer Platform - Backend Setup" -ForegroundColor Cyan
Write-Host "==========================================================" -ForegroundColor Cyan

# 1. Check Python
$python312 = "$env:LOCALAPPDATA\Programs\Python\Python312\python.exe"
if (Test-Path $python312) {
    $pythonCmd = $python312
} else {
    $pythonCmd = "py -3.12"
    $testRun = & py -3.12 --version 2>&1
    if ($LASTEXITCODE -ne 0) {
        $pythonCmd = "py"
    }
}
Write-Host "✓ Using Python launcher: $pythonCmd ($(& $pythonCmd --version))" -ForegroundColor Green

# 2. Create Virtual Environment
if (-not (Test-Path "venv")) {
    Write-Host "Creating virtual environment in .\venv..." -ForegroundColor Yellow
    & $pythonCmd -m venv venv
}

# 3. Activate venv
Write-Host "Activating virtual environment..." -ForegroundColor Yellow
$activateScript = ".\venv\Scripts\Activate.ps1"
if (Test-Path $activateScript) {
    & $activateScript
} else {
    Write-Host "Could not find Activate.ps1, proceeding with venv python directly..." -ForegroundColor Yellow
}

# 4. Install Dependencies
$venvPython = ".\venv\Scripts\python.exe"
$venvPip = ".\venv\Scripts\pip.exe"
if (Test-Path $venvPip) {
    Write-Host "Installing dependencies from requirements.txt..." -ForegroundColor Yellow
    & $venvPip install --upgrade pip
    & $venvPip install -r requirements.txt
} else {
    Write-Host "Using system pip..." -ForegroundColor Yellow
    pip install -r requirements.txt
}

# 5. Environment configuration
if (-not (Test-Path ".env")) {
    Write-Host "Copying .env.example to .env..." -ForegroundColor Yellow
    Copy-Item ".env.example" ".env"
    Write-Host "✓ Created .env file. Please edit with your PostgreSQL and S3 credentials." -ForegroundColor Green
} else {
    Write-Host "✓ .env file already exists." -ForegroundColor Green
}

# 6. Database migrations & seed instructions
Write-Host "`nSetup complete! Next steps:" -ForegroundColor Cyan
Write-Host "1. Configure your database connection in .env (DATABASE_URL)"
Write-Host "2. Run database migrations: alembic upgrade head"
Write-Host "3. Seed initial data: python scripts/seed_db.py"
Write-Host "4. Start backend server: uvicorn main:app --reload --port 8000"
Write-Host "5. Open API docs in browser: http://localhost:8000/api/v1/docs"

