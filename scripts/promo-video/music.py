"""羽升博客宣传片配乐：程序化合成，120 BPM，30 秒。

结构（与 composition.html 的剪辑点一一对应）：
  0–12s   温情叙事：钢琴分解和弦 + 暖 pad；3–4.8s 倒计时滴答加速；6s 羽升显字的 shimmer；
          9.5s 起 riser，10.5s 起军鼓滚奏，11.875s 抽空半拍
  12–26s  卡点段：四踩底鼓 + sidechain 泵感、拍手、踩镲、贝斯、pluck 琶音；
          12/16/20/24s 大冲击，15.75/19.75s 转场 whoosh，24.5s 起第二次 riser
  26–30s  回落：冲击后只剩钢琴 Dmaj9 与 pad，淡出

用法：python3 music.py out/music.wav
"""

import sys
import wave

import numpy as np
from scipy.signal import butter, fftconvolve, lfilter

SR = 48000
DUR = 30.0
BEAT = 0.5
N = int(SR * DUR)
rng = np.random.default_rng(1037)


def midi(m: float) -> float:
    return 440.0 * 2 ** ((m - 69) / 12)


def buf() -> np.ndarray:
    return np.zeros(N)


def place(dst: np.ndarray, sig: np.ndarray, t0: float, gain: float = 1.0) -> None:
    i0 = int(t0 * SR)
    if i0 >= N:
        return
    i1 = min(N, i0 + len(sig))
    dst[i0:i1] += sig[: i1 - i0] * gain


def lp(x: np.ndarray, fc: float, order: int = 2) -> np.ndarray:
    b, a = butter(order, fc / (SR / 2), 'low')
    return lfilter(b, a, x)


def hp(x: np.ndarray, fc: float, order: int = 2) -> np.ndarray:
    b, a = butter(order, fc / (SR / 2), 'high')
    return lfilter(b, a, x)


def bp(x: np.ndarray, lo: float, hi: float) -> np.ndarray:
    b, a = butter(2, [lo / (SR / 2), hi / (SR / 2)], 'band')
    return lfilter(b, a, x)


# ---------------------------------------------------------------- voices

def piano(freq: float, dur: float = 2.4, vel: float = 0.5) -> np.ndarray:
    n = int(dur * SR)
    t = np.arange(n) / SR
    out = np.zeros(n)
    for k in range(1, 8):
        f = freq * k * (1 + 0.0004 * k * k)
        if f > 16000:
            break
        amp = 1 / k ** 1.6
        tau = 1.6 / (1 + 0.55 * (k - 1))
        out += amp * np.sin(2 * np.pi * f * t) * np.exp(-t / tau)
    att = np.minimum(1, t / 0.004)
    rel = np.minimum(1, (dur - t) / 0.08)
    return out * att * rel * vel * 0.32


def bell(freq: float, dur: float = 3.0, vel: float = 0.4) -> np.ndarray:
    n = int(dur * SR)
    t = np.arange(n) / SR
    ratios = [1, 2.76, 5.4, 8.93]
    out = sum((1 / (i + 1)) * np.sin(2 * np.pi * freq * r * t) * np.exp(-t / (1.8 / (i + 1))) for i, r in enumerate(ratios))
    return out * np.minimum(1, t / 0.002) * vel * 0.25


def saw(freq: float, n: int, detune: float = 0.0) -> np.ndarray:
    t = np.arange(n) / SR
    ph = (freq * (1 + detune) * t + rng.random()) % 1.0
    return 2 * ph - 1


def pad(freqs: list[float], dur: float, vel: float = 0.3, cutoff: float = 1400) -> np.ndarray:
    n = int(dur * SR)
    t = np.arange(n) / SR
    out = np.zeros(n)
    for f in freqs:
        for d in (-0.006, 0.0, 0.0065):
            out += saw(f, n, d)
    out = lp(out / (len(freqs) * 3), cutoff, 2)
    env = np.minimum(1, t / 0.6) * np.minimum(1, (dur - t) / 0.5)
    return out * env * vel


def pluck(freq: float, vel: float = 0.3) -> np.ndarray:
    n = int(0.3 * SR)
    t = np.arange(n) / SR
    x = saw(freq, n) * 0.6 + saw(freq, n, 0.004) * 0.4
    x = lp(x, 3200) * np.exp(-t / 0.09)
    return x * vel


def kick(vel: float = 1.0, long: bool = False) -> np.ndarray:
    dur = 0.9 if long else 0.45
    n = int(dur * SR)
    t = np.arange(n) / SR
    f = 46 + 130 * np.exp(-t / 0.035)
    ph = 2 * np.pi * np.cumsum(f) / SR
    body = np.sin(ph) * np.exp(-t / (0.45 if long else 0.22))
    click = hp(rng.standard_normal(n), 2000) * np.exp(-t / 0.004) * 0.35
    return np.tanh((body + click) * 1.6) * vel * 0.9


def clap(vel: float = 0.5) -> np.ndarray:
    n = int(0.35 * SR)
    t = np.arange(n) / SR
    noise = bp(rng.standard_normal(n), 900, 5000)
    env = np.zeros(n)
    for off in (0.0, 0.011, 0.022):
        tt = np.clip(t - off, 0, None)
        env += (t >= off) * np.exp(-tt / 0.012)
    env += (t >= 0.03) * np.exp(-np.clip(t - 0.03, 0, None) / 0.1) * 0.6
    return noise * env * vel * 0.5


def hat(vel: float = 0.25, open_: bool = False) -> np.ndarray:
    n = int((0.25 if open_ else 0.06) * SR)
    t = np.arange(n) / SR
    return hp(rng.standard_normal(n), 7500) * np.exp(-t / (0.08 if open_ else 0.015)) * vel


def snare(vel: float = 0.4) -> np.ndarray:
    n = int(0.2 * SR)
    t = np.arange(n) / SR
    tone = np.sin(2 * np.pi * 190 * t) * np.exp(-t / 0.04)
    noise = bp(rng.standard_normal(n), 1500, 8000) * np.exp(-t / 0.06)
    return (tone * 0.5 + noise) * vel * 0.6


def tick(vel: float = 0.3) -> np.ndarray:
    n = int(0.05 * SR)
    t = np.arange(n) / SR
    return (np.sin(2 * np.pi * 3100 * t) + 0.5 * np.sin(2 * np.pi * 5200 * t)) * np.exp(-t / 0.006) * vel


def crash(vel: float = 0.5, dur: float = 2.6) -> np.ndarray:
    n = int(dur * SR)
    t = np.arange(n) / SR
    return hp(rng.standard_normal(n), 4500) * np.exp(-t / 0.7) * vel * 0.35


def boom(vel: float = 0.8) -> np.ndarray:
    n = int(2.2 * SR)
    t = np.arange(n) / SR
    f = 38 + 50 * np.exp(-t / 0.2)
    ph = 2 * np.pi * np.cumsum(f) / SR
    return np.sin(ph) * np.exp(-t / 0.7) * vel


def riser(dur: float, vel: float = 0.4) -> np.ndarray:
    n = int(dur * SR)
    t = np.arange(n) / SR
    x = rng.standard_normal(n)
    out = np.zeros(n)
    seg = 2400
    for i in range(0, n, seg):
        p = i / n
        lo = 300 + 5000 * p ** 2
        out[i:i + seg] = bp(x[max(0, i - 2000):i + seg], lo, lo * 1.9)[-min(seg, n - i):]
    f = 220 * 2 ** (2.5 * t / dur)
    tone = np.sin(2 * np.pi * np.cumsum(f) / SR) * 0.25
    env = (t / dur) ** 2.2
    return (out + tone) * env * vel


def whoosh(dur: float = 0.3, vel: float = 0.35) -> np.ndarray:
    n = int(dur * SR)
    t = np.arange(n) / SR
    x = rng.standard_normal(n)
    y = bp(x, 600, 6000)
    env = np.sin(np.pi * t / dur) ** 2
    return y * env * vel


def shimmer(freqs: list[float], dur: float, vel: float = 0.2) -> np.ndarray:
    n = int(dur * SR)
    t = np.arange(n) / SR
    out = np.zeros(n)
    for i, f in enumerate(freqs):
        out += np.sin(2 * np.pi * f * t + i) * (0.6 + 0.4 * np.sin(2 * np.pi * (3 + i) * t))
    env = np.minimum(1, t / (dur * 0.35)) * np.exp(-np.clip(t - dur * 0.35, 0, None) / (dur * 0.4))
    return out / len(freqs) * env * vel


# ---------------------------------------------------------------- harmony

# 每小节 2s。和弦音（MIDI）：D 大调温暖进行
CH = {
    'D': [50, 54, 57, 61],   # Dmaj7
    'Bm': [47, 50, 54, 57],  # Bm7
    'G': [43, 47, 50, 54],   # Gmaj7
    'A': [45, 49, 52, 55],   # A7
    'Asus': [45, 50, 52, 57],
    'Dadd9': [50, 54, 57, 61, 64],
}
BASS = {'D': 38, 'Bm': 35, 'G': 31, 'A': 33, 'Asus': 33, 'Dadd9': 38}

INTRO = [(0, 'D'), (2, 'Bm'), (4, 'G'), (6, 'A'), (8, 'D'), (10, 'G'), (11, 'Asus')]
DROP = [(12, 'D'), (14, 'Bm'), (16, 'G'), (18, 'A'), (20, 'D'), (22, 'Bm'), (24, 'G'), (25, 'A')]


def chord_at(t: float, prog: list[tuple[float, str]]) -> str:
    name = prog[0][1]
    for t0, c in prog:
        if t >= t0:
            name = c
    return name


warm = buf()   # 钢琴 / bell / pad → 进混响
drums = buf()
synth = buf()  # 贝斯 / pluck（吃 sidechain）
fx = buf()

# 温情段 pad
for i, (t0, c) in enumerate(INTRO):
    t1 = INTRO[i + 1][0] if i + 1 < len(INTRO) else 12.0
    place(warm, pad([midi(m) for m in CH[c]], t1 - t0 + 0.6, 0.16 + 0.05 * (t0 / 12), 900 + 90 * t0), t0)

# 温情段钢琴：0–3s 稀疏四分音符，3–6 让位给倒计时，6–9 八分，9–12 十六分推进
ARP = [0, 1, 2, 3, 2, 1]
for k in range(int(12 / 0.25)):
    t = k * 0.25
    if t < 3.0 and k % 2:
        continue
    if 3.0 <= t < 4.75:
        continue
    if 4.75 <= t < 6.0 and k % 2:
        continue
    c = chord_at(t, INTRO)
    notes = CH[c]
    m = notes[ARP[k % len(ARP)]] + 12
    if t >= 6.0 and k % 4 == 0:
        m += 12
    vel = 0.35 + 0.25 * (t / 12)
    place(warm, piano(midi(m), 2.0, vel), t)
    if k % 8 == 0:
        place(warm, piano(midi(BASS[c] + 12), 2.4, 0.4), t)

for k in range(24, 48):  # 9–12s 叠十六分
    t = 9.0 + (k - 24) * 0.125
    if t >= 11.875:
        break
    c = chord_at(t, INTRO)
    place(warm, piano(midi(CH[c][k % 4] + 24), 0.8, 0.18 + 0.1 * (t - 9) / 3), t)

# 开头一声旋律
for t, m in [(0.35, 73), (1.35, 76), (2.35, 78)]:
    place(warm, piano(midi(m), 3.0, 0.42), t)

# 3.0–4.8s 倒计时：滴答逐渐加速后骤停
tt = 3.0
gap = 0.22
while tt < 4.8:
    place(fx, tick(0.28), tt)
    tt += gap
    gap = max(0.045, gap * 0.8)
place(warm, bell(midi(81), 3.5, 0.5), 4.8)
place(warm, bell(midi(74), 3.5, 0.35), 5.2)
place(warm, piano(midi(62), 3.0, 0.5), 5.2)
place(warm, piano(midi(69), 3.0, 0.4), 5.2)

# 6s 羽升显字：shimmer + 低频暖 boom
place(warm, shimmer([midi(m) for m in (81, 85, 88, 93)], 3.2, 0.22), 5.9)
place(fx, boom(0.35), 6.0)
place(warm, bell(midi(86), 3.0, 0.3), 7.8)
place(fx, whoosh(0.4, 0.3), 8.6)  # 穿越推镜

# 9–12s riser + 滚奏
place(fx, riser(2.4, 0.3), 9.5)
tt, gap = 10.5, 0.25
while tt < 11.86:
    place(drums, snare(0.12 + 0.3 * (tt - 10.5) / 1.4), tt)
    tt += gap
    gap = max(0.0625, gap * 0.82)
place(fx, whoosh(0.5, 0.25), 11.4)

# ---------------------------------------------------------------- 卡点段 12–26s
kick_env = np.ones(N)
beats = [12.0 + i * BEAT for i in range(28)]
for i, b in enumerate(beats):
    place(drums, kick(1.0, long=b in (12.0, 16.0, 20.0, 24.0)), b)
    s = int(b * SR)
    L = int(0.32 * SR)
    t = np.arange(min(L, N - s)) / SR
    kick_env[s:s + len(t)] = np.minimum(kick_env[s:s + len(t)], 0.25 + 0.75 * (t / 0.32) ** 0.6)
    if i % 2 == 1:
        place(drums, clap(0.55), b)
    place(drums, hat(0.22), b + 0.25)
    if b >= 20.0:
        place(drums, hat(0.1), b + 0.125)
        place(drums, hat(0.1), b + 0.375)

for t in (12.0, 16.0, 20.0, 24.0):
    place(fx, crash(0.6), t)
    place(fx, boom(0.5), t)
for t in (15.72, 19.72):
    place(fx, whoosh(0.32, 0.4), t)
# 23.5–24 十六分军鼓加花
for k in range(4):
    place(drums, snare(0.25 + 0.08 * k), 23.5 + k * 0.125)

for k in range(int(14 / 0.125)):
    t = 12.0 + k * 0.125
    c = chord_at(t, DROP)
    # 贝斯：八分音符，反拍八度
    if k % 2 == 0:
        m = BASS[c] + (12 if k % 4 == 2 else 0)
        n = int(0.24 * SR)
        tt_ = np.arange(n) / SR
        f = midi(m)
        sig = np.sin(2 * np.pi * f * tt_) * 0.7 + lp(saw(f, n), 600) * 0.35
        place(synth, sig * np.exp(-tt_ / 0.2) * 0.55, t)
    # pluck 琶音
    notes = CH[c]
    m = notes[[0, 2, 1, 3, 2, 1, 3, 2][k % 8]] + 24
    place(synth, pluck(midi(m), 0.12 + (0.05 if k % 4 == 0 else 0)), t)

for i, (t0, c) in enumerate(DROP):
    t1 = DROP[i + 1][0] if i + 1 < len(DROP) else 26.0
    place(synth, pad([midi(m + 12) for m in CH[c]], t1 - t0 + 0.2, 0.12, 2400), t0)

place(fx, riser(1.4, 0.32), 24.5)

# ---------------------------------------------------------------- 回落 26–30s
place(drums, kick(1.0, long=True), 26.0)
place(fx, boom(0.8), 26.0)
place(fx, crash(0.5, 3.5), 26.0)
place(warm, pad([midi(m) for m in CH['Dadd9']], 4.0, 0.2, 1100), 26.0)
for j, m in enumerate([50, 57, 62, 66, 69, 73, 76]):
    place(warm, piano(midi(m), 3.8 - j * 0.2, 0.42), 26.05 + j * 0.16)
place(warm, bell(midi(90), 3.5, 0.28), 27.0)
place(warm, piano(midi(81), 2.6, 0.35), 28.0)
place(warm, piano(midi(78), 2.0, 0.3), 28.5)

# ---------------------------------------------------------------- mix
synth *= kick_env
pad_duck = np.where(np.arange(N) / SR >= 12.0, kick_env, 1.0)
warm *= pad_duck

ir_n = int(2.2 * SR)
ir_t = np.arange(ir_n) / SR
ir = rng.standard_normal(ir_n) * np.exp(-ir_t / 0.55)
ir = lp(ir, 5000)
ir /= np.sqrt(np.sum(ir ** 2))
wet = fftconvolve(warm, ir)[:N]
wet_s = fftconvolve(synth * 0.4 + fx * 0.3, ir)[:N]

# 叙事段整体更轻：温情段 0.5，9–12s 推到 0.85，卡点段 1
bus = np.interp(t_all := np.arange(N) / SR, [0, 8.8, 11.8, 12.0, 30], [0.5, 0.55, 0.85, 1.0, 1.0])
warm *= bus
wet *= bus
fx_bus = np.interp(t_all, [0, 9, 12, 30], [0.7, 0.7, 1.0, 1.0])
fx *= fx_bus

left = warm * 0.8 + wet * 0.55 + drums + synth + fx + wet_s * 0.35
right = warm * 0.8 + np.roll(wet, 190) * 0.55 + drums + np.roll(synth, 60) + fx + np.roll(wet_s, 240) * 0.35

# 11.875–12 抽空；26 之后渐出
gate = np.where((t_all > 11.88) & (t_all < 12.0), 0.08, 1.0)
fade = np.clip((30.0 - t_all) / 1.6, 0, 1) ** 1.5
fade_in = np.clip(t_all / 0.3, 0, 1)
stereo = np.stack([left, right], 1) * (gate * fade * fade_in)[:, None]
stereo = np.tanh(stereo * 0.9)
stereo /= np.max(np.abs(stereo)) / 0.89

out = sys.argv[1] if len(sys.argv) > 1 else 'music.wav'
with wave.open(out, 'wb') as w:
    w.setnchannels(2)
    w.setsampwidth(2)
    w.setframerate(SR)
    w.writeframes((stereo * 32767).astype(np.int16).tobytes())
print('wrote', out)
