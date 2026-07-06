"""PyInstaller entry point for the frozen Tool Hub backend.

PyInstaller can't launch `uvicorn main:app` from a binary, so we run uvicorn
programmatically against the imported app. Single process, no reload.

Port can be overridden via the first CLI arg or TOOLHUB_PORT env var, so the
Electron main process can pick a free port if 8756 is taken.
"""
import os
import sys

import uvicorn

from main import app

if __name__ == "__main__":
    port = 8756
    if len(sys.argv) > 1:
        try:
            port = int(sys.argv[1])
        except ValueError:
            pass
    port = int(os.environ.get("TOOLHUB_PORT", port))
    uvicorn.run(app, host="127.0.0.1", port=port, log_level="warning")
