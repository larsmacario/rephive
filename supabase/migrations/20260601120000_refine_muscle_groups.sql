-- Refine global seed exercises (by name — IDs differ between local seed and remote)
UPDATE public.exercises SET muscle_group = 'Brust' WHERE user_id IS NULL AND name IN ('Bankdrücken', 'Dips');
UPDATE public.exercises SET muscle_group = 'Latissimus' WHERE user_id IS NULL AND name IN ('Klimmzüge', 'Latzug');
UPDATE public.exercises SET muscle_group = 'Oberer Rücken' WHERE user_id IS NULL AND name = 'Langhantelrudern';
UPDATE public.exercises SET muscle_group = 'Unterer Rücken' WHERE user_id IS NULL AND name = 'Kreuzheben';
UPDATE public.exercises SET muscle_group = 'Quadrizeps' WHERE user_id IS NULL AND name IN ('Kniebeuge', 'Beinpresse');
UPDATE public.exercises SET muscle_group = 'Hamstrings' WHERE user_id IS NULL AND name = 'Rumänisches KH';
UPDATE public.exercises SET muscle_group = 'Schultern' WHERE user_id IS NULL AND name IN ('Schulterdrücken', 'Seitheben');
UPDATE public.exercises SET muscle_group = 'Bizeps' WHERE user_id IS NULL AND name = 'Bizeps Curls';

-- Also match legacy local seed UUIDs (e000…)
UPDATE public.exercises SET muscle_group = 'Brust' WHERE id IN ('e0000001-0000-4000-8000-000000000001', 'e0000002-0000-4000-8000-000000000002');
UPDATE public.exercises SET muscle_group = 'Latissimus' WHERE id IN ('e0000003-0000-4000-8000-000000000003', 'e0000006-0000-4000-8000-000000000006');
UPDATE public.exercises SET muscle_group = 'Oberer Rücken' WHERE id = 'e0000005-0000-4000-8000-000000000005';
UPDATE public.exercises SET muscle_group = 'Unterer Rücken' WHERE id = 'e0000004-0000-4000-8000-000000000004';
UPDATE public.exercises SET muscle_group = 'Quadrizeps' WHERE id IN ('e0000007-0000-4000-8000-000000000007', 'e0000008-0000-4000-8000-000000000008');
UPDATE public.exercises SET muscle_group = 'Hamstrings' WHERE id = 'e0000009-0000-4000-8000-000000000009';
UPDATE public.exercises SET muscle_group = 'Schultern' WHERE id IN ('e000000a-0000-4000-8000-00000000000a', 'e000000b-0000-4000-8000-00000000000b');
UPDATE public.exercises SET muscle_group = 'Bizeps' WHERE id = 'e000000c-0000-4000-8000-00000000000c';

-- Bulk map legacy aggregate groups (user-owned and any remaining rows)
UPDATE public.exercises SET muscle_group = 'Bizeps' WHERE muscle_group = 'Arme';
UPDATE public.exercises SET muscle_group = 'Quadrizeps' WHERE muscle_group = 'Beine';
UPDATE public.exercises SET muscle_group = 'Latissimus' WHERE muscle_group = 'Rücken';
