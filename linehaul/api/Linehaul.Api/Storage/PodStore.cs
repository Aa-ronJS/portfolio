using Azure.Storage.Blobs;
using Azure.Storage.Sas;

namespace Linehaul.Api.Storage;

public sealed record PodUploadTicket(string BlobName, Uri UploadUri, DateTimeOffset ExpiresAtUtc);

/// <summary>
/// Hands the client a short-lived SAS URL so proof-of-delivery photos go
/// straight from the driver's phone to Blob Storage. The file never passes
/// through the API process; the API only records that it exists.
/// </summary>
public interface IPodStore
{
    bool IsConfigured { get; }
    Task<PodUploadTicket> CreateUploadTicketAsync(long consignmentId, string fileName, CancellationToken ct);
}

public sealed class AzureBlobPodStore(string connectionString) : IPodStore
{
    private const string ContainerName = "pod";
    private static readonly TimeSpan TicketLifetime = TimeSpan.FromMinutes(15);

    private readonly BlobServiceClient _client = new(connectionString);

    public bool IsConfigured => true;

    public async Task<PodUploadTicket> CreateUploadTicketAsync(long consignmentId, string fileName, CancellationToken ct)
    {
        var container = _client.GetBlobContainerClient(ContainerName);
        await container.CreateIfNotExistsAsync(cancellationToken: ct);

        var safeName = Path.GetFileName(fileName);
        var blobName = $"{consignmentId}/{Guid.NewGuid():N}-{safeName}";
        var blob = container.GetBlobClient(blobName);

        if (!blob.CanGenerateSasUri)
            throw new InvalidOperationException("PodStorage connection string cannot mint SAS tokens; use an account key connection string or switch to user delegation SAS.");

        var expiresAt = DateTimeOffset.UtcNow.Add(TicketLifetime);
        var uri = blob.GenerateSasUri(BlobSasPermissions.Create | BlobSasPermissions.Write, expiresAt);
        return new PodUploadTicket(blobName, uri, expiresAt);
    }
}

/// <summary>Local development without a storage account: the endpoint says so honestly.</summary>
public sealed class UnconfiguredPodStore : IPodStore
{
    public bool IsConfigured => false;

    public Task<PodUploadTicket> CreateUploadTicketAsync(long consignmentId, string fileName, CancellationToken ct) =>
        throw new InvalidOperationException("ConnectionStrings:PodStorage is not configured.");
}
