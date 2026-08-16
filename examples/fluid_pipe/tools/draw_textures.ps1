# Draw device textures as 16x16 MC-style pixel art:
#   MC block-face style: opaque, NO outline, same-hue banded noise body (see MC_PIXEL_GUIDE.md).
#   Feature shapes (window/wheel/ports/arrows) are overlaid via ASCII maps; '.' keeps the noise.
#   pump   : on.png (running, cyan window) / off.png (stopped, dark window)
#   in/out : input.png (digitCircuit input symbol) / output.png (digitCircuit output symbol) on noise plate
#   tank   : default.png (metal vessel + empty window + level line + base)
#   valve  : v_body.png (neutral body); top arrows reuse unified v3t_* set (east=open, north=closed)
#   valve3 : v3t_east/north/south/west.png (top single arrows, white on noise plate, unified)
#   wrench : res/textures/items/wrench.png (item-icon style: outline + highlight, unchanged)
#   item icons: pumpitem/tankitem/valveitem/valve3item (copies of block faces)
# Pipe textures (pipe_glass/fluid_water32) are NOT touched.
# NOTE: keep comments ASCII-only (PS 5.1 BOM-less reading); avoid [Math]::Min/Max with mixed int/double.
# Run: powershell -ExecutionPolicy Bypass -File tools/draw_textures.ps1
Add-Type -AssemblyName System.Drawing

$resBlocks = Join-Path $PSScriptRoot '..\res\textures\blocks'
$resItems  = Join-Path $PSScriptRoot '..\res\textures\items'

function HexColor([string]$hex) { return [System.Drawing.ColorTranslator]::FromHtml($hex) }

# ---- MC-style value noise canvas (same-hue banded noise) ----
function New-NoiseCanvas([string]$hex, [double]$contrast, [double]$rough, [int]$seed, [int]$levels) {
    $base = HexColor $hex
    # RGB -> HSV
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
    # value-noise grid
    $cell = [Math]::Max(1, [int][Math]::Round(5 * (1 - $rough) + 1))
    $g = [Math]::Max(2, [Math]::Ceiling(16 / $cell) + 1)
    $rng = New-Object System.Random($seed)
    $grid = New-Object 'double[,]' $g, $g
    for ($gy = 0; $gy -lt $g; $gy++) { for ($gx = 0; $gx -lt $g; $gx++) { $grid[$gy, $gx] = $rng.NextDouble() } }
    # jagged canvas (Color[16] rows) - unambiguous indexing in PowerShell
    $canvas = New-Object 'System.Drawing.Color[][]' 16
    for ($r = 0; $r -lt 16; $r++) { $canvas[$r] = New-Object 'System.Drawing.Color[]' 16 }
    $lo = $val - $contrast / 2
    $span = if ($contrast -gt 0.02) { $contrast } else { 0.02 }
    $step = $span / $levels
    for ($y = 0; $y -lt 16; $y++) {
        for ($x = 0; $x -lt 16; $x++) {
            # bilinear value noise
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
            # banding within contrast span
            $lq = $l
            if ($lq -gt 1) { $lq = 1.0 } elseif ($lq -lt 0) { $lq = 0.0 }
            $band = $lo + [Math]::Floor(($lq - $lo) / $step + 0.5) * $step
            if ($band -gt 1) { $band = 1.0 } elseif ($band -lt 0) { $band = 0.0 }
            # HSV -> RGB
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
    return $canvas
}

# ---- draw: noise base + ASCII overlay ('.' keeps noise, letters paint palette) ----
function Draw-WithNoise([string]$outPath, [hashtable]$palette, [string[]]$rows, [hashtable]$noise) {
    if ($rows.Count -ne 16) { throw ("map must have 16 rows, got {0}: {1}" -f $rows.Count, $outPath) }
    for ($i = 0; $i -lt 16; $i++) {
        if ($rows[$i].Length -ne 16) { throw ("row {0} length {1}: {2} in {3}" -f $i, $rows[$i].Length, $rows[$i], $outPath) }
        foreach ($ch in $rows[$i].ToCharArray()) {
            if ($ch -ne '.' -and -not $palette.ContainsKey([string]$ch)) {
                throw ("unknown palette key '{0}' in row {1}: {2}" -f $ch, $i, $outPath)
            }
        }
    }
    $canvas = New-NoiseCanvas $noise.color $noise.contrast $noise.rough $noise.seed $noise.levels
    $bmp = New-Object System.Drawing.Bitmap -ArgumentList 16, 16
    for ($y = 0; $y -lt 16; $y++) {
        for ($x = 0; $x -lt 16; $x++) {
            $ch = $rows[$y].Substring($x, 1)
            if ($ch -eq '.') {
                $nc = $canvas[$y][$x]
                $bmp.SetPixel($x, $y, $nc)
            } else {
                $bmp.SetPixel($x, $y, (HexColor $palette[$ch]))
            }
        }
    }
    $bmp.Save($outPath, [System.Drawing.Imaging.ImageFormat]::Png)
    $bmp.Dispose()
    Write-Host "drawn: $outPath"
}

$machineNoise = @{ color = '#8C9096'; contrast = 0.3; rough = 0.45; seed = 11; levels = 6 }
$plateNoise   = @{ color = '#9A9EA4'; contrast = 0.25; rough = 0.4;  seed = 22; levels = 6 }

# ============ PUMP ============
# steel body + circular window (impeller); ON = cyan glow, OFF = dark
$pumpPal = @{
    'd' = '#4A4A4A'; 'g' = '#37C8DC'; 'h' = '#7CE8F0'; 'k' = '#1A1D21'
}
$pumpOnRows = @(
    '................',
    '................',
    '................',
    '................',
    '.....dddddd.....',
    '...dddddddddd...',
    '..ddggggggggdd..',
    '..ddghhhhhhgdd..',
    '..ddggggggggdd..',
    '...dddddddddd...',
    '.....dddddd.....',
    '................',
    '................',
    '................',
    '................',
    '................'
)
$pumpOnNoise = $machineNoise.Clone(); $pumpOnNoise.seed = 11
Draw-WithNoise (Join-Path $resBlocks 'on.png') $pumpPal $pumpOnRows $pumpOnNoise

$pumpOffRows = @(
    '................',
    '................',
    '................',
    '................',
    '.....dddddd.....',
    '...dddddddddd...',
    '..ddkkkkkkkkdd..',
    '..ddkkkkkkkkdd..',
    '..ddkkkkkkkkdd..',
    '...dddddddddd...',
    '.....dddddd.....',
    '................',
    '................',
    '................',
    '................',
    '................'
)
$pumpOffNoise = $machineNoise.Clone(); $pumpOffNoise.seed = 12
Draw-WithNoise (Join-Path $resBlocks 'off.png') $pumpPal $pumpOffRows $pumpOffNoise

# ============ PUMP in/out faces (digitCircuit symbols on noise plate) ============
# input  : digitCircuit input.png symbol (inward port chevrons) - pump bottom = input
# output : digitCircuit output.png symbol (outward diamond) - pump top = output
# Background keeps the gray noise metal plate; only the symbol shape is swapped to
# digitCircuit's white (#FFFFFF) pixel art.
$inPal = @{ 'w' = '#FFFFFF' }
$inRows = @(
    '................',
    '................',
    '................',
    '................',
    '................',
    '.....ww..ww.....',
    '.....w....w.....',
    '.......w........',
    '........w.......',
    '.....w....w.....',
    '.....ww..ww.....',
    '................',
    '................',
    '................',
    '................',
    '................'
)
Draw-WithNoise (Join-Path $resBlocks 'input.png') $inPal $inRows $plateNoise

# output : digitCircuit output.png symbol (outward diamond) - pump top = output
$outRows = @(
    '................',
    '................',
    '................',
    '................',
    '................',
    '.......ww.......',
    '......w..w......',
    '.....w..w.w.....',
    '.....w.w..w.....',
    '......w..w......',
    '.......ww.......',
    '................',
    '................',
    '................',
    '................',
    '................'
)
Draw-WithNoise (Join-Path $resBlocks 'output.png') $inPal $outRows $plateNoise

# ============ TANK (metal vessel + empty window + level line + base) ============
$tankPal = @{
    'd' = '#4A4A4A'; 'w' = '#A9C6DE'; 's' = '#5A6066'; 'k' = '#2E2E2E'
}
$tankRows = @(
    '................',
    '................',
    '..dddddddddddd..',
    '..dddddddddddd..',
    '.dddddddddddddd.',
    '.ddwwwwwwwwwwdd.',
    '.ddwwwwwwwwwwdd.',
    '.ddwwwwwwwwwwdd.',
    '.ddwwwwwwwwwwdd.',
    '.ddwwwsssswwwdd.',
    '.ddwwwwwwwwwwdd.',
    '.dddddddddddddd.',
    '..dddddddddddd..',
    '..kkkkkkkkkkkk..',
    '................',
    '................'
)
$tankNoise = $machineNoise.Clone(); $tankNoise.seed = 33
Draw-WithNoise (Join-Path $resBlocks 'default.png') $tankPal $tankRows $tankNoise

# ============ VALVE (single-direction: unified single arrow on top, west=input face, east=output face) ============
# top arrows reuse the unified v3t_* set (east=open, north=closed) - see VALVE3 section below
$vBodyPal = @{ 'm' = '#6E6E6E'; 'w' = '#C6CED8' }
$vBodyRows = @(
    '.......mm.......',
    '......mmmm......',
    '.....mmmmmm.....',
    '.....mwwwwm.....',
    '.....mmmmmm.....',
    '................',
    '................',
    '................',
    '................',
    '................',
    '................',
    '................',
    '................',
    '................',
    '................',
    '................'
)
$vBodyNoise = $machineNoise.Clone(); $vBodyNoise.seed = 44
Draw-WithNoise (Join-Path $resBlocks 'v_body.png') $vBodyPal $vBodyRows $vBodyNoise

# ============ VALVE3 top arrows (single arrow, white symbol on noise plate) ============
# Base design = north arrow (up); east/south/west = the same PNG rotated 90/180/270 deg CW,
# so all four directions are the exact same arrow design rotated (unified).
$v3tNorthRows = @(
    '................',
    '................',
    '.......ww.......',
    '.......ww.......',
    '......wwww......',
    '.......ww.......',
    '.......ww.......',
    '.......ww.......',
    '.......ww.......',
    '.......ww.......',
    '.......ww.......',
    '.......ww.......',
    '.......ww.......',
    '.......ww.......',
    '................',
    '................'
)
$v3tNorthNoise = $plateNoise.Clone(); $v3tNorthNoise.seed = 53
Draw-WithNoise (Join-Path $resBlocks 'v3t_north.png') $inPal $v3tNorthRows $v3tNorthNoise

# rotate a 16x16 PNG by 90-degree turns (1=CW90, 2=180, 3=CCW90) and save as a copy
function Rotate-Square([string]$inPath, [string]$outPath, [int]$turns) {
    $src = [System.Drawing.Bitmap]::FromFile($inPath)
    $dst = New-Object System.Drawing.Bitmap 16, 16
    for ($y = 0; $y -lt 16; $y++) {
        for ($x = 0; $x -lt 16; $x++) {
            $sx = $x; $sy = $y
            for ($i = 0; $i -lt $turns; $i++) {
                $t = $sx; $sx = $sy; $sy = 15 - $t
            }
            $dst.SetPixel($x, $y, $src.GetPixel($sx, $sy))
        }
    }
    $src.Dispose()
    $dst.Save($outPath, [System.Drawing.Imaging.ImageFormat]::Png)
    $dst.Dispose()
    Write-Host "rotated: $outPath"
}

Rotate-Square (Join-Path $resBlocks 'v3t_north.png') (Join-Path $resBlocks 'v3t_east.png') 1
Rotate-Square (Join-Path $resBlocks 'v3t_north.png') (Join-Path $resBlocks 'v3t_south.png') 2
Rotate-Square (Join-Path $resBlocks 'v3t_north.png') (Join-Path $resBlocks 'v3t_west.png') 3

# ============ WRENCH (AI hand-drawn, faithful to :wrench: emoji silhouette) ============
# silhouette decoded from Twemoji 1f527 (see tools/icon_ref.mjs); colors = MC item-icon
# selective outlining: a=outline b=base c=highlight d=shadow
$wrenchPal = @{
    'a' = '#394046'; 'b' = '#8899A6'; 'c' = '#B8CFE0'; 'd' = '#626E78'
}
$wrenchRows = @(
    '..aaaaa.........',
    '...acca.........',
    'a...acca........',
    'aa.acbda........',
    'acacbbda........',
    'accbbbbca.......',
    'aacddbbbca......',
    '..aaacbbbca.....',
    '.....acbbbcaaa..',
    '......acbbbcccaa',
    '.......acbbbbdca',
    '........acbbdaca',
    '........acbda.aa',
    '........acda...a',
    '.........acca...',
    '.........aaaaa..'
)
function Draw-Map([string]$outPath, [hashtable]$palette, [string[]]$rows) {
    if ($rows.Count -ne 16) { throw "map must have 16 rows: $outPath" }
    for ($i = 0; $i -lt 16; $i++) {
        if ($rows[$i].Length -ne 16) { throw ("row {0} length {1}: {2}" -f $i, $rows[$i].Length, $rows[$i]) }
    }
    $bmp = New-Object System.Drawing.Bitmap -ArgumentList 16, 16
    for ($y = 0; $y -lt 16; $y++) {
        for ($x = 0; $x -lt 16; $x++) {
            $ch = $rows[$y].Substring($x, 1)
            if ($ch -eq '.') { $bmp.SetPixel($x, $y, [System.Drawing.Color]::Transparent) }
            else { $bmp.SetPixel($x, $y, (HexColor $palette[$ch])) }
        }
    }
    $bmp.Save($outPath, [System.Drawing.Imaging.ImageFormat]::Png)
    $bmp.Dispose()
    Write-Host "drawn: $outPath"
}
Draw-Map (Join-Path $resItems 'wrench.png') $wrenchPal $wrenchRows

# ============ item icons = copies of block faces (only pipe + wrench remain) ============
# pumpitem/tankitem/valveitem/valve3item PNGs kept as files (no items reference them anymore)
Write-Host "item icons: no copies needed (pipeitem/wrench unchanged)"
