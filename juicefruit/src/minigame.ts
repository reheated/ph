interface ShakeSettings {
    translate: number;
    rotate: number;
    always: number;
}

interface ParticleSettings {
    count: number;
    loseCount: number;
    maxInitSpeed: number;
}

interface DetailSettings {
    clouds: boolean;
    grass: boolean;
    dusk: boolean;
    floodlight: boolean;
    disco: boolean;
}

interface SoundSettings {
    intro: string | null;
    music: string | null;
    get: string | null;
    bird: string | null;
    won: string | null;
}

class Particle {
    active: boolean = false;
    x: number = 0;
    y: number = 0;
    vx: number = 0;
    vy: number = 0;
    fill: string = "#000000";
}

class MinigameLayer extends PH.Layer {
    
    MAX_DELTAT = 1.0 / 30; // Maximum time step the game simulation is allowed to make.
    REST_TIME = 2.0; // Seconds after winning/losing that the minigame still displays

    // Gameplay settings
    STARTING_LIVES = 3;
    WIDTH = 320;
    HEIGHT = 200;
    BALLRAD = 5;
    GRAVITY = 600;
    WALLWIDTH = 2;
    BALLMARGIN = 40;
    MAXXVEL = 180;
    XACCEL = 1440;
    FRICTION = 720;
    BOUNCE_VEL = 410; // Upward speed of the ball after every bounce.

    BIRD_FLIGHT_X_SPEED = 1.5;
    BIRD_FLIGHT_Y_SPEED = 0.1;
    BIRDRAD = 5;
    BIRDCOLLRAD = 3; // size for collision purposes

    NUM_SEEDS = 6;
    SEEDRAD = 5;
    SEEDSPACE = 12;

    // Particles settings
    MAX_PARTICLES = 2000;
    PARTICLE_GRAVITY = 50;

    // Screen shake settings
    SCREEN_SHAKE_DURATION = 0.5;

    // Cloud settings
    CLOUD_COUNT = 3;
    CLOUD_BUFFER = 100; // how far outside the screen it goes before wrapping
    CLOUD_VEL = -6;

    // Grass settings
    GRASSHEIGHT = 10;
    GROUNDCOLOR = "#1f3513";

    // Dusk settings
    SKY_Y_OFFSET = -100;

    // Sound settings
    BPM = 136;
    INTRO_BEATS = 4;
    SONG_BEATS = 16 * 4; // 16 bars

    game: Game;

    ballx: number;
    bally: number;
    ballvx: number;
    ballvy: number;
    birdPositions: [number, number][];
    birdVels: number[][];
    seedPositions: [number, number][];
    lives: number;
    numGotSeeds: number;
    endedTime: number | null;
    won: boolean;
    particles: Particle[];
    nextParticle: number = 0;
    lastShake: number | null;
    cloudPositions: number[][];
    minigameStartedTime: number | null = null;
    birdArrivalRate: number;

    introTime: number;
    songTime: number;
    startMusicTime: number | null = null;
    curSong: AudioBufferSourceNode | null = null;

    // the various juice levels you can upgrade
    shakeSettings: ShakeSettings;
    particleSettings: ParticleSettings;
    detailSettings: DetailSettings;
    soundSettings: SoundSettings;

    // translate x and y radius; rotate = angle in degrees. always = translate that applies always.
    shakeMap: {[key: number]: ShakeSettings} = {
        0: {translate: 0, rotate: 0, always: 0},
        1: {translate: 1, rotate: 0, always: 0},
        2: {translate: 4, rotate: 0, always: 0},
        3: {translate: 8, rotate: 0, always: 0},
        4: {translate: 16, rotate: 6, always: 0},
        5: {translate: 32, rotate: 20, always: 1},
    }

    particleMap: {[key: number]: ParticleSettings} = {
        0: {count: 0, loseCount: 0, maxInitSpeed: 10},
        1: {count: 10, loseCount: 25, maxInitSpeed: 20},
        2: {count: 20, loseCount: 50, maxInitSpeed: 30},
        3: {count: 60, loseCount: 100, maxInitSpeed: 45},
        4: {count: 140, loseCount: 200, maxInitSpeed: 70},
        5: {count: 300, loseCount: 400, maxInitSpeed: 100},
    }

    detailMap: {[key: number]: DetailSettings} = {
        0: {clouds: false, grass: false, dusk: false, floodlight: false, disco: false},
        1: {clouds: true, grass: false, dusk: false, floodlight: false, disco: false},
        2: {clouds: true, grass: true, dusk: false, floodlight: false, disco: false},
        3: {clouds: true, grass: true, dusk: true, floodlight: false, disco: false},
        4: {clouds: true, grass: true, dusk: true, floodlight: true, disco: false},
        5: {clouds: true, grass: true, dusk: true, floodlight: false, disco: true},
    }

    soundMap: {[key: number]: SoundSettings} = {
        0: {intro: null, music: null, get: null, bird: null, won: null},
        1: {intro: 'ld45_intro1', music: 'ld45_level1', get: 'ld45_get', bird: 'ld45_bird', won: 'ld45_won1'},
        2: {intro: 'ld45_intro1', music: 'ld45_level2', get: 'ld45_get', bird: 'ld45_bird', won: 'ld45_won1'},
        3: {intro: 'ld45_intro1', music: 'ld45_level3', get: 'ld45_get', bird: 'ld45_bird', won: 'ld45_won1'},
        4: {intro: 'ld45_intro4', music: 'ld45_level4', get: 'ld45_get', bird: 'ld45_bird', won: 'ld45_won4'},
        5: {intro: 'ld45_intro4', music: 'ld45_level5', get: 'ld45_get', bird: 'ld45_bird', won: 'ld45_won4'},
    }

    // keyboard setup
    keysDown: {[key: string]: boolean};


    constructor(game: Game, shake: number, particle: number, detail: number, sound: number,
        difficulty: number, minigamePlayedTimes: number)
    {
        super();
        this.game = game;
        this.shakeSettings = this.shakeMap[shake];
        this.particleSettings = this.particleMap[particle];
        this.detailSettings = this.detailMap[detail];
        this.soundSettings = this.soundMap[sound];
        this.birdArrivalRate = (3 + difficulty) * 0.1;

        // Initalise

        this.ballx = this.WIDTH / 2;
        this.bally = this.HEIGHT / 4;

        this.ballvx = 0;
        this.ballvy = 0;

        this.birdPositions = [];
        this.birdVels = [];

        this.lives = this.STARTING_LIVES;
        this.numGotSeeds = 0;

        // generate seed positions
        var ok = false;
        var xs = [];
        for(var k = 0; k < this.NUM_SEEDS; k++)
        {
            var ok = false;
            while(!ok)
            {
                var z = Math.random() * (this.WIDTH - 2 * this.BALLMARGIN) + this.BALLMARGIN;
                ok = true;
                for(var l = 0; l < xs.length; l++)
                {
                    if(Math.abs(z - xs[l]) < this.SEEDSPACE)
                    {
                        ok = false;
                    }
                }
            }
            xs.push(z!);
        }
        this.seedPositions = [];
        for(var k = 0; k < xs.length; k++)
        {
            this.seedPositions.push([xs[k], this.HEIGHT - this.WALLWIDTH - this.SEEDRAD]);
        }

        // particls and shaking
        this.particles = this.initialParticles();
        this.lastShake = null;

        // clouds
        this.cloudPositions = []
        for(var k = 0; k < this.CLOUD_COUNT; k++)
        {
            var x = Math.random() * (this.WIDTH + this.CLOUD_BUFFER) - this.CLOUD_BUFFER;
            var y = Math.random() * this.HEIGHT * 0.55;
            this.cloudPositions.push([x, y]);
        }

        this.endedTime = null;
        this.won = false;
        this.keysDown = {'ArrowLeft': false, 'ArrowRight': false};

        if(minigamePlayedTimes === 0)
        {
            this.convoFirstMinigame();
        }

        this.introTime = this.INTRO_BEATS / this.BPM * 60;
        this.songTime = this.SONG_BEATS / this.BPM * 60;
    }

    startPlaying()
    {
        this.quickSound(this.soundSettings.intro);
        var t = PH.curTime()
        this.minigameStartedTime = t;
        this.startMusicTime = t + this.introTime;
    }

    quickSound(soundName: string | null) {
        if (soundName === null) return null;
        var result = this.game.soundPlayer.playSound(this.game.data[soundName], false);
        return result;
    }

    gameplayStep(deltat: number)
    {
        // GAMEPLAY STEP

        // apply gravity to ball velocity
        this.ballvy += this.GRAVITY * deltat;

        // apply player inputs to ball velocity
        if(this.keysDown.ArrowRight && !this.keysDown.ArrowLeft)
        {
            this.ballvx = this.ballvx + this.XACCEL * deltat;
        }
        if(this.keysDown.ArrowLeft && !this.keysDown.ArrowRight)
        {
            this.ballvx = this.ballvx - this.XACCEL * deltat;
        }

        // apply friction to x-velocity
        if(this.ballvx < 0)
        {
            this.ballvx = Math.min(0, this.ballvx + this.FRICTION * deltat);
        }
        if(this.ballvx > 0)
        {
            this.ballvx = Math.max(0, this.ballvx - this.FRICTION * deltat);
        }

        // apply maximum speed to x-velocity
        this.ballvx = Math.min(this.ballvx, this.MAXXVEL);
        this.ballvx = Math.max(this.ballvx, -this.MAXXVEL);

        // apply ball velocity to ball position
        this.ballx += this.ballvx * deltat;
        this.bally += this.ballvy * deltat;

        // apply bounce
        if(this.ballx < this.WALLWIDTH + this.BALLRAD)
        {
            var z = this.WALLWIDTH + this.BALLRAD;
            this.ballx = z + (z - this.ballx);
            this.ballvx = Math.abs(this.ballvx);
        }
        if(this.ballx > this.WIDTH - this.WALLWIDTH - this.BALLRAD)
        {
            var z = this.WIDTH - this.WALLWIDTH - this.BALLRAD;
            this.ballx = z - (this.ballx - z);
            this.ballvx = -Math.abs(this.ballvx);
        }
        if(this.bally > this.HEIGHT - this.WALLWIDTH - this.BALLRAD)
        {
            var z = this.HEIGHT - this.WALLWIDTH - this.BALLRAD;
            this.bally = z - (this.bally - z);
            this.ballvy = -this.BOUNCE_VEL;
        }

        // Create birds?
        var birdProb = this.birdArrivalRate * deltat;
        if(Math.random() < birdProb)
        {
            var goingLeft = (Math.random() < 0.5);
            var x, vx;
            if(goingLeft)
            {
                x = this.WIDTH;
                vx = -this.BIRD_FLIGHT_X_SPEED;
            }
            else
            {
                x = 0;
                vx = this.BIRD_FLIGHT_X_SPEED;
            }
            var y = (0.25 + 0.5 * Math.random()) * this.HEIGHT;
            var vy = ((Math.random() < 0.5)? 1 : -1) * this.BIRD_FLIGHT_Y_SPEED;
            this.birdPositions.push([x, y]);
            this.birdVels.push([vx, vy]);
        }

        // Update birds
        for(var k = this.birdPositions.length - 1; k >= 0; k--)
        {
            var pos = this.birdPositions[k];
            var vel = this.birdVels[k];
            pos[0] += vel[0];
            pos[1] += vel[1];
            if(pos[0] < -this.WALLWIDTH || pos[0] > this.WIDTH + this.WALLWIDTH)
            {
                // bird exited the play region - delete it
                this.birdPositions.splice(k, 1);
                this.birdVels.splice(k, 1);
            }
        }

        // Check collisions with seeds and birds
        for(var k = this.seedPositions.length - 1; k >= 0; k--)
        {
            var pos = this.seedPositions[k];
            var d = this.collDist(pos, [this.ballx, this.bally]);
            if(d < this.SEEDRAD + this.BALLRAD)
            {
                this.seedCollisionEffect(pos[0], pos[1]);
                this.seedPositions.splice(k, 1);
                this.numGotSeeds += 1;
            }
        }
        for(var k = this.birdPositions.length - 1; k >= 0; k--)
        {
            var pos = this.birdPositions[k];
            var d = this.collDist(pos, [this.ballx, this.bally]);
            if(d < this.BIRDCOLLRAD + this.BALLRAD)
            {
                this.birdCollisionEffect(pos[0], pos[1]);
                this.birdPositions.splice(k, 1);
                this.birdVels.splice(k, 1);
                this.lives -= 1;
            }
        }

        // Check if the game is won/lost
        if(this.numGotSeeds >= this.NUM_SEEDS)
        {
            this.won = true;
            this.endedTime = PH.curTime();
            this.stopMusic();
            this.quickSound(this.soundSettings.won);
        }
        else if(this.lives <= 0)
        {
            this.won = false;
            this.endedTime = PH.curTime();
            this.particleExplosion(this.ballx, this.bally, this.particleSettings.loseCount, "#cc0044");
            this.stopMusic();
        }
    }

    seedCollisionEffect(x: number, y: number)
    {
        this.particleExplosion(x, y, this.particleSettings.count, "#461093");
        this.lastShake = PH.curTime();
        this.quickSound(this.soundSettings.get);
    }

    birdCollisionEffect(x: number, y: number)
    {
        this.particleExplosion(x, y, this.particleSettings.count, "#222222");
        this.lastShake = PH.curTime();
        this.quickSound(this.soundSettings.bird);
    }

    drawObjects()
    {
        // DRAW STEP
        var t = PH.curTime();
        
        // Draw walls
        this.game.ctx.fillStyle = "#000000";
        var b = 1000;
        this.game.ctx.fillRect(-b, -b, this.WALLWIDTH + b, this.HEIGHT + 2*b);
        this.game.ctx.fillRect(this.WIDTH - this.WALLWIDTH, -b, this.WALLWIDTH + b, this.HEIGHT + 2*b);
        this.game.ctx.fillStyle = this.GROUNDCOLOR;
        this.game.ctx.fillRect(0, this.HEIGHT - this.WALLWIDTH, this.WIDTH, this.WALLWIDTH + b);

        // Draw birds
        this.game.ctx.fillStyle = "#aaaaaa";
        for(var k = 0; k < this.birdPositions.length; k++)
        {
            var pos = this.birdPositions[k];
            var x = Math.floor(pos[0] - this.BIRDRAD + 0.5);
            var y = Math.floor(pos[1] - this.BIRDRAD + 0.5);
            var flip = this.birdVels[k][0] < 0;
            this.game.ctx.save();
            this.game.ctx.translate(x, y);
            if(flip)
            {
                this.game.ctx.translate(this.BIRDRAD * 2, 0);
                this.game.ctx.scale(-1, 1);
            }
            this.game.ctx.drawImage(this.game.data.bird, 0, 0);
            this.game.ctx.restore();
        }

        // Draw seeds
        for(var k = 0; k < this.seedPositions.length; k++)
        {
            var pos = this.seedPositions[k];
            var x = Math.floor(pos[0] - this.SEEDRAD + 0.5);
            var y = Math.floor(pos[1] - this.SEEDRAD + 0.5);
            this.game.ctx.drawImage(this.game.data.fruit, x, y);
        }

        // Draw player, if we haven't died
        var alive = (this.endedTime === null) || this.won;
        if(alive)
        {
            var x = Math.floor(this.ballx - this.BALLRAD + 0.5);
            var y = Math.floor(this.bally - this.BALLRAD + 0.5);
            this.game.ctx.drawImage(this.game.data.playerface, x, y);
        }

        // Draw health
        var x = 306;
        var y = 4;
        for(var k = 0; k < this.lives; k++)
        {
            this.game.ctx.drawImage(this.game.data.health, x, y);
            x -= 10;
        }
    }

    initialParticles()
    {
        let particles = [];
        for(var k = 0; k < this.MAX_PARTICLES; k++)
        {
            particles.push(new Particle());
        }
        return particles;
    }

    updateParticles(deltat: number)
    {
        for(var k = 0; k < this.MAX_PARTICLES; k++)
        {
            var p = this.particles[k];
            p.x += p.vx * deltat;
            p.y += p.vy * deltat;
            p.vy += this.PARTICLE_GRAVITY * deltat;
            if(p.y > this.HEIGHT + this.WALLWIDTH)
            {
                p.active = false; // fell off bottom of screen - disable
            }
        }
    }

    drawParticles()
    {
        for(var k = 0; k < this.MAX_PARTICLES; k++)
        {
            var p = this.particles[k];
            if(p.active)
            {
                var x = Math.floor(p.x + 0.5);
                var y = Math.floor(p.y + 0.5);
                this.game.ctx.fillStyle = p.fill;
                this.game.ctx.fillRect(x, y, 1, 1);
            }
        }
    }

    addParticle(x: number, y: number, vx: number, vy: number, fill: string)
    {
        var p = this.particles[this.nextParticle];
        p.active = true;
        p.x = x;
        p.y = y;
        p.vx = vx;
        p.vy = vy;
        p.fill = fill;
        this.nextParticle = (this.nextParticle + 1) % this.MAX_PARTICLES;
    }

    particleExplosion(x: number, y: number, count: number, fill: string)
    {
        var rotPer = 2 * Math.PI / count;
        var rotOff = Math.random() * 2 * Math.PI;
        for(var k = 0; k < count; k++)
        {
            var rot = rotPer * k + rotOff;
            var vx = Math.cos(rot) * Math.random() * this.particleSettings.maxInitSpeed;
            var vy = Math.sin(rot) * Math.random() * this.particleSettings.maxInitSpeed;
            this.addParticle(x, y, vx, vy, fill);
        }
    }

    updateBackground(deltat: number)
    {
        for(var k = 0; k < this.CLOUD_COUNT; k++)
        {
            this.cloudPositions[k][0] += this.CLOUD_VEL * deltat;
            if(this.cloudPositions[k][0] < -this.CLOUD_BUFFER) this.cloudPositions[k][0] = this.WIDTH;
            else if(this.cloudPositions[k][0] > this.WIDTH) this.cloudPositions[k][0] = -this.CLOUD_BUFFER;
        }
    }

    drawBackground()
    {
        var t = PH.curTime();

        // draw dusk
        if(this.detailSettings.dusk)
        {
            this.game.ctx.drawImage(this.game.data.dusk, 0, this.SKY_Y_OFFSET);
        }

        // draw floodlight
        if(this.detailSettings.floodlight)
        {
            this.game.ctx.globalAlpha = 0.4;
            this.game.ctx.globalCompositeOperation = 'multiply';
            this.game.ctx.drawImage(this.game.data.floodlight, 0, this.SKY_Y_OFFSET);
            this.game.ctx.globalCompositeOperation = 'source-over';
            this.game.ctx.globalAlpha = 1;
        }
        
        // draw disco lights
        if(this.detailSettings.disco)
        {
            this.game.ctx.globalAlpha = 0.4;
            this.game.ctx.globalCompositeOperation = 'multiply';
            
            var z = Math.floor(t / 0.5) % 3;
            this.game.ctx.fillStyle = "#000000";
            var r = 300;
            var N = 7;
            for(var k = z-2; k < N; k+=3)
            {
                var a1 = (k / N) * Math.PI; // cut semicircle, so only 1pi
                var a2 = ((k + 2) / N) * Math.PI; // cut semicircle, so only 1pi
                this.game.ctx.beginPath();
                this.game.ctx.moveTo(160, 220);
                this.game.ctx.lineTo(160 + r * Math.cos(a1), 220 - r * Math.sin(a1));
                this.game.ctx.lineTo(160 + r * Math.cos(a2), 220 - r * Math.sin(a2));
                this.game.ctx.closePath();
                this.game.ctx.fill();
            }
            this.game.ctx.globalCompositeOperation = 'source-over';
            this.game.ctx.globalAlpha = 1;
        }

        // draw clouds
        if(this.detailSettings.clouds)
        {
            if(this.detailSettings.dusk) this.game.ctx.globalAlpha = 0.4;
            for(var k = 0; k < this.CLOUD_COUNT; k++)
            {
                var imgName = 'cloud' + k.toString();
                var pos = this.cloudPositions[k];
                // I won't round the positions here... the clouds become too distracting.
                // It's nicer with the AA on!
                var x = pos[0];
                var y = pos[1];
                this.game.ctx.drawImage(this.game.data[imgName], x, y);
            }
            this.game.ctx.globalAlpha = 1;
        }

        // draw long grass
        if(this.detailSettings.grass)
        {
            this.game.ctx.drawImage(this.game.data.longgrass, 0, this.HEIGHT - this.WALLWIDTH - this.GRASSHEIGHT);
        }
    }

    drawForeground()
    {
        // draw short grass
        if(this.detailSettings.grass)
        {
            this.game.ctx.drawImage(this.game.data.shortgrass, 0, this.HEIGHT - this.WALLWIDTH - this.GRASSHEIGHT + 1);
        }
    }

    setScreenTransform()
    {
        // Set the transform
        var t = PH.curTime();

        var shakeAmt = this.shakeSettings.always;
        var shakeHappening = (this.lastShake !== null) && (t < this.lastShake + this.SCREEN_SHAKE_DURATION);
        
        if(shakeHappening)
        {
            shakeAmt += this.shakeSettings.translate;
        }
    
        if(shakeAmt > 0)
        {
            var transx = (Math.random() * 2 - 1) * shakeAmt;
            var transy = (Math.random() * 2 - 1) * shakeAmt;
            this.game.ctx.translate(transx, transy);
        }

        if(shakeHappening && this.shakeSettings.rotate > 0)
        {
            var rot = (Math.random() * 2 - 1) * this.shakeSettings.rotate * 2 * Math.PI / 360;
            this.game.ctx.translate(this.WIDTH/2, this.HEIGHT/2);
            this.game.ctx.rotate(rot);
            this.game.ctx.translate(-this.WIDTH/2, -this.HEIGHT/2);
        }
    }

    stopMusic()
    {
        this.game.jukeBox.setMusic();
    }

    update(deltat: number)
    {
        if(this.minigameStartedTime === null) // haven't started playing yet
        {
            this.startPlaying();
        }
        var timeSinceStarted = PH.curTime() - this.minigameStartedTime!;
        var isIntro = (timeSinceStarted < this.introTime);

        deltat = Math.min(deltat, this.MAX_DELTAT);

        if(this.endedTime !== null)
        {
            // don't update the game step, so we can't die
            if(PH.curTime() > this.endedTime + this.REST_TIME)
            {
                this.minigameStartedTime = null;
                this.game.endMinigame(this.won);
            }
        }
        else if(!isIntro) // haven't won or lost yet, and not in intro
        {
            this.gameplayStep(deltat);
        }
        this.updateParticles(deltat);
        this.updateBackground(deltat);

        if(this.startMusicTime !== null && PH.curTime() >= this.startMusicTime) {
            if(this.soundSettings.music !== null) {
                this.game.jukeBox.setMusic(this.game.data[this.soundSettings.music]);
            }
            this.startMusicTime = null;
        }

        return true;
    }

    draw()
    {
        // Draw basic sky
        this.game.ctx.fillStyle = "#78cfe3";
        this.game.ctx.fillRect(0, 0, this.game.ctx.canvas.width, this.game.ctx.canvas.height);

        this.game.ctx.save();
        this.setScreenTransform();
        this.drawBackground();
        this.drawParticles();
        this.drawObjects();
        this.drawForeground();
        
        var isIntro = (this.minigameStartedTime !== null &&
            PH.curTime() - this.minigameStartedTime < this.introTime);
        if(isIntro)
        {
            this.game.mainFont!.drawText(this.game.ctx, "GET READY", 128, 32);
        }
        this.game.ctx.restore();
    }

    collDist(pos1: [number, number], pos2: [number, number])
    {
        // Distance for collision purposes (supremum distance)
        var dx = Math.abs(pos1[0] - pos2[0]);
        var dy = Math.abs(pos1[1] - pos2[1]);
        var d = Math.max(dx, dy);
        return d;
    }

    handleKeyDown(e: KeyboardEvent): boolean
    {
        this.keysDown[e.code] = true;
        return false;
    }
    
    handleKeyUp(e: KeyboardEvent): boolean
    {
        this.keysDown[e.code] = false;
        return false;
    }

    ////////////////
    // CONVERSATIONS
    ////////////////

    convoFirstMinigame()
    {
        this.game.convoEnqueue("s", "OK - I'm going to try to harvest some juicefruit.");
        this.game.convoEnqueue("s", "It looks like I have to use the left and right arrow keys to collect all the fruit.");
        this.game.convoEnqueue("s", "There are a lot of birds around. I'd better try not to crash into them.");
    }

}