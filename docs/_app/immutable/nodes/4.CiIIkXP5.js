import"../chunks/DsnmJJEf.js";import{a1 as f,Y as v,_ as L,W as A,G as u,Z as m,a0 as q,V as N,am as U,X as P,a8 as Y,J as D,a2 as st,$ as B,bj as ot,I as at}from"../chunks/DZQTfQ-5.js";import{a as x,f as _,c as Z,t as rt}from"../chunks/BJNNt9T8.js";import{a as T,d as it,e as K}from"../chunks/Cqnsk8s9.js";import{e as H,i as $,c as lt,d as pt}from"../chunks/BbiFfPhN.js";import{e as ct}from"../chunks/hmP0-ZwX.js";import{c as ut}from"../chunks/CqT6otop.js";import{s as ht,p as V}from"../chunks/BlzlhmPh.js";import{s as tt}from"../chunks/BPOhVWAt.js";import{b as dt}from"../chunks/C8kdpErY.js";import{C as mt,c as vt}from"../chunks/BbdzB1vG.js";import{i as gt}from"../chunks/BLwfC2zq.js";import{b as ft}from"../chunks/D4Iit3J7.js";import"../chunks/iiMPhl6v.js";var Q={},F={},G=34,W=10,J=13;function et(t){return new Function("d","return {"+t.map(function(e,s){return JSON.stringify(e)+": d["+s+'] || ""'}).join(",")+"}")}function yt(t,e){var s=et(t);return function(o,a){return e(s(o),a,t)}}function X(t){var e=Object.create(null),s=[];return t.forEach(function(o){for(var a in o)a in e||s.push(e[a]=a)}),s}function C(t,e){var s=t+"",o=s.length;return o<e?new Array(e-o+1).join(0)+s:s}function bt(t){return t<0?"-"+C(-t,6):t>9999?"+"+C(t,6):C(t,4)}function xt(t){var e=t.getUTCHours(),s=t.getUTCMinutes(),o=t.getUTCSeconds(),a=t.getUTCMilliseconds();return isNaN(t)?"Invalid Date":bt(t.getUTCFullYear())+"-"+C(t.getUTCMonth()+1,2)+"-"+C(t.getUTCDate(),2)+(a?"T"+C(e,2)+":"+C(s,2)+":"+C(o,2)+"."+C(a,3)+"Z":o?"T"+C(e,2)+":"+C(s,2)+":"+C(o,2)+"Z":s||e?"T"+C(e,2)+":"+C(s,2)+"Z":"")}function wt(t){var e=new RegExp('["'+t+`
\r]`),s=t.charCodeAt(0);function o(n,p){var w,b,h=a(n,function(S,g){if(w)return w(S,g-1);b=S,w=p?yt(S,p):et(S)});return h.columns=b||[],h}function a(n,p){var w=[],b=n.length,h=0,S=0,g,I=b<=0,k=!1;n.charCodeAt(b-1)===W&&--b,n.charCodeAt(b-1)===J&&--b;function E(){if(I)return F;if(k)return k=!1,Q;var M,O=h,j;if(n.charCodeAt(O)===G){for(;h++<b&&n.charCodeAt(h)!==G||n.charCodeAt(++h)===G;);return(M=h)>=b?I=!0:(j=n.charCodeAt(h++))===W?k=!0:j===J&&(k=!0,n.charCodeAt(h)===W&&++h),n.slice(O+1,M-1).replace(/""/g,'"')}for(;h<b;){if((j=n.charCodeAt(M=h++))===W)k=!0;else if(j===J)k=!0,n.charCodeAt(h)===W&&++h;else if(j!==s)continue;return n.slice(O,M)}return I=!0,n.slice(O,b)}for(;(g=E())!==F;){for(var R=[];g!==Q&&g!==F;)R.push(g),g=E();p&&(R=p(R,S++))==null||w.push(R)}return w}function i(n,p){return n.map(function(w){return p.map(function(b){return l(w[b])}).join(t)})}function c(n,p){return p==null&&(p=X(n)),[p.map(l).join(t)].concat(i(n,p)).join(`
`)}function d(n,p){return p==null&&(p=X(n)),i(n,p).join(`
`)}function y(n){return n.map(r).join(`
`)}function r(n){return n.map(l).join(t)}function l(n){return n==null?"":n instanceof Date?xt(n):e.test(n+="")?'"'+n.replace(/"/g,'""')+'"':n}return{parse:o,parseRows:a,format:c,formatBody:d,formatRows:y,formatRow:r,formatValue:l}}var _t=wt(","),It=_t.parse,kt=_('<section id="demo-link"><h2>Link</h2> <p><a href="elements" target="_blank" rel="noopener noreferrer">Default element styles demo</a></p> <p><a href="fonts" target="_blank" rel="noopener noreferrer">Pudding-hosted font previews</a></p> <p><a href="ui" target="_blank" rel="noopener noreferrer">BitsUI styled components</a></p></section>');function Ct(t){var e=kt();x(t,e)}var Tt=_('<section id="demo-image"><h2>Image</h2> <p>img tag</p> <img src="../assets/demo/test.jpg" alt="cat" class="svelte-b56t42"/> <p>background image</p> <div class="svelte-b56t42"></div></section>');function St(t){var e=Tt();x(t,e)}var At=_('<section id="demo-element"><h2>Dynamic Svelte Element</h2> <!></section>');function Dt(t){const e=[{tag:"h3",text:"I am a h3 tag."},{tag:"p",text:"I am p tag."}];var s=At(),o=f(v(s),2);H(o,17,()=>e,$,(a,i)=>{let c=()=>u(i).tag,d=()=>u(i).text;var y=Z(),r=L(y);ct(r,c,!1,(l,n)=>{var p=rt();A(()=>T(p,d())),x(n,p)}),x(a,y)}),m(s),x(t,s)}var jt=_("<p> </p>");function Vt(t,e){var s=jt(),o=v(s);m(s),A(()=>T(o,`I am component A and my favorite number is ${e.number??""}.`)),x(t,s)}var Bt=_("<p> </p>");function Et(t,e){var s=Bt(),o=v(s);m(s),A(()=>T(o,`I am component B and my name is ${e.name??""}.`)),x(t,s)}var Rt=_('<section id="demo-component"><h2>Dynamic Svelte Component</h2> <!></section>');function Mt(t){const e={A:Vt,B:Et},s=[{component:"A",number:42},{component:"B",name:"Russell"}];var o=Rt(),a=f(v(o),2);H(a,17,()=>s,$,(i,c)=>{const d=q(()=>e[u(c).component]);var y=Z(),r=L(y);ut(r,()=>u(d),(l,n)=>{n(l,ht(()=>u(c)))}),x(i,y)}),m(o),x(t,o)}var Ot=_("<div><!></div>");function Lt(t,e){N(e,!0);let s=V(e,"root",3,null),o=V(e,"top",3,0),a=V(e,"bottom",3,0),i=V(e,"increments",3,100),c=V(e,"value",15,void 0),d=[],y=[],r=[],l=[],n;function p(){let g=0,I=0;for(let k=0;k<d.length;k++)d[k]>g&&(g=d[k],I=k);g>0?c(I):c(void 0)}function w(g,I){const k=z=>{z[0].isIntersecting;const nt=z[0].intersectionRatio;d[I]=nt,p()},E=o()?o()*-1:0,R=a()?a()*-1:0,M=`${E}px 0px ${R}px 0px`,O={root:s(),rootMargin:M,threshold:y};l[I]&&l[I].disconnect();const j=new IntersectionObserver(k,O);j.observe(g),l[I]=j}function b(){r.length&&r.forEach(w)}U(()=>{for(let g=0;g<i()+1;g++)y.push(g/i());r=n.querySelectorAll(":scope > *:not(iframe)"),b()}),U(()=>{o(),a(),b()});var h=Ot(),S=v(h);tt(S,()=>e.children??Y),m(h),dt(h,g=>n=g,()=>n),x(t,h),P()}var Wt=_('<div><p class="svelte-1sxgmm9"> </p></div>'),Ut=_('<section id="scrolly"><h2 class="svelte-1sxgmm9">Scrolly <span> </span></h2> <div class="spacer svelte-1sxgmm9"></div> <!> <div class="spacer svelte-1sxgmm9"></div></section>');function qt(t){let e=B(void 0);var s=Ut(),o=v(s),a=f(v(o)),i=v(a,!0);m(a),m(o);var c=f(o,4);Lt(c,{get value(){return u(e)},set value(d){D(e,d,!0)},children:(d,y)=>{var r=Z(),l=L(r);H(l,16,()=>[0,1,2,3,4],$,(n,p,w)=>{const b=q(()=>u(e)===w);var h=Wt();let S;var g=v(h),I=v(g,!0);m(g),m(h),A(()=>{S=lt(h,1,"step svelte-1sxgmm9",null,S,{active:u(b)}),T(I,p)}),x(n,h)}),x(d,r)},$$slots:{default:!0}}),st(2),m(s),A(()=>T(i,u(e)||"-")),x(t,s)}const Nt=`{
	"meta": {
		"title": "Mapping every pop hit’s chords",
		"description": "Tk"
	},
	"sections": [
		{
			"title": "Intro",
			"slides": [
				{
					"text": [
						{
							"type": "text",
							"value": "This is one pop hit, represented with a dot. Click to hear a snippet."
						}
					],
					"map": {
						"visible": "true",
						"layout": "sky",
						"focusSong": "journey__dont-stop-believin",
						"onlySongs": ["journey__dont-stop-believin"],
						"playableSongs": ["journey__dont-stop-believin"],
						"movable": "false",
						"hoverable": "false",
						"tooltip": "label"
					}
				},
				{
					"text": [
						{
							"type": "text",
							"value": "Here it is alongside all [7,260] Billboard top-20 hits from 1958 to 2026."
						},
						{
							"type": "text",
							"value": "[TK: Rick Beato quotes, etc.]"
						}
					],
					"map": {
						"visible": "true",
						"layout": "sky",
						"playableSongs": ["journey__dont-stop-believin"],
						"movable": "false",
						"tooltip": "label"
					}
				},
				{
					"text": [
						{
							"type": "text",
							"value": "In 2009, when the Australian comedy group “Axis of Awesome” performed a viral sketch showing that a surprising number of these pop songs – from Journey’s “Don’t Stop Believin’” to Beyoncé’s “If I Were A Boy” – are built off of the same four chords."
						}
					],
					"map": {
						"visible": "true",
						"layout": "sky",
						"dimmed": "true",
						"movable": "false",
						"hoverable": "false",
						"tooltip": "label"
					},
					"stage": {
						"component": "Video",
						"videoId": "dead-simple"
					}
				},
				{
					"text": [
						{
							"type": "text",
							"value": "People cite this video as proof that all pop music is formulaic and sounds the same. The sheer volume of songs built on this foundation makes a compelling case."
						}
					],
					"map": {
						"visible": "true",
						"layout": "sky",
						"followVideo": "examples",
						"dimmed": "true",
						"movable": "false",
						"tooltip": "label"
					},
					"stage": {
						"component": "Video",
						"videoId": "examples"
					}
				},
				{
					"text": [
						{
							"type": "text",
							"value": "Axis of Awesome helped cement 3 big beliefs about pop. Namely, that most pop songs are:"
						},
						{
							"type": "ol",
							"value": {
								"li": [
									"built on a single four-chord progression <span class=motif>progression-names</span>",
									"looped for the entire song <span class=motif>loop</span>",
									"and recycled decade after decade? <span class=motif>timeline</span>"
								]
							}
						},
						{
							"type": "text",
							"value": "Axis of Awesome cited [21] examples. What about the other [7,239]? Do these claims hold up?"
						}
					],
					"map": {
						"visible": "true",
						"layout": "sky",
						"litVideoSongs": "examples",
						"dimmed": "true",
						"movable": "false",
						"tooltip": "label"
					}
				},
				{
					"text": [],
					"map": {
						"visible": "true",
						"layout": "sky",
						"movable": "false",
						"hoverable": "true",
						"tooltip": "label",
						"cycleSongs": "true"
					},
					"stage": {
						"component": "Landing",
						"hed": "Mapping every pop hit’s chords",
						"byline": "By <a href=https://pudding.cool/author/michelle-pera-mcghee/ target=_blank>Michelle Pera-McGhee</a> and <a href=https://pudding.cool/author/david-mora/ target=_blank>David Mora</a>"
					}
				},
				{
					"text": [
						{
							"type": "text",
							"value": "To find out, we gathered every Billboard top-20 hit since 1958, [7,300] songs, and found their chord progressions on popular online chord sites."
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
							"value": "“Let It Be”, “Don’t Stop Believin’”, and “Wagon Wheel” all have different chords on paper."
						}
					],
					"stage": {
						"component": "RomanNumerals",
						"keys": ["C", "E", "A"],
						"symbols": "chords",
						"labelHome": "false",
						"sameRotation": "true"
					}
				},
				{
					"text": [
						{
							"type": "text",
							"value": "But to your ear, they move in the same way."
						},
						{
							"type": "text",
							"value": "Rotate the circles, and you can see that these progressions all take the same shape."
						}
					],
					"stage": {
						"component": "RomanNumerals",
						"keys": ["C", "E", "A"],
						"symbols": "chords",
						"labelHome": "false",
						"highlightShape": "true"
					}
				},
				{
					"text": [
						{
							"type": "text",
							"value": "Every song has a key, a home base chord that it keeps returning to. If we name each chord by its distance from home, we can see that these songs actually share a chord progression."
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
						"keys": ["C", "E", "A"],
						"symbols": "chords"
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
						"keys": ["C", "E", "A"],
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
			"title": "Lots of journeys <span class=motif>progression</span>",
			"slides": [
				{
					"text": [
						{
							"type": "text",
							"value": "With those two ideas, which progressions a song uses and how much, we can put every song on the same map."
						},
						{
							"type": "text",
							"value": "Each dot is a song, placed near songs that use a similar mix of chord progressions. When enough similar songs gather in one area, they form a cluster. This is the <strong class=progression>axis of awesome</strong> cluster."
						}
					],
					"map": {
						"visible": "true",
						"focusCluster": "axis of awesome",
						"hidePlayer": "true",
						"highlightSongs": [
							"journey__dont-stop-believin",
							"justin-bieber-featuring-chance-the-rapper__holy"
						],
						"revealClusters": ["axis of awesome"]
					}
				},
				{
					"text": [
						{
							"type": "text",
							"value": "They were onto something, lots of songs rely heavily on this progression, but this only makes up about [3%] of songs in the dataset."
						},
						{
							"type": "text",
							"value": "<span class=small>Hear some below by clicking on the dots! Only select songs labeled with 🎧 are playable."
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
							"value": "Let’s zoom out. Here are all [7,000] Billboard top-20 hits going back to 1958."
						},
						{
							"type": "text",
							"value": "These colored clusters are concentrated similar songs, labeled by their main chord progression. Songs in grey don't have enough close neighbors to belong to any cluster; their mix of progressions is too unusual."
						}
					],
					"map": {
						"visible": "true",
						"hoverable": "false",
						"movable": "false"
					}
				},
				{
					"text": [
						{
							"type": "text",
							"value": "The map has no axes, so being at the top or on the left doesn't mean anything. What matters is what's nearby: songs that sit close together use similar progressions. Two clusters on opposite sides of the map aren't necessarily more different than two that are a little apart."
						},
						{
							"type": "text",
							"value": "<span class=small>Learn more about how we matched chord progressions and made the map in the <a href=#methods>methods</a>.</span>"
						}
					],
					"map": {
						"visible": "true",
						"hoverable": "false",
						"movable": "false"
					}
				},
				{
					"text": [
						{
							"type": "text",
							"value": "Let’s take a tour."
						},
						{
							"type": "text",
							"value": "[Down here], we find the <strong class=progression>imagine</strong> cluster, with lots of songs that use <span class=chords>I-IV-I-IV</span>, like “Imagine” or “Walk On The Wild Side.”"
						}
					],
					"map": {
						"visible": "true",
						"focusCluster": "imagine"
					}
				},
				{
					"text": [
						{
							"type": "text",
							"value": "Over here is another large cluster, <strong class=progression>la bamba</strong>."
						},
						{
							"type": "text",
							"value": "This is a classic progression used across many genres, like rock, blues, and pop."
						}
					],
					"map": {
						"visible": "true",
						"focusCluster": "la bamba"
					}
				},
				{
					"text": [
						{
							"type": "text",
							"value": "Here’s <strong class=progression>free fallin.</strong>"
						},
						{
							"type": "text",
							"value": "So far, visiting the biggest clusters, we’ve only seen the chords <span class=chord>I</span>, <span class=chord>IV</span>, and <span class=chord>V</span>."
						}
					],
					"map": {
						"visible": "true",
						"focusCluster": "free fallin"
					}
				},
				{
					"text": [
						{
							"type": "text",
							"value": "<span class=chord>I</span>, <span class=chord>IV</span>, and <span class=chord>V</span> are the most common in these hits, making up [52%] of all chords across all songs."
						},
						{
							"type": "text",
							"value": "If you’re gonna learn 3 chords, learn those."
						},
						{
							"type": "ChordShares",
							"value": {}
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
						},
						{
							"type": "Video",
							"value": {
								"videoId": "shania"
							}
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
							"value": "<strong class=progression>axis of awesome</strong> throws the <span class=chord>vi</span> in there too, which shares two of its three notes with the <span class=chord>I</span>. So when the <span class=chord>V</span> sets you up to go home, you land somewhere that almost feels like home, and the loop continues."
						},
						{
							"type": "text",
							"value": "These four chords (<i>the</i> “four chords”) show up again and again on this map, just sometimes in a different order."
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
							"value": "For example, <strong class=progression>shivers</strong> takes the four chords (<span class=chords>I-V-vi-IV</span>) and starts halfway through."
						},
						{
							"type": "text",
							"value": "Notice when “Africa” and “If I Were A Boy” enter in the <a href=https://youtu.be/5pidokakU4I?si=Ok_bLed7HrtG7njH&t=200 target=_blank>Axis of Awesome medley.</a> They start staggered from the other songs so that they line up properly."
						}
					],
					"map": {
						"visible": "true",
						"focusCluster": "shivers"
					}
				},
				{
					"text": [
						{
							"type": "text",
							"value": "<button><strong class=progression>whatcha say</strong></button>, <button><strong class=progression>viva la vida</strong></button>, <button><strong class=progression>mr. brightside</strong></button>, <button><strong class=progression>never getting back together</strong></button>, and <button><strong class=progression>doo wop</strong></button> all use the same four chords (<span class=chords>I-V-vi-IV</span>), just rearranged."
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
							"value": "On its own, <span class=chords>I-V-vi-IV</span> appears in only [3%] of songs, but if we count these rotations, this family of progressions shows up in [20%] of hits."
						}
					],
					"map": {
						"visible": "true",
						"hoverable": "false",
						"movable": "false"
					}
				},
				{
					"text": [
						{
							"type": "text",
							"value": "So, no, pop isn’t all <strong class=progression>axis of awesome</strong>. But there are some dominant patterns that operate in the same way."
						}
					],
					"map": {
						"visible": "true",
						"centered": "true",
						"movable": "false",
						"hoverable": "false"
					}
				}
			]
		},
		{
			"title": "Getting loopier <span class=motif>loop</span>",
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
									"<s><span class=\\"sr-only\\">crossed out: </span>built on a single four-chord progression <span class=motif>progression</span></s>",
									"looped for the entire song <span class=motif>loop</span>",
									"and recycled decade after decade? <span class=motif>timeline</span>"
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
							"olivia-rodrigo__drivers-license",
							"olivia-rodrigo__drop-dead"
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
					"map": {
						"visible": "true",
						"layout": "effectiveProgressions",
						"highlightSongs": "olivia-rodrigo__drop-dead, olivia-rodrigo__drivers-license",
						"revealSongs": "olivia-rodrigo__drop-dead, olivia-rodrigo__drivers-license",
						"movable": "false",
						"tooltip": "basic"
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
					"map": {
						"visible": "true",
						"layout": "effectiveProgressionsByDecade",
						"highlightSongs": "olivia-rodrigo__drop-dead, olivia-rodrigo__drivers-license",
						"movable": "false",
						"tooltip": "basic"
					}
				}
			]
		},
		{
			"title": "Era definers <span class=motif>timeline</span>",
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
									"<s><span class=\\"sr-only\\">crossed out: </span>built on a single four-chord progression <span class=motif>progression</span></s>",
									"<s><span class=\\"sr-only\\">crossed out: </span>looped for the entire song <span class=motif>loop</span></s>",
									"and recycled decade after decade? <span class=motif>timeline</span>"
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
				},
				{
					"text": [
						{
							"type": "text",
							"value": "“The four chords” joke works because it’s not true, but it’s also not <i>not</i> true."
						},
						{
							"type": "text",
							"value": "<span class=chords>I-V-vi-IV</span> on repeat works for a reason, and you can hear it and similar sounds across pop music going way back."
						},
						{
							"type": "text",
							"value": "*WIP*"
						},
						{
							"type": "text",
							"value": "Curious what the next generation’s <strong class=progression>axis of awesome</strong> progression will be? It’s probably a tiny dot on our map right now, or maybe not even a cluster yet…"
						},
						{
							"type": "ol",
							"value": {
								"li": [
									"<s><span class=\\"sr-only\\">crossed out: </span>built on a single four-chord progression <span class=motif>progression</span></s>",
									"<s><span class=\\"sr-only\\">crossed out: </span>looped for the entire song <span class=motif>loop</span></s>",
									"<s>and recycled decade after decade? <span class=motif>timeline</span></s>"
								]
							}
						}
					]
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
					"text": [],
					"stage": {
						"component": "Methods"
					}
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
}
`;var Pt=_('<p> </p> <progress max="100"></progress>',1);function Ht(t,e){let s=V(e,"label",3,"A"),o=V(e,"value",3,0);var a=Pt(),i=L(a),c=v(i,!0);m(i);var d=f(i,2);A(()=>{T(c,s()),pt(d,o())}),x(t,a)}var $t=_('<section id="cms"><h2>MicroCMS</h2> <code><pre> </pre></code> <!></section>');function Ft(t,e){N(e,!0);const{body:s}=vt,o={Test:Ht};var a=$t(),i=f(v(a),2),c=v(i),d=v(c,!0);m(c),m(i);var y=f(i,2);mt(y,{get components(){return o},get body(){return s}}),m(a),A(r=>T(d,r),[()=>Nt.replace(/\t/g," ")]),x(t,a),P()}const Gt=(t,e=Y)=>{var s=Jt(),o=v(s),a=v(o,!0);m(o);var i=f(o,2),c=v(i,!0);m(i),m(s),A(()=>{T(a,e().name),T(c,e().age)}),x(t,s)};var Jt=_('<div class="person svelte-q3gttf"><p class="svelte-q3gttf"> </p> <p class="svelte-q3gttf"> </p></div>'),Yt=_('<h2>Svelte5</h2> <h3>Reactive variables 3 ways:</h3> <button class="svelte-q3gttf">count++</button> <p class="svelte-q3gttf"> </p> <p class="svelte-q3gttf"> </p> <p class="svelte-q3gttf"> </p> <h3>Children (previously slots):</h3> <div class="children"><!></div> <h3>Dispatch Event</h3> <button class="svelte-q3gttf">Random</button>  <h3>Snippets</h3> <div class="people svelte-q3gttf"></div>',1);function Zt(t,e){N(e,!0),V(e,"age",3,30);const s=[{name:"John",age:30},{name:"Jill",age:45}];let o=B(0),a=q(()=>u(o)*2),i=q(()=>u(o)*2),c=B(0);U(()=>{D(c,u(o)*2)});var d=Yt(),y=f(L(d),4),r=f(y,2),l=v(r);m(r);var n=f(r,2),p=v(n);m(n);var w=f(n,2),b=v(w);m(w);var h=f(w,4),S=v(h);tt(S,()=>e.children??Y),m(h);var g=f(h,4),I=f(g,4);H(I,21,()=>s,$,(k,E)=>{Gt(k,()=>u(E))}),m(I),A(()=>{T(l,`${u(o)??""} doubled is ${u(a)??""} (derived)`),T(p,`${u(o)??""} doubled is ${u(i)??""} (derived by)`),T(b,`${u(o)??""} doubled is ${u(c)??""} ($effect)`)}),K("click",y,()=>ot(o)),K("click",g,()=>e.random(Math.floor(Math.random()*10))),x(t,d),P()}it(["click"]);const zt=(t,e)=>{let s=B(at(t)),o=B(null),a=B(!0),i=B(null);const c=(r=!0)=>{D(a,r,!0),r&&(D(i,null),D(o,null))},d=async()=>{if(!u(s))return[null,null];try{const r=await fetch(u(s),e);if(!r.ok)throw new Error(`Unexpected error occurred (status ${r.status})`);if(u(s).includes(".csv")){const l=await r.text();return[null,It(l)]}return[null,await r.json()]}catch(r){return[r instanceof Error?r.message:"Unexpected error occurred",null]}},y=async r=>{c(!0);const[l,n]=await d();if(r===u(s)){if(l){c(!1),D(i,l,!0);return}c(!1),D(o,n,!0)}};return U(()=>{y(u(s))}),{get data(){return u(o)},get loading(){return u(a)},get error(){return u(i)},get url(){return u(s)},set url(r){u(s)!==r&&D(s,r,!0)}}};var Kt=_("<p>loading data...</p>"),Qt=_("<p> </p>"),Xt=_("<p>data loaded</p> <pre> </pre>",1),te=_('<div class="c"><h2>Load Data</h2> <div class="response"><!></div></div>');function ee(t,e){N(e,!0);const s=`${ft}/assets/demo/test.csv`,o=zt(s);U(()=>{});var a=te(),i=f(v(a),2),c=v(i);{var d=l=>{var n=Kt();x(l,n)},y=l=>{var n=Qt(),p=v(n);m(n),A(()=>T(p,`error: ${o.error??""}`)),x(l,n)},r=l=>{var n=Xt(),p=f(L(n),2),w=v(p,!0);m(p),A(b=>T(w,b),[()=>JSON.stringify(o.data,null,2)]),x(l,n)};gt(c,l=>{o.loading?l(d):o.error?l(y,1):l(r,-1)})}m(i),m(a),x(t,a),P()}var ne=_('<div id="demo" class="svelte-15aotx7"><h1>Demo</h1> <!> <!> <!> <!> <!> <!> <!> <!></div>');function se(t){let e=B(0);function s(p){console.log(p)}var o=ne(),a=f(v(o),2);Ct(a);var i=f(a,2);St(i);var c=f(i,2);Dt(c);var d=f(c,2);Mt(d);var y=f(d,2);Ft(y,{});var r=f(y,2);ee(r,{});var l=f(r,2);qt(l);var n=f(l,2);Zt(n,{random:s,get value(){return u(e)},set value(p){D(e,p,!0)}}),m(o),x(t,o)}function ye(t){se(t)}export{ye as component};
