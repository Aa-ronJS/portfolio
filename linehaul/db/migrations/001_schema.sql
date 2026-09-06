-- Core schema. Status codes are shared with the API's ConsignmentStatus enum:
-- 1 Booked, 2 PickedUp, 3 InTransit, 4 OutForDelivery, 5 Delivered, 6 Held,
-- 7 Cancelled. Never renumber; add new codes at the end.

IF EXISTS (SELECT 1 FROM dbo.SchemaMigration WHERE ScriptName = N'001_schema.sql')
BEGIN
    PRINT 'Skipping 001_schema.sql (already applied)';
END
ELSE
BEGIN
    CREATE TABLE dbo.Depot (
        Id            int          IDENTITY(1, 1) NOT NULL CONSTRAINT PK_Depot PRIMARY KEY,
        Code          char(3)      NOT NULL CONSTRAINT UQ_Depot_Code UNIQUE,
        Name          nvarchar(100) NOT NULL,
        State         nvarchar(3)  NOT NULL,
        CreatedAtUtc  datetime2(0) NOT NULL CONSTRAINT DF_Depot_CreatedAtUtc DEFAULT SYSUTCDATETIME()
    );

    -- Rates are effective-dated and never updated in place: pricing history
    -- must survive audits, so a price change is a new row.
    CREATE TABLE dbo.RateCard (
        Id                 int           IDENTITY(1, 1) NOT NULL CONSTRAINT PK_RateCard PRIMARY KEY,
        OriginDepotId      int           NOT NULL CONSTRAINT FK_RateCard_Origin REFERENCES dbo.Depot (Id),
        DestinationDepotId int           NOT NULL CONSTRAINT FK_RateCard_Destination REFERENCES dbo.Depot (Id),
        RatePerKg          decimal(8, 4) NOT NULL CONSTRAINT CK_RateCard_RatePerKg CHECK (RatePerKg > 0),
        MinimumCharge      decimal(10, 2) NOT NULL CONSTRAINT CK_RateCard_MinimumCharge CHECK (MinimumCharge >= 0),
        FuelLevyPct        decimal(5, 2) NOT NULL CONSTRAINT CK_RateCard_FuelLevyPct CHECK (FuelLevyPct >= 0),
        EffectiveFromUtc   datetime2(0)  NOT NULL,
        CONSTRAINT UQ_RateCard_Lane_Effective UNIQUE (OriginDepotId, DestinationDepotId, EffectiveFromUtc),
        CONSTRAINT CK_RateCard_DistinctDepots CHECK (OriginDepotId <> DestinationDepotId)
    );

    CREATE TABLE dbo.Consignment (
        Id                 bigint         IDENTITY(1000, 1) NOT NULL CONSTRAINT PK_Consignment PRIMARY KEY,
        Reference          nvarchar(40)   NOT NULL CONSTRAINT UQ_Consignment_Reference UNIQUE,
        ConsignorName      nvarchar(200)  NOT NULL,
        ConsigneeName      nvarchar(200)  NOT NULL,
        OriginDepotId      int            NOT NULL CONSTRAINT FK_Consignment_Origin REFERENCES dbo.Depot (Id),
        DestinationDepotId int            NOT NULL CONSTRAINT FK_Consignment_Destination REFERENCES dbo.Depot (Id),
        Status             tinyint        NOT NULL CONSTRAINT DF_Consignment_Status DEFAULT 1
                                          CONSTRAINT CK_Consignment_Status CHECK (Status BETWEEN 1 AND 7),
        DeadWeightKg       decimal(10, 2) NOT NULL CONSTRAINT CK_Consignment_DeadWeightKg CHECK (DeadWeightKg >= 0),
        CubicMetres        decimal(10, 3) NOT NULL CONSTRAINT CK_Consignment_CubicMetres CHECK (CubicMetres >= 0),
        ChargeableWeightKg decimal(10, 2) NOT NULL,
        FreightExGst       decimal(12, 2) NOT NULL,
        FuelLevyExGst      decimal(12, 2) NOT NULL,
        TotalExGst         decimal(12, 2) NOT NULL,
        RequiredDeliveryUtc datetime2(0)  NOT NULL,
        Notes              nvarchar(1000) NULL,
        CreatedAtUtc       datetime2(0)   NOT NULL CONSTRAINT DF_Consignment_CreatedAtUtc DEFAULT SYSUTCDATETIME(),
        UpdatedAtUtc       datetime2(0)   NOT NULL CONSTRAINT DF_Consignment_UpdatedAtUtc DEFAULT SYSUTCDATETIME(),
        CONSTRAINT CK_Consignment_DistinctDepots CHECK (OriginDepotId <> DestinationDepotId)
    );

    CREATE TABLE dbo.ConsignmentItem (
        Id            bigint         IDENTITY(1, 1) NOT NULL CONSTRAINT PK_ConsignmentItem PRIMARY KEY,
        ConsignmentId bigint         NOT NULL CONSTRAINT FK_ConsignmentItem_Consignment
                                     REFERENCES dbo.Consignment (Id) ON DELETE CASCADE,
        Description   nvarchar(200)  NOT NULL,
        Quantity      int            NOT NULL CONSTRAINT CK_ConsignmentItem_Quantity CHECK (Quantity > 0),
        WeightKgEach  decimal(10, 2) NOT NULL CONSTRAINT CK_ConsignmentItem_Weight CHECK (WeightKgEach > 0),
        LengthM       decimal(6, 3)  NOT NULL CONSTRAINT CK_ConsignmentItem_Length CHECK (LengthM > 0),
        WidthM        decimal(6, 3)  NOT NULL CONSTRAINT CK_ConsignmentItem_Width CHECK (WidthM > 0),
        HeightM       decimal(6, 3)  NOT NULL CONSTRAINT CK_ConsignmentItem_Height CHECK (HeightM > 0)
    );

    -- Append-only. The consignment's Status column is the current state; this
    -- table is the record of how it got there, and the dashboard reads times
    -- from here rather than trusting denormalised columns.
    CREATE TABLE dbo.ConsignmentEvent (
        Id            bigint         IDENTITY(1, 1) NOT NULL CONSTRAINT PK_ConsignmentEvent PRIMARY KEY,
        ConsignmentId bigint         NOT NULL CONSTRAINT FK_ConsignmentEvent_Consignment
                                     REFERENCES dbo.Consignment (Id) ON DELETE CASCADE,
        Status        tinyint        NOT NULL CONSTRAINT CK_ConsignmentEvent_Status CHECK (Status BETWEEN 1 AND 7),
        Notes         nvarchar(1000) NULL,
        OccurredAtUtc datetime2(0)   NOT NULL,
        RecordedBy    nvarchar(100)  NOT NULL,
        CreatedAtUtc  datetime2(0)   NOT NULL CONSTRAINT DF_ConsignmentEvent_CreatedAtUtc DEFAULT SYSUTCDATETIME()
    );

    CREATE TABLE dbo.PodDocument (
        Id            bigint         IDENTITY(1, 1) NOT NULL CONSTRAINT PK_PodDocument PRIMARY KEY,
        ConsignmentId bigint         NOT NULL CONSTRAINT FK_PodDocument_Consignment
                                     REFERENCES dbo.Consignment (Id) ON DELETE CASCADE,
        BlobName      nvarchar(400)  NOT NULL,
        FileName      nvarchar(260)  NOT NULL,
        CreatedAtUtc  datetime2(0)   NOT NULL CONSTRAINT DF_PodDocument_CreatedAtUtc DEFAULT SYSUTCDATETIME()
    );

    INSERT dbo.SchemaMigration (ScriptName) VALUES (N'001_schema.sql');
END
