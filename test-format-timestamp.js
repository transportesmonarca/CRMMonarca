// Test script for formatTimestamp logic
function formatTimestamp(timestamp, includeTime=false){
  if(!timestamp) return '';
  if(typeof timestamp==='string' && /^\d{4}-\d{2}-\d{2}$/.test(timestamp)){
    const [y,m,d]=timestamp.split('-');
    const base=`${d}-${m}-${y}`;
    return includeTime?`${base}, 00:00:00`:base;
  }
  const date = typeof timestamp==='string'? new Date(timestamp): timestamp;
  if(!date || isNaN(date.getTime())) return String(timestamp??'');
  const formatter = new Intl.DateTimeFormat('es-MX',{
    timeZone:'America/Matamoros',year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',second:'2-digit',hour12:false
  });
  const parts = formatter.formatToParts(date);
  const map={};
  parts.forEach(p=>{ if(p.type!=='literal') map[p.type]=p.value; });
  const fecha=`${map.day}-${map.month}-${map.year}`;
  return includeTime?`${fecha}, ${map.hour}:${map.minute}:${map.second}`:fecha;
}

const samples=[
  '2025-11-12T03:56:00.000Z', // should be 11-11-2025 21:56:00 local
  '2025-03-10T15:00:00.000Z',
  '2025-07-01T12:30:45.000Z',
  '2025-11-12', // date-only
];

for(const s of samples){
  console.log('\nTimestamp:',s);
  console.log('  -> fecha   :', formatTimestamp(s));
  console.log('  -> fecha/h :', formatTimestamp(s,true));
}
