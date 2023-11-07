"use strict";

import ATLAS_1 from './resources/GJ_GameSheet-uhd.png'
import ATLAS_2 from './resources/GJ_GameSheet02-uhd.png'
import ATLAS_3 from './resources/FireSheet_01-uhd.png'

import P_ATLAS_1 from './resources/GJ_GameSheet-uhd.plist?url'
import P_ATLAS_2 from './resources/GJ_GameSheet02-uhd.plist?url'
import P_ATLAS_3 from './resources/FireSheet_01-uhd.plist?url'

import BG_1 from './resources/game_bg_01_001-uhd.png'

import {Renderer} from "./Renderer";

import LEVEL from './levels/4284013.keyed?raw'
import {Annotation} from "./Annotation";
import {Level} from "./Level";
import {Texture} from "./Texture";

(async () => {
    const renderer = new Renderer({
        canvas: document.getElementById('display'),
        overlay: document.getElementById('overlay'),
        container: document.getElementById('container'),
    });

    await Level.loadAtlas(renderer, ATLAS_1, P_ATLAS_1, 0);
    await Level.loadAtlas(renderer, ATLAS_2, P_ATLAS_2, 1);
    await Level.loadAtlas(renderer, ATLAS_3, P_ATLAS_3, 2);
    renderer.bgs[1] = new Texture(renderer, BG_1);

    await renderer.initialize();

    renderer.loadLevel(LEVEL);
    if (renderer.level) {
        renderer.level.annotations = [
            new Annotation(90, 150, `<h2>OwO, What's This?</h2><p>It's a level annotation! These can be made by creators, added by users (à la Genius annotations), or used by level reviews to highlight parts of levels with their thoughts!</p>`),
            new Annotation(600, 600, `<p>*stanley parable voice* this, is where there is nothing</p>`),
        ]
    }
    requestAnimationFrame(renderer.draw.bind(renderer));
})()