namespace PH {
    export interface SoundPlayerSettings {
        fadeTime?: number;
    }

    class SoundFader {
        audioContext: AudioContext
        soundGainNode: GainNode;
        dur: number;
        fadeDest: number = 1.0;

        constructor(audioContext: AudioContext, dur: number) {
            this.audioContext = audioContext;
            this.soundGainNode = audioContext.createGain();
            this.soundGainNode.gain.value = this.fadeDest;
            this.dur = dur;
        }

        fade(fadeDest: number) {
            let curT = this.audioContext!.currentTime;
            let timeConstant = this.dur / 5;
            this.soundGainNode.gain.cancelScheduledValues(curT);
            this.soundGainNode.gain.setTargetAtTime(fadeDest, curT, timeConstant);
            this.soundGainNode.gain.setValueAtTime(fadeDest, curT + this.dur);
            this.fadeDest = fadeDest;
        }
    }

    export class SoundPlayer {
        audioContext: AudioContext;
        fader: SoundFader | null = null;
        settings: SoundPlayerSettings;

        constructor(audioContext: AudioContext,settings: SoundPlayerSettings) {
            this.audioContext = audioContext;
            this.settings = settings;
        }

        init() {
            this.fader = new SoundFader(this.audioContext, this.settings.fadeTime || 0.25);
            this.fader.soundGainNode.connect(this.audioContext.destination);
        }

        playSound(sound: AudioBuffer, loop: boolean, startTime?: number): AudioBufferSourceNode {
            let source = this.audioContext!.createBufferSource();
            source.buffer = sound;
            source.loop = loop;
            source.connect(this.fader!.soundGainNode);
            source.start(startTime || this.audioContext!.currentTime);
            return source;
        }

        stopSound(sound: AudioBufferSourceNode) {
            sound.stop(0);
        }

        toggle() {
            this.fader!.fade(1.0 - this.fader!.fadeDest);
        }
    }

    export class JukeBox {
        soundPlayer: SoundPlayer;
        tracks: AudioBuffer[] = [];
        nextIdx = 0;
        curSound: AudioBufferSourceNode | null = null;
        nextSound: AudioBufferSourceNode | null = null;
        nextSoundStartTime: number | null = null;
        nextTimeout: number | null = null;

        constructor(soundPlayer: SoundPlayer) {
            this.soundPlayer = soundPlayer;
        }

        setMusic(...tracks: AudioBuffer[]) {
            this.cancel();
            this.tracks = tracks;
            let ct = this.soundPlayer.audioContext!.currentTime;
            if (tracks.length === 0) {
                this.nextIdx = 0;
                this.curSound = null;
                this.nextSound = null;
            }
            else {
                this.nextIdx = 0;
                this.nextSound = this.startTrack(this.nextIdx, false, ct);
                this.nextSoundStartTime = ct;
                this.queueNextTrack();
            }
        }

        private startTrack(idx: number, loop: boolean, startTime: number) {
            return this.soundPlayer.playSound(this.tracks[idx], loop, startTime);
        }

        private cancel() {
            if(this.curSound !== null) {
                this.soundPlayer.stopSound(this.curSound);
                this.curSound = null;
            }
            if(this.nextSound !== null) {
                this.soundPlayer.stopSound(this.nextSound);
                this.nextSound = null;
            }
            if(this.nextTimeout !== null) {
                window.clearTimeout(this.nextTimeout);
                this.nextTimeout = null;
            }
            this.nextIdx = 0;
            this.nextSoundStartTime = null;
        }

        private queueNextTrack() {
            if(this.nextSoundStartTime === null) {
                throw new Error("Can't queue next track - haven't started.");
            }
            let curDur = this.tracks[this.nextIdx].duration;
            this.curSound = this.nextSound;
            this.nextIdx = (this.nextIdx + 1) % this.tracks.length;
            this.nextSoundStartTime += curDur;
            this.nextSound = this.startTrack(this.nextIdx, false, this.nextSoundStartTime);
            this.nextTimeout = window.setTimeout(() => {
                this.queueNextTrack();
            }, curDur * 1000);
        }
    }
}
