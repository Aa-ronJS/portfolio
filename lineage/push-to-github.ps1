# Usage (PowerShell): .\push-to-github.ps1 https://github.com/<you>/lineage.git
# Or, with the GitHub CLI installed and logged in: .\push-to-github.ps1
param([string]$RepoUrl)
if ($RepoUrl) {
  git remote remove origin 2>$null
  git remote add origin $RepoUrl
  git push -u origin main
} elseif (Get-Command gh -ErrorAction SilentlyContinue) {
  gh repo create lineage --private --source=. --remote=origin --push
} else {
  Write-Host "Create an empty repo on github.com, then run: .\push-to-github.ps1 <repo-url>"
}
