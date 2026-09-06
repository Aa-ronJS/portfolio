using Linehaul.Api.Domain;

namespace Linehaul.Api.Contracts;

// ---- Queries ---------------------------------------------------------------

public sealed record ConsignmentQuery(
    ConsignmentStatus? Status,
    string? Origin,
    string? Destination,
    string? Search,
    DateTime? CreatedFromUtc,
    DateTime? CreatedToUtc,
    int Page = 1,
    int PageSize = 25);

// ---- Rows read by Dapper (constructor parameters match column names) -------

public sealed record ConsignmentSummaryRow(
    long Id,
    string Reference,
    string ConsignorName,
    string ConsigneeName,
    string OriginCode,
    string DestinationCode,
    ConsignmentStatus Status,
    decimal DeadWeightKg,
    decimal CubicMetres,
    decimal TotalExGst,
    DateTime RequiredDeliveryUtc,
    DateTime CreatedAtUtc,
    int TotalRows);

public sealed record ConsignmentDetailRow(
    long Id,
    string Reference,
    string ConsignorName,
    string ConsigneeName,
    string OriginCode,
    string OriginName,
    string DestinationCode,
    string DestinationName,
    ConsignmentStatus Status,
    decimal DeadWeightKg,
    decimal CubicMetres,
    decimal ChargeableWeightKg,
    decimal FreightExGst,
    decimal FuelLevyExGst,
    decimal TotalExGst,
    DateTime RequiredDeliveryUtc,
    string? Notes,
    DateTime CreatedAtUtc,
    DateTime UpdatedAtUtc);

public sealed record ConsignmentItemRow(
    long Id,
    string Description,
    int Quantity,
    decimal WeightKgEach,
    decimal LengthM,
    decimal WidthM,
    decimal HeightM);

public sealed record ConsignmentEventRow(
    long Id,
    ConsignmentStatus Status,
    string? Notes,
    DateTime OccurredAtUtc,
    string RecordedBy);

public sealed record DashboardSummaryRow(
    int TotalLast30Days,
    int Delivered,
    int DeliveredOnTime,
    int CurrentlyHeld,
    int OverdueNow);

public sealed record LaneStatRow(
    string OriginCode,
    string DestinationCode,
    int DeliveredCount,
    decimal AvgTransitHours,
    decimal P90TransitHours);

// ---- Responses -------------------------------------------------------------

public sealed record PagedResponse<T>(IReadOnlyList<T> Items, int Page, int PageSize, int TotalRows);

public sealed record ConsignmentDetailResponse(
    ConsignmentDetailRow Consignment,
    IReadOnlyList<ConsignmentItemRow> Items,
    IReadOnlyList<ConsignmentEventRow> Events,
    IReadOnlyList<ConsignmentStatus> AllowedNextStatuses);

public sealed record CreatedConsignmentResponse(long Id, string Reference, RatingResult Charges);

public sealed record PodUploadResponse(string BlobName, string UploadUrl, DateTimeOffset ExpiresAtUtc);

// ---- Requests --------------------------------------------------------------

public sealed record CreateConsignmentItem(
    string Description,
    int Quantity,
    decimal WeightKgEach,
    decimal LengthM,
    decimal WidthM,
    decimal HeightM);

public sealed record CreateConsignmentRequest(
    string Reference,
    string ConsignorName,
    string ConsigneeName,
    string OriginDepotCode,
    string DestinationDepotCode,
    DateTime RequiredDeliveryUtc,
    List<CreateConsignmentItem> Items,
    string? Notes);

public sealed record AddEventRequest(
    ConsignmentStatus Status,
    string? Notes,
    DateTime? OccurredAtUtc,
    string RecordedBy);

public sealed record CreatePodUploadRequest(string FileName);
