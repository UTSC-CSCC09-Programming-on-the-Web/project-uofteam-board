import { useEffect, useState } from "react";

const useMousePressed = () => {
  const [mousePressed, setMousePressed] = useState(false);

  useEffect(() => {
    const handleMouseDown = () => setMousePressed(true);
    const handleMouseUp = () => setMousePressed(false);

    window.addEventListener("mousedown", handleMouseDown);
    window.addEventListener("mouseup", handleMouseUp);

    return () => {
      window.removeEventListener("mousedown", handleMouseDown);
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, []);

  return mousePressed;
};

export { useMousePressed };
