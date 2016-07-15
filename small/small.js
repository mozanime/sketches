document.addEventListener("DOMContentLoaded", () => {
  const keyframes = { opacity: [1, 0] };
  const timingeffect = { duration: 1000,
                         iterations: "Infinity" };
  const element = document.getElementById("animatable");
  element.animate(keyframes, timingeffect);
});
