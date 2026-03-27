"""
Lance le backend NestJS depuis la racine du monorepo.

Usage:

  python run_backend.py
  python run_backend.py --install
  python run_backend.py --script start
"""

import argparse
import subprocess
import sys
from pathlib import Path


ROOT = Path(__file__).resolve().parent
BACKEND_DIR = ROOT / "apps" / "backend"
BACKEND_PACKAGE = BACKEND_DIR / "package.json"


def run(cmd, cwd: Path, check: bool = True) -> int:
    print(f"[backend] {subprocess.list2cmdline(cmd)}")
    try:
        result = subprocess.run(cmd, cwd=cwd)
    except FileNotFoundError as exc:
        print(f"[backend] Commande introuvable: {cmd[0]} ({exc})")
        sys.exit(1)

    if check and result.returncode != 0:
        sys.exit(result.returncode)

    return result.returncode


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Lance le backend NestJS HomePedia.")
    parser.add_argument(
        "--install",
        action="store_true",
        help="Execute npm install dans apps/backend avant le lancement.",
    )
    parser.add_argument(
        "--script",
        default="start:dev",
        help="Script npm a executer (defaut: start:dev).",
    )
    return parser.parse_args()


def ensure_backend() -> None:
    if not BACKEND_PACKAGE.exists():
        print(f"[backend] package.json introuvable: {BACKEND_PACKAGE}")
        sys.exit(1)


def main() -> None:
    args = parse_args()
    ensure_backend()

    if args.install or not (BACKEND_DIR / "node_modules").exists():
        run(["npm", "install"], cwd=BACKEND_DIR)

    run(["npm", "run", args.script], cwd=BACKEND_DIR, check=False)


if __name__ == "__main__":
    main()
