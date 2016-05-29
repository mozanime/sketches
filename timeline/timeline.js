/**
 * timeline.js
 *  タイムラインを表示する
 *  タイムライン上にはレイヤーを表示できる。
 *  レイヤーは ElementLayer / AnimationLaer / GroupLayer で構成される
 *  GroupLayer は ElementLayer / AnimationLayer の集合
 *  AnimationLayer は ElementLayer / GroupLayer に紐づくため、
 *  ElementLayer / GroupLayer に属性として含まれる(好ましくないけどね)
 *
 *  Layer = (ElementLayer | AnimationLayer | GroupLayer)
 *  GroupLayer = (ElementLayer | AnimationLayer)*
 *  (ElementLayer | GroupLayer).anim = AnimationLayer
 *  
 *  code:
 *   let elementLayer = new ElementLayer(targetElem);
 *   timeline.addLayer(elementlayer);
 *   
 *   let animationLayer = new AnimationLayer(new Keyframe(...));
 *   timeline.addLayer(elementLayer, animationLayer);
 *
 *   let groupLayer = new GroupLayer(elementLayer, animationLayer);
 *   timeline.addLayer(groupLayer);
 *   timeline.addLayer(groupLayer, animationLayerForGroup);
 *
 *  未実装：
 *   - 複数のアニメーションレイヤーを重ねる
 *   - アニメーション幅、開始位置の動的変更
 *   - アニメーション開始・停止操作
 */

let scrubber;
let timeline;

document.addEventListener("DOMContentLoaded", ()=>{
  scrubber = document.getElementById("scrubber");
  timeline = new Timeline();
  timeline.init(scrubber);

  // サンプル
  let animLayer = new AnimationLayer(100,20, "animation1");
  let elemLayer = new ElementLayer(100, 20, "element1", animLayer);
  timeline.addLayer(elemLayer);

  let animLayer2 = new AnimationLayer(100, 20, "animation2");
  let elemLayer2 = new ElementLayer(100, 20, "element2", animLayer2);
  timeline.addLayer(elemLayer2);

  // 仮実装
  window.addEventListener("keyup", (e) => {
    if (e.keyCode == e.DOM_VK_SPACE) {
        timeline.start();
    } else if (e.keyCode == e.DOM_VK_P) {
	timeline.pause();
    } else if (e.keyCode == e.DOM_VK_R) {
        timeline.restart();
    } else if (e.keyCode == e.DOM_VK_S) {
        timeline.seek(0.25);
    }
  });

});

function Timeline() {
  this.layers = [];
  this.scrubberAnimation = undefined;

  this.onScrubberMouseDown  = this.onScrubberMouseDown.bind(this);
  this.onScrubberMouseUp    = this.onScrubberMouseUp.bind(this);
  this.onScrubberMouseLeave = this.onScrubberMouseLeave.bind(this);
  this.moveScrubberTo       = this.moveScrubberTo.bind(this);
  this.cancelTimeHeaderDragging = this.cancelTimeHeaderDragging.bind(this);
}
Timeline.prototype = {
  init: function (containerElement) {
    this.containerElement = containerElement;

    // 以下、スクロール部分の実装
    // TODO recalc when resize window.
    this.containerWidth = 
      parseFloat(getComputedStyle(this.containerElement).width);
    console.log("containerWidth:" + this.containerWidth);

    this.line = document.createElement("div");
    containerElement.appendChild(this.line);
    this.line.setAttribute("class", "line");

    this.scrubber = document.createElement("div");
    this.line.appendChild(this.scrubber);
    this.scrubber.setAttribute("class", "scrubber");
    this.scrubber.addEventListener("mousedown", this.onScrubberMouseDown);
    this.scrubber.style.height =
      (parseFloat(getComputedStyle(this.containerElement).height) - 7) + 'px';
  },

  // スクロールに関するイベントリスナー群

  onScrubberMouseDown: function(e) {
    this.moveScrubberTo(e.pageX);
    this.scrubber.addEventListener("mouseup", this.onScrubberMouseUp);
    this.containerElement.addEventListener("mouseup", this.onScrubberMouseUp);
    this.containerElement.addEventListener("mousemove", this.onScrubberMouseMove);
    this.containerElement.addEventListener("mouseleave", this.ScrubberMouseLeave);
    e.preventDefault();
  },

  onScrubberMouseUp: function() {
    this.cancelTimeHeaderDragging();
  },

  onScrubberMouseMove: function(e) {
    timeline.moveScrubberTo(e.pageX);
  },

  onScrubberMouseLeave: function() {
    this.cancelTimeHeaderDragging();
  },

  cancelTimeHeaderDragging: function() {
    console.log("cancelTimeHeaderDragging");
    this.scrubber.addEventListener("mouseup", this.onScrubberMouseUp);
    this.containerElement.removeEventListener("mouseup", this.onScrubberMouseUp);
    this.containerElement.removeEventListener("mousemove", this.onScrubberMouseMove);
  },

  moveScrubberTo: function(pageX) {
    this.scrubber.style.left = ((pageX / this.containerWidth) * 100) + '%';
  },

  // アニメーション全体のシーク・再生・停止動作
  start: function() {
    if (this.scrubberAnimation) return;
    this.scrubberAnimation = new Animation(
      new KeyframeEffect(this.scrubber,
                         {left:['0%', '100%']},
			 10 * 1000), document.timeline);
    this.scrubberAnimation.play();
  },

  // シーク(%指定)
  seek: function(seek) {
    if (seek < 0 || seek > 1) { return; }
    if (!this.scrubberAnimation) {
      this.start();
    }
    this.scrubberAnimation.pause();
    this.scrubberAnimation.currentTime = seek * 10 * 1000;
  },

  // 再生
  restart: function() {
    if (!this.scrubberAnimation || this.scrubberAnimation.playState != 'paused') { return; }
    this.scrubberAnimation.play();
  },

  // 一時停止
  pause: function() {
    if (!this.scrubberAnimation || this.scrubberAnimation.playState != 'running') { return; }
    this.scrubberAnimation.pause();
  },

  // レイヤー追加・削除に関する関数群
  addLayer: function(layer) {
    if (this.layers.includes(layer)){
      return;
    }

    if (this._isElementLayer(layer) ||
        this._isGroupLayer(layer)) {
      // レイヤーの要素をいじる
      let elem = document.createElement("div");
      this.containerElement.appendChild(elem);
      layer.elem = elem;
      if (this._isElementLayer(layer)) {
        elem.setAttribute("class", "elementLayer");
      } else {
        elem.setAttribute("class", "groupLayer");
      }
      elem.innerText = layer.name;

      let last = this.getLastLayer();
      let cs = getComputedStyle(last);
      elem.style.top = (parseFloat(cs.top) + parseFloat(cs.height) + 10) + 'px';

      this.layers.push(layer);
    }n
  },

  _addAnimationLayer: function(layer) {
  },

  _addSubLayer: function(layer) {
  },

  // レイヤーの最後の要素を返す(ない場合は、Line)
  getLastLayer: function() {
    if (this.layers.length <= 0) {
      return this.line;
    }
    return this.layers[this.layers.length - 1].elem;
  },

  // TODO : We might need to move Utility class.
  _isElementLayer: function(layer) {
    return layer instanceof ElementLayer;
  },

  _isGroupLayer: function(layer) {
    return layer instanceof GroupLayer;
  },
};

/*
 * Layer
 *  レイヤーを示す抽象化クラス
 */
function Layer(width, delay, name) {
}
Layer.prototype = {
};

/*
 * AnimationLayer
 *  アニメーションを示すレイヤー
 *  ElementLayer or GroupLayer に関連づく
 */
function AnimationLayer(width, delay, name) {
  this.width = width;
  this.delay = delay;
  this.name = name;
}
AnimationLayer.prototype = Object.create(Layer.prototype);
AnimationLayer.constructor = AnimationLayer;
AnimationLayer.prototype = {
};

/*
 * ElementLayer
 *  素材を示すレイヤー
 *  AnimationLayer を持つ(現時点では1つのAnimationLayerのみ)
 */
function ElementLayer(width, delay, name, animationLayer) {
  this.width = width;
  this.delay = delay;
  this.name = name;
  this.animationLayer  = animationLayer;
}
ElementLayer.prototype = Object.create(Layer.prototype);
ElementLayer.constructor = ElementLayer;
ElementLayer.prototype = {
  addAnimationLayer: function(animationLayer) {
    this.animationLayer = animationLayer;
  },
  getAnimationLayer: function() { return this.animationLayer; },
};


/*
 * GroupLayer
 *  ElementLayer/AnimationLayer/GroupLayer を持つ。
 *  GroupLayer に紐づくAnimationLayer は現時点では１つ
 */
function GroupLayer(width, delay, animation) {
  this.width = width;
  this.delay = delay;
  this.anim  = animation;
  this.layers = [];
}
GroupLayer.prototype = Object.create(Layer.prototype);
GroupLayer.constructor = GroupLayer;
GroupLayer.prototype = {
  addLayer: function(layer) {
    if(layer instanceof ElementLayer) {
      this.layers.push(layer);
    } else if (layer instanceof GroupLayer) {
      this.layer.push(layer);
    } else if (layer instanceof AnimationLayer) {
	throw new Error("Not implemented yet. You should use " + 
                        "addAnimationLayer in order to add " + 
                        "AnimationLayer to this GroupLayer.");
    }
  },
  addAnimationLayer: function(animationLayer) {
    this.animationLayer = animationLayer;
  },
  getAnimationLayer: function() { return this.animationLayer; },
  getLayers: function() { return this.layers; },  
};
