"""Rebuild the deterministic example workbook. All records are synthetic."""
from pathlib import Path
import calendar
import numpy as np
import pandas as pd
ROOT=Path(__file__).resolve().parent

def allocate(total, weights):
    a=np.asarray(weights,dtype=float); a=a/a.sum()*int(total)
    out=np.floor(a).astype(int)
    order=np.argsort(-(a-out),kind='stable')
    out[order[:int(total)-int(out.sum())]]+=1
    return out

def build():
    products=[{'product_id':f'P{i:02}', 'name':n, 'description':d, 'mdm_ready':True} for i,(n,d) in enumerate([
      ('Digital Card','Digital card services'),('TAMM','Vehicle and transport services'),('YAKEEN','Identity verification'),('NAFATH','Digital identity services'),('NATHEER','Notification services')]+[(f'Product {i:02}','Additional product · demonstration placeholder') for i in range(6,21)],1)]
    totals=[390000,90080,54000]+list(allocate(66450,[1+(i%7)*.11 for i in range(73)]))
    names=['Saudi National Bank','Horizon Group','Excluded customer']+[f'VIP customer {i:03}' for i in range(4,77)]
    months=pd.date_range('2024-10-01','2026-09-01',freq='MS')
    current=months[12:]; w=np.array([.8,.8,.9,.9,.95,.95,1.2,1.15,1.1,1.1,1.05,1.1])
    customers=[]; links=[]; tx=[]
    stops={4:'2026-04-30',5:'2026-03-31',6:'2026-05-20',7:'2026-02-28',8:'2026-01-31',9:'2026-05-15',10:'2025-12-31'}
    first_products=['P02','P01','P04','P02','P03','P05','P01']
    for idx,(name,total) in enumerate(zip(names,totals),1):
        if idx==3:continue
        cid=f'C{idx:03}'
        first=pd.Timestamp('2020-03-01' if idx==1 else '2014-05-01' if idx==2 else '2026-06-01' if idx==76 else f'{2017+idx%8}-{1+idx%12:02}-01')
        created=first-pd.Timedelta(days=30)
        customers.append({'customer_id':cid,'name':name,'sector':['Fintech','Services','Logistics'][idx%3], 'created_at':created.strftime('%Y-%m-%d')})
        if idx==1: linked=[p['product_id'] for p in products if p['product_id']!='P08']; weights=[7,4, .6,.9,1]+[.3]*(len(linked)-5)
        elif idx in stops: linked=[first_products[idx-4]]; weights=[1]
        else: linked=[p['product_id'] for p in products[:(5 if idx==2 else 4 if idx==3 else 1+idx%5)]];weights=[1+i*.1 for i in range(len(linked))]
        product_totals=allocate(total,weights)
        # Yakeen has an exact 12,000 transactions for the featured customer.
        if idx==1:
            delta=12000-product_totals[linked.index('P03')];product_totals[0]-=delta;product_totals[linked.index('P03')]=12000
        for pi,(pid,ptotal) in enumerate(zip(linked,product_totals)):
            start=first+(pd.DateOffset(months=3*(int(pid[1:])-1)) if idx==1 else pd.DateOffset(months=min(pi,3)))
            # All links belong to the available history; no future demonstration links.
            if start>pd.Timestamp('2026-09-01'): start=first
            last=pd.Timestamp(stops[idx]) if idx in stops else pd.Timestamp('2026-09-27')
            links.append({'customer_id':cid,'product_id':pid,'first_use':start.strftime('%Y-%m-%d')})
            weights_month=w.copy();weights_month[current<start.replace(day=1)]=0
            weights_month[current>last.replace(day=1)]=0
            if weights_month.sum()==0:weights_month[-1]=1
            for month,n in zip(current,allocate(ptotal,weights_month)):
                if n:tx.append({'customer_id':cid,'product_id':pid,'month':month.strftime('%Y-%m-%d'),'transactions':int(n),'last_transaction':(last if month==last.replace(day=1) else month+pd.offsets.MonthEnd(0)).strftime('%Y-%m-%d')})
            prior_weights=w.copy();prior_months=months[:12];prior_weights[prior_months<start.replace(day=1)]=0
            if prior_weights.sum():
                for month,n in zip(prior_months,allocate(round(ptotal/1.201),prior_weights)):
                    if n:tx.append({'customer_id':cid,'product_id':pid,'month':month.strftime('%Y-%m-%d'),'transactions':int(n),'last_transaction':(month+pd.offsets.MonthEnd(0)).strftime('%Y-%m-%d')})
    ROOT.joinpath('data').mkdir(exist_ok=True)
    path=ROOT/'data/customer_journey.xlsx'
    # Synthetic same-category recommendation example: >75% peer coverage for P08.
    category=next(c['sector'] for c in customers if c['customer_id']=='C001')
    peers=[c['customer_id'] for c in customers if c['sector']==category and c['customer_id']!='C001']
    linked={l['customer_id'] for l in links if l['product_id']=='P08'}
    import math
    for peer in peers:
        if len(linked.intersection(peers))>=math.ceil(len(peers)*.8):break
        if peer not in linked:
            links.append({'customer_id':peer,'product_id':'P08','first_use':'2025-01-01'});linked.add(peer)
    with pd.ExcelWriter(path,engine='openpyxl') as writer:
        for name,rows in [('Customers',customers),('Products',products),('Relationships',links),('Transactions',tx)]:
            df=pd.DataFrame(rows);df.to_excel(writer,sheet_name=name,index=False)
            ws=writer.sheets[name];ws.freeze_panes='A2';ws.auto_filter.ref=ws.dimensions
            for cell in ws[1]:cell.fill=__import__('openpyxl').styles.PatternFill('solid',fgColor='14234F');cell.font=__import__('openpyxl').styles.Font(color='FFFFFF',bold=True)
            for col in ws.columns: ws.column_dimensions[col[0].column_letter].width=min(48,max(16,max(len(str(c.value or '')) for c in col)+2))
        pd.DataFrame([{'key':'as_of','value':'2026-09-30'},{'key':'source','value':'Synthetic example data; not Elm production records.'}]).to_excel(writer,sheet_name='Metadata',index=False)
    print(path)
if __name__=='__main__':build()
