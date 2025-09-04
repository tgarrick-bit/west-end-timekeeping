# Git Rescue & Checkpoint Cheatsheet

## Daily “save point”
```bash
git add .
git commit -m "checkpoint: <what changed>"
git push

git log --oneline --decorate --graph --all

git checkout -b feature/<name>
# ...work...
git push -u origin feature/<name>

git checkout -b feature/<name>
# ...work...
git push -u origin feature/<name>

git log --oneline
git checkout <commit_sha>
# look around; to return:
git checkout -

git reset --hard <commit_sha>
git push --force

git revert <bad_commit_sha>
# or a range:
git revert <oldest_sha>^..<newest_sha>
git push

git checkout <commit_sha> -- path/to/file.ext
git commit -m "Restore file from <commit_sha>"
git push

git restore path/to/file.ext

git restore --source=HEAD --staged --worktree .

git stash           # save
git stash list      # see stashes
git stash pop       # bring back latest
git stash apply <n> # bring back a specific stash without removing it
git stash drop <n>  # delete a stash

git tag -a v0.1-checkpoint -m "pre-deploy checkpoint"
git push --tags
# later:
git checkout v0.1-checkpoint

# in a different folder
git clone https://github.com/<you>/<repo>.git
cd <repo>
npm install
npm run dev


---

# B) How to make a local backup copy of your whole project (Mac)

You’ve got your project in `virtual24/Projects`. Here are two easy methods.

## Option 1 — Finder (drag-and-drop)
1. Open **Finder** and go to your folder:  
   `~/virtual24/Projects/`
2. **Right-click** your project folder (e.g., `west-end-workforce-latest`) → **Duplicate**.  
   - Rename the copy to something like:  
     `west-end-workforce-backup-2025-09-02`
3. (Optional) Drag that backup folder to an external drive or iCloud/Dropbox for extra safety.

## Option 2 — Terminal (exact copy with timestamps)
```bash
# Replace paths with your actual project folder name
cd ~/virtual24/Projects
cp -a west-end-workforce-latest "west-end-workforce-backup-$(date +%F)"

cd ~/virtual24/Projects
zip -r "west-end-workforce-backup-$(date +%F).zip" west-end-workforce-latest

git add .
git commit -m "checkpoint: stable before refactor"
git tag -a v0.2-pre-refactor -m "stable before refactor"
git push && git push --tags

git checkout v0.2-pre-refactor
# look around; when done:
git checkout main

git reset --hard v0.2-pre-refactor
git push --force

git checkout -b try/new-timesheet-view
# …hack freely…
git push -u origin try/new-timesheet-view
# if it fails, just switch back:
git checkout main

