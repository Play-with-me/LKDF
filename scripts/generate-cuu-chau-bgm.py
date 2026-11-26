#!/usr/bin/env python3
"""
Studio Original Guofeng BGM Composer, Physical-Modeling Synthesizer & BS.1770 Mastering Suite
for Cửu Châu Ẩn Kiếm (Blades of the Nine Realms).

Provenance: 100% deterministic seeded Studio Original synthesis (aiGenerated: false), combining
custom Numba-accelerated physical waveguide/modal East Asian instruments (Guqin, Guzheng, Pipa,
Xiao, Dizi, Erhu, Bianzhong, Tanggu/Taiko) with public-domain learned acoustic layers via earshot.

Outputs (48,000 Hz stereo OGG Vorbis, -20.0 LUFS ± 0.15 LU, True Peak <= -1.5 dBTP, zero-click loops):
  1. apps/desktop/src/assets/sfx/bgm-lobby.ogg        — 72 BPM, 24 bars = 80.000s = 3,840,000 samples
  2. apps/desktop/src/assets/sfx/bgm-battle.ogg       — 108 BPM, 24 bars = 53.333s = 2,560,000 samples
  3. apps/desktop/src/assets/sfx/bgm-climax-drums.ogg — 108 BPM, 24 bars = 53.333s = 2,560,000 samples
"""

from __future__ import annotations

import math
import os
import sys
from pathlib import Path
from typing import Dict, List, Optional, Sequence, Tuple

if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8")
if hasattr(sys.stderr, "reconfigure"):
    sys.stderr.reconfigure(encoding="utf-8")

import numpy as np
import soundfile as sf
from numba import njit
from scipy import signal

from earshot import features as ef
from earshot import sounds as esounds
from earshot.forge import dsp as edsp

SR = 48_000
GRID_ANCHOR_SEC = 0.014  # 14 ms anchor keeps Bar 1 Beat 1 transient away from frame[0] MDCT edge
TAIL_EXTRA_SEC = 8.5     # Extra seconds rendered past loop end and circularly wrapped into Bar 1

ROOT_DIR = Path(__file__).resolve().parent.parent
OUT_DIR = ROOT_DIR / "apps" / "desktop" / "src" / "assets" / "sfx"


# ============================================================================
# 1. Pitch, Utility & Earshot Acoustic Sample Cache
# ============================================================================

def midi_to_hz(midi: float) -> float:
    return 440.0 * (2.0 ** ((midi - 69.0) / 12.0))


def db_to_lin(db_val: float) -> float:
    return float(10.0 ** (db_val / 20.0))


_EARSHOT_CACHE: Dict[Tuple[str, int], np.ndarray] = {}


def get_earshot_mono(sound_id: str, seed: int = 0) -> np.ndarray:
    key = (sound_id, seed)
    if key not in _EARSHOT_CACHE:
        res = esounds.render(sound_id, seed=seed, peak_db=-1.0, check=False)
        arr = res[0] if isinstance(res, tuple) else res
        arr = np.asarray(arr, dtype=np.float64)
        if arr.ndim == 2:
            arr = 0.5 * (arr[:, 0] + arr[:, 1])
        _EARSHOT_CACHE[key] = arr
    return _EARSHOT_CACHE[key]


def resample_speed(x: np.ndarray, semitones: float) -> np.ndarray:
    """Tape-style pitch shift (semitones < 0 makes acoustic drums deeper & larger)."""
    if abs(semitones) < 1e-4:
        return x.copy()
    ratio = 2.0 ** (semitones / 12.0)
    out_len = max(16, int(round(len(x) / ratio)))
    idx = np.linspace(0.0, len(x) - 1, out_len)
    return np.interp(idx, np.arange(len(x), dtype=np.float64), x)


def pan_equal_power(mono: np.ndarray, pan: float) -> np.ndarray:
    """Equal-power stereo panner (-1.0 left .. +1.0 right)."""
    p = float(np.clip(pan, -1.0, 1.0))
    angle = (p + 1.0) * (math.pi / 4.0)
    gl = math.cos(angle)
    gr = math.sin(angle)
    out = np.empty((len(mono), 2), dtype=np.float64)
    out[:, 0] = mono * gl
    out[:, 1] = mono * gr
    return out


def mix_into_wrapped(buf: np.ndarray, clip: np.ndarray, start_sample: int, gain: float = 1.0) -> None:
    """Add stereo clip into circular loop buffer `buf` of shape (N, 2) modulo N."""
    if len(clip) == 0 or gain == 0.0:
        return
    n_total = buf.shape[0]
    s = start_sample % n_total
    rem = len(clip)
    src_idx = 0
    while rem > 0:
        chunk = min(rem, n_total - s)
        buf[s : s + chunk] += clip[src_idx : src_idx + chunk] * gain
        src_idx += chunk
        rem -= chunk
        s = 0


def apply_peaking_eq_stereo(
    x: np.ndarray, f0: float, gain_db: float, q: float = 0.9
) -> np.ndarray:
    """Audio EQ Cookbook peaking biquad filter applied identically to L and R."""
    a_amp = 10.0 ** (gain_db / 40.0)
    w0 = 2.0 * math.pi * f0 / SR
    alpha = math.sin(w0) / (2.0 * q)
    cos_w0 = math.cos(w0)

    b0 = 1.0 + alpha * a_amp
    b1 = -2.0 * cos_w0
    b2 = 1.0 - alpha * a_amp
    a0 = 1.0 + alpha / a_amp
    a1 = -2.0 * cos_w0
    a2 = 1.0 - alpha / a_amp

    b = np.array([b0 / a0, b1 / a0, b2 / a0], dtype=np.float64)
    a = np.array([1.0, a1 / a0, a2 / a0], dtype=np.float64)
    # Circular wrap padding eliminates filter startup transient at loop seam
    pad = min(4096, len(x) // 4)
    xp = np.vstack([x[-pad:], x])
    yp = signal.lfilter(b, a, xp, axis=0)
    return yp[pad:]


def apply_butter_circular(
    x: np.ndarray, cutoff_hz: float, btype: str = "highpass", order: int = 4
) -> np.ndarray:
    sos = signal.butter(order, cutoff_hz / (0.5 * SR), btype=btype, output="sos")
    pad = min(8192, len(x) // 4)
    xp = np.vstack([x[-pad:], x])
    yp = signal.sosfilt(sos, xp, axis=0)
    return yp[pad:]


# ============================================================================
# 2. Numba-Accelerated Physical-Modeled East Asian Instruments
# ============================================================================

@njit
def _waveguide_plucked_core(
    excite_buf: np.ndarray,
    freq_curve: np.ndarray,
    feedback_gain: float,
    damping_lp: float,
    dispersion: float,
) -> np.ndarray:
    """
    Fractional-delay Karplus-Strong / digital waveguide string with continuous pitch bend/vibrato,
    one-pole bridge lowpass damping, and allpass stiffness dispersion.
    """
    n_samples = len(freq_curve)
    max_delay = 4096
    buf = np.zeros(max_delay, dtype=np.float64)
    out = np.zeros(n_samples, dtype=np.float64)

    write_idx = 0
    lp_state = 0.0
    ap_x1 = 0.0
    ap_y1 = 0.0

    for i in range(n_samples):
        f = freq_curve[i]
        if f < 22.0:
            f = 22.0
        delay = (SR / f) - 0.5
        if delay >= max_delay - 4:
            delay = max_delay - 4.0
        if delay < 4.0:
            delay = 4.0

        read_pos = write_idx - delay
        if read_pos < 0.0:
            read_pos += max_delay
        idx0 = int(read_pos)
        frac = read_pos - idx0
        idx1 = idx0 + 1
        if idx1 >= max_delay:
            idx1 = 0

        delayed = buf[idx0] * (1.0 - frac) + buf[idx1] * frac

        # Bridge tone lowpass (silk vs steel string warmth)
        lp_state = (1.0 - damping_lp) * delayed + damping_lp * lp_state

        # Subtle string stiffness allpass
        ap_out = dispersion * lp_state + ap_x1 - dispersion * ap_y1
        ap_x1 = lp_state
        ap_y1 = ap_out

        val = excite_buf[i] + feedback_gain * ap_out
        buf[write_idx] = val
        out[i] = val

        write_idx += 1
        if write_idx >= max_delay:
            write_idx = 0

    return out


@njit
def _wind_flute_core(
    freq_curve: np.ndarray,
    amp_env: np.ndarray,
    breath_noise: np.ndarray,
    h_amps: np.ndarray,
    jet_drive: float,
    chiff_amount: float,
    dimo_buzz: float,
) -> np.ndarray:
    """
    Expressive East Asian bamboo flute (Xiao / Dizi) synthesizer with phase-continuous harmonics,
    soft jet-drive saturation, breath chiff modulation, and optional Dizi dimo membrane buzz.
    """
    n = len(freq_curve)
    out = np.zeros(n, dtype=np.float64)
    n_harm = len(h_amps)
    phases = np.zeros(n_harm, dtype=np.float64)
    two_pi = 2.0 * math.pi

    for i in range(n):
        f0 = freq_curve[i]
        env = amp_env[i]
        br = breath_noise[i]

        # Attack chiff fades into steady subtle breath turbulence
        attack_boost = math.exp(-i / (0.055 * SR))
        air_mod = 1.0 + br * (0.045 + chiff_amount * attack_boost)

        s = 0.0
        for h in range(n_harm):
            mult = float(h + 1)
            fh = f0 * mult
            if fh < 16000.0:
                phases[h] += two_pi * fh / SR
                if phases[h] > two_pi:
                    phases[h] -= two_pi
                s += h_amps[h] * math.sin(phases[h])

        # Gentle jet nonlinearity
        voiced = math.tanh(s * jet_drive) * air_mod

        # Optional Dizi bamboo reed-membrane (dimo) subtle sympathetic shimmer
        if dimo_buzz > 0.0:
            buzz = math.tanh(voiced * 2.8) - voiced
            voiced = voiced + dimo_buzz * buzz * (0.4 + 0.6 * env)

        # Blend breath air
        air_bed = br * (0.025 + 0.14 * chiff_amount * attack_boost) * env
        out[i] = (voiced * env) + air_bed

    return out


@njit
def _erhu_bowed_core(
    freq_curve: np.ndarray,
    amp_env: np.ndarray,
    rosin_noise: np.ndarray,
) -> np.ndarray:
    """
    Expressive bowed Erhu core: band-limited odd/even harmonic bow-string waveform with
    rosin micro-friction and singing upper-mid resonance.
    """
    n = len(freq_curve)
    out = np.zeros(n, dtype=np.float64)
    phase = 0.0
    two_pi = 2.0 * math.pi
    weights = np.array([1.0, 0.56, 0.36, 0.22, 0.15, 0.10, 0.06, 0.035], dtype=np.float64)

    for i in range(n):
        f0 = freq_curve[i]
        env = amp_env[i]
        phase += two_pi * f0 / SR
        if phase > two_pi:
            phase -= two_pi

        # Slight bow-stick asymmetry modulated by rosin texture
        s = 0.0
        for h in range(len(weights)):
            mult = float(h + 1)
            if f0 * mult < 13500.0:
                s += weights[h] * math.sin(mult * phase + 0.12 * mult)
        s = math.tanh(s * (1.15 + 0.35 * env))
        friction = rosin_noise[i] * (0.018 + 0.04 * math.exp(-i / (0.04 * SR))) * env
        out[i] = s * env + friction

    return out


def _apply_body_resonances(
    x: np.ndarray, modes: Sequence[Tuple[float, float, float]], lp_hz: float
) -> np.ndarray:
    """Apply parallel body formant boosts + warm acoustic lowpass."""
    y = x.copy()
    for f0, gain_db, q in modes:
        a_amp = 10.0 ** (gain_db / 40.0)
        w0 = 2.0 * math.pi * f0 / SR
        alpha = math.sin(w0) / (2.0 * q)
        cos_w0 = math.cos(w0)
        b0 = 1.0 + alpha * a_amp
        b1 = -2.0 * cos_w0
        b2 = 1.0 - alpha * a_amp
        a0 = 1.0 + alpha / a_amp
        a1 = -2.0 * cos_w0
        a2 = 1.0 - alpha / a_amp
        y = signal.lfilter([b0 / a0, b1 / a0, b2 / a0], [1.0, a1 / a0, a2 / a0], y)
    sos = signal.butter(2, lp_hz / (0.5 * SR), btype="lowpass", output="sos")
    return signal.sosfilt(sos, y)


def synth_guqin(
    midi: float,
    dur_s: float,
    rng: np.random.Generator,
    vel: float = 0.85,
    glide_semitones: float = 0.0,
    glide_dur_s: float = 0.14,
    harmonic: bool = False,
    pan: float = -0.08,
) -> np.ndarray:
    """
    Physical-modeled Guqin (7-string lacquered zither):
    - Silk-string dual coupled waveguide
    - Authentic Chuo/Zhu pitch slides & Yin/Nao left-hand vibrato
    - Optional Fan Yin (crystalline natural harmonic bell-pluck)
    - Deep Paulownia cavity formants
    """
    total_s = dur_s + (1.8 if not harmonic else 2.2)
    n = int(total_s * SR)
    t = np.arange(n, dtype=np.float64) / SR
    f_target = midi_to_hz(midi)

    if harmonic:
        # Fan Yin natural harmonic: crystalline modal bell + soft silk touch
        freqs = np.array([f_target, f_target * 2.001, f_target * 3.003], dtype=np.float64)
        decays = np.array([dur_s * 1.15, dur_s * 0.72, dur_s * 0.42], dtype=np.float64)
        amps = np.array([1.0, 0.34, 0.11], dtype=np.float64)
        ring = edsp.modal(freqs, decays, amps, total_s, rng, jitter=0.0008).astype(np.float64)
        pluck_len = int(0.012 * SR)
        touch = rng.normal(0.0, 0.15, pluck_len) * np.hanning(pluck_len)
        sos_bp = signal.butter(2, [300 / (0.5 * SR), 2600 / (0.5 * SR)], btype="band", output="sos")
        touch = signal.sosfilt(sos_bp, touch)
        mono = ring * 0.85
        mono[:pluck_len] += touch * 0.25
        env = np.ones(n, dtype=np.float64)
        fade_n = int(0.35 * SR)
        env[-fade_n:] = np.linspace(1.0, 0.0, fade_n) ** 2
        mono *= env * vel * 0.55
        return pan_equal_power(mono, pan)

    # Pitch trajectory: glide + gentle delayed Yin/Nao vibrato
    freq_curve = np.full(n, f_target, dtype=np.float64)
    if abs(glide_semitones) > 0.01:
        f_start = midi_to_hz(midi + glide_semitones)
        g_n = min(n, max(64, int(glide_dur_s * SR)))
        s_curve = 0.5 - 0.5 * np.cos(np.linspace(0.0, math.pi, g_n))
        freq_curve[:g_n] = f_start + (f_target - f_start) * s_curve

    vib_env = np.clip((t - 0.28) / 0.35, 0.0, 1.0) * np.exp(-t / (dur_s * 1.6 + 0.8))
    vib = 1.0 + 0.0042 * vib_env * np.sin(2.0 * math.pi * 5.1 * t)
    freq_curve *= vib

    # Pluck excitation: flesh + fingernail impulse with comb position beta ~ 0.17
    excite = np.zeros(n, dtype=np.float64)
    p_len = max(48, int((0.011 + 0.005 * (1.0 - vel)) * SR))
    raw_noise = rng.normal(0.0, 1.0, p_len)
    win = np.sin(np.linspace(0.0, math.pi, p_len)) ** 1.4
    sos_pl = signal.butter(2, min(3200.0, f_target * 9.5) / (0.5 * SR), btype="lowpass", output="sos")
    pluck = signal.sosfilt(sos_pl, raw_noise * win)
    comb_shift = max(3, int(round((SR / f_target) * 0.17)))
    excite[:p_len] += pluck
    if p_len + comb_shift < n:
        excite[comb_shift : comb_shift + p_len] -= 0.72 * pluck

    # Dual slightly detuned silk strings
    fb = min(0.9985, 0.9935 + 0.0032 * min(1.0, dur_s / 3.0))
    damp = np.clip(0.32 - 0.00018 * f_target, 0.14, 0.36)
    s1 = _waveguide_plucked_core(excite, freq_curve, fb, damp, 0.12)
    s2 = _waveguide_plucked_core(excite * 0.78, freq_curve * 1.0008, fb * 0.9996, damp * 1.08, 0.15)
    mono = 0.58 * s1 + 0.42 * s2

    # Lacquered wooden soundbox resonances
    mono = _apply_body_resonances(
        mono,
        modes=[(118.0, 4.2, 2.2), (242.0, 3.5, 2.6), (465.0, 2.4, 3.0), (880.0, 1.5, 2.5)],
        lp_hz=3300.0,
    )

    # Smooth release envelope
    rel_start = int(dur_s * SR)
    if rel_start < n:
        rel_t = np.linspace(0.0, 1.0, n - rel_start)
        mono[rel_start:] *= np.exp(-3.8 * rel_t) * (1.0 - rel_t)
    peak = np.max(np.abs(mono)) + 1e-9
    mono = (mono / peak) * vel * 0.48
    return pan_equal_power(mono, pan)


def synth_guzheng(
    midi: float,
    dur_s: float,
    rng: np.random.Generator,
    vel: float = 0.80,
    bend_semitones: float = 0.0,
    pan: Optional[float] = None,
    layer_harp: bool = False,
) -> np.ndarray:
    """
    Physical-modeled 21-string Guzheng zither with optional subtle left-hand string bend
    and stereo register spread.
    """
    total_s = dur_s + 1.4
    n = int(total_s * SR)
    t = np.arange(n, dtype=np.float64) / SR
    f0 = midi_to_hz(midi)

    freq_curve = np.full(n, f0, dtype=np.float64)
    if abs(bend_semitones) > 0.01:
        # Expressive post-pluck Rou Xian / An Yin press-and-return
        bend_env = np.sin(np.clip((t - 0.08) / max(0.18, dur_s * 0.55), 0.0, 1.0) * math.pi)
        freq_curve *= 2.0 ** ((bend_semitones * bend_env) / 12.0)

    excite = np.zeros(n, dtype=np.float64)
    p_len = max(32, int(0.0065 * SR))
    burst = rng.normal(0.0, 1.0, p_len) * (np.hanning(p_len) ** 0.8)
    sos_pl = signal.butter(2, min(5800.0, f0 * 13.0) / (0.5 * SR), btype="lowpass", output="sos")
    pluck = signal.sosfilt(sos_pl, burst)
    comb_shift = max(2, int(round((SR / f0) * 0.12)))
    excite[:p_len] += pluck
    if p_len + comb_shift < n:
        excite[comb_shift : comb_shift + p_len] -= 0.65 * pluck

    fb = min(0.9988, 0.9950 + 0.0022 * min(1.0, dur_s / 2.5))
    damp = np.clip(0.20 - 0.00009 * f0, 0.07, 0.22)
    s1 = _waveguide_plucked_core(excite, freq_curve, fb, damp, 0.08)
    s2 = _waveguide_plucked_core(excite * 0.6, freq_curve * 1.0005, fb * 0.9997, damp * 1.1, 0.10)
    mono = 0.65 * s1 + 0.35 * s2

    mono = _apply_body_resonances(
        mono,
        modes=[(185.0, 3.0, 2.0), (390.0, 2.8, 2.5), (1050.0, 1.8, 2.2)],
        lp_hz=5400.0,
    )

    if layer_harp:
        # Blend subtle acoustic harp air from earshot at -14 dB for organic string bloom
        harp_ref = get_earshot_mono("note/harp", seed=int(midi) % 3)
        # earshot note/harp default root is C4 (midi 60) -> pitch-match cleanly
        harp_shifted = resample_speed(harp_ref, midi - 60.0)
        use_n = min(n, len(harp_shifted))
        mono[:use_n] += harp_shifted[:use_n] * 0.14 * (np.max(np.abs(mono)) + 1e-9)

    rel_start = int(dur_s * SR)
    if rel_start < n:
        rel_t = np.linspace(0.0, 1.0, n - rel_start)
        mono[rel_start:] *= np.exp(-3.4 * rel_t) * (1.0 - rel_t)

    peak = np.max(np.abs(mono)) + 1e-9
    mono = (mono / peak) * vel * 0.40

    if pan is None:
        # Natural sitting perspective across the Guzheng bridges
        pan = float(np.clip((midi - 60.0) / 28.0, -0.38, 0.38))
    return pan_equal_power(mono, pan)


def synth_pipa(
    midi: float,
    dur_s: float,
    rng: np.random.Generator,
    vel: float = 0.82,
    damped: bool = False,
    pan: float = -0.22,
) -> np.ndarray:
    """
    Crisp plucked Pipa lute for 108 BPM tactical ostinato (woody pear soundboard,
    articulate plectrum attack, controlled midrange).
    """
    eff_dur = dur_s * (0.45 if damped else 1.0)
    total_s = eff_dur + (0.35 if damped else 0.75)
    n = int(total_s * SR)
    f0 = midi_to_hz(midi)
    freq_curve = np.full(n, f0, dtype=np.float64)

    excite = np.zeros(n, dtype=np.float64)
    p_len = max(24, int(0.0045 * SR))
    click = edsp.contact(0.005, rng, bright=0.68).astype(np.float64)
    c_len = min(n, len(click))
    excite[:c_len] += click[:c_len] * 0.85
    burst = rng.normal(0.0, 0.7, p_len) * np.hanning(p_len)
    excite[:p_len] += burst
    comb_shift = max(2, int(round((SR / f0) * 0.095)))
    if p_len + comb_shift < n:
        excite[comb_shift : comb_shift + p_len] -= 0.75 * burst

    fb = 0.986 if damped else 0.9952
    damp = 0.24 if damped else 0.14
    s1 = _waveguide_plucked_core(excite, freq_curve, fb, damp, 0.18)
    s2 = _waveguide_plucked_core(excite * 0.5, freq_curve * 1.0011, fb * 0.999, damp * 1.15, 0.20)
    mono = 0.68 * s1 + 0.32 * s2

    mono = _apply_body_resonances(
        mono,
        modes=[(285.0, 3.6, 2.8), (560.0, 2.8, 3.2), (1080.0, 1.4, 2.6)],
        lp_hz=4400.0,
    )

    rel_start = int(eff_dur * SR)
    if rel_start < n:
        rel_t = np.linspace(0.0, 1.0, n - rel_start)
        mono[rel_start:] *= np.exp(-5.0 * rel_t) * (1.0 - rel_t)

    peak = np.max(np.abs(mono)) + 1e-9
    mono = (mono / peak) * vel * 0.42
    return pan_equal_power(mono, pan)


def synth_bamboo_flute(
    notes: Sequence[Tuple[float, float, float, float]],
    rng: np.random.Generator,
    kind: str = "xiao",
    pan: float = 0.08,
) -> Tuple[int, np.ndarray]:
    """
    Render a continuous legato phrase of (start_sec, dur_sec, midi, vel) on Xiao or Dizi!
    Rendering a multi-note phrase as one breath keeps portamento & air completely organic.
    Returns (phrase_start_sample, stereo_clip).
    """
    t0 = notes[0][0]
    t_end = max(st + du for st, du, _, _ in notes) + 0.42
    n = int((t_end - t0) * SR)
    t = np.arange(n, dtype=np.float64) / SR

    freq_curve = np.zeros(n, dtype=np.float64)
    amp_env = np.zeros(n, dtype=np.float64)

    # Build smooth legato pitch & breath contour
    last_f = midi_to_hz(notes[0][2])
    freq_curve[:] = last_f

    for idx, (st, du, midi, vel) in enumerate(notes):
        i0 = max(0, int(round((st - t0) * SR)))
        i1 = min(n, int(round((st - t0 + du) * SR)))
        if i1 <= i0:
            continue
        target_f = midi_to_hz(midi)
        if idx > 0:
            glide_n = min(i1 - i0, int((0.055 if kind == "dizi" else 0.085) * SR))
            g_curve = 0.5 - 0.5 * np.cos(np.linspace(0.0, math.pi, glide_n))
            freq_curve[i0 : i0 + glide_n] = last_f + (target_f - last_f) * g_curve
            freq_curve[i0 + glide_n : i1] = target_f
            if idx == len(notes) - 1:
                freq_curve[i1:] = target_f
        else:
            # Gentle ornamental breath scoop (+25 cents settling in 60ms)
            scoop_n = min(i1 - i0, int(0.065 * SR))
            freq_curve[i0 : i0 + scoop_n] = target_f * (
                1.0 - 0.012 * np.exp(-np.linspace(0.0, 4.0, scoop_n))
            )
            freq_curve[i0 + scoop_n :] = target_f
        last_f = target_f

        # Breath envelope per note (legato overlap vs fresh tongue articulation)
        note_len = i1 - i0
        atk_n = min(note_len // 2, int((0.055 if idx > 0 else 0.11) * SR))
        rel_n = min(note_len // 2, int(0.085 * SR))
        local_env = np.ones(note_len, dtype=np.float64) * vel
        if atk_n > 0:
            local_env[:atk_n] *= 0.5 - 0.5 * np.cos(np.linspace(0.0, math.pi, atk_n))
        # Subtle expressive mid-note breath swell
        swell = 0.90 + 0.14 * np.sin(np.linspace(0.0, math.pi, note_len))
        local_env *= swell
        if idx < len(notes) - 1:
            next_i0 = int(round((notes[idx + 1][0] - t0) * SR))
            if next_i0 <= i1 + int(0.03 * SR):
                # Connected legato dip rather than full silence
                dip_n = min(note_len // 3, int(0.035 * SR))
                if dip_n > 0:
                    local_env[-dip_n:] *= np.linspace(1.0, 0.55, dip_n)
            elif rel_n > 0:
                local_env[-rel_n:] *= 0.5 + 0.5 * np.cos(np.linspace(0.0, math.pi, rel_n))
        amp_env[i0:i1] = np.maximum(amp_env[i0:i1], local_env)

        # Final phrase tail release
        if idx == len(notes) - 1 and i1 < n:
            tail_n = min(n - i1, int(0.34 * SR))
            tail_curve = vel * 0.65 * np.exp(-np.linspace(0.0, 5.2, tail_n))
            amp_env[i1 : i1 + tail_n] = np.maximum(amp_env[i1 : i1 + tail_n], tail_curve)

    # Organic vibrato blooming on sustained moments
    vib_rate = 4.7 if kind == "xiao" else 5.4
    vib_depth = 0.0068 if kind == "xiao" else 0.0058
    vib_gate = signal.sosfilt(
        signal.butter(1, 2.2 / (0.5 * SR), btype="lowpass", output="sos"),
        (amp_env > 0.35).astype(np.float64),
    )
    freq_curve *= 1.0 + vib_depth * vib_gate * np.sin(2.0 * math.pi * vib_rate * t)
    amp_env *= 1.0 + 0.055 * vib_gate * np.sin(2.0 * math.pi * vib_rate * t - 0.5)

    # Filtered breath noise
    raw_air = rng.normal(0.0, 1.0, n)
    air_band = [420 / (0.5 * SR), 2900 / (0.5 * SR)] if kind == "xiao" else [600 / (0.5 * SR), 3800 / (0.5 * SR)]
    breath_noise = signal.sosfilt(signal.butter(2, air_band, btype="band", output="sos"), raw_air)

    if kind == "xiao":
        h_amps = np.array([1.0, 0.34, 0.24, 0.09, 0.04, 0.015], dtype=np.float64)
        mono = _wind_flute_core(freq_curve, amp_env, breath_noise, h_amps, 1.12, 0.42, 0.0)
        mono = _apply_body_resonances(mono, [(340.0, 2.2, 1.8), (780.0, 1.6, 2.0)], lp_hz=3100.0)
        scale = 0.34
    else:
        h_amps = np.array([1.0, 0.52, 0.31, 0.16, 0.08, 0.04], dtype=np.float64)
        mono = _wind_flute_core(freq_curve, amp_env, breath_noise, h_amps, 1.24, 0.28, 0.075)
        mono = _apply_body_resonances(mono, [(520.0, 2.0, 2.0), (1100.0, 1.5, 2.2)], lp_hz=4100.0)
        scale = 0.31

    peak = np.max(np.abs(mono)) + 1e-9
    mono = (mono / peak) * scale * max(v for _, _, _, v in notes)
    start_sample = int(round(t0 * SR))
    return start_sample, pan_equal_power(mono, pan)


def synth_erhu_phrase(
    notes: Sequence[Tuple[float, float, float, float]],
    rng: np.random.Generator,
    pan: float = -0.18,
) -> Tuple[int, np.ndarray]:
    """Expressive bowed Erhu legato phrase with Hua Yin portamento & warm hexagonal body."""
    t0 = notes[0][0]
    t_end = max(st + du for st, du, _, _ in notes) + 0.38
    n = int((t_end - t0) * SR)
    t = np.arange(n, dtype=np.float64) / SR

    freq_curve = np.zeros(n, dtype=np.float64)
    amp_env = np.zeros(n, dtype=np.float64)
    last_f = midi_to_hz(notes[0][2])
    freq_curve[:] = last_f

    for idx, (st, du, midi, vel) in enumerate(notes):
        i0 = max(0, int(round((st - t0) * SR)))
        i1 = min(n, int(round((st - t0 + du) * SR)))
        if i1 <= i0:
            continue
        target_f = midi_to_hz(midi)
        if idx > 0:
            glide_n = min(i1 - i0, int(0.095 * SR))
            g_curve = 0.5 - 0.5 * np.cos(np.linspace(0.0, math.pi, glide_n))
            freq_curve[i0 : i0 + glide_n] = last_f + (target_f - last_f) * g_curve
            freq_curve[i0 + glide_n :] = target_f
        else:
            freq_curve[i0:] = target_f
        last_f = target_f

        note_len = i1 - i0
        atk_n = min(note_len // 2, int((0.075 if idx > 0 else 0.13) * SR))
        local_env = np.ones(note_len, dtype=np.float64) * vel
        if atk_n > 0:
            local_env[:atk_n] *= 0.5 - 0.5 * np.cos(np.linspace(0.0, math.pi, atk_n))
        local_env *= 0.88 + 0.16 * np.sin(np.linspace(0.0, math.pi, note_len))
        amp_env[i0:i1] = np.maximum(amp_env[i0:i1], local_env)
        if idx == len(notes) - 1 and i1 < n:
            tail_n = min(n - i1, int(0.30 * SR))
            amp_env[i1 : i1 + tail_n] = np.maximum(
                amp_env[i1 : i1 + tail_n],
                vel * 0.6 * np.exp(-np.linspace(0.0, 5.5, tail_n)),
            )

    vib_gate = signal.sosfilt(
        signal.butter(1, 2.0 / (0.5 * SR), btype="lowpass", output="sos"),
        (amp_env > 0.30).astype(np.float64),
    )
    freq_curve *= 1.0 + 0.0075 * vib_gate * np.sin(2.0 * math.pi * 5.3 * t)
    amp_env *= 1.0 + 0.06 * vib_gate * np.sin(2.0 * math.pi * 5.3 * t - 0.8)

    rosin = signal.sosfilt(
        signal.butter(2, [900 / (0.5 * SR), 4200 / (0.5 * SR)], btype="band", output="sos"),
        rng.normal(0.0, 1.0, n),
    )
    mono = _erhu_bowed_core(freq_curve, amp_env, rosin)
    mono = _apply_body_resonances(
        mono,
        modes=[(410.0, 4.5, 2.6), (890.0, 3.8, 3.0), (1520.0, 1.8, 2.4)],
        lp_hz=3500.0,
    )
    peak = np.max(np.abs(mono)) + 1e-9
    mono = (mono / peak) * 0.29 * max(v for _, _, _, v in notes)
    return int(round(t0 * SR)), pan_equal_power(mono, pan)


def synth_bianzhong_bell(
    midi: float, dur_s: float, rng: np.random.Generator, vel: float = 0.65, pan: float = 0.25
) -> np.ndarray:
    """Ancient Chinese two-tone elliptic bronze bell (Bianzhong) with wooden mallet strike."""
    f0 = midi_to_hz(midi)
    freqs = np.array([f0, f0 * 1.003, f0 * 1.996, f0 * 2.385, f0 * 2.992, f0 * 3.84], dtype=np.float64)
    decays = np.array([dur_s, dur_s * 0.92, dur_s * 0.58, dur_s * 0.45, dur_s * 0.32, dur_s * 0.20], dtype=np.float64)
    amps = np.array([1.0, 0.55, 0.38, 0.22, 0.14, 0.07], dtype=np.float64)
    modal_tone = edsp.modal(freqs, decays, amps, dur_s + 1.2, rng, jitter=0.001).astype(np.float64)
    wood_hit = get_earshot_mono("tock/wood", seed=0)
    use_w = min(len(modal_tone), len(wood_hit))
    modal_tone[:use_w] += wood_hit[:use_w] * 0.18
    sos_lp = signal.butter(2, 4200.0 / (0.5 * SR), btype="lowpass", output="sos")
    mono = signal.sosfilt(sos_lp, modal_tone)
    peak = np.max(np.abs(mono)) + 1e-9
    mono = (mono / peak) * vel * 0.34
    return pan_equal_power(mono, pan)


def synth_tanggu_drum(
    f0_hz: float,
    rng: np.random.Generator,
    vel: float = 0.85,
    pan: float = 0.0,
    style: str = "deep",
) -> np.ndarray:
    """
    Hybrid Tanggu / Taiko war-drum: coupled circular membrane modal synthesis (58–105 Hz punch)
    layered with pitched public-domain acoustic drums from earshot (kick/deep, tom/floor, tom/mid).
    """
    dur_s = 1.35 if style == "deep" else 0.82
    n = int(dur_s * SR)
    t = np.arange(n, dtype=np.float64) / SR

    # Tension pitch-drop punch on heavy drumhead strike (58–110 Hz body)
    pitch_env = f0_hz * (1.0 + (0.36 * vel) * np.exp(-t / 0.042))
    phase = 2.0 * math.pi * np.cumsum(pitch_env) / SR
    sub_body = np.sin(phase) * np.exp(-t / (0.34 if style == "deep" else 0.22))
    barrel_mode = 0.42 * np.sin(1.593 * phase) * np.exp(-t / 0.16)
    skin_mode = 0.22 * np.sin(2.135 * phase) * np.exp(-t / 0.09)
    synth_mem = (sub_body + barrel_mode + skin_mode) * (1.0 - np.exp(-t / 0.0025))

    # Layer real learned acoustic drum skin & room air from earshot
    if style == "deep":
        ear_kick = resample_speed(get_earshot_mono("kick/deep", seed=int(vel * 10) % 3), -2.5)
        ear_tom = resample_speed(get_earshot_mono("tom/floor", seed=int(f0_hz) % 3), -3.0)
        acoustic = np.zeros(n, dtype=np.float64)
        uk = min(n, len(ear_kick))
        ut = min(n, len(ear_tom))
        acoustic[:uk] += 0.55 * ear_kick[:uk]
        acoustic[:ut] += 0.45 * ear_tom[:ut]
    else:
        ear_tom = resample_speed(
            get_earshot_mono("tom/mid" if f0_hz > 84.0 else "tom/floor", seed=int(f0_hz) % 3),
            -1.5 if f0_hz > 84.0 else -1.0,
        )
        acoustic = np.zeros(n, dtype=np.float64)
        ut = min(n, len(ear_tom))
        acoustic[:ut] += ear_tom[:ut]

    # Clean subsonic highpass at 34 Hz + warm lowpass to prevent harsh slap
    mono = 0.62 * synth_mem + 0.52 * acoustic
    sos_hp = signal.butter(3, 35.0 / (0.5 * SR), btype="highpass", output="sos")
    sos_lp = signal.butter(2, (750.0 if style == "deep" else 1650.0) / (0.5 * SR), btype="lowpass", output="sos")
    mono = signal.sosfilt(sos_lp, signal.sosfilt(sos_hp, mono))

    peak = np.max(np.abs(mono)) + 1e-9
    mono = (mono / peak) * vel * 0.52
    return pan_equal_power(mono, pan)


def synth_wood_rim_clack(
    rng: np.random.Generator, vel: float = 0.70, pan: float = 0.2, kind: str = "rim"
) -> np.ndarray:
    """Tight wooden Bangzi / Taiko rim syncopation using earshot acoustic wood & rim recordings."""
    if kind == "rim":
        base = resample_speed(get_earshot_mono("rim/click", seed=int(vel * 17) % 3), -1.5)
        wood = resample_speed(get_earshot_mono("tock/wood", seed=int(vel * 13) % 3), -2.0)
        n = max(len(base), len(wood))
        mono = np.zeros(n, dtype=np.float64)
        mono[: len(base)] += 0.65 * base
        mono[: len(wood)] += 0.45 * wood
    elif kind == "brush":
        mono = resample_speed(get_earshot_mono("snare/brush", seed=int(vel * 11) % 3), -2.0)
    else:
        mono = resample_speed(get_earshot_mono("hit/wood", seed=int(vel * 7) % 3), -1.0)

    sos_bp = signal.butter(2, [180.0 / (0.5 * SR), 3600.0 / (0.5 * SR)], btype="band", output="sos")
    mono = signal.sosfilt(sos_bp, mono)
    peak = np.max(np.abs(mono)) + 1e-9
    mono = (mono / peak) * vel * 0.30
    return pan_equal_power(mono, pan)


def synth_bronze_swell(
    dur_s: float, midi_root: float, rng: np.random.Generator, vel: float = 0.65
) -> np.ndarray:
    """
    8-bar boundary bronze cymbal + Bianzhong swell peaking exactly at `dur_s` (the downbeat!)
    and shimmering smoothly after the downbeat.
    """
    rise_n = int(dur_s * SR)
    tail_s = 2.6
    total_n = rise_n + int(tail_s * SR)
    out = np.zeros((total_n, 2), dtype=np.float64)

    dark_crash = resample_speed(get_earshot_mono("crash/dark", seed=0), -3.5)
    # Reversed cymbal swell leading into the bar boundary
    rev = dark_crash[::-1]
    use_r = min(rise_n, len(rev))
    swell_env = np.linspace(0.0, 1.0, use_r) ** 2.4
    swell_mono = rev[-use_r:] * swell_env
    sos_lp = signal.butter(2, 3400.0 / (0.5 * SR), btype="lowpass", output="sos")
    swell_mono = signal.sosfilt(sos_lp, swell_mono)
    peak_sw = np.max(np.abs(swell_mono)) + 1e-9
    swell_mono = (swell_mono / peak_sw) * vel * 0.24
    out[rise_n - use_r : rise_n, 0] += swell_mono * 0.92
    out[rise_n - use_r : rise_n, 1] += swell_mono * 1.08

    # Downbeat bronze Bianzhong fifth shimmer + soft dark cymbal bloom
    bell_low = synth_bianzhong_bell(midi_root, 2.2, rng, vel=vel * 0.72, pan=-0.26)
    bell_fifth = synth_bianzhong_bell(midi_root + 7.0, 1.9, rng, vel=vel * 0.56, pan=0.28)
    for b_clip in (bell_low, bell_fifth):
        ub = min(total_n - rise_n, len(b_clip))
        out[rise_n : rise_n + ub] += b_clip[:ub]

    fwd_use = min(total_n - rise_n, len(dark_crash))
    fwd_cym = signal.sosfilt(sos_lp, dark_crash[:fwd_use])
    fwd_cym = (fwd_cym / (np.max(np.abs(fwd_cym)) + 1e-9)) * vel * 0.16 * np.exp(
        -np.linspace(0.0, 3.2, fwd_use)
    )
    out[rise_n : rise_n + fwd_use, 0] += fwd_cym * 1.05
    out[rise_n : rise_n + fwd_use, 1] += fwd_cym * 0.95
    return out


# ============================================================================
# 3. Circular FFT Acoustic Pavilion / Courtyard Reverb (Zero Seam Cut!)
# ============================================================================

def apply_circular_reverb(
    dry: np.ndarray,
    rng: np.random.Generator,
    rt60: float = 2.1,
    wet: float = 0.22,
    damp_hz: float = 2700.0,
    pre_delay_ms: float = 22.0,
) -> np.ndarray:
    """
    True periodic circular FFT stereo reverb: late reflections from Bar 24 wrap naturally
    into Bar 1 with mathematical zero loop discontinuity!
    """
    n_total = dry.shape[0]
    ir_len = min(n_total // 2, int((rt60 * 1.35) * SR))
    t = np.arange(ir_len, dtype=np.float64) / SR
    pre_n = int(pre_delay_ms * 0.001 * SR)

    ir = np.zeros((ir_len, 2), dtype=np.float64)
    # Early wooden pavilion / stone courtyard reflections (decorrelated L/R taps)
    early_taps_ms = [
        (17.0, 0.34, -0.45),
        (26.5, 0.28, 0.52),
        (38.0, 0.22, -0.30),
        (51.5, 0.19, 0.38),
        (67.0, 0.15, -0.55),
        (83.0, 0.12, 0.42),
    ]
    for ms, amp, pan in early_taps_ms:
        idx = int(ms * 0.001 * SR)
        if idx < ir_len:
            angle = (pan + 1.0) * (math.pi / 4.0)
            ir[idx, 0] += amp * math.cos(angle)
            ir[idx, 1] += amp * math.sin(angle)

    # Smooth exponential diffused tail
    decay = np.exp(-6.9078 * t / rt60)
    build = 1.0 - np.exp(-t / 0.035)
    for ch in range(2):
        late = rng.normal(0.0, 1.0, ir_len) * decay * build * 0.055
        if pre_n > 0:
            late = np.concatenate([np.zeros(pre_n), late[:-pre_n]])
        sos_lp = signal.butter(2, damp_hz / (0.5 * SR), btype="lowpass", output="sos")
        sos_hp = signal.butter(2, 115.0 / (0.5 * SR), btype="highpass", output="sos")
        ir[:, ch] += signal.sosfilt(sos_hp, signal.sosfilt(sos_lp, late))

    # Normalize IR energy
    ir_rms = math.sqrt(float(np.mean(ir ** 2))) + 1e-12
    ir /= ir_rms * 28.0

    # Exact circular convolution via FFT of length N
    out = np.empty_like(dry)
    for ch in range(2):
        ir_pad = np.zeros(n_total, dtype=np.float64)
        ir_pad[:ir_len] = ir[:, ch]
        wet_sig = np.fft.irfft(np.fft.rfft(dry[:, ch]) * np.fft.rfft(ir_pad), n=n_total)
        out[:, ch] = dry[:, ch] * (1.0 - 0.25 * wet) + wet_sig * wet
    return out


# ============================================================================
# 4. Track 1: bgm-lobby.ogg — "Thanh Vân Night Pavilion" (72 BPM, 24 Bars, 80.0s)
# ============================================================================

def compose_bgm_lobby() -> np.ndarray:
    """
    72 BPM, 24 bars of 4/4 = 96 beats = 80.000s = EXACT 3,840,000 stereo samples at 48,000 Hz.
    Dynamic 3-chapter Guofeng night-pavilion score (LRA >= 4.0 LU, targeting ~6.0 LU):
      - Bars 1–8  : Contemplative solo Guqin (slides & Fan Yin harmonics) + soft mountain night air
      - Bars 9–16 : Expressive breathy Xiao flute melody + stereo Guzheng arpeggios + Guqin bass
      - Bars 17–24: Emotional pavilion peak (Bars 17–19) -> hushed decrescendo back into Bar 1
    """
    rng = np.random.default_rng(20261126)
    bpm = 72.0
    beat_s = 60.0 / bpm  # 0.8333333333... s (40,000 samples exact!)
    n_samples = 3_840_000
    buf = np.zeros((n_samples, 2), dtype=np.float64)

    def bt(bar_1idx: int, beat_1idx: float, human_ms: float = 0.0) -> int:
        total_beats = (bar_1idx - 1) * 4.0 + (beat_1idx - 1.0)
        sec = GRID_ANCHOR_SEC + total_beats * beat_s + (human_ms * 0.001)
        return int(round(sec * SR))

    def bsec(bar_1idx: int, beat_1idx: float, human_ms: float = 0.0) -> float:
        total_beats = (bar_1idx - 1) * 4.0 + (beat_1idx - 1.0)
        return GRID_ANCHOR_SEC + total_beats * beat_s + (human_ms * 0.001)

    # --- A. Subtle Mountain Night-Breeze Bed (earshot learned wind/mountain + wind/trees) ---
    w_mtn = get_earshot_mono("wind/mountain", seed=0)
    w_tree = get_earshot_mono("wind/trees", seed=1)

    def tile_circular_bed(src: np.ndarray, target_n: int, xfade_s: float = 2.0) -> np.ndarray:
        xf = int(xfade_s * SR)
        step = len(src) - xf
        bed = np.zeros(target_n + xf, dtype=np.float64)
        pos = 0
        fade_in = 0.5 - 0.5 * np.cos(np.linspace(0.0, math.pi, xf))
        fade_out = 1.0 - fade_in
        while pos < target_n + xf:
            seg = src.copy()
            seg[:xf] *= fade_in
            seg[-xf:] *= fade_out
            end_p = min(target_n + xf, pos + len(seg))
            bed[pos:end_p] += seg[: end_p - pos]
            pos += step
        out_b = bed[:target_n].copy()
        out_b[:xf] = out_b[:xf] * fade_in + bed[target_n : target_n + xf] * fade_out
        return out_b

    breeze_l = tile_circular_bed(w_mtn, n_samples)
    breeze_r = tile_circular_bed(w_tree, n_samples)
    breeze = np.column_stack([0.75 * breeze_l + 0.25 * breeze_r, 0.25 * breeze_l + 0.75 * breeze_r])
    breeze = apply_butter_circular(breeze, 160.0, "highpass", order=2)
    breeze = apply_butter_circular(breeze, 1950.0, "lowpass", order=2)
    t_norm = np.arange(n_samples, dtype=np.float64) / n_samples
    breeze_swell = 0.55 + 0.45 * np.sin(2.0 * math.pi * t_norm - 0.6) ** 2
    breeze_rms = math.sqrt(float(np.mean(breeze ** 2))) + 1e-12
    buf += (breeze / breeze_rms) * 0.0024 * breeze_swell[:, None]

    # --- B. Section 1 (Bars 1–8): Sparse Intimate Guqin & Distant Temple Bell ---
    # Deliberately hushed & spacious (-24 to -22 LUFS short-term) for LRA >= 5.5 LU!
    sec1_guqin = [
        # (bar, beat, midi, dur_beats, vel, glide_semi, harmonic, pan)
        (1, 1.0, 38, 3.5, 0.44, 0.0, False, -0.14),   # D2 deep open silk string
        (1, 2.0, 50, 2.5, 0.38, -2.0, False, -0.06),  # C3->D3 Chuo upward slide
        (1, 3.5, 57, 2.5, 0.35, 0.0, False, 0.05),    # A3
        (2, 1.0, 62, 2.8, 0.40, -2.0, False, 0.08),   # C4->D4 slide
        (2, 3.0, 69, 3.0, 0.34, 0.0, True, -0.12),    # A4 Fan Yin harmonic + breath space!
        (3, 1.0, 43, 3.5, 0.42, 0.0, False, -0.15),   # G2 warm sub-wood
        (3, 2.0, 55, 2.2, 0.36, -2.0, False, -0.04),  # F3->G3 slide
        (3, 3.5, 60, 2.2, 0.35, 0.0, False, 0.06),    # C4
        (4, 1.0, 57, 2.8, 0.39, 2.0, False, -0.08),   # B3->A3 sighing slide
        (4, 3.0, 74, 3.2, 0.33, 0.0, True, 0.14),     # D5 crystalline harmonic
        (5, 1.0, 41, 3.5, 0.43, 0.0, False, -0.14),   # F2 warm Lydian/Dorian lift
        (5, 2.0, 53, 2.2, 0.37, 0.0, False, -0.05),   # F3
        (5, 3.0, 57, 2.0, 0.36, -2.0, False, 0.05),   # G3->A3
        (6, 1.0, 60, 2.4, 0.40, -3.0, False, 0.08),   # A3->C4 expressive slide
        (6, 2.5, 62, 2.2, 0.36, 0.0, False, -0.04),   # D4
        (6, 4.0, 72, 2.5, 0.31, 0.0, True, 0.16),     # C5 harmonic
        (7, 1.0, 45, 3.5, 0.43, 0.0, False, -0.14),   # A2
        (7, 2.0, 55, 2.0, 0.36, 0.0, False, -0.05),   # G3
        (7, 3.5, 57, 2.5, 0.38, -2.0, False, 0.06),   # F3->A3
        (8, 1.0, 50, 3.2, 0.42, 2.0, False, -0.10),   # E3->D3 resolution
        (8, 3.0, 69, 2.8, 0.35, 0.0, True, -0.16),    # A4 harmonic leading into Xiao entry!
    ]
    for bar, beat, midi, dur_b, vel, gl, harm, pan in sec1_guqin:
        jit = float(rng.uniform(-7.0, 7.0))
        clip = synth_guqin(midi, dur_b * beat_s, rng, vel=vel, glide_semitones=gl, harmonic=harm, pan=pan)
        mix_into_wrapped(buf, clip, bt(bar, beat, jit))

    # Distant bronze Bianzhong shimmer in night mist (Bars 1 & 5)
    mix_into_wrapped(buf, synth_bianzhong_bell(62, 4.2, rng, vel=0.22, pan=-0.34), bt(1, 1.0, 4.0))
    mix_into_wrapped(buf, synth_bianzhong_bell(65, 4.0, rng, vel=0.20, pan=0.34), bt(5, 1.0, 5.0))

    # Delicate sparse Guzheng droplets answering Guqin in Bars 5–8
    for bar, beat, midi, vel in [(5, 4.0, 69, 0.28), (6, 3.5, 67, 0.26), (7, 4.0, 64, 0.27), (8, 2.0, 62, 0.28)]:
        gz = synth_guzheng(midi, 2.2 * beat_s, rng, vel=vel, layer_harp=True)
        mix_into_wrapped(buf, gz, bt(bar, beat, float(rng.uniform(-5.0, 6.0))))

    # --- C. Section 2 (Bars 9–16): Expressive Xiao Bamboo Flute + Stereo Guzheng + Guqin Bass ---
    # Fuller dynamic bloom (~6–8 dB louder than Bars 1–8 -> natural LRA ~ 6.2 LU!)
    sec2_chords = [
        (9, 38, [50, 57, 62, 65, 69, 65]),    # Dm9
        (10, 36, [48, 55, 60, 64, 67, 64]),   # C6
        (11, 43, [46, 53, 58, 62, 67, 62]),   # Gm7 / Bb6
        (12, 45, [45, 52, 57, 60, 64, 60]),   # Am7
        (13, 38, [50, 57, 62, 65, 69, 72]),   # Dm(add11)
        (14, 41, [48, 53, 57, 60, 65, 69]),   # F6
        (15, 43, [50, 55, 58, 62, 67, 65]),   # Gm7
        (16, 45, [45, 52, 57, 62, 64, 57]),   # Asus4 -> A5 modal cadence
    ]
    arp_beats = [1.0, 1.5, 2.0, 2.5, 3.0, 4.0]
    for bar, bass_midi, arp_notes in sec2_chords:
        # Warm Guqin bass anchor
        gq_bass = synth_guqin(bass_midi, 3.6 * beat_s, rng, vel=0.72, pan=-0.12)
        mix_into_wrapped(buf, gq_bass, bt(bar, 1.0, float(rng.uniform(-4.0, 4.0))))
        if bar in (10, 12, 14, 16):
            gq_fifth = synth_guqin(bass_midi + 7, 1.8 * beat_s, rng, vel=0.54, glide_semitones=-2.0, pan=-0.05)
            mix_into_wrapped(buf, gq_fifth, bt(bar, 3.0, float(rng.uniform(-4.0, 4.0))))
        # Stereo Guzheng flowing arpeggio
        for idx, (ab, m_note) in enumerate(zip(arp_beats, arp_notes)):
            accent = 0.68 if idx in (0, 4) else 0.52
            bend = 1.0 if (idx == 4 and bar in (11, 15)) else 0.0
            gz = synth_guzheng(
                m_note,
                2.1 * beat_s,
                rng,
                vel=accent,
                bend_semitones=bend,
                layer_harp=(idx == 0),
            )
            mix_into_wrapped(buf, gz, bt(bar, ab, float(rng.uniform(-6.0, 6.0))))

    # Soft distant pavilion heartbeat drum on Bar 9 & Bar 13
    for d_bar in (9, 13):
        hb = synth_tanggu_drum(58.0, rng, vel=0.38, pan=0.0, style="deep")
        hb = apply_butter_circular(hb, 260.0, "lowpass", order=2)
        mix_into_wrapped(buf, hb, bt(d_bar, 1.0, 2.0))

    # Expressive Xiao melodies (Bars 9–16 in 4 lyrical breathed phrases)
    xiao_phrases_sec2 = [
        # Phrase 1 (Bars 9–10): soaring night-pavilion theme
        [
            (bsec(9, 1.0), 1.45 * beat_s, 69, 0.84),
            (bsec(9, 2.5), 0.50 * beat_s, 72, 0.78),
            (bsec(9, 3.0), 1.95 * beat_s, 74, 0.92),
            (bsec(10, 1.0), 0.95 * beat_s, 77, 0.88),
            (bsec(10, 2.0), 0.50 * beat_s, 76, 0.80),
            (bsec(10, 2.5), 0.95 * beat_s, 74, 0.84),
            (bsec(10, 3.5), 1.25 * beat_s, 72, 0.76),
        ],
        # Phrase 2 (Bars 11–12): tender Dorian descent & breath pause
        [
            (bsec(11, 1.0), 1.45 * beat_s, 74, 0.86),
            (bsec(11, 2.5), 0.50 * beat_s, 72, 0.76),
            (bsec(11, 3.0), 1.45 * beat_s, 69, 0.84),
            (bsec(12, 0.5), 0.50 * beat_s, 67, 0.74),
            (bsec(12, 1.0), 2.40 * beat_s, 69, 0.88),
        ],
        # Phrase 3 (Bars 13–14): upper-octave Wuxia yearning
        [
            (bsec(13, 1.0), 0.95 * beat_s, 74, 0.86),
            (bsec(13, 2.0), 0.95 * beat_s, 77, 0.90),
            (bsec(13, 3.0), 1.45 * beat_s, 79, 0.95),
            (bsec(14, 0.5), 0.50 * beat_s, 81, 0.92),
            (bsec(14, 1.0), 1.45 * beat_s, 77, 0.88),
            (bsec(14, 2.5), 0.50 * beat_s, 74, 0.80),
            (bsec(14, 3.0), 1.65 * beat_s, 72, 0.82),
        ],
        # Phrase 4 (Bars 15–16): modal poise into climax lift
        [
            (bsec(15, 1.0), 0.95 * beat_s, 70, 0.82),
            (bsec(15, 2.0), 0.95 * beat_s, 72, 0.84),
            (bsec(15, 3.0), 0.95 * beat_s, 74, 0.88),
            (bsec(15, 4.0), 0.95 * beat_s, 77, 0.90),
            (bsec(16, 1.0), 1.45 * beat_s, 76, 0.88),
            (bsec(16, 2.5), 0.50 * beat_s, 74, 0.80),
            (bsec(16, 3.0), 1.65 * beat_s, 69, 0.84),
        ],
    ]
    for ph in xiao_phrases_sec2:
        st_idx, clip = synth_bamboo_flute(ph, rng, kind="xiao", pan=0.10)
        mix_into_wrapped(buf, clip, st_idx)

    # --- D. Section 3 (Bars 17–24): Emotional Peak (17–19) -> Hushed Mist Resolution (21–24) ---
    # Bars 17–20: Warm glowing peak
    peak_chords = [
        (17, 41, [53, 57, 60, 65, 69, 72, 77, 72], 0.84),  # Fmaj9 glow
        (18, 43, [50, 55, 58, 62, 67, 70, 74, 67], 0.82),  # Gm9
        (19, 38, [50, 57, 62, 65, 69, 74, 77, 69], 0.80),  # Dm11
        (20, 36, [48, 55, 60, 64, 67, 72, 67, 60], 0.66),  # C6 gentle taper
    ]
    mix_into_wrapped(buf, synth_bianzhong_bell(65, 4.5, rng, vel=0.42, pan=-0.28), bt(17, 1.0, 2.0))
    mix_into_wrapped(buf, synth_bianzhong_bell(72, 4.0, rng, vel=0.35, pan=0.30), bt(17, 1.08, 4.0))
    hb17 = apply_butter_circular(synth_tanggu_drum(56.0, rng, vel=0.46, pan=0.0, style="deep"), 260.0, "lowpass", 2)
    mix_into_wrapped(buf, hb17, bt(17, 1.0, 2.0))

    for bar, bass_m, eight_arp, v_scale in peak_chords:
        mix_into_wrapped(buf, synth_guqin(bass_m, 3.8 * beat_s, rng, vel=v_scale, pan=-0.14), bt(bar, 1.0))
        for i_e, m_n in enumerate(eight_arp):
            b_pos = 1.0 + 0.5 * i_e
            gz = synth_guzheng(m_n, 1.9 * beat_s, rng, vel=v_scale * (0.82 if i_e % 2 == 0 else 0.64), layer_harp=(i_e == 0))
            mix_into_wrapped(buf, gz, bt(bar, b_pos, float(rng.uniform(-5.0, 5.0))))

    xiao_peak_and_fade = [
        # Peak phrase (Bars 17–20)
        [
            (bsec(17, 1.0), 1.45 * beat_s, 77, 0.96),
            (bsec(17, 2.5), 0.50 * beat_s, 79, 0.92),
            (bsec(17, 3.0), 1.95 * beat_s, 81, 0.98),
            (bsec(18, 1.0), 1.45 * beat_s, 79, 0.94),
            (bsec(18, 2.5), 0.50 * beat_s, 77, 0.86),
            (bsec(18, 3.0), 1.95 * beat_s, 74, 0.90),
            (bsec(19, 1.0), 1.45 * beat_s, 77, 0.88),
            (bsec(19, 2.5), 0.50 * beat_s, 74, 0.80),
            (bsec(19, 3.0), 1.95 * beat_s, 69, 0.84),
            (bsec(20, 1.0), 1.45 * beat_s, 72, 0.74),
            (bsec(20, 2.5), 2.00 * beat_s, 67, 0.66),
        ],
        # Hushed farewell phrase (Bars 21–22, fading into night mist)
        [
            (bsec(21, 1.0), 1.45 * beat_s, 69, 0.52),
            (bsec(21, 2.5), 1.45 * beat_s, 67, 0.44),
            (bsec(22, 1.0), 1.45 * beat_s, 65, 0.38),
            (bsec(22, 2.5), 2.10 * beat_s, 62, 0.32),
        ],
    ]
    for ph in xiao_peak_and_fade:
        st_idx, clip = synth_bamboo_flute(ph, rng, kind="xiao", pan=0.10)
        mix_into_wrapped(buf, clip, st_idx)

    # Bars 21–24: Sparse Guqin & Guzheng twilight droplets seamlessly bridging back into Bar 1
    fade_plucks = [
        (21, 1.0, 38, 3.8, 0.48, 0.0, False, -0.14),
        (21, 3.0, 57, 2.5, 0.36, -2.0, False, 0.04),
        (22, 1.0, 43, 3.5, 0.42, 0.0, False, -0.14),
        (22, 3.5, 62, 2.5, 0.32, 0.0, True, 0.12),
        (23, 1.0, 45, 3.5, 0.38, 0.0, False, -0.12),
        (23, 2.5, 53, 2.4, 0.32, 2.0, False, -0.05),  # G3->F3 gentle sigh
        (23, 4.0, 69, 2.8, 0.28, 0.0, True, -0.15),
        (24, 1.0, 50, 3.0, 0.36, -2.0, False, -0.08), # C3->D3 quiet poise
        (24, 2.5, 62, 2.2, 0.26, 0.0, True, 0.10),    # D4 harmonic decaying peacefully into Bar 1!
    ]
    for bar, beat, midi, dur_b, vel, gl, harm, pan in fade_plucks:
        clip = synth_guqin(midi, dur_b * beat_s, rng, vel=vel, glide_semitones=gl, harmonic=harm, pan=pan)
        mix_into_wrapped(buf, clip, bt(bar, beat, float(rng.uniform(-6.0, 6.0))))

    for bar, beat, midi, vel in [(21, 2.0, 65, 0.34), (22, 2.0, 60, 0.28), (23, 3.0, 57, 0.24)]:
        mix_into_wrapped(buf, synth_guzheng(midi, 2.4 * beat_s, rng, vel=vel, layer_harp=True), bt(bar, beat))

    # Spacious wooden night-pavilion circular reverb + warm tonal shaping
    mixed = apply_circular_reverb(buf, rng, rt60=2.55, wet=0.26, damp_hz=2600.0, pre_delay_ms=26.0)
    mixed = apply_butter_circular(mixed, 30.0, "highpass", order=3)
    mixed = apply_peaking_eq_stereo(mixed, 210.0, 1.2, q=0.8)    # Warm Guqin chest
    mixed = apply_peaking_eq_stereo(mixed, 2350.0, -1.8, q=0.9)  # Silky, non-fatiguing upper-mids
    return mixed


# ============================================================================
# 5. Track 2: bgm-battle.ogg — "Nine Realms Tactical Skirmish" (108 BPM, 24 Bars)
# ============================================================================

def compose_bgm_battle() -> np.ndarray:
    """
    108 BPM, 24 bars of 4/4 = 96 beats = 53.333333s = EXACT 2,560,000 stereo samples at 48,000 Hz.
    Matches DESIGN.md line 135 & Step 5 spec:
      - Plucked Pipa & Guzheng keep the 108 BPM tactical pulse ("Tiếng dây gảy giữ nhịp")
      - 3 distinct 8-bar sections:
          Bars 1–8  : Stealth & tactical tension (taut Pipa/Guqin ostinato, mysterious low Xiao)
          Bars 9–16 : Melodic Dizi ("sáo ngân dài") & bowed Erhu interplay over widening Guzheng
          Bars 17–24: Rising modal climb (Gm -> Am -> Bb -> C -> Dm -> A5) resolving to Bar 1
      - Sparse deep frame-drum hits ONLY at phrase transitions ("tiếng gõ trầm chỉ xuất hiện ở vài điểm chuyển câu")
      - -2.5 dB EQ pocket at 1.2–3.2 kHz so card/sword SFX cut through cleanly without masking!
    """
    rng = np.random.default_rng(20261081)
    bpm = 108.0
    beat_s = 60.0 / bpm  # 0.555555555... s (3 bars = 320,000 samples exact!)
    n_samples = 2_560_000
    buf = np.zeros((n_samples, 2), dtype=np.float64)

    def bt(bar_1idx: int, beat_1idx: float, human_ms: float = 0.0) -> int:
        total_beats = (bar_1idx - 1) * 4.0 + (beat_1idx - 1.0)
        sec = GRID_ANCHOR_SEC + total_beats * beat_s + (human_ms * 0.001)
        return int(round(sec * SR))

    def bsec(bar_1idx: int, beat_1idx: float) -> float:
        total_beats = (bar_1idx - 1) * 4.0 + (beat_1idx - 1.0)
        return GRID_ANCHOR_SEC + total_beats * beat_s

    # 24-Bar Harmonic Progression (3 distinct 8-bar sections)
    # Each entry: (bar, bass_midi, pipa_pattern_6notes, guzheng_arp_4notes, section_id)
    progression = [
        # --- Section 1 (Bars 1–8): Stealth & Tactical Tension (D Yu / Dorian) ---
        (1, 38, [50, 57, 62, 60, 57, 55], [62, 65, 69, 65], 1),
        (2, 38, [50, 57, 62, 64, 62, 57], [62, 67, 69, 62], 1),
        (3, 36, [48, 55, 60, 62, 60, 55], [60, 64, 67, 64], 1),
        (4, 38, [50, 57, 62, 60, 57, 53], [62, 65, 67, 57], 1),
        (5, 43, [55, 62, 67, 65, 62, 58], [62, 67, 70, 67], 1),
        (6, 43, [55, 62, 65, 62, 58, 55], [62, 65, 69, 62], 1),
        (7, 36, [48, 55, 60, 64, 62, 60], [60, 64, 67, 69], 1),
        (8, 45, [45, 52, 57, 60, 57, 55], [57, 62, 64, 57], 1),

        # --- Section 2 (Bars 9–16): Melodic Dizi & Erhu Interplay ---
        (9, 38, [50, 57, 62, 65, 62, 57], [62, 69, 74, 69], 2),
        (10, 41, [53, 60, 65, 69, 65, 60], [65, 69, 72, 69], 2),
        (11, 43, [55, 62, 67, 70, 67, 62], [67, 70, 74, 70], 2),
        (12, 45, [57, 64, 69, 67, 64, 57], [64, 69, 72, 67], 2),
        (13, 46, [58, 62, 65, 69, 65, 62], [62, 65, 70, 74], 2),
        (14, 36, [48, 55, 60, 64, 67, 60], [60, 67, 72, 67], 2),
        (15, 38, [50, 57, 62, 65, 69, 62], [62, 69, 74, 69], 2),
        (16, 36, [48, 55, 60, 62, 57, 55], [60, 64, 69, 62], 2),

        # --- Section 3 (Bars 17–24): Rising Modal Climb & Tactical Resolve ---
        (17, 43, [55, 62, 67, 70, 67, 62], [67, 70, 74, 77], 3),
        (18, 45, [57, 64, 69, 72, 69, 64], [69, 72, 76, 79], 3),
        (19, 46, [58, 65, 70, 74, 70, 65], [70, 74, 77, 81], 3),
        (20, 48, [60, 67, 72, 76, 72, 67], [72, 76, 79, 81], 3),
        (21, 38, [50, 57, 62, 69, 65, 62], [69, 74, 77, 81], 3),
        (22, 43, [55, 58, 62, 67, 65, 62], [67, 70, 74, 77], 3),
        (23, 36, [48, 55, 60, 64, 62, 57], [60, 67, 72, 67], 3),
        (24, 45, [45, 52, 57, 55, 53, 52], [57, 62, 64, 57], 3),
    ]

    # Tactical 3+3+2 rhythmic ostinato grid (1, 1.5, 2.5, 3.0, 4.0, 4.5)
    pipa_beats = [1.0, 1.5, 2.5, 3.0, 4.0, 4.5]
    pipa_vels = [0.76, 0.50, 0.72, 0.52, 0.68, 0.48]
    gz_beats = [1.0, 2.0, 3.0, 3.5]

    for bar, bass_m, p_notes, g_notes, sec_id in progression:
        sec_dyn = 0.82 if sec_id == 1 else (0.94 if sec_id == 2 else 1.0)

        # Guqin deep plucked tactical bass on Beat 1 and Beat 2.5
        mix_into_wrapped(
            buf,
            synth_guqin(bass_m, 2.2 * beat_s, rng, vel=0.68 * sec_dyn, pan=-0.10),
            bt(bar, 1.0, float(rng.uniform(-2.5, 2.5))),
        )
        mix_into_wrapped(
            buf,
            synth_guqin(bass_m + 12, 1.3 * beat_s, rng, vel=0.46 * sec_dyn, pan=-0.06),
            bt(bar, 2.5, float(rng.uniform(-3.0, 3.0))),
        )

        # Crisp Pipa ostinato ("Tiếng dây gảy giữ nhịp")
        for idx, (pb, pm, pv) in enumerate(zip(pipa_beats, p_notes, pipa_vels)):
            is_damped = (sec_id == 1 and idx in (1, 3, 5)) or (bar == 23 and idx >= 2)
            p_clip = synth_pipa(
                pm,
                (0.55 if is_damped else 0.95) * beat_s,
                rng,
                vel=pv * sec_dyn,
                damped=is_damped,
                pan=-0.25,
            )
            mix_into_wrapped(buf, p_clip, bt(bar, pb, float(rng.uniform(-3.0, 3.0))))

        # Pipa Lunzhi rapid 4-stroke tremolo ornament on dramatic Section 3 turnarounds
        if bar in (18, 20, 22):
            lun_midi = p_notes[3] + 12
            for l_i in range(5):
                l_clip = synth_pipa(lun_midi, 0.35 * beat_s, rng, vel=(0.42 + 0.07 * l_i), damped=False, pan=-0.22)
                mix_into_wrapped(buf, l_clip, bt(bar, 3.5 + l_i * 0.18, float(rng.uniform(-1.5, 1.5))))

        # Stereo Guzheng counter-pulse (sparser in Stealth Bars 1–4, richer in 9–24)
        for g_idx, (gb, gm) in enumerate(zip(gz_beats, g_notes)):
            if sec_id == 1 and bar <= 4 and g_idx in (1, 3):
                continue
            g_vel = (0.50 if sec_id == 1 else 0.64) * (1.0 if g_idx == 0 else 0.76)
            gz_clip = synth_guzheng(gm, 1.4 * beat_s, rng, vel=g_vel, pan=0.27, layer_harp=(sec_id >= 2 and g_idx == 0))
            mix_into_wrapped(buf, gz_clip, bt(bar, gb, float(rng.uniform(-3.5, 3.5))))

    # --- Sparse Deep Frame-Drum Hits ONLY at Phrase Transitions (DESIGN.md line 135!) ---
    transition_drums = [
        (1, 1.0, 60.0, 0.58),   # Opening downbeat anchor
        (4, 4.0, 66.0, 0.44),   # Pickup into Bar 5
        (5, 1.0, 58.0, 0.54),   # Mid-section 1 turn
        (8, 3.5, 68.0, 0.46),   # Transition pickup into Section 2
        (8, 4.0, 62.0, 0.52),
        (9, 1.0, 56.0, 0.64),   # Section 2 entrance
        (12, 4.0, 66.0, 0.45),  # Mid-section 2 turn
        (13, 1.0, 58.0, 0.58),
        (16, 3.5, 70.0, 0.48),  # Transition pickup into Section 3
        (16, 4.0, 62.0, 0.56),
        (17, 1.0, 55.0, 0.68),  # Section 3 rising entrance
        (20, 4.0, 64.0, 0.50),
        (21, 1.0, 56.0, 0.66),  # Peak resolve bar
        (24, 3.5, 66.0, 0.48),  # Turnaround pickup back to Bar 1
    ]
    for d_bar, d_beat, d_hz, d_vel in transition_drums:
        f_drum = synth_tanggu_drum(d_hz, rng, vel=d_vel, pan=0.0, style="deep")
        f_drum = apply_butter_circular(f_drum, 320.0, "lowpass", order=2)
        mix_into_wrapped(buf, f_drum, bt(d_bar, d_beat))

    # --- Section 1 (Bars 5–8): Stealth Low Xiao Breath Hints ---
    stealth_xiao = [
        [(bsec(5, 1.0), 2.8 * beat_s, 67, 0.58), (bsec(6, 1.0), 2.6 * beat_s, 69, 0.62)],
        [(bsec(7, 1.5), 2.2 * beat_s, 72, 0.60), (bsec(8, 1.0), 2.4 * beat_s, 69, 0.64)],
    ]
    for ph in stealth_xiao:
        st_i, clip = synth_bamboo_flute(ph, rng, kind="xiao", pan=0.12)
        mix_into_wrapped(buf, clip, st_i)

    # --- Section 2 (Bars 9–16): Long Sustained Dizi ("sáo ngân dài") & Bowed Erhu Interplay ---
    dizi_sec2 = [
        # Long soaring sustained flute calls
        [
            (bsec(9, 1.0), 2.9 * beat_s, 74, 0.86),
            (bsec(9, 4.0), 1.0 * beat_s, 77, 0.82),
            (bsec(10, 1.0), 2.8 * beat_s, 76, 0.84),
            (bsec(10, 4.0), 1.0 * beat_s, 72, 0.76),
        ],
        [
            (bsec(13, 1.0), 1.9 * beat_s, 74, 0.86),
            (bsec(13, 3.0), 1.9 * beat_s, 77, 0.88),
            (bsec(14, 1.0), 3.4 * beat_s, 79, 0.92),  # Long 3.4-beat singing bamboo sustain!
        ],
        [
            (bsec(15, 1.0), 2.4 * beat_s, 81, 0.90),
            (bsec(15, 3.5), 1.4 * beat_s, 77, 0.84),
            (bsec(16, 1.0), 2.6 * beat_s, 74, 0.82),
        ],
    ]
    for ph in dizi_sec2:
        st_i, clip = synth_bamboo_flute(ph, rng, kind="dizi", pan=0.16)
        mix_into_wrapped(buf, clip, st_i)

    erhu_sec2 = [
        # Singing Erhu answering Dizi in Bars 11–12 & weaving counter-melody in Bars 14–16
        [
            (bsec(11, 1.0), 1.9 * beat_s, 67, 0.82),
            (bsec(11, 3.0), 0.95 * beat_s, 70, 0.84),
            (bsec(11, 4.0), 0.95 * beat_s, 74, 0.88),
            (bsec(12, 1.0), 2.8 * beat_s, 72, 0.86),
            (bsec(12, 4.0), 0.9 * beat_s, 69, 0.78),
        ],
        [
            (bsec(14, 2.5), 1.4 * beat_s, 72, 0.76),
            (bsec(15, 1.0), 2.4 * beat_s, 74, 0.82),
            (bsec(16, 1.0), 1.9 * beat_s, 67, 0.78),
            (bsec(16, 3.0), 1.5 * beat_s, 69, 0.82),
        ],
    ]
    for ph in erhu_sec2:
        st_i, clip = synth_erhu_phrase(ph, rng, pan=-0.18)
        mix_into_wrapped(buf, clip, st_i)

    # --- Section 3 (Bars 17–24): Rising Modal Climb & Resolve Back to Bar 1 ---
    dizi_sec3 = [
        [
            (bsec(17, 1.0), 2.9 * beat_s, 74, 0.86),
            (bsec(18, 1.0), 2.9 * beat_s, 76, 0.88),
            (bsec(19, 1.0), 2.4 * beat_s, 77, 0.92),
            (bsec(19, 3.5), 1.4 * beat_s, 79, 0.90),
            (bsec(20, 1.0), 3.2 * beat_s, 81, 0.94),
        ],
        [
            (bsec(21, 1.0), 2.4 * beat_s, 81, 0.92),
            (bsec(21, 3.5), 1.4 * beat_s, 77, 0.86),
            (bsec(22, 1.0), 2.8 * beat_s, 74, 0.84),
            (bsec(23, 1.0), 2.6 * beat_s, 72, 0.78),
            (bsec(24, 1.0), 2.2 * beat_s, 69, 0.72),  # Resolves cleanly on A4 -> Bar 1 D minor!
        ],
    ]
    for ph in dizi_sec3:
        st_i, clip = synth_bamboo_flute(ph, rng, kind="dizi", pan=0.16)
        mix_into_wrapped(buf, clip, st_i)

    erhu_sec3 = [
        [
            (bsec(17, 2.5), 1.5 * beat_s, 67, 0.80),
            (bsec(18, 2.5), 1.5 * beat_s, 69, 0.84),
            (bsec(19, 1.0), 2.4 * beat_s, 70, 0.86),
            (bsec(20, 1.0), 2.8 * beat_s, 72, 0.90),
            (bsec(21, 1.0), 2.8 * beat_s, 74, 0.92),
            (bsec(22, 1.0), 1.9 * beat_s, 70, 0.84),
            (bsec(22, 3.0), 1.9 * beat_s, 67, 0.80),
            (bsec(23, 1.0), 2.4 * beat_s, 64, 0.76),
            (bsec(24, 1.0), 2.0 * beat_s, 62, 0.72),
        ]
    ]
    for ph in erhu_sec3:
        st_i, clip = synth_erhu_phrase(ph, rng, pan=-0.18)
        mix_into_wrapped(buf, clip, st_i)

    # Tight tactical courtyard reverb + Mandatory 1.2–3.2 kHz SFX Pocket EQ (-2.5 dB)!
    mixed = apply_circular_reverb(buf, rng, rt60=1.55, wet=0.18, damp_hz=2800.0, pre_delay_ms=18.0)
    mixed = apply_butter_circular(mixed, 32.0, "highpass", order=3)
    # Carve -2.6 dB pocket across 1.2–3.2 kHz (centered at 2,050 Hz, Q=0.82) for card & sword SFX!
    mixed = apply_peaking_eq_stereo(mixed, 2050.0, -2.6, q=0.82)
    mixed = apply_peaking_eq_stereo(mixed, 140.0, 1.0, q=0.9)
    return mixed


# ============================================================================
# 6. Track 3: bgm-climax-drums.ogg — "108 BPM Climax War-Drums" (24 Bars)
# ============================================================================

def compose_bgm_climax_drums() -> np.ndarray:
    """
    108 BPM, 24 bars of 4/4 = 96 beats = 53.333333s = EXACT 2,560,000 stereo samples at 48,000 Hz.
    Sample-locked to `bgm-battle.ogg` (exact same GRID_ANCHOR_SEC = 0.014 and 108 BPM beat grid):
      - Deep resonant Tanggu/Taiko low drums (58–105 Hz punch, cleanly high-passed below 32 Hz)
      - Tight wooden clack/rim syncopations panned subtly across stereo
      - Subtle bronze Bianzhong & dark cymbal swells on 8-bar boundaries (Bars 1, 9, 17)
    """
    rng = np.random.default_rng(20261082)
    bpm = 108.0
    beat_s = 60.0 / bpm
    n_samples = 2_560_000
    buf = np.zeros((n_samples, 2), dtype=np.float64)

    def bt(bar_1idx: int, beat_1idx: float, human_ms: float = 0.0) -> int:
        total_beats = (bar_1idx - 1) * 4.0 + (beat_1idx - 1.0)
        sec = GRID_ANCHOR_SEC + total_beats * beat_s + (human_ms * 0.001)
        return int(round(sec * SR))

    for bar in range(1, 25):
        sec_id = 1 if bar <= 8 else (2 if bar <= 16 else 3)
        is_turnaround = bar in (4, 8, 12, 16, 20, 24)
        e_scale = 0.84 if sec_id == 1 else (0.92 if sec_id == 2 else 1.0)

        # Bar 23 dramatic tactical stop-pocket before Bar 24 thunderous turnaround!
        if bar == 23:
            mix_into_wrapped(buf, synth_tanggu_drum(58.0, rng, vel=0.92, pan=0.0, style="deep"), bt(bar, 1.0))
            mix_into_wrapped(buf, synth_wood_rim_clack(rng, vel=0.72, pan=-0.26, kind="rim"), bt(bar, 2.0))
            mix_into_wrapped(buf, synth_tanggu_drum(62.0, rng, vel=0.88, pan=0.06, style="deep"), bt(bar, 2.5))
            mix_into_wrapped(buf, synth_wood_rim_clack(rng, vel=0.68, pan=0.26, kind="wood"), bt(bar, 4.0))
            continue

        # Core 3+3+2 martial Tanggu low-drum foundation (aligned with Battle's Pipa pulse!)
        mix_into_wrapped(
            buf,
            synth_tanggu_drum(58.0, rng, vel=0.90 * e_scale, pan=0.0, style="deep"),
            bt(bar, 1.0, float(rng.uniform(-1.5, 1.5))),
        )
        mix_into_wrapped(
            buf,
            synth_tanggu_drum(65.0, rng, vel=0.78 * e_scale, pan=-0.08, style="deep"),
            bt(bar, 2.5, float(rng.uniform(-2.0, 2.0))),
        )
        if sec_id >= 2 or bar % 2 == 0:
            mix_into_wrapped(
                buf,
                synth_tanggu_drum(82.0, rng, vel=0.68 * e_scale, pan=0.16, style="mid"),
                bt(bar, 4.0, float(rng.uniform(-2.0, 2.0))),
            )

        # Section 3 urgent Taiko mid-tom answers
        if sec_id == 3:
            mix_into_wrapped(
                buf,
                synth_tanggu_drum(92.0, rng, vel=0.58, pan=-0.20, style="mid"),
                bt(bar, 1.75, float(rng.uniform(-2.0, 2.0))),
            )
            mix_into_wrapped(
                buf,
                synth_tanggu_drum(76.0, rng, vel=0.64, pan=0.18, style="mid"),
                bt(bar, 3.5, float(rng.uniform(-2.0, 2.0))),
            )

        # Tight wooden rim / Bangzi syncopations & brush ghost-notes
        rim_pattern = [
            (1.5, 0.56, -0.26, "rim"),
            (2.0, 0.64, 0.24, "wood" if sec_id >= 2 else "rim"),
            (3.0, 0.68, -0.22, "rim"),
            (3.75, 0.48, 0.28, "rim"),
            (4.5, 0.58, -0.24, "brush" if sec_id == 1 else "rim"),
        ]
        for rb, rv, rpan, rkind in rim_pattern:
            if sec_id == 1 and rb == 3.75 and not is_turnaround:
                continue
            mix_into_wrapped(
                buf,
                synth_wood_rim_clack(rng, vel=rv * e_scale, pan=rpan, kind=rkind),
                bt(bar, rb, float(rng.uniform(-2.0, 2.0))),
            )

        # 4-bar & 8-bar martial Taiko turnaround fills
        if is_turnaround:
            fill_hits = [
                (3.0, 96.0, 0.62, -0.24),
                (3.5, 86.0, 0.70, 0.0),
                (4.0, 76.0, 0.78, 0.18),
                (4.5, 66.0, 0.84, -0.10),
            ]
            if bar in (8, 16, 24):
                fill_hits.insert(1, (3.25, 92.0, 0.58, 0.22))
                fill_hits.insert(4, (4.25, 72.0, 0.72, -0.18))
            for fb, fhz, fv, fpan in fill_hits:
                mix_into_wrapped(
                    buf,
                    synth_tanggu_drum(fhz, rng, vel=fv * e_scale, pan=fpan, style="mid"),
                    bt(bar, fb, float(rng.uniform(-1.5, 1.5))),
                )

    # --- Subtle Bronze Bianzhong & Dark Cymbal Swells on 8-Bar Boundaries (Bars 1, 9, 17) ---
    swell_dur = 2.0 * beat_s  # 2-beat swell rising across Beats 3–4 of Bars 24, 8, 16!
    boundary_specs = [
        (24, 3.0, 50, 0.68),  # Bar 24 Beats 3–4 -> peaks at Bar 1 Beat 1 (D3 + A3)!
        (8, 3.0, 50, 0.72),   # Bar 8 Beats 3–4  -> peaks at Bar 9 Beat 1!
        (16, 3.0, 55, 0.78),  # Bar 16 Beats 3–4 -> peaks at Bar 17 Beat 1 (G3 + D4)!
    ]
    for s_bar, s_beat, root_m, s_vel in boundary_specs:
        sw = synth_bronze_swell(swell_dur, root_m, rng, vel=s_vel)
        mix_into_wrapped(buf, sw, bt(s_bar, s_beat))

    # Tight war-hall circular reverb + Mandatory clean high-pass below 32 Hz!
    mixed = apply_circular_reverb(buf, rng, rt60=1.25, wet=0.15, damp_hz=2500.0, pre_delay_ms=14.0)
    mixed = apply_butter_circular(mixed, 35.0, "highpass", order=4)   # Clean cut below 32–35 Hz
    mixed = apply_peaking_eq_stereo(mixed, 74.0, 2.2, q=1.05)         # 55–110 Hz Tanggu chest punch
    mixed = apply_peaking_eq_stereo(mixed, 290.0, -2.0, q=1.1)        # Remove boxiness when summed with Battle
    mixed = apply_peaking_eq_stereo(mixed, 2100.0, -2.2, q=0.9)       # Keep SFX midrange open
    return mixed


# ============================================================================
# 7. BS.1770-4 Mastering Chain, True-Peak Limiter & Closed-Loop OGG Encoder
# ============================================================================

def true_peak_soft_limit(x: np.ndarray, ceiling_dbtp: float = -2.6) -> np.ndarray:
    """
    4x-oversampled smooth lookahead True-Peak envelope limiter.
    Keeps True Peak safely below ceiling_dbtp while preserving dynamic LRA.
    """
    ceiling = db_to_lin(ceiling_dbtp)
    up = signal.resample_poly(x, 4, 1, axis=0)
    inst_peak = np.max(np.abs(up), axis=1)[::4]
    if len(inst_peak) < len(x):
        inst_peak = np.pad(inst_peak, (0, len(x) - len(inst_peak)), mode="edge")
    else:
        inst_peak = inst_peak[: len(x)]

    need_gain = np.minimum(1.0, ceiling / (inst_peak + 1e-12))
    # 3 ms circular lookahead min-filter + smooth release
    win = max(3, int(0.003 * SR))
    pad = win * 2
    g_pad = np.concatenate([need_gain[-pad:], need_gain, need_gain[:pad]])
    from scipy.ndimage import minimum_filter1d, uniform_filter1d

    g_min = minimum_filter1d(g_pad, size=win)
    g_smooth = uniform_filter1d(g_min, size=int(0.018 * SR))[pad : pad + len(x)]
    y = x * g_smooth[:, None]

    # Final ultra-gentle safety ceiling catch on 4x oversampled peak
    tp_now = ef.true_peak_dbtp(y)
    if tp_now > ceiling_dbtp + 0.15:
        y *= db_to_lin(ceiling_dbtp - tp_now)
    return y


def smooth_circular_seam(x: np.ndarray, half_win: int = 192) -> np.ndarray:
    """
    Ensure near-zero loop seam delta `max(|frame[0] - frame[-1]|) << 0.003` EVEN AFTER
    lossy OGG Vorbis MDCT boundary coding:
      1. Circular C1 midpoint alignment across ±half_win samples
      2. Subtle 2.5 ms micro-breath at the exact sample-0 boundary (14 ms before Beat 1!)
         so Vorbis MDCT short-window edge has near-zero slope & near-zero boundary error.
    """
    y = x.copy()
    # 1. Circularly blend endpoints toward shared C1 value
    diff = y[0] - y[-1]
    ramp = 0.5 * np.exp(-np.arange(half_win, dtype=np.float64) / (half_win * 0.35))[:, None]
    y[:half_win] -= diff * ramp
    y[-half_win:] += diff * ramp[::-1]

    # 2. Gentle 2.2 ms (108 samples) raised-cosine micro-pin right at sample 0 / N-1
    #    (indistinguishable to human ears in the pre-anchor reverb tail, eliminates Vorbis MDCT jump)
    pin_n = 108
    pin_curve = (0.5 - 0.5 * np.cos(np.linspace(0.0, math.pi, pin_n)))[:, None]
    floor = 0.12
    scale = floor + (1.0 - floor) * pin_curve
    y[:pin_n] *= scale
    y[-pin_n:] *= scale[::-1]
    # Pin exact endpoints equal
    mid = 0.5 * (y[0] + y[-1])
    y[0] = mid
    y[-1] = mid
    return y


def write_ogg_chunked(
    out_path: Path, data_f32: np.ndarray, compression_level: float, chunk_frames: int = 65536
) -> None:
    """
    Write OGG Vorbis in 64k-frame chunks to avoid Windows libsndfile/libvorbis 1 MB C-stack
    overflow when encoding multi-million-sample stereo buffers in a single sf_writef call.
    """
    with sf.SoundFile(
        str(out_path),
        mode="w",
        samplerate=SR,
        channels=data_f32.shape[1],
        format="OGG",
        subtype="VORBIS",
        compression_level=compression_level,
    ) as f:
        for idx in range(0, len(data_f32), chunk_frames):
            f.write(data_f32[idx : idx + chunk_frames])


def master_and_export_ogg(
    raw_stereo: np.ndarray,
    out_path: Path,
    target_lufs: float = -20.0,
    ceiling_dbtp: float = -2.6,
    initial_compression: float = 0.48,
) -> Dict[str, float]:
    """
    Master stereo track to exact -20.0 LUFS (± 0.15 LU), True Peak <= -1.5 dBTP,
    seamless loop seam < 0.003, and file size ~400–1400 KB, verified on DECODED OGG!
    """
    x = raw_stereo - np.mean(raw_stereo, axis=0, keepdims=True)

    # Pass 1 & 2: Iterative BS.1770 LUFS + True-Peak limiting in float64 PCM
    for _ in range(3):
        cur_lufs = ef.integrated_lufs(x)
        x = x * db_to_lin(target_lufs - cur_lufs)
        x = true_peak_soft_limit(x, ceiling_dbtp=ceiling_dbtp)
    cur_lufs = ef.integrated_lufs(x)
    x = x * db_to_lin(target_lufs - cur_lufs)
    x = smooth_circular_seam(x)

    out_path.parent.mkdir(parents=True, exist_ok=True)
    comp = initial_compression

    # Closed-loop OGG Vorbis calibration (adjust compression_level for size & fine-trim LUFS)
    decoded = None
    for attempt in range(5):
        write_ogg_chunked(out_path, x.astype(np.float32), compression_level=comp)
        file_kb = os.path.getsize(out_path) / 1024.0
        if file_kb < 415.0 and comp > 0.08:
            comp = max(0.05, comp - 0.22)
            continue
        if file_kb > 1340.0 and comp < 0.82:
            comp = min(0.85, comp + 0.14)
            continue

        decoded, sr_dec = sf.read(str(out_path), dtype="float64", always_2d=True)
        assert sr_dec == SR, f"Unexpected decoded sample rate: {sr_dec}"
        dec_lufs = ef.integrated_lufs(decoded)
        err_lu = target_lufs - dec_lufs
        if abs(err_lu) > 0.04 and attempt < 4:
            x = smooth_circular_seam(x * db_to_lin(err_lu))
            continue
        break

    assert decoded is not None
    dec_lufs = ef.integrated_lufs(decoded)
    dec_tp = ef.true_peak_dbtp(decoded)
    dec_lra = ef.lra(decoded) or 0.0
    seam_delta = float(np.max(np.abs(decoded[0] - decoded[-1])))
    file_kb = os.path.getsize(out_path) / 1024.0

    return {
        "samples": int(decoded.shape[0]),
        "channels": int(decoded.shape[1]),
        "duration_s": float(decoded.shape[0]) / SR,
        "integrated_lufs": float(dec_lufs),
        "lra_lu": float(dec_lra),
        "true_peak_dbtp": float(dec_tp),
        "seam_delta": seam_delta,
        "file_kb": float(file_kb),
    }


def main() -> None:
    print("=== Generating Cửu Châu Ẩn Kiếm Studio Original Guofeng BGM Suite (48 kHz Stereo) ===")

    tracks_spec = [
        ("bgm-lobby.ogg", compose_bgm_lobby, 3_840_000, -2.5, 0.45),
        ("bgm-battle.ogg", compose_bgm_battle, 2_560_000, -2.8, 0.44),
        ("bgm-climax-drums.ogg", compose_bgm_climax_drums, 2_560_000, -2.8, 0.36),
    ]

    results: Dict[str, Dict[str, float]] = {}
    for filename, builder_fn, expected_samples, ceiling_dbtp, init_comp in tracks_spec:
        print(f"-> Synthesizing & mastering {filename} ...")
        raw = builder_fn()
        assert raw.shape == (expected_samples, 2), f"Expected {(expected_samples, 2)}, got {raw.shape}"
        out_file = OUT_DIR / filename
        metrics = master_and_export_ogg(
            raw,
            out_file,
            target_lufs=-20.0,
            ceiling_dbtp=ceiling_dbtp,
            initial_compression=init_comp,
        )
        results[filename] = metrics

    # Decode battle + climax-drums from disk to verify sample-locked combined climax playback!
    battle_dec, _ = sf.read(str(OUT_DIR / "bgm-battle.ogg"), dtype="float64", always_2d=True)
    drums_dec, _ = sf.read(str(OUT_DIR / "bgm-climax-drums.ogg"), dtype="float64", always_2d=True)
    assert battle_dec.shape == drums_dec.shape == (2_560_000, 2)

    combined = battle_dec + 0.52 * drums_dec
    combined_scaled = 1.05 * battle_dec + 0.52 * drums_dec  # soundFx.ts mode === 'climax' scale
    comb_metrics = {
        "samples": int(combined.shape[0]),
        "duration_s": float(combined.shape[0]) / SR,
        "integrated_lufs": float(ef.integrated_lufs(combined)),
        "lra_lu": float(ef.lra(combined)),
        "true_peak_dbtp": float(ef.true_peak_dbtp(combined)),
        "true_peak_105_dbtp": float(ef.true_peak_dbtp(combined_scaled)),
        "max_abs": float(np.max(np.abs(combined_scaled))),
        "seam_delta": float(np.max(np.abs(combined[0] - combined[-1]))),
        "file_kb": results["bgm-battle.ogg"]["file_kb"] + results["bgm-climax-drums.ogg"]["file_kb"],
    }

    print("\n=== MEASURED QA TABLE (Decoded OGG Vorbis @ 48,000 Hz Stereo) ===")
    header = (
        f"{'track':<26} | {'duration_s':>10} | {'samples':>9} | "
        f"{'lufs':>8} | {'lra_lu':>6} | {'tp_dbtp':>8} | {'seam_delta':>10} | {'file_kb':>8}"
    )
    print(header)
    print("-" * len(header))
    for name, m in results.items():
        print(
            f"{name:<26} | {m['duration_s']:>10.3f} | {m['samples']:>9d} | "
            f"{m['integrated_lufs']:>8.2f} | {m['lra_lu']:>6.2f} | {m['true_peak_dbtp']:>8.2f} | "
            f"{m['seam_delta']:>10.6f} | {m['file_kb']:>8.1f}"
        )
    print(
        f"{'battle + 0.52*climax':<26} | {comb_metrics['duration_s']:>10.3f} | {comb_metrics['samples']:>9d} | "
        f"{comb_metrics['integrated_lufs']:>8.2f} | {comb_metrics['lra_lu']:>6.2f} | "
        f"{comb_metrics['true_peak_dbtp']:>8.2f} | {comb_metrics['seam_delta']:>10.6f} | "
        f"{comb_metrics['file_kb']:>8.1f}"
    )
    total_kb = sum(m["file_kb"] for m in results.values())
    print(
        f"\nTotal 3-BGM OGG size: {total_kb:.1f} KB ({total_kb / 1024.0:.2f} MB) | "
        f"1.05*battle + 0.52*climax TP: {comb_metrics['true_peak_105_dbtp']:.2f} dBTP"
    )

    # Strict QA Gate Assertions
    assert results["bgm-lobby.ogg"]["samples"] == 3_840_000
    assert results["bgm-lobby.ogg"]["lra_lu"] >= 4.0, f"Lobby LRA < 4 LU: {results['bgm-lobby.ogg']['lra_lu']}"
    assert results["bgm-battle.ogg"]["samples"] == 2_560_000
    assert results["bgm-climax-drums.ogg"]["samples"] == 2_560_000

    for name, m in results.items():
        assert abs(m["integrated_lufs"] - (-20.0)) <= 0.15, f"{name} LUFS out of spec: {m['integrated_lufs']}"
        assert m["true_peak_dbtp"] <= -1.5, f"{name} True Peak > -1.5 dBTP: {m['true_peak_dbtp']}"
        assert m["seam_delta"] < 0.003, f"{name} seam_delta >= 0.003: {m['seam_delta']}"
        assert 380.0 <= m["file_kb"] <= 1433.6, f"{name} size out of range: {m['file_kb']} KB"

    assert comb_metrics["true_peak_dbtp"] < -1.0, f"Combined climax TP >= -1.0 dBTP: {comb_metrics['true_peak_dbtp']}"
    assert comb_metrics["max_abs"] < 1.0, "Combined climax clipped!"
    assert total_kb < 3584.0, f"Total BGM size >= 3.5 MB: {total_kb} KB"
    print("ALL MANDATORY QA GATES PASSED 100%!")


if __name__ == "__main__":
    main()
