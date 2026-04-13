// iOS Safari: position:fixed elements don't shrink when keyboard
// opens. This hook returns how many px the keyboard is covering
// at bottom. Apply as transform:translateY(-Xpx) or marginBottom:Xpx
// on modal sheets.
//
// Previously duplicated in App.jsx and components/Sheet.jsx.
// Consolidated in Session 7.

import { useState, useEffect } from "react";

export const useKeyboardOffset = () => {
  const [offset, setOffset] = useState(0);
  useEffect(() => {
    const vv = window.visualViewport;
    if (!vv) return;
    const update = () => {
      const kh = Math.max(0, window.innerHeight - vv.height - vv.offsetTop);
      setOffset(kh);
    };
    vv.addEventListener("resize", update);
    vv.addEventListener("scroll", update);
    return () => {
      vv.removeEventListener("resize", update);
      vv.removeEventListener("scroll", update);
    };
  }, []);
  return offset;
};
