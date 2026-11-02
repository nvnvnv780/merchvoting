import fs from 'node:fs';
import path from 'node:path';
import { merchImages } from '../src/catalog.js';
let css=fs.readFileSync('src/style.css','utf8');
for(const weight of [400,500,600,700,800])for(const subset of ['latin','vietnamese']){
const file=`node_modules/@fontsource/montserrat/${subset}-${weight}.css`;
let font=fs.readFileSync(file,'utf8').replace(/url\(([^)]+)\)/g,(_,url)=>{
const p=path.resolve(path.dirname(file),url.replace(/["']/g,''));
return `url(data:font/${p.endsWith('woff2')?'woff2':'woff'};base64,${fs.readFileSync(p).toString('base64')})`;
});css=font+'\n'+css;
}
let js=['src/phone.js','src/catalog.js','src/sort.js'].map(file=>fs.readFileSync(file,'utf8').replaceAll('export ', '')).join('\n')+'\n'+fs.readFileSync('src/main.js','utf8').replace(/^import .*;\n/gm,'').replace('import.meta.env.DEV','true');
const embeddedAssets = JSON.stringify({logo: 'data:image/jpeg;base64,' + fs.readFileSync('public/logo.jpeg').toString('base64'), photos: merchImages.map(file => `data:image/${file.endsWith('.jpeg') ? 'jpeg' : 'webp'};base64,` + fs.readFileSync(`public${file}`).toString('base64'))});
let html=fs.readFileSync('index.html','utf8').replace('<script type="module" src="/src/main.js"></script>',`<style>${css}</style><script id="tuctac-assets" type="application/json">${embeddedAssets}</script><script>window.__TUCTAC_STANDALONE__=true;window.__TUCTAC_ASSETS__=JSON.parse(document.getElementById("tuctac-assets").textContent);${js.replaceAll('</script','<\\/script')}</script>`);
fs.mkdirSync('downloads',{recursive:true});fs.writeFileSync('downloads/Tuc-Tac-Merch-Demo.html',html);
console.log('Created standalone demo:',fs.statSync('downloads/Tuc-Tac-Merch-Demo.html').size,'bytes');
