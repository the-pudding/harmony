const s="https://www.youtube.com/results?search_query=",n=({title:t,artists:e,year:o})=>{const r=[t,...e,...o!==void 0?[String(o)]:[]];return`${s}${encodeURIComponent(r.join(" "))}`};export{n as b};
