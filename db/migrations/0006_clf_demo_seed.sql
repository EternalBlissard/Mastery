-- Mastery demo seed: CLF-C02 certification, four domain objectives, link demo goal, backfill item objectives.
-- Fixed UUIDs align with UI placeholders (user …001, goal …002).

INSERT INTO certifications (id, name, code, provider)
VALUES (
  '00000000-0000-4000-8000-000000000010'::uuid,
  'AWS Certified Cloud Practitioner',
  'CLF-C02',
  'AWS'
)
ON CONFLICT (code) DO UPDATE SET
  name = EXCLUDED.name,
  provider = EXCLUDED.provider;

INSERT INTO users (id, email, name)
VALUES (
  '00000000-0000-4000-8000-000000000001'::uuid,
  'demo@mastery.local',
  'Demo User'
)
ON CONFLICT (email) DO NOTHING;

INSERT INTO objectives (id, certification_id, code, title, description, weight_pct, sequence)
VALUES
  (
    '00000000-0000-4000-8000-000000000011'::uuid,
    '00000000-0000-4000-8000-000000000010'::uuid,
    'CLF-C02-D1',
    'Cloud Concepts',
    'Understand the AWS Cloud value proposition, economics, architecture, and shared responsibility.',
    24,
    1
  ),
  (
    '00000000-0000-4000-8000-000000000012'::uuid,
    '00000000-0000-4000-8000-000000000010'::uuid,
    'CLF-C02-D2',
    'Security and Compliance',
    'Understand AWS security, compliance concepts, and access management capabilities.',
    30,
    2
  ),
  (
    '00000000-0000-4000-8000-000000000013'::uuid,
    '00000000-0000-4000-8000-000000000010'::uuid,
    'CLF-C02-D3',
    'Cloud Technology and Services',
    'Understand core AWS services, deployment models, and technology use cases.',
    34,
    3
  ),
  (
    '00000000-0000-4000-8000-000000000014'::uuid,
    '00000000-0000-4000-8000-000000000010'::uuid,
    'CLF-C02-D4',
    'Billing, Pricing, and Support',
    'Understand AWS pricing models, account management, and support plans.',
    12,
    4
  )
ON CONFLICT (id) DO UPDATE SET
  certification_id = EXCLUDED.certification_id,
  code = EXCLUDED.code,
  title = EXCLUDED.title,
  description = EXCLUDED.description,
  weight_pct = EXCLUDED.weight_pct,
  sequence = EXCLUDED.sequence;

UPDATE goals
SET certification_id = '00000000-0000-4000-8000-000000000010'::uuid
WHERE id = '00000000-0000-4000-8000-000000000002'::uuid;

UPDATE items i
SET objective_id = mapped.objective_id
FROM (
  SELECT
    i2.id AS item_id,
    o.id AS objective_id
  FROM (
    SELECT id, ROW_NUMBER() OVER (ORDER BY created_at) - 1 AS rn
    FROM items
    WHERE goal_id = '00000000-0000-4000-8000-000000000002'::uuid
      AND objective_id IS NULL
  ) i2
  JOIN (
    SELECT id, ROW_NUMBER() OVER (ORDER BY sequence) - 1 AS rn
    FROM objectives
    WHERE certification_id = '00000000-0000-4000-8000-000000000010'::uuid
  ) o ON o.rn = (i2.rn % 4)
) mapped
WHERE i.id = mapped.item_id;
