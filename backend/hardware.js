/*
 * Optional Raspberry Pi hardware adapter.
 * Live sensor values can be posted to POST /api/inject without changing the UI.
 * The original Python hardware boundary (SPI/I2C/GPIO/LCD) is isolated here.
 */
const FS=1000,SAMPLES=4000,VREF=3.3,V_CAL=455,I_CAL=30*(0.4/0.7);
function rms(values){return Math.sqrt(values.reduce((s,v)=>s+v*v,0)/values.length);}
function mean(values){return values.reduce((a,b)=>a+b,0)/values.length;}
function centered(values){const m=mean(values);return values.map(v=>v-m);}
function simulateElectrical(){
  const v=Array.from({length:SAMPLES},()=>2.38+0.015*(Math.random()-.5));
  const i=Array.from({length:SAMPLES},()=>0.9+0.25*(Math.random()-.5));
  return {Voltage_RMS:rms(centered(v))*V_CAL,Irms:rms(centered(i))*I_CAL};
}
module.exports={FS,SAMPLES,VREF,V_CAL,I_CAL,rms,mean,centered,simulateElectrical};
