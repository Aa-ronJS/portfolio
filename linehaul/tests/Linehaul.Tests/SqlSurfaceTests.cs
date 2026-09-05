using System.Reflection;
using Linehaul.Api.Data;
using Microsoft.SqlServer.TransactSql.ScriptDom;
using Xunit;

namespace Linehaul.Tests;

/// <summary>
/// There is no ORM here to catch a broken query at startup, so the test suite
/// runs every piece of SQL in the codebase through Microsoft's own T-SQL
/// parser (the one SQL Server tooling uses). A typo in a migration script or
/// an embedded query fails CI instead of a request in production.
/// </summary>
public class SqlSurfaceTests
{
    public static TheoryData<string, string> EmbeddedQueries()
    {
        var data = new TheoryData<string, string>();
        foreach (var type in new[] { typeof(ConsignmentSql), typeof(DashboardSql) })
        foreach (var field in type.GetFields(BindingFlags.Public | BindingFlags.Static)
                     .Where(f => f.IsLiteral && f.FieldType == typeof(string)))
        {
            data.Add($"{type.Name}.{field.Name}", (string)field.GetRawConstantValue()!);
        }
        return data;
    }

    public static TheoryData<string> SqlFiles()
    {
        var data = new TheoryData<string>();
        var dbDir = Path.Combine(FindLinehaulRoot(), "db");
        foreach (var file in Directory.EnumerateFiles(dbDir, "*.sql", SearchOption.AllDirectories).Order())
            data.Add(Path.GetRelativePath(dbDir, file));
        return data;
    }

    [Theory]
    [MemberData(nameof(EmbeddedQueries))]
    public void Every_embedded_query_is_valid_tsql(string name, string sql)
    {
        // The list query carries a placeholder the filter builder fills in;
        // parse it the way it is actually executed.
        var executable = sql.Replace("/**where**/", "WHERE c.Status = @Status");
        AssertParses(name, executable);
    }

    [Fact]
    public void There_are_embedded_queries_to_check()
    {
        Assert.True(EmbeddedQueries().Count() >= 10, "The SQL surface shrank unexpectedly; is reflection still finding the constants?");
    }

    [Theory]
    [MemberData(nameof(SqlFiles))]
    public void Every_sql_file_is_valid_tsql(string relativePath)
    {
        var path = Path.Combine(FindLinehaulRoot(), "db", relativePath);
        AssertParses(relativePath, File.ReadAllText(path));
    }

    private static void AssertParses(string name, string sql)
    {
        var parser = new TSql160Parser(initialQuotedIdentifiers: true);
        using var reader = new StringReader(sql);
        parser.Parse(reader, out var errors);

        Assert.True(errors.Count == 0,
            $"{name} is not valid T-SQL:\n" + string.Join("\n",
                errors.Select(e => $"  line {e.Line}, col {e.Column}: {e.Message}")));
    }

    private static string FindLinehaulRoot()
    {
        var dir = new DirectoryInfo(AppContext.BaseDirectory);
        while (dir is not null && !File.Exists(Path.Combine(dir.FullName, "Linehaul.sln")))
            dir = dir.Parent;
        return dir?.FullName
            ?? throw new InvalidOperationException("Could not locate Linehaul.sln above the test assembly.");
    }
}
