import {
    Application,
    Graphics,
    Text,
    TextStyle,
    Sprite,
    Assets,
    Container,
    AnimatedSprite,
    TilingSprite,
    BlurFilter,
    NoiseFilter,
} from 'pixi.js';
import { Howl } from 'howler';

(async () => {
    const app = new Application();
    await app.init({
        resizeTo: window,
    });
    app.canvas.style.position = 'absolute';
    document.body.appendChild(app.canvas);

    const bgLayer = new Container();
    const shipLayer = new Container();
    const bulletLayer = new Container();
    const uiLayer = new Container();
    app.stage.addChild(bgLayer, shipLayer, bulletLayer, uiLayer);
    console.log('bulletLayer children:', bulletLayer.children.length);

    // --- SPRITESHEET SETUP ---
    Assets.add({
        alias: 'battlesheet',
        src: '/battleship_spritesheet.json', // <- make sure path is correct
    });

    const sheet = await Assets.load('battlesheet'); // <- should now succeed

    // Optional: log what you actually got
    console.log('sheet:', sheet);

    const shipIdleTex     = sheet.textures['ship_idle'];
    const shipShootTex    = sheet.textures['ship_shoot'];
    const shipDamagedTex  = sheet.textures['ship_damaged'];

    const bulletBigTex    = sheet.textures['bullet_big'];
    const bulletMidTex    = sheet.textures['bullet_mid'];
    const bulletSmallTex  = sheet.textures['bullet_small'];

    // --- SHIP SPRITE ---
    // const ship = new Sprite(shipIdleTex);
    // ship.anchor.set(0.5);
    // ship.position.set(app.screen.width / 2, app.screen.height - 80);
    // shipLayer.addChild(ship);

    // function setShipState(state) {
    //     if (state === 'idle') ship.texture = shipIdleTex;
    //     else if (state === 'shoot') ship.texture = shipShootTex;
    //     else if (state === 'damaged') ship.texture = shipDamagedTex;
    // }

    // --- ANIMATED SHIP USING animation GROUP ---
    // const shipAnimation = new AnimatedSprite(sheet.animations['ship_states']);
    // shipAnimation.anchor.set(0.5);
    // shipAnimation.position.set(200, 200);
    // shipLayer.addChild(shipAnimation);

    // shipAnimation.play();
    // shipAnimation.animationSpeed = 0.01;
    

    // --- BACKGROUND ---
    const texture = await Assets.load('/images/ocean.png');
    const bgSprite = new TilingSprite({
        texture,
        width: app.screen.width,
        height: app.screen.height,
    });

    bgSprite.tileScale.set(1.25, 1.2);
    bgLayer.addChild(bgSprite);

    app.ticker.add(() => {
        bgSprite.tilePosition.x -= 1;
    });

    // --- AUDIO ---
    const sound = new Howl({
        src: ['/audio/oceanBg.mp3'],
    });

    sound.play();
    //------Create ship since sprites are complicated ---
   const ship = new Graphics()
    .rect(-30, -10, 60, 20)
    .fill(0xffffff);

    ship.position.set(app.screen.width / 2, app.screen.height - 80);
    shipLayer.addChild(ship);
    
    
    //---- Create bullet sprite ---
    // ---- Bullets ----
const bullets = [];

function shotsFired(boomX, boomY) {
    const bullet_shape = new Graphics()
        .circle(0, 0, 6)
        .fill(0xffea00);

    bullet_shape.position.set(ship.x, ship.y);
    bulletLayer.addChild(bullet_shape);

    const dx = boomX - ship.x;
    const dy = boomY - ship.y;
    const angle = Math.atan2(dy, dx);

    const speed = 16;
    const vx = Math.cos(angle) * speed;
    //const dist = Math.hypot(dx, dy);
    const vy = Math.sin(angle) * speed * 1.25;
    //const vy = (Math.sin(angle) * speed * 1.25) * (dist / 600);

    console.log('dx,dy,angle,speed,vx,vy =', dx, dy, angle, speed, vx, vy);

    bullets.push({
        sprite: bullet_shape,
        vx,
        vy,
        gravity: 0.3,
        scale: 1.0,
        scaleDecay: 0.02,
        minScale: 0.1,
    });

    console.log('created bullet at', bullet_shape.x, bullet_shape.y);
    console.log('shotsFired: bullets length =', bullets.length);
}

app.stage.eventMode = 'static';
app.stage.hitArea = app.screen;

app.stage.on('pointerdown', (e) => {
    const pos = e.global;
    console.log('pointerdown:', pos.x, pos.y);
    shotsFired(pos.x, pos.y);
});

app.ticker.add((ticker) => {
    const delta = ticker.deltaTime;

    for (let i = bullets.length - 1; i >= 0; i--) {
        const b = bullets[i];

        b.vy += b.gravity * delta;

        b.sprite.x += b.vx * delta;
        b.sprite.y += b.vy * delta;

        // Debug:
        console.log('bullet pos', b.sprite.x, b.sprite.y);

        b.scale -= b.scaleDecay * delta;
        if (b.scale < 0) b.scale = 0;
        b.sprite.scale.set(b.scale);

        b.sprite.rotation = Math.atan2(b.vy, b.vx);

        const offScreen =
            b.sprite.x < -50 ||
            b.sprite.x > app.screen.width + 50 ||
            b.sprite.y < -50 ||
            b.sprite.y > app.screen.height + 50;

        const tooSmall = b.scale <= b.minScale;

        if (offScreen || tooSmall) {
            bulletLayer.removeChild(b.sprite);
            b.sprite.destroy();
            bullets.splice(i, 1);
        }
    }
});


})();
