'use strict';
const $ = id => document.getElementById(id);
const KEY = 'strandGpsTesterOfficeV1';
let measurements = [];
const number = (id) => Number($(id).value);
const validOffice = () => $('officeLat').value.trim() !== '' && $('officeLon').value.trim() !== '' && Number.isFinite(number('officeLat')) && Number.isFinite(number('officeLon')) && Math.abs(number('officeLat')) <= 90 && Math.abs(number('officeLon')) <= 180;
const radius = () => number('radius');
function status(message, kind='') { $('status').textContent=message; $('status').className='status '+kind; }
function distanceMeters(lat1, lon1, lat2, lon2) {
  const rad = Math.PI / 180, dLat=(lat2-lat1)*rad, dLon=(lon2-lon1)*rad;
  const a=Math.sin(dLat/2)**2+Math.cos(lat1*rad)*Math.cos(lat2*rad)*Math.sin(dLon/2)**2;
  return 6371000*2*Math.atan2(Math.sqrt(a),Math.sqrt(1-a));
}
function saveOffice() {
  if (!validOffice() || !Number.isFinite(radius()) || radius()<10 || radius()>5000) {status('Enter valid office coordinates and a radius between 10 and 5000 meters.','bad');return;}
  try {localStorage.setItem(KEY,JSON.stringify({lat:number('officeLat'),lon:number('officeLon'),radius:radius()}));status('Office reference saved on this device.','good');}
  catch {status('Office reference is usable for this session, but browser storage is unavailable.','warn');}
}
function locate(callback) {
  if (!window.isSecureContext || !navigator.geolocation) {status('Geolocation unavailable. Open the published HTTPS GitHub Pages URL in a browser that supports location services.','bad');return;}
  $('test').disabled=true;$('useCurrent').disabled=true;
  status('Requesting a fresh location reading…');
  navigator.geolocation.getCurrentPosition(position=>{
    $('test').disabled=false;$('useCurrent').disabled=false;callback(position);
  },error=>{
    $('test').disabled=false;$('useCurrent').disabled=false;
    const explanations={1:'Location permission denied. Enable it in your browser settings.',2:'Position unavailable. Try moving near a window or enabling location services.',3:'Location request timed out. Please try again.'};
    status(explanations[error.code]||'Unable to obtain location.','bad');
  },{enableHighAccuracy:true,timeout:20000,maximumAge:0});
}
$('saveOffice').addEventListener('click',saveOffice);
$('useCurrent').addEventListener('click',()=>locate(p=>{
  $('officeLat').value=p.coords.latitude.toFixed(7);$('officeLon').value=p.coords.longitude.toFixed(7);
  status(`Office reference set from this phone (reported accuracy ±${Math.round(p.coords.accuracy)} m). Verify the point before relying on comparisons.`,'warn');
}));
$('test').addEventListener('click',()=>{
  if(!validOffice() || !Number.isFinite(radius()) || radius()<10 || radius()>5000){status('Set valid office coordinates and a radius first.','bad');return;}
  locate(p=>{
    const {latitude,longitude,accuracy}=p.coords;
    const d=distanceMeters(latitude,longitude,number('officeLat'),number('officeLon'));
    $('lat').textContent=latitude.toFixed(7);$('lon').textContent=longitude.toFixed(7);
    $('accuracy').textContent=`±${Math.round(accuracy)} m`;$('distance').textContent=`${Math.round(d)} m`;
    let label,kind;
    if(accuracy>radius() || Math.abs(d-radius())<=accuracy){label='Uncertain';kind='warn';}
    else if(d+accuracy<radius()){label='Inside (estimated)';kind='good';}
    else{label='Outside (estimated)';kind='bad';}
    status(`${label}. Distance ${Math.round(d)} m; reported accuracy ±${Math.round(accuracy)} m. This is a feasibility reading, not proof of presence.`,kind);
    measurements.unshift({time:new Date().toLocaleTimeString('en-PH'),accuracy:Math.round(accuracy),distance:Math.round(d),label});
    const tbody=$('history');tbody.replaceChildren();
    for(const item of measurements){const tr=document.createElement('tr');for(const value of [item.time,`${item.accuracy} m`,`${item.distance} m`,item.label]){const td=document.createElement('td');td.textContent=value;tr.append(td);}tbody.append(tr);}
  });
});
$('clear').addEventListener('click',()=>{measurements=[];$('history').innerHTML='<tr><td colspan="4">No measurements yet.</td></tr>';status('Session measurements cleared.');});
try {const saved=JSON.parse(localStorage.getItem(KEY)||'null');if(saved){$('officeLat').value=saved.lat;$('officeLon').value=saved.lon;$('radius').value=saved.radius;}}catch{}
