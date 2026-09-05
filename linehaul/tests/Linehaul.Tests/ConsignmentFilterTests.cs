using Linehaul.Api.Contracts;
using Linehaul.Api.Data;
using Linehaul.Api.Domain;
using Xunit;

namespace Linehaul.Tests;

public class ConsignmentFilterTests
{
    private static ConsignmentQuery Empty => new(null, null, null, null, null, null);

    [Fact]
    public void No_filters_means_no_where_clause()
    {
        var (sql, parameters) = ConsignmentFilter.Build(Empty);

        Assert.DoesNotContain("WHERE", sql);
        Assert.DoesNotContain("/**where**/", sql);
        Assert.Equal(0, parameters.Get<int>("Offset"));
        Assert.Equal(25, parameters.Get<int>("PageSize"));
    }

    [Fact]
    public void Each_filter_contributes_a_parameterised_predicate()
    {
        var query = new ConsignmentQuery(
            ConsignmentStatus.InTransit, "per", "ADL", "Acme",
            new DateTime(2026, 1, 1), new DateTime(2026, 2, 1));

        var (sql, parameters) = ConsignmentFilter.Build(query);

        Assert.Contains("c.Status = @Status", sql);
        Assert.Contains("o.Code = @Origin", sql);
        Assert.Contains("d.Code = @Destination", sql);
        Assert.Contains("LIKE @Search", sql);
        Assert.Contains("c.CreatedAtUtc >= @CreatedFromUtc", sql);
        Assert.Contains("c.CreatedAtUtc < @CreatedToUtc", sql);

        Assert.Equal("PER", parameters.Get<string>("Origin"));      // normalised to depot code casing
        Assert.Equal("%Acme%", parameters.Get<string>("Search"));
    }

    [Fact]
    public void Search_input_never_lands_in_the_sql_text()
    {
        var hostile = "'; DROP TABLE dbo.Consignment; --";
        var (sql, parameters) = ConsignmentFilter.Build(Empty with { Search = hostile });

        Assert.DoesNotContain("DROP TABLE", sql);
        Assert.Contains(hostile, parameters.Get<string>("Search"));
    }

    [Theory]
    [InlineData("50%", "%50\\%%")]
    [InlineData("a_b", "%a\\_b%")]
    [InlineData("x[y", "%x\\[y%")]
    public void Like_wildcards_in_search_are_escaped(string input, string expectedParameter)
    {
        var (_, parameters) = ConsignmentFilter.Build(Empty with { Search = input });
        Assert.Equal(expectedParameter, parameters.Get<string>("Search"));
    }

    [Theory]
    [InlineData(0, 25, 1, 25)]      // page below 1 clamps to 1
    [InlineData(3, 50, 3, 50)]
    [InlineData(1, 0, 1, 1)]        // page size floors at 1
    [InlineData(1, 9999, 1, 200)]   // and caps at MaxPageSize
    public void Paging_is_clamped(int page, int pageSize, int expectedPage, int expectedPageSize)
    {
        var (_, parameters) = ConsignmentFilter.Build(Empty with { Page = page, PageSize = pageSize });

        Assert.Equal((expectedPage - 1) * expectedPageSize, parameters.Get<int>("Offset"));
        Assert.Equal(expectedPageSize, parameters.Get<int>("PageSize"));
    }
}
