@echo off
chcp 65001 > nul
setlocal

echo ====================================================
echo   FontCreatorStudio - GitHub アップロードスクリプト
echo ====================================================
echo.
cd /d "%~dp0"

where git >nul 2>nul
if %ERRORLEVEL% neq 0 (
    echo [エラー] Gitがインストールされていません。
    echo Gitをインストールした後に再実行してください。
    pause
    exit /b 1
)

if not exist .git (
    echo [1/4] Gitリポジトリを初期化しています...
    git init -b main
) else (
    echo [1/4] 既存のGitリポジトリを確認しました。
)

git remote get-url origin >nul 2>nul
if %ERRORLEVEL% neq 0 (
    echo [2/4] リモートリポジトリ (SagyouDarui900/FontCreatorStudio) を設定しています...
    git remote add origin https://github.com/SagyouDarui900/FontCreatorStudio.git
) else (
    echo [2/4] リモートリポジトリ設定を確認しました。
    git remote set-url origin https://github.com/SagyouDarui900/FontCreatorStudio.git
)

echo [3/4] 全ファイルをステージングしてコミットを作成しています...
git add -A
git commit -m "Update FontCreatorStudio: UI layout and modal balance improvements"

echo [4/4] GitHub (mainブランチ) へプッシュを実行しています...
echo ※ 認証画面が表示された場合はGitHubアカウントでログインしてください。
git push -u origin main

if %ERRORLEVEL% equ 0 (
    echo.
    echo ====================================================
    echo [完了] GitHubへのプッシュに成功しました。
    echo GitHub Actionsによって自動ビルドとGitHub Pagesの更新が行われます。
    echo ====================================================
) else (
    echo.
    echo [注意] リモート側の履歴と競合した場合は、下記コマンドを実行してください:
    echo   git pull origin main --rebase
    echo   git push -u origin main
    echo 完全にローカル内容で上書きする場合は:
    echo   git push -u origin main --force
)

echo.
pause
