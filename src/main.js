import { Application, Graphics, Text, TextStyle, Sprite, Assets, Container, applyStyleParams, AnimatedSprite, TilingSprite, BlurFilter, NoiseFilter } from 'pixi.js';
import { Howl } from 'howler';
(async () => {

    const app = new Application();

    await app.init({
        // width: window.innerWidth,
        // height: window.innerHeight,
        resizeTo: window,
        //backgroundAlpha: 0.9,
        //backgroundColor: 0xffea00,
        // antialias: true, 
    });
    app.canvas.style.position = 'absolute';

    document.body.appendChild(app.canvas);

    // const rectangle = new Graphics()
    //     .rect(200, 200, 100, 150)
    //     .fill({
    //         color:0xffea00,
    //         alpha: 0.9,
    //     })
    //     .stroke({
    //         with: 8,
    //         color: 0x00ff00,
    //     });

    // app.stage.addChild(rectangle);

    // rectangle.eventMode = 'static';

    // rectangle.cursor = 'pointer';

    // rectangle.on('pointerdown', moveRect);
    
    // function moveRect() {
    //     rectangle.x -=10;
    //     rectangle.y +=10;
    // }


    // const star = new Graphics()
    //     .star(1000, 250, 12, 80, 2)
    //     .fill({color: 0xfff});
    
    // app.stage.addChild(star);
    
    // const style = new TextStyle({
    //     fill: '#ffffff',
    //     fontSize: 40,
    //     fontFamily: 'Bauhaus 93',
    //     stroke: {color: '#4a1850', width: 5},
    //     dropShadow: {
    //         color: '#4a1950',
    //         blur: 4,
    //         angle: Math.PI/6,
    //         distance: 6,
    //     },
    //     wordWrap: true,
    //     wordWrapWidth: 440
    // })

    // const text = new Text({
    //     text: 'Jet is a cuite!!',
    //     style
    // });

    // app.stage.addChild(text);

    //const texture = await Assets.load('/public/images/logo.png');
    // const texture = await Assets.load('/images/masterchief.png');
    // const sprite = Sprite.from(texture);

    // app.stage.addChild(sprite);

    // sprite.scale.set(0.5, 0.5);
    // text.position.set(1000, 100);
    
    // // sprite.skew.set(Math.PI / 4, 0);
    // sprite.rotation = Math.PI / 4;

    // sprite.anchor.set(0.5, 0.5);

    //sprite.anchor.set(0.5, 0.5);

    // const circle = new Graphics();
    // app.ticker.add(() => {
    //     circle.circle(
    //         Math.random() * app.screen.width,
    //         Math.random() * app.screen.height,
    //         5
    //     )
    //     .fill({
    //         color: 0xffffff
    //     });
    //     app.stage.addChild(circle);
    // });


    // const warriorsContainer = new Container();
    // app.stage.addChild(warriorsContainer);

    // const greenTexture = await Assets.load('/images/GreenDude.jpg');
    // const greenSprite = Sprite.from(greenTexture);
    // greenSprite.scale.set(0.3,0.3);

    // warriorsContainer.addChild(greenSprite);
    
    // const PurpleTexture = await Assets.load('/images/PurpleDude.png');
    // const PurpleSprite = Sprite.from(PurpleTexture);
    // PurpleSprite.scale.set(0.3,0.3);

    // warriorsContainer.addChild(PurpleSprite);

    // PurpleSprite.x = 500;
    // PurpleSprite.y = 200;

    // warriorsContainer.position.set(150, 150);

    // const texturePromise = Assets.load('/images/PurpleDude.png');
    // texturePromise.then((resolvedTexture) => {
    //     const sprite = Sprite.from(resolvedTexture);
    //     sprite.scale.set(0.3, 0.3);
    //     app.stage.addChild(sprite);
    // }); 

    const texture = await Assets.load('/images/ocean.png');

    const bgSprite = new TilingSprite({
        texture,
        width: app.screen.width,
        height: app.screen.height,
    });

    bgSprite.tileScale.set(1.25,1.2);
    
    app.ticker.add(function() {
        bgSprite.tilePosition.x -=1;
    });
    app.stage.addChild(bgSprite);

    const sound = new Howl({
        src: ['/audio/oceanBg.mp3']
    });
    
    sound.play();

})();

