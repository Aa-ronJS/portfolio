using Linehaul.Api.Domain;
using Xunit;

namespace Linehaul.Tests;

public class RatingTests
{
    private static readonly RateCard Card = new(RatePerKg: 0.42m, MinimumCharge: 55.00m, FuelLevyPct: 14.5m);

    [Theory]
    [InlineData(100, 0.2, 100)]   // dead weight wins: 0.2 m3 = 50 kg cubic
    [InlineData(100, 1.0, 250)]   // cubic wins: 1 m3 = 250 kg
    [InlineData(0, 0, 0)]
    [InlineData(100.4, 0, 101)]   // rounded up to the next whole kilogram
    [InlineData(0, 0.5, 125)]
    public void Chargeable_weight_is_greater_of_dead_and_cubic(
        double deadKg, double cubicM3, double expectedKg)
    {
        Assert.Equal((decimal)expectedKg, Rating.ChargeableWeightKg((decimal)deadKg, (decimal)cubicM3));
    }

    [Fact]
    public void Minimum_charge_applies_to_small_consignments()
    {
        // 20 kg at 42c/kg is $8.40, well under the $55 minimum.
        var result = Rating.Price(20m, 0.05m, Card);
        Assert.Equal(55.00m, result.FreightExGst);
    }

    [Fact]
    public void A_pallet_is_priced_from_its_cubic_weight()
    {
        // Standard pallet footprint, 1.2 x 1.2 x 1.4 m = 2.016 m3 = 504 kg cubic,
        // heavier than its 300 kg dead weight.
        var result = Rating.Price(300m, 2.016m, Card);

        Assert.Equal(504m, result.ChargeableWeightKg);
        Assert.Equal(211.68m, result.FreightExGst);          // 504 * 0.42
        Assert.Equal(30.69m, result.FuelLevyExGst);          // 14.5% of freight, to the cent
        Assert.Equal(242.37m, result.TotalExGst);
        Assert.Equal(24.24m, result.Gst);
        Assert.Equal(266.61m, result.TotalIncGst);
    }

    [Fact]
    public void Totals_always_reconcile()
    {
        var result = Rating.Price(1234.5m, 3.21m, Card);
        Assert.Equal(result.TotalExGst, result.FreightExGst + result.FuelLevyExGst);
        Assert.Equal(result.TotalIncGst, result.TotalExGst + result.Gst);
    }

    [Fact]
    public void Negative_inputs_are_rejected()
    {
        Assert.Throws<ArgumentOutOfRangeException>(() => Rating.ChargeableWeightKg(-1m, 0m));
        Assert.Throws<ArgumentOutOfRangeException>(() => Rating.ChargeableWeightKg(0m, -0.1m));
    }
}
