"""Master Batch Runner for all 10 Blender 4.2 U1 Renders in a single OptiX GPU session."""

from __future__ import annotations

import sys
import time
from pathlib import Path

SCRIPT_DIR = Path(__file__).resolve().parent
if str(SCRIPT_DIR) not in sys.path:
    sys.path.insert(0, str(SCRIPT_DIR))

import render_9slice_frames
import render_hp_gems
import render_hud_seals
import render_table_board


def main() -> None:
    t0 = time.time()
    outputs: list[Path] = []
    outputs.append(render_table_board.render_table_board())
    outputs.extend(render_9slice_frames.render_all_9slice())
    outputs.extend(render_hp_gems.render_all_hp_gems())
    outputs.extend(render_hud_seals.render_all_seals())
    elapsed = time.time() - t0
    print(f"\n[U1 Blender] Completed {len(outputs)}/10 renders in {elapsed:.1f}s.")
    for p in outputs:
        print(f" - {p} ({p.stat().st_size:,} bytes)")


if __name__ == "__main__":
    main()
