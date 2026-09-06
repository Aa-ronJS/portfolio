namespace Linehaul.Api.Data;

/// <summary>
/// All consignment SQL lives here as plain T-SQL, close to the handlers that
/// use it. Every statement is parsed by Microsoft's T-SQL parser in the test
/// suite (SqlSurfaceTests), so a typo here fails the build, not a request.
/// </summary>
public static class ConsignmentSql
{
    /// <summary>
    /// <c>/**where**/</c> is replaced by ConsignmentFilter.Build with a WHERE
    /// clause assembled from a fixed whitelist of predicates. User input only
    /// ever travels as parameters.
    /// </summary>
    public const string List = """
        SELECT c.Id, c.Reference, c.ConsignorName, c.ConsigneeName,
               o.Code AS OriginCode, d.Code AS DestinationCode,
               c.Status, c.DeadWeightKg, c.CubicMetres, c.TotalExGst,
               c.RequiredDeliveryUtc, c.CreatedAtUtc,
               COUNT(*) OVER () AS TotalRows
        FROM dbo.Consignment AS c
        JOIN dbo.Depot AS o ON o.Id = c.OriginDepotId
        JOIN dbo.Depot AS d ON d.Id = c.DestinationDepotId
        /**where**/
        ORDER BY c.CreatedAtUtc DESC, c.Id DESC
        OFFSET @Offset ROWS FETCH NEXT @PageSize ROWS ONLY;
        """;

    /// <summary>One round trip for the whole detail page: header, items, events.</summary>
    public const string Detail = """
        SELECT c.Id, c.Reference, c.ConsignorName, c.ConsigneeName,
               o.Code AS OriginCode, o.Name AS OriginName,
               d.Code AS DestinationCode, d.Name AS DestinationName,
               c.Status, c.DeadWeightKg, c.CubicMetres, c.ChargeableWeightKg,
               c.FreightExGst, c.FuelLevyExGst, c.TotalExGst,
               c.RequiredDeliveryUtc, c.Notes, c.CreatedAtUtc, c.UpdatedAtUtc
        FROM dbo.Consignment AS c
        JOIN dbo.Depot AS o ON o.Id = c.OriginDepotId
        JOIN dbo.Depot AS d ON d.Id = c.DestinationDepotId
        WHERE c.Id = @Id;

        SELECT i.Id, i.Description, i.Quantity, i.WeightKgEach, i.LengthM, i.WidthM, i.HeightM
        FROM dbo.ConsignmentItem AS i
        WHERE i.ConsignmentId = @Id
        ORDER BY i.Id;

        SELECT e.Id, e.Status, e.Notes, e.OccurredAtUtc, e.RecordedBy
        FROM dbo.ConsignmentEvent AS e
        WHERE e.ConsignmentId = @Id
        ORDER BY e.OccurredAtUtc DESC, e.Id DESC;
        """;

    public const string ResolveDepots = """
        SELECT Id, Code
        FROM dbo.Depot
        WHERE Code IN (@OriginCode, @DestinationCode);
        """;

    /// <summary>Latest effective rate card for the lane; history is kept, never updated in place.</summary>
    public const string CurrentRateCard = """
        SELECT TOP (1) RatePerKg, MinimumCharge, FuelLevyPct
        FROM dbo.RateCard
        WHERE OriginDepotId = @OriginDepotId
          AND DestinationDepotId = @DestinationDepotId
          AND EffectiveFromUtc <= SYSUTCDATETIME()
        ORDER BY EffectiveFromUtc DESC;
        """;

    public const string InsertConsignment = """
        INSERT dbo.Consignment
            (Reference, ConsignorName, ConsigneeName, OriginDepotId, DestinationDepotId,
             Status, DeadWeightKg, CubicMetres, ChargeableWeightKg,
             FreightExGst, FuelLevyExGst, TotalExGst,
             RequiredDeliveryUtc, Notes, CreatedAtUtc, UpdatedAtUtc)
        OUTPUT INSERTED.Id
        VALUES
            (@Reference, @ConsignorName, @ConsigneeName, @OriginDepotId, @DestinationDepotId,
             @Status, @DeadWeightKg, @CubicMetres, @ChargeableWeightKg,
             @FreightExGst, @FuelLevyExGst, @TotalExGst,
             @RequiredDeliveryUtc, @Notes, SYSUTCDATETIME(), SYSUTCDATETIME());
        """;

    public const string InsertItem = """
        INSERT dbo.ConsignmentItem
            (ConsignmentId, Description, Quantity, WeightKgEach, LengthM, WidthM, HeightM)
        VALUES
            (@ConsignmentId, @Description, @Quantity, @WeightKgEach, @LengthM, @WidthM, @HeightM);
        """;

    public const string InsertEvent = """
        INSERT dbo.ConsignmentEvent
            (ConsignmentId, Status, Notes, OccurredAtUtc, RecordedBy)
        OUTPUT INSERTED.Id
        VALUES
            (@ConsignmentId, @Status, @Notes, @OccurredAtUtc, @RecordedBy);
        """;

    public const string GetStatus = """
        SELECT Status
        FROM dbo.Consignment
        WHERE Id = @Id;
        """;

    /// <summary>
    /// Compare-and-swap on Status. If another writer moved the consignment
    /// between our read and this update, zero rows are affected and the API
    /// returns 409 rather than recording an impossible transition.
    /// </summary>
    public const string TransitionStatus = """
        UPDATE dbo.Consignment
        SET Status = @NewStatus, UpdatedAtUtc = SYSUTCDATETIME()
        WHERE Id = @Id AND Status = @ExpectedStatus;
        """;

    public const string ReferenceExists = """
        SELECT CASE WHEN EXISTS (
            SELECT 1 FROM dbo.Consignment WHERE Reference = @Reference
        ) THEN 1 ELSE 0 END;
        """;

    public const string InsertPodDocument = """
        INSERT dbo.PodDocument (ConsignmentId, BlobName, FileName, CreatedAtUtc)
        VALUES (@ConsignmentId, @BlobName, @FileName, SYSUTCDATETIME());
        """;
}
