/**
 * timeline.js
 *  タイムラインを表示する
 *  タイムライン上にはレイヤーを表示できる。
 *  レイヤーは ElementLayer / AnimationLaer で構成される
 *  AnimationLayer は ElementLayer に紐づくため、
 *  ElementLayer に属性として含まれる(好ましくないけどね)
 *
 *  Layer = (ElementLayer | AnimationLayer )
 *  ElementLayer.anim = AnimationLayer
 *  
 *  code:
 *   let elementLayer = new ElementLayer(targetElem);
 *   timeline.addLayer(elementlayer);
 *   
 *   let animationLayer = new AnimationLayer(new Keyframe(...));
 *   timeline.addLayer(elementLayer, animationLayer);
 */

let scrubber;
let timeline;

document.addEventListener("DOMContentLoaded", ()=>{
    setTimeout(init, 100);
});
function init() {
  scrubber = document.getElementById("scrubber");
  timeline = new Timeline();
  timeline.init(scrubber);

  let main = document.querySelectorAll("main")[0];
  let elementLayer = new ElementLayer("main", main);
  timeline.addLayer(elementLayer);

  // 仮実装(操作するためのコンポーネントを追加する)
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

  timeline.start();
}

function Timeline() {
  this.layers = [];
  this.scrubberAnimation = undefined;
  this.animationEffects = []; // 各レイヤーを探索する時間を避ける為
  this.animationsDuration = 0;  // Maximum animation duration.(currently fixed value)

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
    // TODO recalc when resizing window.
    this.containerWidth = 
      parseFloat(getComputedStyle(this.containerElement).width);

    this.line = document.createElement("div");
    containerElement.appendChild(this.line);
    this.line.setAttribute("class", "line");

  },

  prepare : function() {
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
    this.prepare();
    if (this.scrubberAnimation) return;
    this.scrubberAnimation = new Animation(
      new KeyframeEffect(this.scrubber,
                         {left:['0%', '100%']},
			 {duration:35 * 1000, iterations:Infinity}), document.timeline);
    this.animationEffects.forEach((effect) => { effect.play(); });
    this.scrubberAnimation.play();
  },

  // シーク(%指定)
  seek: function(seek) {
    if (seek < 0 || seek > 1) { return; }
    if (!this.scrubberAnimation) {
      this.start();
    }
    this.scrubberAnimation.pause();
    this.scrubberAnimation.currentTime = seek * 35 * 1000;
    this.animationEffects.forEach((effect) => { effect.currentTime = seek * 35 * 1000; });
  },

  // 再生
  restart: function() {
    if (!this.scrubberAnimation || this.scrubberAnimation.playState != 'paused') { return; }
    this.animationEffects.forEach((effect) => { effect.play(); });
    this.scrubberAnimation.play();
  },

  // 一時停止
  pause: function() {
    if (!this.scrubberAnimation || this.scrubberAnimation.playState != 'running') { return; }
    this.animationEffects.forEach((effect) => { effect.pause(); });
    this.scrubberAnimation.pause();
  },

  // レイヤー追加・削除に関する関数群
  addLayer: function(layer) {
    if (this.layers.includes(layer)){
      return;
    }

    if (this._isElementLayer(layer)) {
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

      // Animation がある場合は AnimationLayer 追加
      if (this._isElementLayer(layer) && layer.targetElem.getAnimations().length > 0) {
        let anim = layer.targetElem.getAnimations()[0];
        layer.addAnimationLayer(new AnimationLayer("Animation of " + layer.name, anim.effect));
        this._addAnimationLayer(layer.getAnimationLayer(), layer);
        this.animationEffects.push(anim);
      }
    }
  },

  _addAnimationLayer: function(layer, targetLayer) {
    if (!(layer instanceof AnimationLayer)) { return; }
    let elem = document.createElement("div");
    this.containerElement.appendChild(elem);
    elem.setAttribute("class", "animationLayer");
    layer.elem = elem;
    elem.innerText = layer.name;

    if (layer.getEffectDuration() > this.animationsDuration) {
      this.animationsDuration = layer.getEffectDuration();
      this.recalcAnimationTimelineWidth();
    }

    elem.style.width = ((layer.getEffectDuration() / this.animationsDuration) * 100) + '%';
    let cs = getComputedStyle(targetLayer.elem);
    elem.style.top = (parseFloat(cs.top) + parseFloat(cs.height)) + 'px';
  },

  // レイヤーの最後の要素を返す(ない場合は、Line)
  getLastLayer: function() {
    if (this.layers.length <= 0) {
      return this.line;
    }

    let layer = this.layers[this.layers.length - 1];
    if (layer instanceof ElementLayer && !layer.getAnimationLayer()) {
      return layer.elem;
    } else if (layer instanceof ElementLayer && layer.getAnimationLayer()) {
      return layer.getAnimationLayer().elem;
    } else {
      return this.layers[this.layers.length - 1].elem;
    }
  },

  recalcAnimationTimelineWidth: function() {
    this.layers.forEach((layer) => {
      if (layer instanceof AnimationLayer && layer.elem) {
          layer.elem.style.width = ((layer.getEffectDuration() / this.animationsDuration) * 100) + '%';
      }
    });
  },

  // TODO : We might need to move Utility class.
  _isElementLayer: function(layer) {
    return layer instanceof ElementLayer;
  },
};


/*
 * AnimationLayer
 *  アニメーションを示すレイヤー
 *  ElementLayer  に関連づく
 */
function AnimationLayer(name, effect) {
  this.name = name;
  this.effect = effect;
}
AnimationLayer.prototype = {
  getEffect: function() { return this.effect;},

  getEffectDuration: function() {
    if (!this.effect) {
      return 0;
    }

    return this.effect.timing.duration;
  },
};

/*
 * ElementLayer
 *  素材を示すレイヤー
 *  AnimationLayer を持つ(現時点では1つのAnimationLayerのみ)
 */
function ElementLayer(name, targetElem, animationLayer) {
  this.name = name;
  this.targetElem = targetElem;
  this.animationLayer  = animationLayer;
}
ElementLayer.prototype = {
  addAnimationLayer: function(animationLayer) {
    this.animationLayer = animationLayer;
  },
  getAnimationLayer: function() { return this.animationLayer; },

  // 最後のレイヤーを返す(描画で必要)
  getLastLayer: function() {
    if (!this.animationLayer) {
      return this;
    } else {
      return this.animationLayer;
    }
  },
};

