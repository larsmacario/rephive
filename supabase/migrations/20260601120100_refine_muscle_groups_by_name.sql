-- Correct seed muscle groups by exercise name (remote uses a000… IDs, not e000…)
UPDATE public.exercises SET muscle_group = 'Unterer Rücken' WHERE user_id IS NULL AND name = 'Kreuzheben';
UPDATE public.exercises SET muscle_group = 'Oberer Rücken' WHERE user_id IS NULL AND name = 'Langhantelrudern';
UPDATE public.exercises SET muscle_group = 'Hamstrings' WHERE user_id IS NULL AND name = 'Rumänisches KH';
UPDATE public.exercises SET muscle_group = 'Latissimus' WHERE user_id IS NULL AND name IN ('Klimmzüge', 'Latzug');
UPDATE public.exercises SET muscle_group = 'Quadrizeps' WHERE user_id IS NULL AND name IN ('Kniebeuge', 'Beinpresse');
UPDATE public.exercises SET muscle_group = 'Brust' WHERE user_id IS NULL AND name IN ('Bankdrücken', 'Dips');
UPDATE public.exercises SET muscle_group = 'Schultern' WHERE user_id IS NULL AND name IN ('Schulterdrücken', 'Seitheben');
UPDATE public.exercises SET muscle_group = 'Bizeps' WHERE user_id IS NULL AND name = 'Bizeps Curls';
