<#
.SYNOPSIS
Scans G:\CANDU for PDF files and builds/updates a SQLite database.
.DESCRIPTION
Creates a database with drawings table if not exists, then performs high-speed scan.
#>


# Configuration
$scanWholeDrive = $true  # Set to $false to scan only folders matching the regex
$basePath = "G:\"
$folderNameRegex = '^[W-Zw-z]'  # Change this regex to select different folder ranges (e.g., '^[E-Ge-g]')
$dbPath = "C:\Users\ee\manufacturing_process_schedule\jobs.db"  # <-- Change this to your DB path
$batchSize = 500  # Files per transaction

# Load SQLite assembly
Add-Type -Path ".\System.Data.SQLite.dll"

# Create database and table if not exists
function Initialize-Database {
    param($dbPath)
    
    $conn = New-Object System.Data.SQLite.SQLiteConnection
    $conn.ConnectionString = "Data Source=$dbPath"
    $conn.Open()

    $cmd = $conn.CreateCommand()
    $cmd.CommandText = @"
CREATE TABLE IF NOT EXISTS drawings (
    drawing_name TEXT PRIMARY KEY,
    drawing_number TEXT DEFAULT NULL,
    file_location TEXT UNIQUE
);
CREATE INDEX IF NOT EXISTS idx_drawing_name ON drawings(drawing_name);
"@
    $cmd.ExecuteNonQuery()
    $conn.Close()
}

# High-performance scanner
function Scan-PDFs {
    param($gDrivePath, $dbPath, $batchSize)
    
    $conn = New-Object System.Data.SQLite.SQLiteConnection
    $conn.ConnectionString = "Data Source=$dbPath"
    $conn.Open()

    # Prepare batch insert
    $insertCmd = $conn.CreateCommand()
    $insertCmd.CommandText = "INSERT OR IGNORE INTO drawings (drawing_name, file_location) VALUES (@name, @path)"
    [void]$insertCmd.Parameters.Add("@name", [System.Data.DbType]::String)
    [void]$insertCmd.Parameters.Add("@path", [System.Data.DbType]::String)

    $counter = 0
    $transaction = $conn.BeginTransaction()

    try {
        Get-ChildItem -Path $gDrivePath -Recurse -Filter *.pdf -ErrorAction SilentlyContinue | ForEach-Object {
            $insertCmd.Parameters["@name"].Value = $_.Name
            $insertCmd.Parameters["@path"].Value = $_.FullName
            [void]$insertCmd.ExecuteNonQuery()

            $counter++
            if ($counter % $batchSize -eq 0) {
                $transaction.Commit()
                Write-Progress -Activity "Scanning" -Status "$counter files processed"
                $transaction = $conn.BeginTransaction()
            }
        }
        $transaction.Commit()
    }
    catch {
        $transaction.Rollback()
        Write-Error "Error: $_"
    }
    finally {
        $conn.Close()
    }
    return $counter
}

# Main execution
Initialize-Database $dbPath

$processedCount = 0
if ($scanWholeDrive) {
    $processedCount = Scan-PDFs $basePath $dbPath $batchSize
} else {
    $folders = Get-ChildItem -Path $basePath -Directory | Where-Object { $_.Name -match $folderNameRegex }
    foreach ($folder in $folders) {
        $processedCount += Scan-PDFs $folder.FullName $dbPath $batchSize
    }
}
Write-Host "Scan complete! Processed $processedCount PDF files."