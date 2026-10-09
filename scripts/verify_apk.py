"""Verify the debug APK against committed source and dist, then deliver it locally."""
import argparse
import hashlib
import json
import os
from pathlib import Path
import re
import shutil
import subprocess
import zipfile


def run(*args):
    return subprocess.check_output(args, text=True, stderr=subprocess.STDOUT).strip()


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--sdk", type=Path, required=True)
    parser.add_argument("--build-tools", default="35.0.0")
    args = parser.parse_args()
    root = Path(__file__).resolve().parents[1]
    os.chdir(root)
    # Documentation may be edited after the source freeze; executable inputs may not.
    dirty = run("git", "status", "--porcelain", "--", "frontend", "backend", "scripts")
    if dirty:
        raise RuntimeError("Commit executable/build inputs before recording an APK source commit.")
    commit = run("git", "rev-parse", "HEAD")
    apk = root / "frontend/android/app/build/outputs/apk/debug/app-debug.apk"
    tools = args.sdk.resolve() / "build-tools" / args.build_tools
    signature = run(str(tools / "apksigner.bat"), "verify", "--verbose", "--print-certs", str(apk))
    badging = run(str(tools / "aapt.exe"), "dump", "badging", str(apk))
    identity = re.search(r"package: name='([^']+)' versionCode='([^']+)' versionName='([^']+)'", badging)
    minimum = re.search(r"^sdkVersion:'(\d+)'", badging, re.M)
    target = re.search(r"^targetSdkVersion:'(\d+)'", badging, re.M)
    if not identity or identity.groups() != ("org.reliefmesh.app", "1", "1.0"):
        raise RuntimeError("Unexpected APK application identity/version.")
    if not minimum or not target or (minimum[1], target[1]) != ("23", "35"):
        raise RuntimeError("Unexpected APK SDK requirements.")
    if "application-debuggable" not in badging:
        raise RuntimeError("Expected the authorized demonstration debug APK.")
    matched = []
    with zipfile.ZipFile(apk) as bundle:
        for asset in sorted((root / "frontend/dist").rglob("*")):
            if asset.is_file():
                relative = asset.relative_to(root / "frontend/dist").as_posix()
                data = asset.read_bytes()
                if bundle.read("assets/public/" + relative) != data:
                    raise RuntimeError("APK differs from final production asset: " + relative)
                matched.append({"path": relative, "sha256": hashlib.sha256(data).hexdigest()})
        if not matched or "index.html" not in [item["path"] for item in matched]:
            raise RuntimeError("Production web entry point is missing.")
        config = json.loads(bundle.read("assets/capacitor.config.json"))
        if config["appId"] != "org.reliefmesh.app" or config.get("server", {}).get("url"):
            raise RuntimeError("APK must bundle the app without a development-server URL.")
        descriptor = b"Lorg/reliefmesh/app/ReliefMeshNearbyPlugin;"
        if not any(descriptor in bundle.read(name) for name in bundle.namelist() if re.fullmatch(r"classes\d*\.dex", name)):
            raise RuntimeError("Native Nearby plugin is missing from the APK.")
    destination = root / "artifacts/ReliefMesh-demo.apk"
    destination.parent.mkdir(exist_ok=True)
    shutil.copyfile(apk, destination)
    digest = hashlib.sha256(destination.read_bytes()).hexdigest()
    if digest != hashlib.sha256(apk.read_bytes()).hexdigest():
        raise RuntimeError("Delivered APK checksum differs from the verified build.")
    manifest = {
        "source_commit": commit,
        "apk": "artifacts/ReliefMesh-demo.apk",
        "sha256": digest,
        "bytes": destination.stat().st_size,
        "application_id": identity[1],
        "version_code": identity[2],
        "version_name": identity[3],
        "min_sdk": int(minimum[1]),
        "target_sdk": int(target[1]),
        "debug_build": True,
        "signature_verification": signature.splitlines(),
        "production_assets": matched,
        "nearby_plugin_present": True,
        "development_server_url": None,
        "physical_installation_tested": False,
    }
    evidence = root / "docs/frontend-review-evidence/apk-verification.json"
    evidence.write_text(json.dumps(manifest, indent=2) + "\n", encoding="utf-8")
    (destination.parent / "ReliefMesh-demo.apk.sha256").write_text(digest + "  ReliefMesh-demo.apk\n", encoding="ascii")
    print(json.dumps({"status": "passed", "source_commit": commit, "apk": str(destination), "sha256": digest, "assets_matched": len(matched)}))


if __name__ == "__main__":
    main()
