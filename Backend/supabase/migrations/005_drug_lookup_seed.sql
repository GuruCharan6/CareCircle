-- ============================================================
-- Migration 005: Drug Generic Lookup Seed Data
-- India-specific brand → generic translation table.
-- Source: CIMS / 1mg database.
-- Common drugs for diabetes, hypertension, cardiac conditions.
-- ============================================================

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
