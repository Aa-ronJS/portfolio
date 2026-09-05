using Dapper;
using Linehaul.Api.Contracts;
using Linehaul.Api.Data;
using Linehaul.Api.Domain;
using Linehaul.Api.Storage;
using Microsoft.Data.SqlClient;

namespace Linehaul.Api.Endpoints;

public static class ConsignmentEndpoints
{
    public static void MapConsignmentEndpoints(this IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/api/consignments").WithTags("Consignments");

        group.MapGet("/", ListAsync);
        group.MapGet("/{id:long}", GetAsync);
        group.MapPost("/", CreateAsync);
        group.MapPost("/{id:long}/events", AddEventAsync);
        group.MapPost("/{id:long}/pod", CreatePodUploadAsync);
    }

    private static async Task<IResult> ListAsync(
        [AsParameters] ConsignmentQuery query, ISqlConnectionFactory db, CancellationToken ct)
    {
        var (sql, parameters) = ConsignmentFilter.Build(query);

        await using var connection = await db.OpenAsync(ct);
        var rows = (await connection.QueryAsync<ConsignmentSummaryRow>(
            new CommandDefinition(sql, parameters, cancellationToken: ct))).AsList();

        var total = rows.Count > 0 ? rows[0].TotalRows : 0;
        var pageSize = Math.Clamp(query.PageSize, 1, ConsignmentFilter.MaxPageSize);
        return Results.Ok(new PagedResponse<ConsignmentSummaryRow>(rows, Math.Max(1, query.Page), pageSize, total));
    }

    private static async Task<IResult> GetAsync(long id, ISqlConnectionFactory db, CancellationToken ct)
    {
        await using var connection = await db.OpenAsync(ct);
        await using var multi = await connection.QueryMultipleAsync(
            new CommandDefinition(ConsignmentSql.Detail, new { Id = id }, cancellationToken: ct));

        var consignment = await multi.ReadSingleOrDefaultAsync<ConsignmentDetailRow>();
        if (consignment is null)
            return Results.NotFound();

        var items = (await multi.ReadAsync<ConsignmentItemRow>()).AsList();
        var events = (await multi.ReadAsync<ConsignmentEventRow>()).AsList();

        return Results.Ok(new ConsignmentDetailResponse(
            consignment, items, events, StatusFlow.AllowedNext(consignment.Status)));
    }

    private static async Task<IResult> CreateAsync(
        CreateConsignmentRequest request, ISqlConnectionFactory db, CancellationToken ct)
    {
        var errors = Validate(request);
        if (errors.Count > 0)
            return Results.ValidationProblem(errors);

        var deadWeightKg = request.Items.Sum(i => i.Quantity * i.WeightKgEach);
        var cubicMetres = request.Items.Sum(i => i.Quantity * i.LengthM * i.WidthM * i.HeightM);

        await using var connection = await db.OpenAsync(ct);

        var duplicate = await connection.ExecuteScalarAsync<int>(new CommandDefinition(
            ConsignmentSql.ReferenceExists, new { request.Reference }, cancellationToken: ct));
        if (duplicate == 1)
            return Results.Conflict(new { error = $"Reference '{request.Reference}' already exists." });

        var depots = (await connection.QueryAsync<(int Id, string Code)>(new CommandDefinition(
            ConsignmentSql.ResolveDepots,
            new
            {
                OriginCode = request.OriginDepotCode.ToUpperInvariant(),
                DestinationCode = request.DestinationDepotCode.ToUpperInvariant(),
            },
            cancellationToken: ct))).ToDictionary(d => d.Code, d => d.Id, StringComparer.OrdinalIgnoreCase);

        if (!depots.TryGetValue(request.OriginDepotCode, out var originId))
            return Results.ValidationProblem(new Dictionary<string, string[]>
                { ["originDepotCode"] = [$"Unknown depot '{request.OriginDepotCode}'."] });
        if (!depots.TryGetValue(request.DestinationDepotCode, out var destinationId))
            return Results.ValidationProblem(new Dictionary<string, string[]>
                { ["destinationDepotCode"] = [$"Unknown depot '{request.DestinationDepotCode}'."] });

        var card = await connection.QuerySingleOrDefaultAsync<RateCard>(new CommandDefinition(
            ConsignmentSql.CurrentRateCard,
            new { OriginDepotId = originId, DestinationDepotId = destinationId },
            cancellationToken: ct));
        if (card is null)
            return Results.UnprocessableEntity(new
            {
                error = $"No rate card covers {request.OriginDepotCode} to {request.DestinationDepotCode}.",
            });

        var charges = Rating.Price(deadWeightKg, cubicMetres, card);

        await using var tx = await connection.BeginTransactionAsync(ct);

        var id = await connection.ExecuteScalarAsync<long>(new CommandDefinition(
            ConsignmentSql.InsertConsignment,
            new
            {
                request.Reference,
                request.ConsignorName,
                request.ConsigneeName,
                OriginDepotId = originId,
                DestinationDepotId = destinationId,
                Status = (byte)ConsignmentStatus.Booked,
                DeadWeightKg = deadWeightKg,
                CubicMetres = cubicMetres,
                charges.ChargeableWeightKg,
                charges.FreightExGst,
                charges.FuelLevyExGst,
                charges.TotalExGst,
                request.RequiredDeliveryUtc,
                request.Notes,
            },
            transaction: tx, cancellationToken: ct));

        await connection.ExecuteAsync(new CommandDefinition(
            ConsignmentSql.InsertItem,
            request.Items.Select(i => new
            {
                ConsignmentId = id,
                i.Description,
                i.Quantity,
                i.WeightKgEach,
                i.LengthM,
                i.WidthM,
                i.HeightM,
            }),
            transaction: tx, cancellationToken: ct));

        await connection.ExecuteScalarAsync<long>(new CommandDefinition(
            ConsignmentSql.InsertEvent,
            new
            {
                ConsignmentId = id,
                Status = (byte)ConsignmentStatus.Booked,
                Notes = (string?)"Booked via API",
                OccurredAtUtc = DateTime.UtcNow,
                RecordedBy = "api",
            },
            transaction: tx, cancellationToken: ct));

        await tx.CommitAsync(ct);

        return Results.Created($"/api/consignments/{id}",
            new CreatedConsignmentResponse(id, request.Reference, charges));
    }

    private static async Task<IResult> AddEventAsync(
        long id, AddEventRequest request, ISqlConnectionFactory db, CancellationToken ct)
    {
        if (string.IsNullOrWhiteSpace(request.RecordedBy))
            return Results.ValidationProblem(new Dictionary<string, string[]>
                { ["recordedBy"] = ["recordedBy is required."] });

        await using var connection = await db.OpenAsync(ct);

        var current = await connection.QuerySingleOrDefaultAsync<byte?>(new CommandDefinition(
            ConsignmentSql.GetStatus, new { Id = id }, cancellationToken: ct));
        if (current is null)
            return Results.NotFound();

        var from = (ConsignmentStatus)current.Value;
        if (!StatusFlow.CanTransition(from, request.Status))
            return Results.Conflict(new
            {
                error = $"Cannot move from {from} to {request.Status}.",
                allowed = StatusFlow.AllowedNext(from).Select(s => s.ToString()),
            });

        await using var tx = await connection.BeginTransactionAsync(ct);

        var moved = await connection.ExecuteAsync(new CommandDefinition(
            ConsignmentSql.TransitionStatus,
            new { Id = id, NewStatus = (byte)request.Status, ExpectedStatus = (byte)from },
            transaction: tx, cancellationToken: ct));
        if (moved == 0)
        {
            await tx.RollbackAsync(ct);
            return Results.Conflict(new { error = "The consignment changed under you; reload and retry." });
        }

        var eventId = await connection.ExecuteScalarAsync<long>(new CommandDefinition(
            ConsignmentSql.InsertEvent,
            new
            {
                ConsignmentId = id,
                Status = (byte)request.Status,
                request.Notes,
                OccurredAtUtc = request.OccurredAtUtc ?? DateTime.UtcNow,
                request.RecordedBy,
            },
            transaction: tx, cancellationToken: ct));

        await tx.CommitAsync(ct);

        return Results.Created($"/api/consignments/{id}/events/{eventId}", new { id = eventId });
    }

    private static async Task<IResult> CreatePodUploadAsync(
        long id, CreatePodUploadRequest request, ISqlConnectionFactory db, IPodStore pods, CancellationToken ct)
    {
        if (!pods.IsConfigured)
            return Results.Problem(
                statusCode: StatusCodes.Status503ServiceUnavailable,
                detail: "Proof-of-delivery storage is not configured in this environment.");

        if (string.IsNullOrWhiteSpace(request.FileName))
            return Results.ValidationProblem(new Dictionary<string, string[]>
                { ["fileName"] = ["fileName is required."] });

        await using var connection = await db.OpenAsync(ct);

        var current = await connection.QuerySingleOrDefaultAsync<byte?>(new CommandDefinition(
            ConsignmentSql.GetStatus, new { Id = id }, cancellationToken: ct));
        if (current is null)
            return Results.NotFound();
        if ((ConsignmentStatus)current.Value == ConsignmentStatus.Cancelled)
            return Results.Conflict(new { error = "Cannot attach proof of delivery to a cancelled consignment." });

        var ticket = await pods.CreateUploadTicketAsync(id, request.FileName, ct);

        await connection.ExecuteAsync(new CommandDefinition(
            ConsignmentSql.InsertPodDocument,
            new { ConsignmentId = id, ticket.BlobName, FileName = Path.GetFileName(request.FileName) },
            cancellationToken: ct));

        return Results.Ok(new PodUploadResponse(ticket.BlobName, ticket.UploadUri.ToString(), ticket.ExpiresAtUtc));
    }

    private static Dictionary<string, string[]> Validate(CreateConsignmentRequest request)
    {
        var errors = new Dictionary<string, string[]>();

        if (string.IsNullOrWhiteSpace(request.Reference) || request.Reference.Length > 40)
            errors["reference"] = ["reference is required, at most 40 characters."];
        if (string.IsNullOrWhiteSpace(request.ConsignorName))
            errors["consignorName"] = ["consignorName is required."];
        if (string.IsNullOrWhiteSpace(request.ConsigneeName))
            errors["consigneeName"] = ["consigneeName is required."];
        if (request.Items is not { Count: > 0 })
            errors["items"] = ["At least one item is required."];
        else if (request.Items.Any(i =>
                     i.Quantity <= 0 || i.WeightKgEach <= 0 ||
                     i.LengthM <= 0 || i.WidthM <= 0 || i.HeightM <= 0 ||
                     string.IsNullOrWhiteSpace(i.Description)))
            errors["items"] = ["Every item needs a description and positive quantity, weight and dimensions."];

        return errors;
    }
}
