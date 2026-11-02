export default function({data,parentElement,setTriggerValue}) {
  const root=parentElement.querySelector('#elm-app');
  const D=data.dataset,A=data.assets;
  const E=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const fmt=n=>new Intl.NumberFormat('en-US',{maximumFractionDigits:0}).format(Number(n)||0);
  const pct=(n,d)=>d>0?(n/d*100).toFixed(1)+'%':'—';
  const ym=s=>String(s).slice(0,7);
  const date=s=>new Date(String(s).slice(0,10)+'T00:00:00Z');
  const monthLabel=s=>date(s).toLocaleDateString('en-US',{month:'short',year:'numeric',timeZone:'UTC'});
  const longMonth=s=>date(s).toLocaleDateString('en-US',{month:'long',year:'numeric',timeZone:'UTC'});
  const dayLabel=s=>s?date(s).toLocaleDateString('en-GB',{day:'2-digit',month:'short',year:'numeric',timeZone:'UTC'}):'—';
  const shift=(s,n)=>{const d=date(s);d.setUTCDate(1);d.setUTCMonth(d.getUTCMonth()+n);return d.toISOString().slice(0,10)};
  const endOf=s=>{const d=date(shift(s,1));d.setUTCDate(0);return d.toISOString().slice(0,10)};
  const fullMonths=(a,b)=>{const x=date(a),y=date(b);return Math.max(0,(y.getUTCFullYear()-x.getUTCFullYear())*12+y.getUTCMonth()-x.getUTCMonth()-((y.getUTCDate()<x.getUTCDate()&&!(String(a).slice(0,10)===endOf(a)&&String(b).slice(0,10)===endOf(b)))?1:0));};
  const age=(a,b)=>{if(!a)return '—';const m=fullMonths(a,b);return m>=12?`${Math.floor(m/12)}y ${m%12}m`:`${m}m`;};
  const months=[];for(let m=D.min_month;m<=D.max_month;m=shift(m,1))months.push(m);
  const defaultStart=shift(D.max_month,-11)<D.min_month?D.min_month:shift(D.max_month,-11);
  if(!parentElement._elm || parentElement._elm.version!==data.version)parentElement._elm={version:data.version,view:'overview',customer:'',products:[],start:defaultStart,end:D.max_month,selected:'P03',search:'',productSearch:'',page:0,allProducts:false,chatOpen:false,pending:null,chatHistory:[]};
  const S=parentElement._elm;
  const names=Object.fromEntries(D.Customers.map(c=>[c.customer_id,c.name]));
  const products=Object.fromEntries(D.Products.map(p=>[p.product_id,p]));
  const customers=Object.fromEntries(D.Customers.map(c=>[c.customer_id,c]));
  const sum=rows=>rows.reduce((v,r)=>v+Number(r.transactions),0);
  const group=(rows,key)=>{const o={};for(const r of rows)o[r[key]]=(o[r[key]]||0)+Number(r.transactions);return o;};
  const sorted=o=>Object.entries(o).sort((a,b)=>b[1]-a[1]||String(a[0]).localeCompare(String(b[0])));
  const scopeLink=l=>!S.products.length||S.products.includes(l.product_id);
  const asset=(name,alt='',cls='')=>A[name]?`<img src="${A[name]}" alt="${E(alt)}" class="${cls}"/>`:'';
  const lock=()=>asset('lock.svg','Not linked','lock-icon');
  const iconFor=p=>({'P01':'digital_card.png','P02':'tamm.png','P03':'yakeen.png','P04':'nafath.png','P05':'natheer.png'}[p]);
  function scope(cid=null){
    const asof=endOf(S.end),links=D.Relationships.filter(l=>l.first_use<=asof&&scopeLink(l));
    const ids=new Set(links.map(l=>l.customer_id));
    const rows=D.Transactions.filter(r=>r.month>=S.start&&r.month<=S.end&&scopeLink(r)&&(!cid||r.customer_id===cid)&&ids.has(r.customer_id));
    const eligibleCustomers=D.Customers.filter(c=>c.created_at<=asof&&ids.has(c.customer_id)&&(!cid||c.customer_id===cid));
    const currentLinks=links.filter(l=>!cid||l.customer_id===cid);
    const first={};for(const l of currentLinks)if(!first[l.customer_id]||l.first_use<first[l.customer_id])first[l.customer_id]=l.first_use;
    const ct=sorted(group(rows,'customer_id')),pt=sorted(group(rows,'product_id')),monthly=group(rows,'month');
    const span=(Number(S.end.slice(0,4))-Number(S.start.slice(0,4)))*12+Number(S.end.slice(5,7))-Number(S.start.slice(5,7))+1;
    const prevStart=shift(S.start,-span),prevEnd=shift(S.start,-1);
    const prior=D.Transactions.filter(r=>r.month>=prevStart&&r.month<=prevEnd&&scopeLink(r)&&(!cid||r.customer_id===cid)&&ids.has(r.customer_id));
    const pv=sum(prior),total=sum(rows),growth=pv>0&&prevStart>=D.min_month?(total/pv-1)*100:null;
    const history=D.Transactions.filter(r=>r.month<=S.end&&r.transactions>0&&scopeLink(r)&&(!cid||r.customer_id===cid));
    const last={};for(const r of history)if(!last[r.customer_id]||last[r.customer_id]<r.last_transaction)last[r.customer_id]=r.last_transaction;
    const cutoff=(()=>{const d=date(asof),day=d.getUTCDate();d.setUTCDate(1);d.setUTCMonth(d.getUTCMonth()-4);const max=new Date(Date.UTC(d.getUTCFullYear(),d.getUTCMonth()+1,0)).getUTCDate();d.setUTCDate(Math.min(day,max));return d.toISOString().slice(0,10);})();
    const inactive=Object.entries(last).filter(([id,d])=>d<=cutoff&&ids.has(id)).map(([id,lastDate])=>{const recent=history.filter(r=>r.customer_id===id).sort((a,b)=>b.last_transaction.localeCompare(a.last_transaction)||b.transactions-a.transactions)[0];return {id,date:lastDate,product:recent?.product_id,months:fullMonths(lastDate,asof)};}).sort((a,b)=>b.months-a.months);
    return {rows,links:currentLinks,first,total,ct,pt,monthly,growth,asof,customers:eligibleCustomers,history,last,inactive};
  }
  function metric(label,value,note,icon,color='#763fc4'){
    return `<article class="kpi" style="--accent:${color}">${asset(icon,'','kpi-icon')}<div class="kpi-label">${E(label)}</div><div class="kpi-value">${E(value)}</div><div class="kpi-sub">${E(note)}</div></article>`;
  }
  function chartTools(){
    const icons={download:'<path d="M4 7h4l2-3h4l2 3h4v13H4Z"/><circle cx="12" cy="13" r="4"/>',zoomin:'<circle cx="10" cy="10" r="7"/><path d="m15 15 6 6M6 10h8M10 6v8"/>',zoomout:'<circle cx="10" cy="10" r="7"/><path d="m15 15 6 6M6 10h8"/>',pan:'<path d="M12 2v20M2 12h20M8 6l4-4 4 4M8 18l4 4 4-4M6 8l-4 4 4 4M18 8l4 4-4 4"/>',reset:'<path d="M3 10a9 9 0 1 1 1 8M3 3v7h7"/>',full:'<path d="M3 9V3h6M15 3h6v6M21 15v6h-6M9 21H3v-6"/>'};
    const names={download:'Save chart as PNG',zoomin:'Zoom in',zoomout:'Zoom out',pan:'Pan chart',reset:'Reset chart',full:'Fullscreen'};
    return Object.entries(icons).map(([action,icon])=>`<button data-chart-action="${action}" title="${names[action]}" aria-label="${names[action]}"><svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">${icon}</svg></button>`).join('');
  }
  function monthlyChart(rows,label){
    const totals=group(rows,'month'),ms=months.filter(m=>m>=S.start&&m<=S.end),max=Math.max(1,...ms.map(m=>totals[m]||0));
    const top=Math.ceil(max/Math.pow(10,Math.floor(Math.log10(max))))*Math.pow(10,Math.floor(Math.log10(max)));
    const W=900,H=255,l=55,r=18,t=25,b=36,w=W-l-r,h=H-t-b;let content='';
    for(let i=0;i<4;i++){const v=top*i/3,y=t+h-h*i/3;content+=`<line x1="${l}" y1="${y}" x2="${W-r}" y2="${y}" stroke="#e2eaf5"/><text x="${l-12}" y="${y+4}" text-anchor="end" fill="#6c7e99" font-size="10">${v>=1000?(v/1000).toFixed(v%1000?1:0)+'K':fmt(v)}</text>`;}
    const slot=w/ms.length,bw=Math.max(6,Math.min(42,slot*.62));
    for(let i=0;i<ms.length;i++){const v=totals[ms[i]]||0,bh=v/top*h,x=l+slot*i+(slot-bw)/2,y=t+h-bh;
      const tooltip=`${monthLabel(ms[i])}: ${fmt(v)} transactions | ${pct(v,sum(rows))} SHARE OF TOTAL TRANSACTIONS`;
      content+=`<rect data-tip="${E(tooltip)}" tabindex="0" aria-label="${E(tooltip)}" x="${x}" y="${y}" width="${bw}" height="${bh}" rx="3" fill="#0075ce"><title>${E(tooltip)}</title></rect>`;
      if(ms.length<=14)content+=`<text x="${x+bw/2}" y="${H-13}" text-anchor="middle" font-size="10" fill="#6c7e99">${date(ms[i]).toLocaleDateString('en-US',{month:'short',timeZone:'UTC'})}</text>`;
      if(ms.length<=24)content+=`<text x="${x+bw/2}" y="${Math.max(y-8,12)}" text-anchor="middle" font-size="9" fill="#14234f" font-weight="600">${v>=1000?(v/1000).toFixed(1)+'K':fmt(v)}<tspan fill="#8972ae"> | </tspan><tspan fill="#635078">${pct(v,sum(rows))}</tspan></text>`;
    }
    if(ms.length>14)for(let i=0;i<ms.length;i+=Math.ceil(ms.length/8))content+=`<text x="${l+slot*i+slot/2}" y="${H-13}" text-anchor="middle" font-size="10" fill="#6c7e99">${E(monthLabel(ms[i]))}</text>`;
    return `<div class="chart-interactive"><div class="chart-tools" role="toolbar" aria-label="Chart tools">${chartTools()}</div><svg class="svg-chart" role="img" aria-label="${E(label)}" viewBox="0 0 ${W} ${H}">${content}</svg></div>`;
  }
  function rank(a){
    const data=a.ct.slice(0,5),max=data[0]?.[1]||1;
    if(!a.total)return empty('No transactions','Try a different period or product.');
    return `<div class="values-legend">Transactions <i>|</i> SHARE OF TOTAL TRANSACTIONS</div><div class="rank-table">${data.map(([id,v])=>`<div class="rank-row"><button class="text-button" data-customer="${E(id)}">${E(names[id])}</button><div class="bar-track"><div class="bar-fill vip" style="width:${v/max*100}%" data-tip="${E(names[id]+': '+fmt(v))}"></div></div><span class="rank-values"><strong>${fmt(v)}</strong><i>|</i><span>${pct(v,a.total)}</span></span></div>`).join('')}</div><div class="rank-row" aria-hidden="true"><span></span><div class="rank-axis"><span>0</span><span>${fmt(max/2)}</span><span>${fmt(max)}</span></div><span></span></div>`;
  }
  const empty=(title,description,extra='')=>`<div class="empty"><strong>${E(title)}</strong><p>${E(description)}</p>${extra}</div>`;
  function productActivity(a){
    const items=a.pt.filter(i=>i[1]>0),max=items[0]?.[1]||1;
    return `<div class="activity-product-heading"><span>PRODUCT</span><span>TRANSACTIONS | SHARE OF TOTAL TRANSACTIONS</span></div><div class="activity-product-list">${items.map(([pid,v])=>`<div class="activity-product-row"><button class="text-button" title="${E(products[pid]?.name||pid)}" data-filter-product="${pid}">${E(products[pid]?.name||pid)}</button><div class="bar-track"><div class="bar-fill" style="height:17px;width:${v/max*100}%"></div></div><span class="rank-values"><strong>${fmt(v)}</strong><i>|</i><span>${pct(v,a.total)}</span></span></div>`).join('')||empty('No transactions','Clear the product filter or change the reporting period.')}</div>`;
  }
  function inactiveTable(a){
    return a.inactive.length?`<div class="inactive-table-wrap"><table class="data-table activity-table"><thead><tr><th>CUSTOMER</th><th>PRODUCT</th><th>LAST TRANSACTION</th><th>MONTHS INACTIVE</th></tr></thead><tbody>${a.inactive.map(r=>`<tr><td><button data-customer="${r.id}" class="text-button">${E(names[r.id])}</button></td><td>${E(products[r.product]?.name||'—')}</td><td>${dayLabel(r.date)}</td><td>${r.months}</td></tr>`).join('')}</tbody></table></div>`:empty('No inactive customers','All customers with recorded activity are active in this scope.');
  }
  function exploreCards(a){
    const q=S.search.toLowerCase(),ranked=a.customers.map(c=>({...c,total:a.ct.find(x=>x[0]===c.customer_id)?.[1]||0})).filter(c=>(c.name+' '+c.customer_id).toLowerCase().includes(q)).sort((a,b)=>b.total-a.total||a.name.localeCompare(b.name));
    const pages=Math.max(1,Math.ceil(ranked.length/6));S.page=Math.min(S.page,pages-1);const visible=ranked.slice(S.page*6,S.page*6+6);
    return {html:visible.map(c=>{const count=new Set(a.links.filter(l=>l.customer_id===c.customer_id).map(l=>l.product_id)).size;return `<article class="customer-card"><div class="avatar">${E(c.name.split(' ').slice(0,2).map(n=>n[0]).join(''))}</div><div><div class="customer-name">${E(c.name)}</div><div class="customer-meta">${E(c.sector)} · ${count} linked products</div></div><div><div class="customer-amount">${fmt(c.total)}</div></div><button class="journey-link" data-customer="${c.customer_id}">Explore journey →</button></article>`;}).join('')||empty('No matching customers','Try a different customer name or ID.'),pages,count:ranked.length};
  }
  function overview(){
    const a=scope(S.customer||null),first=Object.entries(a.first).sort((x,y)=>x[1].localeCompare(y[1]));const oldest=first[0],newest=first[first.length-1];
    const ready=D.Products.filter(p=>p.mdm_ready&&(!S.products.length||S.products.includes(p.product_id))).length;
    let html=`<section class="kpi-grid" aria-label="Portfolio key indicators">${metric('VIP CUSTOMERS',fmt(a.customers.length),'Distinct golden customers','imgMetricIconCustomers.svg')}${metric('COVERED PRODUCTS',fmt(ready),'Fully processed in MDM','imgMetricIconProducts.svg')}${metric('TOTAL TRANSACTIONS',fmt(a.total),'Selected period · current scope','imgMetricIconTransactions.svg')}${metric('OLDEST CUSTOMER',oldest?age(oldest[1],a.asof):'—',oldest?names[oldest[0]]+' · first use '+monthLabel(oldest[1]):'No recorded first use','imgMetricIconOldest.svg')}${metric('NEWEST CUSTOMER',newest?age(newest[1],a.asof):'—',newest?names[newest[0]]+' · first use '+monthLabel(newest[1]):'No recorded first use','imgMetricIconNewest.svg')}</section>`;
    const monthly=sorted(a.monthly),peak=monthly[0];
    html+=`<div class="row-grid"><section class="panel"><div class="panel-head"><div><h2>Monthly transactions</h2></div></div><div class="values-legend">Transactions <i>|</i> SHARE OF TOTAL TRANSACTIONS</div>${monthlyChart(a.rows,'Monthly transactions across selected customers and products')}<p class="chart-note">${peak&&peak[1]>0?'Peak period · '+longMonth(peak[0]):'No transactions in this period'}</p></section><section class="panel"><div class="panel-head"><h2>Product activity</h2></div>${productActivity(a)}</section></div>`;
    html+=`<div class="row-grid"><section class="panel"><div class="panel-head"><div><h2>Top VIP customers</h2></div></div>${rank(a)}</section><section class="panel inactive-panel"><div class="panel-head"><h2>Inactive VIP customers</h2><span class="mini-count">${a.inactive.length} customers</span></div>${inactiveTable(a)}</section></div>`;
    html+=`<section class="panel explore"><div class="explore-header"><div><h2>Explore customers</h2></div><label><span class="visually-hidden">Search customer name or ID</span><input id="customer-search" class="explore-search" placeholder="Search customer name or ID…" value="${E(S.search)}" autocomplete="off"/></label></div><div class="customer-grid" id="customer-grid"></div><div id="customer-pager" class="pager"></div></section>`;
    return html;
  }
  function getCustomerProducts(){
    const asof=endOf(S.end),links=D.Relationships.filter(l=>l.customer_id===S.customer&&l.first_use<=asof),map=Object.fromEntries(links.map(l=>[l.product_id,l]));
    return D.Products.filter(p=>!S.products.length||S.products.includes(p.product_id)).map((p,i)=>({...p,linked:!!map[p.product_id],first:map[p.product_id]?.first_use,order:i+1}));
  }
  function recommendation(pid){
    const customer=customers[S.customer];if(!customer)return '';
    const peers=D.Customers.filter(c=>c.customer_id!==S.customer&&c.sector===customer.sector&&c.created_at<=endOf(S.end));
    const ids=new Set(peers.map(c=>c.customer_id));
    const linked=new Set(D.Relationships.filter(l=>ids.has(l.customer_id)&&l.product_id===pid&&l.first_use<=endOf(S.end)).map(l=>l.customer_id));
    if(!ids.size)return '';
    const percent=linked.size/ids.size*100;
    return `<div class="peer-recommendation"><div class="recommendation-heading">${percent>75?'<span class="recommended-badge">Recommended</span>':'<span class="recommended-badge">Peer adoption</span>'}</div><div class="recommendation-main"><strong>${percent.toFixed(0)}%</strong><span>of customers in ${E(customer.sector)}<br>are linked to this product</span></div><small>${linked.size} of ${ids.size} other customers · same category</small><div class="recommendation-meter"><span style="width:${percent}%"></span></div></div>`;
  }
  function detail(){
    if(!S.customer)return `<section class="no-customer"><h2>Choose a customer to explore their journey</h2><p>Select a customer in the header or open a journey from the Overview. Each product, date and transaction will reflect that customer.</p><button class="small-button" data-action="overview">Explore customers →</button></section>`;
    const a=scope(S.customer),all=scope(null),ps=getCustomerProducts();
    if(!ps.length)return empty('No matching products','Clear the product filter to see this customer’s journey.');
    if(!ps.some(p=>p.product_id===S.selected))S.selected=ps.find(p=>p.linked)?.product_id||ps[0].product_id;
    const selected=ps.find(p=>p.product_id===S.selected),spid=selected.product_id,fullLinks=D.Relationships.filter(l=>l.customer_id===S.customer&&l.first_use<=a.asof),first=fullLinks.map(l=>l.first_use).sort()[0];
    const volume=a.pt.find(x=>x[0]===spid)?.[1]||0,pr=a.rows.filter(r=>r.product_id===spid),last=a.last[S.customer];
    const hist=a.history.filter(r=>r.product_id===spid),prodLast=hist.map(r=>r.last_transaction).sort().pop();
    const status=!selected.linked?'Not linked':!prodLast?'No activity history':fullMonths(prodLast,a.asof)>=4?'Inactive':'Active';
    const currentPeriod=`${monthLabel(S.start)} – ${monthLabel(S.end)}`;
    let html=`<section class="kpi-grid" aria-label="Customer key indicators">${metric('CUSTOMER TRANSACTIONS',fmt(a.total),'Selected period · '+currentPeriod,'imgMetricIconTransactions.svg','#0075ce')}${metric('LINKED PRODUCTS',ps.filter(p=>p.linked).length+' / '+ps.length,'Linked / available products','imgMetricIconLinked.svg','#00accf')}${metric('RELATIONSHIP AGE',age(first,a.asof),first?'Since first use · '+monthLabel(first):'No recorded first use','imgMetricIconAge.svg')}${metric('TRANSACTION GROWTH',a.growth===null?'—':(a.growth>=0?'+':'')+a.growth.toFixed(1)+'%',a.growth===null?'Previous equivalent period unavailable':'vs previous equivalent '+((Number(S.end.slice(0,4))-Number(S.start.slice(0,4)))*12+Number(S.end.slice(5,7))-Number(S.start.slice(5,7))+1)+' months','imgMetricIconGrowth.svg','#fc6635')}${metric('SHARE OF TOTAL TRANSACTIONS',pct(a.total,all.total),'Customer transactions / all VIP transactions','imgMetricIconShare.svg','#0075ce')}</section>`;
    const monthly=sorted(a.monthly),peak=monthly[0]?.[0],top=a.pt[0],lastAll=D.Transactions.filter(r=>r.customer_id===S.customer&&r.month<=S.end&&r.transactions>0).map(r=>r.last_transaction).sort().pop();
    const inactiveProducts=ps.filter(p=>p.linked).filter(p=>{const last=D.Transactions.filter(r=>r.customer_id===S.customer&&r.product_id===p.product_id&&r.month<=S.end&&r.transactions>0).map(r=>r.last_transaction).sort().pop();return last&&fullMonths(last,a.asof)>=4;}).length;
    const days=lastAll?Math.floor((date(a.asof)-date(lastAll))/86400000):null;
    const signals=[['LAST TRANSACTION',dayLabel(lastAll),days===null?'No recorded transactions':''],['PEAK MONTH',peak?longMonth(peak):'—','Highest transaction month in scope'],['MOST USED PRODUCT',top?products[top[0]].name:'—',top?pct(top[1],a.total)+' of customer transactions':'No transactions in scope'],['INACTIVE PRODUCTS',inactiveProducts+' of '+ps.filter(p=>p.linked).length+' linked','No use for at least 4 months']];
    html+=`<section class="panel signals"><h2>Customer activity</h2><div class="signal-grid">${signals.map(x=>`<article class="signal"><div class="signal-label">${E(x[0])}</div><div class="signal-value">${E(x[1])}</div><p class="signal-note">${E(x[2])}</p></article>`).join('')}</div></section>`;
    const timeline=ps.filter(p=>p.linked).sort((a,b)=>a.first.localeCompare(b.first)||a.product_id.localeCompare(b.product_id));
    const index=ps.findIndex(p=>p.product_id===spid),logos=iconFor(spid);
    if(S.allProducts)html+=allProductsPage(a,ps);
    else html+=`<section class="panel journey"><div class="journey-top"><div><h2>Customer product journey</h2><p>${E(names[S.customer])}</p></div><div class="journey-controls"><div class="coverage">${ps.filter(p=>p.linked).length} linked / ${ps.length} products</div></div></div><div class="journey-body"><aside class="product-index" aria-label="Product navigator"><h3>${ps.length} products</h3><label class="visually-hidden" for="product-search">Search product</label><input id="product-search" class="product-search" placeholder="Search product…" value="${E(S.productSearch)}"/><div class="product-list" id="product-list" tabindex="0" aria-label="Scrollable product list"></div><div class="product-hint">Scroll down · <button class="text-button" data-action="show-all-products">All ${ps.length} products →</button></div></aside><div class="product-content"><div class="product-hero"><div><div class="eyebrow">SELECTED PRODUCT / ${String(index+1).padStart(2,'0')}</div><h3>${E(selected.name)}</h3><div class="product-description customer-category">${selected.description==='Additional product · demonstration placeholder'||selected.product_id.slice(1)*1>=6?'':`${E(selected.description)} <span class="category-separator">·</span> `}<strong>${E(customers[S.customer].sector)}</strong></div>${!selected.linked?recommendation(spid):''}</div><div class="hero-side"><div class="hero-actions">${logos?asset(logos,selected.name+' logo','product-logo'):''}<span class="relationship-state ${!selected.linked?'locked':''}">${selected.linked?'● ':''}${E(status)}</span><div class="hero-nav"><button data-action="prev-product" aria-label="Previous product" ${index===0?'disabled':''}>←</button><button data-action="next-product" aria-label="Next product" ${index===ps.length-1?'disabled':''}>→</button></div></div><span class="hero-position">${String(index+1).padStart(2,'0')} / ${ps.length}</span></div></div><div class="fact-grid"><article class="fact"><div class="fact-label">First use of ${E(selected.name)}</div><div class="fact-value">${selected.linked?longMonth(selected.first):'Not linked'}</div><p class="fact-note">${selected.linked?'First recorded product transaction':'No recorded product use'}</p></article><article class="fact"><div class="fact-label">${E(selected.name)} transactions</div><div class="fact-value">${selected.linked?fmt(volume):'—'}</div><p class="fact-note">${selected.linked?currentPeriod:'No transaction history available'}</p></article><article class="fact"><div class="fact-label">SHARE OF TOTAL TRANSACTIONS</div><div class="fact-value">${selected.linked?pct(volume,a.total):'—'}</div><p class="fact-note">${selected.linked?fmt(volume)+' of '+fmt(a.total)+' transactions':'No linked product to calculate share'}</p></article></div><div class="timeline-head"><h3>${selected.linked?'Relationship timeline':'Recorded product history'}</h3><span>${selected.linked?'First recorded use':'Unlinked products have no start date'}</span></div><div class="timeline" id="timeline" tabindex="0" aria-label="Scrollable relationship timeline">${timeline.map((p,i)=>`<button class="timeline-step ${p.product_id===spid?'active':''}" data-product="${p.product_id}"><span class="step-dot">${i+1}</span><span class="timeline-name">${E(p.name)}</span><span class="timeline-date">${monthLabel(p.first)}</span></button>`).join('')||'<p class="muted">No linked products in this scope.</p>'}</div></div></div></section>`;
    const max=a.pt[0]?.[1]||1,contrib=a.pt.filter(p=>p[1]>0);
    html+=`<div class="detail-grid"><section class="panel"><div class="panel-head"><div><h2>Product contribution</h2></div></div><div class="contribution-head"><span>PRODUCT</span><span>TRANSACTIONS | SHARE OF TOTAL TRANSACTIONS</span></div><div style="max-height:230px;overflow:auto">${contrib.map(([pid,v])=>`<div class="contribution-row ${pid===spid?'selected':''}"><button class="text-button" data-product="${pid}">${E(products[pid]?.name||pid)}</button><div class="bar-track"><div class="bar-fill" style="width:${v/max*100}%"></div></div><span class="contribution-values"><strong>${fmt(v)}</strong><i>|</i><span>${pct(v,a.total)}</span></span></div>`).join('')||empty('No transactions','No activity in the selected reporting period.')}</div></section><section class="panel"><div class="panel-head"><div><h2>Monthly transactions</h2><p>${E(selected.name)}</p></div><span class="muted" style="font-size:11px">${currentPeriod}</span></div>${!selected.linked?empty('No activity to display','Not linked · No transaction history shown'):volume===0?empty('No transactions in this period','This product is linked. Try a different reporting period.'):'<div class="values-legend">Transactions <i>|</i> SHARE OF TOTAL TRANSACTIONS</div>'+monthlyChart(pr,'Monthly '+selected.name+' transactions')}</section></div>`;
    return html;
  }
  function allProductsPage(a,ps){
    const linked=ps.filter(p=>p.linked).sort((x,y)=>x.first.localeCompare(y.first)||x.product_id.localeCompare(y.product_id)),unlinked=ps.filter(p=>!p.linked);
    const ordered=[...linked,...unlinked],first=linked[0]?.first;
    return `<section class="panel all-products-panel"><div class="journey-top"><div><h2>All products</h2><p>${E(names[S.customer])} · ${linked.length} linked products</p></div><button class="small-button" data-action="back-journey">← Back to journey</button></div><div class="all-summary"><span>Created · <strong>${dayLabel(customers[S.customer].created_at)}</strong></span><span>First use · <strong>${dayLabel(first)}</strong></span><span>Current position · <strong>${linked.length} linked / ${ps.length} products</strong></span></div><div class="all-search-row"><input id="all-product-search" class="product-search" placeholder="Search product name…" aria-label="Search all products"/><span>${ps.length} products · first use, oldest first</span></div><div class="all-table-wrap"><table class="data-table all-product-table"><thead><tr><th>FIRST USE</th><th>PRODUCT</th><th class="numeric">TRANSACTIONS</th><th class="numeric">SHARE OF TOTAL TRANSACTIONS</th><th>STATUS</th><th></th></tr></thead><tbody>${ordered.map(p=>{const v=a.pt.find(x=>x[0]===p.product_id)?.[1]||0;return `<tr data-all-name="${E(p.name.toLowerCase())}" class="${p.product_id===S.selected?'selected-product':''}"><td>${p.linked?monthLabel(p.first):'—'}</td><td>${E(p.name)}</td><td class="numeric">${p.linked?fmt(v):'—'}</td><td class="numeric">${p.linked?pct(v,a.total):'—'}</td><td>${p.linked?'Linked':lock()+' Not linked'}</td><td><button class="text-button" data-open-product="${p.product_id}">View →</button></td></tr>`;}).join('')}</tbody></table></div><p class="all-empty" hidden>No matching products.</p></section>`;
  }
  function toolbar(){
    const a=scope(null),eligible=new Set(a.customers.map(c=>c.customer_id));
    const opt=(value,label,selected)=>`<option value="${E(value)}" ${selected?'selected':''}>${E(label)}</option>`;
    return `<nav class="toolbar" aria-label="Navigation and global filters"><div class="navigation"><button class="${S.view==='overview'?'active':''}" data-action="overview">${asset('imgGroup.svg','','nav-icon')}Overview</button><button class="${S.view==='detail'?'active':''}" data-action="detail">${asset('imgGroup1.svg','','nav-icon')}Customer detail</button></div><div class="field"><label for="customer-filter">${S.view==='overview'?'SCOPE':'CUSTOMER'}</label><select id="customer-filter">${opt('','All VIP customers',!S.customer)}${D.Customers.filter(c=>c.created_at<=endOf(S.end)).map(c=>opt(c.customer_id,c.name,c.customer_id===S.customer)).join('')}</select></div><div class="field"><span>PRODUCTS</span><details id="product-filter"><summary>${S.products.length?S.products.length+' products selected':'All products'} <span>⌄</span></summary><div class="product-popup"><input id="filter-product-search" type="search" placeholder="Search products…" aria-label="Search filter products"/><div class="popup-actions"><button data-action="all-products">Select all</button><button data-action="clear-products">Reset to all</button></div><div class="checks">${D.Products.map(p=>`<label class="check" data-filter-label="${E(p.name.toLowerCase())}"><input type="checkbox" data-check-product="${p.product_id}" ${!S.products.length||S.products.includes(p.product_id)?'checked':''}/>${E(p.name)}</label>`).join('')}</div></div></details></div><div class="field period-field"><span>REPORTING PERIOD</span><div class="period-inputs"><label><span class="visually-hidden">Start month</span><select id="start-month" aria-label="Start month">${months.map(m=>opt(m,monthLabel(m),m===S.start)).join('')}</select></label><label><span class="visually-hidden">End month</span><select id="end-month" aria-label="End month">${months.map(m=>opt(m,monthLabel(m),m===S.end)).join('')}</select></label></div></div><button class="reset" data-action="reset">↺ Reset</button>${exportMenu()}</nav>`;
  }
  function renderCards(){
    const a=scope(S.customer||null),r=exploreCards(a),grid=root.querySelector('#customer-grid'),pager=root.querySelector('#customer-pager');
    if(grid)grid.innerHTML=r.html;if(pager)pager.innerHTML=`<button data-action="prev-page" ${S.page===0?'disabled':''}>← Previous</button><span>Page ${S.page+1} of ${r.pages} · ${r.count} customers</span><button data-action="next-page" ${S.page>=r.pages-1?'disabled':''}>Next →</button>`;
  }
  function renderProductList(){
    const list=root.querySelector('#product-list');if(!list)return;const previous=list.scrollTop;const ps=getCustomerProducts(),q=S.productSearch.toLowerCase();
    list.innerHTML=ps.filter(p=>(p.name+' '+p.product_id).toLowerCase().includes(q)).map(p=>`<button class="product-row ${p.product_id===S.selected?'active':''}" data-product="${p.product_id}" aria-pressed="${p.product_id===S.selected}"><span class="product-title">${String(p.order).padStart(2,'0')} · ${E(p.name)}</span><span class="product-date">${p.linked?monthLabel(p.first):'Not linked'}</span>${p.linked?'':lock()}</button>`).join('')||'<p class="muted" style="padding:12px">No matching products.</p>';list.scrollTop=previous;
  }
  function context(){let ps=S.products;return {customer:S.view==='detail'?S.customer||null:S.customer||null,products:ps,start:S.start,end:S.end};}
  function chatMarkup(){
    if(!S.chatOpen)return '';
    const scopeText=(S.view==='detail'&&S.customer?names[S.customer]:S.customer?names[S.customer]:'All customers')+' · '+monthLabel(S.start)+' – '+monthLabel(S.end)+(S.products.length?' · '+S.products.length+' products':' · All products');
    const responses=data.replies||[];let messages='';
    for(const c of S.chatHistory){messages+=`<div class="bubble user">${E(c.question)}</div>`;const answer=responses.find(r=>r.id===c.id);messages+=`<div class="bubble">${answer?E(answer.answer):'Calculating from the current data…'}</div>${answer?`<details class="supporting"><summary>View supporting data</summary>${supporting(c)}</details><button class="small-button" data-export-answer="${c.id}">Export answer ↓</button>`:''}`;}
    if(!S.chatHistory.length)messages=`<div class="bubble">How can I help you explore your customers?<div class="suggestions"><button data-question="How many customers are there?">Customer count</button><button data-question="Who is the top customer by transactions?">Top customer</button><button data-question="What is the customer age?">Customer age</button><button data-question="Show transactions by product">Product totals</button></div></div>`;
    return `<section class="chat" role="dialog" aria-label="Data assistant"><header class="chat-header"><div><strong>Data assistant</strong></div><button class="chat-close" data-action="close-chat" aria-label="Close assistant">×</button></header><div class="chat-scope">${E(scopeText)}</div><div class="chat-messages" id="chat-messages" aria-live="polite">${messages}</div><form class="chat-form" id="chat-form"><label class="visually-hidden" for="chat-input">Ask about the data</label><input id="chat-input" placeholder="Ask about customers or transactions…" maxlength="2000" autocomplete="off"/><button type="submit" aria-label="Send question" ${S.pending&&!responses.some(r=>r.id===S.pending)?'disabled':''}>↑</button></form><div class="chat-foot">Answers use the current filters. Example data; verify before business use.</div></section>`;
  }

  function csvDownload(rows,name){
    const cols=Object.keys(rows[0]||{note:''});
    const quote=v=>'"'+String(v??'').replace(/^[=+@\-]/,"'$&").replace(/"/g,'""')+'"';
    const csv='\uFEFF'+[cols,...rows.map(r=>cols.map(k=>r[k]))].map(r=>r.map(quote).join(',')).join('\r\n');
    const url=URL.createObjectURL(new Blob([csv],{type:'text/csv;charset=utf-8'}));
    const link=document.createElement('a');link.href=url;link.download=name+'.csv';link.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
  }
  function answerScope(c){
    const old={customer:S.customer,products:S.products,start:S.start,end:S.end};
    Object.assign(S,c.context);const a=scope(c.context.customer||null);Object.assign(S,old);return a;
  }
  function exportRows(a,kind){
    if(kind==='monthly')return sorted(a.monthly).sort((x,y)=>x[0].localeCompare(y[0])).map(([month,v])=>({month,transactions:v,'SHARE OF TOTAL TRANSACTIONS':pct(v,a.total)}));
    if(kind==='products')return a.pt.map(([id,v])=>({product:products[id]?.name,transactions:v,'SHARE OF TOTAL TRANSACTIONS':pct(v,a.total)}));
    if(kind==='transactions')return a.rows.map(r=>({...r,customer_name:names[r.customer_id],product_name:products[r.product_id]?.name}));
    return a.ct.map(([id,v])=>({customer_id:id,customer_name:names[id],transactions:v,'SHARE OF TOTAL TRANSACTIONS':pct(v,a.total)}));
  }
  function supporting(c){
    const kind=/product/i.test(c.question)?'products':/month|trend/i.test(c.question)?'monthly':'customers',rows=exportRows(answerScope(c),kind),cols=Object.keys(rows[0]||{});
    return `<p class="muted">${E(monthLabel(c.context.start))} – ${E(monthLabel(c.context.end))} · question scope</p><div class="support-table"><table class="data-table"><thead><tr>${cols.map(k=>`<th>${E(k.startsWith('share_')?'SHARE OF TOTAL TRANSACTIONS':k.replaceAll('_',' '))}</th>`).join('')}</tr></thead><tbody>${rows.map(r=>`<tr>${cols.map(k=>`<td>${E(k==='transactions'?fmt(r[k]):r[k])}</td>`).join('')}</tr>`).join('')}</tbody></table></div><button class="small-button" data-export-support="${c.id}">Download supporting CSV ↓</button>`;
  }
  function exportMenu(){return `<details class="export-menu"><summary aria-label="Export data" title="Export data"><svg viewBox="0 0 24 24" width="19" height="19" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3v12m-4-4 4 4 4-4M4 16v4h16v-4"/></svg></summary><div>${['monthly','customers','products','transactions'].map(k=>`<button data-export="${k}">${k[0].toUpperCase()+k.slice(1)} · CSV</button>`).join('')}</div></details>`;}

  function render(){
    const productScroll=root.querySelector('#product-list')?.scrollTop||0,timelineScroll=root.querySelector('#timeline')?.scrollLeft||0;
    root.innerHTML=`<main class="shell"><header class="banner">${asset('imgHeaderSuppliedGlassAndRoadArtwork.png','','banner-art')}${asset('imgElmOfficialBrandLogo.png','Elm logo','brand-logo')}<div class="banner-copy"><h1>${S.view==='overview'?'CUSTOMER OVERVIEW':'CUSTOMER JOURNEY'}</h1><p>${S.view==='overview'?'Master Data Management · VIP Customers':'Customer intelligence · Product relationships'}</p></div></header><div class="content">${toolbar()}${S.view==='overview'?overview():detail()}</div></main><button class="assistant-launcher" data-action="chat" aria-expanded="${S.chatOpen}">✦ Ask assistant</button>${chatMarkup()}<div id="chart-tooltip" class="chart-tooltip" hidden></div>`;
    if(S.view==='overview')renderCards();else{renderProductList();const l=root.querySelector('#product-list');if(l)l.scrollTop=productScroll;const t=root.querySelector('#timeline');if(t)t.scrollLeft=timelineScroll;}
    const cm=root.querySelector('#chat-messages');if(cm)cm.scrollTop=cm.scrollHeight;
  }
  function chooseProduct(id){S.selected=id;const prev=root.querySelector('#product-list')?.scrollTop||0;render();const list=root.querySelector('#product-list');if(list){list.scrollTop=prev;const button=Array.from(list.querySelectorAll('[data-product]')).find(b=>b.dataset.product===id);if(button)button.focus({preventScroll:true});if(button&&(button.getBoundingClientRect().top<list.getBoundingClientRect().top||button.getBoundingClientRect().bottom>list.getBoundingClientRect().bottom))list.scrollTop+=button.getBoundingClientRect().top-list.getBoundingClientRect().top-list.clientHeight/2+button.offsetHeight/2;}const timeline=root.querySelector('#timeline');if(timeline){const button=Array.from(timeline.querySelectorAll('[data-product]')).find(b=>b.dataset.product===id);if(button){const b=button.getBoundingClientRect(),r=timeline.getBoundingClientRect();if(b.left<r.left||b.right>r.right)timeline.scrollLeft+=b.left-r.left-40;};}}
  function ask(question){if(!question.trim())return;const request={id:Date.now().toString(36)+'-'+Math.random().toString(36).slice(2,8),question:question.trim(),context:context()};S.chatHistory.push(request);S.pending=request.id;S.chatOpen=true;render();setTriggerValue('ask',request);}
  root.onclick=e=>{
    const button=e.target.closest('button');if(!button)return;
    if(button.dataset.chartAction){
      const box=button.closest('.chart-interactive'),svg=box.querySelector('.svg-chart'),action=button.dataset.chartAction;
      let v=svg.viewBox.baseVal;
      if(action==='zoomin'||action==='zoomout'){const f=action==='zoomin'?.8:1.25,w=Math.min(900,Math.max(180,v.width*f));svg.setAttribute('viewBox',`${Math.max(0,Math.min(900-w,v.x+(v.width-w)/2))} 0 ${w} 255`);}
      if(action==='reset'){svg.setAttribute('viewBox','0 0 900 255');box.classList.remove('pan-enabled');}
      if(action==='pan'){box.classList.toggle('pan-enabled');button.setAttribute('aria-pressed',box.classList.contains('pan-enabled'));}
      if(action==='full'){if(document.fullscreenElement===box)document.exitFullscreen();else box.requestFullscreen?.();}
      if(action==='download'){
        const copy=svg.cloneNode(true);copy.setAttribute('xmlns','http://www.w3.org/2000/svg');copy.setAttribute('width','1800');copy.setAttribute('height','510');
        const image=new Image();const url=URL.createObjectURL(new Blob([new XMLSerializer().serializeToString(copy)],{type:'image/svg+xml'}));
        image.onload=()=>{const canvas=document.createElement('canvas');canvas.width=1800;canvas.height=510;const ctx=canvas.getContext('2d');ctx.fillStyle='#fff';ctx.fillRect(0,0,1800,510);ctx.drawImage(image,0,0,1800,510);const a=document.createElement('a');a.href=canvas.toDataURL('image/png');a.download='monthly_transactions.png';a.click();URL.revokeObjectURL(url);};image.src=url;
      }
      return;
    }
    if(button.dataset.export){csvDownload(exportRows(scope(S.customer||null),button.dataset.export),'elm_'+button.dataset.export+'_'+ym(S.start)+'_'+ym(S.end));return;}
    if(button.dataset.exportSupport){const c=S.chatHistory.find(c=>c.id===button.dataset.exportSupport);csvDownload(exportRows(answerScope(c),/product/i.test(c.question)?'products':/month|trend/i.test(c.question)?'monthly':'customers'),'assistant_supporting_data');return;}
    if(button.dataset.exportAnswer){const c=S.chatHistory.find(c=>c.id===button.dataset.exportAnswer),r=(data.replies||[]).find(r=>r.id===c.id);csvDownload([{question:c.question,answer:r.answer,start:c.context.start,end:c.context.end,customer:c.context.customer||'All',products:c.context.products.join('|')||'All'}],'assistant_answer');return;}
    if(button.dataset.customer){S.customer=button.dataset.customer;S.view='detail';S.selected=getCustomerProducts().find(p=>p.linked)?.product_id||D.Products[0]?.product_id;S.productSearch='';render();window.scrollTo({top:0,behavior:'auto'});return;}
    if(button.dataset.openProduct){S.allProducts=false;chooseProduct(button.dataset.openProduct);return;}
    if(button.dataset.product){chooseProduct(button.dataset.product);return;}
    if(button.dataset.filterProduct){S.products=[button.dataset.filterProduct];S.page=0;render();return;}
    if(button.dataset.question){ask(button.dataset.question);return;}
    const action=button.dataset.action;
    if(action==='overview'||action==='detail'){S.view=action;render();}
    if(action==='show-all-products'){S.allProducts=true;render();root.querySelector('.all-products-panel')?.scrollIntoView({block:'start',behavior:'smooth'});}
    if(action==='back-journey'){S.allProducts=false;render();}
    if(action==='reset'){Object.assign(S,{allProducts:false,customer:'',products:[],start:defaultStart,end:D.max_month,selected:'P03',search:'',productSearch:'',page:0});render();}
    if(action==='all-products'||action==='clear-products'){S.products=[];S.page=0;render();}
    if(action==='next-page'){S.page++;renderCards();}
    if(action==='prev-page'){S.page=Math.max(0,S.page-1);renderCards();}
    if(action==='next-product'||action==='prev-product'){const ps=getCustomerProducts(),i=ps.findIndex(p=>p.product_id===S.selected),next=ps[i+(action==='next-product'?1:-1)];if(next)chooseProduct(next.product_id);}
    if(action==='chat'){S.chatOpen=!S.chatOpen;render();if(S.chatOpen)root.querySelector('#chat-input')?.focus();}
    if(action==='close-chat'){S.chatOpen=false;render();root.querySelector('.assistant-launcher')?.focus();}
    if(action==='settings')setTriggerValue('settings',{id:Date.now()});
  };
  root.oninput=e=>{
    if(e.target.id==='all-product-search'){const q=e.target.value.toLowerCase();let count=0;root.querySelectorAll('[data-all-name]').forEach(r=>{r.hidden=!r.dataset.allName.includes(q);if(!r.hidden)count++;});root.querySelector('.all-empty').hidden=count>0;}
    if(e.target.id==='customer-search'){S.search=e.target.value;S.page=0;renderCards();}
    if(e.target.id==='product-search'){S.productSearch=e.target.value;renderProductList();}
    if(e.target.id==='filter-product-search'){const q=e.target.value.toLowerCase();root.querySelectorAll('[data-filter-label]').forEach(n=>n.hidden=!n.dataset.filterLabel.includes(q));}
  };
  root.onchange=e=>{
    if(e.target.id==='customer-filter'){S.customer=e.target.value;S.productSearch='';S.page=0;S.selected='P03';render();}
    if(e.target.id==='start-month'){S.start=e.target.value;if(S.start>S.end)S.end=S.start;S.page=0;render();}
    if(e.target.id==='end-month'){S.end=e.target.value;if(S.end<S.start)S.start=S.end;S.page=0;render();}
    
    if(e.target.dataset.checkProduct){let selected=Array.from(root.querySelectorAll('[data-check-product]:checked')).map(i=>i.dataset.checkProduct);if(selected.length===D.Products.length)selected=[];if(!selected.length){S.products=[];}else S.products=selected;S.page=0;render();const filter=root.querySelector('#product-filter');if(filter)filter.open=true;}
  };
  root.onsubmit=e=>{if(e.target.id==='chat-form'){e.preventDefault();ask(root.querySelector('#chat-input').value);}};
  root.onkeydown=e=>{if(e.key==='Escape'&&S.chatOpen){S.chatOpen=false;render();root.querySelector('.assistant-launcher')?.focus();}else if(e.key==='Escape')root.querySelectorAll('details[open]').forEach(n=>n.open=false);};
  root.onmousemove=e=>{const target=e.target.closest('[data-tip]'),tip=root.querySelector('#chart-tooltip');if(!tip)return;if(target){tip.hidden=false;tip.textContent=target.dataset.tip;tip.style.left=Math.min(e.clientX+12,window.innerWidth-270)+'px';tip.style.top=Math.max(8,e.clientY-55)+'px';}else tip.hidden=true;};
  let drag=null;
  root.onpointerdown=e=>{const svg=e.target.closest('.pan-enabled .svg-chart');if(!svg)return;drag={svg,x:e.clientX,start:svg.viewBox.baseVal.x,width:svg.viewBox.baseVal.width};svg.setPointerCapture(e.pointerId);e.preventDefault();};
  root.onpointermove=e=>{if(!drag)return;const x=Math.max(0,Math.min(900-drag.width,drag.start-(e.clientX-drag.x)/drag.svg.getBoundingClientRect().width*drag.width));drag.svg.setAttribute('viewBox',`${x} 0 ${drag.width} 255`);};
  root.onpointerup=()=>{drag=null;};
  render();
}
