/* GearLab canonical machine document validator v0.1.0.
 * No dependencies. Node: node core/machine-document.js
 * Browser: window.GearLabMachineDocument
 */
(function(root){
"use strict";
const TYPES=new Set(["fixed","revolute","prismatic","cylindrical","spherical","planar","universal","screw","custom"]);
const TRANSMISSIONS=new Set(["gear","rack-pinion","belt","chain","differential","lead-screw","custom"]);
const ACTUATORS=new Set(["manual","dc-motor","stepper","servo","hydraulic","pneumatic","thermal","spring","custom"]);
const finite=x=>typeof x==="number"&&Number.isFinite(x);
const nonempty=x=>typeof x==="string"&&x.length>0;
function validate(doc){
 const errors=[],fail=(path,message)=>errors.push({path,message});
 if(!doc||typeof doc!=="object"||Array.isArray(doc))return {valid:false,errors:[{path:"$",message:"Document must be an object"}]};
 if(doc.schemaVersion!=="0.1.0")fail("schemaVersion","Unsupported schema version");
 const u=doc.units;
 if(!u||u.length!=="mm"||u.angle!=="rad"||u.mass!=="kg"||u.time!=="s")fail("units","Canonical units must be mm/rad/kg/s");
 const lists=["parts","occurrences","joints","transmissions","actuators"];
 for(const k of lists)if(!Array.isArray(doc[k]))fail(k,"Expected array");
 if(errors.length)return {valid:false,errors};
 const ids=new Set(),unique=(id,path)=>{
  if(!nonempty(id))fail(path,"ID must be nonempty");
  else if(ids.has(id))fail(path,"Duplicate global ID: "+id);
  else ids.add(id);
 };
 const frameIds=new Map(),parts=new Map(),occurrences=new Map(),joints=new Map();
 const transform=(t,path)=>{
  if(!t||!Array.isArray(t.translation)||t.translation.length!==3||!t.translation.every(finite))fail(path+".translation","Expected 3 finite numbers");
  if(!t||!Array.isArray(t.quaternion)||t.quaternion.length!==4||!t.quaternion.every(finite)||Math.abs(Math.hypot(...t.quaternion)-1)>1e-6)fail(path+".quaternion","Expected normalized quaternion");
 };
 doc.parts.forEach((p,i)=>{
  const path="parts["+i+"]";
  if(!p||typeof p!=="object"){fail(path,"Expected object");return;}
  unique(p.id,path+".id");if(typeof p.revision!=="string")fail(path+".revision","Expected revision string");
  parts.set(p.id,p);const frames=new Set();frameIds.set(p.id,frames);
  if(!Array.isArray(p.frames)){fail(path+".frames","Expected array");return;}
  p.frames.forEach((f,j)=>{const fp=path+".frames["+j+"]";if(!f||!nonempty(f.id)){fail(fp+".id","Invalid frame ID");return;}if(frames.has(f.id))fail(fp+".id","Duplicate frame ID");frames.add(f.id);transform(f.transform,fp+".transform");});
 });
 doc.occurrences.forEach((o,i)=>{
  const path="occurrences["+i+"]";if(!o||typeof o!=="object"){fail(path,"Expected object");return;}
  unique(o.id,path+".id");if(!parts.has(o.partId))fail(path+".partId","Unknown part definition");transform(o.transform,path+".transform");occurrences.set(o.id,o);
 });
 const endpoint=(ep,path)=>{
  if(!ep||!occurrences.has(ep.occurrenceId)){fail(path+".occurrenceId","Unknown occurrence");return;}
  const partId=occurrences.get(ep.occurrenceId).partId;
  if(!frameIds.get(partId)?.has(ep.frameId))fail(path+".frameId","Frame not on referenced part");
 };
 doc.joints.forEach((j,i)=>{
  const path="joints["+i+"]";if(!j||typeof j!=="object"){fail(path,"Expected object");return;}
  unique(j.id,path+".id");if(!TYPES.has(j.type))fail(path+".type","Unknown joint type");
  endpoint(j.a,path+".a");endpoint(j.b,path+".b");
  if(j.a?.occurrenceId===j.b?.occurrenceId)fail(path,"Joint cannot connect occurrence to itself");
  joints.set(j.id,j);
 });
 doc.transmissions.forEach((t,i)=>{
  const path="transmissions["+i+"]";if(!t||typeof t!=="object"){fail(path,"Expected object");return;}
  unique(t.id,path+".id");if(!TRANSMISSIONS.has(t.type))fail(path+".type","Unknown transmission type");
  if(!Array.isArray(t.jointIds)||!t.jointIds.length)fail(path+".jointIds","At least one joint required");
  else{if(new Set(t.jointIds).size!==t.jointIds.length)fail(path+".jointIds","Repeated joint");t.jointIds.forEach((id,k)=>{if(!joints.has(id))fail(path+".jointIds["+k+"]","Unknown joint");});}
  if(t.ratio!==undefined&&(!finite(t.ratio)||t.ratio===0))fail(path+".ratio","Ratio must be finite and nonzero");
  if(t.efficiency!==undefined&&(!finite(t.efficiency)||t.efficiency<0||t.efficiency>1))fail(path+".efficiency","Efficiency must be within [0,1]");
 });
 doc.actuators.forEach((a,i)=>{
  const path="actuators["+i+"]";if(!a||typeof a!=="object"){fail(path,"Expected object");return;}
  unique(a.id,path+".id");if(!ACTUATORS.has(a.type))fail(path+".type","Unknown actuator type");
  if(!joints.has(a.jointId))fail(path+".jointId","Unknown driven joint");
 });
 if(doc.occurrences.length&&!doc.occurrences.some(o=>o?.grounded===true))fail("occurrences","At least one grounded occurrence is required");
 return {valid:errors.length===0,errors};
}
function example(){
 const T=(x=0,y=0,z=0)=>({translation:[x,y,z],quaternion:[0,0,0,1]});
 return {schemaVersion:"0.1.0",units:{length:"mm",angle:"rad",mass:"kg",time:"s"},
 parts:[{id:"frame",revision:"1",frames:[{id:"input",transform:T()},{id:"output",transform:T(45,0,0)}]},
 {id:"shaft",revision:"1",frames:[{id:"axis",transform:T()}]}],
 occurrences:[{id:"base",partId:"frame",transform:T(),grounded:true},{id:"input-shaft",partId:"shaft",transform:T()},{id:"output-shaft",partId:"shaft",transform:T(45,0,0)}],
 joints:[{id:"input-revolute",type:"revolute",a:{occurrenceId:"base",frameId:"input"},b:{occurrenceId:"input-shaft",frameId:"axis"}},
 {id:"output-revolute",type:"revolute",a:{occurrenceId:"base",frameId:"output"},b:{occurrenceId:"output-shaft",frameId:"axis"}}],
 transmissions:[{id:"gear-pair",type:"gear",jointIds:["input-revolute","output-revolute"],ratio:-0.5,efficiency:0.95}],
 actuators:[{id:"hand-crank",type:"manual",jointId:"input-revolute"}]};
}
function selfTest(){
 const cases=[],run=(name,mutate,expected)=>{
  const d=example();if(mutate)mutate(d);const r=validate(d);cases.push({name,pass:r.valid===expected,errors:r.errors});
 };
 run("valid compound-ready two-shaft model",null,true);
 run("duplicate global ID",d=>d.actuators[0].id="gear-pair",false);
 run("unknown part",d=>d.occurrences[1].partId="missing",false);
 run("unknown joint frame",d=>d.joints[0].a.frameId="missing",false);
 run("unknown joint",d=>d.transmissions[0].jointIds[1]="missing",false);
 run("non-normalized quaternion",d=>d.parts[0].frames[0].transform.quaternion=[0,0,0,2],false);
 run("non-finite translation",d=>d.occurrences[0].transform.translation[0]=Infinity,false);
 run("missing ground",d=>d.occurrences[0].grounded=false,false);
 run("invalid efficiency",d=>d.transmissions[0].efficiency=1.1,false);
 run("self joint",d=>d.joints[0].b={occurrenceId:"base",frameId:"output"},false);
 run("unsupported version",d=>d.schemaVersion="2.0",false);
 run("repeated frame",d=>d.parts[0].frames.push({...d.parts[0].frames[0]}),false);
 return {pass:cases.every(c=>c.pass),passed:cases.filter(c=>c.pass).length,total:cases.length,cases};
}
const api={validate,example,selfTest};
if(typeof module!=="undefined"&&module.exports)module.exports=api;
else root.GearLabMachineDocument=api;
if(typeof require!=="undefined"&&typeof module!=="undefined"&&require.main===module){
 const r=selfTest();console.log(JSON.stringify({pass:r.pass,passed:r.passed,total:r.total},null,2));if(!r.pass){console.error(r.cases.filter(c=>!c.pass));process.exitCode=1;}
}
})(typeof globalThis!=="undefined"?globalThis:this);
