from __future__ import annotations
import base64,hashlib,os
from pathlib import Path
import streamlit as st
from data_model import load_workbook
from assistant import answer,optional_ai

ROOT=Path(__file__).resolve().parent
st.set_page_config(page_title='Elm · Customer intelligence',page_icon='✦',layout='wide',initial_sidebar_state='collapsed')
st.markdown('''<style>[data-testid="stHeader"],footer{display:none}.stMainBlockContainer{padding:0!important;max-width:none!important}.stMain{background:#f3f6fc}[data-testid="stVerticalBlock"]{gap:0}body{margin:0}</style>''',unsafe_allow_html=True)
@st.cache_data(show_spinner=False)
def read_data(raw):return load_workbook(raw)
@st.cache_data(show_spinner=False)
def asset_payload():
    result={}
    for p in (ROOT/'assets').iterdir():
        if p.suffix.lower() not in ['.svg','.png','.jpg','.jpeg','.woff2']:continue
        mime={'.svg':'image/svg+xml','.png':'image/png','.jpg':'image/jpeg','.jpeg':'image/jpeg','.woff2':'font/woff2'}[p.suffix.lower()]
        result[p.name]='data:'+mime+';base64,'+base64.b64encode(p.read_bytes()).decode()
    return result

st.session_state.setdefault('workbook_bytes',(ROOT/'data/customer_journey.xlsx').read_bytes())
st.session_state.setdefault('replies',[])
st.session_state.setdefault('ai_enabled',False)
raw=st.session_state.workbook_bytes
try:data=read_data(raw)
except ValueError as exc:st.error(str(exc));st.stop()

workspace=st.components.v2.component('elm_page8_workspace',html='<div id="elm-app" aria-label="Elm customer intelligence"></div>',css=(ROOT/'frontend/styles.css').read_text(encoding='utf-8'),js=(ROOT/'frontend/workspace.js').read_text(encoding='utf-8'))
result=workspace(key='elm_workspace',data={'dataset':data,'assets':asset_payload(),'version':hashlib.sha256(raw).hexdigest()[:16],'replies':st.session_state.replies,'ai':st.session_state.ai_enabled},default={'ask':None,'settings':None},on_ask_change=lambda:None,on_settings_change=lambda:None,height='content')

if result.ask and result.ask.get('id')!=st.session_state.get('last_question_id'):
    request=result.ask;st.session_state.last_question_id=request['id']
    response=answer(str(request.get('question',''))[:2000],data,request.get('context',{}))
    if st.session_state.ai_enabled:
        response=optional_ai(request['question'],response,os.getenv('OPENAI_API_KEY',''),os.getenv('OPENAI_MODEL','gpt-4.1-mini'))
    st.session_state.replies.append({'id':request['id'],'question':request['question'],'answer':response})
    st.session_state.replies=st.session_state.replies[-30:]
    st.rerun()

@st.dialog('Data & assistant',width='large')
def data_settings():
    st.write('The app starts with the included synthetic Excel workbook. Replace it with your own workbook using the same four-sheet schema.')
    upload=st.file_uploader('Excel workbook',type=['xlsx'])
    if upload:
        try:
            check=read_data(upload.getvalue())
            st.success(f"Validated: {len(check['Customers'])} customers, {len(check['Products'])} products.")
            if st.button('Use this workbook',type='primary'):
                st.session_state.workbook_bytes=upload.getvalue();st.session_state.replies=[];st.rerun()
        except Exception as exc:st.error(str(exc))
    st.download_button('Download current workbook',data=st.session_state.workbook_bytes,file_name='customer_journey.xlsx',mime='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
    st.divider()
    st.caption('Local data assistant works without an API key. Optional AI wording sends only your question and the computed answer to OpenAI; enable only if permitted for your data.')
    st.checkbox('Use optional AI wording',key='ai_enabled',disabled=not bool(os.getenv('OPENAI_API_KEY')))
    if not os.getenv('OPENAI_API_KEY'):st.caption('Optional: set OPENAI_API_KEY and OPENAI_MODEL in your server environment. No key is included in the project.')
    st.caption('Design reference: Figma MDM · page 8. This is a Streamlit app with an editable HTML/CSS/JS component for precise alignment. No Node.js build is required.')

if result.settings:data_settings()
