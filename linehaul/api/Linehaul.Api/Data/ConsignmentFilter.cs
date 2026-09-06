using Dapper;
using Linehaul.Api.Contracts;

namespace Linehaul.Api.Data;

/// <summary>
/// Builds the WHERE clause for ConsignmentSql.List from a fixed whitelist of
/// predicates. The SQL text is composed only from constants in this file;
/// everything the caller supplied goes into parameters.
/// </summary>
public static class ConsignmentFilter
{
    public const int MaxPageSize = 200;

    public static (string Sql, DynamicParameters Parameters) Build(ConsignmentQuery query)
    {
        var predicates = new List<string>();
        var parameters = new DynamicParameters();

        if (query.Status is { } status)
        {
            predicates.Add("c.Status = @Status");
            parameters.Add("Status", (byte)status);
        }

        if (!string.IsNullOrWhiteSpace(query.Origin))
        {
            predicates.Add("o.Code = @Origin");
            parameters.Add("Origin", query.Origin.Trim().ToUpperInvariant());
        }

        if (!string.IsNullOrWhiteSpace(query.Destination))
        {
            predicates.Add("d.Code = @Destination");
            parameters.Add("Destination", query.Destination.Trim().ToUpperInvariant());
        }

        if (!string.IsNullOrWhiteSpace(query.Search))
        {
            predicates.Add("(c.Reference LIKE @Search ESCAPE '\\' OR c.ConsignorName LIKE @Search ESCAPE '\\' OR c.ConsigneeName LIKE @Search ESCAPE '\\')");
            parameters.Add("Search", "%" + EscapeLike(query.Search.Trim()) + "%");
        }

        if (query.CreatedFromUtc is { } from)
        {
            predicates.Add("c.CreatedAtUtc >= @CreatedFromUtc");
            parameters.Add("CreatedFromUtc", from);
        }

        if (query.CreatedToUtc is { } to)
        {
            predicates.Add("c.CreatedAtUtc < @CreatedToUtc");
            parameters.Add("CreatedToUtc", to);
        }

        var page = Math.Max(1, query.Page);
        var pageSize = Math.Clamp(query.PageSize, 1, MaxPageSize);
        parameters.Add("Offset", (page - 1) * pageSize);
        parameters.Add("PageSize", pageSize);

        var where = predicates.Count == 0 ? "" : "WHERE " + string.Join("\n  AND ", predicates);
        return (ConsignmentSql.List.Replace("/**where**/", where), parameters);
    }

    /// <summary>Escapes LIKE wildcards so a search for "100%" means the literal text.</summary>
    public static string EscapeLike(string value) =>
        value.Replace("\\", "\\\\").Replace("%", "\\%").Replace("_", "\\_").Replace("[", "\\[");
}
