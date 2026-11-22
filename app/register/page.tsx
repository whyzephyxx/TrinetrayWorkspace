'use client';
import { useState } from 'react';
import { createUserWithEmailAndPassword, sendEmailVerification, updateProfile } from 'firebase/auth';
import { firebaseAuth } from '@/lib/firebase';
import { ArrowRight, Eye, EyeOff, ShieldCheck } from 'lucide-react';
import Link from 'next/link';

function strength(value:string){let score=0;if(value.length>=8)score++;if(/[A-Z]/.test(value))score++;if(/[a-z]/.test(value))score++;if(/[0-9]/.test(value))score++;if(/[^A-Za-z0-9]/.test(value))score++;return score;}
export default function RegisterPage(){
 const [name,setName]=useState(''),[mobile,setMobile]=useState(''),[email,setEmail]=useState(''),[password,setPassword]=useState(''),[show,setShow]=useState(false),[busy,setBusy]=useState(false),[error,setError]=useState(''),[sent,setSent]=useState(false);
 const score=strength(password);
 async function submit(e:React.FormEvent){e.preventDefault();setError('');setBusy(true);try{
  const check=await fetch('/api/auth/eligibility',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({email})});
  const result=await check.json();if(!check.ok||!result.eligible)throw new Error('This email is not eligible for workspace registration.');
  const credential=await createUserWithEmailAndPassword(firebaseAuth,email.trim(),password);
  await updateProfile(credential.user,{displayName:name.trim()});
  await sendEmailVerification(credential.user);
  sessionStorage.setItem('workspace-registration',JSON.stringify({fullName:name.trim(),mobileNumber:mobile.trim()}));
  setSent(true);
 }catch(err){setError(err instanceof Error?err.message:'Unable to create your account. Please try again.');}finally{setBusy(false);}}
 return <main className="auth-shell"><section className="auth-aside"><div className="brand"><div className="brand-mark">T</div><span>Trinetray <b>Workspace</b></span></div><div className="aside-copy"><div className="eyebrow">GET STARTED</div><h1>Your work,<br/><em>well connected.</em></h1><p>Create an account with an invited work email to request workspace access.</p></div><div className="aside-footer"><ShieldCheck size={16}/> Invitation-only registration</div></section><section className="auth-main"><form className="auth-card" onSubmit={submit}><div className="mobile-brand"><div className="brand-mark">T</div><b>Trinetray Workspace</b></div>{sent?<><div className="eyebrow">VERIFY YOUR EMAIL</div><h2>Check your inbox</h2><p className="muted">We sent a verification link to <b>{email}</b>. Verify it, then return to sign in. Your profile details will be completed during your first verified sign-in.</p><Link className="primary-button full" href="/login">Continue to sign in</Link></>:<><div className="eyebrow">INVITED EMPLOYEE</div><h2>Create your account</h2><p className="muted">Use the email address that was added to the access list.</p>
 <label>Full name<input required maxLength={120} value={name} onChange={e=>setName(e.target.value)} placeholder="Your full name"/></label>
 <label>Mobile number<input required type="tel" value={mobile} onChange={e=>setMobile(e.target.value)} placeholder="+91 98765 43210"/></label>
 <label>Work email<input required type="email" value={email} onChange={e=>setEmail(e.target.value)} placeholder="name@company.com"/></label>
 <label>Password<div className="password-wrap"><input required minLength={8} type={show?'text':'password'} value={password} onChange={e=>setPassword(e.target.value)} placeholder="Create a strong password"/><button type="button" className="icon-button" onClick={()=>setShow(!show)}>{show?<EyeOff size={17}/>:<Eye size={17}/>}</button></div><div className="strength-feed">{[1,2,3,4,5].map(n=><i key={n} className={score>=n?'filled':''}/>)}<span>{password.length===0?'Password strength':score<3?'Add more variety':score<5?'Good strength':'Strong password'}</span></div></label>
 {error&&<div className="form-error" role="alert">{error}</div>}<button className="primary-button full" disabled={busy}>{busy?'Creating account…':<>Create account <ArrowRight size={17}/></>}</button><div className="auth-links"><span>Already registered?</span><Link href="/login">Sign in</Link></div></>}</form></section></main>;
}
