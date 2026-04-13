// Brand logo with 5 resolution tiers.
// Renders the Phajot brand mark (transparent PNG, landscape aspect 823x433).
// 5 resolution tiers — picks the smallest source >= display size for sharpness.
// height: auto preserves natural aspect ratio (don't crop the capybora).
// Extracted from App.jsx in Session 7.

export const Logo = ({ size = 64, alt = "Phajot" }) => {
  let src;
  if (size <= 64) src = "/phajot-favicon-64.png";
  else if (size <= 128) src = "/phajot-logo-128.png";
  else if (size <= 256) src = "/phajot-logo-256.png";
  else if (size <= 512) src = "/phajot-logo-512.png";
  else src = "/phajot-logo-1024.png";

  return (
    <img
      src={src}
      alt={alt}
      style={{
        width: size,
        height: "auto",
        maxHeight: size,
        objectFit: "contain",
        display: "block",
      }}
    />
  );
};
