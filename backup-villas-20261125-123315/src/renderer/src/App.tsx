import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import './styles/app.css'
import Villas from './Villas'

type User = { id: number; full_name: string; email: string; role: string }
const assets = import.meta.glob('./assets/*', { eager: true, query: '?url', import: 'default' }) as Record<string,string>
const logo = assets['./assets/itqan-logo.png']
const villa = assets['./assets/layan-villa.jpg']
const pages = [['Dashboard','الرئيسية'],['Villas','الفلل'],['Owners & Residents','الملاك والسكان'],['Violations','المخالفات'],['Maintenance','الصيانة'],['Services','الخدمات'],['Payments','المدفوعات'],['Reports','التقارير'],['Users','المستخدمون'],['Settings','الإعدادات']]
export default function App(): React.JSX.Element {
 const [ar,A] = useState(localStorage.getItem('language') === 'ar')
 const [dark,D] = useState(localStorage.getItem('theme') === 'dark')
 const [setup,S] = useState<boolean|null>(null)
 const [user,U] = useState<User|null>(null)
 const [name,N] = useState(''), [email,E] = useState(''), [password,P] = useState('')
 const [error,X] = useState(''), [notice,M] = useState(''), [busy,B] = useState(false), [page,Q] = useState(0)
 const t = (en:string, arabic:string):string => ar ? arabic : en
 useEffect(() => { Promise.resolve().then(() => window.api.auth.needsSetup()).then(S).catch(e => X(String(e))) }, [])
 useEffect(() => { localStorage.setItem('language',ar?'ar':'en'); localStorage.setItem('theme',dark?'dark':'light') },[ar,dark])
 async function submit(e:FormEvent):Promise<void> {
  e.preventDefault(); B(true); X(''); M('')
  try { if(setup) { await window.api.auth.setup({name,email,password}); S(false); P(''); M(t('Account created. Sign in.','تم إنشاء الحساب. سجل الدخول.')) } else { const r=await window.api.auth.login({email,password}); if(r.success && r.user){U(r.user); P(''); Q(1)} else X(r.message==='locked'?t('Try again in one minute','حاول بعد دقيقة'):t('Invalid credentials','بيانات الدخول غير صحيحة')) } } catch(e){X(String(e))} finally{B(false)}
 }
 const controls=<div className="controls"><button onClick={()=>A(!ar)}>{ar?'English':'العربية'}</button><button onClick={()=>D(!dark)}>{dark?'☀':'☾'}</button></div>
 const cover= villa ? {backgroundImage:`linear-gradient(0deg,#000b,#0003),url("${villa}")`} : undefined
 return <div className={'app '+(dark?'dark':'')} dir={ar?'rtl':'ltr'}>{!user?<div className="login"><section className="cover" style={cover}><small>ITQAN PROJECT MANAGEMENT</small><div><h1>LAYAN</h1><p>{t("Engineering & Property Management","الإدارة الهندسية وإدارة العقارات")}</p><small className="secure">{t("Secure local workspace","نظام محلي آمن")}</small></div></section><section className="loginpanel">{controls}<form onSubmit={submit}>{logo?<img className="logo" src={logo} alt="ITQAN"/>:<h1 className="brand">ITQAN</h1>}<h2>{setup?t('Create Administrator','إنشاء حساب المسؤول'):t('Welcome back','مرحباً بعودتك')}</h2><p className="subtitle">{setup?t("First-time setup","إعداد النظام لأول مرة"):t("Sign in to your engineering workspace","سجل الدخول إلى نظام الإدارة الهندسية")}</p>{setup===null?<p>{error||t('Connecting to database…','جاري الاتصال بقاعدة البيانات…')}</p>:<>{setup&&<label>{t('Full name','الاسم بالكامل')}<input required value={name} onChange={e=>N(e.target.value)}/></label>}<label>{t('Email address','البريد الإلكتروني')}<input type="email" placeholder="name@itqanpm.com" required value={email} onChange={e=>E(e.target.value)}/></label><label>{t('Password','كلمة المرور')}<input type="password" placeholder="••••••••••" required minLength={setup?10:undefined} value={password} onChange={e=>P(e.target.value)}/></label>{error&&<p className="error">{error}</p>}{notice&&<p>{notice}</p>}<button className="primary" disabled={busy}>{busy?'…':setup?t('Create account','إنشاء الحساب'):t('Sign in','تسجيل الدخول')}</button></>}<div className="offline"><i/> {t("Offline · Version 1.0.0","محلي · الإصدار 1.0.0")}</div></form></section></div>:<div className="desktop ref-desktop"><aside><div className="ref-brand"><svg viewBox="0 0 48 48" width="48" height="48"><path d="M38 8 A19 19 0 1 0 38 40" fill="none" stroke="#f04b23" strokeWidth="5"/><circle cx="38" cy="7" r="4" fill="#8bd438"/></svg><b>ITQAN</b></div><div className="ref-layan">LAYAN</div><nav>{pages.map((p,i)=><button key={i} className={page===i?'active':''} onClick={()=>{Q(i)}}>{p[ar?1:0]}</button>)}</nav><button className="ref-logout" onClick={async()=>{try{await window.api.auth.logout();U(null);X('')}catch(e){X(String(e))}}}>{t('Logout','تسجيل الخروج')}</button><small>ITQAN Engineering</small></aside><main><header><span>ITQAN / LAYAN</span><div className="ref-header-right">{controls}<span className="ref-offline"><i/>Offline</span><span className="ref-avatar" title={user.full_name}>AD</span></div></header><div className="ref-content">{error&&<p className="error">{error}</p>}{page===1?<Villas ar={ar} role={user.role}/>:page===0?<><h1>{t('Dashboard','الرئيسية')}</h1><section className="hero" style={cover}><h1>LAYAN Residence</h1></section></>:<section className="panel">{pages[page][ar?1:0]} — {t('Module not connected yet','لم يتم ربط القسم بعد')}</section>}<footer>ITQAN LAYAN · Local Management System</footer></div></main></div>}</div>
}
