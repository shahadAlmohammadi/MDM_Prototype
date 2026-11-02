import io,unittest
from pathlib import Path
import pandas as pd
from data_model import load_workbook,analytics
from assistant import answer
ROOT=Path(__file__).resolve().parent
class JourneyTests(unittest.TestCase):
 @classmethod
 def setUpClass(cls):cls.d=load_workbook(ROOT/'data/customer_journey.xlsx');cls.ctx={'start':'2025-10-01','end':'2026-09-01'}
 def test_rollup_reconciliation(self):
  a=analytics(self.d,self.ctx)
  self.assertEqual(a['total'],546530);self.assertEqual(sum(a['customer_totals']),a['total']);self.assertEqual(sum(a['product_totals']),a['total']);self.assertEqual(sum(a['monthly']),a['total']);self.assertEqual(len(a['customer_ids']),75)
 def test_featured_customer_and_product(self):
  a=analytics(self.d,dict(self.ctx,customer='C001'));self.assertEqual(a['total'],390000);self.assertEqual(a['product_totals']['P03'],12000)
 def test_locked_relationship_has_no_transactions(self):
  a=analytics(self.d,dict(self.ctx,customer='C001',products=['P08']));self.assertEqual(a['total'],0);self.assertTrue(a['links'].loc[a['links'].customer_id.eq('C001')].empty)
 def test_product_scope_denominator(self):
  a=analytics(self.d,dict(self.ctx,products=['P03']));self.assertEqual(set(a['rows'].product_id),{'P03'});self.assertEqual(a['total'],int(a['product_totals'].sum()))
 def test_inactive_threshold(self):
  a=analytics(self.d,self.ctx);self.assertEqual(len(a['inactive']),7);self.assertEqual(set(a['inactive']),{f'C{i:03}' for i in range(4,11)})
 def test_future_customer_excluded(self):
  a=analytics(self.d,{'start':'2025-10-01','end':'2026-05-01'});self.assertNotIn('C076',a['customer_ids'])
 def test_incomplete_growth_not_fabricated(self):
  a=analytics(self.d,{'start':'2024-10-01','end':'2025-09-01'});self.assertIsNone(a['growth'])
 def test_assistant_context(self):
  q=answer('How many transactions total?',self.d,dict(self.ctx,customer='C001'));self.assertIn('390,000',q);self.assertIn('Saudi National Bank',q)
 def test_invalid_upload_duplicates_rejected(self):
  path=ROOT/'data/customer_journey.xlsx';s=pd.read_excel(path,sheet_name=None);s['Relationships']=pd.concat([s['Relationships'],s['Relationships'].iloc[:1]])
  buf=io.BytesIO()
  with pd.ExcelWriter(buf,engine='openpyxl') as out:
   for k,df in s.items():df.to_excel(out,sheet_name=k,index=False)
  with self.assertRaisesRegex(ValueError,'unique'):load_workbook(buf.getvalue())
 def test_streamlit_mount_has_no_exceptions(self):
  from streamlit.testing.v1 import AppTest
  at=AppTest.from_file(str(ROOT/'app.py'),default_timeout=30).run()
  self.assertFalse(at.exception, str(at.exception))
if __name__=='__main__':unittest.main(verbosity=2)
