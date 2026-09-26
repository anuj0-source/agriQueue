"""
run_dev.py  — AgriQueue backend dev server
------------------------------------------
Use this instead of bare `uvicorn main:app --reload` when the project
lives inside an OneDrive folder.

OneDrive writes metadata files alongside every saved file, which floods
the watchfiles watcher with multiple events per save. Without the
reload_delay debounce those rapid events cause back-to-back reloads
that kill the previous worker before it has finished shutting down,
which looks like a crash.

Run with:
    python run_dev.py
"""
import uvicorn

if __name__ == "__main__":
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=8000,
        reload=True,
        reload_delay=1.5,       # absorbs OneDrive's burst of metadata file events
        reload_dirs=["./"],     # only watch the app directory
        log_level="info",
    )
