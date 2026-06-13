#!/usr/bin/env python3
from pathlib import Path
import runpy


ROOT = Path(__file__).resolve().parents[2]
VALIDATOR = ROOT / "product-factory-os" / "scripts" / "validate_security_report.py"

if not VALIDATOR.is_file():
    raise SystemExit(f"missing PFO security validator: {VALIDATOR}")

runpy.run_path(str(VALIDATOR), run_name="__main__")
