import"../chunks/DsnmJJEf.js";import{a4 as f,a0 as v,a2 as O,_ as D,p as u,a1 as m,a6 as q,Z as N,a3 as W,$,ab as Z,q as E,a7 as oe,m as A,bi as se,N as ae}from"../chunks/BVEWPbq3.js";import{a as b,f as _,c as G,t as re}from"../chunks/CSHEByjT.js";import{a as C,d as ie,f as z}from"../chunks/Bte0jQNb.js";import{e as P,i as Y,a as le,d as ce}from"../chunks/CROhPeJ9.js";import{e as pe}from"../chunks/DsEO6FGd.js";import{c as ue}from"../chunks/DsD3Be7A.js";import{s as he,p as B}from"../chunks/BWaGEmt2.js";import{s as ee}from"../chunks/BYBpUMv6.js";import{b as de}from"../chunks/CEDXCTy0.js";import{C as me,c as ve}from"../chunks/D_qzM1ub.js";import{i as ge}from"../chunks/CjDQlEXr.js";import{b as fe}from"../chunks/BYKpyOwv.js";import"../chunks/Z_9yVxVw.js";var X={},F={},J=34,U=10,H=13;function ne(e){return new Function("d","return {"+e.map(function(n,o){return JSON.stringify(n)+": d["+o+'] || ""'}).join(",")+"}")}function ye(e,n){var o=ne(e);return function(s,a){return n(o(s),a,e)}}function K(e){var n=Object.create(null),o=[];return e.forEach(function(s){for(var a in s)a in n||o.push(n[a]=a)}),o}function T(e,n){var o=e+"",s=o.length;return s<n?new Array(n-s+1).join(0)+o:o}function xe(e){return e<0?"-"+T(-e,6):e>9999?"+"+T(e,6):T(e,4)}function be(e){var n=e.getUTCHours(),o=e.getUTCMinutes(),s=e.getUTCSeconds(),a=e.getUTCMilliseconds();return isNaN(e)?"Invalid Date":xe(e.getUTCFullYear())+"-"+T(e.getUTCMonth()+1,2)+"-"+T(e.getUTCDate(),2)+(a?"T"+T(n,2)+":"+T(o,2)+":"+T(s,2)+"."+T(a,3)+"Z":s?"T"+T(n,2)+":"+T(o,2)+":"+T(s,2)+"Z":o||n?"T"+T(n,2)+":"+T(o,2)+"Z":"")}function we(e){var n=new RegExp('["'+e+`
\r]`),o=e.charCodeAt(0);function s(t,c){var w,x,h=a(t,function(S,g){if(w)return w(S,g-1);x=S,w=c?ye(S,c):ne(S)});return h.columns=x||[],h}function a(t,c){var w=[],x=t.length,h=0,S=0,g,I=x<=0,k=!1;t.charCodeAt(x-1)===U&&--x,t.charCodeAt(x-1)===H&&--x;function V(){if(I)return F;if(k)return k=!1,X;var L,R=h,j;if(t.charCodeAt(R)===J){for(;h++<x&&t.charCodeAt(h)!==J||t.charCodeAt(++h)===J;);return(L=h)>=x?I=!0:(j=t.charCodeAt(h++))===U?k=!0:j===H&&(k=!0,t.charCodeAt(h)===U&&++h),t.slice(R+1,L-1).replace(/""/g,'"')}for(;h<x;){if((j=t.charCodeAt(L=h++))===U)k=!0;else if(j===H)k=!0,t.charCodeAt(h)===U&&++h;else if(j!==o)continue;return t.slice(R,L)}return I=!0,t.slice(R,x)}for(;(g=V())!==F;){for(var M=[];g!==X&&g!==F;)M.push(g),g=V();c&&(M=c(M,S++))==null||w.push(M)}return w}function i(t,c){return t.map(function(w){return c.map(function(x){return l(w[x])}).join(e)})}function p(t,c){return c==null&&(c=K(t)),[c.map(l).join(e)].concat(i(t,c)).join(`
`)}function d(t,c){return c==null&&(c=K(t)),i(t,c).join(`
`)}function y(t){return t.map(r).join(`
`)}function r(t){return t.map(l).join(e)}function l(t){return t==null?"":t instanceof Date?be(t):n.test(t+="")?'"'+t.replace(/"/g,'""')+'"':t}return{parse:s,parseRows:a,format:p,formatBody:d,formatRows:y,formatRow:r,formatValue:l}}var _e=we(","),Ie=_e.parse,ke=_('<section id="demo-link"><h2>Link</h2> <p><a href="elements" target="_blank" rel="noopener noreferrer">Default element styles demo</a></p> <p><a href="fonts" target="_blank" rel="noopener noreferrer">Pudding-hosted font previews</a></p> <p><a href="ui" target="_blank" rel="noopener noreferrer">BitsUI styled components</a></p></section>');function Te(e){var n=ke();b(e,n)}var Ce=_('<section id="demo-image"><h2>Image</h2> <p>img tag</p> <img src="../assets/demo/test.jpg" alt="cat" class="svelte-b56t42"/> <p>background image</p> <div class="svelte-b56t42"></div></section>');function Se(e){var n=Ce();b(e,n)}var De=_('<section id="demo-element"><h2>Dynamic Svelte Element</h2> <!></section>');function Ee(e){const n=[{tag:"h3",text:"I am a h3 tag."},{tag:"p",text:"I am p tag."}];var o=De(),s=f(v(o),2);P(s,17,()=>n,Y,(a,i)=>{let p=()=>u(i).tag,d=()=>u(i).text;var y=G(),r=O(y);pe(r,p,!1,(l,t)=>{var c=re();D(()=>C(c,d())),b(t,c)}),b(a,y)}),m(o),b(e,o)}var je=_("<p> </p>");function Be(e,n){var o=je(),s=v(o);m(o),D(()=>C(s,`I am component A and my favorite number is ${n.number??""}.`)),b(e,o)}var Ae=_("<p> </p>");function Ve(e,n){var o=Ae(),s=v(o);m(o),D(()=>C(s,`I am component B and my name is ${n.name??""}.`)),b(e,o)}var Me=_('<section id="demo-component"><h2>Dynamic Svelte Component</h2> <!></section>');function Le(e){const n={A:Be,B:Ve},o=[{component:"A",number:42},{component:"B",name:"Russell"}];var s=Me(),a=f(v(s),2);P(a,17,()=>o,Y,(i,p)=>{const d=q(()=>n[u(p).component]);var y=G(),r=O(y);ue(r,()=>u(d),(l,t)=>{t(l,he(()=>u(p)))}),b(i,y)}),m(s),b(e,s)}var Re=_("<div><!></div>");function Oe(e,n){N(n,!0);let o=B(n,"root",3,null),s=B(n,"top",3,0),a=B(n,"bottom",3,0),i=B(n,"increments",3,100),p=B(n,"value",15,void 0),d=[],y=[],r=[],l=[],t;function c(){let g=0,I=0;for(let k=0;k<d.length;k++)d[k]>g&&(g=d[k],I=k);g>0?p(I):p(void 0)}function w(g,I){const k=Q=>{Q[0].isIntersecting;const te=Q[0].intersectionRatio;d[I]=te,c()},V=s()?s()*-1:0,M=a()?a()*-1:0,L=`${V}px 0px ${M}px 0px`,R={root:o(),rootMargin:L,threshold:y};l[I]&&l[I].disconnect();const j=new IntersectionObserver(k,R);j.observe(g),l[I]=j}function x(){r.length&&r.forEach(w)}W(()=>{for(let g=0;g<i()+1;g++)y.push(g/i());r=t.querySelectorAll(":scope > *:not(iframe)"),x()}),W(()=>{s(),a(),x()});var h=Re(),S=v(h);ee(S,()=>n.children??Z),m(h),de(h,g=>t=g,()=>t),b(e,h),$()}var Ue=_('<div><p class="svelte-1sxgmm9"> </p></div>'),We=_('<section id="scrolly"><h2 class="svelte-1sxgmm9">Scrolly <span> </span></h2> <div class="spacer svelte-1sxgmm9"></div> <!> <div class="spacer svelte-1sxgmm9"></div></section>');function qe(e){let n=A(void 0);var o=We(),s=v(o),a=f(v(s)),i=v(a,!0);m(a),m(s);var p=f(s,4);Oe(p,{get value(){return u(n)},set value(d){E(n,d,!0)},children:(d,y)=>{var r=G(),l=O(r);P(l,16,()=>[0,1,2,3,4],Y,(t,c,w)=>{const x=q(()=>u(n)===w);var h=Ue();let S;var g=v(h),I=v(g,!0);m(g),m(h),D(()=>{S=le(h,1,"step svelte-1sxgmm9",null,S,{active:u(x)}),C(I,c)}),b(t,h)}),b(d,r)},$$slots:{default:!0}}),oe(2),m(o),D(()=>C(i,u(n)||"-")),b(e,o)}const Ne=`{
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
            "component": "Landing",
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
              "value": "In 2009, the Australian comedy group “Axis of Awesome” performed a viral sketch showing that a surprising number of pop songs – from Journey’s “Don’t Stop Believin’” to Beyoncé’s “If I Were A Boy” – are built off of the same 4 chords."
            }
          ],
          "stage": {
            "component": "Video",
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
            "component": "Video",
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
          ],
          "stage": {
            "component": "UltimateGuitar",
            "songs": "3"
          }
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
              "value": "Underneath the melody is a song’s harmony, a bed of chords (multiple notes played together) that shift in a repeating pattern called a <strong>chord progression</strong>."
            }
          ],
          "stage": {
            "component": "UltimateGuitar",
            "songs": "1"
          }
        },
        {
          "text": [
            {
              "type": "text",
              "value": "But the literal chord names you might be familiar with – like <span class=chord>C</span>, <span class=chord>D</span>, or <span class=chord>E</span> – miss something important."
            },
            {
              "type": "text",
              "value": "“I’m Yours”, “Don’t Stop Believin’”, and “You’re Beautiful” all have different chords on paper. But to your ear, they move in the same way."
            }
          ],
          "stage": {
            "component": "RomanNumerals",
            "keys": [
              "B",
              "E",
              "Eb"
            ],
            "symbols": "chords",
            "labelHome": "false"
          }
        },
        {
          "text": [
            {
              "type": "text",
              "value": "Every song has a key, a home base chord that it keeps returning to. If we name each chord instead by its distance from home, we can see that these songs actually share a chord progression."
            },
            {
              "type": "text",
              "value": "Musicians notate this with roman numerals. The <span class=chord>I</span> is the home base chord, <span class=chord>ii</span> is a step away, <span class=chord>iii</span> is another step away, so on and so forth."
            },
            {
              "type": "text",
              "value": "<span class=small>Click any chord to flip between its name and numeral.</span>"
            }
          ],
          "stage": {
            "component": "RomanNumerals",
            "keys": [
              "E"
            ],
            "symbols": "numerals"
          }
        },
        {
          "text": [
            {
              "type": "text",
              "value": "So, we can describe all of these progressions as <span class=chords>I-V-vi-IV</span>."
            },
            {
              "type": "text",
              "value": "Basically, you could sing the beginning of “Don’t Stop Believin’” over any of these, and it would sound right."
            },
            {
              "type": "text",
              "value": "This is what we’ll call the <strong class=progression>axis of awesome</strong> progression."
            }
          ],
          "stage": {
            "component": "RomanNumerals",
            "keys": [
              "B",
              "E",
              "Eb"
            ],
            "symbols": "numerals"
          }
        },
        {
          "text": [
            {
              "type": "text",
              "value": "Songs also differ in how much they lean on a progression. Some are 100% one progression on repeat. Others use it as one ingredient in a more varied harmonic recipe."
            }
          ],
          "stage": {
            "component": "EffectiveProgressions",
            "songs": [
              "journey__dont-stop-believin",
              "justin-bieber-featuring-chance-the-rapper__holy"
            ],
            "showEffective": "false"
          }
        }
      ]
    },
    {
      "title": "Lots of journeys 🧱",
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
            "visible": "true",
            "movable": "false",
            "hoverable": "false",
            "hideLabels": "true"
          }
        },
        {
          "text": [
            {
              "type": "text",
              "value": "Here's how the map works. Zoom in on these islands, and you’ll see each dot as a song, placed near songs that use a similar mix of chord progressions. When enough similar songs gather in one area, they form a cluster. Songs in grey don't have enough close neighbors to belong to any cluster; their mix of progressions is too unusual."
            },
            {
              "type": "text",
              "value": "The purists, built mostly from one progression, are at the center of each cluster, and mixed songs spread out between them."
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
              "value": "Here is the <strong class=progression>axis of awesome</strong> cluster."
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
              "value": "So, what’s on the rest of the map?"
            }
          ],
          "map": {
            "visible": "true"
          },
          "overlay": {
            "component": "List",
            "highlight": "axis of awesome",
            "obscure": "true"
          }
        },
        {
          "text": [
            {
              "type": "text",
              "value": "These are the most common chord progressions in our dataset."
            },
            {
              "type": "text",
              "value": "Let’s take a closer look at this list, because they each have their own distinct feel."
            }
          ],
          "map": {
            "visible": "true"
          },
          "overlay": {
            "component": "List"
          }
        },
        {
          "text": [
            {
              "type": "text",
              "value": "At the top we have <strong class=progression>I-IV vamp</strong>, so just going back and forth between <span class=chord>I</span> and <span class=chord>IV</span>."
            }
          ],
          "map": {
            "visible": "true"
          },
          "overlay": {
            "component": "List",
            "highlight": "I-IV vamp"
          }
        },
        {
          "text": [
            {
              "type": "text",
              "value": "You can hear it in tunes like <strong>Imagine</strong> and <strong>Walk on the Wild Side</strong>."
            }
          ],
          "map": {
            "visible": "true",
            "focusCluster": "I-IV vamp"
          }
        },
        {
          "text": [
            {
              "type": "text",
              "value": "Next is <strong class=progression>happy walk up</strong>. We named it that because Tk these songs are so fun!"
            }
          ],
          "map": {
            "visible": "true",
            "focusCluster": "happy walk up"
          }
        },
        {
          "text": [
            {
              "type": "text",
              "value": "You’ll notice a lot of these top progressions exclusively involve <span class=chord>I</span>, <span class=chord>IV</span>, and <span class=chord>V</span>. If you’re gonna learn 3 chords, learn those."
            }
          ],
          "map": {
            "visible": "true"
          },
          "overlay": {
            "component": "List",
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
              "value": "Different orderings of these chords produce different journeys of tension and release Tk."
            }
          ],
          "map": {
            "visible": "true"
          },
          "overlay": {
            "component": "List"
          }
        },
        {
          "text": [
            {
              "type": "text",
              "value": "This progression looks different from the others… because it’s in a minor key! Sometimes people say that major is happy and minor is sad, but tell that to <strong>We Found Love</strong>… Just because a song is in a minor key <a href=https://www.youtube.com/watch?v=OMWszWYX2OQ target=_blank>doesn’t necessarily mean it’s sad</a>."
            },
            {
              "type": "text",
              "value": "Instead, musicians often refer to minor as a <strong>darker</strong> sound than major (brighter). Songs like <strong>Cool for The Summer</strong>, <strong>Stronger</strong>, and <strong>Poker Face</strong> use this progression to paint with a darker palette."
            },
            {
              "type": "text",
              "value": "<span class=small>Tk this is actually just minor axis!</span>"
            }
          ],
          "map": {
            "visible": "true",
            "focusCluster": "we found love"
          }
        },
        {
          "text": [
            {
              "type": "text",
              "value": "So pop doesn't run on just one formula. It has many, and they produce different emotional journeys."
            },
            {
              "type": "text",
              "value": "<span class=small>Explore all the clusters and search for your favorite songs at the end in explore mode!</span>"
            }
          ],
          "map": {
            "visible": "true"
          }
        }
      ]
    },
    {
      "title": "Getting loopier 🔁",
      "slides": [
        {
          "text": [
            {
              "type": "text",
              "value": "Ok, but even if pop songs pull from a variety of progressions, perhaps each song just endlessly loops that single progression, without creativity or nuance?"
            },
            {
              "type": "ol",
              "value": {
                "li": [
                  "<s><span class=\\"sr-only\\">crossed out: </span>built on a single four-chord progression 🧱</s>",
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
              "value": "If we want to count the number of progressions in a song, we should weight them by how often they appear."
            },
            {
              "type": "text",
              "value": "We’ll call that a song’s number of <strong>effective progressions</strong>. That way, a song dominated by one progression, with a couple of others sprinkled in, scores close to 1, while a song that spreads its time across many progressions scores higher."
            }
          ],
          "stage": {
            "component": "EffectiveProgressions",
            "songs": [
              "olivia-rodrigo__drop-dead",
              "olivia-rodrigo__drivers-license"
            ]
          }
        },
        {
          "text": [
            {
              "type": "text",
              "value": "There’s a pretty even split between songs with few progressions and songs with a lot of progressions."
            }
          ],
          "stage": {
            "component": "EffectiveBar"
          }
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
            },
            {
              "type": "text",
              "value": "So even though it’s not the case that most songs are just 1 loop, songs are getting loopier. The Axis of Awesome boys had their finger on something real."
            }
          ],
          "stage": {
            "component": "EffectiveDecades"
          }
        }
      ]
    },
    {
      "title": "Era definers 🗓️",
      "slides": [
        {
          "text": [
            {
              "type": "text",
              "value": "What about the final claim, that progressions are deployed ubiquitously across time?"
            },
            {
              "type": "ol",
              "value": {
                "li": [
                  "<s><span class=\\"sr-only\\">crossed out: </span>built on a single four-chord progression 🧱</s>",
                  "<s><span class=\\"sr-only\\">crossed out: </span>looped for the entire song 🔁</s>",
                  "and recycled decade after decade? 🗓️"
                ]
              }
            },
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
          ],
          "stage": {
            "component": "ClusterPercentOverTime",
            "cluster": "axis of awesome"
          }
        },
        {
          "text": [
            {
              "type": "text",
              "value": "It begs the question: Did every decade have its own version of the <strong class=progression>axis of awesome</strong> chord progression?"
            },
            {
              "type": "text",
              "value": "Interestingly, not really…"
            }
          ],
          "stage": {
            "component": "Signatures"
          }
        },
        {
          "text": [
            {
              "type": "text",
              "value": "…with one huge exception: the 50s and 60s was dominated by <strong class=progression>doo wop</strong>."
            },
            {
              "type": "text",
              "value": "[1 in 9] songs during that period included a <strong class=progression>doo wop</strong> progression. It was [2.6x] more common then than overall in the dataset."
            }
          ],
          "stage": {
            "component": "ClusterPercentOverTime",
            "cluster": "doo wop"
          }
        },
        {
          "text": [
            {
              "type": "text",
              "value": "The <strong class=progression>doo wop</strong> progression is the same 4 chords as <strong class=progression>axis of awesome</strong> (<span class=chords>I-V-vi-IV</span>), in a different order."
            },
            {
              "type": "text",
              "value": "These two classic progressions dominated and defined their respective eras."
            }
          ],
          "map": {
            "visible": "true",
            "focusCluster": "doo wop"
          }
        }
      ]
    }
  ]
}`;var $e=_('<p> </p> <progress max="100"></progress>',1);function Pe(e,n){let o=B(n,"label",3,"A"),s=B(n,"value",3,0);var a=$e(),i=O(a),p=v(i,!0);m(i);var d=f(i,2);D(()=>{C(p,o()),ce(d,s())}),b(e,a)}var Ye=_('<section id="cms"><h2>MicroCMS</h2> <code><pre> </pre></code> <!></section>');function Fe(e,n){N(n,!0);const{body:o}=ve,s={Test:Pe};var a=Ye(),i=f(v(a),2),p=v(i),d=v(p,!0);m(p),m(i);var y=f(i,2);me(y,{get components(){return s},get body(){return o}}),m(a),D(r=>C(d,r),[()=>Ne.replace(/\t/g," ")]),b(e,a),$()}const Je=(e,n=Z)=>{var o=He(),s=v(o),a=v(s,!0);m(s);var i=f(s,2),p=v(i,!0);m(i),m(o),D(()=>{C(a,n().name),C(p,n().age)}),b(e,o)};var He=_('<div class="person svelte-q3gttf"><p class="svelte-q3gttf"> </p> <p class="svelte-q3gttf"> </p></div>'),Ze=_('<h2>Svelte5</h2> <h3>Reactive variables 3 ways:</h3> <button class="svelte-q3gttf">count++</button> <p class="svelte-q3gttf"> </p> <p class="svelte-q3gttf"> </p> <p class="svelte-q3gttf"> </p> <h3>Children (previously slots):</h3> <div class="children"><!></div> <h3>Dispatch Event</h3> <button class="svelte-q3gttf">Random</button>  <h3>Snippets</h3> <div class="people svelte-q3gttf"></div>',1);function Ge(e,n){N(n,!0),B(n,"age",3,30);const o=[{name:"John",age:30},{name:"Jill",age:45}];let s=A(0),a=q(()=>u(s)*2),i=q(()=>u(s)*2),p=A(0);W(()=>{E(p,u(s)*2)});var d=Ze(),y=f(O(d),4),r=f(y,2),l=v(r);m(r);var t=f(r,2),c=v(t);m(t);var w=f(t,2),x=v(w);m(w);var h=f(w,4),S=v(h);ee(S,()=>n.children??Z),m(h);var g=f(h,4),I=f(g,4);P(I,21,()=>o,Y,(k,V)=>{Je(k,()=>u(V))}),m(I),D(()=>{C(l,`${u(s)??""} doubled is ${u(a)??""} (derived)`),C(c,`${u(s)??""} doubled is ${u(i)??""} (derived by)`),C(x,`${u(s)??""} doubled is ${u(p)??""} ($effect)`)}),z("click",y,()=>se(s)),z("click",g,()=>n.random(Math.floor(Math.random()*10))),b(e,d),$()}ie(["click"]);const Qe=(e,n)=>{let o=A(ae(e)),s=A(null),a=A(!0),i=A(null);const p=(r=!0)=>{E(a,r,!0),r&&(E(i,null),E(s,null))},d=async()=>{if(!u(o))return[null,null];try{const r=await fetch(u(o),n);if(!r.ok)throw new Error(`Unexpected error occurred (status ${r.status})`);if(u(o).includes(".csv")){const l=await r.text();return[null,Ie(l)]}return[null,await r.json()]}catch(r){return[r instanceof Error?r.message:"Unexpected error occurred",null]}},y=async r=>{p(!0);const[l,t]=await d();if(r===u(o)){if(l){p(!1),E(i,l,!0);return}p(!1),E(s,t,!0)}};return W(()=>{y(u(o))}),{get data(){return u(s)},get loading(){return u(a)},get error(){return u(i)},get url(){return u(o)},set url(r){u(o)!==r&&E(o,r,!0)}}};var ze=_("<p>loading data...</p>"),Xe=_("<p> </p>"),Ke=_("<p>data loaded</p> <pre> </pre>",1),en=_('<div class="c"><h2>Load Data</h2> <div class="response"><!></div></div>');function nn(e,n){N(n,!0);const o=`${fe}/assets/demo/test.csv`,s=Qe(o);W(()=>{});var a=en(),i=f(v(a),2),p=v(i);{var d=l=>{var t=ze();b(l,t)},y=l=>{var t=Xe(),c=v(t);m(t),D(()=>C(c,`error: ${s.error??""}`)),b(l,t)},r=l=>{var t=Ke(),c=f(O(t),2),w=v(c,!0);m(c),D(x=>C(w,x),[()=>JSON.stringify(s.data,null,2)]),b(l,t)};ge(p,l=>{s.loading?l(d):s.error?l(y,1):l(r,-1)})}m(i),m(a),b(e,a),$()}var tn=_('<div id="demo" class="svelte-15aotx7"><h1>Demo</h1> <!> <!> <!> <!> <!> <!> <!> <!></div>');function on(e){let n=A(0);function o(c){console.log(c)}var s=tn(),a=f(v(s),2);Te(a);var i=f(a,2);Se(i);var p=f(i,2);Ee(p);var d=f(p,2);Le(d);var y=f(d,2);Fe(y,{});var r=f(y,2);nn(r,{});var l=f(r,2);qe(l);var t=f(l,2);Ge(t,{random:o,get value(){return u(n)},set value(c){E(n,c,!0)}}),m(s),b(e,s)}function xn(e){on(e)}export{xn as component};
