document.addEventListener("DOMContentLoaded", function() {
  appendTranslateAnimation(document.getElementById("background"));
  appendTranslateAnimation(document.getElementById("middleground"));
  appendTranslateAnimation(document.getElementById("foreground"));
  appendCameraAnimation();
});

function appendTranslateAnimation(section) {
  var right = section.querySelector(".right");
  var width = right.clientWidth;
  right.animate({ transform: ["translate(0px)", `translate(${width}px)`] },
                { duration: 20000, iterations: Infinity });
  var left = section.querySelector(".left");
  left.animate({ transform: [`translate(${-width}px)`, "translate(0px)"] },
               { duration: 20000, iterations: Infinity });
}

function appendCameraAnimation() {
  var keyframes = { transform: ["scale(1)", "scale(1)", "scale(1.5)",
                                "scale(1.5)", "scale(1)"] };
  var timing = { duration: 35000, iterations: Infinity};
  Array.forEach(document.querySelectorAll("section"), function(section) {
    section.animate(keyframes, timing);
  });
}
