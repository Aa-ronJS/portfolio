namespace Linehaul.Api.Domain;

/// <summary>
/// Stored as tinyint in dbo.Consignment.Status and dbo.ConsignmentEvent.Status.
/// The numeric values are part of the database contract; never renumber.
/// </summary>
public enum ConsignmentStatus : byte
{
    Booked = 1,
    PickedUp = 2,
    InTransit = 3,
    OutForDelivery = 4,
    Delivered = 5,
    Held = 6,
    Cancelled = 7,
}

public static class StatusFlow
{
    private static readonly Dictionary<ConsignmentStatus, ConsignmentStatus[]> Next = new()
    {
        [ConsignmentStatus.Booked] = [ConsignmentStatus.PickedUp, ConsignmentStatus.Held, ConsignmentStatus.Cancelled],
        [ConsignmentStatus.PickedUp] = [ConsignmentStatus.InTransit, ConsignmentStatus.Held],
        [ConsignmentStatus.InTransit] = [ConsignmentStatus.OutForDelivery, ConsignmentStatus.Held],
        [ConsignmentStatus.OutForDelivery] = [ConsignmentStatus.Delivered, ConsignmentStatus.Held],
        [ConsignmentStatus.Held] = [ConsignmentStatus.PickedUp, ConsignmentStatus.InTransit, ConsignmentStatus.OutForDelivery, ConsignmentStatus.Cancelled],
        [ConsignmentStatus.Delivered] = [],
        [ConsignmentStatus.Cancelled] = [],
    };

    public static bool CanTransition(ConsignmentStatus from, ConsignmentStatus to) =>
        Next.TryGetValue(from, out var allowed) && allowed.Contains(to);

    public static IReadOnlyList<ConsignmentStatus> AllowedNext(ConsignmentStatus from) =>
        Next.TryGetValue(from, out var allowed) ? allowed : [];

    public static bool IsTerminal(ConsignmentStatus status) =>
        Next.TryGetValue(status, out var allowed) && allowed.Length == 0;
}
