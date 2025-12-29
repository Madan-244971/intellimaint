@echo off
echo ==========================================
echo      IntelliMaint GitHub Publisher
echo ==========================================
echo.

:: Check for Git
git --version >nul 2>&1
if %errorlevel% neq 0 (
    echo Git is not found in your PATH. 
    echo Please ensure Git is installed and you have restarted your computer.
    pause
    exit /b
)

echo 1. Initializing Repository...
git init

echo 2. Adding files...
git add .

echo 3. Committing files...
git commit -m "Ready for Render deployment"

echo.
echo ==========================================
echo PASTE YOUR GITHUB REPOSITORY URL BELOW
echo (Right-click to paste in this window)
echo Example: https://github.com/username/repo.git
echo ==========================================
set /p repo_url="Repository URL: "

echo 4. Linking to GitHub...
git branch -M main
git remote remove origin >nul 2>&1
git remote add origin %repo_url%

echo 5. Pushing code...
git push -u origin main

echo.
echo ==========================================
echo                 DONE!
echo ==========================================
pause