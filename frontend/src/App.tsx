import { useEffect, useState, createContext, useContext } from 'react';
import { NavLink, Navigate, Route, Routes, useNavigate } from 'react-router-dom';
import { App as NativeApp } from '@capacitor/app';
import { Capacitor } from '@capacitor/core';
import { Activity, ArrowUpRight, ClipboardList, LayoutDashboard, Radio, Settings2, Wifi, WifiOff } from 'lucide-react';
import { api, fixturesEnabled, getOrigin, setOrigin } from './lib/api';
import { message } from './lib/utils';
import { Button } from './components/ui/button';
import { Dialog, DialogContent, DialogTrigger } from './components/ui/dialog';
import ReportPage from './pages/report';
import DashboardPage from './pages/dashboard';
import QueuePage from './pages/queue';
import { initializeSharing } from './lib/mesh';
interface Connection { online: boolean; setOnline: (value: boolean) => void; refresh: number; changed: () => void }
const ConnectionContext = createContext<Connection>(null!);
export const useConnection = () => useContext(ConnectionContext);
function ConnectionSettings() {
  const { changed } = useConnection();
  const [origin, editOrigin] = useState(getOrigin()); const [result, setResult] = useState(''); const [busy, setBusy] = useState(false);
  async function test() {
    setBusy(true); setResult('');
    try { setOrigin(origin); const health = await api.health(); changed(); setResult(`API reachable · ${health.ai_mode} mode · ${health.model_id ?? 'model not configured'}. Health does not confirm inference.`); }
    catch (error) { setResult(message(error)); } finally { setBusy(false); }
  }
  return <Dialog><DialogTrigger asChild><Button variant="ghost" aria-label="Connection settings"><Settings2 size={19}/><span className="desktop-label">Connection</span></Button></DialogTrigger>
    <DialogContent title="Connection settings" description="Connect this device to the laptop API or a trusted demo host.">
      <label>Backend origin<input type="url" value={origin} placeholder="http://192.168.1.20:8000" onChange={e => editOrigin(e.target.value)}/></label>
      <p className="muted">Use the laptop’s LAN address for a phone, or 10.0.2.2:8000 for the Android emulator. Leave blank for the browser development proxy. Phone localhost refers to the phone.</p>
      <Button onClick={test} disabled={busy}>{busy ? 'Testing…' : 'Save & test connection'}</Button><p role="status">{result}</p>
    </DialogContent></Dialog>;
}
const navigation = [{ to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard }, { to: '/report', label: 'Report', icon: ClipboardList }, { to: '/queue', label: 'Queue', icon: Radio }];
export default function App() {
  const [online, setOnline] = useState(true); const [refresh, setRefresh] = useState(0); const navigate = useNavigate();
  useEffect(()=>{let dispose:(()=>void)|undefined;let mounted=true;void initializeSharing().then(stop=>{if(mounted)dispose=stop;else stop();});return()=>{mounted=false;dispose?.();};},[]);
  useEffect(()=>{const changed=()=>setRefresh(n=>n+1);window.addEventListener('reliefmesh-queue',changed);return()=>window.removeEventListener('reliefmesh-queue',changed);},[]);
  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;
    const listener = NativeApp.addListener('backButton', ({ canGoBack }) => {
      if (document.querySelector('[role="dialog"]')) document.dispatchEvent(new KeyboardEvent('keydown', { key:'Escape',bubbles:true }));
      else if (canGoBack) navigate(-1); else navigate('/dashboard');
    });
    return () => { void listener.then(handle => handle.remove()); };
  }, [navigate]);
  return <ConnectionContext.Provider value={{ online, setOnline, refresh, changed: () => setRefresh(n => n + 1) }}><div className="app-shell">
    <aside className="sidebar"><NavLink to="/dashboard" className="brand"><span className="brand-mark"><Activity size={23}/></span><span>ReliefMesh<small>COMMUNITY RESPONSE</small></span></NavLink>
      <div className="nav-heading">WORKSPACE</div><nav aria-label="Main navigation">{navigation.map(({ to, label, icon: Icon }) => <NavLink key={to} to={to}><Icon size={19}/>{label}</NavLink>)}</nav>
      <div className="sidebar-foot"><span className="status-dot"/>Human decisions.<br/>Connected communities.<p>Local response prototype</p></div>
    </aside>
    <div className="workspace"><header className="topbar"><span className="breadcrumb">Response workspace <span>/</span> ReliefMesh</span><span className="mobile-brand"><Activity size={22}/> ReliefMesh</span>
      <div className="topbar-actions"><span className={`connection-badge ${online ? '' : 'amber'}`}>{online ? <Wifi size={14}/> : <WifiOff size={14}/>}<span>{online ? 'Transport online' : 'Transport offline'}</span></span><ConnectionSettings/><Button asChild className="desktop-label"><NavLink to="/report">New report <ArrowUpRight size={17}/></NavLink></Button></div>
    </header>
    {fixturesEnabled && <div className="fixture-banner">Development fixtures · illustrative sources · no live AI or semantic matching · fixture changes reset on reload</div>}
    <main><Routes><Route path="/" element={<Navigate to="/dashboard" replace/>}/><Route path="/dashboard" element={<DashboardPage/>}/><Route path="/report" element={<ReportPage/>}/><Route path="/queue" element={<QueuePage/>}/><Route path="*" element={<Navigate to="/dashboard" replace/>}/></Routes></main>
    <footer className="workspace-footer">Human review required for AI suggestions <span>Simulated hub · no production authentication</span></footer></div>
    <nav className="bottom-nav" aria-label="Mobile navigation">{navigation.map(({ to, label, icon: Icon }) => <NavLink key={to} to={to}><Icon size={21}/>{label}</NavLink>)}</nav>
  </div></ConnectionContext.Provider>;
}
