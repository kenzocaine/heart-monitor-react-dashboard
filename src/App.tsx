import { useEffect, useState } from 'react';
import { useAuthenticator } from '@aws-amplify/ui-react';
import { generateClient } from 'aws-amplify/data';
import { Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, Tooltip, Legend } from 'chart.js';
import { Line } from 'react-chartjs-2';
import type { Schema } from '../amplify/data/resource';
import './App.css';
ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Tooltip, Legend);
const client = generateClient<Schema>();
const device = 'HeartMonitor01';
type Rate = Schema['HeartRate']['type'];
type Wave = Schema['Waveform']['type'];
const clock = (t: string) => new Date(Number(t)).toLocaleTimeString();
export default function App() {
  const { signOut } = useAuthenticator();
  const [rates, setRates] = useState<Rate[]>([]);
  const [wave, setWave] = useState<Wave | null>(null);
  const [error, setError] = useState('');
  const [now, setNow] = useState(Date.now());
  useEffect(() => { const timer = setInterval(() => setNow(Date.now()), 1000); return () => clearInterval(timer); }, []);
  useEffect(() => {
    let active = true;
    const fail = (e: unknown) => { if (active) setError(String(e)); };
    const merge = (items: Rate[]) => setRates(old => Array.from(new Map([...old, ...items].map(r => [r.timestamp, r])).values()).sort((a,b) => Number(a.timestamp)-Number(b.timestamp)).slice(-120));
    const sub = client.models.HeartRate.onCreate({ filter: { device_id: { eq: device } } }).subscribe({ next: r => { if(active) merge([r]); }, error: fail });
    const waveSub = client.models.Waveform.observeQuery({ filter: { device_id: { eq: device } } }).subscribe({ next: ({items}) => { if(active) setWave(items[0] ?? null); }, error: fail });
    const load = async () => {
      try {
        const result = await client.models.HeartRate.list({ device_id: device }, { sortDirection: 'DESC', limit: 120 });
        if (result.errors?.length) throw new Error(JSON.stringify(result.errors));
        if (active) merge(result.data);
      } catch(e) { fail(e); }
    };
    void load();
    const refresh = setInterval(() => void load(), 30000);
    return () => { active = false; sub.unsubscribe(); waveSub.unsubscribe(); clearInterval(refresh); };
  }, []);
  const latest = rates[rates.length-1];
  const fresh = latest && now - Number(latest.timestamp) < 20000;
  const valid = rates.filter(r => r.valid && r.bpm > 0);
  const average = valid.length ? (valid.reduce((s,r)=>s+r.bpm,0)/valid.length).toFixed(1) : '—';
  const options = { responsive: true, maintainAspectRatio: false, animation: false as const, plugins: { legend: { display: false } }, scales: { x: { ticks: { maxTicksLimit: 8 } } } };
  return <main><header><div><small>IoT TELEMETRY / {device}</small><h1>Heart monitor</h1></div><button onClick={signOut}>Sign out</button></header>
    {error && <aside role="alert">Data access error. Check MonitorReaders group membership and sign in again. {error}</aside>}
    <div className="metrics"><section><small>Current heart rate</small><strong>{fresh && latest.valid && latest.bpm > 0 ? latest.bpm.toFixed(1) : '—'} <em>BPM</em></strong><p>{!latest ? 'Waiting for data' : !fresh ? 'No recent measurement' : latest.valid ? 'Receiving measurements' : 'No valid heartbeat detected'}</p></section><section><small>Average of displayed valid readings</small><strong>{average} <em>BPM</em></strong><p>{valid.length} valid measurements</p></section></div>
    <section><h2>Latest optical pulse waveform</h2><p>{wave ? `${wave.sampleCount} samples · ${wave.sampleRate} Hz · ${clock(wave.timestamp)}${now-Number(wave.timestamp)>30000?' · stale':''}` : 'Waiting for processed waveform'}</p><div className="plot"><Line options={options} data={{ labels: wave?.samples.map((_,i)=>(i/wave.sampleRate).toFixed(2)) ?? [], datasets:[{label:'Signal',data:wave?.samples ?? [],borderColor:'#d94865',pointRadius:0,borderWidth:1.5}] }}/></div><small>Time (seconds) · relative sensor amplitude</small></section>
    <section><h2>BPM history</h2><p>Latest 120 readings (approximately 10 minutes at 5-second intervals)</p><div className="plot"><Line options={options} data={{labels:rates.map(r=>clock(r.timestamp)),datasets:[{label:'BPM',data:rates.map(r=>r.valid && r.bpm>0?r.bpm:null),borderColor:'#267b85',pointRadius:2,borderWidth:2}]}}/></div></section><footer>Educational optical pulse monitor · Not a medical device</footer></main>;
}
