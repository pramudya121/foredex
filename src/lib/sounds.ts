// Audio notification system for transactions
// Uses Web Audio API to generate sounds without external files

class SoundManager {
  private audioContext: AudioContext | null = null;
  private enabled: boolean = true;
  private volume: number = 0.3;

  constructor() {
    // Load settings from localStorage
    const settings = localStorage.getItem('foredex-sounds');
    if (settings) {
      const parsed = JSON.parse(settings);
      this.enabled = parsed.enabled ?? true;
      this.volume = parsed.volume ?? 0.3;
    }
  }

  private getContext(): AudioContext {
    if (!this.audioContext) {
      this.audioContext = new AudioContext();
    }
    return this.audioContext;
  }

  private saveSettings() {
    localStorage.setItem('foredex-sounds', JSON.stringify({
      enabled: this.enabled,
      volume: this.volume,
    }));
  }

  private exponentialDecay(param: AudioParam, value: number, endTime: number) {
    const currentValue = param.value || 0.0001;
    param.setValueAtTime(currentValue, this.audioContext?.currentTime || 0);
    param.exponentialRampToValueAtTime(Math.max(value, 0.0001), endTime);
  }

  setEnabled(enabled: boolean) {
    this.enabled = enabled;
    this.saveSettings();
  }

  setVolume(volume: number) {
    this.volume = Math.max(0, Math.min(1, volume));
    this.saveSettings();
  }

  isEnabled() {
    return this.enabled;
  }

  getVolume() {
    return this.volume;
  }

  // Success sound - ascending tones
  playSuccess() {
    if (!this.enabled) return;
    
    const ctx = this.getContext();
    const now = ctx.currentTime;
    
    // Create oscillator
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    
    osc.connect(gain);
    gain.connect(ctx.destination);
    
    osc.type = 'sine';
    
    // Ascending notes
    osc.frequency.setValueAtTime(523.25, now); // C5
    osc.frequency.setValueAtTime(659.25, now + 0.1); // E5
    osc.frequency.setValueAtTime(783.99, now + 0.2); // G5
    
    gain.gain.setValueAtTime(this.volume, now);
    this.exponentialDecay(gain.gain, 0.01, now + 0.4);
    
    osc.start(now);
    osc.stop(now + 0.4);
  }

  // Error sound - descending tones
  playError() {
    if (!this.enabled) return;
    
    const ctx = this.getContext();
    const now = ctx.currentTime;
    
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    
    osc.connect(gain);
    gain.connect(ctx.destination);
    
    osc.type = 'sawtooth';
    
    // Descending harsh sound
    osc.frequency.setValueAtTime(400, now);
    osc.frequency.exponentialRampToValueAtTime(200, now + 0.3);
    
    gain.gain.setValueAtTime(this.volume * 0.5, now);
    this.exponentialDecay(gain.gain, 0.01, now + 0.3);
    
    osc.start(now);
    osc.stop(now + 0.3);
  }

  // Pending/notification sound - single tone
  playNotification() {
    if (!this.enabled) return;
    
    const ctx = this.getContext();
    const now = ctx.currentTime;
    
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    
    osc.connect(gain);
    gain.connect(ctx.destination);
    
    osc.type = 'sine';
    osc.frequency.setValueAtTime(880, now); // A5
    
    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(this.volume, now + 0.05);
    this.exponentialDecay(gain.gain, 0.01, now + 0.2);
    
    osc.start(now);
    osc.stop(now + 0.2);
  }

  // Swap sound - swoosh effect
  playSwap() {
    if (!this.enabled) return;
    
    const ctx = this.getContext();
    const now = ctx.currentTime;
    
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    
    osc.connect(gain);
    gain.connect(ctx.destination);
    
    osc.type = 'sine';
    
    // Swoosh from low to high
    osc.frequency.setValueAtTime(200, now);
    osc.frequency.exponentialRampToValueAtTime(600, now + 0.15);
    osc.frequency.exponentialRampToValueAtTime(400, now + 0.25);
    
    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(this.volume * 0.6, now + 0.08);
    this.exponentialDecay(gain.gain, 0.01, now + 0.25);
    
    osc.start(now);
    osc.stop(now + 0.25);
  }

  // Coin/token sound
  playCoin() {
    if (!this.enabled) return;
    
    const ctx = this.getContext();
    const now = ctx.currentTime;
    
    const osc1 = ctx.createOscillator();
    const osc2 = ctx.createOscillator();
    const gain = ctx.createGain();
    
    osc1.connect(gain);
    osc2.connect(gain);
    gain.connect(ctx.destination);
    
    osc1.type = 'sine';
    osc2.type = 'sine';
    
    // Two tones for coin sound
    osc1.frequency.setValueAtTime(1318.51, now); // E6
    osc2.frequency.setValueAtTime(1567.98, now + 0.08); // G6
    
    gain.gain.setValueAtTime(this.volume * 0.4, now);
    this.exponentialDecay(gain.gain, 0.01, now + 0.3);
    
    osc1.start(now);
    osc1.stop(now + 0.15);
    osc2.start(now + 0.08);
    osc2.stop(now + 0.3);
  }

  // Click sound - subtle feedback
  playClick() {
    if (!this.enabled) return;
    
    const ctx = this.getContext();
    const now = ctx.currentTime;
    
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    
    osc.connect(gain);
    gain.connect(ctx.destination);
    
    osc.type = 'sine';
    osc.frequency.setValueAtTime(1000, now);
    
    gain.gain.setValueAtTime(this.volume * 0.3, now);
    this.exponentialDecay(gain.gain, 0.01, now + 0.05);
    
    osc.start(now);
    osc.stop(now + 0.05);
  }

  // Liquidity added sound - rising bubbles
  playLiquidity() {
    if (!this.enabled) return;
    
    const ctx = this.getContext();
    const now = ctx.currentTime;
    
    // Multiple bubble sounds
    for (let i = 0; i < 4; i++) {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      
      osc.connect(gain);
      gain.connect(ctx.destination);
      
      osc.type = 'sine';
      const startFreq = 300 + Math.random() * 200;
      const time = now + i * 0.1;
      
      osc.frequency.setValueAtTime(startFreq, time);
      osc.frequency.exponentialRampToValueAtTime(startFreq * 2, time + 0.1);
      
      gain.gain.setValueAtTime(0, time);
      gain.gain.linearRampToValueAtTime(this.volume * 0.2, time + 0.02);
      this.exponentialDecay(gain.gain, 0.01, time + 0.15);
      
      osc.start(time);
      osc.stop(time + 0.15);
    }
  }

  // Alert sound - attention grabber
  playAlert() {
    if (!this.enabled) return;
    
    const ctx = this.getContext();
    const now = ctx.currentTime;
    
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    
    osc.connect(gain);
    gain.connect(ctx.destination);
    
    osc.type = 'sine';
    
    // Two-tone alert
    osc.frequency.setValueAtTime(880, now);
    osc.frequency.setValueAtTime(1100, now + 0.15);
    osc.frequency.setValueAtTime(880, now + 0.3);
    osc.frequency.setValueAtTime(1100, now + 0.45);
    
    gain.gain.setValueAtTime(this.volume * 0.5, now);
    this.exponentialDecay(gain.gain, 0.01, now + 0.6);
    
    osc.start(now);
    osc.stop(now + 0.6);
  }

  // Limit order filled sound - satisfying completion
  playOrderFilled() {
    if (!this.enabled) return;
    
    const ctx = this.getContext();
    const now = ctx.currentTime;
    
    const osc1 = ctx.createOscillator();
    const osc2 = ctx.createOscillator();
    const osc3 = ctx.createOscillator();
    const gain = ctx.createGain();
    
    osc1.connect(gain);
    osc2.connect(gain);
    osc3.connect(gain);
    gain.connect(ctx.destination);
    
    osc1.type = 'sine';
    osc2.type = 'sine';
    osc3.type = 'sine';
    
    // Major chord progression
    osc1.frequency.setValueAtTime(523.25, now); // C5
    osc2.frequency.setValueAtTime(659.25, now + 0.1); // E5
    osc3.frequency.setValueAtTime(783.99, now + 0.2); // G5
    
    gain.gain.setValueAtTime(this.volume * 0.5, now);
    this.exponentialDecay(gain.gain, 0.01, now + 0.5);
    
    osc1.start(now);
    osc1.stop(now + 0.3);
    osc2.start(now + 0.1);
    osc2.stop(now + 0.4);
    osc3.start(now + 0.2);
    osc3.stop(now + 0.5);
  }
}

// Polyfill for exponentialDecayTo if not available
if (!GainNode.prototype.hasOwnProperty('exponentialDecayTo')) {
  Object.defineProperty(AudioParam.prototype, 'exponentialDecayTo', {
    value: function(value: number, endTime: number) {
      this.setValueAtTime(this.value || 0.0001, this.context.currentTime);
      this.exponentialRampToValueAtTime(Math.max(value, 0.0001), endTime);
    }
  });
}

// Singleton instance
export const soundManager = new SoundManager();

// Convenience functions
export const playSuccessSound = () => soundManager.playSuccess();
export const playErrorSound = () => soundManager.playError();
export const playNotificationSound = () => soundManager.playNotification();
export const playSwapSound = () => soundManager.playSwap();
export const playCoinSound = () => soundManager.playCoin();
export const playClickSound = () => soundManager.playClick();
export const playLiquiditySound = () => soundManager.playLiquidity();
export const playAlertSound = () => soundManager.playAlert();
export const playOrderFilledSound = () => soundManager.playOrderFilled();
