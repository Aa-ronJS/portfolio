-- Demo data for local development and the demo environment only; never run in
-- production. Generates ~60 consignments over the last 30 days with an event
-- history that reconciles: every delivered consignment has a pickup and a
-- delivery event, on-time and late in a realistic mix, and every charge is
-- computed with the same rules the API uses. All company names are fictional.

IF EXISTS (SELECT 1 FROM dbo.Consignment)
BEGIN
    PRINT 'Skipping demo seed: consignments already present.';
END
ELSE
BEGIN
    DECLARE @now datetime2(0) = SYSUTCDATETIME();

    CREATE TABLE #gen (
        i                   int            NOT NULL PRIMARY KEY,
        Reference           nvarchar(40)   NOT NULL,
        ConsignorName       nvarchar(200)  NOT NULL,
        ConsigneeName       nvarchar(200)  NOT NULL,
        OriginDepotId       int            NOT NULL,
        DestinationDepotId  int            NOT NULL,
        Status              tinyint        NOT NULL,
        DeadWeightKg        decimal(10, 2) NOT NULL,
        CubicMetres         decimal(10, 3) NOT NULL,
        RatePerKg           decimal(8, 4)  NOT NULL,
        MinimumCharge       decimal(10, 2) NOT NULL,
        FuelLevyPct         decimal(5, 2)  NOT NULL,
        TypicalHours        int            NOT NULL,
        CreatedAtUtc        datetime2(0)   NOT NULL,
        RequiredDeliveryUtc datetime2(0)   NOT NULL,
        DeliveredLate       bit            NOT NULL
    );

    WITH numbers AS (
        SELECT TOP (60) ROW_NUMBER() OVER (ORDER BY (SELECT NULL)) AS i
        FROM sys.all_objects
    ),
    lanes AS (
        SELECT l.LaneNo, l.OriginCode, l.DestinationCode, l.TypicalHours
        FROM (VALUES
            (0, 'PER', 'KAL', 10),
            (1, 'PER', 'PHE', 22),
            (2, 'PER', 'ADL', 36),
            (3, 'ADL', 'MEL', 12),
            (4, 'MEL', 'SYD', 14),
            (5, 'PER', 'MEL', 44)
        ) AS l (LaneNo, OriginCode, DestinationCode, TypicalHours)
    )
    INSERT #gen (i, Reference, ConsignorName, ConsigneeName, OriginDepotId, DestinationDepotId,
                 Status, DeadWeightKg, CubicMetres, RatePerKg, MinimumCharge, FuelLevyPct,
                 TypicalHours, CreatedAtUtc, RequiredDeliveryUtc, DeliveredLate)
    SELECT n.i,
           N'LH-2026-' + RIGHT('0000' + CAST(n.i AS varchar(10)), 4),
           CHOOSE(n.i % 8 + 1,
               N'Goldfields Mining Supplies', N'Westral Fabrication', N'Pilbara Plant Hire',
               N'Harvest Line Growers', N'Southern Cross Packaging', N'Nullarbor Freight Forwarding',
               N'Kimberley Building Co', N'Two Oceans Seafood'),
           CHOOSE(n.i % 5 + 1,
               N'Eyre Peninsula Hardware', N'Great Northern Workshops', N'Bight City Distributors',
               N'Torrens Valley Growers', N'Leeuwin Marine Services'),
           o.Id, d.Id,
           -- Status follows age: the newest bookings are still moving, the
           -- older ones are delivered, which is what a live board looks like.
           CAST(CASE
               WHEN n.i <= 2 THEN 1   -- Booked
               WHEN n.i <= 4 THEN 2   -- PickedUp
               WHEN n.i <= 7 THEN 3   -- InTransit
               WHEN n.i <= 9 THEN 4   -- OutForDelivery
               WHEN n.i <= 11 THEN 6  -- Held
               ELSE 5                 -- Delivered
           END AS tinyint),
           CAST(40 + (n.i * 37) % 900 AS decimal(10, 2)),
           CAST(0.1 + ((n.i * 53) % 39) / 10.0 AS decimal(10, 3)),
           rc.RatePerKg, rc.MinimumCharge, rc.FuelLevyPct,
           l.TypicalHours,
           DATEADD(HOUR, -12 * n.i, @now),
           DATEADD(HOUR, l.TypicalHours + 12, DATEADD(HOUR, -12 * n.i, @now)),
           IIF(n.i % 7 = 0, 1, 0)
    FROM numbers AS n
    JOIN lanes AS l ON l.LaneNo = n.i % 6
    JOIN dbo.Depot AS o ON o.Code = l.OriginCode
    JOIN dbo.Depot AS d ON d.Code = l.DestinationCode
    CROSS APPLY (
        SELECT TOP (1) rc.RatePerKg, rc.MinimumCharge, rc.FuelLevyPct
        FROM dbo.RateCard AS rc
        WHERE rc.OriginDepotId = o.Id
          AND rc.DestinationDepotId = d.Id
          AND rc.EffectiveFromUtc <= @now
        ORDER BY rc.EffectiveFromUtc DESC
    ) AS rc;

    -- Charges computed with the same rules as Rating.Price in the API:
    -- chargeable weight is the greater of dead and cubic at 250 kg/m3 rounded
    -- up; freight is per-kg with a floor; the levy is a percentage of freight.
    INSERT dbo.Consignment (Reference, ConsignorName, ConsigneeName, OriginDepotId, DestinationDepotId,
                            Status, DeadWeightKg, CubicMetres, ChargeableWeightKg,
                            FreightExGst, FuelLevyExGst, TotalExGst,
                            RequiredDeliveryUtc, Notes, CreatedAtUtc, UpdatedAtUtc)
    SELECT g.Reference, g.ConsignorName, g.ConsigneeName, g.OriginDepotId, g.DestinationDepotId,
           g.Status, g.DeadWeightKg, g.CubicMetres, cw.ChargeableWeightKg,
           fr.FreightExGst, lv.FuelLevyExGst, fr.FreightExGst + lv.FuelLevyExGst,
           g.RequiredDeliveryUtc, NULL, g.CreatedAtUtc, g.CreatedAtUtc
    FROM #gen AS g
    CROSS APPLY (SELECT CAST(CEILING(IIF(g.DeadWeightKg > g.CubicMetres * 250, g.DeadWeightKg, g.CubicMetres * 250)) AS decimal(10, 2)) AS ChargeableWeightKg) AS cw
    CROSS APPLY (SELECT CAST(IIF(g.MinimumCharge > ROUND(cw.ChargeableWeightKg * g.RatePerKg, 2), g.MinimumCharge, ROUND(cw.ChargeableWeightKg * g.RatePerKg, 2)) AS decimal(12, 2)) AS FreightExGst) AS fr
    CROSS APPLY (SELECT CAST(ROUND(fr.FreightExGst * g.FuelLevyPct / 100.0, 2) AS decimal(12, 2)) AS FuelLevyExGst) AS lv;

    -- One item per consignment whose dimensions reconcile exactly with the
    -- consignment totals (1.0 x 1.0 x cubic metres).
    INSERT dbo.ConsignmentItem (ConsignmentId, Description, Quantity, WeightKgEach, LengthM, WidthM, HeightM)
    SELECT c.Id,
           CHOOSE(g.i % 4 + 1, N'Palletised freight', N'Crated machinery parts', N'Steel sections', N'Drummed lubricant'),
           1, g.DeadWeightKg, 1.000, 1.000, CAST(g.CubicMetres AS decimal(6, 3))
    FROM #gen AS g
    JOIN dbo.Consignment AS c ON c.Reference = g.Reference;

    -- Event history consistent with each consignment's current status.
    -- 1 Booked, 2 PickedUp, 3 InTransit, 4 OutForDelivery, 5 Delivered, 6 Held.
    INSERT dbo.ConsignmentEvent (ConsignmentId, Status, Notes, OccurredAtUtc, RecordedBy)
    SELECT c.Id, e.Status, e.Notes, e.OccurredAtUtc, N'demo-seed'
    FROM #gen AS g
    JOIN dbo.Consignment AS c ON c.Reference = g.Reference
    CROSS APPLY (
        SELECT v.Status, v.Notes, v.OccurredAtUtc
        FROM (VALUES
            (CAST(1 AS tinyint), N'Booked', g.CreatedAtUtc, 1),
            (CAST(2 AS tinyint), N'Picked up from origin depot', DATEADD(HOUR, 3, g.CreatedAtUtc),
                IIF(g.Status IN (2, 3, 4, 5, 6), 1, 0)),
            (CAST(3 AS tinyint), N'Departed on linehaul', DATEADD(HOUR, 5, g.CreatedAtUtc),
                IIF(g.Status IN (3, 4, 5), 1, 0)),
            (CAST(6 AS tinyint), N'Held: consignee site closed', DATEADD(HOUR, 8, g.CreatedAtUtc),
                IIF(g.Status = 6, 1, 0)),
            (CAST(4 AS tinyint), N'On vehicle for delivery', DATEADD(HOUR, g.TypicalHours, g.CreatedAtUtc),
                IIF(g.Status IN (4, 5), 1, 0)),
            (CAST(5 AS tinyint), N'Delivered; POD captured', DATEADD(HOUR, g.TypicalHours + IIF(g.DeliveredLate = 1, 20, 6), g.CreatedAtUtc),
                IIF(g.Status = 5, 1, 0))
        ) AS v (Status, Notes, OccurredAtUtc, Include)
        WHERE v.Include = 1
    ) AS e;

    DROP TABLE #gen;

    PRINT 'Demo seed complete.';
END
