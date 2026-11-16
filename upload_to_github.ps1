# FontCreatorStudio - GitHub 自動プッシュスクリプト (PowerShell)
$ErrorActionPreference = "Stop"

Set-Location $PSScriptRoot

Write-Host "====================================================" -ForegroundColor Cyan
Write-Host "  FontCreatorStudio - GitHub アップロードスクリプト" -ForegroundColor Cyan
Write-Host "====================================================" -ForegroundColor Cyan
Write-Host ""

if (-not (Get-Command git -ErrorAction SilentlyContinue)) {
    Write-Error "[エラー] Gitがインストールされていません。"
    exit 1
}

if (-not (Test-Path ".git")) {
    Write-Host "[1/4] Gitリポジトリを初期化しています..." -ForegroundColor Yellow
    git init -b main
} else {
    Write-Host "[1/4] 既存のGitリポジトリを確認しました。" -ForegroundColor Green
}

$originExists = git remote get-url origin 2>$null
if (-not $originExists) {
    Write-Host "[2/4] リモートリポジトリを設定しています..." -ForegroundColor Yellow
    git remote add origin "https://github.com/SagyouDarui900/FontCreatorStudio.git"
} else {
    Write-Host "[2/4] リモートリポジトリ設定を確認しました。" -ForegroundColor Green
    git remote set-url origin "https://github.com/SagyouDarui900/FontCreatorStudio.git"
}

Write-Host "[3/4] 全ファイルをステージング・コミットしています..." -ForegroundColor Yellow
git add -A
git commit -m "Update FontCreatorStudio: UI layout and modal balance improvements"

Write-Host "[4/4] GitHub (mainブランチ) へプッシュを実行しています..." -ForegroundColor Yellow
git push -u origin main

if ($LASTEXITCODE -eq 0) {
    Write-Host ""
    Write-Host "[完了] GitHubへのプッシュに成功しました。" -ForegroundColor Green
    Write-Host "GitHub Actionsによって自動ビルドおよびGitHub Pagesへのデプロイが実行されます。" -ForegroundColor Green
} else {
    Write-Host ""
    Write-Host "[警告] プッシュ時にエラーが発生しました。コンフリクトがある場合は git pull origin main --rebase または git push -u origin main --force を検討してください。" -ForegroundColor Red
}
