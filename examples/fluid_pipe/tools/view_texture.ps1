# PNG -> ASCII grid viewer for textures (for AI/CLI inspection)
# Each pixel rendered as 2 chars: <bucket><digit>
#   bucket: hue letter R O Y G C B M, S = silver/gray, . = transparent
#   digit : brightness 0-9 (V*9); semi-alpha shows lowercase letter
# Usage: powershell -ExecutionPolicy Bypass -File tools/view_texture.ps1 <png> [-Palette] [-Crop x,y,w,h] [-Hex] [-Scale n]
#   -Crop x,y,w,h : view only a sub-region (pixels) for fine detail
#   -Hex          : print exact per-pixel colors as #AARRGGBB (max granularity; keep region small, e.g. 16x16)
# NOTE: keep comments ASCII-only (PS 5.1 BOM-less reading).
param(
    [Parameter(Mandatory = $true)][string]$Path,
    [switch]$Palette,
    [int]$Scale = 1,
    [string]$Crop = "",
    [switch]$Hex
)

Add-Type -AssemblyName System.Drawing

if (-not (Test-Path $Path)) { Write-Host "file not found: $Path"; exit 1 }

$bmp = New-Object System.Drawing.Bitmap($Path)

function HueLetter([int]$r, [int]$g, [int]$b) {
    # crude HSV-ish bucketing
    $mx = [Math]::Max([Math]::Max($r, $g), $b)
    $mn = [Math]::Min([Math]::Min($r, $g), $b)
    $d = $mx - $mn
    if ($mx -eq 0) { return 'K' }
    $sat = $d / $mx
    if ($sat -lt 0.18) { return 'S' }   # gray/silver
    $h = 0.0
    if ($d -gt 0) {
        if ($mx -eq $r) { $h = (($g - $b) / $d) % 6 }
        elseif ($mx -eq $g) { $h = ($b - $r) / $d + 2 }
        else { $h = ($r - $g) / $d + 4 }
    }
    $h = ($h + 6) % 6
    $deg = $h * 60
    if ($deg -lt 20 -or $deg -ge 340) { return 'R' }
    if ($deg -lt 55) { return 'O' }
    if ($deg -lt 70) { return 'Y' }
    if ($deg -lt 160) { return 'G' }
    if ($deg -lt 200) { return 'C' }
    if ($deg -lt 260) { return 'B' }
    if ($deg -lt 330) { return 'M' }
    return 'R'
}

$w = $bmp.Width
$h = $bmp.Height

# crop region (default full image)
$cx = 0; $cy = 0; $cw = $w; $ch = $h
if ($Crop) {
    $p = $Crop -split ',' | ForEach-Object { [int]$_.Trim() }
    if ($p.Count -ge 4) { $cx = $p[0]; $cy = $p[1]; $cw = $p[2]; $ch = $p[3] }
}
$cx = [Math]::Max(0, [Math]::Min($cx, $w - 1))
$cy = [Math]::Max(0, [Math]::Min($cy, $h - 1))
$cw = [Math]::Max(1, [Math]::Min($cw, $w - $cx))
$ch = [Math]::Max(1, [Math]::Min($ch, $h - $cy))

# palette dump (full image)
if ($Palette) {
    $counts = @{}
    for ($y = 0; $y -lt $h; $y++) {
        for ($x = 0; $x -lt $w; $x++) {
            $c = $bmp.GetPixel($x, $y)
            $key = "#{0:X2}{1:X2}{2:X2}|{3}" -f $c.R, $c.G, $c.B, $c.A
            if ($counts.ContainsKey($key)) { $counts[$key]++ } else { $counts[$key] = 1 }
        }
    }
    Write-Host "== palette ($($counts.Count) unique) =="
    $counts.GetEnumerator() | Sort-Object Value -Descending | ForEach-Object {
        $parts = $_.Key.Split('|')
        Write-Host ("  {0} alpha={1} x{2}" -f $parts[0], $parts[1], $_.Value)
    }
    Write-Host "legend: R red O orange Y yellow G green C cyan B blue M magenta S gray . transparent"
    $bmp.Dispose()
    exit 0
}

# hex mode: exact per-pixel colors (max granularity)
if ($Hex) {
    Write-Host ("== hex grid {0}x{1} @ ({2},{3}) ==" -f $cw, $ch, $cx, $cy)
    for ($y = 0; $y -lt $ch; $y++) {
        $cells = @()
        for ($x = 0; $x -lt $cw; $x++) {
            $c = $bmp.GetPixel($cx + $x, $cy + $y)
            $cells += ("#{0:X2}{1:X2}{2:X2}{3:X2}" -f $c.A, $c.R, $c.G, $c.B)
        }
        Write-Host ("  y{0,3}  {1}" -f ($cy + $y), ($cells -join ' '))
    }
    $bmp.Dispose()
    exit 0
}

$legend = "legend: R red O orange Y yellow G green C cyan B blue M magenta S gray . transparent ; semi-alpha"
Write-Host $legend
Write-Host ("  y\x  0 1 2 3 4 5 6 7 8 9 A B C D E F   (region {0}x{1} @ {2},{3})" -f $cw, $ch, $cx, $cy)
for ($y = 0; $y -lt $ch; $y++) {
    $line = ""
    for ($rep = 0; $rep -lt $Scale; $rep++) {
        $line = ""
        for ($x = 0; $x -lt $cw; $x++) {
            $c = $bmp.GetPixel($cx + $x, $cy + $y)
            $a = $c.A
            if ($a -lt 30) {
                $line += ".."
                continue
            }
            $v = [Math]::Max([Math]::Max($c.R, $c.G), $c.B) / 255.0
            $d = [Math]::Min(9, [int][Math]::Round($v * 9))
            $letter = HueLetter $c.R $c.G $c.B
            if ($a -lt 140) { $letter = $letter.ToLower() }
            $line += $letter + $d
        }
        Write-Host ("  {0,2}  {1}" -f ($cy + $y), $line)
    }
}

$bmp.Dispose()
