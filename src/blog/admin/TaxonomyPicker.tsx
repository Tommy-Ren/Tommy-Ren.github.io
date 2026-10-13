import { useEffect, useRef, useState } from 'react';
import { Check, ChevronDown, Plus, X } from 'lucide-react';
import { getBlogClient, termLabel, translateTerm, type BlogTerm } from '../backend';
import { useLocale } from '../../i18n/Locale';
import { useAccount } from '../Community';

export default function TaxonomyPicker({kind,values,onChange}:{kind:'category'|'tag';values:string[];onChange:(values:string[])=>void}) {
 const {locale}=useLocale(),zh=locale==='zh', {isAdmin}=useAccount();
 const [open,setOpen]=useState(false),[options,setOptions]=useState<BlogTerm[]>([]),[creating,setCreating]=useState(false),[name,setName]=useState(''),[source,setSource]=useState<'en'|'zh'>(locale),[error,setError]=useState(''),[busy,setBusy]=useState(false);
 const root=useRef<HTMLDivElement>(null);
 const refresh=async()=>{const result=await getBlogClient()?.from('blog_terms').select('*').eq('kind',kind).order('name');if(result?.error)throw result.error;const terms=(result?.data||[]) as BlogTerm[];setOptions(terms);return terms;};
 const dismiss=()=>{setOpen(false);setCreating(false);setName('');};
 useEffect(()=>{let live=true;void getBlogClient()?.from('blog_terms').select('*').eq('kind',kind).order('name').then(({data,error})=>{if(live){if(error)setError(zh?'选项加载失败':'Unable to load options');else setOptions(data||[]);}});return()=>{live=false;};},[kind,zh]);
 useEffect(()=>{const close=(e:PointerEvent)=>{if(!root.current?.contains(e.target as Node)){setOpen(false);setCreating(false);setName('');}};document.addEventListener('pointerdown',close);return()=>document.removeEventListener('pointerdown',close);},[]);
 const choose=(value:string)=>{setCreating(false);setName('');setError('');if(kind==='category'){onChange([value]);setOpen(false);}else if(values.includes(value))onChange(values.filter(v=>v!==value));else if(values.length<12)onChange([...values,value]);};
 const label=(value:string)=>{const term=options.find(t=>t.name===value);return term?termLabel(term,locale):value;};
 const create=async()=>{
  if(!isAdmin||busy)return;const value=name.trim();if(!value||value.length>40||/[\u0000-\u001f\u007f,，]/.test(value)){setError(zh?'请输入 1–40 个字符，不含逗号。':'Use 1–40 characters, without commas.');return;}
  const client=getBlogClient();if(!client)return;setBusy(true);setError('');
  try{const result=await client.from('blog_terms').insert({kind,name:value,source_language:source});if(result.error&&result.error.code!=='23505')throw result.error;choose(value);await refresh();await translateTerm(client,kind,value);await refresh();}
  catch(cause){setError(cause instanceof Error?cause.message:(zh?'操作失败，请重试。':'Please retry.'));}finally{setBusy(false);}
 };
 const translateMissing=async()=>{const client=getBlogClient();if(!client||!isAdmin||busy)return;setBusy(true);setError('');try{for(const term of options.filter(t=>!t.name_en||!t.name_zh))await translateTerm(client,kind,term.name);await refresh();}catch(cause){setError(cause instanceof Error?cause.message:'Translation failed.');}finally{setBusy(false);}};
 return <div className="community-terms" ref={root} onKeyDown={e=>{if(e.key==='Escape'){e.preventDefault();dismiss();root.current?.querySelector('button')?.focus();}}}>
  <button type="button" className="community-terms-trigger" aria-expanded={open} aria-label={kind==='category'?(zh?'选择分类':'Choose category'):(zh?'选择标签':'Choose tags')} onClick={()=>{if(open)dismiss();else setOpen(true);}}><span>{values.filter(Boolean).map(label).join(' · ')||(zh?'请选择…':'Choose…')}</span><ChevronDown size={16}/></button>
  {open&&<div className="community-terms-popup">{options.map(term=><button type="button" key={term.name} aria-pressed={values.includes(term.name)} onClick={()=>choose(term.name)}>{termLabel(term,locale)}{values.includes(term.name)&&<Check size={14}/>}</button>)}
   {!options.length&&<p>{zh?'暂无选项，请联系管理员添加。':'No options yet. Ask the administrator to add one.'}</p>}
   {isAdmin&&<><button type="button" className="community-term-create-toggle" onClick={()=>{setCreating(v=>!v);setName('');setError('');}}><Plus size={15}/>{kind==='category'?(zh?'创建新的分类':'Create new category'):(zh?'创建新的标签':'Create new tag')}</button>
   {creating&&<div className="community-create-term"><label>{zh?'原文语言':'Source language'}<select value={source} onChange={e=>setSource(e.target.value as 'en'|'zh')}><option value="en">English</option><option value="zh">中文</option></select></label><input aria-label={zh?'新名称':'New name'} value={name} maxLength={40} onChange={e=>setName(e.target.value)} onKeyDown={e=>{if(e.key==='Enter'){e.preventDefault();void create();}}}/><small>{zh?'创建后自动用 DeepL 翻译为另一种语言。':'DeepL translates the new name into the other language.'}</small><div><button type="button" disabled={busy} onClick={()=>void create()}>{busy?'…':zh?'创建':'Create'}</button><button type="button" aria-label={zh?'取消创建':'Cancel creation'} onClick={()=>{setCreating(false);setName('');}}><X size={14}/>{zh?'取消':'Cancel'}</button></div></div>}
   {options.some(t=>!t.name_en||!t.name_zh)&&<button type="button" disabled={busy} onClick={()=>void translateMissing()}>{busy?(zh?'翻译中…':'Translating…'):(zh?'DeepL 翻译未翻译的名称':'Translate missing names with DeepL')}</button>}</>}
  </div>}{error&&<p className="community-term-error" role="alert">{error}</p>}
 </div>;
}
