import wave, struct, math, sys, random

RATE  = 44100
OUT   = sys.argv[1] if len(sys.argv) > 1 else '/tmp/bg.wav'
TOTAL = float(sys.argv[2]) if len(sys.argv) > 2 else 42.0
BPM   = 128
BEAT  = 60.0 / BPM

samples = int(RATE * TOTAL)
buf = [0.0] * samples

def place(sig, start_sec):
    start = int(start_sec * RATE)
    for i, v in enumerate(sig):
        idx = start + i
        if idx < samples:
            buf[idx] = max(-1.0, min(1.0, buf[idx] + v))

def sine_wave(freq, dur, amp=0.5):
    n = int(RATE * dur)
    return [amp * math.sin(2 * math.pi * freq * i / RATE) *
            (min(i, n-i, int(0.01*RATE)) / max(int(0.01*RATE), 1))
            for i in range(n)]

def kick(dur=0.25):
    n = int(RATE * dur)
    result = []
    for i in range(n):
        t = i / RATE
        freq = 150 * math.exp(-25 * t)
        env = max(0, 1 - i / (n * 0.8))
        result.append(0.9 * math.sin(2 * math.pi * freq * t) * env)
    return result

def snare(dur=0.12):
    n = int(RATE * dur)
    random.seed(42)
    return [(random.random() * 2 - 1) * 0.5 * max(0, 1 - i/(n*0.7)) +
            0.3 * math.sin(2*math.pi*220*i/RATE) * max(0, 1-i/n)
            for i in range(n)]

def hihat(dur=0.04):
    n = int(RATE * dur)
    random.seed(7)
    return [(random.random()*2-1) * 0.2 * max(0, 1 - i/n) for i in range(n)]

def bass(freq, dur):
    n = int(RATE * dur)
    return [0.45 * math.sin(2*math.pi*freq*i/RATE) *
            max(0, min(i/(RATE*0.005), 1, (n-i)/(RATE*0.1)))
            for i in range(n)]

# Pattern: 4-beat bar, loop for total duration
bar = BEAT * 4
t = 0.0
while t < TOTAL:
    place(kick(), t)
    place(kick(), t + BEAT*2)
    place(snare(), t + BEAT)
    place(snare(), t + BEAT*3)
    for i in range(8):
        place(hihat(), t + i * BEAT/2)
    # Bass: Am pentatonic
    seq = [110, 110, 130, 165, 130, 110, 196, 165]
    for i, f in enumerate(seq):
        place(bass(f, BEAT*0.4), t + i * BEAT/2)
    # Simple pad
    for i, f in enumerate([220, 175, 130, 196]):
        place(sine_wave(f, BEAT*0.9, 0.12), t + i*BEAT)
        place(sine_wave(f*1.5, BEAT*0.9, 0.08), t + i*BEAT)
    t += bar

# Normalize + fade out
peak = max(abs(x) for x in buf) or 1.0
fade = int(2 * RATE)
buf = [x / peak * 0.85 for x in buf]
for i in range(fade):
    buf[samples - fade + i] *= (1 - i/fade)

with wave.open(OUT, 'w') as wf:
    wf.setnchannels(1)
    wf.setsampwidth(2)
    wf.setframerate(RATE)
    wf.writeframes(b''.join(struct.pack('<h', int(v * 32767)) for v in buf))
print(f'Done: {TOTAL}s -> {OUT}')
