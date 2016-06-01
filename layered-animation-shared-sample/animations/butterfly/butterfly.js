(function() {
  var easings = ["linear", "ease-in", "ease-out", "ease-in-out"];
  var fly = function() {
    var butterfly = document.getElementById("butterfly");
    var butterflyWidth = butterfly.clientWidth;
    var documentWidth = document.documentElement.clientWidth;

    var startPX  = -butterflyWidth;
    var endPX    = documentWidth + butterflyWidth;
    var startVH    = 20 + Math.round(Math.random() * 60);
    var endVH    = 20 + Math.round(Math.random() * 60);
    var duration = 10000 + Math.round(Math.random() * 10000);
    var delay    = 10000 + Math.round(Math.random() * 10000);
    var easing   = easings[Math.floor(Math.random()*4)];

    var keyframes = { transform: [`translate(${startPX}px, ${startVH}vh)`,
                                  `translate(${endPX}px, ${endVH}vh`],
                      visibility: ["hidden", "visible"]};
    var timing = { duration: duration, delay: delay, easing: easing };
    butterfly.animate(keyframes, timing).finished.then(fly);
  };
  document.addEventListener("DOMContentLoaded", function() {
    fly();
  });
})();
