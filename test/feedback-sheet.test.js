import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {onRequest} from '../functions/api/suggestions.js';
test('phone/email feedback reaches the same Sheet column and retries do not duplicate',async()=>{
 const rows=[['Thời gian','Ý kiến','Mã','SĐT']];let locked=false;
 const secret='fixture-only-32-characters-or-more';
 const sheet={getLastRow:()=>rows.length,getRange(row,col,height,width){return {
 setNumberFormat(){return this;},setWrap(){return this;},setValue(v){rows[row-1][col-1]=v;return this;},
 setValues(values){for(let i=0;i<values.length;i++){rows[row-1+i]??=[];values[i].forEach((v,j)=>rows[row-1+i][col-1+j]=v);}return this;},
 createTextFinder(value){return {matchEntireCell(){return this;},findNext(){return rows.slice(row-1,row-1+height).find(r=>r[col-1]===value)||null;}};}
 };}};
 const context=vm.createContext({ContentService:{MimeType:{JSON:'json'},createTextOutput:value=>({setMimeType:()=>JSON.parse(value)})},PropertiesService:{getScriptProperties:()=>({getProperty:()=>secret})},LockService:{getScriptLock:()=>({waitLock(){locked=true;},hasLock:()=>locked,releaseLock(){locked=false;}})},SpreadsheetApp:{openById:()=>({getSheetByName:()=>sheet}),flush(){}},Utilities:{formatDate:()=> '2026-11-02 18:00:00'}});
 vm.runInContext(fs.readFileSync(new URL('../integrations/merch-suggestions.gs',import.meta.url),'utf8'),context);
 const original=globalThis.fetch;
 try{
 globalThis.fetch=async(_,opts)=>Response.json(context.doPost({postData:{contents:opts.body}}));
 const send=(contact,id)=>onRequest({request:new Request('https://example.test/api/suggestions',{method:'POST',headers:{Origin:'https://example.test','Content-Type':'application/json'},body:JSON.stringify({...contact,wish:'=1+1',requestId:id})}),env:{...{SUGGESTIONS_WEBHOOK_URL:'https://script.google.com/macros/s/test/exec'},SUGGESTIONS_WEBHOOK_SECRET:secret}});
 const id='12345678-1234-4234-8234-123456789abc';
 assert.equal((await send({phone:'+84 912 345 678'},id)).status,200);
 assert.equal(rows[1][3],'0912345678');
 assert.equal((await send({email:'Fan@Example.com'},id.slice(0,-1)+'d')).status,200);
 assert.equal(rows[2][3],'fan@example.com');
 assert.equal(rows[2][1],"'=1+1");assert.equal(rows[0][3],'Số điện thoại/email');
 assert.equal((await send({email:'fan@example.com'},id.slice(0,-1)+'d')).status,200);
 assert.equal(rows.length,3);
 assert.equal((await send({email:'=fan@example.com'},id.slice(0,-1)+'e')).status,200);
 assert.equal(rows[3][3],"'=fan@example.com");
 assert.equal(locked,false);
 }finally{globalThis.fetch=original;}
});
