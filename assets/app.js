(function(){
  const KEY='mera_loan_plan_v6';
  const blank={banks:[],apps:[],others:[],income:[],expenses:[]};
  function normalize(raw){const s=Object.assign({},blank,raw||{}); ['banks','apps','others','income','expenses'].forEach(k=>{if(!Array.isArray(s[k]))s[k]=[]}); return s;}
  function load(){try{return normalize(JSON.parse(localStorage.getItem(KEY)||'null'))}catch(e){return normalize()}}
  function save(s){localStorage.setItem(KEY,JSON.stringify(normalize(s))); return s}
  function id(){return 'L'+Date.now().toString(36)+Math.random().toString(36).slice(2,7)}
  function num(v){const n=Number(v);return Number.isFinite(n)&&n>0?n:0}
  function money(v){return '₹'+Math.round(num(v)).toLocaleString('en-IN')}
  function loans(s){return [{key:'banks',type:'Bank',items:s.banks},{key:'apps',type:'App',items:s.apps},{key:'others',type:'Other',items:s.others}].flatMap(g=>g.items.map((x,i)=>Object.assign({},x,{_key:g.key,_type:g.type,_index:i})))}
  function current(x){return num(x.balance)}
  function selected(x){return num(x.finalAmount)>0?num(x.finalAmount):(num(x.actualForeclosure)>0?num(x.actualForeclosure):current(x))}
  function emi(x){return num(x.emi||x.monthlyPayment)}
  function months(x){return num(x.months||x.remainingMonths)}
  function emiTotal(s){return loans(s).reduce((a,x)=>a+emi(x),0)}
  function currentTotal(s){return loans(s).reduce((a,x)=>a+current(x),0)}
  function closeTotal(s){return loans(s).reduce((a,x)=>a+selected(x),0)}
  function futureTotal(s){return loans(s).reduce((a,x)=>a+(months(x)?emi(x)*months(x):current(x)),0)}
  function incomeTotal(s){return s.income.reduce((a,x)=>a+num(x.amount),0)}
  function expenseOnlyTotal(s){return s.expenses.reduce((a,x)=>a+num(x.amount),0)}
  function expenseTotal(s){return expenseOnlyTotal(s)+emiTotal(s)}
  function surplus(s){return incomeTotal(s)-expenseTotal(s)}
  function selectedLabel(x){return num(x.finalAmount)>0?'Final selected':'Current balance'}
  function loanCard(x){
    const calc=current(x), actual=num(x.actualForeclosure), final=selected(x), future=emi(x)*months(x);
    return `<article class="loan-card"><div class="loan-head"><div><span class="pill ${x._type.toLowerCase()}">${x._type}</span><h3>${esc(x.name||'Loan')}</h3>${x.account?`<small>Account • ${esc(x.account)}</small>`:''}</div><div class="loan-actions"><button class="icon-btn edit" data-key="${x._key}" data-id="${x.id}">✏️</button><button class="icon-btn danger del" data-key="${x._key}" data-id="${x.id}">🗑️</button></div></div><div class="amount-grid"><div><small>Current Balance</small><strong>${money(calc)}</strong></div><div><small>EMI / Month</small><strong>${money(emi(x))}</strong></div><div><small>Months Left</small><strong>${months(x)}</strong></div></div><div class="compare"><div class="compare-title">🔐 आज बंद करने के लिए राशि चुनें</div><div class="choices"><button class="choice ${final===calc?'selected':''}" data-kind="calc" data-key="${x._key}" data-id="${x.id}"><span>🧮 App Calculation</span><b>${money(calc)}</b></button><button class="choice ${actual>0&&final===actual?'selected':''}" data-kind="actual" data-key="${x._key}" data-id="${x.id}"><span>🏦 Bank Actual</span><b>${actual>0?money(actual):'अभी दर्ज नहीं'}</b></button></div><div class="final"><span>✅ Dashboard में Final</span><b>${money(final)}</b></div><div class="mini">📅 EMI जारी रखने पर अनुमानित भुगतान: <b>${money(future)}</b></div></div></article>`
  }
  function esc(v){return String(v).replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]))}
  window.LP={KEY,load,save,id,num,money,loans,current,selected,emi,months,emiTotal,currentTotal,closeTotal,futureTotal,incomeTotal,expenseOnlyTotal,expenseTotal,surplus,selectedLabel,loanCard,esc};
  window.addEventListener('storage',()=>{if(location.pathname.endsWith('index.html')||location.pathname.endsWith('/'))location.reload()});
})();
