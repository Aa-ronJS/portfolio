using System.Text.Json.Serialization;
using Linehaul.Api.Data;
using Linehaul.Api.Endpoints;
using Linehaul.Api.Storage;

var builder = WebApplication.CreateBuilder(args);

builder.Services.ConfigureHttpJsonOptions(options =>
    options.SerializerOptions.Converters.Add(new JsonStringEnumConverter()));

builder.Services.AddOpenApi();
builder.Services.AddProblemDetails();

builder.Services.AddSingleton<ISqlConnectionFactory>(sp =>
    new SqlConnectionFactory(
        sp.GetRequiredService<IConfiguration>().GetConnectionString("Linehaul")
            ?? throw new InvalidOperationException("ConnectionStrings:Linehaul is not configured.")));

var podStorage = builder.Configuration.GetConnectionString("PodStorage");
builder.Services.AddSingleton<IPodStore>(
    string.IsNullOrWhiteSpace(podStorage)
        ? new UnconfiguredPodStore()
        : new AzureBlobPodStore(podStorage));

var app = builder.Build();

app.UseExceptionHandler();
app.UseStatusCodePages();

app.MapOpenApi();
app.MapGet("/healthz", () => Results.Ok(new { status = "ok", utc = DateTime.UtcNow }));

app.MapConsignmentEndpoints();
app.MapDashboardEndpoints();

app.Run();
