$csvPath = "C:/Users/souha/Downloads/TEST FONC CO 591 M05/TEST FONC CO 591 M05/19/TRACA.csv"
$raw = Get-Content $csvPath -Raw
$lines = ($raw -split "`r?`n") | Where-Object { $_.Trim() -ne '' }
Write-Host "raw_nonempty_lines:$($lines.Count)"

if ($lines.Count -lt 2) {
  Write-Host "parsed_rows:0"
  exit 0
}

$firstLine = $lines[0]
$delimiter = if ((($firstLine.Split(';')).Length - 1) -ge (($firstLine.Split(',')).Length - 1)) { ';' } else { ',' }
$headers = $firstLine.Split($delimiter) | ForEach-Object { $_.Trim() }
$rows = New-Object System.Collections.Generic.List[object]
for ($i = 1; $i -lt $lines.Count; $i++) {
  $values = $lines[$i].Split($delimiter) | ForEach-Object { $_.Trim() }
  $obj = [ordered]@{}
  for ($j = 0; $j -lt $headers.Count; $j++) {
    $value = if ($j -lt $values.Count) { $values[$j] } else { '' }
    $obj[$headers[$j]] = $value
  }
  $rows.Add([pscustomobject]$obj)
}

Write-Host "parsed_rows:$($rows.Count)"
$ns = @($rows | ForEach-Object { $_.NS } | Where-Object { $_ -and $_.Trim() -ne '' })
Write-Host "nonempty_ns:$($ns.Count)"
$unique = @($ns | Select-Object -Unique).Count
Write-Host "unique_ns:$unique"
Write-Host "unique_percent_of_raw:$([math]::Round(($unique / [double]$lines.Count) * 100, 2))%"
