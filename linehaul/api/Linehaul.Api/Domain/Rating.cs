namespace Linehaul.Api.Domain;

public sealed record RateCard(decimal RatePerKg, decimal MinimumCharge, decimal FuelLevyPct);

public sealed record RatingResult(
    decimal ChargeableWeightKg,
    decimal FreightExGst,
    decimal FuelLevyExGst,
    decimal TotalExGst,
    decimal Gst,
    decimal TotalIncGst);

/// <summary>
/// Pricing for a road consignment. Chargeable weight is the greater of dead
/// weight and cubic weight at 250 kg per cubic metre, the usual Australian
/// road freight conversion, rounded up to the next whole kilogram.
/// </summary>
public static class Rating
{
    public const decimal RoadKgPerCubicMetre = 250m;
    public const decimal GstRate = 0.10m;

    public static decimal ChargeableWeightKg(decimal deadWeightKg, decimal cubicMetres)
    {
        ArgumentOutOfRangeException.ThrowIfNegative(deadWeightKg);
        ArgumentOutOfRangeException.ThrowIfNegative(cubicMetres);
        return Math.Ceiling(Math.Max(deadWeightKg, cubicMetres * RoadKgPerCubicMetre));
    }

    public static RatingResult Price(decimal deadWeightKg, decimal cubicMetres, RateCard card)
    {
        ArgumentNullException.ThrowIfNull(card);

        var chargeable = ChargeableWeightKg(deadWeightKg, cubicMetres);
        var freight = Math.Max(card.MinimumCharge, RoundCents(chargeable * card.RatePerKg));
        var levy = RoundCents(freight * card.FuelLevyPct / 100m);
        var exGst = freight + levy;
        var gst = RoundCents(exGst * GstRate);
        return new RatingResult(chargeable, freight, levy, exGst, gst, exGst + gst);
    }

    private static decimal RoundCents(decimal value) =>
        Math.Round(value, 2, MidpointRounding.AwayFromZero);
}
