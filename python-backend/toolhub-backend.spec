# -*- mode: python ; coding: utf-8 -*-
from PyInstaller.utils.hooks import collect_submodules

hiddenimports = ['cv2']
hiddenimports += collect_submodules('uvicorn')
hiddenimports += collect_submodules('encodings')
hiddenimports += collect_submodules('pypdf')

# Bundle the static ffmpeg binary (from imageio-ffmpeg) at the bundle root, so
# the frozen backend can run audio/video processing with no system ffmpeg.
import imageio_ffmpeg
_ffmpeg = imageio_ffmpeg.get_ffmpeg_exe()

a = Analysis(
    ['run_server.py'],
    pathex=[],
    binaries=[(_ffmpeg, '.')],
    datas=[('presets.json', '.')],
    hiddenimports=hiddenimports,
    hookspath=[],
    hooksconfig={},
    runtime_hooks=[],
    excludes=[],
    noarchive=False,
    optimize=0,
)
pyz = PYZ(a.pure)

exe = EXE(
    pyz,
    a.scripts,
    [],
    exclude_binaries=True,
    name='toolhub-backend',
    debug=False,
    bootloader_ignore_signals=False,
    strip=False,
    upx=True,
    console=True,
    disable_windowed_traceback=False,
    argv_emulation=False,
    target_arch=None,
    codesign_identity=None,
    entitlements_file=None,
)
coll = COLLECT(
    exe,
    a.binaries,
    a.datas,
    strip=False,
    upx=True,
    upx_exclude=[],
    name='toolhub-backend',
)
