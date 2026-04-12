// Theme tokens, currency config, and formatting helpers. Extracted from App.jsx in Session 7.

export const T = {
  celadon:"#ACE1AF", bg:"#F7FCF5", surface:"rgba(255,255,255,0.92)",
  dark:"#2D2D3A", muted:"#9B9BAD",
  shadow:"0 4px 24px rgba(45,45,58,0.07)", shadowLg:"0 12px 40px rgba(45,45,58,0.13)",
};
export const CURR = {
  LAK:{symbol:"₭",name:"Lao Kip",  bg:"linear-gradient(145deg,#FFE27D,#FFAA5E)",pill:"#FFAA5E",pillText:"#7A3E00"},
  THB:{symbol:"฿",name:"Thai Baht", bg:"linear-gradient(145deg,#C9B8FF,#A8C5FF)",pill:"#C9B8FF",pillText:"#3A2A7A"},
  USD:{symbol:"$",name:"US Dollar", bg:"linear-gradient(145deg,#ACE1AF,#7BC8A4)",pill:"#ACE1AF",pillText:"#1A4D2B"},
};
export const fmt=(n,c)=>{const{symbol}=CURR[c];if(c==="LAK")return`${symbol}${Math.round(n).toLocaleString()}`;return`${symbol}${Number(n).toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g,",")}`};
export const fmtCompact=(n,c)=>{if(c==="LAK"){if(n>=1e6)return`₭${(n/1e6).toFixed(1)}M`;if(n>=1e3)return`₭${(n/1e3).toFixed(0)}K`;return`₭${Math.round(n)}`}const s=CURR[c].symbol;return n>=1000?`${s}${(n/1000).toFixed(1)}K`:`${s}${Number(n).toFixed(2)}`};

export const S={title:{fontFamily:"'Noto Sans',sans-serif",fontSize:20,fontWeight:800,color:"#2D2D3A",marginBottom:6},sub:{fontSize:13,color:"#9B9BAD",marginBottom:16,lineHeight:1.5},label:{fontSize:13,fontWeight:700,color:"#2D2D3A",fontFamily:"'Noto Sans',sans-serif"}};
