import { useEffect, useState, createContext, useContext } from 'react';
import { NavLink, Navigate, Route, Routes, useNavigate } from 'react-router-dom';
import { App as NativeApp } from '@capacitor/app';
import { Capacitor } from '@capacitor/core';
import { Activity, ClipboardList, LayoutDashboard, Send, Settings2 } from 'lucide-react';
import { api, fixturesEnabled, getOrigin, setOrigin } from './lib/api';
import { message } from './lib/utils';
import { Button } from './components/ui/button';
import { Dialog, DialogContent, DialogTrigger } from './components/ui/dialog';
import ReportPage from './pages/report';
import DashboardPage from './pages/dashboard';
import QueuePage from './pages/queue';
import { initializeSharing } from './lib/mesh';
interface Connection { online: boolean; setOnline: (value: boolean) => void; refresh: number; changed: () => void; citizen: boolean }
const ConnectionContext = createContext<Connection>(null!);
export const useConnection = () => useContext(ConnectionContext);
function ConnectionSettings() {
  const { changed, citizen } = useConnection();
  const [origin, editOrigin] = useState(getOrigin()); const [result, setResult] = useState(''); const [busy, setBusy] = useState(false);
  async function test() {
    setBusy(true); setResult('');
    try { setOrigin(origin); const health = await api.health(); changed(); setResult(citizen ? 'Connected to the response team.' : `API reachable · ${health.ai_mode} mode · ${health.model_id ?? 'model not configured'}. Health does not confirm inference.`); }
    catch (error) { setResult(citizen ? 'Could not connect. Check the address with your team. Saved reports stay on this phone.' : message(error)); } finally { setBusy(false); }
  }
  return <Dialog><DialogTrigger asChild><Button variant="ghost" aria-label="Connection settings"><Settings2 size={19}/><span className="desktop-label">Connection</span></Button></DialogTrigger>
    <DialogContent title={citizen ? 'Connect to your team' : 'Connection settings'} description={citizen ? 'Your response team will give you the address to use.' : 'Connect this browser to the response service.'}>
      <label>{citizen ? 'Team address' : 'Backend origin'}<input type="url" value={origin} placeholder="https://your-team.example.com" onChange={e => editOrigin(e.target.value)}/></label>
      <p className="muted">{citizen ? 'Without a connection, your report stays safe on this phone. You can also share it with nearby phones.' : 'Leave blank to use the service hosting this website. Use a trusted service address for a separate backend.'}</p>
      <Button onClick={test} disabled={busy}>{busy ? 'Testing…' : 'Save & test connection'}</Button><p role="status">{result}</p>
    </DialogContent></Dialog>;
}
const citizenNavigation = [{ to: '/report', label: 'Report', icon: Send }, { to: '/queue', label: 'My reports', icon: ClipboardList }];
export default function App() {
  const citizen = Capacitor.isNativePlatform() || import.meta.env.VITE_APP_MODE === 'citizen';
  const home = citizen ? '/report' : '/dashboard';
  const [online, setOnline] = useState(true); const [refresh, setRefresh] = useState(0); const navigate = useNavigate();
  useEffect(()=>{let dispose:(()=>void)|undefined;let mounted=true;void initializeSharing().then(stop=>{if(mounted)dispose=stop;else stop();});return()=>{mounted=false;dispose?.();};},[]);
  useEffect(()=>{const changed=()=>setRefresh(n=>n+1);window.addEventListener('reliefmesh-queue',changed);return()=>window.removeEventListener('reliefmesh-queue',changed);},[]);
  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;
    const listener = NativeApp.addListener('backButton', ({ canGoBack }) => {
      if (document.querySelector('[role="dialog"]')) document.dispatchEvent(new KeyboardEvent('keydown', { key:'Escape',bubbles:true }));
      else if (canGoBack) navigate(-1); else navigate('/report');
    });
    return () => { void listener.then(handle => handle.remove()); };
  }, [navigate]);
  return <ConnectionContext.Provider value={{ online, setOnline, refresh, citizen, changed: () => setRefresh(n => n + 1) }}><div className={`app-shell ${citizen ? 'citizen-shell' : 'responder-shell'}`}>
    {!citizen && <>
    <aside className="sidebar"><NavLink to="/dashboard" className="brand"><span className="brand-mark"><Activity size={23}/></span><span>ReliefMesh<small>COMMUNITY RESPONSE</small></span></NavLink>
      <div className="nav-heading">RESPONDER WORKSPACE</div><nav aria-label="Main navigation"><NavLink to="/dashboard"><LayoutDashboard size={19}/>Dashboard</NavLink></nav>
      <div className="sidebar-foot"><span className="status-dot"/>Human decisions.<br/>Connected communities.<p>Local response prototype</p></div>
    </aside></>}
    <div className="workspace"><header className="topbar"><span className="breadcrumb">Response workspace <span>/</span> ReliefMesh</span><span className="mobile-brand"><Activity size={22}/> ReliefMesh</span>
      <div className="topbar-actions"><ConnectionSettings/></div>
    </header>
    {fixturesEnabled && <div className="fixture-banner">{citizen ? 'Demo preview · sample reports' : 'Development fixtures · illustrative sources · no live AI or semantic matching · fixture changes reset on reload'}</div>}
    <main><Routes>{citizen ? <><Route path="/report" element={<ReportPage/>}/><Route path="/queue" element={<QueuePage/>}/></> : <Route path="/dashboard" element={<DashboardPage/>}/>}<Route path="*" element={<Navigate to={home} replace/>}/></Routes></main>
    <footer className="workspace-footer">{citizen ? 'Every report is reviewed by a person.' : <>Human review required for AI suggestions <span>Simulated hub · no production authentication</span></>}</footer></div>
    {citizen && <nav className="bottom-nav" aria-label="Mobile navigation">{citizenNavigation.map(({ to, label, icon: Icon }) => <NavLink key={to} to={to}><Icon size={21}/>{label}</NavLink>)}</nav>}
  </div></ConnectionContext.Provider>;
}
