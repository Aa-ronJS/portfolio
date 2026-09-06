-- Depots and rate cards. Reference data ships as a migration so every
-- environment agrees on it; demo consignments live in db/seed and never run
-- in production.

IF EXISTS (SELECT 1 FROM dbo.SchemaMigration WHERE ScriptName = N'003_reference_data.sql')
BEGIN
    PRINT 'Skipping 003_reference_data.sql (already applied)';
END
ELSE
BEGIN
    INSERT dbo.Depot (Code, Name, State)
    VALUES
        ('PER', N'Perth (Kewdale)', N'WA'),
        ('KAL', N'Kalgoorlie', N'WA'),
        ('PHE', N'Port Hedland', N'WA'),
        ('ADL', N'Adelaide (Wingfield)', N'SA'),
        ('MEL', N'Melbourne (Laverton)', N'VIC'),
        ('SYD', N'Sydney (Eastern Creek)', N'NSW');

    -- One card per lane, both directions where the lane runs both ways.
    INSERT dbo.RateCard (OriginDepotId, DestinationDepotId, RatePerKg, MinimumCharge, FuelLevyPct, EffectiveFromUtc)
    SELECT o.Id, d.Id, r.RatePerKg, r.MinimumCharge, r.FuelLevyPct, r.EffectiveFromUtc
    FROM (VALUES
        ('PER', 'KAL', 0.3800, 45.00, 14.50, '2026-07-01'),
        ('KAL', 'PER', 0.3800, 45.00, 14.50, '2026-07-01'),
        ('PER', 'PHE', 0.5200, 65.00, 16.00, '2026-07-01'),
        ('PHE', 'PER', 0.5200, 65.00, 16.00, '2026-07-01'),
        ('PER', 'ADL', 0.4200, 55.00, 14.50, '2026-07-01'),
        ('ADL', 'PER', 0.4200, 55.00, 14.50, '2026-07-01'),
        ('ADL', 'MEL', 0.2400, 40.00, 13.00, '2026-07-01'),
        ('MEL', 'ADL', 0.2400, 40.00, 13.00, '2026-07-01'),
        ('MEL', 'SYD', 0.2200, 38.00, 13.00, '2026-07-01'),
        ('SYD', 'MEL', 0.2200, 38.00, 13.00, '2026-07-01'),
        ('PER', 'MEL', 0.4600, 60.00, 15.00, '2026-07-01'),
        ('PER', 'SYD', 0.4900, 62.00, 15.00, '2026-07-01')
    ) AS r (OriginCode, DestinationCode, RatePerKg, MinimumCharge, FuelLevyPct, EffectiveFromUtc)
    JOIN dbo.Depot AS o ON o.Code = r.OriginCode
    JOIN dbo.Depot AS d ON d.Code = r.DestinationCode;

    INSERT dbo.SchemaMigration (ScriptName) VALUES (N'003_reference_data.sql');
END
