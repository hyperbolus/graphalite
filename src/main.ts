"use strict";

import {Renderer} from "./Renderer";

import LEVEL from './levels/4284013.keyed?raw'
//import LEVEL from './levels/Instinct_main_2.gmd?raw'
import {Camera} from "./Camera";
import {Annotation} from "./Annotation";

(async () => {
    const renderer = new Renderer(
        document.getElementById('display')
    );
    await renderer.initialize()

    let speed = 30

    document.addEventListener('keydown', (e) => {
        switch (e.key) {
            case 'w':
                renderer.camera.y += speed;
                break;
            case 'a':
                renderer.camera.x -= speed;
                break;
            case 's':
                renderer.camera.y -= speed;
                break;
            case 'd':
                renderer.camera.x += speed;
                break;
            case 'q':
                renderer.camera.zoom += 1;
                break;
            case 'e':
                renderer.camera.zoom -= 1;
                break;
        }

        renderer.camera.dirty = true;
    });

    document.addEventListener('mousemove', (e) => {
        if (e.buttons === 1) {
            renderer.camera.x -= e.movementX;
            renderer.camera.y += e.movementY;
            renderer.camera.dirty = true;
        }
    });

    document.addEventListener('wheel', (e) => {
        e.preventDefault();

        Camera.mx = e.clientX;
        Camera.my = e.clientY;

        if (e.ctrlKey) {
            renderer.camera.zoom -= e.deltaY / 100;
        } else {
            renderer.camera.y -= e.deltaY;
            renderer.camera.x += e.deltaX;
        }

        renderer.camera.dirty = true;
    }, {passive: false});

    renderer.loadLevel(LEVEL);
    if (renderer.level) {
        renderer.level.annotations = [
            new Annotation(90, 150, `<h2>OwO, What's This?</h2><p>It's a level annotation! These can be made by creators, added by users (à la Genius annotations), or used by level reviews to highlight parts of levels with their thoughts!</p>`),
            new Annotation(600, 600, `<p>*stanley parable voice* this, is where there is nothing</p>`),
        ]
    }
    requestAnimationFrame(renderer.draw.bind(renderer));
})()