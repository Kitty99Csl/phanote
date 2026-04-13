// Bottom toast notification with auto-dismiss.
// Extracted from App.jsx in Session 7.

import { useEffect } from "react";

export const Toast=({msg,onDone})=>{
  useEffect(()=>{const id=setTimeout(onDone,4500);return()=>clearTimeout(id);},[onDone]);
  return(<div style={{position:"fixed",bottom:90,left:"50%",transform:"translateX(-50%)",background:"rgba(30,30,40,0.93)",backdropFilter:"blur(14px)",color:"#fff",borderRadius:18,padding:"12px 22px",fontSize:13,lineHeight:1.5,maxWidth:320,textAlign:"center",zIndex:999,boxShadow:"0 6px 28px rgba(0,0,0,0.22)",animation:"toastIn .3s cubic-bezier(.34,1.56,.64,1)",fontFamily:"'Noto Sans',sans-serif"}}>{msg}</div>);
};
