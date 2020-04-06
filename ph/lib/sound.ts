namespace PH {

    /**
     * Settings for constructing a SoundPlayer.
     */
    export interface SoundPlayerSettings {
        /**
         * Time taken to fade sound out or in.
         */
        fadeTime?: number;
    }

    /**
     * Object consisting of a GainNode together with a function for smoothly
     * changing the gain to a specified value.
     */
    class SoundFader {
        /**
         * The audio context that the gain node was created with.
         */
        audioContext: AudioContext

        /**
         * The gain node controlled by this object's fade function.
         */
        gainNode: GainNode;

        /**
         * The duration to smoothly change the gain over.
         */
        dur: number;

        /**
         * The most recent value that was passed to the fade function.
         */
        fadeDest: number = 1.0;

        /**
         * Construct a sound fader.
         *
         * @param audioContext - An audio context that will be used by this
         * object to create a gain node.
         * @param dur - The duration to smoothly change the gain over.
         */
        constructor(audioContext: AudioContext, dur: number) {
            this.audioContext = audioContext;
            this.gainNode = audioContext.createGain();
            this.gainNode.gain.value = this.fadeDest;
            this.dur = dur;
        }

        /**
         * Smoothly change the gain over a period of time.
         * 
         * @param fadeDest - The final value to transition to.
         */
        fade(fadeDest: number) {
            let curT = this.audioContext!.currentTime;
            let timeConstant = this.dur / 5;
            this.gainNode.gain.cancelScheduledValues(curT);
            this.gainNode.gain.setTargetAtTime(fadeDest, curT, timeConstant);
            this.gainNode.gain.setValueAtTime(fadeDest, curT + this.dur);
            this.fadeDest = fadeDest;
        }
    }

    /**
     * This class provides a simple interface for playing sounds through Web
     * Audio. It provides functionality to play and stop sounds, and toggle
     * sound smoothly on and off.
     *
     * If you want to use more advanced Web Audio functionality, go ahead and
     * attach your own nodes to this.fader.gainNode.
     */
    export class SoundPlayer {
        audioContext: AudioContext;
        fader: SoundFader | null = null;
        settings: SoundPlayerSettings;

        /**
         * Construct the sound player.
         * 
         * @param audioContext - An audio context that will be used to play sounds.
         * @param settings - Settings for playing sound.
         */
        constructor(audioContext: AudioContext, settings: SoundPlayerSettings) {
            this.audioContext = audioContext;
            this.settings = settings;
            this.fader = new SoundFader(this.audioContext, this.settings.fadeTime || 0.25);
            this.fader.gainNode.connect(this.audioContext.destination);
        }

        /**
         * Play a sound
         *
         * @param sound - An AudioBuffer of the sound to play.
         * @param loop - Set to true if you want the sound to loop.
         * @param startTime - Starting time of the sound, measured according to
         * the audioContext. Leave undefined to play immediately.
         * 
         * @returns An AudioBufferSourceNode of the sound.
         */
        playSound(sound: AudioBuffer, loop: boolean, startTime?: number): AudioBufferSourceNode {
            let source = this.audioContext!.createBufferSource();
            source.buffer = sound;
            source.loop = loop;
            source.connect(this.fader!.gainNode);
            source.start(startTime || this.audioContext!.currentTime);
            return source;
        }

        /**
         * Stop an already playing sound.
         * 
         * @param sound - The sound to stop.
         */
        stopSound(sound: AudioBufferSourceNode) {
            sound.stop(0);
        }

        /**
         * Turn the volume on or off, smoothly.
         */
        toggle() {
            this.fader!.fade(1.0 - this.fader!.fadeDest);
        }
    }

    /**
     * Class to facilitate playing multiple music tracks and looping them.
     */
    export class JukeBox {
        private soundPlayer: SoundPlayer;
        private tracks: AudioBuffer[] = [];
        private nextIdx = 0;
        private curSound: AudioBufferSourceNode | null = null;
        private nextSound: AudioBufferSourceNode | null = null;
        private nextSoundStartTime: number | null = null;
        private nextTimeout: number | null = null;

        /**
         * Construct a JukeBox.
         *
         * @param soundPlayer - A SoundPlayer object that will be used to play
         * the audio tracks.
         */
        constructor(soundPlayer: SoundPlayer) {
            this.soundPlayer = soundPlayer;
        }

        /**
         * Set the list of tracks, and start playing music, from track 0. Call
         * this function with no parameters to stop the music.
         *
         * @param tracks Tracks to play.
         */
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
            if (this.curSound !== null) {
                this.soundPlayer.stopSound(this.curSound);
                this.curSound = null;
            }
            if (this.nextSound !== null) {
                this.soundPlayer.stopSound(this.nextSound);
                this.nextSound = null;
            }
            if (this.nextTimeout !== null) {
                window.clearTimeout(this.nextTimeout);
                this.nextTimeout = null;
            }
            this.nextIdx = 0;
            this.nextSoundStartTime = null;
        }

        private queueNextTrack() {
            if (this.nextSoundStartTime === null) {
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
