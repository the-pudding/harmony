import"../chunks/DsnmJJEf.js";import{a8 as g,a4 as v,a6 as q,a2 as S,p as u,a5 as m,aa as W,a1 as $,a7 as U,a3 as N,ai as G,q as D,ab as oe,m as j,bf as ae,T as se}from"../chunks/heaiITqj.js";import{b,f as _,c as Z,t as re}from"../chunks/CIubEIuS.js";import{b as A,e as ie,g as z}from"../chunks/CFfhKQpU.js";import{e as F,i as H,a as le,d as ce}from"../chunks/Dr4ZkgsO.js";import{e as pe}from"../chunks/BG-U7eCl.js";import{c as ue}from"../chunks/fBhm86d9.js";import{s as he,p as B}from"../chunks/D1BwOEYG.js";import{s as ee}from"../chunks/CjNA0K93.js";import{b as de}from"../chunks/C9DEXnSp.js";import{C as me,c as ve}from"../chunks/Kbd5fHqn.js";import{i as fe}from"../chunks/KyM7nyqE.js";import{b as ge}from"../chunks/BgSAqw-J.js";import"../chunks/Z_9yVxVw.js";var K={},J={},P=34,L=10,Y=13;function ne(e){return new Function("d","return {"+e.map(function(n,o){return JSON.stringify(n)+": d["+o+'] || ""'}).join(",")+"}")}function ye(e,n){var o=ne(e);return function(a,s){return n(o(a),s,e)}}function X(e){var n=Object.create(null),o=[];return e.forEach(function(a){for(var s in a)s in n||o.push(n[s]=s)}),o}function k(e,n){var o=e+"",a=o.length;return a<n?new Array(n-a+1).join(0)+o:o}function xe(e){return e<0?"-"+k(-e,6):e>9999?"+"+k(e,6):k(e,4)}function be(e){var n=e.getUTCHours(),o=e.getUTCMinutes(),a=e.getUTCSeconds(),s=e.getUTCMilliseconds();return isNaN(e)?"Invalid Date":xe(e.getUTCFullYear())+"-"+k(e.getUTCMonth()+1,2)+"-"+k(e.getUTCDate(),2)+(s?"T"+k(n,2)+":"+k(o,2)+":"+k(a,2)+"."+k(s,3)+"Z":a?"T"+k(n,2)+":"+k(o,2)+":"+k(a,2)+"Z":o||n?"T"+k(n,2)+":"+k(o,2)+"Z":"")}function we(e){var n=new RegExp('["'+e+`
\r]`),o=e.charCodeAt(0);function a(t,c){var w,x,h=s(t,function(C,f){if(w)return w(C,f-1);x=C,w=c?ye(C,c):ne(C)});return h.columns=x||[],h}function s(t,c){var w=[],x=t.length,h=0,C=0,f,I=x<=0,T=!1;t.charCodeAt(x-1)===L&&--x,t.charCodeAt(x-1)===Y&&--x;function V(){if(I)return J;if(T)return T=!1,K;var R,O=h,M;if(t.charCodeAt(O)===P){for(;h++<x&&t.charCodeAt(h)!==P||t.charCodeAt(++h)===P;);return(R=h)>=x?I=!0:(M=t.charCodeAt(h++))===L?T=!0:M===Y&&(T=!0,t.charCodeAt(h)===L&&++h),t.slice(O+1,R-1).replace(/""/g,'"')}for(;h<x;){if((M=t.charCodeAt(R=h++))===L)T=!0;else if(M===Y)T=!0,t.charCodeAt(h)===L&&++h;else if(M!==o)continue;return t.slice(O,R)}return I=!0,t.slice(O,x)}for(;(f=V())!==J;){for(var E=[];f!==K&&f!==J;)E.push(f),f=V();c&&(E=c(E,C++))==null||w.push(E)}return w}function i(t,c){return t.map(function(w){return c.map(function(x){return l(w[x])}).join(e)})}function p(t,c){return c==null&&(c=X(t)),[c.map(l).join(e)].concat(i(t,c)).join(`
`)}function d(t,c){return c==null&&(c=X(t)),i(t,c).join(`
`)}function y(t){return t.map(r).join(`
`)}function r(t){return t.map(l).join(e)}function l(t){return t==null?"":t instanceof Date?be(t):n.test(t+="")?'"'+t.replace(/"/g,'""')+'"':t}return{parse:a,parseRows:s,format:p,formatBody:d,formatRows:y,formatRow:r,formatValue:l}}var _e=we(","),Ie=_e.parse,Te=_('<section id="demo-link"><h2>Link</h2> <p><a href="elements" target="_blank" rel="noopener noreferrer">Default element styles demo</a></p> <p><a href="fonts" target="_blank" rel="noopener noreferrer">Pudding-hosted font previews</a></p> <p><a href="ui" target="_blank" rel="noopener noreferrer">BitsUI styled components</a></p></section>');function ke(e){var n=Te();b(e,n)}var Ae=_('<section id="demo-image"><h2>Image</h2> <p>img tag</p> <img src="../assets/demo/test.jpg" alt="cat" class="svelte-b56t42"/> <p>background image</p> <div class="svelte-b56t42"></div></section>');function Ce(e){var n=Ae();b(e,n)}var Se=_('<section id="demo-element"><h2>Dynamic Svelte Element</h2> <!></section>');function De(e){const n=[{tag:"h3",text:"I am a h3 tag."},{tag:"p",text:"I am p tag."}];var o=Se(),a=g(v(o),2);F(a,17,()=>n,H,(s,i)=>{let p=()=>u(i).tag,d=()=>u(i).text;var y=Z(),r=q(y);pe(r,p,!1,(l,t)=>{var c=re();S(()=>A(c,d())),b(t,c)}),b(s,y)}),m(o),b(e,o)}var Me=_("<p> </p>");function Be(e,n){var o=Me(),a=v(o);m(o),S(()=>A(a,`I am component A and my favorite number is ${n.number??""}.`)),b(e,o)}var je=_("<p> </p>");function Ve(e,n){var o=je(),a=v(o);m(o),S(()=>A(a,`I am component B and my name is ${n.name??""}.`)),b(e,o)}var Ee=_('<section id="demo-component"><h2>Dynamic Svelte Component</h2> <!></section>');function Re(e){const n={A:Be,B:Ve},o=[{component:"A",number:42},{component:"B",name:"Russell"}];var a=Ee(),s=g(v(a),2);F(s,17,()=>o,H,(i,p)=>{const d=W(()=>n[u(p).component]);var y=Z(),r=q(y);ue(r,()=>u(d),(l,t)=>{t(l,he(()=>u(p)))}),b(i,y)}),m(a),b(e,a)}var Oe=_("<div><!></div>");function qe(e,n){$(n,!0);let o=B(n,"root",3,null),a=B(n,"top",3,0),s=B(n,"bottom",3,0),i=B(n,"increments",3,100),p=B(n,"value",15,void 0),d=[],y=[],r=[],l=[],t;function c(){let f=0,I=0;for(let T=0;T<d.length;T++)d[T]>f&&(f=d[T],I=T);f>0?p(I):p(void 0)}function w(f,I){const T=Q=>{Q[0].isIntersecting;const te=Q[0].intersectionRatio;d[I]=te,c()},V=a()?a()*-1:0,E=s()?s()*-1:0,R=`${V}px 0px ${E}px 0px`,O={root:o(),rootMargin:R,threshold:y};l[I]&&l[I].disconnect();const M=new IntersectionObserver(T,O);M.observe(f),l[I]=M}function x(){r.length&&r.forEach(w)}U(()=>{for(let f=0;f<i()+1;f++)y.push(f/i());r=t.querySelectorAll(":scope > *:not(iframe)"),x()}),U(()=>{a(),s(),x()});var h=Oe(),C=v(h);ee(C,()=>n.children??G),m(h),de(h,f=>t=f,()=>t),b(e,h),N()}var Le=_('<div><p class="svelte-1sxgmm9"> </p></div>'),Ue=_('<section id="scrolly"><h2 class="svelte-1sxgmm9">Scrolly <span> </span></h2> <div class="spacer svelte-1sxgmm9"></div> <!> <div class="spacer svelte-1sxgmm9"></div></section>');function We(e){let n=j(void 0);var o=Ue(),a=v(o),s=g(v(a)),i=v(s,!0);m(s),m(a);var p=g(a,4);qe(p,{get value(){return u(n)},set value(d){D(n,d,!0)},children:(d,y)=>{var r=Z(),l=q(r);F(l,16,()=>[0,1,2,3,4],H,(t,c,w)=>{const x=W(()=>u(n)===w);var h=Le();let C;var f=v(h),I=v(f,!0);m(f),m(h),S(()=>{C=le(h,1,"step svelte-1sxgmm9",null,C,{active:u(x)}),A(I,c)}),b(t,h)}),b(d,r)},$$slots:{default:!0}}),oe(2),m(o),S(()=>A(i,u(n)||"-")),b(e,o)}const $e=`{
  "meta": {
    "title": "Mapping every pop hit’s chords",
    "description": "Tk"
  },
  "sections": [
    {
      "title": "Landing",
      "slides": [
        {
          "text": [],
          "map": {
            "visible": "true",
            "movable": "false",
            "hoverable": "false",
            "rotateLabels": "true",
            "centered": "true"
          },
          "stage": {
            "component": "landing",
            "hed": "Mapping every pop hit’s chords",
            "byline": "By <a href=https://pudding.cool/author/michelle-pera-mcghee/ target=_blank>Michelle Pera-McGhee</a> and <a href=https://pudding.cool/author/david-mora/ target=_blank>David Mora</a>"
          }
        }
      ]
    },
    {
      "title": "Intro",
      "slides": [
        {
          "text": [
            {
              "type": "text",
              "value": "In 2009, the Australian comedy group “Axis of Awesome” performed a viral sketch showing that a surprising number of pop songs – from Journey’s “Don’t Stop Believing” to Beyoncé’s “If I Were A Boy” – are built off of the same 4 chords."
            }
          ],
          "stage": {
            "component": "video",
            "videoId": "dead-simple"
          }
        },
        {
          "text": [
            {
              "type": "text",
              "value": "Chords provide the harmonic foundation for a song, so people cite this video as proof that all pop music is formulaic and sounds the same. The sheer volume of songs makes a compelling case."
            }
          ],
          "stage": {
            "component": "video",
            "videoId": "examples"
          }
        },
        {
          "text": [
            {
              "type": "text",
              "value": "But is it true?"
            },
            {
              "type": "text",
              "value": "Is pop music really:"
            },
            {
              "type": "ol",
              "value": {
                "li": [
                  "built on a single four-chord progression 🧱",
                  "looped for the entire song 🔁",
                  "and recycled decade after decade? 🗓️"
                ]
              }
            }
          ]
        },
        {
          "text": [
            {
              "type": "text",
              "value": "To find out, we gathered every Billboard top-20 hit since 1958, [7,300] songs, and scraped their chord progressions from popular online chord sites."
            },
            {
              "type": "text",
              "value": "But to compare thousands of songs, we first need a way to tell when two of them are doing the same thing."
            }
          ]
        }
      ]
    },
    {
      "title": "What is a chord progression?",
      "slides": [
        {
          "text": [
            {
              "type": "text",
              "value": "A chord is a combination of two or more notes. A chord progression is a series of chords that often loops multiple times in a song."
            }
          ]
        },
        {
          "text": [
            {
              "type": "text",
              "value": "But the literal chord names you might be familiar with – like <span class=chord>C, D, Ab</span> – miss something important."
            },
            {
              "type": "text",
              "value": "“All Too Well” goes <button>C-G-Am-F.</button> “With Or Without You” goes <button>D-A-Bm-G.</button> “Demons” goes <button>Eb-Bb-Cm-Ab.</button> On paper, these are different progressions. But to your ear, they move in the same way."
            }
          ]
        },
        {
          "text": [
            {
              "type": "text",
              "value": "Every song has a key, a home base chord that it keeps returning to. If we name each chord instead by its distance from home, we can see that these songs actually share a chord progression."
            },
            {
              "type": "text",
              "value": "Musicians notate this with roman numerals. The <span class=chord>I</span> is the home base chord, <span class=chord>ii</span> is a step away, <span class=chord>iii</span> is another step away, <span class=chord>IV, V, vi, vii.</span>"
            },
            {
              "type": "text",
              "value": "So, these songs all go <span class=chord>I-V-vi-IV</span>, which is the Axis of Awesome “four chords” progression."
            }
          ]
        },
        {
          "text": [
            {
              "type": "text",
              "value": "Songs also differ in how much they lean on a progression. Some are 100% one progression on repeat. Others use it as one ingredient in a more varied harmonic recipe."
            }
          ]
        }
      ]
    },
    {
      "title": "Lots of journeys",
      "slides": [
        {
          "text": [
            {
              "type": "text",
              "value": "With those two ideas, which progressions a song uses and how much, we can put every song on the same map."
            },
            {
              "type": "text",
              "value": "Here is every Billboard top-20 hit since 1958, arranged by the mix of progressions each one uses."
            }
          ],
          "map": {
            "visible": "true"
          }
        },
        {
          "text": [
            {
              "type": "text",
              "value": "Here's how the map works. Songs sit near others with a similar mix of progressions. The purists, built mostly from one progression, cluster at the center of each island, and mixed songs spread out between them."
            },
            {
              "type": "text",
              "value": "<span class=small>Learn more about how we matched chord progressions and made the map in the <a href=#methods>methods</a>.</span>"
            }
          ],
          "map": {
            "visible": "true"
          }
        },
        {
          "text": [
            {
              "type": "text",
              "value": "Here is the <strong>Axis of Awesome</strong> cluster."
            },
            {
              "type": "text",
              "value": "They were onto something, lots of songs rely heavily on this progression, but this only makes up about [2%] of songs in the dataset."
            }
          ],
          "map": {
            "visible": "true",
            "focusCluster": "axis of awesome"
          }
        },
        {
          "text": [
            {
              "type": "text",
              "value": "So, what’s on the rest of the map? These are the most common chord progressions in our dataset."
            },
            {
              "type": "text",
              "value": "Let’s take a closer look at this list, because these don’t all feel the same."
            }
          ],
          "map": {
            "visible": "true"
          },
          "stage": {
            "component": "list"
          }
        },
        {
          "text": [
            {
              "type": "text",
              "value": "You’ll notice a lot of them involve combinations of only <span class=chord>I, IV, and V</span>. If you’re gonna learn 3 chords, learn those."
            }
          ],
          "map": {
            "visible": "true"
          },
          "stage": {
            "component": "list",
            "highlight": "I-IV vamp, happy walk up, beer never broke my <3, I-V vamp, sweet home alabama, Cheerleader (verse), V-IV vamp, happy walk down, IV-V vamp, major-y, Cheerleader (chorus)"
          }
        },
        {
          "text": [
            {
              "type": "text",
              "value": "There’s a reason. These are the 3 core building blocks of Western harmony that create a journey of tension and release. This goes way back, like Bach back."
            },
            {
              "type": "text",
              "value": "The <span class=chord>I</span> is our home base, the starting chord of the key. It feels stable and resolved."
            },
            {
              "type": "text",
              "value": "The <span class=chord>IV</span> is a little step away from home."
            },
            {
              "type": "text",
              "value": "The <span class=chord>V</span> is further, more unstable. It really wants to go back to <span class=chord>I</span>."
            },
            {
              "type": "text",
              "value": "Like in <strong>You’re Still The One</strong> by Shania Twain, where it ends on the <span class=chord>V</span>. My ear, at least, is begging for it to end back on the <span class=chord>I</span> and come home ."
            }
          ]
        },
        {
          "text": [
            {
              "type": "text",
              "value": "Some progressions borrow from outside the key. Sweet Home Mixolydian, named for \\"Sweet Home Alabama,\\" detours to a chord from the Mixolydian mode (not important unless you’re a nerd, but that’s the major scale with a lowered 7th), which gives it a bluesy sound before it resolves through the <span class=chord>IV</span>."
            }
          ]
        },
        {
          "text": [
            {
              "type": "text",
              "value": "This progression, named for the chorus of <strong>Poker Face</strong>, centers around a minor version of the <span class=chord>i</span> chord (lowercase numeral = minor)."
            },
            {
              "type": "text",
              "value": "Minor progressions tend to feel a bit darker than major ones, it’s like a different color palette to work with."
            }
          ]
        },
        {
          "text": [
            {
              "type": "text",
              "value": "So pop doesn't run on one formula. It has many, and they produce different emotional journeys."
            }
          ]
        }
      ]
    },
    {
      "title": "Getting loopier",
      "slides": [
        {
          "text": [
            {
              "type": "text",
              "value": "Ok, but even if pop songs pull from a variety of progressions, perhaps each song just endlessly loops that single progression, without creativity or nuance?"
            }
          ]
        },
        {
          "text": [
            {
              "type": "text",
              "value": "If we want to count the number of progressions in a song, we should weight them by how often they appear."
            },
            {
              "type": "text",
              "value": "We’ll call that a song’s number of <strong>effective progressions</strong>. That way, a song dominated by 1 progression with a 2nd that appears only once gets a score of 1.1 effective progressions, rather than 2."
            }
          ]
        },
        {
          "text": [
            {
              "type": "text",
              "value": "There’s a pretty even split between songs with few progressions and songs with a lot of progressions."
            }
          ]
        },
        {
          "text": [
            {
              "type": "text",
              "value": "But that has changed over time."
            },
            {
              "type": "text",
              "value": "The median song went from 4.4 effective progressions in the 1970s (the most diverse decade) to 1.9 in the 2010s (the most homogenous)."
            }
          ]
        },
        {
          "text": [
            {
              "type": "text",
              "value": "So even though it’s not the case that most songs are just 1 loop, songs are getting loopier. The Axis of Awesome boys had their finger on something real."
            }
          ]
        }
      ]
    },
    {
      "title": "Era definers",
      "slides": [
        {
          "text": [
            {
              "type": "text",
              "value": "What about the final claim, that progressions are deployed ubiquitously across time?"
            }
          ]
        },
        {
          "text": [
            {
              "type": "text",
              "value": "Many of the most common progressions are. There are only a few standouts that really define an era."
            }
          ]
        },
        {
          "text": [
            {
              "type": "text",
              "value": "The Axis of Awesome sketch and its claims are a product of their time period."
            },
            {
              "type": "text",
              "value": "“The four chords” surged in the late 2000s, their performance was in 2009. This progression is [3x] more common in the 2000s vs other decades, and was found in a full [11%] of songs."
            }
          ]
        },
        {
          "text": [
            {
              "type": "text",
              "value": "It begs the question: Did every decade have its own version of Axis of Awesome chord progression?"
            },
            {
              "type": "text",
              "value": "Interestingly, not really…"
            },
            {
              "type": "text",
              "value": "…with one huge exception: the 50s and 60s was dominated by doo wop."
            },
            {
              "type": "text",
              "value": "[1 in 9] songs during that period included a doo wop progression. It was [2.6x] more common then than overall in the dataset."
            }
          ]
        },
        {
          "text": [
            {
              "type": "text",
              "value": "The <strong>doo wop</strong> progression is <span class=chord>I-vi-IV-V</span>."
            },
            {
              "type": "text",
              "value": "It’s the same 4 chords as <strong>Axis of Awesome</strong>, in a different order."
            },
            {
              "type": "text",
              "value": "These two classic progressions dominated and defined their respective eras."
            }
          ]
        }
      ]
    }
  ]
}`;var Ne=_('<p> </p> <progress max="100"></progress>',1);function Fe(e,n){let o=B(n,"label",3,"A"),a=B(n,"value",3,0);var s=Ne(),i=q(s),p=v(i,!0);m(i);var d=g(i,2);S(()=>{A(p,o()),ce(d,a())}),b(e,s)}var He=_('<section id="cms"><h2>MicroCMS</h2> <code><pre> </pre></code> <!></section>');function Je(e,n){$(n,!0);const{body:o}=ve,a={Test:Fe};var s=He(),i=g(v(s),2),p=v(i),d=v(p,!0);m(p),m(i);var y=g(i,2);me(y,{get components(){return a},get body(){return o}}),m(s),S(r=>A(d,r),[()=>$e.replace(/\t/g," ")]),b(e,s),N()}const Pe=(e,n=G)=>{var o=Ye(),a=v(o),s=v(a,!0);m(a);var i=g(a,2),p=v(i,!0);m(i),m(o),S(()=>{A(s,n().name),A(p,n().age)}),b(e,o)};var Ye=_('<div class="person svelte-q3gttf"><p class="svelte-q3gttf"> </p> <p class="svelte-q3gttf"> </p></div>'),Ge=_('<h2>Svelte5</h2> <h3>Reactive variables 3 ways:</h3> <button class="svelte-q3gttf">count++</button> <p class="svelte-q3gttf"> </p> <p class="svelte-q3gttf"> </p> <p class="svelte-q3gttf"> </p> <h3>Children (previously slots):</h3> <div class="children"><!></div> <h3>Dispatch Event</h3> <button class="svelte-q3gttf">Random</button>  <h3>Snippets</h3> <div class="people svelte-q3gttf"></div>',1);function Ze(e,n){$(n,!0),B(n,"age",3,30);const o=[{name:"John",age:30},{name:"Jill",age:45}];let a=j(0),s=W(()=>u(a)*2),i=W(()=>u(a)*2),p=j(0);U(()=>{D(p,u(a)*2)});var d=Ge(),y=g(q(d),4),r=g(y,2),l=v(r);m(r);var t=g(r,2),c=v(t);m(t);var w=g(t,2),x=v(w);m(w);var h=g(w,4),C=v(h);ee(C,()=>n.children??G),m(h);var f=g(h,4),I=g(f,4);F(I,21,()=>o,H,(T,V)=>{Pe(T,()=>u(V))}),m(I),S(()=>{A(l,`${u(a)??""} doubled is ${u(s)??""} (derived)`),A(c,`${u(a)??""} doubled is ${u(i)??""} (derived by)`),A(x,`${u(a)??""} doubled is ${u(p)??""} ($effect)`)}),z("click",y,()=>ae(a)),z("click",f,()=>n.random(Math.floor(Math.random()*10))),b(e,d),N()}ie(["click"]);const Qe=(e,n)=>{let o=j(se(e)),a=j(null),s=j(!0),i=j(null);const p=(r=!0)=>{D(s,r,!0),r&&(D(i,null),D(a,null))},d=async()=>{if(!u(o))return[null,null];try{const r=await fetch(u(o),n);if(!r.ok)throw new Error(`Unexpected error occurred (status ${r.status})`);if(u(o).includes(".csv")){const l=await r.text();return[null,Ie(l)]}return[null,await r.json()]}catch(r){return[r instanceof Error?r.message:"Unexpected error occurred",null]}},y=async r=>{p(!0);const[l,t]=await d();if(r===u(o)){if(l){p(!1),D(i,l,!0);return}p(!1),D(a,t,!0)}};return U(()=>{y(u(o))}),{get data(){return u(a)},get loading(){return u(s)},get error(){return u(i)},get url(){return u(o)},set url(r){u(o)!==r&&D(o,r,!0)}}};var ze=_("<p>loading data...</p>"),Ke=_("<p> </p>"),Xe=_("<p>data loaded</p> <pre> </pre>",1),en=_('<div class="c"><h2>Load Data</h2> <div class="response"><!></div></div>');function nn(e,n){$(n,!0);const o=`${ge}/assets/demo/test.csv`,a=Qe(o);U(()=>{});var s=en(),i=g(v(s),2),p=v(i);{var d=l=>{var t=ze();b(l,t)},y=l=>{var t=Ke(),c=v(t);m(t),S(()=>A(c,`error: ${a.error??""}`)),b(l,t)},r=l=>{var t=Xe(),c=g(q(t),2),w=v(c,!0);m(c),S(x=>A(w,x),[()=>JSON.stringify(a.data,null,2)]),b(l,t)};fe(p,l=>{a.loading?l(d):a.error?l(y,1):l(r,-1)})}m(i),m(s),b(e,s),N()}var tn=_('<div id="demo" class="svelte-15aotx7"><h1>Demo</h1> <!> <!> <!> <!> <!> <!> <!> <!></div>');function on(e){let n=j(0);function o(c){console.log(c)}var a=tn(),s=g(v(a),2);ke(s);var i=g(s,2);Ce(i);var p=g(i,2);De(p);var d=g(p,2);Re(d);var y=g(d,2);Je(y,{});var r=g(y,2);nn(r,{});var l=g(r,2);We(l);var t=g(l,2);Ze(t,{random:o,get value(){return u(n)},set value(c){D(n,c,!0)}}),m(a),b(e,a)}function xn(e){on(e)}export{xn as component};
