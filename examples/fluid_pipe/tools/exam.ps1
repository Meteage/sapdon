# MC Pixel Texture Exam - grader / question CLI
# Workflow: study MC_PIXEL_GUIDE.md -> -List -> -Show <id> -> AI draws exam/answers/<id>.png -> -Grade <id>
# Scores 6 dimensions vs a reference texture (vanilla samples or our res):
#   hue (circular mean of colored pixels), saturation, brightness contrast, roughness (neighbor diff),
#   lightness levels, shape (fill+color match for shape questions). PASS >= pass_score (90).
# NOTE: keep comments ASCII-only (PS 5.1 BOM-less reading).
param(
    [switch]$List,
    [string]$Show,
    [string]$Grade,
    [string]$Answer
)

Add-Type -AssemblyName System.Drawing

$root = Join-Path $PSScriptRoot '..'
$qFile = Join-Path $PSScriptRoot '..\exam\questions.json'
$questions = (Get-Content $qFile -Raw -Encoding UTF8 | ConvertFrom-Json)
$pass = $questions.pass_score
$answerDir = Join-Path $root $questions.answer_dir

function ResolveRef([string]$rel) {
    if ($rel -like 'samples/*') {
        return Join-Path $questions.samples_root ($rel.Substring('samples/'.Length) -replace '/', '\')
    }
    return Join-Path $root ($rel -replace '/', '\')
}

function ToRad([double]$deg) { return $deg * [Math]::PI / 180 }
function HueDist([double]$a, [double]$b) {
    $d = [Math]::Abs($a - $b)
    if ($d -gt 180) { $d = 360 - $d }
    return $d
}

# stats of a texture: weightedHue, sat, minV, maxV, levels, roughness, colors
function Get-Stats([string]$path) {
    $bmp = New-Object System.Drawing.Bitmap($path)
    $w = $bmp.Width; $h = $bmp.Height
    $sinS = 0.0; $cosS = 0.0; $colored = 0
    $satS = 0.0; $satN = 0
    $minV = 1.0; $maxV = 0.0
    $lv = @{}
    $rough = 0.0; $rn = 0
    $prevRow = New-Object 'double[]' $w
    $colors = @{}
    for ($y = 0; $y -lt $h; $y++) {
        for ($x = 0; $x -lt $w; $x++) {
            $c = $bmp.GetPixel($x, $y)
            if ($c.A -lt 30) { $prevRow[$x] = -1; continue }   # transparent
            $mx = [Math]::Max([Math]::Max($c.R, $c.G), $c.B)
            $mn = [Math]::Min([Math]::Min($c.R, $c.G), $c.B)
            $v = $mx / 255.0
            $sat = if ($mx -eq 0) { 0.0 } else { ($mx - $mn) / $mx }
            if ($sat -ge 0.18) {
                $d = $mx - $mn
                if ($d -gt 0) {
                    if ($mx -eq $c.R) { $hu = (($c.G - $c.B) / $d) % 6 }
                    elseif ($mx -eq $c.G) { $hu = ($c.B - $c.R) / $d + 2 }
                    else { $hu = ($c.R - $c.G) / $d + 4 }
                    $deg = ((($hu + 6) % 6) * 60)
                    $rad = ToRad $deg
                    $sinS += [Math]::Sin($rad); $cosS += [Math]::Cos($rad); $colored++
                }
            }
            $satS += $sat; $satN++
            if ($v -lt $minV) { $minV = $v }
            if ($v -gt $maxV) { $maxV = $v }
            $lv[[int][Math]::Floor($v * 8)] = 1
            if ($x -gt 0 -and $prevRow[$x - 1] -ge 0) {
                $rough += [Math]::Abs($v - $prevRow[$x - 1]); $rn++
            }
            $prevRow[$x] = $v
            $key = "#{0:X2}{1:X2}{2:X2}" -f $c.R, $c.G, $c.B
            if ($colors.ContainsKey($key)) { $colors[$key]++ } else { $colors[$key] = 1 }
        }
    }
    $bmp.Dispose()
    $hue = -1.0
    if ($colored -gt 0) {
        $hue = (([Math]::Atan2($sinS, $cosS) * 180 / [Math]::PI) + 360) % 360
    }
    $satAvg = if ($satN -gt 0) { $satS / $satN } else { 0 }
    $roughAvg = if ($rn -gt 0) { $rough / $rn } else { 0 }
    return [pscustomobject]@{
        hue = $hue; sat = $satAvg; minV = $minV; maxV = $maxV
        range = $maxV - $minV; levels = $lv.Count; rough = $roughAvg; colors = $colors.Count
    }
}

# shape match: fill ratio (alpha>30) + color proximity
function Get-Shape([string]$refPath, [string]$ansPath) {
    $rb = New-Object System.Drawing.Bitmap($refPath)
    $ab = New-Object System.Drawing.Bitmap($ansPath)
    $w = [Math]::Min($rb.Width, $ab.Width); $h = [Math]::Min($rb.Height, $ab.Height)
    $fillMatch = 0; $fillN = 0
    $colorMatch = 0; $colorN = 0
    for ($y = 0; $y -lt $h; $y++) {
        for ($x = 0; $x -lt $w; $x++) {
            $rc = $rb.GetPixel($x, $y); $ac = $ab.GetPixel($x, $y)
            $rf = $rc.A -ge 30; $af = $ac.A -ge 30
            $fillN++
            if ($rf -eq $af) { $fillMatch++ }
            $colorN++
            if (-not $rf -and -not $af) { $colorMatch++; continue }   # transparent = transparent
            if ($rf -and $af) {
                $d = [Math]::Abs($rc.R - $ac.R) + [Math]::Abs($rc.G - $ac.G) + [Math]::Abs($rc.B - $ac.B)
                if ($d -le 90) { $colorMatch++ }
            }
        }
    }
    $rb.Dispose(); $ab.Dispose()
    $fillScore = if ($fillN -gt 0) { $fillMatch / $fillN } else { 0 }
    $colorScore = if ($colorN -gt 0) { $colorMatch / $colorN } else { 0 }
    return 100 * (0.5 * $fillScore + 0.5 * $colorScore)
}

function Show-Question($q) {
    Write-Host ""
    Write-Host ("===== {0} ({1}) =====" -f $q.id, $q.title)
    Write-Host ("题面: {0}" -f $q.desc)
    Write-Host ("输出: {0}\{1}.png （16x16）" -f $questions.answer_dir, $q.id)
    Write-Host ("参考: {0}" -f $q.ref)
}

if ($List) {
    Write-Host "===== MC 像素贴图考试 ====="
    Write-Host ("通过线: {0} 分 | 先学习: {1}" -f $pass, $questions.study_first)
    Write-Host $questions.instructions
    foreach ($q in $questions.questions) { Show-Question $q }
    exit 0
}

if ($Show) {
    $q = $questions.questions | Where-Object { $_.id -eq $Show }
    if (-not $q) { Write-Host "题目不存在: $Show （用 -List 查看）"; exit 1 }
    Show-Question $q
    exit 0
}

if ($Grade) {
    $q = $questions.questions | Where-Object { $_.id -eq $Grade }
    if (-not $q) { Write-Host "题目不存在: $Grade"; exit 1 }
    $ansPath = if ($Answer) { $Answer } else { Join-Path $answerDir ($q.id + '.png') }
    if (-not (Test-Path $ansPath)) {
        Write-Host "未找到答案: $ansPath （先作答：make_noise_texture.ps1 / draw_textures.ps1 输出 16x16 PNG）"
        exit 1
    }
    $refPath = ResolveRef $q.ref
    if (-not (Test-Path $refPath)) { Write-Host "参考缺失: $refPath"; exit 1 }

    $ref = Get-Stats $refPath
    $ans = Get-Stats $ansPath

    # hard checks
    if ($ans.colors -lt 3) {
        Write-Host "FAIL（0 分）：答案几乎纯色/空白（唯一颜色 < 3），不是有效纹理"
        exit 0
    }

    $w = $questions.weights_default
    if ($q.weights) { $w = $q.weights }

    # hue score: gray target -> require gray; colored target -> hue distance
    $hueScore = 0.0
    if ($ref.hue -lt 0) {
        $hueScore = if ($ans.hue -lt 0) { 100 } else { [Math]::Max(0, 100 - $ans.sat * 300) }
    } else {
        if ($ans.hue -lt 0) {
            $hueScore = 30
        } else {
            $d = HueDist $ref.hue $ans.hue
            $hueScore = [Math]::Max(0, 100 - $d * 2.5)
        }
    }

    $satScore = [Math]::Max(0, 100 - [Math]::Abs($ref.sat - $ans.sat) * 150)
    $contrastScore = if ($ref.range -gt 0.01) {
        [Math]::Max(0, 100 - [Math]::Abs($ref.range - $ans.range) / $ref.range * 40)
    } else { 100 }
    $roughScore = if ($ref.rough -gt 0.001) {
        [Math]::Max(0, 100 - [Math]::Abs($ref.rough - $ans.rough) / $ref.rough * 40)
    } else { 100 }
    # levels = unique colors count (robust to band quantization); tolerance-based
    $levelScore = [Math]::Max(0, 100 - [Math]::Min(60, [Math]::Abs($ref.colors - $ans.colors) * 6))
    $shapeScore = 100
    if ($q.type -eq 'shape') { $shapeScore = Get-Shape $refPath $ansPath }

    $total = 0.0
    $total += $w.hue * $hueScore / 100
    $total += $w.sat * $satScore / 100
    $total += $w.contrast * $contrastScore / 100
    $total += $w.rough * $roughScore / 100
    $total += $w.levels * $levelScore / 100
    $total += $w.shape * $shapeScore / 100

    Write-Host ""
    Write-Host ("===== 评分 {0}（{1}）=====" -f $q.id, $q.title)
    Write-Host ("  参考: hue={0} sat={1:N2} range={2:N2} rough={3:N3} colors={5}" -f $ref.hue, $ref.sat, $ref.range, $ref.rough, $ref.levels, $ref.colors)
    Write-Host ("  作答: hue={0} sat={1:N2} range={2:N2} rough={3:N3} colors={5}" -f $ans.hue, $ans.sat, $ans.range, $ans.rough, $ans.levels, $ans.colors)
    Write-Host ("  色相(权重{0}): {1:N1}" -f $w.hue, $hueScore)
    Write-Host ("  饱和度(权重{0}): {1:N1}" -f $w.sat, $satScore)
    Write-Host ("  对比度(权重{0}): {1:N1}" -f $w.contrast, $contrastScore)
    Write-Host ("  粗糙度(权重{0}): {1:N1}" -f $w.rough, $roughScore)
    Write-Host ("  台阶数(权重{0}): {1:N1}" -f $w.levels, $levelScore)
    if ($q.type -eq 'shape') { Write-Host ("  形态(权重{0}): {1:N1}" -f $w.shape, $shapeScore) }
    Write-Host ("  ===== 总分: {0:N1} / 100 =====" -f $total)
    if ($total -ge $pass) {
        Write-Host ("  PASS（≥ {0}）过关！" -f $pass)
    } else {
        Write-Host ("  FAIL（< {0}）未过关，对照 MC_PIXEL_GUIDE.md 调整后重画再考。" -f $pass)
    }
    exit 0
}

Write-Host "用法: exam.ps1 -List | -Show <id> | -Grade <id> [-Answer <path>]"
