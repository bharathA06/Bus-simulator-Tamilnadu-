import { WeatherId } from '../game/constants';

/**
 * Procedural Web Audio Engine for Tamil Nadu Bus Simulator
 * 100% zero external audio asset dependencies.
 */
class BusAudioEngine {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private sfxGain: GainNode | null = null;
  private musicGain: GainNode | null = null;
  private masterVolume: number = 0.8;
  private musicVolume: number = 0.45;
  private isMuted: boolean = false;
  private isStandbyPaused: boolean = false;

  // Multi-harmonic 6-cyl turbo diesel engine nodes
  private engineGain: GainNode | null = null;
  private engineOsc: OscillatorNode | null = null;
  private subOsc: OscillatorNode | null = null;
  private turboOsc: OscillatorNode | null = null;
  private turboGain: GainNode | null = null;
  private engineFilter: BiquadFilterNode | null = null;
  private isEngineRunning: boolean = false;

  // Ambient highway music / Tamil FM radio timer
  private musicIntervalId: number | null = null;
  private musicStep: number = 0;
  private radioStationId: number = 1; // 0=OFF, 1=Kovai, 2=Chennai, 3=Madurai

  // Horn state
  private activeHornNodes: Array<{ osc: OscillatorNode; gain: GainNode }> = [];
  private hornTimeoutId: number | null = null;

  // Weather rain soundscape
  private rainGain: GainNode | null = null;
  private rainFilter: BiquadFilterNode | null = null;
  private rainSource: AudioBufferSourceNode | null = null;
  private currentWeather: WeatherId = 'sunny';

  private lastSkidTime: number = 0;

  private initCtx() {
    if (typeof window === 'undefined' || this.isMuted) return;
    if (!this.ctx) {
      const AudioCtx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!AudioCtx) return;
      this.ctx = new AudioCtx();

      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.setValueAtTime(this.isMuted ? 0 : this.masterVolume, this.ctx.currentTime);
      this.masterGain.connect(this.ctx.destination);

      this.sfxGain = this.ctx.createGain();
      this.sfxGain.gain.setValueAtTime(1.0, this.ctx.currentTime);
      this.sfxGain.connect(this.masterGain);

      this.musicGain = this.ctx.createGain();
      this.musicGain.gain.setValueAtTime(this.isMuted ? 0 : this.musicVolume * 0.16, this.ctx.currentTime);
      this.musicGain.connect(this.masterGain);
    }
    if (this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
  }

  private getOutputNode(): AudioNode {
    return this.sfxGain || this.masterGain || this.ctx!.destination;
  }

  public setMasterVolume(volPercent: number) {
    this.masterVolume = Math.max(0, Math.min(1, volPercent / 100));
    if (this.masterGain && this.ctx) {
      this.masterGain.gain.setTargetAtTime(this.isMuted ? 0 : this.masterVolume, this.ctx.currentTime, 0.04);
    }
  }

  public setMusicVolume(volPercent: number) {
    this.musicVolume = Math.max(0, Math.min(1, volPercent / 100));
    if (this.musicGain && this.ctx) {
      this.musicGain.gain.setTargetAtTime(
        this.isMuted ? 0 : this.musicVolume * 0.16,
        this.ctx.currentTime,
        0.06
      );
    }
    if (this.musicVolume > 0.02 && this.ctx && !this.musicIntervalId) {
      this.startAmbientMusic();
    }
  }

  private get effectiveMuted(): boolean {
    return this.isMuted || this.isStandbyPaused;
  }

  private syncEffectiveMuteState() {
    const silenced = this.effectiveMuted;
    if (this.masterGain && this.ctx) {
      this.masterGain.gain.setValueAtTime(silenced ? 0 : this.masterVolume, this.ctx.currentTime);
    }
    if (this.musicGain && this.ctx) {
      this.musicGain.gain.setValueAtTime(
        silenced || this.radioStationId === 0 ? 0 : this.musicVolume * 0.16,
        this.ctx.currentTime
      );
    }
    if (this.engineGain && this.ctx && silenced) {
      this.engineGain.gain.setValueAtTime(0, this.ctx.currentTime);
    }
    if (this.rainGain && this.ctx) {
      const targetGain = silenced
        ? 0
        : this.currentWeather === 'rain'
        ? 0.15
        : this.currentWeather === 'cloudy'
        ? 0.03
        : 0;
      this.rainGain.gain.setValueAtTime(targetGain, this.ctx.currentTime);
    }
    if (silenced) {
      this.stopHorn();
      this.cancelSpeech();
    }
  }

  public setMuted(muted: boolean) {
    this.isMuted = muted;
    this.syncEffectiveMuteState();
  }

  public setStandbyPaused(paused: boolean) {
    this.isStandbyPaused = paused;
    this.syncEffectiveMuteState();
  }

  public getMuted(): boolean {
    return this.isMuted;
  }

  public cancelSpeech() {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      try {
        window.speechSynthesis.cancel();
      } catch {
        // Ignore speech synthesis errors
      }
    }
  }

  public setRadioStation(stationId: number) {
    this.radioStationId = stationId;
    if (this.musicGain && this.ctx) {
      this.musicGain.gain.setTargetAtTime(
        this.isMuted || stationId === 0 ? 0 : this.musicVolume * 0.16,
        this.ctx.currentTime,
        0.06
      );
    }
    if (stationId > 0) {
      this.initCtx();
      this.startAmbientMusic();
    }
  }

  public startAmbientMusic() {
    if (typeof window === 'undefined' || this.musicIntervalId !== null) return;
    // Station-specific synth scales (1: Kovai Carnatic, 2: Chennai Mass Beat, 3: Madurai Twilight)
    const stationScales: Record<number, number[]> = {
      1: [220, 246.94, 277.18, 329.63, 369.99, 440],
      2: [146.83, 196.0, 220.0, 261.63, 293.66, 392.0],
      3: [196.0, 220.0, 246.94, 293.66, 329.63, 392.0],
    };
    const pattern = [0, 2, 4, 3, 1, 2, 5, 3];
    this.musicIntervalId = window.setInterval(() => {
      if (!this.ctx || !this.musicGain || this.effectiveMuted || this.musicVolume <= 0.02 || this.radioStationId === 0) return;
      if (this.ctx.state !== 'running') return;
      const now = this.ctx.currentTime;
      const scale = stationScales[this.radioStationId] || stationScales[1];
      const freq = scale[pattern[this.musicStep % pattern.length]];
      this.musicStep += 1;

      const osc = this.ctx.createOscillator();
      const noteGain = this.ctx.createGain();
      const filter = this.ctx.createBiquadFilter();
      osc.type = this.radioStationId === 2 ? 'sawtooth' : 'triangle';
      osc.frequency.setValueAtTime(freq, now);
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(this.radioStationId === 2 ? 960 : 680, now);

      noteGain.gain.setValueAtTime(0.001, now);
      noteGain.gain.linearRampToValueAtTime(this.radioStationId === 2 ? 0.22 : 0.28, now + 0.18);
      noteGain.gain.exponentialRampToValueAtTime(0.001, now + 1.3);

      osc.connect(filter);
      filter.connect(noteGain);
      noteGain.connect(this.musicGain);
      osc.start(now);
      osc.stop(now + 1.35);
    }, 1150);
  }

  public startEngine() {
    this.initCtx();
    if (!this.ctx) return;
    if (this.musicVolume > 0.02) {
      this.startAmbientMusic();
    }
    if (this.isEngineRunning) return;

    try {
      const now = this.ctx.currentTime;
      this.engineGain = this.ctx.createGain();
      this.engineGain.gain.setValueAtTime(this.isMuted ? 0 : 0.12, now);

      this.engineFilter = this.ctx.createBiquadFilter();
      this.engineFilter.type = 'lowpass';
      this.engineFilter.frequency.setValueAtTime(260, now);

      this.engineOsc = this.ctx.createOscillator();
      this.engineOsc.type = 'sawtooth';
      this.engineOsc.frequency.setValueAtTime(34, now);

      this.subOsc = this.ctx.createOscillator();
      this.subOsc.type = 'triangle';
      this.subOsc.frequency.setValueAtTime(17, now);

      const subGain = this.ctx.createGain();
      subGain.gain.setValueAtTime(0.75, now);
      this.subOsc.connect(subGain);

      this.turboOsc = this.ctx.createOscillator();
      this.turboOsc.type = 'sine';
      this.turboOsc.frequency.setValueAtTime(1600, now);
      this.turboGain = this.ctx.createGain();
      this.turboGain.gain.setValueAtTime(0.0, now);
      this.turboOsc.connect(this.turboGain);
      this.turboGain.connect(this.getOutputNode());

      this.engineOsc.connect(this.engineFilter);
      subGain.connect(this.engineFilter);
      this.engineFilter.connect(this.engineGain);
      this.engineGain.connect(this.getOutputNode());

      this.engineOsc.start();
      this.subOsc.start();
      this.turboOsc.start();
      this.isEngineRunning = true;
    } catch {
      // Autoplay policy guard
    }
  }

  public updateEngine(speedKmh: number, throttle: number, rpm: number = 700) {
    if (!this.ctx || !this.isEngineRunning || !this.engineOsc || !this.subOsc || !this.engineFilter || !this.engineGain) return;
    if (this.isMuted) return;

    const now = this.ctx.currentTime;
    if (rpm < 100) {
      this.engineGain.gain.setTargetAtTime(0, now, 0.08);
      if (this.turboGain) this.turboGain.gain.setTargetAtTime(0, now, 0.08);
      return;
    }

    const rpmNorm = Math.max(0, Math.min(1, (rpm - 650) / 1950));
    const speedRatio = Math.min(Math.abs(speedKmh) / 85, 1);
    const targetFreq = 32 + rpmNorm * 68;
    const targetFilter = 190 + rpmNorm * 620 + (throttle > 0 ? 220 : 0);
    const targetGain = 0.08 + rpmNorm * 0.11 + (throttle > 0 ? 0.04 : 0);

    this.engineOsc.frequency.setTargetAtTime(targetFreq, now, 0.08);
    this.subOsc.frequency.setTargetAtTime(targetFreq * 0.5, now, 0.08);
    this.engineFilter.frequency.setTargetAtTime(targetFilter, now, 0.12);
    this.engineGain.gain.setTargetAtTime(this.isMuted ? 0 : targetGain, now, 0.08);

    if (this.turboOsc && this.turboGain) {
      const spool = Math.max(0, (rpmNorm - 0.35) / 0.65);
      this.turboOsc.frequency.setTargetAtTime(1500 + spool * 2600 + speedRatio * 400, now, 0.15);
      this.turboGain.gain.setTargetAtTime(this.isMuted ? 0 : spool * (throttle > 0 ? 0.022 : 0.008), now, 0.15);
    }
  }

  public playHorn(hornType: number = 0) {
    this.initCtx();
    if (!this.ctx || this.isMuted) return;
    this.stopHorn();

    const now = this.ctx.currentTime;

    if (hornType === 0) {
      const frequencies = [370, 466, 554, 740];
      frequencies.forEach((freq, idx) => {
        const osc = this.ctx!.createOscillator();
        const gain = this.ctx!.createGain();
        osc.type = idx % 2 === 0 ? 'sawtooth' : 'triangle';
        osc.frequency.setValueAtTime(freq, now);
        gain.gain.setValueAtTime(0.001, now);
        gain.gain.linearRampToValueAtTime(0.12, now + 0.04);
        gain.gain.setValueAtTime(0.12, now + 0.4);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.7);
        osc.connect(gain);
        gain.connect(this.getOutputNode());
        osc.start(now);
        osc.stop(now + 0.75);
        this.activeHornNodes.push({ osc, gain });
      });
    } else if (hornType === 1) {
      const notes = [440, 493, 554, 587, 659, 740];
      notes.forEach((freq, i) => {
        const startT = now + i * 0.08;
        const osc = this.ctx!.createOscillator();
        const gain = this.ctx!.createGain();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(freq, startT);
        gain.gain.setValueAtTime(0.001, startT);
        gain.gain.linearRampToValueAtTime(0.14, startT + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.001, startT + 0.22);
        osc.connect(gain);
        gain.connect(this.getOutputNode());
        osc.start(startT);
        osc.stop(startT + 0.25);
        this.activeHornNodes.push({ osc, gain });
      });
    } else if (hornType === 2) {
      const frequencies = [220, 277, 330, 440];
      frequencies.forEach((freq) => {
        const osc = this.ctx!.createOscillator();
        const gain = this.ctx!.createGain();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(freq, now);
        gain.gain.setValueAtTime(0.001, now);
        gain.gain.linearRampToValueAtTime(0.15, now + 0.05);
        gain.gain.setValueAtTime(0.15, now + 0.4);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.65);
        osc.connect(gain);
        gain.connect(this.getOutputNode());
        osc.start(now);
        osc.stop(now + 0.7);
        this.activeHornNodes.push({ osc, gain });
      });
    } else {
      const frequencies = [330, 415, 493, 660];
      frequencies.forEach((freq) => {
        const osc = this.ctx!.createOscillator();
        const gain = this.ctx!.createGain();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(freq, now);
        gain.gain.setValueAtTime(0.001, now);
        gain.gain.linearRampToValueAtTime(0.13, now + 0.03);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.55);
        osc.connect(gain);
        gain.connect(this.getOutputNode());
        osc.start(now);
        osc.stop(now + 0.6);
        this.activeHornNodes.push({ osc, gain });
      });
    }
  }

  public startHorn(hornType: number = 0) {
    this.initCtx();
    if (!this.ctx || this.isMuted) return;
    if (this.activeHornNodes.length > 0) return;

    const now = this.ctx.currentTime;
    const freqMap: Record<number, number[]> = {
      0: [370, 466, 554, 740],
      1: [440, 554, 659, 880],
      2: [220, 277, 330, 440],
      3: [330, 415, 493, 660],
    };
    const freqs = freqMap[hornType] || freqMap[0];

    freqs.forEach((freq, idx) => {
      const osc = this.ctx!.createOscillator();
      const gain = this.ctx!.createGain();
      osc.type = idx % 2 === 0 ? 'sawtooth' : 'triangle';
      osc.frequency.setValueAtTime(freq, now);
      gain.gain.setValueAtTime(0.001, now);
      gain.gain.linearRampToValueAtTime(0.11, now + 0.04);
      osc.connect(gain);
      gain.connect(this.getOutputNode());
      osc.start(now);
      this.activeHornNodes.push({ osc, gain });
    });

    this.hornTimeoutId = window.setTimeout(() => this.stopHorn(), 5000);
  }

  public stopHorn() {
    if (this.hornTimeoutId) {
      clearTimeout(this.hornTimeoutId);
      this.hornTimeoutId = null;
    }
    this.activeHornNodes.forEach(({ osc, gain }) => {
      try {
        if (this.ctx) {
          gain.gain.setTargetAtTime(0.0001, this.ctx.currentTime, 0.02);
        }
        osc.stop(this.ctx ? this.ctx.currentTime + 0.04 : 0);
        setTimeout(() => {
          try {
            osc.disconnect();
          } catch {
            // Ignored
          }
        }, 60);
      } catch {
        // Ignored
      }
    });
    this.activeHornNodes = [];
  }

  public playWhistle() {
    this.initCtx();
    if (!this.ctx || this.isMuted) return;
    const now = this.ctx.currentTime;
    this.synthesizeWhistleChirp(now, 0.16);
    this.synthesizeWhistleChirp(now + 0.22, 0.22);
  }

  private synthesizeWhistleChirp(startTime: number, duration: number) {
    if (!this.ctx) return;
    const osc = this.ctx.createOscillator();
    const vibrato = this.ctx.createOscillator();
    const vibratoGain = this.ctx.createGain();
    const gain = this.ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(2600, startTime);
    osc.frequency.linearRampToValueAtTime(2850, startTime + duration * 0.4);

    vibrato.frequency.setValueAtTime(26, startTime);
    vibratoGain.gain.setValueAtTime(140, startTime);
    vibrato.connect(osc.frequency);

    gain.gain.setValueAtTime(0.001, startTime);
    gain.gain.linearRampToValueAtTime(0.2, startTime + 0.02);
    gain.gain.setValueAtTime(0.18, startTime + duration - 0.04);
    gain.gain.exponentialRampToValueAtTime(0.001, startTime + duration);

    osc.connect(gain);
    gain.connect(this.getOutputNode());

    vibrato.start(startTime);
    osc.start(startTime);
    vibrato.stop(startTime + duration);
    osc.stop(startTime + duration);
  }

  public playGearShift() {
    this.initCtx();
    if (!this.ctx || this.isMuted) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(220, now);
    osc.frequency.exponentialRampToValueAtTime(110, now + 0.06);
    gain.gain.setValueAtTime(0.09, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.07);
    osc.connect(gain);
    gain.connect(this.getOutputNode());
    osc.start(now);
    osc.stop(now + 0.075);
  }

  public playTollBeep() {
    this.initCtx();
    if (!this.ctx || this.isMuted) return;
    const now = this.ctx.currentTime;
    [880, 1174].forEach((f, idx) => {
      const osc = this.ctx!.createOscillator();
      const gain = this.ctx!.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(f, now + idx * 0.09);
      gain.gain.setValueAtTime(0.11, now + idx * 0.09);
      gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.09 + 0.14);
      osc.connect(gain);
      gain.connect(this.getOutputNode());
      osc.start(now + idx * 0.09);
      osc.stop(now + idx * 0.09 + 0.15);
    });
  }

  public playRefuelSound() {
    this.initCtx();
    if (!this.ctx || this.isMuted) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(520, now);
    osc.frequency.linearRampToValueAtTime(780, now + 0.3);
    gain.gain.setValueAtTime(0.1, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);
    osc.connect(gain);
    gain.connect(this.getOutputNode());
    osc.start(now);
    osc.stop(now + 0.36);
  }

  public playIgnitionCrank() {
    this.initCtx();
    if (!this.ctx || this.isMuted) return;
    const now = this.ctx.currentTime;
    [0, 0.14, 0.28].forEach((offset) => {
      const osc = this.ctx!.createOscillator();
      const gain = this.ctx!.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(115, now + offset);
      osc.frequency.linearRampToValueAtTime(160, now + offset + 0.1);
      gain.gain.setValueAtTime(0.14, now + offset);
      gain.gain.exponentialRampToValueAtTime(0.001, now + offset + 0.12);
      osc.connect(gain);
      gain.connect(this.getOutputNode());
      osc.start(now + offset);
      osc.stop(now + offset + 0.125);
    });
  }

  public playTicketPunch() {
    this.initCtx();
    if (!this.ctx || this.isMuted) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'square';
    osc.frequency.setValueAtTime(1400, now);
    osc.frequency.exponentialRampToValueAtTime(600, now + 0.04);
    gain.gain.setValueAtTime(0.08, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.045);
    osc.connect(gain);
    gain.connect(this.getOutputNode());
    osc.start(now);
    osc.stop(now + 0.05);
  }

  private lastVoiceNavMs = 0;

  public speakNavInstruction(phrase: string, enabled: boolean = true) {
    if (!enabled || this.isMuted || typeof window === 'undefined' || !('speechSynthesis' in window)) return;
    const now = Date.now();
    if (now - this.lastVoiceNavMs < 4800) return;
    this.lastVoiceNavMs = now;
    try {
      const utter = new SpeechSynthesisUtterance(phrase);
      utter.rate = 1.04;
      utter.pitch = 1.0;
      utter.volume = Math.min(0.85, this.masterVolume);
      window.speechSynthesis.speak(utter);
    } catch {
      // Speech synthesis unsupported
    }
  }

  public announceBusStop(stopNameEn: string, isDeparture: boolean = false) {
    this.playTollBeep();
    if (typeof window !== 'undefined' && 'speechSynthesis' in window && !this.isMuted) {
      try {
        window.speechSynthesis.cancel();
        const phrase = isDeparture
          ? `Departing for ${stopNameEn}. Please fasten your seatbelts.`
          : `Next terminal stop: ${stopNameEn}.`;
        const utter = new SpeechSynthesisUtterance(phrase);
        utter.rate = 1.0;
        utter.pitch = 1.0;
        utter.volume = Math.min(1, this.masterVolume);
        window.speechSynthesis.speak(utter);
      } catch {
        // Speech synthesis unsupported
      }
    }
  }

  public playAirBrakeHiss() {
    this.initCtx();
    if (!this.ctx || this.isMuted) return;
    const bufferSize = this.ctx.sampleRate * 0.4;
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) data[i] = Math.random() * 2 - 1;

    const noise = this.ctx.createBufferSource();
    noise.buffer = buffer;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(1800, this.ctx.currentTime);
    filter.Q.setValueAtTime(2.0, this.ctx.currentTime);

    const gain = this.ctx.createGain();
    const now = this.ctx.currentTime;
    gain.gain.setValueAtTime(0.15, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.4);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(this.getOutputNode());
    noise.start(now);
  }

  public playDoorSound() {
    this.initCtx();
    if (!this.ctx || this.isMuted) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(140, now);
    osc.frequency.exponentialRampToValueAtTime(80, now + 0.35);
    gain.gain.setValueAtTime(0.12, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);
    osc.connect(gain);
    gain.connect(this.getOutputNode());
    osc.start(now);
    osc.stop(now + 0.35);
    this.playAirBrakeHiss();
  }

  public playFareChime() {
    this.initCtx();
    if (!this.ctx || this.isMuted) return;
    const now = this.ctx.currentTime;
    [1046, 1318, 1568].forEach((freq, idx) => {
      const osc = this.ctx!.createOscillator();
      const gain = this.ctx!.createGain();
      const startT = now + idx * 0.07;
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, startT);
      gain.gain.setValueAtTime(0.14, startT);
      gain.gain.exponentialRampToValueAtTime(0.001, startT + 0.35);
      osc.connect(gain);
      gain.connect(this.getOutputNode());
      osc.start(startT);
      osc.stop(startT + 0.4);
    });
  }

  public playCrashSound() {
    this.initCtx();
    if (!this.ctx || this.isMuted) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(90, now);
    osc.frequency.exponentialRampToValueAtTime(30, now + 0.28);
    gain.gain.setValueAtTime(0.25, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.3);
    osc.connect(gain);
    gain.connect(this.getOutputNode());
    osc.start(now);
    osc.stop(now + 0.3);
  }

  private ensureRainLoop() {
    if (!this.ctx || this.rainSource) return;
    try {
      const bufferSize = this.ctx.sampleRate * 2;
      const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
      const data = buffer.getChannelData(0);
      let lastOut = 0.0;
      for (let i = 0; i < bufferSize; i++) {
        const white = Math.random() * 2 - 1;
        data[i] = (lastOut + 0.02 * white) / 1.02;
        lastOut = data[i];
      }
      this.rainSource = this.ctx.createBufferSource();
      this.rainSource.buffer = buffer;
      this.rainSource.loop = true;

      this.rainFilter = this.ctx.createBiquadFilter();
      this.rainFilter.type = 'lowpass';
      this.rainFilter.frequency.setValueAtTime(2800, this.ctx.currentTime);

      this.rainGain = this.ctx.createGain();
      this.rainGain.gain.setValueAtTime(0, this.ctx.currentTime);

      this.rainSource.connect(this.rainFilter);
      this.rainFilter.connect(this.rainGain);
      this.rainGain.connect(this.getOutputNode());
      this.rainSource.start();
    } catch {
      // Ignored
    }
  }

  public setWeather(weather: WeatherId) {
    this.currentWeather = weather;
    this.initCtx();
    if (!this.ctx) return;
    this.ensureRainLoop();
    if (!this.rainGain || !this.rainFilter) return;

    const now = this.ctx.currentTime;
    if (this.isMuted || weather === 'sunny' || weather === 'fog') {
      this.rainGain.gain.setTargetAtTime(0, now, 0.4);
    } else if (weather === 'cloudy') {
      this.rainFilter.frequency.setTargetAtTime(2600, now, 0.3);
      this.rainGain.gain.setTargetAtTime(0.025, now, 0.5);
    } else if (weather === 'rain') {
      this.rainFilter.frequency.setTargetAtTime(1850, now, 0.3);
      this.rainGain.gain.setTargetAtTime(0.14, now, 0.4);
    }
  }

  public playThunder() {
    this.initCtx();
    if (!this.ctx || this.isMuted) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const oscGain = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(80, now);
    osc.frequency.exponentialRampToValueAtTime(28, now + 1.8);
    oscGain.gain.setValueAtTime(0.22, now);
    oscGain.gain.exponentialRampToValueAtTime(0.001, now + 2.2);
    osc.connect(oscGain);
    oscGain.connect(this.getOutputNode());
    osc.start(now);
    osc.stop(now + 2.3);

    try {
      const bufferSize = Math.floor(this.ctx.sampleRate * 2.5);
      const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) data[i] = Math.random() * 2 - 1;
      const noise = this.ctx.createBufferSource();
      noise.buffer = buffer;
      const filter = this.ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(160, now);
      filter.frequency.linearRampToValueAtTime(90, now + 2.2);
      const noiseGain = this.ctx.createGain();
      noiseGain.gain.setValueAtTime(0.001, now);
      noiseGain.gain.linearRampToValueAtTime(0.18, now + 0.1);
      noiseGain.gain.exponentialRampToValueAtTime(0.001, now + 2.4);
      noise.connect(filter);
      filter.connect(noiseGain);
      noiseGain.connect(this.getOutputNode());
      noise.start(now);
    } catch {
      // Ignored
    }
  }

  public playTireSkid() {
    this.initCtx();
    if (!this.ctx || this.isMuted) return;
    const now = this.ctx.currentTime;
    if (now - this.lastSkidTime < 0.35) return;
    this.lastSkidTime = now;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    const filter = this.ctx.createBiquadFilter();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(420 + Math.random() * 80, now);
    osc.frequency.exponentialRampToValueAtTime(260, now + 0.28);
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(600, now);
    filter.Q.setValueAtTime(3.0, now);
    gain.gain.setValueAtTime(0.08, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.28);
    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.getOutputNode());
    osc.start(now);
    osc.stop(now + 0.3);
  }

  public playIndicatorClick(highPitch: boolean = true) {
    this.initCtx();
    if (!this.ctx || this.isMuted) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(highPitch ? 920 : 680, now);
    osc.frequency.exponentialRampToValueAtTime(180, now + 0.025);
    gain.gain.setValueAtTime(0.06, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.03);
    osc.connect(gain);
    gain.connect(this.getOutputNode());
    osc.start(now);
    osc.stop(now + 0.035);
  }

  public playUiClick() {
    this.initCtx();
    if (!this.ctx || this.isMuted) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(520, now);
    osc.frequency.exponentialRampToValueAtTime(280, now + 0.025);
    gain.gain.setValueAtTime(0.05, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.03);
    osc.connect(gain);
    gain.connect(this.getOutputNode());
    osc.start(now);
    osc.stop(now + 0.032);
  }
}

export const busAudio = new BusAudioEngine();
