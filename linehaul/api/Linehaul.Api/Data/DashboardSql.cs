namespace Linehaul.Api.Data;

public static class DashboardSql
{
    /// <summary>
    /// One aggregate pass over the last 30 days of consignments. Delivered
    /// time comes from the event log, not a denormalised column, so the
    /// on-time figure cannot drift from the record of what happened.
    /// </summary>
    public const string Summary = """
        WITH recent AS (
            SELECT c.Id, c.Status, c.RequiredDeliveryUtc, del.OccurredAtUtc AS DeliveredAtUtc
            FROM dbo.Consignment AS c
            LEFT JOIN dbo.ConsignmentEvent AS del
                ON del.ConsignmentId = c.Id AND del.Status = @Delivered
            WHERE c.CreatedAtUtc >= DATEADD(DAY, -30, SYSUTCDATETIME())
        )
        SELECT
            COUNT(*) AS TotalLast30Days,
            COALESCE(SUM(CASE WHEN Status = @Delivered THEN 1 ELSE 0 END), 0) AS Delivered,
            COALESCE(SUM(CASE WHEN Status = @Delivered AND DeliveredAtUtc <= RequiredDeliveryUtc THEN 1 ELSE 0 END), 0) AS DeliveredOnTime,
            COALESCE(SUM(CASE WHEN Status = @Held THEN 1 ELSE 0 END), 0) AS CurrentlyHeld,
            COALESCE(SUM(CASE WHEN Status NOT IN (@Delivered, @Cancelled)
                              AND RequiredDeliveryUtc < SYSUTCDATETIME() THEN 1 ELSE 0 END), 0) AS OverdueNow
        FROM recent;
        """;

    /// <summary>
    /// Transit time per lane from the event log: pickup to delivery, with a
    /// PERCENTILE_CONT p90 so one bad run does not hide in the average.
    /// </summary>
    public const string LaneStats = """
        WITH legs AS (
            SELECT o.Code AS OriginCode, d.Code AS DestinationCode,
                   DATEDIFF(MINUTE, pu.OccurredAtUtc, del.OccurredAtUtc) / 60.0 AS TransitHours
            FROM dbo.Consignment AS c
            JOIN dbo.Depot AS o ON o.Id = c.OriginDepotId
            JOIN dbo.Depot AS d ON d.Id = c.DestinationDepotId
            JOIN dbo.ConsignmentEvent AS pu
                ON pu.ConsignmentId = c.Id AND pu.Status = @PickedUp
            JOIN dbo.ConsignmentEvent AS del
                ON del.ConsignmentId = c.Id AND del.Status = @Delivered
            WHERE c.Status = @Delivered
        ),
        ranked AS (
            SELECT OriginCode, DestinationCode, TransitHours,
                   PERCENTILE_CONT(0.9) WITHIN GROUP (ORDER BY TransitHours)
                       OVER (PARTITION BY OriginCode, DestinationCode) AS P90
            FROM legs
        )
        SELECT OriginCode, DestinationCode,
               COUNT(*) AS DeliveredCount,
               CAST(AVG(TransitHours) AS decimal(8, 1)) AS AvgTransitHours,
               CAST(MAX(P90) AS decimal(8, 1)) AS P90TransitHours
        FROM ranked
        GROUP BY OriginCode, DestinationCode
        ORDER BY DeliveredCount DESC, OriginCode, DestinationCode;
        """;
}
