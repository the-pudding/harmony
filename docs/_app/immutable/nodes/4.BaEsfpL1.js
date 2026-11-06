import"../chunks/DsnmJJEf.js";import{a4 as f,a0 as m,a2 as U,_ as V,p as u,a1 as v,a6 as N,Z as W,a3 as q,$,ab as J,q as D,a7 as se,m as B,bj as oe,N as ae}from"../chunks/C3lB5Ep4.js";import{a as b,f as _,c as Z,t as re}from"../chunks/YFATMRSN.js";import{a as T,d as ie,f as z}from"../chunks/BrEYOH-i.js";import{e as H,i as Y,a as le,d as ce}from"../chunks/D2EE8FkE.js";import{e as pe}from"../chunks/D6zwxtow.js";import{c as ue}from"../chunks/CHP19diV.js";import{s as he,p as A}from"../chunks/Dr_n2BWP.js";import{s as ee}from"../chunks/CLDkZWzj.js";import{b as de}from"../chunks/BCWx1uwB.js";import{C as ve,c as me}from"../chunks/bsevET3h.js";import{i as ge}from"../chunks/6BL8aPe5.js";import{b as fe}from"../chunks/BZF6hDPd.js";import"../chunks/Z_9yVxVw.js";var K={},F={},P=34,O=10,G=13;function ne(e){return new Function("d","return {"+e.map(function(n,s){return JSON.stringify(n)+": d["+s+'] || ""'}).join(",")+"}")}function ye(e,n){var s=ne(e);return function(o,a){return n(s(o),a,e)}}function X(e){var n=Object.create(null),s=[];return e.forEach(function(o){for(var a in o)a in n||s.push(n[a]=a)}),s}function C(e,n){var s=e+"",o=s.length;return o<n?new Array(n-o+1).join(0)+s:s}function xe(e){return e<0?"-"+C(-e,6):e>9999?"+"+C(e,6):C(e,4)}function be(e){var n=e.getUTCHours(),s=e.getUTCMinutes(),o=e.getUTCSeconds(),a=e.getUTCMilliseconds();return isNaN(e)?"Invalid Date":xe(e.getUTCFullYear())+"-"+C(e.getUTCMonth()+1,2)+"-"+C(e.getUTCDate(),2)+(a?"T"+C(n,2)+":"+C(s,2)+":"+C(o,2)+"."+C(a,3)+"Z":o?"T"+C(n,2)+":"+C(s,2)+":"+C(o,2)+"Z":s||n?"T"+C(n,2)+":"+C(s,2)+"Z":"")}function we(e){var n=new RegExp('["'+e+`
\r]`),s=e.charCodeAt(0);function o(t,c){var w,x,h=a(t,function(S,g){if(w)return w(S,g-1);x=S,w=c?ye(S,c):ne(S)});return h.columns=x||[],h}function a(t,c){var w=[],x=t.length,h=0,S=0,g,I=x<=0,k=!1;t.charCodeAt(x-1)===O&&--x,t.charCodeAt(x-1)===G&&--x;function j(){if(I)return F;if(k)return k=!1,K;var L,R=h,E;if(t.charCodeAt(R)===P){for(;h++<x&&t.charCodeAt(h)!==P||t.charCodeAt(++h)===P;);return(L=h)>=x?I=!0:(E=t.charCodeAt(h++))===O?k=!0:E===G&&(k=!0,t.charCodeAt(h)===O&&++h),t.slice(R+1,L-1).replace(/""/g,'"')}for(;h<x;){if((E=t.charCodeAt(L=h++))===O)k=!0;else if(E===G)k=!0,t.charCodeAt(h)===O&&++h;else if(E!==s)continue;return t.slice(R,L)}return I=!0,t.slice(R,x)}for(;(g=j())!==F;){for(var M=[];g!==K&&g!==F;)M.push(g),g=j();c&&(M=c(M,S++))==null||w.push(M)}return w}function i(t,c){return t.map(function(w){return c.map(function(x){return l(w[x])}).join(e)})}function p(t,c){return c==null&&(c=X(t)),[c.map(l).join(e)].concat(i(t,c)).join(`
`)}function d(t,c){return c==null&&(c=X(t)),i(t,c).join(`
`)}function y(t){return t.map(r).join(`
`)}function r(t){return t.map(l).join(e)}function l(t){return t==null?"":t instanceof Date?be(t):n.test(t+="")?'"'+t.replace(/"/g,'""')+'"':t}return{parse:o,parseRows:a,format:p,formatBody:d,formatRows:y,formatRow:r,formatValue:l}}var _e=we(","),Ie=_e.parse,ke=_('<section id="demo-link"><h2>Link</h2> <p><a href="elements" target="_blank" rel="noopener noreferrer">Default element styles demo</a></p> <p><a href="fonts" target="_blank" rel="noopener noreferrer">Pudding-hosted font previews</a></p> <p><a href="ui" target="_blank" rel="noopener noreferrer">BitsUI styled components</a></p></section>');function Ce(e){var n=ke();b(e,n)}var Te=_('<section id="demo-image"><h2>Image</h2> <p>img tag</p> <img src="../assets/demo/test.jpg" alt="cat" class="svelte-b56t42"/> <p>background image</p> <div class="svelte-b56t42"></div></section>');function Se(e){var n=Te();b(e,n)}var Ve=_('<section id="demo-element"><h2>Dynamic Svelte Element</h2> <!></section>');function De(e){const n=[{tag:"h3",text:"I am a h3 tag."},{tag:"p",text:"I am p tag."}];var s=Ve(),o=f(m(s),2);H(o,17,()=>n,Y,(a,i)=>{let p=()=>u(i).tag,d=()=>u(i).text;var y=Z(),r=U(y);pe(r,p,!1,(l,t)=>{var c=re();V(()=>T(c,d())),b(t,c)}),b(a,y)}),v(s),b(e,s)}var Ee=_("<p> </p>");function Ae(e,n){var s=Ee(),o=m(s);v(s),V(()=>T(o,`I am component A and my favorite number is ${n.number??""}.`)),b(e,s)}var Be=_("<p> </p>");function je(e,n){var s=Be(),o=m(s);v(s),V(()=>T(o,`I am component B and my name is ${n.name??""}.`)),b(e,s)}var Me=_('<section id="demo-component"><h2>Dynamic Svelte Component</h2> <!></section>');function Le(e){const n={A:Ae,B:je},s=[{component:"A",number:42},{component:"B",name:"Russell"}];var o=Me(),a=f(m(o),2);H(a,17,()=>s,Y,(i,p)=>{const d=N(()=>n[u(p).component]);var y=Z(),r=U(y);ue(r,()=>u(d),(l,t)=>{t(l,he(()=>u(p)))}),b(i,y)}),v(o),b(e,o)}var Re=_("<div><!></div>");function Ue(e,n){W(n,!0);let s=A(n,"root",3,null),o=A(n,"top",3,0),a=A(n,"bottom",3,0),i=A(n,"increments",3,100),p=A(n,"value",15,void 0),d=[],y=[],r=[],l=[],t;function c(){let g=0,I=0;for(let k=0;k<d.length;k++)d[k]>g&&(g=d[k],I=k);g>0?p(I):p(void 0)}function w(g,I){const k=Q=>{Q[0].isIntersecting;const te=Q[0].intersectionRatio;d[I]=te,c()},j=o()?o()*-1:0,M=a()?a()*-1:0,L=`${j}px 0px ${M}px 0px`,R={root:s(),rootMargin:L,threshold:y};l[I]&&l[I].disconnect();const E=new IntersectionObserver(k,R);E.observe(g),l[I]=E}function x(){r.length&&r.forEach(w)}q(()=>{for(let g=0;g<i()+1;g++)y.push(g/i());r=t.querySelectorAll(":scope > *:not(iframe)"),x()}),q(()=>{o(),a(),x()});var h=Re(),S=m(h);ee(S,()=>n.children??J),v(h),de(h,g=>t=g,()=>t),b(e,h),$()}var Oe=_('<div><p class="svelte-1sxgmm9"> </p></div>'),qe=_('<section id="scrolly"><h2 class="svelte-1sxgmm9">Scrolly <span> </span></h2> <div class="spacer svelte-1sxgmm9"></div> <!> <div class="spacer svelte-1sxgmm9"></div></section>');function Ne(e){let n=B(void 0);var s=qe(),o=m(s),a=f(m(o)),i=m(a,!0);v(a),v(o);var p=f(o,4);Ue(p,{get value(){return u(n)},set value(d){D(n,d,!0)},children:(d,y)=>{var r=Z(),l=U(r);H(l,16,()=>[0,1,2,3,4],Y,(t,c,w)=>{const x=N(()=>u(n)===w);var h=Oe();let S;var g=m(h),I=m(g,!0);v(g),v(h),V(()=>{S=le(h,1,"step svelte-1sxgmm9",null,S,{active:u(x)}),T(I,c)}),b(t,h)}),b(d,r)},$$slots:{default:!0}}),se(2),v(s),V(()=>T(i,u(n)||"-")),b(e,s)}const We=`{
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
              "value": "They were onto something, lots of songs rely heavily on this progression, but this only makes up about [3%] of songs in the dataset."
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
              "value": "At the top we have <strong class=progression>I-IV vamp</strong>, so just going back and forth between <span class=chord>I</span> and <span class=chord>IV</span>."
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
              "value": "Next is <strong class=progression>happy walk up</strong>."
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
              "value": "You’ll notice a lot of these top progressions exclusively involve <span class=chord>I</span>, <span class=chord>IV</span>, and <span class=chord>V</span>."
            },
            {
              "type": "text",
              "value": "If you’re gonna learn 3 chords, learn those."
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
              "value": "The <span class=chord>I</span> is home base. It feels stable and resolved."
            },
            {
              "type": "text",
              "value": "The <span class=chord>IV</span> creates gentle movement away from home."
            },
            {
              "type": "text",
              "value": "The <span class=chord>V</span> creates tension and expectation. It really wants to go back to the <span class=chord>I</span>."
            },
            {
              "type": "text",
              "value": "Like in “You’re Still The One” by Shania Twain, where it ends on the <span class=chord>V</span>. My ear, at least, is waiting for it to finally return home to the <span class=chord>I</span>."
            }
          ],
          "stage": {
            "component": "Video",
            "videoId": "shania"
          }
        },
        {
          "text": [
            {
              "type": "text",
              "value": "<span class=chord>I</span>, <span class=chord>IV</span>, and <span class=chord>V</span> are the most common chords in these hits, making up [51%] of all chords across all songs."
            },
            {
              "type": "text",
              "value": "<span class=chord>vi</span>, the final chord in <strong class=progression>axis of awesome</strong> (<span class=chords>I-V-vi-IV</span>), is next most common at [7%]."
            },
            {
              "type": "text",
              "value": "You can tell a complete musical story with just 3 or 4 chords."
            }
          ],
          "map": {
            "visible": "true",
            "movable": "false",
            "hoverable": "false",
            "hideLabels": "true"
          },
          "overlay": {
            "component": "ChordShares"
          }
        },
        {
          "text": [
            {
              "type": "text",
              "value": "Maybe this list is a little less diverse than we thought."
            },
            {
              "type": "text",
              "value": "In fact, several progressions here are actually very close cousins of the <strong class=progression>axis of awesome</strong> progression."
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
              "value": "For example, <button><strong class=progression>never getting back together</strong></button> takes the same four chords (<span class=chords>I-V-vi-IV</span>) and shifts everything over one slot."
            },
            {
              "type": "text",
              "value": "Same with <button><strong class=progression>say something</strong></button>. “Africa” by Toto is in the Axis of Awesome medley, but notice how they start <a href=https://youtu.be/5pidokakU4I?si=Ok_bLed7HrtG7njH&t=200 target=_blank>singing</a> it halfway through the 4-chord loop so that it lines up properly."
            }
          ],
          "map": {
            "visible": "true",
            "focusCluster": "never getting back together"
          }
        },
        {
          "text": [
            {
              "type": "text",
              "value": "<button><strong class=progression>doo wop</strong></button>, <button><strong class=progression>viva la vida</strong></button>, <button><strong class=progression>mr. brightside</strong></button>, and <button><strong class=progression>whatcha say</strong></button> all involve the same four chords (<span class=chords>I-V-vi-IV</span>), just rearranged slightly."
            }
          ],
          "map": {
            "visible": "true",
            "focusCluster": "whatcha say"
          }
        },
        {
          "text": [
            {
              "type": "text",
              "value": "On its own, <span class=chords>I-V-vi-IV</span> appears in only [3%] of songs, but if we count these rotations and close cousins, and this family of progressions shows up in [20%] of hits."
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
              "value": "So, no, pop isn’t all <strong class=progression>axis of awesome</strong>. But a big chunk do work on very similar principles. The songs that stand out often break those rules, playing with what we’ve come to expect."
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
            }
          ]
        },
        {
          "text": [
            {
              "type": "text",
              "value": "The <strong class=progression>axis of awesome</strong> progression hasn’t always been a thing, it surged in the late 2000s."
            },
            {
              "type": "text",
              "value": "This progression is [3x] more common in the 2000s compared to other decades, and was found in a full [11%] of songs."
            },
            {
              "type": "text",
              "value": "The Axis of Awesome sketch, performed in 2009, is a product of its time period."
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
              "value": "Here is every decade’s <strong>signature progression</strong>, which we chose based on a combination of its prevalence and uniqueness to that decade."
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
              "value": "The lines are all pretty flat… with one huge exception: the 50s and 60s was dominated by <strong class=progression>doo wop</strong>."
            },
            {
              "type": "text",
              "value": "[1 in 9] songs during that period included a <strong class=progression>doo wop</strong> progression. It was [2.6x] more common then than overall in the dataset."
            }
          ],
          "stage": {
            "component": "Signatures",
            "focus": "1950s-60s"
          }
        },
        {
          "text": [
            {
              "type": "text",
              "value": "It’s the predecessor to <strong class=progression>axis of awesome</strong> (<span class=chords>I-V-vi-IV</span>), using the same chords in a slightly different order for a slightly different sound."
            },
            {
              "type": "text",
              "value": "These two bangers dominated and defined their respective eras."
            }
          ],
          "map": {
            "visible": "true",
            "focusCluster": "doo wop"
          }
        }
      ]
    },
    {
      "title": "Explore",
      "slides": [
        {
          "text": [
            {
              "type": "ExploreControls",
              "value": {}
            }
          ],
          "map": {
            "visible": "true",
            "centered": "true"
          }
        },
        {
          "text": [
            {
              "type": "text",
              "value": "Methods methods methods"
            }
          ]
        },
        {
          "text": [],
          "stage": {
            "component": "Footer"
          }
        }
      ]
    }
  ]
}`;var $e=_('<p> </p> <progress max="100"></progress>',1);function He(e,n){let s=A(n,"label",3,"A"),o=A(n,"value",3,0);var a=$e(),i=U(a),p=m(i,!0);v(i);var d=f(i,2);V(()=>{T(p,s()),ce(d,o())}),b(e,a)}var Ye=_('<section id="cms"><h2>MicroCMS</h2> <code><pre> </pre></code> <!></section>');function Fe(e,n){W(n,!0);const{body:s}=me,o={Test:He};var a=Ye(),i=f(m(a),2),p=m(i),d=m(p,!0);v(p),v(i);var y=f(i,2);ve(y,{get components(){return o},get body(){return s}}),v(a),V(r=>T(d,r),[()=>We.replace(/\t/g," ")]),b(e,a),$()}const Pe=(e,n=J)=>{var s=Ge(),o=m(s),a=m(o,!0);v(o);var i=f(o,2),p=m(i,!0);v(i),v(s),V(()=>{T(a,n().name),T(p,n().age)}),b(e,s)};var Ge=_('<div class="person svelte-q3gttf"><p class="svelte-q3gttf"> </p> <p class="svelte-q3gttf"> </p></div>'),Je=_('<h2>Svelte5</h2> <h3>Reactive variables 3 ways:</h3> <button class="svelte-q3gttf">count++</button> <p class="svelte-q3gttf"> </p> <p class="svelte-q3gttf"> </p> <p class="svelte-q3gttf"> </p> <h3>Children (previously slots):</h3> <div class="children"><!></div> <h3>Dispatch Event</h3> <button class="svelte-q3gttf">Random</button>  <h3>Snippets</h3> <div class="people svelte-q3gttf"></div>',1);function Ze(e,n){W(n,!0),A(n,"age",3,30);const s=[{name:"John",age:30},{name:"Jill",age:45}];let o=B(0),a=N(()=>u(o)*2),i=N(()=>u(o)*2),p=B(0);q(()=>{D(p,u(o)*2)});var d=Je(),y=f(U(d),4),r=f(y,2),l=m(r);v(r);var t=f(r,2),c=m(t);v(t);var w=f(t,2),x=m(w);v(w);var h=f(w,4),S=m(h);ee(S,()=>n.children??J),v(h);var g=f(h,4),I=f(g,4);H(I,21,()=>s,Y,(k,j)=>{Pe(k,()=>u(j))}),v(I),V(()=>{T(l,`${u(o)??""} doubled is ${u(a)??""} (derived)`),T(c,`${u(o)??""} doubled is ${u(i)??""} (derived by)`),T(x,`${u(o)??""} doubled is ${u(p)??""} ($effect)`)}),z("click",y,()=>oe(o)),z("click",g,()=>n.random(Math.floor(Math.random()*10))),b(e,d),$()}ie(["click"]);const Qe=(e,n)=>{let s=B(ae(e)),o=B(null),a=B(!0),i=B(null);const p=(r=!0)=>{D(a,r,!0),r&&(D(i,null),D(o,null))},d=async()=>{if(!u(s))return[null,null];try{const r=await fetch(u(s),n);if(!r.ok)throw new Error(`Unexpected error occurred (status ${r.status})`);if(u(s).includes(".csv")){const l=await r.text();return[null,Ie(l)]}return[null,await r.json()]}catch(r){return[r instanceof Error?r.message:"Unexpected error occurred",null]}},y=async r=>{p(!0);const[l,t]=await d();if(r===u(s)){if(l){p(!1),D(i,l,!0);return}p(!1),D(o,t,!0)}};return q(()=>{y(u(s))}),{get data(){return u(o)},get loading(){return u(a)},get error(){return u(i)},get url(){return u(s)},set url(r){u(s)!==r&&D(s,r,!0)}}};var ze=_("<p>loading data...</p>"),Ke=_("<p> </p>"),Xe=_("<p>data loaded</p> <pre> </pre>",1),en=_('<div class="c"><h2>Load Data</h2> <div class="response"><!></div></div>');function nn(e,n){W(n,!0);const s=`${fe}/assets/demo/test.csv`,o=Qe(s);q(()=>{});var a=en(),i=f(m(a),2),p=m(i);{var d=l=>{var t=ze();b(l,t)},y=l=>{var t=Ke(),c=m(t);v(t),V(()=>T(c,`error: ${o.error??""}`)),b(l,t)},r=l=>{var t=Xe(),c=f(U(t),2),w=m(c,!0);v(c),V(x=>T(w,x),[()=>JSON.stringify(o.data,null,2)]),b(l,t)};ge(p,l=>{o.loading?l(d):o.error?l(y,1):l(r,-1)})}v(i),v(a),b(e,a),$()}var tn=_('<div id="demo" class="svelte-15aotx7"><h1>Demo</h1> <!> <!> <!> <!> <!> <!> <!> <!></div>');function sn(e){let n=B(0);function s(c){console.log(c)}var o=tn(),a=f(m(o),2);Ce(a);var i=f(a,2);Se(i);var p=f(i,2);De(p);var d=f(p,2);Le(d);var y=f(d,2);Fe(y,{});var r=f(y,2);nn(r,{});var l=f(r,2);Ne(l);var t=f(l,2);Ze(t,{random:s,get value(){return u(n)},set value(c){D(n,c,!0)}}),v(o),b(e,o)}function xn(e){sn(e)}export{xn as component};
