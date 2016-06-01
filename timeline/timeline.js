/**
 * timeline.js
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

  // TODO : Fixed value
  let frames = document.querySelectorAll("iframe");
  timeline.addLayer(new ElementLayer("background", frames[0], 2));
  timeline.addLayer(new ElementLayer("middleground", frames[1], 100));
  timeline.addLayer(new ElementLayer("foreground", frames[2], 900));
  frames[2].style.zIndex = 900;

  let main = document.querySelectorAll("main")[0];
  let elementLayer = new ElementLayer("main", main, 1);
  timeline.addLayer(elementLayer);

  // reorder.
  timeline.reOrderLayer();

  let addNumber = 100;

  // Rough implementation
  window.addEventListener("keyup", (e) => {
    switch (e.keyCode) {
    case e.DOM_VK_SPACE:
      timeline.start();
      break;
    case e.DOM_VK_P:
      timeline.pause();
      break;
    case e.DOM_VK_R:
      timeline.restart();
      break;
    case e.DOM_VK_S:
      timeline.seek(0.25);
      break;
    case e.DOM_VK_A:
      // Add new animation effect to main(top layer)
      let newElem = document.createElement("section");
      main.appendChild(newElem);
      newElem.setAttribute("id", "playground");
      newElem.appendAnimation("./animations/butterfly/butterfly.html");
      newElem.children[0].addEventListener("load", ()=>{
        let newElemLayer = new ElementLayer("Buterfly!", newElem.children[0], (++addNumber));
        timeline.addLayer(newElemLayer);
	timeline.reOrderLayer();
      });
      break;
    case e.DOM_VK_H:
      if (scrubber.style.visibility == 'hidden') {
        scrubber.style.visibility = 'visible';
      } else {
        scrubber.style.visibility = 'hidden';
      }
      break;
    }
  });

  timeline.start();
}

function Timeline() {
  this.layers = [];
  this.scrubberAnimation = undefined;
  this.animationEffects = []; // 各レイヤーを探索する時間を避ける為
  this.animationsDuration = 20*1000;  // Maximum animation duration.(currently fixed value)

  this.onScrubberMouseDown  = this.onScrubberMouseDown.bind(this);
  this.onScrubberMouseUp    = this.onScrubberMouseUp.bind(this);
  this.onScrubberMouseLeave = this.onScrubberMouseLeave.bind(this);
  this.moveScrubberTo       = this.moveScrubberTo.bind(this);
  this.cancelTimeHeaderDragging = this.cancelTimeHeaderDragging.bind(this);
  this.addNewEffectLayer    = this.addNewEffectLayer.bind(this);
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
    this.scrubber.addEventListener("mouseup", this.onScrubberMouseUp);
    this.containerElement.removeEventListener("mouseup", this.onScrubberMouseUp);
    this.containerElement.removeEventListener("mousemove", this.onScrubberMouseMove);
  },

  moveScrubberTo: function(pageX) {
    let pos = (pageX / this.containerWidth)
    this.scrubber.style.left = pos * 100 + '%';
    this.seek(pos);
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
      elem.setAttribute("class", "elementLayer");
      elem.innerText = layer.name;

      let last = this.getLastLayer();
      let cs = getComputedStyle(last);
      elem.style.top = (parseFloat(cs.top) + parseFloat(cs.height)) + 'px';

      this.layers.push(layer);

      let animatedElement = layer.getAnimatedElement();
      if (this._isElementLayer(layer) && animatedElement.getAnimations().length > 0) {
        let anims = animatedElement.getAnimations();
        for (let i=0; i<anims.length; i++) {
          let anim = anims[i];
          let effectLayer = new EffectLayer("Anim[" + layer.name + "]", anim.effect)
          this._addEffectLayer(effectLayer, layer);
          layer.addEffectLayer(effectLayer);
          this.animationEffects.push(anim);
        }
      }
    }
  },

  addNewEffectLayer: function(effectLayer, targetElementLayer) {
    if (!(targetElementLayer instanceof ElementLayer)) { return; }
    if (!(effectLayer instanceof EffectLayer)) { return; }
    if (!this.layers.includes(targetElementLayer)) { return; }

    // Add EffectLayer
    if (targetElementLayer.getEffectLayers().includes(effectLayer)) {
      console.log("already added animationlayer");
      return;
    }
    // TODO :
    //   - Recalculate top position all elements. (currently last element only)
    let anim = new Animation(effectLayer.getEffect(), document.timeline);
    this._addEffectLayer(effectLayer, targetElementLayer);
    this.animationEffects.push(anim);
    anim.play();
    anim.currentTime = this.animationEffects[0].currentTime;  // TODO

    targetElementLayer.addEffectLayer(effectLayer);
    this.reOrderLayer();
  },

  _addEffectLayer: function(layer, targetLayer) {
    if (!(layer instanceof EffectLayer)) { return; }
    let elem = document.createElement("div");
    this.containerElement.appendChild(elem);
    elem.setAttribute("class", "effectLayer");
    layer.elem = elem;
    elem.innerText = layer.name;

    if (layer.getEffectDuration() > this.animationsDuration) {
      this.animationsDuration = layer.getEffectDuration();
      this.recalcAnimationTimelineWidth();
    }

    elem.style.width = ((layer.getEffectDuration() / this.animationsDuration) * 100) + '%';
    let previousElem = targetLayer.getLastLayer().elem;
    let cs = getComputedStyle(previousElem);
    let previousElemTop = (previousElem.style.top)?parseFloat(previousElem.style.top):parseFloat(cs.top);
    elem.style.top = (previousElemTop + parseFloat(cs.height)) + 'px';
  },

  // Re-Order and change the position of layer
  reOrderLayer: function() {
    if (this.layers.length == 0) { return; }

    // First, sort to layers
    this.layers.sort(function(a,b){
      if (!a.targetElem || !a.zIndex ||
          !b.targetElem || !b.zIndex) {
	  return 0;
      }
      let aZIndex = a.zIndex;
      let bZIndex = b.zIndex;
      if (aZIndex < bZIndex) return -1;
      else if (aZIndex > bZIndex) return 1;
      return 0;
    });

    let previousElement = this.line;
    Array.forEach(this.layers, (layer) => {
      this._changeElementPosition(layer.elem, previousElement);
      previousElement = layer.elem;

      let effectLayers = layer.getEffectLayers();
      Array.forEach(effectLayers, (effectLayer) => {
        this._changeElementPosition(effectLayer.elem, previousElement);
	previousElement = effectLayer.elem;
      });
    });
  },

  _changeElementPosition: function(targetElem, previousElem) {
    let cs = getComputedStyle(previousElem);
    targetElem.style.top = (parseFloat(cs.top) + parseFloat(cs.height)) + 'px';
  },

  // レイヤーの最後の要素を返す(ない場合は、Line)
  getLastLayer: function() {
    if (this.layers.length <= 0) {
      return this.line;
    }
    let layer = this.layers[this.layers.length - 1];
    return layer.getLastLayer().elem;
  },

  recalcAnimationTimelineWidth: function() {
    this.layers.forEach((layer) => {
      if (layer instanceof EffectLayer && layer.elem) {
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
 * EffectLayer
 *  アニメーションを示すレイヤー
 *  ElementLayer  に関連づく
 */
function EffectLayer(name, effect) {
  this.name = name;
  this.effect = effect;
}
EffectLayer.prototype = {
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
 */
function ElementLayer(name, targetElem, zIndex) {
  this.name = name;
  this.targetElem = targetElem;
  this.effectLayers  = [];
  this.zIndex = zIndex;
}
ElementLayer.prototype = {
  addEffectLayer: function(effectLayer) {
    if(effectLayer) {
      this.effectLayers.push(effectLayer);
    }
  },

  getAnimatedElement: function() {
    if (this.targetElem.tagName == 'IFRAME') {
      return this.targetElem.contentDocument;
    }
    return this.targetElem;
  },

  getEffectLayers: function() { return this.effectLayers; },

  getLastLayer: function() {
    if (this.effectLayers.length == 0) {
      return this;
    } else {
      return this.effectLayers[this.effectLayers.length - 1];
    }
  },

};

