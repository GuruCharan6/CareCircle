-- ============================================
-- FILE: Seed Data
-- DESCRIPTION: Static reference data for drug_generic_lookup.
--              India-specific brand → generic translation table.
--              Source: CIMS / 1mg database.
--              Also populates body_systems classification per drug class.
-- ============================================

-- ============================================
-- SECTION 1: Drug Generic Lookup (brand → generic)
-- ============================================

INSERT INTO public.drug_generic_lookup (brand_name, generic_name, drug_class, manufacturer, data_source)
VALUES

-- ── Diabetes ─────────────────────────────────────────────────
('Glycomet',        'Metformin',        'Biguanide',                    'USV',              'CIMS'),
('Glycomet GP',     'Metformin+Glipizide', 'Biguanide+Sulfonylurea',   'USV',              'CIMS'),
('Glucophage',      'Metformin',        'Biguanide',                    'Merck',            'CIMS'),
('Gluformin',       'Metformin',        'Biguanide',                    'Alkem',            'CIMS'),
('Amaryl',          'Glimepiride',      'Sulfonylurea',                 'Sanofi',           'CIMS'),
('Amaryl M',        'Glimepiride+Metformin', 'Sulfonylurea+Biguanide', 'Sanofi',           'CIMS'),
('Glynase',         'Glipizide',        'Sulfonylurea',                 'Pfizer',           'CIMS'),
('Daonil',          'Glibenclamide',    'Sulfonylurea',                 'Sanofi',           'CIMS'),
('Pioz',            'Pioglitazone',     'Thiazolidinedione',            'Torrent',          'CIMS'),
('Actos',           'Pioglitazone',     'Thiazolidinedione',            'Eli Lilly',        'CIMS'),
('Januvia',         'Sitagliptin',      'DPP-4 Inhibitor',              'MSD',              'CIMS'),
('Galvus',          'Vildagliptin',     'DPP-4 Inhibitor',              'Novartis',         'CIMS'),
('Zita',            'Teneligliptin',    'DPP-4 Inhibitor',              'Glenmark',         'CIMS'),
('Volix',           'Voglibose',        'Alpha-glucosidase Inhibitor',  'Biocon',           'CIMS'),
('Victoza',         'Liraglutide',      'GLP-1 Agonist',                'Novo Nordisk',     'CIMS'),
('Forxiga',         'Dapagliflozin',    'SGLT2 Inhibitor',              'AstraZeneca',      'CIMS'),
('Jardiance',       'Empagliflozin',    'SGLT2 Inhibitor',              'Boehringer',       'CIMS'),
('Invokana',        'Canagliflozin',    'SGLT2 Inhibitor',              'Janssen',          'CIMS'),

-- ── Hypertension ─────────────────────────────────────────────
('Telma',           'Telmisartan',      'ARB',                          'Glenmark',         'CIMS'),
('Telma H',         'Telmisartan+Hydrochlorothiazide', 'ARB+Diuretic', 'Glenmark',         'CIMS'),
('Telmikind',       'Telmisartan',      'ARB',                          'Mankind',          'CIMS'),
('Olsar',           'Olmesartan',       'ARB',                          'Torrent',          'CIMS'),
('Benicar',         'Olmesartan',       'ARB',                          'Daiichi Sankyo',   'CIMS'),
('Repace',          'Losartan',         'ARB',                          'Sun Pharma',       'CIMS'),
('Cosart',          'Losartan',         'ARB',                          'Cipla',            'CIMS'),
('Stamlo',          'Amlodipine',       'Calcium Channel Blocker',      'Dr. Reddys',       'CIMS'),
('Amlokind',        'Amlodipine',       'Calcium Channel Blocker',      'Mankind',          'CIMS'),
('Norvasc',         'Amlodipine',       'Calcium Channel Blocker',      'Pfizer',           'CIMS'),
('Amlopin',         'Amlodipine',       'Calcium Channel Blocker',      'Torrent',          'CIMS'),
('Metolar',         'Metoprolol',       'Beta Blocker',                 'Cipla',            'CIMS'),
('Metpure',         'Metoprolol',       'Beta Blocker',                 'Unichem',          'CIMS'),
('Betaloc',         'Metoprolol',       'Beta Blocker',                 'AstraZeneca',      'CIMS'),
('Concor',          'Bisoprolol',       'Beta Blocker',                 'Merck',            'CIMS'),
('Carvipress',      'Carvedilol',       'Alpha+Beta Blocker',           'Cipla',            'CIMS'),
('Cardivas',        'Carvedilol',       'Alpha+Beta Blocker',           'Sun Pharma',       'CIMS'),
('Nebicard',        'Nebivolol',        'Beta Blocker',                 'Torrent',          'CIMS'),
('Lasix',           'Furosemide',       'Loop Diuretic',                'Sanofi',           'CIMS'),
('Aldactone',       'Spironolactone',   'Potassium-sparing Diuretic',   'Pfizer',           'CIMS'),
('Dytor',           'Torsemide',        'Loop Diuretic',                'Cipla',            'CIMS'),

-- ── Cardiac ───────────────────────────────────────────────────
('Ecosprin',        'Aspirin',          'Antiplatelet',                 'USV',              'CIMS'),
('Deplatt',         'Clopidogrel',      'Antiplatelet',                 'Torrent',          'CIMS'),
('Plavix',          'Clopidogrel',      'Antiplatelet',                 'Sanofi',           'CIMS'),
('Rosuvas',         'Rosuvastatin',     'Statin',                       'Sun Pharma',       'CIMS'),
('Crestor',         'Rosuvastatin',     'Statin',                       'AstraZeneca',      'CIMS'),
('Atorva',          'Atorvastatin',     'Statin',                       'Zydus',            'CIMS'),
('Lipitor',         'Atorvastatin',     'Statin',                       'Pfizer',           'CIMS'),
('Storvas',         'Atorvastatin',     'Statin',                       'Ranbaxy',          'CIMS'),
('Sorvas',          'Atorvastatin',     'Statin',                       'Sun Pharma',       'CIMS'),
('Dilzem',          'Diltiazem',        'Calcium Channel Blocker',      'Torrent',          'CIMS'),
('Isordil',         'Isosorbide Dinitrate', 'Nitrate',                  'Pfizer',           'CIMS'),
('Imdur',           'Isosorbide Mononitrate', 'Nitrate',               'AstraZeneca',      'CIMS'),
('Lanoxin',         'Digoxin',          'Cardiac Glycoside',            'Aspen',            'CIMS'),
('Digoxin',         'Digoxin',          'Cardiac Glycoside',            'Various',          'manual_entry'),
('Ramipril',        'Ramipril',         'ACE Inhibitor',                'Various',          'manual_entry'),
('Cardace',         'Ramipril',         'ACE Inhibitor',                'Sanofi',           'CIMS'),
('Hopace',          'Ramipril',         'ACE Inhibitor',                'Cipla',            'CIMS'),
('Lisinopril',      'Lisinopril',       'ACE Inhibitor',                'Various',          'manual_entry'),
('Listril',         'Lisinopril',       'ACE Inhibitor',                'Torrent',          'CIMS'),
('Enalapril',       'Enalapril',        'ACE Inhibitor',                'Various',          'manual_entry'),
('Envas',           'Enalapril',        'ACE Inhibitor',                'Cipla',            'CIMS'),

-- ── Thyroid ───────────────────────────────────────────────────
('Thyronorm',       'Levothyroxine',    'Thyroid Hormone',              'Abbott',           'CIMS'),
('Eltroxin',        'Levothyroxine',    'Thyroid Hormone',              'GSK',              'CIMS'),

-- ── GI / Acid ─────────────────────────────────────────────────
('Pan',             'Pantoprazole',     'Proton Pump Inhibitor',        'Alkem',            'CIMS'),
('Pantocid',        'Pantoprazole',     'Proton Pump Inhibitor',        'Sun Pharma',       'CIMS'),
('Nexpro',          'Esomeprazole',     'Proton Pump Inhibitor',        'Torrent',          'CIMS'),
('Omez',            'Omeprazole',       'Proton Pump Inhibitor',        'Dr. Reddys',       'CIMS'),
('Razo',            'Rabeprazole',      'Proton Pump Inhibitor',        'Sun Pharma',       'CIMS'),

-- ── Pain / Anti-inflammatory ──────────────────────────────────
('Voveran',         'Diclofenac',       'NSAID',                        'Novartis',         'CIMS'),
('Brufen',          'Ibuprofen',        'NSAID',                        'Abbott',           'CIMS'),
('Crocin',          'Paracetamol',      'Analgesic/Antipyretic',        'GSK',              'CIMS'),
('Dolo',            'Paracetamol',      'Analgesic/Antipyretic',        'Micro Labs',       'CIMS'),
('Combiflam',       'Ibuprofen+Paracetamol', 'NSAID+Analgesic',        'Sanofi',           'CIMS'),

-- ── Anticoagulants ────────────────────────────────────────────
('Warfarin',        'Warfarin',         'Anticoagulant',                'Various',          'manual_entry'),
('Acitrom',         'Acenocoumarol',    'Anticoagulant',                'Sun Pharma',       'CIMS'),
('Xarelto',         'Rivaroxaban',      'Anticoagulant',                'Bayer',            'CIMS'),
('Eliquis',         'Apixaban',         'Anticoagulant',                'BMS/Pfizer',       'CIMS'),

-- ── Vitamins / Supplements ────────────────────────────────────
('Shelcal',         'Calcium+Vitamin D3', 'Supplement',                'Elder',            'CIMS'),
('Calcirol',        'Cholecalciferol',  'Vitamin D3',                   'Stadmed',          'CIMS'),
('Nervijen',        'Methylcobalamin',  'Vitamin B12',                  'Sun Pharma',       'CIMS'),
('Neurobion',       'Vitamin B Complex', 'Vitamin B Complex',           'Merck',            'CIMS')

ON CONFLICT (brand_name) DO NOTHING;


-- ============================================
-- SECTION 2: Body Systems Classification
-- ============================================
-- Populates body_systems[] on drug_generic_lookup by drug class.
-- Used for medication list display and filtering.

-- Diabetes / Metabolic
UPDATE public.drug_generic_lookup
  SET body_systems = ARRAY['Diabetes', 'Metabolic']
  WHERE drug_class ILIKE '%biguanide%'
     OR drug_class ILIKE '%sulfonylurea%'
     OR drug_class ILIKE '%dpp-4%'
     OR drug_class ILIKE '%thiazolidinedione%'
     OR drug_class ILIKE '%glp-1%'
     OR drug_class ILIKE '%alpha-glucosidase%';

-- SGLT2 inhibitors — dual benefit: diabetes + cardioprotective
UPDATE public.drug_generic_lookup
  SET body_systems = ARRAY['Diabetes', 'Heart']
  WHERE drug_class ILIKE '%sglt2%';

-- Cardiac — pure heart function
UPDATE public.drug_generic_lookup
  SET body_systems = ARRAY['Heart']
  WHERE drug_class ILIKE '%nitrate%'
     OR drug_class ILIKE '%cardiac glycoside%';

-- Heart + BP (antihypertensives / anti-arrhythmics)
UPDATE public.drug_generic_lookup
  SET body_systems = ARRAY['Heart', 'BP']
  WHERE drug_class ILIKE '%arb%' AND drug_class NOT ILIKE '%diuretic%'
     OR drug_class ILIKE '%beta blocker%'
     OR drug_class ILIKE '%alpha%blocker%'
     OR drug_class ILIKE '%calcium channel blocker%';

-- ACE Inhibitors — heart + BP + kidney protection
UPDATE public.drug_generic_lookup
  SET body_systems = ARRAY['Heart', 'BP', 'Kidney']
  WHERE drug_class ILIKE '%ace inhibitor%';

-- ARB + Diuretic combo
UPDATE public.drug_generic_lookup
  SET body_systems = ARRAY['Heart', 'BP', 'Kidney']
  WHERE drug_class ILIKE '%arb%' AND drug_class ILIKE '%diuretic%';

-- Diuretics
UPDATE public.drug_generic_lookup
  SET body_systems = ARRAY['Heart', 'Kidney']
  WHERE drug_class ILIKE '%loop diuretic%'
     OR drug_class ILIKE '%potassium-sparing diuretic%'
     OR drug_class ILIKE '%diuretic%'
    AND body_systems = '{}';        -- don't overwrite ARB+Diuretic already set

-- Statins / Cholesterol
UPDATE public.drug_generic_lookup
  SET body_systems = ARRAY['Heart', 'Cholesterol']
  WHERE drug_class ILIKE '%statin%';

-- Antiplatelet / Anticoagulant
UPDATE public.drug_generic_lookup
  SET body_systems = ARRAY['Heart', 'Blood']
  WHERE drug_class ILIKE '%antiplatelet%';

UPDATE public.drug_generic_lookup
  SET body_systems = ARRAY['Blood', 'Heart']
  WHERE drug_class ILIKE '%anticoagulant%'
     OR drug_class ILIKE '%doac%'
     OR drug_class ILIKE '%vitamin k antagonist%';

-- Thyroid
UPDATE public.drug_generic_lookup
  SET body_systems = ARRAY['Thyroid', 'Hormonal']
  WHERE drug_class ILIKE '%thyroid%';

-- GI / Stomach
UPDATE public.drug_generic_lookup
  SET body_systems = ARRAY['Stomach', 'GI']
  WHERE drug_class ILIKE '%proton pump%'
     OR drug_class ILIKE '%ppi%'
     OR drug_class ILIKE '%laxative%';

-- Pain / NSAIDs
UPDATE public.drug_generic_lookup
  SET body_systems = ARRAY['Pain', 'Inflammation']
  WHERE drug_class ILIKE '%nsaid%';

UPDATE public.drug_generic_lookup
  SET body_systems = ARRAY['Pain', 'Fever']
  WHERE drug_class ILIKE '%analgesic%'
     OR drug_class ILIKE '%antipyretic%';

-- Infection / Antibiotics
UPDATE public.drug_generic_lookup
  SET body_systems = ARRAY['Infection']
  WHERE drug_class ILIKE '%penicillin%'
     OR drug_class ILIKE '%macrolide%'
     OR drug_class ILIKE '%fluoroquinolone%'
     OR drug_class ILIKE '%antibiotic%';

-- Bone / Vitamins
UPDATE public.drug_generic_lookup
  SET body_systems = ARRAY['Bone', 'Immune']
  WHERE drug_class ILIKE '%vitamin d%';

UPDATE public.drug_generic_lookup
  SET body_systems = ARRAY['Nervous System', 'Vitamins']
  WHERE drug_class ILIKE '%vitamin b12%'
     OR drug_class ILIKE '%methylcobalamin%'
     OR drug_class ILIKE '%vitamin b complex%'
     OR drug_class ILIKE '%b complex%';

UPDATE public.drug_generic_lookup
  SET body_systems = ARRAY['Bone', 'Vitamins']
  WHERE drug_class ILIKE '%supplement%'
    AND body_systems = '{}';

-- ============================================
-- END OF FILE
-- ============================================
