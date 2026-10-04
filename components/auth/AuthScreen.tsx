'use client';

import { useState, type FormEvent } from 'react';
import { ArrowRight, Check, Sigma } from 'lucide-react';
import { supabase } from '@/lib/supabase/client';

export default function AuthScreen() {
 const [email,setEmail]=useState('');
 const [message,setMessage]=useState('');
 const [error,setError]=useState('');
 const [sending,setSending]=useState(false);
 const submit=async(event:FormEvent<HTMLFormElement>)=>{
  event.preventDefault();
  if(!supabase){setError('Cloud sync is not configured. Add the Supabase URL and publishable key to continue.');return;}
  setSending(true);setError('');setMessage('');
  const {error}=await supabase.auth.signInWithOtp({email:email.trim(),options:{emailRedirectTo:window.location.origin}});
  setSending(false);
  if(error){setError(error.message);return;}
  setMessage('Check your inbox for a secure sign-in link.');
 };
 return <main className="auth-screen"><div className="auth-brand"><span className="brand-mark"><Sigma size={19}/></span><span>lemma</span></div><section className="auth-panel"><span className="auth-eyebrow">YOUR CS STUDY SPACE</span><h1>Pick up where<br/>your thinking left off.</h1><p>Your notes, classes, and pages stay yours and follow you between sessions.</p><form onSubmit={submit}><label htmlFor="auth-email">University or personal email</label><div className="auth-input"><input id="auth-email" type="email" autoComplete="email" required value={email} onChange={event=>setEmail(event.target.value)} placeholder="you@university.edu"/><button type="submit" disabled={sending}>{sending?'Sending…':<>Continue <ArrowRight size={16}/></>}</button></div></form>{message&&<div className="auth-message"><Check size={15}/>{message}</div>}{error&&<p className="auth-error" role="alert">{error}</p>}<small>No password to remember. We’ll email you a one-time sign-in link.</small></section><div className="auth-equation" aria-hidden="true"><span>∑</span><span>f : X → Y</span><span>∫<sub>a</sub><sup>b</sup> f(x) dx</span><span>O(n log n)</span><span>∇ × E = −∂B/∂t</span></div><footer>Made for the work between lectures.</footer></main>;
}
