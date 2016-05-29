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
    }
  },

  _addAnimationLayer: function(layer) {
  },

  _addSubLayer: function(layer) {
  },

  _isElementLayer: function(layer) {
    return layer instanceof ElementLayer;
  },

  _isGroupLayer: function(layer) {
    return layer instanceof GroupLayer;
  },

  // レイヤーの最後の要素を返す(ない場合は、Line)
  getLastLayer: function() {
    if (this.layers.length <= 0) {
      return this.line;
    }
    return this.layers[this.layers.length - 1].elem;
  },
};

function Layer(width, delay, name) {
}
Layer.prototype = {
};

function AnimationLayer(width, delay, name) {
  this.width = width;
  this.delay = delay;
  this.name = name;
}
AnimationLayer.prototype = Object.create(Layer.prototype);
AnimationLayer.constructor = AnimationLayer;
AnimationLayer.prototype = {
};

function ElementLayer(width, delay, name, animation) {
  this.width = width;
  this.delay = delay;
  this.name = name;
  this.anim  = animation;
}
ElementLayer.prototype = Object.create(Layer.prototype);
ElementLayer.constructor = ElementLayer;
ElementLayer.prototype = {
};

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
    if( (layer instanceof ElementLayer) || 
        (layer instanceof AnimationLayer) ||
        (layer instanceof GroupLayer)) {
      this.layers.push(layer);
    }
  },
};

const TIME_GRADUATION_MIN_SPACING = 40;
const TIMELINE_BACKGROUND_RESIZE_DEBOUNCE_TIMER = 50;

function AnimationsTimeline() {
    this.animations = [];
    this.targetNodes = [];
    this.timeBlocks = [];
    this.details = [];

    this.onAnimationStateChanged = this.onAnimationStateChanged.bind(this);
    this.onScrubberMouseDown = this.onScrubberMouseDown.bind(this);
    this.onScrubberMouseUp = this.onScrubberMouseUp.bind(this);
    this.onScrubberMouseOut = this.onScrubberMouseOut.bind(this);
    this.onScrubberMouseMove = this.onScrubberMouseMove.bind(this);
    this.onWindowResize = this.onWindowResize.bind(this);
    this.onFrameSelected = this.onFrameSelected.bind(this);

}

AnimationsTimeline.prototype = {
    init: function (containerEl) {
	this.rootWrapperEl = document.createElement("div");
	containerEl.appendChild(this.rootWrapperEl);
	this.rootWrapperEl.setAttribute("class", "animation-timeline");
    
	let scrubberContainer = document.createElement("div");
	this.rootWrapperEl.appendChild(scrubberContainer);
	scrubberContainer.setAttribute("class", "scrubber-wrapper track-container");

	this.scrubberEl = document.createElement("div");
	scrubberContainer.appendChild(this.scrubberEl);
	this.scrubberEl.setAttribute("class", "scrubber");

	this.scrubberHandleEl = document.createElement("div");
	this.scrubberEl.appendChild(this.scrubberHandleEl);
	this.scrubberHandleEl.setAttribute("class", "scrubber-handle");
	this.scrubberHandleEl.addEventListener("mousedown",
					       this.onScrubberMouseDown);

	this.timeHeaderEl = document.createElement("div");
	this.rootWrapperEl.appendChild(this.timeHeaderEl);
	this.timeHeaderEl.setAttribute("class", "time-header track-container");
	this.timeHeaderEl.addEventListener("mousedown",
					   this.onScrubberMouseDown);

	this.animationsEl = document.createElement("div");
	this.rootWrapperEl.appendChild(this.animationsEl);
	this.animationsEl.setAttribute("class", "animations");
    
	window.addEventListener("resize",
				this.onWindowResize);
    },

    destroy: function () {
	this.stopAnimatingScrubber();
	this.unrender();

	window.removeEventListener("resize",
				   this.onWindowResize);
	this.timeHeaderEl.removeEventListener("mousedown",
					      this.onScrubberMouseDown);
	this.scrubberHandleEl.removeEventListener("mousedown",
						  this.onScrubberMouseDown);

	this.rootWrapperEl.remove();
	this.animations = [];

	this.rootWrapperEl = null;
	this.timeHeaderEl = null;
	this.animationsEl = null;
	this.scrubberEl = null;
	this.scrubberHandleEl = null;
    },
  
    unrender: function () {
	for (let animation of this.animations) {
	    animation.off("changed", this.onAnimationStateChanged);
	}
	this.stopAnimatingScrubber();
	this.destroySubComponents("targetNodes");
	this.destroySubComponents("timeBlocks");
	this.destroySubComponents("details", [{
		    event: "frame-selected",
			fn: this.onFrameSelected
			}]);
	this.animationsEl.innerHTML = "";
    },

    onWindowResize: function () {
	if (this.rootWrapperEl.offsetWidth === 0) {
	    return;
	}

	if (this.windowResizeTimer) {
	    this.win.clearTimeout(this.windowResizeTimer);
	}

	this.windowResizeTimer = this.win.setTimeout(() => {
		this.drawHeaderAndBackground();
	    }, TIMELINE_BACKGROUND_RESIZE_DEBOUNCE_TIMER);
    },

    /**
     * When a frame gets selected, move the scrubber to the corresponding position
     */
    onFrameSelected: function (e, {x}) {
	this.moveScrubberTo(x, true);
    },

    onScrubberMouseDown: function (e) {
	this.moveScrubberTo(e.pageX);
	this.win.addEventListener("mouseup", this.onScrubberMouseUp);
	this.win.addEventListener("mouseout", this.onScrubberMouseOut);
	this.win.addEventListener("mousemove", this.onScrubberMouseMove);

	// Prevent text selection while dragging.
	e.preventDefault();
    },

    onScrubberMouseUp: function () {
	this.cancelTimeHeaderDragging();
    },

    onScrubberMouseOut: function (e) {
	// Check that mouseout happened on the window itself, and if yes, cancel
	// the dragging.
	if (!this.win.document.contains(e.relatedTarget)) {
	    this.cancelTimeHeaderDragging();
	}
    },

    cancelTimeHeaderDragging: function () {
	this.win.removeEventListener("mouseup", this.onScrubberMouseUp);
	this.win.removeEventListener("mouseout", this.onScrubberMouseOut);
	this.win.removeEventListener("mousemove", this.onScrubberMouseMove);
    },

    onScrubberMouseMove: function (e) {
	this.moveScrubberTo(e.pageX);
    },

    moveScrubberTo: function (pageX, noOffset) {
	this.stopAnimatingScrubber();

	// The offset needs to be in % and relative to the timeline's area (so we
	// subtract the scrubber's left offset, which is equal to the sidebar's
	// width).
	let offset = pageX;
	if (!noOffset) {
	    offset -= this.timeHeaderEl.offsetLeft;
	}
	offset = offset * 100 / this.timeHeaderEl.offsetWidth;
	if (offset < 0) {
	    offset = 0;
	}

	this.scrubberEl.style.left = offset + "%";

	let time = TimeScale.distanceToRelativeTime(offset);
nn
	this.emit("timeline-data-changed", {
		isPaused: true,
		    isMoving: false,
		    isUserDrag: true,
		    time: time
		    });
    },

    getCompositorStatusClassName: function (state) {
    let className = state.isRunningOnCompositor
                    ? " fast-track"
    : "";

    if (state.isRunningOnCompositor && state.propertyState) {
      className +=
	  state.propertyState.some(propState => !propState.runningOnCompositor)
        ? " some-properties"
	  : " all-properties";
    }

    return className;
    },

    render: function (animations, documentCurrentTime) {
	this.unrender();

	this.animations = animations;
	if (!this.animations.length) {
	    return;
	}

	// Loop first to set the time scale for all current animations.
	for (let {state} of animations) {
	    TimeScale.addAnimation(state);
	}

	this.drawHeaderAndBackground();

	for (let animation of this.animations) {
	    animation.on("changed", this.onAnimationStateChanged);
	    // Each line contains the target animated node and the animation time
	    // block.
	    let animationEl = createNode({
		    parent: this.animationsEl,
		    nodeType: "li",
		    attributes: {
			"class": "animation " +
                   animation.state.type +
			this.getCompositorStatusClassName(animation.state)
		    }
		});

	    // Right below the line is a hidden-by-default line for displaying the
	    // inline keyframes.
	    let detailsEl = createNode({
		    parent: this.animationsEl,
		    nodeType: "li",
		    attributes: {
			"class": "animated-properties " + animation.state.type
		    }
		});

	    let details = new AnimationDetails(this.serverTraits);
	    details.init(detailsEl);
	    details.on("frame-selected", this.onFrameSelected);
	    this.details.push(details);

	    // Left sidebar for the animated node.
	    let animatedNodeEl = createNode({
		    parent: animationEl,
		    attributes: {
			"class": "target"
		    }
		});

	    // Draw the animated node target.
	    let targetNode = new AnimationTargetNode(this.inspector, {compact: true});
	    targetNode.init(animatedNodeEl);
	    targetNode.render(animation);
	    this.targetNodes.push(targetNode);

	    // Right-hand part contains the timeline itself (called time-block here).
	    let timeBlockEl = createNode({
		    parent: animationEl,
		    attributes: {
			"class": "time-block track-container"
		    }
		});

	    // Draw the animation time block.
	    let timeBlock = new AnimationTimeBlock();
	    timeBlock.init(timeBlockEl);
	    timeBlock.render(animation);
	    this.timeBlocks.push(timeBlock);

	    timeBlock.on("selected", this.onAnimationSelected);
	}

	// Use the document's current time to position the scrubber (if the server
	// doesn't provide it, hide the scrubber entirely).
	// Note that because the currentTime was sent via the protocol, some time
	// may have gone by since then, and so the scrubber might be a bit late.
	if (!documentCurrentTime) {
	    this.scrubberEl.style.display = "none";
	} else {
	    this.scrubberEl.style.display = "block";
	    this.startAnimatingScrubber(this.wasRewound()
                                  ? TimeScale.minStartTime
					: documentCurrentTime);
	}
    },

    isAtLeastOneAnimationPlaying: function () {
	return this.animations.some(({state}) => state.playState === "running");
    },
};
