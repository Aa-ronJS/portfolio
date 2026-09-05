-- Indexes sized to the actual query surface, not sprinkled on every column.

IF EXISTS (SELECT 1 FROM dbo.SchemaMigration WHERE ScriptName = N'002_indexes.sql')
BEGIN
    PRINT 'Skipping 002_indexes.sql (already applied)';
END
ELSE
BEGIN
    -- The listing screen: newest first, filtered by status more often than not.
    CREATE NONCLUSTERED INDEX IX_Consignment_CreatedAtUtc
        ON dbo.Consignment (CreatedAtUtc DESC, Id DESC);

    CREATE NONCLUSTERED INDEX IX_Consignment_Status_CreatedAtUtc
        ON dbo.Consignment (Status, CreatedAtUtc DESC)
        INCLUDE (Reference, ConsignorName, ConsigneeName, OriginDepotId, DestinationDepotId,
                 DeadWeightKg, CubicMetres, TotalExGst, RequiredDeliveryUtc);

    -- The overdue sweep only ever looks at consignments still in flight, so a
    -- filtered index keeps it O(overdue) instead of O(everything ever shipped).
    -- 1 Booked, 2 PickedUp, 3 InTransit, 4 OutForDelivery, 6 Held.
    CREATE NONCLUSTERED INDEX IX_Consignment_Active_RequiredDeliveryUtc
        ON dbo.Consignment (RequiredDeliveryUtc)
        WHERE Status IN (1, 2, 3, 4, 6);

    -- The detail page and the lane statistics both walk events by consignment.
    CREATE NONCLUSTERED INDEX IX_ConsignmentEvent_Consignment_OccurredAtUtc
        ON dbo.ConsignmentEvent (ConsignmentId, OccurredAtUtc DESC);

    -- Lane statistics join events by status (PickedUp, Delivered) per consignment.
    CREATE NONCLUSTERED INDEX IX_ConsignmentEvent_Status_Consignment
        ON dbo.ConsignmentEvent (Status, ConsignmentId)
        INCLUDE (OccurredAtUtc);

    CREATE NONCLUSTERED INDEX IX_RateCard_Lane_EffectiveFromUtc
        ON dbo.RateCard (OriginDepotId, DestinationDepotId, EffectiveFromUtc DESC);

    CREATE NONCLUSTERED INDEX IX_PodDocument_Consignment
        ON dbo.PodDocument (ConsignmentId);

    INSERT dbo.SchemaMigration (ScriptName) VALUES (N'002_indexes.sql');
END
