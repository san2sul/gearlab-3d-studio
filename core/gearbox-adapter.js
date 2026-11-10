/* GearLab legacy gearbox -> canonical machine document adapter.
 * Depends on GearLabMachineDocument. No geometry changes.
 */
(function(root){
"use strict";
const T=(x=0,y=0,z=0)=>({translation:[x,y,z],quaternion:[0,0,0,1]});
function convert(d){
 if(!d||!d.gear||!d.housing||!d.shafts||!Array.isArray(d.shafts.centers)||d.shafts.centers.length!==2)throw Error("먼저 기어 자동 배치를 완료하세요.");
 const g=d.gear,c=d.shafts.centers,dist=Math.hypot(c[1][0]-c[0][0],c[1][1]-c[0][1]),expected=g.m*(g.z1+g.z2)/2;
 if(!Number.isFinite(dist)||Math.abs(dist-expected)>1e-3)throw Error("기어 중심 거리가 맞지 않습니다.");
 const model={
 schemaVersion:"0.1.0",units:{length:"mm",angle:"rad",mass:"kg",time:"s"},
 parts:[
 {id:"housing",revision:"1",frames:[{id:"axis-1",transform:T(c[0][0],c[0][1],0)},{id:"axis-2",transform:T(c[1][0],c[1][1],0)}],geometry:{kind:"polygon-case",polygon:d.housing.polygon,wall:d.housing.wall,height:d.housing.height,floor:d.housing.floor}},
 {id:"input-gear",revision:"1",frames:[{id:"axis",transform:T()}],geometry:{kind:"spur-gear",module:g.m,teeth:g.z1,pressureAngle:g.alpha,thickness:g.thick,bore:g.bore}},
 {id:"output-gear",revision:"1",frames:[{id:"axis",transform:T()}],geometry:{kind:"spur-gear",module:g.m,teeth:g.z2,pressureAngle:g.alpha,thickness:g.thick,bore:g.bore}}
 ],
 occurrences:[
 {id:"housing-1",partId:"housing",transform:T(),grounded:true},
 {id:"input-1",partId:"input-gear",transform:T(c[0][0],c[0][1],d.housing.floor)},
 {id:"output-1",partId:"output-gear",transform:T(c[1][0],c[1][1],d.housing.floor)}
 ],
 joints:[
 {id:"input-axis",type:"revolute",a:{occurrenceId:"housing-1",frameId:"axis-1"},b:{occurrenceId:"input-1",frameId:"axis"}},
 {id:"output-axis",type:"revolute",a:{occurrenceId:"housing-1",frameId:"axis-2"},b:{occurrenceId:"output-1",frameId:"axis"}}
 ],
 transmissions:[{id:"spur-mesh",type:"gear",jointIds:["input-axis","output-axis"],ratio:-g.z1/g.z2,efficiency:0.95}],
 actuators:[{id:"input-drive",type:"manual",jointId:"input-axis",parameters:{nominalRpm:g.rpm}}],
 provenance:{source:"GearLab 3D Studio geometryDesign()",status:"conceptual assembly; shaft bearings, fasteners, motor mount and manufacturing fits not yet modeled"}
 };
 const validator=root.GearLabMachineDocument;
 if(!validator||typeof validator.validate!=="function")throw Error("기계 데이터 검증기를 불러오지 못했습니다.");
 const result=validator.validate(model);
 if(!result.valid)throw Error("어셈블리 데이터 오류: "+result.errors.map(e=>e.path+" "+e.message).join("; "));
 return model;
}
function kinematicPreview(model,inputAngle){
 if(!Number.isFinite(inputAngle))throw Error("입력 회전각이 유효하지 않습니다.");
 const t=model.transmissions.find(t=>t.type==="gear");
 if(!t||!Number.isFinite(t.ratio))throw Error("기어 전달비가 없습니다.");
 return {inputAngle,outputAngle:inputAngle*t.ratio,ratio:t.ratio,mode:"ideal-kinematic-only"};
}
function selfTest(){
 const v=root.GearLabMachineDocument;
 const example={gear:{m:1.5,z1:20,z2:40,alpha:20,thick:6,bore:5.3,rpm:60},housing:{polygon:[[0,0],[120,0],[120,90],[0,90]],wall:3,height:16,floor:3},shafts:{centers:[[20,30],[65,30]],holeDiameter:5.6}};
 const cases=[],test=(name,fn)=>{try{cases.push({name,pass:!!fn()})}catch(e){cases.push({name,pass:false,error:e.message})}};
 test("canonical conversion valid",()=>v.validate(convert(example)).valid);
 test("two revolute joints",()=>convert(example).joints.filter(j=>j.type==="revolute").length===2);
 test("gear ratio sign",()=>kinematicPreview(convert(example),2*Math.PI).outputAngle===-Math.PI);
 test("grounded housing",()=>convert(example).occurrences[0].grounded===true);
 test("reject invalid center distance",()=>{try{convert({...example,shafts:{centers:[[20,30],[66,30]]}});return false}catch(e){return true}});
 test("reject invalid angle",()=>{try{kinematicPreview(convert(example),NaN);return false}catch(e){return true}});
 return {pass:cases.every(c=>c.pass),passed:cases.filter(c=>c.pass).length,total:cases.length,cases};
}
const api={convert,kinematicPreview,selfTest};
if(typeof module!=="undefined"&&module.exports)module.exports=api;
else root.GearLabGearboxAdapter=api;
})(typeof globalThis!=="undefined"?globalThis:this);
