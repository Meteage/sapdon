# Generate pipe_glass.png only (water textures now use grey flow/still + game tint_method:water)
# Wiki rule: all material instances of one block must use the same render_method (blend).
#   pipe_glass.png    : glass.png x2; alpha binarized (>= THRESH -> 255 else 0) to keep the
#                       alpha_test look under blend; center window (10,10)-(22,22) alpha 0
#                       so the translucent water column shows through.
#   fluid_water32.png : water_still.png 32 frames x2, alpha scaled by WATER_ALPHA (translucent).
# NOTE: keep comments ASCII-only (PS 5.1 reads .ps1 without BOM as ANSI; UTF-8 comments break parsing).
# Run: powershell -ExecutionPolicy Bypass -File tools/make_water_texture.ps1
Add-Type -AssemblyName System.Drawing

$resBlocks = Join-Path $PSScriptRoot '..\res\textures\blocks'
$glassPath  = Join-Path $resBlocks 'glass.png'
$waterPath  = Join-Path $resBlocks 'water_still.png'
$glassOut   = Join-Path $resBlocks 'pipe_glass.png'
$waterOut   = Join-Path $resBlocks 'fluid_water32.png'

$glass = [System.Drawing.Image]::FromFile($glassPath)
$water = [System.Drawing.Image]::FromFile($waterPath)

$tile = 32
$frames = 32
$alphaThreshold = 26     # glass alpha binarize threshold (26/255 ~ 0.1, same as alpha_test cutoff)
$waterAlphaMul = 0.65    # water translucency (0.65 = semi-transparent)

# 1) pipe_glass.png: glass x2 + binarized alpha + transparent center window
$glassBmp = New-Object System.Drawing.Bitmap -ArgumentList $tile, $tile
$gg = [System.Drawing.Graphics]::FromImage($glassBmp)
$gg.CompositingMode = [System.Drawing.Drawing2D.CompositingMode]::SourceCopy
$gg.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
$gg.DrawImage($glass, 0, 0, $tile, $tile)
$gg.Dispose()

for ($y = 0; $y -lt $tile; $y++) {
    for ($x = 0; $x -lt $tile; $x++) {
        $c = $glassBmp.GetPixel($x, $y)
        $a = 0
        if ($c.A -ge $alphaThreshold) { $a = 255 }
        if ($x -ge 10 -and $x -le 21 -and $y -ge 10 -and $y -le 21) { $a = 0 }  # center window
        $glassBmp.SetPixel($x, $y, [System.Drawing.Color]::FromArgb($a, $c.R, $c.G, $c.B))
    }
}
$glassBmp.Save($glassOut, [System.Drawing.Imaging.ImageFormat]::Png)
$glassBmp.Dispose()
Write-Host "generated: $glassOut"

# 2) fluid_water32.png: water frames x2, scaled alpha
$out = New-Object System.Drawing.Bitmap -ArgumentList $tile, ($tile * $frames)
$g = [System.Drawing.Graphics]::FromImage($out)
$g.CompositingMode = [System.Drawing.Drawing2D.CompositingMode]::SourceCopy
$g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic

for ($i = 0; $i -lt $frames; $i++) {
    $srcRect = New-Object System.Drawing.Rectangle -ArgumentList 0, ($i * 16), 16, 16
    $dstRect = New-Object System.Drawing.Rectangle -ArgumentList 0, ($i * $tile), $tile, $tile
    $g.DrawImage($water, $dstRect, $srcRect, [System.Drawing.GraphicsUnit]::Pixel)
}
$g.Dispose()

for ($y = 0; $y -lt $out.Height; $y++) {
    for ($x = 0; $x -lt $tile; $x++) {
        $c = $out.GetPixel($x, $y)
        $a = [int]([Math]::Min(255, $c.A * $waterAlphaMul))
        $out.SetPixel($x, $y, [System.Drawing.Color]::FromArgb($a, $c.R, $c.G, $c.B))
    }
}
$out.Save($waterOut, [System.Drawing.Imaging.ImageFormat]::Png)
$out.Dispose(); $glass.Dispose(); $water.Dispose()
Write-Host "generated: $waterOut"
