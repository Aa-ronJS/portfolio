using Linehaul.Api.Domain;
using Xunit;

namespace Linehaul.Tests;

public class StatusFlowTests
{
    [Theory]
    [InlineData(ConsignmentStatus.Booked, ConsignmentStatus.PickedUp)]
    [InlineData(ConsignmentStatus.PickedUp, ConsignmentStatus.InTransit)]
    [InlineData(ConsignmentStatus.InTransit, ConsignmentStatus.OutForDelivery)]
    [InlineData(ConsignmentStatus.OutForDelivery, ConsignmentStatus.Delivered)]
    [InlineData(ConsignmentStatus.Booked, ConsignmentStatus.Cancelled)]
    [InlineData(ConsignmentStatus.InTransit, ConsignmentStatus.Held)]
    [InlineData(ConsignmentStatus.Held, ConsignmentStatus.InTransit)]
    public void Legal_transitions_are_allowed(ConsignmentStatus from, ConsignmentStatus to)
    {
        Assert.True(StatusFlow.CanTransition(from, to));
    }

    [Theory]
    [InlineData(ConsignmentStatus.Booked, ConsignmentStatus.Delivered)]     // no skipping the journey
    [InlineData(ConsignmentStatus.Delivered, ConsignmentStatus.InTransit)]  // terminal states stay terminal
    [InlineData(ConsignmentStatus.Cancelled, ConsignmentStatus.Booked)]
    [InlineData(ConsignmentStatus.InTransit, ConsignmentStatus.Cancelled)]  // cancel only before pickup or from Held
    [InlineData(ConsignmentStatus.Booked, ConsignmentStatus.Booked)]
    public void Illegal_transitions_are_refused(ConsignmentStatus from, ConsignmentStatus to)
    {
        Assert.False(StatusFlow.CanTransition(from, to));
    }

    [Fact]
    public void Every_status_is_mapped()
    {
        foreach (var status in Enum.GetValues<ConsignmentStatus>())
        {
            // AllowedNext must answer for every status, terminal ones with an empty list.
            var next = StatusFlow.AllowedNext(status);
            Assert.NotNull(next);
            Assert.Equal(next.Count == 0, StatusFlow.IsTerminal(status));
        }
    }

    [Fact]
    public void No_transition_leads_out_of_a_terminal_status()
    {
        foreach (var from in Enum.GetValues<ConsignmentStatus>().Where(StatusFlow.IsTerminal))
        foreach (var to in Enum.GetValues<ConsignmentStatus>())
            Assert.False(StatusFlow.CanTransition(from, to));
    }
}
