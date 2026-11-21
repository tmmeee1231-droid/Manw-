-- MANW: ترقية حساب المشرف الأساسي
-- شغّل هذا الملف من Supabase SQL Editor بعد إنشاء حساب Google بهذا البريد مرة واحدة.
-- لا تضع أي كلمة مرور أو Client Secret في هذا الملف أو في GitHub.

begin;

insert into public.student_profiles (user_id, full_name, phone, role)
select
  u.id,
  coalesce(u.raw_user_meta_data->>'full_name', u.raw_user_meta_data->>'name'),
  u.phone,
  'admin'
from auth.users as u
where lower(u.email) = lower('tmmeee1231@gmail.com')
on conflict (user_id) do update
set role = 'admin';

-- يعرض نتيجة الترقية؛ إذا لم يظهر صف، سجّل الدخول بحساب Google أولاً ثم أعد تشغيل الملف.
select
  u.email,
  p.full_name,
  p.role,
  p.is_banned
from auth.users as u
join public.student_profiles as p on p.user_id = u.id
where lower(u.email) = lower('tmmeee1231@gmail.com');

commit;
