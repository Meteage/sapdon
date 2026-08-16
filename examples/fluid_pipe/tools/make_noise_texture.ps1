# MC-style noise texture generator (procedural, vanilla look)
# Same-hue lightness noise with adjustable contrast & roughness + level banding.
# Usage:
#   powershell -ExecutionPolicy Bypass -File tools/make_noise_texture.ps1 -Out res/textures/blocks/my_stone.png -BaseColor "#7F7F7F" -Contrast 0.15 -Roughness 0.2
#   powershell ... -BaseColor "#966C4A" -Contrast 0.45 -Roughness 0.55 -Speckle 0.03   (dirt-like)
# Reference recipes (measured from vanilla 1.21.130):
#   stone   #7F7F7F C=0.15 R=0.20 | cobble #6E6D6D C=0.40 R=0.55 | dirt #966C4A C=0.45 R=0.55 S=0.03
#   planks  #9F844D C=0.30 R=0.35 | iron #DCDCDC C=0.18 R=0.15 | water #7183FD C=0.20 R=0.95
# NOTE: keep comments ASCII-only (PS 5.1 BOM-less reading).
param(
    [Parameter(Mandatory = $true)][string]$Out,
    [string]$BaseColor = "#7F7F7F",
    [double]$Contrast = 0.2,   # lightness span 0~1 (stone 0.15, cobble 0.4, dirt 0.45)
    [double]$Roughness = 0.4,  # noise frequency 0~1 (smooth 0.15, speckled 0.55, water 0.95)
    [double]$Speckle = 0.0,    # extra rare bright/dark dots 0~0.1 (dirt 0.03)
    [int]$Size = 16,
    [int]$Seed = 0,
    [int]$Levels = 8           # lightness quantization (banding)
)

Add-Type -AssemblyName System.Drawing

function RGBtoHSV([int]$r, [int]$g, [int]$b) {
    $mx = [Math]::Max([Math]::Max($r, $g), $b)
    $mn = [Math]::Min([Math]::Min($r, $g), $b)
    $d = $mx - $mn
    $v = $mx / 255.0
    $s = if ($mx -eq 0) { 0.0 } else { $d / $mx }
    $h = 0.0
    if ($d -gt 0) {
        if ($mx -eq $r) { $h = (($g - $b) / $d) % 6 }
        elseif ($mx -eq $g) { $h = ($b - $r) / $d + 2 }
        else { $h = ($r - $g) / $d + 4 }
        $h = (($h + 6) % 6) * 60
    }
    return @($h, $s, $v)
}

function HSVtoRGB([double]$h, [double]$s, [double]$v) {
    $c = $v * $s
    $x = $c * (1 - [Math]::Abs((($h / 60) % 2) - 1))
    $m = $v - $c
    if ($h -lt 60) { $r=$c; $g=$x; $b=0 }
    elseif ($h -lt 120) { $r=$x; $g=$c; $b=0 }
    elseif ($h -lt 180) { $r=0; $g=$c; $b=$x }
    elseif ($h -lt 240) { $r=0; $g=$x; $b=$c }
    elseif ($h -lt 300) { $r=$x; $g=0; $b=$c }
    else { $r=$c; $g=0; $b=$x }
    return @([int][Math]::Round(($r+$m)*255), [int][Math]::Round(($g+$m)*255), [int][Math]::Round(($b+$m)*255))
}

$base = [System.Drawing.ColorTranslator]::FromHtml($BaseColor)
$hsv = RGBtoHSV $base.R $base.G $base.B
$hue = $hsv[0]; $sat = $hsv[1]; $val = $hsv[2]

# value-noise grid
$cell = [Math]::Max(1, [int][Math]::Round(5 * (1 - $Roughness) + 1))
$g = [Math]::Max(2, [Math]::Ceiling($Size / $cell) + 1)
$rng = New-Object System.Random($Seed)
$grid = New-Object 'double[,]' $g, $g
for ($gy = 0; $gy -lt $g; $gy++) { for ($gx = 0; $gx -lt $g; $gx++) { $grid[$gy, $gx] = $rng.NextDouble() } }

function Smooth([double]$t) { return $t * $t * (3 - 2 * $t) }

function Noise2D([int]$x, [int]$y) {
    $gx = $x / $cell
    $gy = $y / $cell
    $x0 = [Math]::Floor($gx); $y0 = [Math]::Floor($gy)
    $fx = Smooth($gx - $x0); $fy = Smooth($gy - $y0)
    $i0 = $x0 % $g; $i1 = ($x0 + 1) % $g
    $j0 = $y0 % $g; $j1 = ($y0 + 1) % $g
    $a = $grid[$j0, $i0]; $b = $grid[$j0, $i1]
    $c = $grid[$j1, $i0]; $d = $grid[$j1, $i1]
    $top = $a + ($b - $a) * $fx
    $bot = $c + ($d - $c) * $fx
    return $top + ($bot - $top) * $fy
}

$bmp = New-Object System.Drawing.Bitmap -ArgumentList $Size, $Size
for ($y = 0; $y -lt $Size; $y++) {
    for ($x = 0; $x -lt $Size; $x++) {
        $n = Noise2D $x $y
        $grain = ($rng.NextDouble() - 0.5) * 0.35 * $Roughness   # high-freq grain
        # Contrast = final lightness span (vanilla-measured ranges: stone 0.15, cobble 0.4, dirt 0.4, iron 0.25, water 0.2, lamp 0.7)
        $l = $val + ($n + $grain - 0.5) * $Contrast
        # banding: quantize lightness into Levels steps WITHIN the contrast span [val-C/2, val+C/2]
        # (so low-contrast textures still get N distinct levels, like vanilla)
        $lo = $val - $Contrast / 2
        $span = [Math]::Max(0.02, $Contrast)
        $step = $span / $Levels
        $lq = $l
        if ($lq -gt 1) { $lq = 1.0 } elseif ($lq -lt 0) { $lq = 0.0 }
        $band = $lo + [Math]::Floor(($lq - $lo) / $step + 0.5) * $step
        # clamp (avoid [Math]::Max/Min int/double overload truncation)
        if ($band -gt 1) { $band = 1.0 } elseif ($band -lt 0) { $band = 0.0 }
        # speckles
        if ($Speckle -gt 0 -and $rng.NextDouble() -lt $Speckle) {
            if ($rng.NextDouble() -lt 0.5) { $band = $val + $Contrast / 2 } else { $band = $val - $Contrast / 2 }
        }
        $rgb = HSVtoRGB $hue $sat $band
        $bmp.SetPixel($x, $y, [System.Drawing.Color]::FromArgb(255, $rgb[0], $rgb[1], $rgb[2]))
    }
}
$bmp.Save($Out, [System.Drawing.Imaging.ImageFormat]::Png)
$bmp.Dispose()
Write-Host ("generated: {0}  base={1} hue={2:N0} sat={3:N2} cell={4} levels={5}" -f $Out, $BaseColor, $hue, $sat, $cell, $Levels)
