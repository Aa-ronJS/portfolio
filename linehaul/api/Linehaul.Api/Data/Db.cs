using Microsoft.Data.SqlClient;

namespace Linehaul.Api.Data;

public interface ISqlConnectionFactory
{
    Task<SqlConnection> OpenAsync(CancellationToken ct = default);
}

public sealed class SqlConnectionFactory(string connectionString) : ISqlConnectionFactory
{
    public async Task<SqlConnection> OpenAsync(CancellationToken ct = default)
    {
        var connection = new SqlConnection(connectionString);
        try
        {
            await connection.OpenAsync(ct);
            return connection;
        }
        catch
        {
            await connection.DisposeAsync();
            throw;
        }
    }
}
