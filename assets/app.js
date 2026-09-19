(function(){
  const KEY='mera_loan_plan_v6';
  const blank={banks:[],apps:[],others:[],income:[],expenses:[],settings:{emergencyFund:0}};
  function normalize(raw){
    const s=Object.assign({},blank,raw||{});
    ['banks','apps','others','income','expenses'].forEach(k=>{if(!Array.isArray(s[k]))s[k]=[]});
    if(!s.settings||typeof s.settings!=='object')s.settings={emergencyFund:0};
    return s;
  }
  function load(){try{return normalize(JSON.parse(localStorage.getItem(KEY)||'null'))}catch(e){return normalize()}}
  function save(s){localStorage.setItem(KEY,JSON.stringify(normalize(s)));return s}
  function id(){return 'L'+Date.now().toString(36)+Math.random().toString(36).slice(2,7)}
  function num(v){const n=Number(v);return Number.isFinite(n)&&n>0?n:0}
  function money(v){return '₹'+Math.round(num(v)).toLocaleString('en-IN')}
  function loans(s){return [{key:'banks',items:s.banks},{key:'apps',items:s.apps},{key:'others',items:s.others}].flatMap(g=>g.items.map((x,i)=>Object.assign({},x,{_key:g.key,_index:i}))) }
  function current(x){return num(x.balance)}
  function actualBalance(x){return num(x.bankActualBalance||x.actualForeclosure)}
  function selected(x){return actualBalance(x)>0?actualBalance(x):current(x)}
  function emi(x){return num(x.emi||x.monthlyPayment)}
  function months(x){return num(x.months||x.remainingMonths)}
  function rate(x){return num(x.rate)}
  function emiTotal(s){return loans(s).reduce((a,x)=>a+emi(x),0)}
  function currentTotal(s){return loans(s).reduce((a,x)=>a+selected(x),0)}
  function closeTotal(s){return loans(s).reduce((a,x)=>a+selected(x),0)}
  function futureTotal(s){return loans(s).reduce((a,x)=>a+(months(x)?emi(x)*months(x):selected(x)),0)}
  function incomeTotal(s){return s.income.reduce((a,x)=>a+num(x.amount),0)}
  function expenseOnlyTotal(s){return s.expenses.reduce((a,x)=>a+num(x.amount),0)}
  function expenseTotal(s){return expenseOnlyTotal(s)+emiTotal(s)}
  function surplus(s){return incomeTotal(s)-expenseTotal(s)}
  function endDate(x){
    if(x.endDate)return new Date(x.endDate+'T12:00:00');
    const m=months(x); if(!m)return null; const d=new Date(); d.setMonth(d.getMonth()+m); return d;
  }
  function dateText(v){if(!v)return '—'; const d=v instanceof Date?v:new Date(v+'T12:00:00'); if(isNaN(d))return '—'; return d.toLocaleDateString('hi-IN',{day:'2-digit',month:'short',year:'numeric'})}
  function dueText(x){
    if(x.emiDueDay)return 'हर माह '+String(x.emiDueDay)+' तारीख';
    if(x.dueDate)return dateText(x.dueDate);
    return 'तारीख दर्ज नहीं';
  }
  function esc(v){return String(v??'').replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]))}
  function loanTypeLabel(x){return x.loanType||x._type||'Loan'}
  function loanCard(x){
    const calc=current(x), actual=actualBalance(x), final=selected(x), future=emi(x)*months(x), hasActual=actual>0;
    const cls=(x.loanType||'loan').toLowerCase().replace(/\s+/g,'-');
    return `<article class="loan-card compact-loan" data-id="${x.id}">
      <div class="loan-summary-row"><div class="loan-main"><span class="pill ${cls}">${esc(loanTypeLabel(x))}</span><h3>${esc(x.name||'Loan')}</h3><div class="loan-mini"><span>💰 ${money(final)}</span><span>💳 ${money(emi(x))}/माह</span><span>📅 ${dateText(endDate(x))}</span></div></div><div class="loan-actions"><button class="icon-btn edit" data-key="${x._key}" data-id="${x.id}" title="Edit">✏️</button><button class="icon-btn danger del" data-key="${x._key}" data-id="${x.id}" title="Delete">🗑️</button></div></div>
      <details class="loan-details"><summary>विस्तृत विवरण देखें</summary>
        <div class="amount-grid"><div><small>${hasActual?'Bank Actual Balance':'App Estimated Balance'}</small><strong>${money(final)}</strong></div><div><small>EMI / Month</small><strong>${money(emi(x))}</strong></div><div><small>Months Left</small><strong>${months(x)||'—'}</strong></div></div>
        <div class="loan-meta"><span>🗓️ EMI: <b>${esc(dueText(x))}</b></span><span>🏁 End: <b>${dateText(endDate(x))}</b></span><span>💹 Interest: <b>${rate(x)?rate(x)+'%':'—'}</b></span></div>
        <div class="compare compact-compare">
          ${hasActual?`<div class="actual-only"><span>🏦 Bank Actual Remaining</span><b>${money(actual)}</b></div>`:`<div class="estimated-only"><span>🧮 अनुमानित Remaining</span><b>${money(calc)}</b><small>Bank का actual amount भरते ही यह reference अपने-आप हट जाएगा।</small></div>`}
          <div class="final"><span>✅ Planning में उपयोग</span><b>${money(final)}</b></div>
          <div class="mini">📅 EMI जारी रखने पर अनुमानित कुल भुगतान: <b>${money(future)}</b></div><div class="payment-box"><b>💸 वास्तविक Payment दर्ज करें</b><div class="payment-row"><input class="pay-amount" type="number" min="0" placeholder="₹ amount"><input class="pay-date" type="date"><button class="pay-btn" data-key="${x._key}" data-id="${x.id}">Save</button></div></div>
        </div>
      </details>
    </article>`;
  }
  function calcLoanMonths(balance, payment, annualRate, extra){
    balance=num(balance); payment=num(payment)+num(extra); annualRate=num(annualRate);
    if(balance<=0)return 0; if(payment<=0)return Infinity;
    const r=annualRate/100/12;
    if(r<=0)return Math.ceil(balance/payment);
    if(payment<=balance*r)return Infinity;
    return Math.ceil(-Math.log(1-(balance*r/payment))/Math.log(1+r));
  }
  function calcLoanPayoffDate(x, extra){const m=calcLoanMonths(selected(x),emi(x),rate(x),extra);if(!isFinite(m))return null;const d=new Date();d.setMonth(d.getMonth()+m);return d}
  function simulateRollOver(s, targetId, monthlyExtra, emergency){
    const items=loans(s).map(x=>({id:x.id,balance:selected(x),emi:emi(x),rate:rate(x),name:x.name,loanType:loanTypeLabel(x),months:months(x)}));
    let available=Math.max(0,num(monthlyExtra));
    const target=items.find(x=>x.id===targetId);
    if(target)target.extra=available;
    let totalMonths=0, freed=0, safety=0;
    while(items.some(x=>x.balance>0.5)&&safety<2400){
      safety++; totalMonths++;
      let paidAny=false;
      items.forEach(x=>{if(x.balance<=0)return; const interest=x.rate>0?x.balance*x.rate/100/12:0; let pay=x.emi+(x.id===targetId?available:0)+freed; pay=Math.min(pay,x.balance+interest); x.balance=Math.max(0,x.balance-(pay-interest)); if(x.balance<=0.5){x.balance=0; freed+=x.emi+(x.id===targetId?available:0); if(x.id===targetId)available=0;} paidAny=true;});
      if(!paidAny)break;
    }
    return {months:totalMonths,freed,items};
  }
  window.LP={KEY,load,save,id,num,money,loans,current,actualBalance,selected,emi,months,rate,emiTotal,currentTotal,closeTotal,futureTotal,incomeTotal,expenseOnlyTotal,expenseTotal,surplus,endDate,dateText,dueText,esc,loanCard,calcLoanMonths,calcLoanPayoffDate,simulateRollOver};
  window.addEventListener('storage',()=>{if(location.pathname.endsWith('index.html')||location.pathname.endsWith('/'))location.reload()});
})();
