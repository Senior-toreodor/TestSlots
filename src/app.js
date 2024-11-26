import {
    Application,
    Assets,
    Container,
    Sprite,
    Graphics, 
    BlurFilter,
} from 'pixi.js';
import { gsap } from 'gsap';

(async () => {
    const app = new Application();
    await app.init({ background: '0xffffff', resizeTo: window });
    document.body.appendChild(app.canvas);

    const imagePaths = [
        './images/M00_000.jpg',
        './images/M01_000.jpg',
        './images/M02_000.jpg',
        './images/M03_000.jpg',
        './images/M04_000.jpg',
        './images/M05_000.jpg',
        './images/M06_000.jpg',
        './images/M07_000.jpg',
        './images/M08_000.jpg',
        './images/M09_000.jpg',
        './images/M10_000.jpg',
        './images/M11_000.jpg',
        './images/M12_000.jpg',
    ];
    const textures = await Promise.all(imagePaths.map((path) => Assets.load(path)));
 
    const REEL_WIDTH = Math.max(app.screen.width / 5, 100);  
    const SYMBOL_SIZE = Math.max(app.screen.height / 6, 100);  

    const reels = [];
    const reelContainer = new Container();
 
    const uniformScale = Math.min(SYMBOL_SIZE / textures[0].height, REEL_WIDTH / textures[0].width);

    for (let i = 0; i < 3; i++) {
        const rc = new Container();
        rc.x = i * REEL_WIDTH;
        reelContainer.addChild(rc);

        const reel = {
            container: rc,
            symbols: [],
            position: 0,
            previousPosition: 0,
            blur: new BlurFilter(),
        };

        reel.blur.strengthX = 0;
        reel.blur.strengthY = 0;
        rc.filters = [reel.blur];

        for (let j = 0; j < 4; j++) {
            const symbol = new Sprite(textures[Math.floor(Math.random() * textures.length)]);
            symbol.y = j * SYMBOL_SIZE;
            symbol.scale.set(uniformScale);  
            symbol.x = Math.round((REEL_WIDTH - symbol.width) / 2);  
            reel.symbols.push(symbol);
            rc.addChild(symbol);
        }
        reels.push(reel);
    }
    app.stage.addChild(reelContainer);
 
    const margin = (app.screen.height - SYMBOL_SIZE * 3) / 2;
    reelContainer.y = margin;
    reelContainer.x = (app.screen.width - REEL_WIDTH * 3) / 2;

    const top = new Graphics().rect(0, 0, app.screen.width, margin).fill({ color: 0xffffff });
    const bottom = new Graphics().rect(0, SYMBOL_SIZE * 3 + margin, app.screen.width, margin).fill({ color: 0xffffff });
    app.stage.addChild(top);
    app.stage.addChild(bottom);

    let running = false;
    let leverHoldTime = 0;
    let holdInterval;

    function startPlay(duration = 1, speedMultiplier = 1) {
        if (running) return;
        running = true;

        for (let i = 0; i < reels.length; i++) {
            const r = reels[i];
            const extra = Math.floor(Math.random() * 3);
            const target = Math.ceil(r.position + (10 + i * 5 + extra) * speedMultiplier);
            const time = (2500 + i * 600 + extra * 600) * duration;

            tweenTo(r, 'position', target, time, backout(0.5), null, i === reels.length - 1 ? reelsComplete : null);
        }
    }

    function reelsComplete() {
        for (let reel of reels) {
            reel.position = Math.round(reel.position);  
        }
        running = false;
    }

    app.ticker.add(() => {
        for (let i = 0; i < reels.length; i++) {
            const r = reels[i];
            r.blur.strengthY = (r.position - r.previousPosition) * 8;
            r.previousPosition = r.position;

            for (let j = 0; j < r.symbols.length; j++) {
                const s = r.symbols[j];
                const prevy = s.y;

                s.y = ((r.position + j) % r.symbols.length) * SYMBOL_SIZE - SYMBOL_SIZE;
                if (s.y < 0 && prevy > SYMBOL_SIZE) {
                    const textureIndex = Math.floor(Math.random() * textures.length);
                    s.texture = textures[textureIndex];
                    s.scale.set(uniformScale);  
                    s.x = Math.round((REEL_WIDTH - s.width) / 2);
                }
            }
        }
    });

    const tweening = [];

    function tweenTo(object, property, target, time, easing, onchange, oncomplete) {
        const tween = {
            object,
            property,
            propertyBeginValue: object[property],
            target,
            easing,
            time,
            change: onchange,
            complete: oncomplete,
            start: Date.now(),
        };

        tweening.push(tween);
    }

    app.ticker.add(() => {
        const now = Date.now();
        const remove = [];

        for (let i = 0; i < tweening.length; i++) {
            const t = tweening[i];
            const phase = Math.min(1, (now - t.start) / t.time);

            t.object[t.property] = lerp(t.propertyBeginValue, t.target, t.easing(phase));
            if (t.change) t.change(t);
            if (phase === 1) {
                t.object[t.property] = t.target;
                if (t.complete) t.complete(t);
                remove.push(t);
            }
        }
        for (let i = 0; i < remove.length; i++) {
            tweening.splice(tweening.indexOf(remove[i]), 1);
        }
    });

    function lerp(a1, a2, t) {
        return a1 * (1 - t) + a2 * t;
    }

    function backout(amount) {
        return (t) => --t * t * ((amount + 1) * t + amount) + 1;
    }
 
    if (window.innerWidth > 768) {
        const leverContainer = new Container();
        leverContainer.x = app.screen.width - 150;
        leverContainer.y = app.screen.height / 2 - 100;

        const leverBase = new Graphics()
            .rect(-10, 0, 20, 200)
            .fill({ color: 0x333333 });
        leverContainer.addChild(leverBase);

        const leverHandle = new Graphics()
            .circle(0, 0, 20)
            .fill({ color: 0xff0000 });
        leverHandle.y = 200;
        leverContainer.addChild(leverHandle);

        let isHolding = false;

        leverContainer.interactive = true;
        leverContainer.cursor = 'pointer';

        leverContainer.on('pointerdown', () => {
            if (running || isHolding) return;
            isHolding = true;
            leverHoldTime = 0;

            holdInterval = setInterval(() => {
                leverHoldTime += 0.05;
                leverHandle.y = 200 - Math.min(leverHoldTime * 180, 180);  
            }, 50);
        });

        leverContainer.on('pointerup', () => {
            clearInterval(holdInterval);
            if (leverHoldTime < 0.5) {
                gsap.to(leverHandle, { y: 200, duration: 0.5, ease: 'bounce.out' });
                isHolding = false;
                return;
            }

            const duration = Math.min(leverHoldTime, 3);
            const speedMultiplier = 1 + leverHoldTime;

            gsap.to(leverHandle, { y: 200, duration: 0.5, ease: 'bounce.out', onComplete: () => (isHolding = false) });
            startPlay(duration, speedMultiplier);
        });

        app.stage.addChild(leverContainer);
    } else { 
        app.stage.interactive = true;
        app.stage.cursor = 'pointer';
        app.stage.on('pointerdown', () => startPlay(1, 1));
    }
})();
