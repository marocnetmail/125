@echo off
for %%f in (img-*.jpg) do (
    set "name=%%f"
    setlocal enabledelayedexpansion
    ren "%%f" "!name:img-=!"
    endlocal
)