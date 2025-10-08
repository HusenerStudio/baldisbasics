param(
    [int]$Port = 3000,
    [string]$Root = "."
)

$ErrorActionPreference = "Stop"

try {
    $listener = [System.Net.HttpListener]::new()
    $prefix = "http://localhost:$Port/"
    $listener.Prefixes.Add($prefix)
    $listener.Start()
    Write-Host "Preview server running at $prefix"
} catch {
    Write-Error "Failed to start server: $($_.Exception.Message)"
    exit 1
}

$mime = @{
    ".html" = "text/html"
    ".css"  = "text/css"
    ".js"   = "application/javascript"
    ".png"  = "image/png"
    ".svg"  = "image/svg+xml"
    ".ogg"  = "audio/ogg"
}

$rootPath = Resolve-Path $Root

while ($true) {
    try {
        $context = $listener.GetContext()
        $request = $context.Request
        $response = $context.Response

        $path = [Uri]::UnescapeDataString($request.Url.AbsolutePath.TrimStart('/'))
        if ([string]::IsNullOrWhiteSpace($path)) { $path = "index.html" }

        $fullPath = Join-Path $rootPath $path
        if ((Test-Path $fullPath) -and (Get-Item $fullPath).PSIsContainer) {
            $fullPath = Join-Path $rootPath "index.html"
        }

        if (Test-Path $fullPath) {
            $ext = [System.IO.Path]::GetExtension($fullPath).ToLower()
            $response.ContentType = $mime[$ext]
            $bytes = [System.IO.File]::ReadAllBytes($fullPath)
            $response.StatusCode = 200
            $response.OutputStream.Write($bytes, 0, $bytes.Length)
        } else {
            $response.StatusCode = 404
            $bytes = [System.Text.Encoding]::UTF8.GetBytes("Not found")
            $response.OutputStream.Write($bytes, 0, $bytes.Length)
        }
        $response.OutputStream.Close()
    } catch {
        try { $response.OutputStream.Close() } catch {}
        Write-Host "Request error: $($_.Exception.Message)"
    }
}