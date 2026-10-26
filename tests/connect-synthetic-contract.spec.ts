// Source-level regression checks; database fixture runtime checks are separate.
import {test,expect} from '@playwright/test';
import {readFileSync} from 'node:fs';
const read=(p:string)=>readFileSync(p,'utf8');
test('Trusted signed roles replace email classification while dataset isolation remains enforced',()=>{
 const protocol=read('supabase/functions/_shared/connectAuthorization.ts');
 const edge=read('supabase/functions/patient-sharing/index.ts');
 expect(protocol).not.toContain('ahmedmohamedelbasty20@gmail.com');
 expect(edge).not.toContain('connectActorModeAllowed');
 expect(edge).toContain('verifyConnectRequestAssertion');
 expect(edge).toContain('verifyConnectServerAuthorization(serverKey,secret,user.id,signedProof)');
 expect(edge).toContain('p_access_mode:accessMode');
 expect(edge).not.toContain("fail('RATE_LIMITED')");
 expect(edge).not.toContain("rpc('claim_patient_share_request'");
 const sql=read('supabase/migrations/20261025_patient_share_synthetic_contract.sql');
 const correction=read('supabase/migrations/20261026_patient_share_server_authorized_roles.sql');
 expect(correction).not.toContain('ahmedmohamedelbasty20@gmail.com');
 expect(correction).toContain("mode not in ('professional','synthetic_only')");
 expect(correction).toContain("current_setting('request.bigpharma_connect_actor',true)");
 expect(correction).toContain("until_time<=clock_timestamp()");
 expect(sql).toContain("i.data_class<>''synthetic_demo_v1''");
 expect(sql).toContain('patient_share_synthetic_payload');
});
test('Patient makes an explicitly synthetic invitation; old and normal invitations remain patient-class',()=>{
 expect(read('app/share-medication-profile.tsx')).not.toContain('Generate Synthetic Test QR');
 expect(read('app/share-medication-profile.tsx')).toContain('Generate Secure QR Code');
 expect(read('supabase/functions/patient-sharing/index.ts')).toContain("dataset=body.dataset??'patient'");
 expect(read('services/patientSharingService.ts')).toContain("dataset: SharingDataset = 'patient'");
 const sql=read('supabase/migrations/20261025_patient_share_synthetic_contract.sql');
 expect(sql).toContain("default 'patient'");
 expect(sql).toContain("where id=(result->>'id')::uuid and user_id=p_actor");
 const fixture=sql.split('create or replace function public.patient_share_synthetic_payload')[1].split('revoke all on function public.patient_share_synthetic_payload')[0];
 for(const sensitive of ['from public.user_medications','from auth.users','storage.objects','from public.reminder_events'])expect(fixture).not.toContain(sensitive);
 expect(fixture).toContain('synthetic.patient@example.invalid');
 expect(fixture).toContain("'photo_available',false");
});
