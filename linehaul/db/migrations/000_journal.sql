-- Forward-only migrations, applied in filename order by CI (sqlcmd) or by
-- hand. Each script checks the journal and skips itself if already applied,
-- so re-running the whole folder is always safe.

IF OBJECT_ID(N'dbo.SchemaMigration', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.SchemaMigration (
        ScriptName    nvarchar(200) NOT NULL CONSTRAINT PK_SchemaMigration PRIMARY KEY,
        AppliedAtUtc  datetime2(0)  NOT NULL CONSTRAINT DF_SchemaMigration_AppliedAtUtc DEFAULT SYSUTCDATETIME()
    );
END
