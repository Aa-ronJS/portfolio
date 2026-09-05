using Dapper;
using Microsoft.Azure.Functions.Worker;
using Microsoft.Data.SqlClient;
using Microsoft.Extensions.Logging;

namespace Linehaul.Functions;

/// <summary>
/// Every 15 minutes, finds consignments that have blown their required
/// delivery time and are still moving. In a production deployment the loop
/// body raises the customer notification / ops alert; here it records the
/// facts to Application Insights so the behaviour is observable either way.
/// </summary>
public sealed class OverdueSweep(ILogger<OverdueSweep> logger)
{
    private const byte Delivered = 5;
    private const byte Cancelled = 7;

    private const string OverdueSql = """
        SELECT c.Id, c.Reference, o.Code AS OriginCode, d.Code AS DestinationCode,
               c.Status, c.RequiredDeliveryUtc,
               DATEDIFF(MINUTE, c.RequiredDeliveryUtc, SYSUTCDATETIME()) AS MinutesLate
        FROM dbo.Consignment AS c
        JOIN dbo.Depot AS o ON o.Id = c.OriginDepotId
        JOIN dbo.Depot AS d ON d.Id = c.DestinationDepotId
        WHERE c.Status NOT IN (@Delivered, @Cancelled)
          AND c.RequiredDeliveryUtc < SYSUTCDATETIME()
        ORDER BY c.RequiredDeliveryUtc;
        """;

    [Function("OverdueSweep")]
    public async Task RunAsync([TimerTrigger("0 */15 * * * *")] TimerInfo timer)
    {
        var connectionString = Environment.GetEnvironmentVariable("LinehaulDb");
        if (string.IsNullOrWhiteSpace(connectionString))
        {
            logger.LogError("LinehaulDb connection string is not configured; sweep skipped.");
            return;
        }

        await using var connection = new SqlConnection(connectionString);
        await connection.OpenAsync();

        var overdue = (await connection.QueryAsync<OverdueRow>(
            OverdueSql, new { Delivered, Cancelled })).AsList();

        if (overdue.Count == 0)
        {
            logger.LogInformation("Overdue sweep clean: nothing outstanding past its window.");
            return;
        }

        foreach (var row in overdue)
        {
            logger.LogWarning(
                "Consignment {Reference} ({Origin} to {Destination}) is {MinutesLate} minutes past its delivery window in status {Status}.",
                row.Reference, row.OriginCode, row.DestinationCode, row.MinutesLate, row.Status);
        }

        logger.LogInformation("Overdue sweep found {Count} consignment(s) past their window.", overdue.Count);
    }

    private sealed record OverdueRow(
        long Id, string Reference, string OriginCode, string DestinationCode,
        byte Status, DateTime RequiredDeliveryUtc, int MinutesLate);
}
