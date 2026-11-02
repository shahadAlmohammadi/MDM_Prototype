"""Validated Excel boundary and shared analytics for the customer journey workspace."""
from __future__ import annotations
import io
import pandas as pd

REQUIRED={
 'Customers':{'customer_id','name','sector','created_at'},
 'Products':{'product_id','name','description','mdm_ready'},
 'Relationships':{'customer_id','product_id','first_use'},
 'Transactions':{'customer_id','product_id','month','transactions','last_transaction'},
}

def load_workbook(source):
    sheets=pd.read_excel(io.BytesIO(source) if isinstance(source,bytes) else source,sheet_name=None)
    for name,columns in REQUIRED.items():
        if name not in sheets:raise ValueError(f'Missing sheet: {name}')
        missing=columns-set(sheets[name].columns)
        if missing:raise ValueError(f'{name}: missing columns {", ".join(sorted(missing))}')
        if sheets[name][list(columns)].isna().any().any():raise ValueError(f'{name}: required fields contain blanks.')
    c,p,l,t=(sheets[k].copy() for k in REQUIRED)
    for df,col in [(c,'customer_id'),(p,'product_id')]:
        if df[col].duplicated().any():raise ValueError(f'Duplicate {col} in master data.')
    if l.duplicated(['customer_id','product_id']).any():raise ValueError('Relationships must be unique per customer and product.')
    if t.duplicated(['customer_id','product_id','month']).any():raise ValueError('Transactions must be unique per customer, product and month.')
    for df in [c,l,t]:
        for col in ['customer_id','product_id']:
            if col in df:df[col]=df[col].astype(str)
    p.product_id=p.product_id.astype(str)
    for df in [l,t]:
        if not set(df.customer_id)<=set(c.customer_id) or not set(df.product_id)<=set(p.product_id):raise ValueError('Unknown customer or product ID.')
    for df,col in [(c,'created_at'),(l,'first_use'),(t,'month'),(t,'last_transaction')]:
        df[col]=pd.to_datetime(df[col],errors='coerce')
        if df[col].isna().any():raise ValueError(f'Invalid date in {col}.')
    t.transactions=pd.to_numeric(t.transactions,errors='coerce')
    if t.transactions.isna().any() or (t.transactions<0).any() or (t.transactions%1!=0).any():raise ValueError('Transaction counts must be nonnegative whole numbers.')
    t.transactions=t.transactions.astype(int)
    if (t.month.dt.day!=1).any():raise ValueError('month must be the first day of each month.')
    if not t.month.dt.to_period('M').eq(t.last_transaction.dt.to_period('M')).all():raise ValueError('last_transaction must be within its transaction month.')
    check=t.merge(l,on=['customer_id','product_id'],how='left',validate='many_to_one')
    if check.first_use.isna().any():raise ValueError('Every transaction requires a linked relationship.')
    if (check.month.dt.to_period('M')<check.first_use.dt.to_period('M')).any():raise ValueError('Transactions precede recorded first use.')
    created=l.merge(c[['customer_id','created_at']],on='customer_id',validate='many_to_one')
    if (created.first_use<created.created_at).any():raise ValueError('First use precedes customer creation.')
    truth={'true':True,'1':True,'yes':True,'false':False,'0':False,'no':False}
    p.mdm_ready=p.mdm_ready.astype(str).str.lower().map(truth)
    if p.mdm_ready.isna().any():raise ValueError('mdm_ready must be true or false.')
    if t.empty:raise ValueError('At least one transaction row is required.')
    payload={name:df.to_dict('records') for name,df in zip(REQUIRED,[c,p,l,t])}
    for name,rows in payload.items():
        for r in rows:
            for k,v in r.items():
                if isinstance(v,pd.Timestamp):r[k]=v.strftime('%Y-%m-%d')
    payload['min_month']=t.month.min().strftime('%Y-%m-%d');payload['max_month']=t.month.max().strftime('%Y-%m-%d')
    payload['as_of']=(t.month.max()+pd.offsets.MonthEnd(0)).strftime('%Y-%m-%d')
    return payload

def analytics(data,context=None):
    ctx=context or {};start=pd.Timestamp(ctx.get('start') or data['max_month'])
    if not ctx.get('start'):start=start-pd.DateOffset(months=11)
    end=pd.Timestamp(ctx.get('end') or data['max_month']);asof=end+pd.offsets.MonthEnd(0)
    t=pd.DataFrame(data['Transactions']);t.month=pd.to_datetime(t.month);t.last_transaction=pd.to_datetime(t.last_transaction)
    c=pd.DataFrame(data['Customers']);p=pd.DataFrame(data['Products']);l=pd.DataFrame(data['Relationships']);l.first_use=pd.to_datetime(l.first_use)
    scope=ctx.get('products') or [];cid=ctx.get('customer')
    eligible=l[l.first_use.le(asof)]
    if scope:eligible=eligible[eligible.product_id.isin(scope)]
    customer_ids=set(eligible.customer_id)
    if cid:customer_ids&={cid}
    rows=t[t.customer_id.isin(customer_ids)&t.month.between(start,end)]
    history=t[t.customer_id.isin(customer_ids)&t.month.le(end)]
    if scope:rows=rows[rows.product_id.isin(scope)];history=history[history.product_id.isin(scope)]
    totals=rows.groupby('customer_id').transactions.sum().sort_values(ascending=False)
    ptot=rows.groupby('product_id').transactions.sum().sort_values(ascending=False)
    mtot=rows.groupby('month').transactions.sum().sort_index()
    first=eligible[eligible.customer_id.isin(customer_ids)].groupby('customer_id').first_use.min()
    months=(end.year-start.year)*12+end.month-start.month+1
    ps=start-pd.DateOffset(months=months);pe=start-pd.DateOffset(months=1)
    prior=t[t.customer_id.isin(customer_ids)&t.month.between(ps,pe)]
    if scope:prior=prior[prior.product_id.isin(scope)]
    prev=int(prior.transactions.sum());complete=ps>=pd.Timestamp(data['min_month'])
    cutoff=asof-pd.DateOffset(months=4)
    last=history[history.transactions.gt(0)].groupby('customer_id').last_transaction.max()
    inactive={i:d for i,d in last.items() if d<=cutoff}
    return dict(total=int(rows.transactions.sum()),customer_ids=customer_ids,customers=c,products=p,links=eligible,rows=rows,first=first,last=last,inactive=inactive,customer_totals=totals,product_totals=ptot,monthly=mtot,growth=(int(rows.transactions.sum())/prev-1)*100 if prev and complete else None,start=start,end=end,asof=asof)
