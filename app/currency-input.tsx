"use client";
import { useState } from 'react';
export default function CurrencyInput({name,label,initialValue='',value,onValueChange,required=false}:{name:string;label:string;initialValue?:string|number;value?:string;onValueChange?:(value:string)=>void;required?:boolean}) {
  const [local,setLocal]=useState(String(initialValue));
  const canonical=value??local;
  const amount=canonical===''?null:Number(canonical);
  const display=amount===null?'':amount.toLocaleString('pt-BR',{minimumFractionDigits:2,maximumFractionDigits:2});
  return <div className="field"><label htmlFor={name}>{label}</label><div className="currency-control"><span aria-hidden="true">R$</span><input id={name} type="text" inputMode="numeric" autoComplete="off" placeholder="0,00" value={display} required={required} onChange={event=>{
    const input=event.target.value;if(/[-a-z]/i.test(input.replace(/^R\$\s*/,'')))return;
    const digits=input.replace(/\D/g,'');if(digits.length>12)return;
    const next=digits===''?'':(Number(digits)/100).toFixed(2);
    if(onValueChange)onValueChange(next);else setLocal(next);
  }}/></div>{!onValueChange&&<input type="hidden" name={name} value={canonical}/>}</div>;
}
