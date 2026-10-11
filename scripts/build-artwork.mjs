import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

// Original project illustrations, not product screenshots. Rebuild with:
// node scripts/build-artwork.mjs
const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const out = resolve(root, 'public/images');
mkdirSync(out, { recursive: true });
const colors = { ink: '#060607', panel: '#111115', line: '#29292f', soft: '#868691', white: '#f0eff5', purple: '#a899ef', purpleDeep: '#6656b2' };
const escape = (v) => String(v).replace(/[&<>"']/g, (c) => ({'&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&apos;'}[c]));
const text = (x, y, value, size = 16, fill = colors.white, extras = '') => `<text x="${x}" y="${y}" font-size="${size}" fill="${fill}" ${extras}>${escape(value)}</text>`;
const mono = (x, y, value, size = 14, fill = colors.soft, extras = '') => text(x, y, value, size, fill, `font-family="'Courier New', monospace" ${extras}`);
const rect = (x, y, w, h, fill = colors.panel, radius = 18, extras = '') => `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${radius}" fill="${fill}" ${extras}/>`;
const line = (x1, y1, x2, y2, color = colors.line, extras = '') => `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${color}" ${extras}/>`;
const circle = (cx, cy, r, fill, extras = '') => `<circle cx="${cx}" cy="${cy}" r="${r}" fill="${fill}" ${extras}/>`;
const panel = (x, y, w, h, radius = 20, extras = '') => rect(x, y, w, h, 'url(#panel)', radius, `stroke="#34343d" ${extras}`);
const chip = (x, y, label, w = 128) => rect(x, y, w, 30, '#1e1b2d', 15, 'stroke="#44375c"') + mono(x + w / 2, y + 20, label, 12, '#c7baff', 'text-anchor="middle"');
function rng(seed) { let n = seed; return () => { n = (n * 1664525 + 1013904223) >>> 0; return n / 4294967296; }; }
function stars(w, h, seed = 73, n = 70) {
  const r = rng(seed); let result = '';
  for (let i = 0; i < n; i++) { const x = Math.round(r() * w), y = Math.round(r() * h), size = 0.45 + r() * 1.4; result += circle(x, y, size.toFixed(1), '#dedce7', `opacity="${(0.12 + r() * 0.3).toFixed(2)}"`); }
  return result;
}
const commonDefs = `<defs>
  <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#101014"/><stop offset=".48" stop-color="#070709"/><stop offset="1" stop-color="#0c0a13"/></linearGradient>
  <linearGradient id="panel" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#1a1a21"/><stop offset="1" stop-color="#0c0c10"/></linearGradient>
  <linearGradient id="silver" x1="0" y1="0" x2=".8" y2="1"><stop stop-color="#f5f3fa"/><stop offset=".28" stop-color="#bebbc9"/><stop offset=".65" stop-color="#686574"/><stop offset="1" stop-color="#302d3b"/></linearGradient>
  <linearGradient id="purple" x1="0" y1="0" x2=".7" y2="1"><stop stop-color="#d5c8ff"/><stop offset=".3" stop-color="#ac96ec"/><stop offset=".7" stop-color="#6550a6"/><stop offset="1" stop-color="#292037"/></linearGradient>
  <radialGradient id="orb" cx=".3" cy=".25" r=".85"><stop stop-color="#faf7ff"/><stop offset=".21" stop-color="#ccc5de"/><stop offset=".59" stop-color="#8e809f"/><stop offset=".85" stop-color="#423647"/><stop offset="1" stop-color="#141118"/></radialGradient>
  <radialGradient id="purpleOrb" cx=".28" cy=".2" r=".9"><stop stop-color="#e3d6ff"/><stop offset=".24" stop-color="#bba3f6"/><stop offset=".55" stop-color="#7862af"/><stop offset=".83" stop-color="#3b2e5c"/><stop offset="1" stop-color="#191421"/></radialGradient>
  <radialGradient id="glow"><stop stop-color="#a998f5" stop-opacity=".28"/><stop offset="1" stop-color="#9984f2" stop-opacity="0"/></radialGradient>
  <radialGradient id="shade" cx=".2" cy=".22" r=".9"><stop offset=".2" stop-color="#080609" stop-opacity="0"/><stop offset=".6" stop-color="#09070d" stop-opacity=".15"/><stop offset=".9" stop-color="#050306" stop-opacity=".77"/><stop offset="1" stop-color="#030204" stop-opacity=".98"/></radialGradient>
  <linearGradient id="chartFill" x1="0" y1="0" x2="0" y2="1"><stop stop-color="#a897e9" stop-opacity=".25"/><stop offset="1" stop-color="#a897e9" stop-opacity="0"/></linearGradient>
  <filter id="shadow" x="-35%" y="-35%" width="170%" height="180%"><feDropShadow dx="0" dy="18" stdDeviation="18" flood-color="#000" flood-opacity=".65"/></filter>
  <filter id="softGlow" x="-70%" y="-70%" width="240%" height="240%"><feGaussianBlur stdDeviation="18"/></filter>
</defs>`;
function svg(name, width, height, title, desc, body, defs = '') {
  const content = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" role="img" aria-labelledby="title desc">
<title id="title">${escape(title)}</title><desc id="desc">${escape(desc)}</desc>
${commonDefs}${defs}
<g font-family="Arial, Helvetica, sans-serif">${rect(0, 0, width, height, 'url(#bg)', 0)}${body}</g>
</svg>\n`;
  writeFileSync(resolve(out, name), content);
  console.log(`Created ${name} (${width} × ${height})`);
}
function caption(w, h, label = 'PROJECT ILLUSTRATION') {
  return mono(36, h - 26, label, 11, '#686672', 'letter-spacing="2"') + mono(w - 36, h - 26, 'TOMMY REN / SELECTED WORK', 10, '#686672', 'text-anchor="end" letter-spacing="1.3"');
}
function ball(x, y, r, label, purple = false) {
  return `<g filter="url(#shadow)">${circle(x, y, r, purple ? 'url(#purpleOrb)' : 'url(#orb)', 'stroke="#c7bdd4" stroke-opacity=".3"')}${circle(x - r * .25, y - r * .35, r * .14, '#fff', 'opacity=".17"')}${circle(x, y + r * .06, r * .48, '#f4efff', 'opacity=".87"')}${text(x, y + r * .22, label, r * .6, '#272030', 'text-anchor="middle" font-weight="700"')}</g>`;
}
function windowDots(x, y) { return circle(x, y, 4, '#575560') + circle(x + 15, y, 4, '#575560') + circle(x + 30, y, 4, '#b6a4f1'); }

// Lottery: an original visual interpretation of virtual draws and draw history.
{
  let b = circle(530, 230, 320, 'url(#glow)') + stars(1000,720,3,35);
  b += mono(54, 62, 'VIRTUAL CANADIAN LOTTERY', 13, '#b7a8e5', 'letter-spacing="2.5"');
  b += text(54, 112, 'A little probability.', 40, '#e9e6ef', 'font-weight="600"') + text(54, 158, 'A lot of possibility.', 40, '#8f859f', 'font-weight="600"');
  b += chip(772, 46, 'SIMULATION', 168);
  b += `<ellipse cx="490" cy="334" rx="435" ry="108" fill="none" stroke="#6b5b83" stroke-opacity=".26" transform="rotate(-11 490 334)"/>`;
  [[158,351,70,'14',false],[284,305,72,'22',false],[419,287,82,'27',true],[568,310,76,'35',false],[708,349,72,'41',false],[830,404,66,'48',true]].forEach(a => { b += ball(...a); });
  b += panel(58, 475, 548, 156) + mono(82, 507, 'DRAW HISTORY', 12, '#b8b2c5', 'letter-spacing="2"') + mono(582,507,'ILLUSTRATIVE',10,'#625c70','text-anchor="end"');
  for(let i=0;i<3;i++) b += line(84, 535 + i*30, 577,535+i*30, '#2a2632');
  b += `<path d="M84 593 L130 576 L177 583 L225 559 L272 573 L319 541 L366 551 L413 524 L460 543 L507 534 L555 550 L577 531 L577 606 L84 606 Z" fill="url(#chartFill)"/>`;
  b += `<path d="M84 593 L130 576 L177 583 L225 559 L272 573 L319 541 L366 551 L413 524 L460 543 L507 534 L555 550 L577 531" fill="none" stroke="#b5a3ed" stroke-width="2.5" stroke-linecap="round"/>`;
  b += panel(628,475,312,156) + mono(652,508,'DRAW CONFIGURATION',12,'#b8b2c5','letter-spacing="1.4"') + text(652,554,'6 / 49',34,'#ece7f3','font-weight="600"') + mono(652,589,'Virtual play. Real exploration.',12,'#8c849a');
  b += caption(1000,720);
  svg('project-lottery.svg',1000,720,'Canada Lottery Simulation illustration','Original illustration of a virtual lottery simulation: six numbered balls, an illustrative history chart and a draw configuration. No real money, official lottery branding or results are depicted.',b);
}
{
  let b = circle(350,210,320,'url(#glow)');
  b += mono(34,46,'THE DRAW ROOM',12,'#b6a5e7','letter-spacing="2"') + chip(540,28,'6 OF 49',126);
  b += panel(32,72,636,294,22);
  b += mono(54,104,'VIRTUAL DRAW / NUMBER SELECTION',11,'#86818f','letter-spacing="1.5"');
  [14,22,27,35,41,48].forEach((v,i)=> {b+=ball(104+i*98,183,38,String(v),i===2);});
  b += line(55,251,644,251);
  b += mono(56,284,'TICKET',12,'#756e84','letter-spacing="1.5"');
  [14,22,27,35,41,48].forEach((v,i)=> {b+=rect(153+i*77,268,56,44,i===2?'#2e2443':'#202027',8,'stroke="#3c3549"')+mono(181+i*77,296,String(v).padStart(2,'0'),17,i===2?'#d1bbff':'#ccc7d3','text-anchor="middle"');});
  b += mono(56,339,'A playground for lottery mechanics and probability.',12,'#918a9e');
  b += caption(700,430,'INTERFACE STUDY');
  svg('project-lottery-detail.svg',700,430,'Virtual lottery draw interface study','An original interface study showing a simulated six-number draw and a virtual ticket. This is an illustration, not an application screenshot or real draw result.',b);
}
{
  let b = circle(420,230,340,'url(#glow)') + mono(36,53,'THE SHAPE OF RANDOMNESS',12,'#b6a5e7','letter-spacing="2"');
  b += text(36,93,'Every draw tells a different story.',25,'#e3ddea','font-weight="500"');
  b += panel(36,126,628,230,20) + mono(59,161,'NUMBER DISTRIBUTION',12,'#aaa3b8','letter-spacing="1.5"') + mono(641,161,'ILLUSTRATIVE',10,'#68606f','text-anchor="end"');
  for (let i=0;i<4;i++) b += line(60,190+i*41,638,190+i*41,'#2a2631');
  const rnd = rng(96);
  for (let i=0;i<33;i++) {const ht = 27+Math.round(rnd()*100); b+=rect(64+i*17.5,325-ht,9,ht,i%6===0?'#c1a8f1':'#776589',3);}
  b += mono(61,342,'01',10,'#6f687c') + mono(636,342,'49',10,'#6f687c','text-anchor="end"');
  b += panel(36,376,628,142,20)+mono(60,413,'EXPLORE THE MECHANICS',12,'#b3a9c3','letter-spacing="1.5"');
  ['Draw history','Virtual tickets','Game rules'].forEach((label,i)=> {b+=circle(70+i*192,461,7,i===1?'#b4a0ed':'#615872')+text(88+i*192,466,label,15,'#b8b0c4');});
  b += caption(700,600);
  svg('project-lottery-secondary.svg',700,600,'Lottery probability illustration','An illustrative number distribution and feature diagram for a virtual Canadian lottery simulator. The chart is decorative and does not represent measured usage or official results.',b);
}

// Matcher: commands are faithful to the repository; abstract cards show the flow.
{
  let b = circle(500,340,360,'url(#glow)') + stars(1000,720,11,40);
  b += mono(54,62,'REPOSITORIES → RELEVANCE',13,'#b8a9e4','letter-spacing="2.6"') + text(54,115,'Find your next contribution.',37,'#e8e3ef','font-weight="600"');
  b += `<g transform="translate(105 167) rotate(-3 390 180)" filter="url(#shadow)">`+panel(0,0,788,308,18)+windowDots(24,25)+mono(767,29,'repo-match',12,'#7c718f','text-anchor="end"')+line(0,50,788,50);
  b += mono(32,102,'$ repo-match fetch',24,'#d5cee1') + mono(32,134,'  collect repository context',14,'#767080');
  b += mono(32,178,'$ repo-match summarize',24,'#d5cee1') + mono(32,210,'  turn source into structured context',14,'#767080');
  b += mono(32,254,'$ repo-match match',24,'#c9adff') + rect(354,236,12,25,'#c6a9f9',0) + `</g>`;
  const nodes=[['FETCH','Repository context'],['SUMMARIZE','Project understanding'],['MATCH','Relevant candidates']];
  nodes.forEach(([title,subtitle],i)=> {const x=60+i*305;b+=panel(x,533,272,96,16)+mono(x+20,565,title,12,i===2?'#c8b0fa':'#9990ac','letter-spacing="1.8"')+text(x+20,598,subtitle,17,'#d5cddd');if(i<2) b+=line(x+274,580,x+302,580,'#8b769f','stroke-width="2"')+`<path d="M${x+297} 576 l5 4 -5 4" fill="none" stroke="#8b769f"/>`;});
  b+=caption(1000,720);
  svg('project-matcher.svg',1000,720,'GitHub Repo Matcher command-line illustration','An original terminal illustration showing the repo-match fetch, summarize and match commands, with a three-stage repository discovery pipeline. It does not show actual command output or measured rankings.',b);
}
{
  let b = circle(470,220,300,'url(#glow)') + mono(34,46,'CONTEXT IN. RELEVANCE OUT.',12,'#b7a4e7','letter-spacing="2"');
  b+=panel(32,70,636,294,18)+windowDots(52,91)+mono(646,95,'COMMAND FLOW',10,'#706780','text-anchor="end" letter-spacing="1.5"')+line(32,111,668,111);
  [['fetch','Source context'],['summarize','Structured understanding'],['match','Candidate discovery']].forEach(([command,description],i)=> {const y=157+i*72;b+=mono(55,y,'$',20,'#726486')+mono(81,y,`repo-match ${command}`,20,i===2?'#c6aaf7':'#d6cede')+text(632,y,description,12,'#8b8297','text-anchor="end"');if(i<2)b+=line(54,y+26,645,y+26,'#26222d');});
  b+=caption(700,430,'INTERFACE STUDY');
  svg('project-matcher-detail.svg',700,430,'Repo Matcher terminal interface study','Original interface study of the three repo-match commands: fetch, summarize, and match. Supplemental labels describe their conceptual purpose rather than inventing application output.',b);
}
{
  let b = circle(360,300,340,'url(#glow)') + mono(36,53,'FROM REPOSITORY TO DIRECTION',12,'#b6a5e7','letter-spacing="2"');
  b+=text(36,97,'Make the next step clearer.',27,'#e1d9eb','font-weight="500"');
  b+=panel(36,132,230,356,20)+mono(58,167,'YOUR CONTEXT',12,'#b7acc8','letter-spacing="1.5"');
  [['Languages','Python · TypeScript'],['Interests','Tools · Data · AI'],['Intent','Explore contributions']].forEach(([label,value],i)=> {const y=216+i*86;b+=mono(58,y,label.toUpperCase(),10,'#71687e','letter-spacing="1.2"')+text(58,y+27,value,14,'#b7adc6');if(i<2)b+=line(58,y+45,244,y+45,'#2c2734');});
  b+=`<path d="M276 308 H313 V204 H338 M313 308 H338 M313 308 V411 H338" fill="none" stroke="#77608c" stroke-width="1.5"/>`+circle(313,308,4,'#c2a0ef');
  [['01','Repository context'],['02','Project understanding'],['03','Candidate discovery']].forEach(([index,label],i)=> {const y=157+i*104;b+=panel(338,y,326,89,15)+mono(356,y+29,index,10,'#655876')+text(356,y+56,label,17,i===2?'#d4bcfa':'#c4b8d2')+rect(580,y+20,64,6,'#2f263b',3)+rect(580,y+33,44,6,'#2f263b',3);});
  b+=mono(36,535,'A conceptual matching flow; no fabricated scores.',12,'#8b7f9b')+caption(700,600);
  svg('project-matcher-secondary.svg',700,600,'Repo Matcher context and discovery diagram','Conceptual diagram of context feeding repository understanding and candidate discovery. Three numbered stages describe the workflow and are not ranking scores or recommendations.',b);
}

// Planets: sphere depictions are original 2D SVG artwork. The actual project
// generates seeded 2D textures; these illustrations do not claim live 3D rendering.
const planetDefs = `<defs>
  <linearGradient id="planetBands" x1="0" y1="0" x2=".3" y2="1">
    <stop stop-color="#cfc6e5"/><stop offset=".12" stop-color="#8e78a6"/><stop offset=".22" stop-color="#c9b6d6"/><stop offset=".28" stop-color="#68516f"/><stop offset=".36" stop-color="#9b7897"/><stop offset=".42" stop-color="#d5b9bf"/><stop offset=".48" stop-color="#75536a"/><stop offset=".53" stop-color="#c1a4b8"/><stop offset=".59" stop-color="#674c76"/><stop offset=".66" stop-color="#a78dbe"/><stop offset=".74" stop-color="#d1b9ca"/><stop offset=".81" stop-color="#795c85"/><stop offset=".9" stop-color="#b7a0c7"/><stop offset="1" stop-color="#675077"/>
  </linearGradient>
  <filter id="planetTexture" x="-15%" y="-15%" width="130%" height="130%">
    <feTurbulence type="fractalNoise" baseFrequency=".006 .038" numOctaves="4" seed="52" result="noise"/>
    <feDisplacementMap in="SourceGraphic" in2="noise" scale="30" xChannelSelector="R" yChannelSelector="G"/>
    <feComposite in2="SourceGraphic" operator="in"/>
  </filter>
  <filter id="surfaceNoise" x="0" y="0" width="100%" height="100%"><feTurbulence type="fractalNoise" baseFrequency=".45" numOctaves="3" seed="42"/><feColorMatrix type="saturate" values="0"/><feComponentTransfer><feFuncA type="linear" slope=".15"/></feComponentTransfer><feBlend in2="SourceGraphic" mode="soft-light"/></filter>
  <linearGradient id="ring" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#8c6bad" stop-opacity=".2"/><stop offset=".35" stop-color="#d9c7e2" stop-opacity=".65"/><stop offset=".6" stop-color="#695179" stop-opacity=".2"/><stop offset="1" stop-color="#d5bfdf" stop-opacity=".7"/></linearGradient>
</defs>`;
function planet(cx,cy,r,clipId) {
  return `<defs><clipPath id="${clipId}">${circle(cx,cy,r,'#fff')}</clipPath></defs><g clip-path="url(#${clipId})">${rect(cx-r-35,cy-r-35,2*r+70,2*r+70,'url(#planetBands)',0,'filter="url(#planetTexture)"')}${circle(cx,cy,r,'transparent','filter="url(#surfaceNoise)"')}${circle(cx,cy,r,'url(#shade)')}</g>${circle(cx,cy,r,'none','stroke="#d8c7e9" stroke-opacity=".16"')}`;
}
{
  let b = stars(1000,720,49,95)+circle(631,355,332,'url(#glow)');
  b += mono(54,62,'PROCEDURAL PLANET TEXTURES',13,'#c2aee4','letter-spacing="2.4"');
  b += text(54,117,'Worlds from a seed.',41,'#ece5f3','font-weight="600"') + mono(57,151,'A 2D texture generator. An infinite imagination.',14,'#8a7a99');
  b += `<ellipse cx="640" cy="384" rx="330" ry="102" fill="none" stroke="url(#ring)" stroke-width="21" transform="rotate(-29 640 384)"/>`;
  b += planet(640,365,224,'planet-main');
  b += `<path d="M352 554 C422 578 594 552 754 463 C873 397 936 330 931 292" fill="none" stroke="url(#ring)" stroke-width="14" stroke-linecap="round"/>`;
  b += panel(55,345,268,232,18)+mono(76,379,'RECIPE SELECTOR',12,'#bcaccb','letter-spacing="1.6"');
  [['TYPE','Gas giant'],['PALETTE','Violet / dust'],['OUTPUT','Seeded 2D texture']].forEach(([a,c],i)=> {const y=425+i*58;b+=mono(77,y,a,10,'#776283','letter-spacing="1.3"')+text(299,y,c,14,'#bca8cb','text-anchor="end"');if(i<2)b+=line(78,y+18,300,y+18,'#2b2037');});
  b += `<path d="M731 158 H842 L874 125" fill="none" stroke="#6e567d"/>`+mono(863,115,'TEXTURE STUDY',10,'#9a7daf','text-anchor="end" letter-spacing="1.5"');
  b += mono(55,628,'Noise · palettes · reproducible seeds',14,'#9c8aad') + caption(1000,720);
  svg('project-planets.svg',1000,720,'Procedural planet texture illustration','Original SVG artwork depicting a banded planet with orbital rings and a recipe selector. The actual project generates seeded two-dimensional planet textures; the depicted sphere is an illustration, not an implemented live 3D renderer.',b,planetDefs);
}
{
  let b = stars(700,430,22,48)+circle(520,220,280,'url(#glow)');
  b += mono(34,46,'A WORLD IN EVERY RECIPE',12,'#ba9bdd','letter-spacing="2"');
  b += planet(513,226,134,'planet-detail');
  b += panel(33,83,279,278,18)+mono(55,119,'TEXTURE RECIPE',12,'#bcaccb','letter-spacing="1.6"');
  [['Base','Fractal noise'],['Layers','Banded surface'],['Palette','Violet / dust'],['Seed','Reproducible'],['Export','2D texture']].forEach(([label,value],i)=>{const y=164+i*39;b+=mono(55,y,label,12,'#766782')+text(290,y,value,13,'#bca8cb','text-anchor="end"');});
  b += caption(700,430,'INTERFACE STUDY');
  svg('project-planets-detail.svg',700,430,'Procedural texture recipe study','An original recipe selector illustration with a decorative sphere. It communicates seeded noise, surface layers, palettes and 2D texture output without claiming the actual application renders live 3D planets.',b,planetDefs);
}
{
  let b = stars(700,600,39,60)+circle(350,240,350,'url(#glow)')+mono(36,53,'SAME PROCESS. DIFFERENT WORLDS.',12,'#b69acc','letter-spacing="1.7"');
  b += text(36,96,'Texture is the starting point.',27,'#ddd1e8','font-weight="500"');
  b += panel(36,126,628,200,18)+mono(58,160,'SEEDED 2D SURFACE',11,'#ab90bd','letter-spacing="1.8"');
  b += `<defs><clipPath id="texture-map">${rect(58,179,584,123,'#fff',10)}</clipPath></defs><g clip-path="url(#texture-map)">${rect(37,160,625,166,'url(#planetBands)',0,'filter="url(#planetTexture)"')}${rect(58,179,584,123,'transparent',0,'filter="url(#surfaceNoise)"')}</g>`;
  b += planet(140,432,69,'planet-small-a')+planet(350,432,69,'planet-small-b')+planet(560,432,69,'planet-small-c');
  b += `<g opacity=".48">${circle(350,432,69,'#69476c')}${circle(560,432,69,'#313c59')}</g>`;
  ['VIOLET DUST','ROSE HAZE','BLUE HOUR'].forEach((label,i)=>{b+=mono(140+i*210,533,label,10,'#ac92c0','text-anchor="middle" letter-spacing="1.7"');});
  b += caption(700,600);
  svg('project-planets-secondary.svg',700,600,'Seeded planet texture and palette variations','An original illustration of a two-dimensional banded texture alongside three sphere depictions showing palette variations. The sphere images are artistic texture studies rather than actual live 3D rendering output.',b,planetDefs);
}
