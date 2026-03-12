$ErrorActionPreference = "Stop"

$baseUrl = "http://lwaye-staging-alb-v2-1447432352.us-east-2.elb.amazonaws.com"
$hostHeader = "api-staging.lwaye.com"

function Invoke-LwayeRequest {
  param(
    [Parameter(Mandatory = $true)]
    [string]$Method,
    [Parameter(Mandatory = $true)]
    [string]$Path,
    [object]$Body = $null,
    [hashtable]$ExtraHeaders = @{}
  )

  $headers = @{
    Host = $hostHeader
  }

  foreach ($key in $ExtraHeaders.Keys) {
    $headers[$key] = $ExtraHeaders[$key]
  }

  $params = @{
    Method      = $Method
    Uri         = "$baseUrl$Path"
    Headers     = $headers
    ContentType = "application/json"
  }

  if ($null -ne $Body) {
    $params["Body"] = ($Body | ConvertTo-Json -Depth 10 -Compress)
  }

  return Invoke-RestMethod @params
}

$results = New-Object System.Collections.Generic.List[object]

function Add-Result {
  param(
    [string]$Name,
    [string]$Status,
    [string]$Details
  )

  $results.Add([pscustomobject]@{
    Check   = $Name
    Status  = $Status
    Details = $Details
  }) | Out-Null
}

try {
  $health = Invoke-LwayeRequest -Method "GET" -Path "/health"
  if ($health.status -eq "ok") {
    Add-Result -Name "health" -Status "PASS" -Details "API returned status=ok"
  } else {
    Add-Result -Name "health" -Status "FAIL" -Details ("Unexpected payload: " + ($health | ConvertTo-Json -Compress))
  }
} catch {
  Add-Result -Name "health" -Status "FAIL" -Details $_.Exception.Message
}

try {
  $bootstrap = Invoke-LwayeRequest -Method "GET" -Path "/v1/bootstrap"
  $userCount = @($bootstrap.users).Count
  $categoryCount = @($bootstrap.categories).Count
  $locationCount = @($bootstrap.locations).Count
  if ($userCount -gt 0 -and $categoryCount -gt 0 -and $locationCount -gt 0) {
    Add-Result -Name "bootstrap" -Status "PASS" -Details "users=$userCount categories=$categoryCount locations=$locationCount"
  } else {
    Add-Result -Name "bootstrap" -Status "FAIL" -Details ("Unexpected bootstrap counts: " + ($bootstrap | ConvertTo-Json -Compress))
  }
} catch {
  Add-Result -Name "bootstrap" -Status "FAIL" -Details $_.Exception.Message
}

try {
  $feed = Invoke-LwayeRequest -Method "GET" -Path "/v1/listings"
  $listingCount = @($feed.items).Count
  if ($listingCount -gt 0) {
    Add-Result -Name "feed" -Status "PASS" -Details "items=$listingCount"

    $listing = $feed.items[0]
    try {
      $detail = Invoke-LwayeRequest -Method "GET" -Path "/v1/listings/$($listing.id)"
      if ($detail.id -eq $listing.id) {
        Add-Result -Name "listing-detail" -Status "PASS" -Details "listingId=$($detail.id)"
      } else {
        Add-Result -Name "listing-detail" -Status "FAIL" -Details "Mismatched listing detail response"
      }
    } catch {
      Add-Result -Name "listing-detail" -Status "FAIL" -Details $_.Exception.Message
    }
  } else {
    Add-Result -Name "feed" -Status "FAIL" -Details "No listings returned"
  }
} catch {
  Add-Result -Name "feed" -Status "FAIL" -Details $_.Exception.Message
}

try {
  $startOtp = Invoke-LwayeRequest -Method "POST" -Path "/v1/auth/start-otp" -Body @{
    phone = "+251900000001"
  }

  $previewCode = [string]$startOtp.code
  if ([string]::IsNullOrWhiteSpace($previewCode)) {
    Add-Result -Name "start-otp" -Status "PASS" -Details "OTP request accepted; staging is using non-preview SMS delivery"
    Add-Result -Name "auth-required-flows" -Status "SKIP" -Details "Authenticated smoke tests require the real SMS code from +251900000001"
  } else {
    Add-Result -Name "start-otp" -Status "PASS" -Details "Preview code returned"

    try {
      $verify = Invoke-LwayeRequest -Method "POST" -Path "/v1/auth/verify-otp" -Body @{
        phone             = "+251900000001"
        code              = $previewCode
        preferredLanguage = "en"
        displayName       = "Lwaye Admin"
      }

      $sessionToken = [string]$verify.session.sessionToken
      if ([string]::IsNullOrWhiteSpace($sessionToken)) {
        Add-Result -Name "verify-otp" -Status "FAIL" -Details "Session token missing"
      } else {
        Add-Result -Name "verify-otp" -Status "PASS" -Details "Authenticated as $($verify.user.id)"

        $authHeaders = @{
          Authorization = "Bearer $sessionToken"
        }

        try {
          $dashboard = Invoke-LwayeRequest -Method "GET" -Path "/v1/admin/dashboard" -ExtraHeaders $authHeaders
          Add-Result -Name "admin-dashboard" -Status "PASS" -Details ("users=" + @($dashboard.users).Count + " listings=" + @($dashboard.listings).Count)
        } catch {
          Add-Result -Name "admin-dashboard" -Status "FAIL" -Details $_.Exception.Message
        }
      }
    } catch {
      Add-Result -Name "verify-otp" -Status "FAIL" -Details $_.Exception.Message
    }
  }
} catch {
  Add-Result -Name "start-otp" -Status "FAIL" -Details $_.Exception.Message
}

$results | Format-Table -AutoSize
