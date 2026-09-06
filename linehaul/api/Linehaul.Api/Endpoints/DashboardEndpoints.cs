using Dapper;
using Linehaul.Api.Contracts;
using Linehaul.Api.Data;
using Linehaul.Api.Domain;

namespace Linehaul.Api.Endpoints;

public static class DashboardEndpoints
{
    public static void MapDashboardEndpoints(this IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/api/dashboard").WithTags("Dashboard");

        group.MapGet("/summary", SummaryAsync);
        group.MapGet("/lanes", LanesAsync);
    }

    private static async Task<IResult> SummaryAsync(ISqlConnectionFactory db, CancellationToken ct)
    {
        await using var connection = await db.OpenAsync(ct);
        var summary = await connection.QuerySingleAsync<DashboardSummaryRow>(new CommandDefinition(
            DashboardSql.Summary,
            new
            {
                Delivered = (byte)ConsignmentStatus.Delivered,
                Held = (byte)ConsignmentStatus.Held,
                Cancelled = (byte)ConsignmentStatus.Cancelled,
            },
            cancellationToken: ct));
        return Results.Ok(summary);
    }

    private static async Task<IResult> LanesAsync(ISqlConnectionFactory db, CancellationToken ct)
    {
        await using var connection = await db.OpenAsync(ct);
        var lanes = await connection.QueryAsync<LaneStatRow>(new CommandDefinition(
            DashboardSql.LaneStats,
            new
            {
                PickedUp = (byte)ConsignmentStatus.PickedUp,
                Delivered = (byte)ConsignmentStatus.Delivered,
            },
            cancellationToken: ct));
        return Results.Ok(lanes.AsList());
    }
}
