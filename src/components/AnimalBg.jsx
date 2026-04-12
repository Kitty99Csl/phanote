// Fixed background pattern — kawaii animals at low opacity.
// Extracted from App.jsx in Session 7.

export const AnimalBg=()=>(
  <div aria-hidden="true" style={{
    position:"fixed",inset:0,backgroundImage:"url('/bg-pattern.png')",
    backgroundSize:"420px 420px",backgroundRepeat:"repeat",opacity:0.18,
    mixBlendMode:"multiply",pointerEvents:"none",zIndex:0,
  }}/>
);
