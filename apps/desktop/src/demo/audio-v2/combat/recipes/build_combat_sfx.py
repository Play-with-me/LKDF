"""Build and QA-polish all 22 Tam Quoc Sat Demo Audio v2 combat SFX cues."""
from __future__ import annotations

import json
import math
from pathlib import Path

import numpy as np
import soundfile as sf
from earshot.features import brightness_hz, envelope_times, integrated_lufs, true_peak_dbtp
from earshot.make import make

COMBAT_DIR = Path(__file__).resolve().parent.parent
RECIPES_DIR = Path(__file__).resolve().parent
SR = 48000
PEAK_CEIL = 0.885  # -1.06 dBFS (keeps true_peak_dbtp <= -1.0 dBTP)


SPECS: list[dict] = [
    {
        "id": "DEAL_OPENING",
        "target_lufs": -15.0,
        "dur_range_ms": (650, 850),
        "fade_out_ms": 60,
        "recipe": {
            "name": "tqs_deal_opening",
            "says": "four playing cards dealt quickly onto a wooden table with cloth brush",
            "space": "room",
            "dur": 0.82,
            "layers": [
                {
                    "sound": "paper/card",
                    "events": {"count": 4, "gap": 0.14, "faster": 0.92, "softer": 1.5, "loose": 0.15},
                    "lowpass": 6800,
                    "gain": 0,
                },
                {"sound": "swipe/cloth", "at": 0.0, "cut": [0.0, 0.35], "lowpass": 3500, "gain": -9},
            ],
        },
    },
    {
        "id": "DEAL",
        "target_lufs": -16.0,
        "dur_range_ms": (180, 300),
        "fade_out_ms": 35,
        "recipe": {
            "name": "tqs_deal",
            "says": "one playing card drawn crisply from a deck",
            "space": "dry",
            "dur": 0.28,
            "layers": [
                {"sound": "paper/card", "cut": [0.0, 0.26], "lowpass": 6500, "gain": 0},
                {"sound": "slide/paper", "cut": [0.0, 0.24], "lowpass": 5200, "gain": -7},
                {"sound": "flick/thin", "at": 0.01, "lowpass": 6000, "gain": -5},
            ],
        },
    },
    {
        "id": "SHUFFLE",
        "target_lufs": -15.0,
        "dur_range_ms": (1100, 1450),
        "fade_out_ms": 90,
        "recipe": {
            "name": "tqs_shuffle",
            "says": "deck of playing cards riffle shuffled and placed neatly on wooden table",
            "space": "room",
            "dur": 1.40,
            "layers": [
                {"sound": "cards/shuffle", "lowpass": 6800, "fade_out": 0.12, "gain": 0},
                {"sound": "book/place", "at": 1.05, "pitch": 2, "lowpass": 4200, "gain": -7},
            ],
        },
    },
    {
        "id": "CARD_PLAY",
        "target_lufs": -15.0,
        "dur_range_ms": (180, 280),
        "fade_out_ms": 35,
        "recipe": {
            "name": "tqs_card_play",
            "says": "heavy cardstock card slapped cleanly onto an ebony wood table",
            "space": "dry",
            "dur": 0.25,
            "layers": [
                {"sound": "paper/card", "cut": [0.0, 0.22], "lowpass": 6800, "gain": -2},
                {"sound": "knock/table", "pitch": -3, "at": 0.03, "cut": [0.0, 0.14], "lowpass": 2400, "gain": -3},
            ],
        },
    },
    {
        "id": "SAT",
        "target_lufs": -14.0,
        "dur_range_ms": (360, 520),
        "fade_out_ms": 55,
        "recipe": {
            "name": "tqs_sat",
            "says": "forged steel broadsword slashing sharply through the air",
            "space": "room",
            "dur": 0.48,
            "layers": [
                {"sound": "sword/swing", "pitch": -1, "gain": 0},
                {"sound": "whoosh/blade", "at": 0.02, "gain": -3},
                {"sound": "shine/blade", "at": 0.04, "lowpass": 7200, "gain": -6},
            ],
        },
    },
    {
        "id": "THIEM",
        "target_lufs": -14.0,
        "dur_range_ms": (260, 400),
        "fade_out_ms": 45,
        "recipe": {
            "name": "tqs_thiem",
            "says": "swift silk sleeve dodge whoosh",
            "space": "dry",
            "dur": 0.36,
            "layers": [
                {"sound": "whoosh/cloth", "pitch": 3, "gain": 0},
                {"sound": "flick/thin", "at": 0.02, "gain": -4},
                {"sound": "whoosh/fast", "pitch": 2, "highpass": 600, "lowpass": 6500, "gain": -6},
            ],
        },
    },
    {
        "id": "WEAPON",
        "target_lufs": -14.0,
        "dur_range_ms": (550, 750),
        "fade_out_ms": 70,
        "recipe": {
            "name": "tqs_weapon",
            "says": "forged steel sword drawn cleanly from wooden scabbard",
            "space": "room",
            "dur": 0.70,
            "layers": [
                {"sound": "sword/draw", "cut": [0.0, 0.65], "lowpass": 7800, "gain": 0},
                {"sound": "shine/blade", "at": 0.12, "lowpass": 7400, "gain": -4},
                {"sound": "knock/wood", "at": 0.02, "gain": -8},
            ],
        },
    },
    {
        "id": "ARMOR",
        "target_lufs": -14.0,
        "dur_range_ms": (500, 700),
        "fade_out_ms": 70,
        "recipe": {
            "name": "tqs_armor",
            "says": "heavy leather and iron plate armor strapped and locked on",
            "space": "room",
            "dur": 0.65,
            "layers": [
                {"sound": "leather/grab", "gain": -2},
                {"sound": "shield/block", "at": 0.08, "pitch": -3, "lowpass": 4200, "gain": 0},
                {"sound": "thump/book", "at": 0.10, "gain": -5},
            ],
        },
    },
    {
        "id": "MOUNT_PLUS",
        "target_lufs": -14.0,
        "dur_range_ms": (600, 780),
        "fade_out_ms": 110,
        "recipe": {
            "name": "tqs_mount_plus",
            "says": "steady defensive horse hooves trotting on stone with leather saddle",
            "space": "room",
            "dur": 0.74,
            "layers": [
                {"sound": "horse/trot", "cut": [0.0, 0.70], "pitch": -1, "lowpass": 4500, "fade_out": 0.14, "gain": 0},
                {"sound": "leather/grab", "at": 0.04, "lowpass": 4800, "gain": -6},
            ],
        },
    },
    {
        "id": "MOUNT_MINUS",
        "target_lufs": -14.0,
        "dur_range_ms": (600, 780),
        "fade_out_ms": 110,
        "recipe": {
            "name": "tqs_mount_minus",
            "says": "charging warhorse hooves galloping forward with brief spirited neigh",
            "space": "room",
            "dur": 0.74,
            "layers": [
                {"sound": "horse/trot", "cut": [0.0, 0.68], "pitch": 3, "fade_out": 0.12, "gain": 0},
                {"sound": "horse/neigh", "cut": [0.0, 0.55], "pitch": 1, "at": 0.05, "lowpass": 5200, "fade_out": 0.15, "gain": -6},
            ],
        },
    },
    {
        "id": "JUDGE",
        "target_lufs": -14.0,
        "dur_range_ms": (620, 820),
        "fade_out_ms": 95,
        "recipe": {
            "name": "tqs_judge",
            "says": "judgement scroll flipped with wood gavel seal and bronze resonance",
            "space": "room",
            "dur": 0.78,
            "layers": [
                {"sound": "paper/page", "cut": [0.0, 0.25], "gain": -2},
                {"sound": "gavel/strike", "at": 0.08, "pitch": -2, "gain": 0},
                {"sound": "note/singing_bowl", "at": 0.09, "pitch": 5, "dur": 0.60, "gain": -6},
            ],
        },
    },
    {
        "id": "HERO_SKILL",
        "target_lufs": -14.0,
        "dur_range_ms": (550, 750),
        "fade_out_ms": 85,
        "recipe": {
            "name": "tqs_hero_skill",
            "says": "heroic silk sleeve sweep with two ascending guzheng koto notes and war drum accent",
            "space": "room",
            "dur": 0.70,
            "layers": [
                {"sound": "whoosh/cloth", "pitch": 1, "gain": -2},
                {"sound": "tom/high", "at": 0.03, "gain": -5},
                {"sound": "note/koto", "pitch": 7, "at": 0.04, "dur": 0.50, "gain": -2},
                {"sound": "note/koto", "pitch": 12, "at": 0.12, "dur": 0.55, "gain": 0},
            ],
        },
    },
    {
        "id": "TABLE_SKILL",
        "target_lufs": -12.0,
        "dur_range_ms": (900, 1250),
        "fade_out_ms": 130,
        "recipe": {
            "name": "tqs_table_skill",
            "says": "massive battle table war drum, wind swell, volley of bows, and dark bronze crash",
            "space": "hall",
            "dur": 1.18,
            "layers": [
                {"sound": "kick/deep", "at": 0.0, "gain": 0},
                {"sound": "whoosh/deep", "cut": [0.0, 0.85], "gain": -3},
                {"sound": "bow/shot", "at": 0.12, "events": {"count": 3, "gap": 0.09, "loose": 0.2}, "gain": -3},
                {"sound": "crash/dark", "at": 0.15, "dur": 0.95, "lowpass": 6500, "gain": -7},
            ],
        },
    },
    {
        "id": "NULLIFICATION",
        "target_lufs": -12.0,
        "dur_range_ms": (700, 850),
        "fade_out_ms": 95,
        "recipe": {
            "name": "tqs_nullification",
            "says": "sharp blade parry and crisp jade seal nullification",
            "space": "room",
            "dur": 0.80,
            "layers": [
                {"sound": "sword/swing", "pitch": 3, "gain": -2},
                {"sound": "glass/tap", "pitch": -4, "at": 0.03, "gain": 0},
                {"sound": "note/crotales", "pitch": -10, "at": 0.04, "dur": 0.65, "gain": -3},
                {"sound": "boom/short", "at": 0.04, "lowpass": 220, "gain": -4},
            ],
        },
    },
    {
        "id": "DUEL",
        "target_lufs": -12.0,
        "dur_range_ms": (780, 1050),
        "fade_out_ms": 110,
        "recipe": {
            "name": "tqs_duel",
            "says": "twin war drums and fierce steel sword clash duel",
            "space": "hall",
            "dur": 0.98,
            "layers": [
                {"sound": "tom/mid", "at": 0.0, "gain": 0},
                {"sound": "clash/sword", "at": 0.06, "gain": -1},
                {"sound": "tom/high", "at": 0.18, "gain": 0},
                {"sound": "kick/deep", "at": 0.18, "gain": -2},
                {"sound": "clash/sword", "pitch": 3, "at": 0.26, "gain": -2},
            ],
        },
    },
    {
        "id": "STEAL_DISMANTLE",
        "target_lufs": -14.0,
        "dur_range_ms": (360, 520),
        "fade_out_ms": 55,
        "recipe": {
            "name": "tqs_steal_dismantle",
            "says": "quick parchment snatch and crisp air swipe",
            "space": "dry",
            "dur": 0.45,
            "layers": [
                {"sound": "flick/paper", "cut": [0.0, 0.30], "lowpass": 6200, "gain": 0},
                {"sound": "whoosh/fast", "pitch": 4, "at": 0.03, "lowpass": 6200, "gain": -3},
                {"sound": "paper/rip", "cut": [0.0, 0.22], "at": 0.10, "lowpass": 5200, "gain": -6},
            ],
        },
    },
    {
        "id": "LIGHTNING",
        "target_lufs": -12.0,
        "dur_range_ms": (1400, 1750),
        "fade_out_ms": 160,
        "recipe": {
            "name": "tqs_lightning",
            "says": "close lightning crack followed by deep rolling thunder",
            "space": "hall",
            "dur": 1.65,
            "layers": [
                {"sound": "thunder/crack", "cut": [0.0, 1.55], "fade_out": 0.35, "gain": 0},
                {"sound": "kick/deep", "at": 0.02, "gain": -2},
                {"sound": "thunder/roll", "cut": [0.0, 1.55], "at": 0.12, "lowpass": 450, "fade_out": 0.45, "gain": -3},
            ],
        },
    },
    {
        "id": "CONTROL_SCROLL",
        "target_lufs": -14.0,
        "dur_range_ms": (750, 950),
        "fade_out_ms": 100,
        "recipe": {
            "name": "tqs_control_scroll",
            "says": "heavy tome slammed shut with low bronze bell sealing the turn",
            "space": "room",
            "dur": 0.90,
            "layers": [
                {"sound": "book/shut", "pitch": -4, "gain": 0},
                {"sound": "note/tubular_bell", "pitch": -10, "at": 0.04, "dur": 0.78, "lowpass": 2800, "gain": -3},
                {"sound": "note/singing_bowl", "pitch": -7, "at": 0.06, "dur": 0.80, "gain": -6},
            ],
        },
    },
    {
        "id": "TURN_START",
        "target_lufs": -14.0,
        "dur_range_ms": (420, 600),
        "fade_out_ms": 65,
        "recipe": {
            "name": "tqs_turn_start",
            "says": "resonant war drum beat with brief guzheng note signaling turn start",
            "space": "room",
            "dur": 0.54,
            "layers": [
                {"sound": "tom/mid", "pitch": -2, "gain": 0},
                {"sound": "kick/punch", "at": 0.01, "gain": -3},
                {"sound": "note/koto", "pitch": 7, "at": 0.04, "dur": 0.42, "gain": -6},
            ],
        },
    },
    {
        "id": "ACTION_PROMPT",
        "target_lufs": -14.0,
        "dur_range_ms": (450, 650),
        "fade_out_ms": 75,
        "recipe": {
            "name": "tqs_action_prompt",
            "says": "two clean jade chime taps with wooden click alerting response window",
            "space": "room",
            "dur": 0.58,
            "layers": [
                {"sound": "note/crotales", "pitch": -3, "at": 0.0, "dur": 0.35, "gain": -2},
                {"sound": "clave/click", "pitch": -3, "at": 0.01, "gain": -5},
                {"sound": "note/crotales", "pitch": -10, "at": 0.13, "dur": 0.45, "gain": -3},
            ],
        },
    },
    {
        "id": "DAMAGE",
        "target_lufs": -13.0,
        "dur_range_ms": (400, 600),
        "fade_out_ms": 65,
        "recipe": {
            "name": "tqs_damage",
            "says": "steel blade strike landing with heavy punch and armor clank",
            "space": "room",
            "dur": 0.52,
            "layers": [
                {"sound": "sword/cut", "cut": [0.0, 0.45], "gain": 0},
                {"sound": "hit/punch", "at": 0.02, "gain": -1},
                {"sound": "boom/short", "at": 0.02, "gain": -4},
                {"sound": "hit/metal", "at": 0.03, "cut": [0.0, 0.35], "lowpass": 4500, "gain": -6},
            ],
        },
    },
    {
        "id": "ELIMINATION",
        "target_lufs": -12.0,
        "dur_range_ms": (1400, 1750),
        "fade_out_ms": 160,
        "recipe": {
            "name": "tqs_elimination",
            "says": "deep booming war drum, heavy body fall, dark gong crash, and low funeral bell",
            "space": "hall",
            "dur": 1.68,
            "layers": [
                {"sound": "boom/wide", "dur": 1.55, "fade_out": 0.45, "gain": 0},
                {"sound": "land/heavy", "at": 0.04, "gain": -2},
                {"sound": "crash/dark", "at": 0.05, "dur": 1.45, "lowpass": 5200, "gain": -6},
                {"sound": "note/tubular_bell", "pitch": -15, "at": 0.08, "dur": 1.45, "gain": -6},
            ],
        },
    },
]


def soft_limit(y: np.ndarray, ceiling: float = PEAK_CEIL, knee: float = 0.62) -> np.ndarray:
    """Smooth soft-knee peak tamer above `knee` so brief 1ms spikes never exceed `ceiling`."""
    mag = np.abs(y)
    over = mag > knee
    if not np.any(over):
        return y
    head = ceiling - knee
    excess = (mag[over] - knee) / head
    compressed = knee + head * np.tanh(excess)
    out = y.copy()
    out[over] = np.sign(y[over]) * compressed
    return out


def polish_audio(y: np.ndarray, target_lufs: float, dur_range_ms: tuple[int, int], fade_out_ms: int) -> np.ndarray:
    """Trim leading silence (<10ms), enforce target duration window, clean fades, and clamp <= -1 dBTP."""
    if y.ndim == 1:
        y = np.stack([y, y], axis=1)
    y = y.astype(np.float64)

    mono = np.max(np.abs(y), axis=1)
    peak = float(np.max(mono))
    if peak <= 1e-9:
        raise ValueError("Rendered silent audio!")

    # 1. Trim leading silence to keep <= 4 ms before -40 dB onset
    thresh = peak * (10 ** (-40 / 20))
    above = np.nonzero(mono >= thresh)[0]
    lead_keep = int(0.004 * SR)
    start_idx = max(0, int(above[0]) - lead_keep) if len(above) else 0
    y = y[start_idx:]

    # 2. Enforce target duration window [min_ms, max_ms]
    min_samps = int(dur_range_ms[0] * SR / 1000)
    max_samps = int(dur_range_ms[1] * SR / 1000)

    # Trim trailing digital silence (< -65 dB) only down to min_samps
    mono = np.max(np.abs(y), axis=1)
    tail_thresh = peak * (10 ** (-65 / 20))
    nz_tail = np.nonzero(mono >= tail_thresh)[0]
    natural_end = int(nz_tail[-1]) + int(0.020 * SR) if len(nz_tail) else len(y)
    target_len = max(min_samps, min(max_samps, natural_end))

    if len(y) > target_len:
        y = y[:target_len]
    elif len(y) < min_samps:
        pad = np.zeros((min_samps - len(y), y.shape[1]), dtype=np.float64)
        y = np.concatenate([y, pad], axis=0)

    # 3. Micro fade-in (2 ms) & raised-cosine fade-out
    fi = min(int(0.002 * SR), len(y) // 8)
    if fi > 0:
        ramp_in = 0.5 * (1.0 - np.cos(np.pi * np.arange(fi) / fi))
        y[:fi] *= ramp_in[:, None]

    fo = min(int(fade_out_ms * SR / 1000), len(y) // 2)
    if fo > 0:
        ramp_out = 0.5 * (1.0 + np.cos(np.pi * np.arange(fo) / fo))
        y[-fo:] *= ramp_out[:, None]
    y[-1] = 0.0

    # 4. Iterative loudness leveling + transparent soft-knee peak control
    for _ in range(3):
        cur_lufs = integrated_lufs(y.astype(np.float32))
        if math.isfinite(cur_lufs) and cur_lufs > -60.0:
            diff = target_lufs - cur_lufs
            if abs(diff) < 0.15:
                break
            gain_db = max(-6.0, min(6.0, diff))
            y *= 10 ** (gain_db / 20.0)
        y = soft_limit(y, ceiling=PEAK_CEIL, knee=0.62)

    # Re-apply clean endpoints after limiting
    if fo > 0:
        y[-min(int(0.005 * SR), fo):] *= np.linspace(1.0, 0.0, min(int(0.005 * SR), fo))[:, None]
    y[-1] = 0.0

    # Strict true-peak <= -1.05 dBTP ceiling
    tp = true_peak_dbtp(y.astype(np.float32))
    if tp > -1.05:
        y *= 10 ** ((-1.05 - tp) / 20.0)

    cur_peak = float(np.max(np.abs(y)))
    if cur_peak > PEAK_CEIL:
        y *= PEAK_CEIL / cur_peak

    return y.astype(np.float32)


def main() -> None:
    COMBAT_DIR.mkdir(parents=True, exist_ok=True)
    RECIPES_DIR.mkdir(parents=True, exist_ok=True)

    rows: list[dict] = []
    failures: list[str] = []

    for spec in SPECS:
        cue_id = spec["id"]
        recipe = spec["recipe"]
        recipe_path = RECIPES_DIR / f"{cue_id}.json"
        recipe_path.write_text(json.dumps(recipe, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")

        wav_path = COMBAT_DIR / f"{cue_id}.wav"
        res = make(out=str(wav_path), recipe=recipe, lufs=spec["target_lufs"], sr=SR, bits=16)

        take = res["takes"][0]
        checks = take.get("checks", {})
        if not checks.get("ok", False):
            failures.append(f"{cue_id}: earshot check not clean -> {checks}")

        y, sr_read = sf.read(str(wav_path), dtype="float32")
        assert sr_read == SR, f"{cue_id} unexpected sr {sr_read}"

        polished = polish_audio(y, spec["target_lufs"], spec["dur_range_ms"], spec["fade_out_ms"])
        sf.write(str(wav_path), polished, SR, subtype="PCM_16")

        # Re-read from disk to audit exact saved file
        y_disk, sr_disk = sf.read(str(wav_path), dtype="float32")
        lufs_val = integrated_lufs(y_disk)
        tp_val = true_peak_dbtp(y_disk)
        mono = np.max(np.abs(y_disk), axis=1) if y_disk.ndim > 1 else np.abs(y_disk)
        env = envelope_times(np.mean(y_disk, axis=1) if y_disk.ndim > 1 else y_disk)
        bright = brightness_hz(np.mean(y_disk, axis=1) if y_disk.ndim > 1 else y_disk, sr_disk)
        pk = float(np.max(mono))
        rms_db = 20.0 * math.log10(float(np.sqrt(np.mean(y_disk.astype(np.float64) ** 2))) + 1e-12)
        thresh = pk * (10 ** (-40 / 20))
        above = np.nonzero(mono >= thresh)[0]
        lead_ms = (int(above[0]) / sr_disk) * 1000.0 if len(above) else -1.0
        dur_ms = (len(y_disk) / sr_disk) * 1000.0
        clipped = int(np.sum(np.abs(y_disk) >= 0.999))

        row = {
            "id": cue_id,
            "dur_ms": round(dur_ms, 1),
            "lead_ms": round(lead_ms, 2),
            "peak": round(pk, 4),
            "peak_dbfs": round(20.0 * math.log10(pk + 1e-12), 2),
            "true_peak_dbtp": round(float(tp_val), 2),
            "lufs": round(float(lufs_val), 2),
            "rms_dbfs": round(rms_db, 2),
            "brightness_hz": round(float(bright), 1) if bright is not None else None,
            "attack_ms": env.get("attack_ms"),
            "clipped": clipped,
            "clean": bool(checks.get("ok", False)),
            "parts": take.get("parts", []),
        }
        rows.append(row)
        print(
            f"{cue_id:16s} | {row['dur_ms']:6.1f}ms | lead {row['lead_ms']:4.2f}ms | "
            f"peak {row['peak']:.3f} ({row['peak_dbfs']:5.2f}dBFS) | lufs {str(row['lufs']):>6s} | "
            f"rms {row['rms_dbfs']:6.2f} | clean={row['clean']}"
        )

    if failures:
        raise RuntimeError("Some cues failed earshot clean check:\n" + "\n".join(failures))

    summary_path = RECIPES_DIR / "qa_report.json"
    summary_path.write_text(json.dumps(rows, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    print(f"\nALL {len(rows)}/22 COMBAT WAVS GENERATED & VERIFIED CLEAN.")


if __name__ == "__main__":
    main()
