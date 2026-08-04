create extension if not exists pgcrypto with schema extensions;

insert into public.skills (skill_id, name) values
  ('go', 'Go'),
  ('kubernetes', 'Kubernetes'),
  ('redis', 'Redis'),
  ('figma', 'Figma'),
  ('framer', 'Framer'),
  ('product-design', 'Product Design'),
  ('python', 'Python'),
  ('llms', 'LLMs'),
  ('nlp', 'NLP'),
  ('seo', 'SEO'),
  ('content-strategy', 'Content Strategy'),
  ('ads', 'Ads'),
  ('fintech', 'Fintech'),
  ('strategy', 'Strategy'),
  ('agile', 'Agile'),
  ('react', 'React'),
  ('nodejs', 'Node.js'),
  ('typescript', 'TypeScript'),
  ('pytorch', 'PyTorch'),
  ('scikit-learn', 'Scikit-learn'),
  ('aws', 'AWS')
on conflict (skill_id) do nothing;

create or replace function public._seed_company_auth(
  p_id uuid,
  p_email text,
  p_full_name text,
  p_company_name text,
  p_industry text
) returns void
language plpgsql
security definer
set search_path = public, extensions
as $$
begin
  if not exists (select 1 from auth.users where id = p_id) then
    insert into auth.users (
      instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
      raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
      confirmation_token, recovery_token, email_change_token_new, email_change
    ) values (
      '00000000-0000-0000-0000-000000000000',
      p_id,
      'authenticated',
      'authenticated',
      p_email,
      crypt('company1234', gen_salt('bf')),
      now(),
      '{"provider":"email","providers":["email"]}'::jsonb,
      jsonb_build_object('role', 'company', 'full_name', p_full_name),
      now(), now(), '', '', '', ''
    );

    insert into auth.identities (
      id, user_id, identity_data, provider, provider_id, last_sign_in_at, created_at, updated_at
    ) values (
      gen_random_uuid(),
      p_id,
      jsonb_build_object('sub', p_id::text, 'email', p_email),
      'email',
      p_id::text,
      now(), now(), now()
    );
  end if;

  insert into public.users (user_id, email, full_name, role)
  values (p_id, p_email, p_full_name, 'company')
  on conflict (user_id) do update
    set email = excluded.email, full_name = excluded.full_name, role = 'company';

  insert into public.companies (user_id, company_name, industry, verification_status)
  values (p_id, p_company_name, p_industry, true)
  on conflict (user_id) do update
    set company_name = excluded.company_name,
        industry = excluded.industry,
        verification_status = true;
end;
$$;


select public._seed_company_auth('a1000000-0000-4000-8000-000000000001'::uuid, 'agoda@company.unipro.example.com', 'Agoda Recruiter', 'Agoda', 'Travel Tech');
select public._seed_company_auth('a1000000-0000-4000-8000-000000000002'::uuid, 'lineman@company.unipro.example.com', 'Lineman Recruiter', 'Lineman Wongnai', 'Food Delivery');
select public._seed_company_auth('a1000000-0000-4000-8000-000000000003'::uuid, 'scb10x@company.unipro.example.com', 'SCB 10X Recruiter', 'SCB 10X', 'Fintech / AI');
select public._seed_company_auth('a1000000-0000-4000-8000-000000000004'::uuid, 'shopee@company.unipro.example.com', 'Shopee Recruiter', 'Shopee Thailand', 'E-commerce');
select public._seed_company_auth('a1000000-0000-4000-8000-000000000005'::uuid, 'kbtg@company.unipro.example.com', 'KBTG Recruiter', 'KBTG', 'Banking Tech');
select public._seed_company_auth('a1000000-0000-4000-8000-000000000006'::uuid, 'sevenpeaks@company.unipro.example.com', 'Seven Peaks Recruiter', 'Seven Peaks Software', 'Software Consulting');
select public._seed_company_auth('a1000000-0000-4000-8000-000000000007'::uuid, 'omise@company.unipro.example.com', 'Omise Recruiter', 'Omise', 'Payments');

-- Internships (idempotent by fixed ids)
insert into public.internships (
  internship_id, company_id, title, description, location, work_type, duration, category, stipend, status, posted_date, deadline, tags
) values
(
  'b1000000-0000-4000-8000-000000000001'::uuid,
  'a1000000-0000-4000-8000-000000000001'::uuid,
  'Distributed Systems Associate',
  'Build the backbone of modern infrastructure. Focus on low-latency data streams and scaling global travel systems.',
  'Bangkok', 'onsite', '3-6 months', 'Software Development', '฿25,000/mo', 'open',
  '2024-03-01', '2024-04-15', '["Go","Kubernetes","Redis"]'::jsonb
),
(
  'b1000000-0000-4000-8000-000000000002'::uuid,
  'a1000000-0000-4000-8000-000000000002'::uuid,
  'UI/UX Design Intern',
  'Define the physical language of virtual objects. Master the art of fluid interactions for millions of users.',
  'Bangkok', 'hybrid', '4 months', 'Design', '฿18,000/mo', 'open',
  '2024-03-05', '2024-04-20', '["Figma","Framer","Product Design"]'::jsonb
),
(
  'b1000000-0000-4000-8000-000000000003'::uuid,
  'a1000000-0000-4000-8000-000000000003'::uuid,
  'Data Science Intern',
  'Work at the intersection of ethics and architecture. Fine-tune the future of cognition for Southeast Asian languages.',
  'Bangkok', 'onsite', '6 months', 'Data Science', '฿30,000/mo', 'open',
  '2024-02-28', '2024-03-30', '["Python","LLMs","NLP"]'::jsonb
),
(
  'b1000000-0000-4000-8000-000000000004'::uuid,
  'a1000000-0000-4000-8000-000000000004'::uuid,
  'Digital Marketing Strategist',
  'Drive user acquisition and engagement through data-backed marketing strategies and campaign operations.',
  'Bangkok', 'remote', '3 months', 'Marketing', '฿15,000/mo', 'open',
  '2024-03-10', '2024-05-01', '["SEO","Content Strategy","Ads"]'::jsonb
),
(
  'b1000000-0000-4000-8000-000000000005'::uuid,
  'a1000000-0000-4000-8000-000000000005'::uuid,
  'Business Development Intern',
  'Analyze digital transformation trends in the banking sector. Help define the future of mobile payments.',
  'Nonthaburi', 'hybrid', '6 months', 'Business', '฿22,000/mo', 'open',
  '2024-03-02', '2024-04-10', '["Fintech","Strategy","Agile"]'::jsonb
),
(
  'b1000000-0000-4000-8000-000000000006'::uuid,
  'a1000000-0000-4000-8000-000000000006'::uuid,
  'Full Stack Developer',
  'Join an international team building enterprise-grade applications using React and Node.js.',
  'Bangkok', 'onsite', '4-6 months', 'Software Development', '฿20,000/mo', 'open',
  '2024-03-08', '2024-04-25', '["React","Node.js","TypeScript"]'::jsonb
),
(
  'b1000000-0000-4000-8000-000000000007'::uuid,
  'a1000000-0000-4000-8000-000000000007'::uuid,
  'Machine Learning Engineer',
  'Help develop fraud detection models and automated payment routing algorithms.',
  'Phuket', 'remote', '6 months', 'Data Science', '฿28,000/mo', 'open',
  '2024-03-12', '2024-05-15', '["PyTorch","Scikit-learn","AWS"]'::jsonb
)
on conflict (internship_id) do nothing;

insert into public.internship_skills (internship_id, skill_id) values
  ('b1000000-0000-4000-8000-000000000001', 'go'),
  ('b1000000-0000-4000-8000-000000000001', 'kubernetes'),
  ('b1000000-0000-4000-8000-000000000001', 'redis'),
  ('b1000000-0000-4000-8000-000000000002', 'figma'),
  ('b1000000-0000-4000-8000-000000000002', 'framer'),
  ('b1000000-0000-4000-8000-000000000002', 'product-design'),
  ('b1000000-0000-4000-8000-000000000003', 'python'),
  ('b1000000-0000-4000-8000-000000000003', 'llms'),
  ('b1000000-0000-4000-8000-000000000003', 'nlp'),
  ('b1000000-0000-4000-8000-000000000004', 'seo'),
  ('b1000000-0000-4000-8000-000000000004', 'content-strategy'),
  ('b1000000-0000-4000-8000-000000000004', 'ads'),
  ('b1000000-0000-4000-8000-000000000005', 'fintech'),
  ('b1000000-0000-4000-8000-000000000005', 'strategy'),
  ('b1000000-0000-4000-8000-000000000005', 'agile'),
  ('b1000000-0000-4000-8000-000000000006', 'react'),
  ('b1000000-0000-4000-8000-000000000006', 'nodejs'),
  ('b1000000-0000-4000-8000-000000000006', 'typescript'),
  ('b1000000-0000-4000-8000-000000000007', 'pytorch'),
  ('b1000000-0000-4000-8000-000000000007', 'scikit-learn'),
  ('b1000000-0000-4000-8000-000000000007', 'aws')
on conflict do nothing;

drop function if exists public._seed_company_auth(uuid, text, text, text, text);
