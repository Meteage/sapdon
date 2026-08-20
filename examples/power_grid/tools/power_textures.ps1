# power_grid original device textures (16x16 MC-style pixel art)
#   Code-drawn shapes over same-hue banded noise bodies (MC_PIXEL_GUIDE.md block-face style).
#   Each device gets a DISTINCT original texture (no cross-project asset reuse).
# USAGE: powershell -ExecutionPolicy Bypass -File tools/power_textures.ps1
# NOTE: keep comments ASCII-only (PS5.1 reads BOM-less files as ANSI).
Add-Type -AssemblyName System.Drawing

$resBlocks = Join-Path $PSScriptRoot '..\res\textures\blocks'
$resItems  = Join-Path $PSScriptRoot '..\res\textures\items'

function HexColor([string]$hex) { return [System.Drawing.ColorTranslator]::FromHtml($hex) }

# ---- same-hue banded value-noise canvas (16x16) ----
function New-NoiseCanvas([string]$hex, [double]$contrast, [double]$rough, [int]$seed, [int]$levels) {
    $base = HexColor $hex
    $mx = [Math]::Max([Math]::Max($base.R, $base.G), $base.B)
    $mn = [Math]::Min([Math]::Min($base.R, $base.G), $base.B)
    $d = $mx - $mn
    $val = $mx / 255.0
    $sat = if ($mx -eq 0) { 0.0 } else { $d / $mx }
    $hue = 0.0
    if ($d -gt 0) {
        if ($mx -eq $base.R) { $hue = (($base.G - $base.B) / $d) % 6 }
        elseif ($mx -eq $base.G) { $hue = ($base.B - $base.R) / $d + 2 }
        else { $hue = ($base.R - $base.G) / $d + 4 }
        $hue = ((($hue + 6) % 6) * 60)
    }
    $cell = [Math]::Max(1, [int][Math]::Round(5 * (1 - $rough) + 1))
    $g = [Math]::Max(2, [Math]::Ceiling(16 / $cell) + 1)
    $rng = New-Object System.Random($seed)
    $grid = New-Object 'double[,]' $g, $g
    for ($gy = 0; $gy -lt $g; $gy++) { for ($gx = 0; $gx -lt $g; $gx++) { $grid[$gy, $gx] = $rng.NextDouble() } }
    $canvas = New-Object 'System.Drawing.Color[][]' 16
    for ($r = 0; $r -lt 16; $r++) { $canvas[$r] = New-Object 'System.Drawing.Color[]' 16 }
    $lo = $val - $contrast / 2
    $span = if ($contrast -gt 0.02) { $contrast } else { 0.02 }
    $step = $span / $levels
    for ($y = 0; $y -lt 16; $y++) {
        for ($x = 0; $x -lt 16; $x++) {
            $gx = $x / $cell; $gy = $y / $cell
            $x0 = [Math]::Floor($gx); $y0 = [Math]::Floor($gy)
            $fx = $gx - $x0; $fy = $gy - $y0
            $i0 = $x0 % $g; $i1 = ($x0 + 1) % $g
            $j0 = $y0 % $g; $j1 = ($y0 + 1) % $g
            $a = $grid[$j0, $i0]; $b = $grid[$j0, $i1]
            $c = $grid[$j1, $i0]; $d2 = $grid[$j1, $i1]
            $n = ($a + ($b - $a) * $fx) + (($c + ($d2 - $c) * $fx) - ($a + ($b - $a) * $fx)) * $fy
            $grain = ($rng.NextDouble() - 0.5) * 0.35 * $rough
            $l = $val + ($n + $grain - 0.5) * $contrast
            $lq = $l; if ($lq -gt 1) { $lq = 1.0 } elseif ($lq -lt 0) { $lq = 0.0 }
            $band = $lo + [Math]::Floor(($lq - $lo) / $step + 0.5) * $step
            if ($band -gt 1) { $band = 1.0 } elseif ($band -lt 0) { $band = 0.0 }
            $cv = $band * $sat
            $xv = $cv * (1 - [Math]::Abs((($hue / 60) % 2) - 1))
            $mv = $band - $cv
            if ($hue -lt 60) { $r = $cv; $gg = $xv; $bb = 0 }
            elseif ($hue -lt 120) { $r = $xv; $gg = $cv; $bb = 0 }
            elseif ($hue -lt 180) { $r = 0; $gg = $cv; $bb = $xv }
            elseif ($hue -lt 240) { $r = 0; $gg = $xv; $bb = $cv }
            elseif ($hue -lt 300) { $r = $xv; $gg = 0; $bb = $cv }
            else { $r = $cv; $gg = 0; $bb = $xv }
            $canvas[$y][$x] = [System.Drawing.Color]::FromArgb(255,
                [int][Math]::Round(($r + $mv) * 255),
                [int][Math]::Round(($gg + $mv) * 255),
                [int][Math]::Round(($bb + $mv) * 255))
        }
    }
    $bmp = New-Object System.Drawing.Bitmap -ArgumentList 16, 16
    for ($y = 0; $y -lt 16; $y++) { for ($x = 0; $x -lt 16; $x++) { $bmp.SetPixel($x, $y, $canvas[$y][$x]) } }
    return $bmp
}

function Set-Bmp($bmp, [int]$x, [int]$y, [string]$hex) {
    if ($x -ge 0 -and $x -lt 16 -and $y -ge 0 -and $y -lt 16) {
        $bmp.SetPixel($x, $y, (HexColor $hex))
    }
}
function Fill-Bmp($bmp, [int]$x, [int]$y, [int]$w, [int]$h, [string]$hex) {
    for ($yy = $y; $yy -lt $y + $h; $yy++) { for ($xx = $x; $xx -lt $x + $w; $xx++) { Set-Bmp $bmp $xx $yy $hex } }
}
function Rect-Bmp($bmp, [int]$x, [int]$y, [int]$w, [int]$h, [string]$hex) {
    for ($xx = $x; $xx -lt $x + $w; $xx++) { Set-Bmp $bmp $xx $y $hex; Set-Bmp $bmp $xx ($y + $h - 1) $hex }
    for ($yy = $y; $yy -lt $y + $h; $yy++) { Set-Bmp $bmp $x $yy $hex; Set-Bmp $bmp ($x + $w - 1) $yy $hex }
}
function Save-Bmp($bmp, [string]$outPath) {
    $bmp.Save($outPath, [System.Drawing.Imaging.ImageFormat]::Png)
    $bmp.Dispose()
    Write-Host "drawn: $outPath"
}

function Draw( [string]$file, [string]$base, [double]$contrast, [double]$rough, [int]$seed, [scriptblock]$paint ) {
    $bmp = New-NoiseCanvas $base $contrast $rough $seed 6
    & $paint $bmp
    Save-Bmp $bmp $file
}

# ============ COAL GENERATOR ============
Draw (Join-Path $resBlocks 'gen_off.png') '#6B6F74' 0.30 0.45 71 {
    param($b)
    Fill-Bmp $b 1 3 14 10 '#2E3136'           # front panel
    Rect-Bmp  $b 1 3 14 10 '#55595F'          # panel rim highlight
    Fill-Bmp  $b 3 5 10 6 '#1A1C1F'           # coal window
    Set-Bmp   $b 5 7 '#0E0F11'; Set-Bmp $b 9 7 '#0E0F11'; Set-Bmp $b 7 9 '#0E0F11'  # coal specks
}
Draw (Join-Path $resBlocks 'gen_burn.png') '#6B6F74' 0.30 0.45 72 {
    param($b)
    Fill-Bmp $b 1 3 14 10 '#2E3136'
    Rect-Bmp $b 1 3 14 10 '#60524A'
    Fill-Bmp $b 3 5 10 6 '#B0570D'            # ember bed
    Fill-Bmp $b 5 6 6 4 '#FF6A00'             # hotter core
    Set-Bmp  $b 7 7 '#FFC400'; Set-Bmp $b 6 8 '#FFE28A'; Set-Bmp $b 8 8 '#FFC400'  # hottest sparks
}

# ============ SOLAR ============
Draw (Join-Path $resBlocks 'solar.png') '#1B3A6B' 0.18 0.30 81 {
    param($b)
    # grid bars (columns and rows every 4 px)
    for ($x = 2; $x -lt 16; $x += 4) { for ($y = 1; $y -lt 15; $y++) { Set-Bmp $b $x $y '#7FB4E8' } }
    for ($y = 4; $y -lt 16; $y += 4) { for ($x = 1; $x -lt 15; $x++) { Set-Bmp $b $x $y '#7FB4E8' } }
    # top-left highlight corner + dark bottom edge
    for ($x = 1; $x -lt 15; $x++) { Set-Bmp $b $x 15 '#0F1F3A' }
    Set-Bmp $b 1 1 '#C7DFFF'; Set-Bmp $b 2 1 '#C7DFFF'; Set-Bmp $b 1 2 '#C7DFFF'
}

# ============ ELECTRIC FURNACE ============
Draw (Join-Path $resBlocks 'furn_off.png') '#7F848B' 0.28 0.40 91 {
    param($b)
    Rect-Bmp $b 2 2 12 12 '#8A8989'          # stone frame
    Fill-Bmp $b 4 5 8 6 '#1C1E20'            # dark mouth
}
Draw (Join-Path $resBlocks 'furn_on.png') '#7F848B' 0.28 0.40 92 {
    param($b)
    Rect-Bmp $b 2 2 12 12 '#8A8989'
    Fill-Bmp $b 3 3 10 10 '#B0480A'          # outer glow ring
    Fill-Bmp $b 4 5 8 6 '#FF7A1A'            # mouth body
    Fill-Bmp $b 6 6 4 3 '#FFD23A'            # brightest center
}

# ============ BATTERY ============
Draw (Join-Path $resBlocks 'batt_off.png') '#7F848B' 0.28 0.40 101 {
    param($b)
    Fill-Bmp $b 6 2 4 2 '#FFFFFF'            # positive terminal bump
    Rect-Bmp $b 4 4 8 10 '#22252A'           # body frame
    Fill-Bmp $b 5 5 6 8 '#2E3238'            # empty cell
    Set-Bmp  $b 7 6 '#1A1D21'; Set-Bmp $b 10 7 '#1A1D21'  # terminals
}
Draw (Join-Path $resBlocks 'batt_on.png') '#7F848B' 0.28 0.40 102 {
    param($b)
    Fill-Bmp $b 6 2 4 2 '#FFFFFF'
    Rect-Bmp $b 4 4 8 10 '#22252A'
    # green fill rising from bottom
    Fill-Bmp $b 5 10 6 3 '#1E7A38'
    Fill-Bmp $b 5 7 6 3 '#4ADE6B'
    Fill-Bmp $b 5 6 6 1 '#9FF0C0'
    Set-Bmp  $b 7 6 '#E8FFF2'
}

# ============ RELAY ============
Draw (Join-Path $resBlocks 'relay_off.png') '#5A5F66' 0.26 0.40 111 {
    param($b)
    Fill-Bmp  $b 3 3 10 10 '#4E5359'         # box
    Rect-Bmp  $b 3 3 10 10 '#34373D'         # frame
    Fill-Bmp  $b 8 5 3 4 '#B0392B'           # off lamp (red)
    Set-Bmp   $b 6 5 '#26282C'; Set-Bmp $b 6 6 '#26282C'  # switch lever off
}
Draw (Join-Path $resBlocks 'relay_on.png') '#5A5F66' 0.26 0.40 112 {
    param($b)
    Fill-Bmp  $b 3 3 10 10 '#4E5359'
    Rect-Bmp  $b 3 3 10 10 '#34373D'
    Fill-Bmp  $b 8 5 3 4 '#4ADE6B'           # on lamp (green)
    Set-Bmp   $b 8 5 '#9FF0C0'; Set-Bmp $b 9 5 '#9FF0C0'
    Fill-Bmp  $b 4 5 3 1 '#9FF0C0'           # bridge line (conducting)
}

# ============ WIRE ============
Draw (Join-Path $resBlocks 'wire.png') '#A8682E' 0.20 0.35 121 {
    param($b)
    Fill-Bmp  $b 2 2 12 12 '#3A3A3A'         # insulator jacket
    Fill-Bmp  $b 3 4 10 8 '#C88F6E'          # copper core
    Fill-Bmp  $b 4 5 8 2 '#E2B78E'           # copper highlight
    Fill-Bmp  $b 4 10 8 1 '#7A4A20'          # core shadow
}
Draw (Join-Path $resBlocks 'wire_on.png') '#A8682E' 0.20 0.35 122 {
    param($b)
    Fill-Bmp  $b 2 2 12 12 '#3A3A3A'
    Fill-Bmp  $b 3 4 10 8 '#C88F6E'
    Fill-Bmp  $b 4 5 8 2 '#FF9A00'           # energized core
    Fill-Bmp  $b 5 6 6 2 '#FFD65C'
    Fill-Bmp  $b 6 7 4 1 '#FFF3C4'           # hottest line
}

# ============ MULTIMETER ITEM ICON (item-icon style: outline + highlight) ============
Draw (Join-Path $resItems 'multimeter.png') '#5A6066' 0.26 0.40 131 {
    param($b)
    Fill-Bmp $b 5 3 6 9 '#20242A'            # outline body (rounded meter)
    Fill-Bmp $b 6 4 4 7 '#3B4148'
    Fill-Bmp $b 6 5 4 5 '#E8F4FF'            # white face
    Set-Bmp  $b 7 5 '#D8E8FA'; Set-Bmp $b 9 5 '#D8E8FA'
    # red needle from bottom-left to center
    Fill-Bmp $b 7 8 3 1 '#E24A3A'; Set-Bmp $b 9 7 '#E24A3A'
    Set-Bmp  $b 8 9 '#5A616A'                # pivot
    Set-Bmp  $b 8 4 '#C9DDF2'                # bezel highlight
}

# ============ ITEM ICON COPIES (block base faces) ============
Copy-Item -Force (Join-Path $resBlocks 'wire.png')   (Join-Path $resItems 'wire.png')
Copy-Item -Force (Join-Path $resBlocks 'gen_off.png')(Join-Path $resItems 'gen.png')
Copy-Item -Force (Join-Path $resBlocks 'solar.png')  (Join-Path $resItems 'solar.png')
Copy-Item -Force (Join-Path $resBlocks 'furn_on.png')(Join-Path $resItems 'furnace.png')
Copy-Item -Force (Join-Path $resBlocks 'batt_on.png')(Join-Path $resItems 'battery.png')
Copy-Item -Force (Join-Path $resBlocks 'relay_on.png')(Join-Path $resItems 'relay.png')
Write-Host "item icon copies done."