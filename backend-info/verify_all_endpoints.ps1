# LandLens Complete API Verification Script
$baseUrl = "https://dpyyh7torlown.cloudfront.net"
$ErrorActionPreference = "Continue"

Write-Host "=============================================" -ForegroundColor Cyan
Write-Host "LandLens Complete Endpoint Test Suite" -ForegroundColor Cyan
Write-Host "=============================================" -ForegroundColor Cyan

# Results array to store final checklist status
$script:results = @()

# Dynamic user emails to avoid key clashes
$timestamp = Get-Date -Format "yyyyMMddHHmmss"
$adminEmail = "admin_$timestamp@landlens.com"
$govtEmail = "govt_$timestamp@landlens.com"
$providerEmail = "provider_$timestamp@landlens.com"
$buyerEmail = "buyer_$timestamp@landlens.com"

# Request helper
function Invoke-TestRequest {
    param(
        [string]$Method,
        [string]$Uri,
        [hashtable]$Headers,
        [string]$Body,
        [int[]]$ExpectedStatus,
        [string]$Description,
        [string]$ContentType = "application/json"
    )

    $status = 0
    $content = $null
    $pass = $false

    try {
        $params = @{
            Uri = $Uri
            Method = $Method
            ErrorAction = "Stop"
            UseBasicParsing = $true
        }
        if ($Headers) { $params.Headers = $Headers }
        if ($Body) { 
            $params.Body = $Body 
            $params.ContentType = $ContentType
        }

        # Invoke-WebRequest check for older PS versions
        $res = Invoke-WebRequest @params
        $status = $res.StatusCode
        $content = $res.Content
    }
    catch {
        if ($_.Exception -and $_.Exception.Response) {
            $status = [int]$_.Exception.Response.StatusCode
            $reader = New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())
            $content = $reader.ReadToEnd()
            $reader.Close()
        } else {
            $status = 999
            $content = $_.Exception.Message
        }
    }

    if ($ExpectedStatus -contains $status) {
        $pass = $true
        Write-Host "  [PASS] ($status) - $Description" -ForegroundColor Green
    } else {
        Write-Host "  [FAIL] ($status, Expected: $($ExpectedStatus -join ',')) - $Description" -ForegroundColor Red
        if ($content) {
            Write-Host "         Response: $content" -ForegroundColor DarkRed
        }
    }

    $script:results += [PSCustomObject]@{
        Description = $Description
        Status = $status
        Passed = $pass
        Content = $content
    }

    return $content
}

# -------------------------------------------------------------
# 1. Registration & Auth
# -------------------------------------------------------------
Write-Host "`n[1] Testing Auth & Registration..." -ForegroundColor Yellow

# Helper to register user
function Register-User($email, $role, $firstName, $lastName) {
    $body = @{
        email = $email
        password = "Password123"
        firstName = $firstName
        lastName = $lastName
        phoneNumber = "9876543210"
        role = $role
    } | ConvertTo-Json

    return Invoke-TestRequest -Method Post -Uri "$baseUrl/api/auth/register" -Body $body -ExpectedStatus @(200, 201) -Description "Register $role ($email)"
}

Register-User $adminEmail "ADMIN" "Super" "Admin" | Out-Null
Register-User $govtEmail "GOVERNMENT_OFFICER" "Inspector" "Rao" | Out-Null
Register-User $providerEmail "PROVIDER" "Builder" "Prasad" | Out-Null
Register-User $buyerEmail "BUYER" "Buyer" "Kumar" | Out-Null

# Helper to login
function Login-User($email) {
    $body = @{
        email = $email
        password = "Password123"
    } | ConvertTo-Json

    $resContent = Invoke-TestRequest -Method Post -Uri "$baseUrl/api/auth/login" -Body $body -ExpectedStatus 200 -Description "Login user ($email)"
    if ($resContent) {
        return $resContent | ConvertFrom-Json
    }
    return $null
}

$adminSession = Login-User $adminEmail
$govtSession = Login-User $govtEmail
$providerSession = Login-User $providerEmail
$buyerSession = Login-User $buyerEmail

$adminHeaders = @{ Authorization = "Bearer $($adminSession.accessToken)" }
$govtHeaders = @{ Authorization = "Bearer $($govtSession.accessToken)" }
$providerHeaders = @{ Authorization = "Bearer $($providerSession.accessToken)" }
$buyerHeaders = @{ Authorization = "Bearer $($buyerSession.accessToken)" }

# -------------------------------------------------------------
# 2. User Profile Endpoint
# -------------------------------------------------------------
Write-Host "`n[2] Testing Profile Endpoints..." -ForegroundColor Yellow
Invoke-TestRequest -Method Get -Uri "$baseUrl/api/users/me" -Headers $providerHeaders -ExpectedStatus 200 -Description "Get Current User profile" | Out-Null

# -------------------------------------------------------------
# 3. Security & Role Restriction Checks
# -------------------------------------------------------------
Write-Host "`n[3] Testing Role Restrictions (Expected 403 Forbidden)..." -ForegroundColor Yellow

# Try posting property as BUYER (should fail)
$unauthorizedPropBody = @{
    title = "Unauthorized Test Plot"
    category = "AGRICULTURAL"
    area = 1000.0
    price = 100000.0
    description = "Test unauthorized"
    surveyNumber = "AP/TEST/01"
    address = "Test Street"
    latitude = 12.34
    longitude = 56.78
    district = "Test District"
    village = "Test Village"
    state = "Test State"
    pincode = "123456"
} | ConvertTo-Json
Invoke-TestRequest -Method Post -Uri "$baseUrl/api/properties" -Headers $buyerHeaders -Body $unauthorizedPropBody -ExpectedStatus 403 -Description "Post property as BUYER (403 Forbidden)" | Out-Null

# Try fetching analytics dashboard as PROVIDER (should fail)
Invoke-TestRequest -Method Get -Uri "$baseUrl/api/analytics/dashboard" -Headers $providerHeaders -ExpectedStatus 403 -Description "Get analytics as PROVIDER (403 Forbidden)" | Out-Null

# Try fetching all users as BUYER (should fail)
Invoke-TestRequest -Method Get -Uri "$baseUrl/api/users" -Headers $buyerHeaders -ExpectedStatus 403 -Description "Get all users list as BUYER (403 Forbidden)" | Out-Null

# Fetching all users as ADMIN (should pass)
Invoke-TestRequest -Method Get -Uri "$baseUrl/api/users" -Headers $adminHeaders -ExpectedStatus 200 -Description "Get all users list as ADMIN (200 OK)" | Out-Null

# -------------------------------------------------------------
# 4. Property Module
# -------------------------------------------------------------
Write-Host "`n[4] Testing Property CRUD, Images & Videos..." -ForegroundColor Yellow

$propertyBody = @{
    title = "Premium Agricultural Plot in Guntur"
    category = "AGRICULTURAL"
    area = 25000.50
    price = 7500000.00
    description = "Fertile land suitable for crops with access to canal irrigation."
    surveyNumber = "AP/GNT/2026/05"
    address = "Village Road, Tenali Rural"
    latitude = 16.2432
    longitude = 80.6405
    district = "Guntur"
    village = "Tenali Rural"
    state = "Andhra Pradesh"
    pincode = "522201"
    threeSixtyImageUrl = "http://storage.landlens.com/panoramas/guntur_plot.jpg"
} | ConvertTo-Json

$createdPropJson = Invoke-TestRequest -Method Post -Uri "$baseUrl/api/properties" -Headers $providerHeaders -Body $propertyBody -ExpectedStatus 200 -Description "Create Property Listing"
$propertyId = ""
$propertyCode = ""
if ($createdPropJson) {
    $propObj = $createdPropJson | ConvertFrom-Json
    $propertyId = $propObj.id
    $propertyCode = $propObj.propertyCode
}

Invoke-TestRequest -Method Get -Uri "$baseUrl/api/properties" -ExpectedStatus 200 -Description "List / Search Properties" | Out-Null
Invoke-TestRequest -Method Get -Uri "$baseUrl/api/properties/$propertyId" -ExpectedStatus 200 -Description "Get Property by ID" | Out-Null

# Update property listing
$updateBody = @{
    title = "Premium Agricultural Plot in Guntur - Updated"
    category = "AGRICULTURAL"
    area = 25000.50
    price = 7600000.00
    description = "Updated description: Fertile land suitable for crops with access to canal irrigation."
    surveyNumber = "AP/GNT/2026/05"
    address = "Village Road, Tenali Rural"
    latitude = 16.2432
    longitude = 80.6405
    district = "Guntur"
    village = "Tenali Rural"
    state = "Andhra Pradesh"
    pincode = "522201"
    threeSixtyImageUrl = "http://storage.landlens.com/panoramas/guntur_plot_updated.jpg"
} | ConvertTo-Json
Invoke-TestRequest -Method Put -Uri "$baseUrl/api/properties/$propertyId" -Headers $providerHeaders -Body $updateBody -ExpectedStatus 200 -Description "Update Property Listing" | Out-Null

# Images
$imageBody = @{
    imageUrl = "http://storage.landlens.com/images/guntur_plot_1.jpg"
    thumbnailUrl = "http://storage.landlens.com/images/guntur_plot_1_thumb.jpg"
    displayOrder = 1
} | ConvertTo-Json
Invoke-TestRequest -Method Post -Uri "$baseUrl/api/properties/$propertyId/images" -Headers $providerHeaders -Body $imageBody -ExpectedStatus 200 -Description "Upload Property Image" | Out-Null
Invoke-TestRequest -Method Get -Uri "$baseUrl/api/properties/$propertyId/images" -ExpectedStatus 200 -Description "Get Property Images" | Out-Null

# Videos
$videoBody = @{
    videoUrl = "http://storage.landlens.com/videos/guntur_plot_walkthrough.mp4"
    duration = 120
    thumbnailUrl = "http://storage.landlens.com/videos/guntur_plot_walkthrough_thumb.jpg"
} | ConvertTo-Json
Invoke-TestRequest -Method Post -Uri "$baseUrl/api/properties/$propertyId/videos" -Headers $providerHeaders -Body $videoBody -ExpectedStatus 200 -Description "Upload Property Video" | Out-Null
Invoke-TestRequest -Method Get -Uri "$baseUrl/api/properties/$propertyId/videos" -ExpectedStatus 200 -Description "Get Property Videos" | Out-Null

# -------------------------------------------------------------
# 5. Buyer Module
# -------------------------------------------------------------
Write-Host "`n[5] Testing Buyer saved list bookmarks..." -ForegroundColor Yellow
Invoke-TestRequest -Method Post -Uri "$baseUrl/api/properties/$propertyId/save" -Headers $buyerHeaders -ExpectedStatus 200 -Description "Save / Bookmark Property" | Out-Null
Invoke-TestRequest -Method Get -Uri "$baseUrl/api/properties/saved" -Headers $buyerHeaders -ExpectedStatus 200 -Description "Get Saved Properties List" | Out-Null
Invoke-TestRequest -Method Delete -Uri "$baseUrl/api/properties/$propertyId/save" -Headers $buyerHeaders -ExpectedStatus 200 -Description "Unsave / Remove Property Bookmark" | Out-Null

# -------------------------------------------------------------
# 6. Visits Scheduling
# -------------------------------------------------------------
Write-Host "`n[6] Testing Visit Scheduling..." -ForegroundColor Yellow
$visitBody = @{
    visitDate = "2026-07-20"
    visitTime = "10:30:00"
} | ConvertTo-Json
$createdVisitJson = Invoke-TestRequest -Method Post -Uri "$baseUrl/api/properties/$propertyId/visit" -Headers $buyerHeaders -Body $visitBody -ExpectedStatus 200 -Description "Schedule Tour Visit"
$visitId = ""
if ($createdVisitJson) {
    $visitObj = $createdVisitJson | ConvertFrom-Json
    $visitId = $visitObj.id
}

Invoke-TestRequest -Method Get -Uri "$baseUrl/api/properties/visits" -Headers $providerHeaders -ExpectedStatus 200 -Description "Get Visits (as Provider)" | Out-Null
Invoke-TestRequest -Method Get -Uri "$baseUrl/api/properties/visits" -Headers $buyerHeaders -ExpectedStatus 200 -Description "Get Visits (as Buyer)" | Out-Null
Invoke-TestRequest -Method Put -Uri "$baseUrl/api/properties/visits/$visitId`?status=CONFIRMED" -Headers $providerHeaders -ExpectedStatus 200 -Description "Update Visit Status (Confirm)" | Out-Null

# -------------------------------------------------------------
# 7. Document Module
# -------------------------------------------------------------
Write-Host "`n[7] Testing Document Upload & OCR..." -ForegroundColor Yellow
$docBody = @{
    documentType = "PATTA"
    fileUrl = "http://storage.landlens.com/documents/patta_tenali_rural.pdf"
} | ConvertTo-Json
$createdDocJson = Invoke-TestRequest -Method Post -Uri "$baseUrl/api/properties/$propertyId/documents" -Headers $providerHeaders -Body $docBody -ExpectedStatus 200 -Description "Upload Document"
$docId = ""
if ($createdDocJson) {
    $docObj = $createdDocJson | ConvertFrom-Json
    $docId = $docObj.id
}

Invoke-TestRequest -Method Get -Uri "$baseUrl/api/properties/$propertyId/documents" -ExpectedStatus 200 -Description "Get Property Documents" | Out-Null
Invoke-TestRequest -Method Post -Uri "$baseUrl/api/documents/$docId/ocr" -Headers $providerHeaders -ExpectedStatus 200 -Description "Trigger Mock OCR Analysis" | Out-Null

# -------------------------------------------------------------
# 8. AI Verification Module
# -------------------------------------------------------------
Write-Host "`n[8] Testing AI Verification Engine..." -ForegroundColor Yellow
Invoke-TestRequest -Method Post -Uri "$baseUrl/api/properties/$propertyId/ai-verify" -Headers $providerHeaders -ExpectedStatus 200 -Description "Trigger AI Land Verification Engine" | Out-Null
Invoke-TestRequest -Method Get -Uri "$baseUrl/api/properties/$propertyId/ai-verification" -ExpectedStatus 200 -Description "Get AI Verification Trust Report" | Out-Null

# -------------------------------------------------------------
# 9. Government Verification
# -------------------------------------------------------------
Write-Host "`n[9] Testing Government Verification & Timelines..." -ForegroundColor Yellow
$govReviewBody = @{
    status = "APPROVED"
    remarks = "Verified bounds on local land records maps. Approved by officer."
} | ConvertTo-Json
Invoke-TestRequest -Method Post -Uri "$baseUrl/api/properties/$propertyId/government-verify" -Headers $govtHeaders -Body $govReviewBody -ExpectedStatus 200 -Description "Submit Government Review Approval" | Out-Null
Invoke-TestRequest -Method Get -Uri "$baseUrl/api/properties/$propertyId/timeline" -ExpectedStatus 200 -Description "Get Audit Verification Timeline" | Out-Null

# -------------------------------------------------------------
# 10. Fraud Module
# -------------------------------------------------------------
Write-Host "`n[10] Testing Fraud Report Submission, Assignment, and Resolution..." -ForegroundColor Yellow
$fraudBody = @{
    reason = "Double Listing"
    description = "The property bounds overlap another registered claim."
} | ConvertTo-Json
$createdFraudJson = Invoke-TestRequest -Method Post -Uri "$baseUrl/api/properties/$propertyId/fraud-reports" -Headers $buyerHeaders -Body $fraudBody -ExpectedStatus 200 -Description "Submit Fraud Report"
$fraudId = ""
if ($createdFraudJson) {
    $fraudObj = $createdFraudJson | ConvertFrom-Json
    $fraudId = $fraudObj.id
}

Invoke-TestRequest -Method Get -Uri "$baseUrl/api/fraud-reports" -ExpectedStatus 200 -Description "Get All Fraud Reports" | Out-Null
Invoke-TestRequest -Method Get -Uri "$baseUrl/api/properties/$propertyId/fraud-reports" -ExpectedStatus 200 -Description "Get Fraud Reports for Property" | Out-Null

$officerId = $govtSession.userId
Invoke-TestRequest -Method Put -Uri "$baseUrl/api/fraud-reports/$fraudId/assign`?officerId=$officerId" -Headers $govtHeaders -ExpectedStatus 200 -Description "Assign Fraud Report to Officer" | Out-Null
Invoke-TestRequest -Method Put -Uri "$baseUrl/api/fraud-reports/$fraudId/resolve`?status=RESOLVED_FRAUDULENT" -Headers $govtHeaders -ExpectedStatus 200 -Description "Resolve Fraud Report Status" | Out-Null

# -------------------------------------------------------------
# 11. Notifications
# -------------------------------------------------------------
Write-Host "`n[11] Testing Notifications..." -ForegroundColor Yellow

# Note: Since the backend doesn't automatically trigger notifications yet,
# we expect the notification list to be empty or contain seeded items.
$notifJson = Invoke-TestRequest -Method Get -Uri "$baseUrl/api/notifications" -Headers $buyerHeaders -ExpectedStatus 200 -Description "Get Notifications List"
$notifId = ""
if ($notifJson) {
    $notifList = $notifJson | ConvertFrom-Json
    if ($notifList.Count -gt 0) {
        $notifId = $notifList[0].id
    }
}

if ($notifId) {
    Invoke-TestRequest -Method Put -Uri "$baseUrl/api/notifications/$notifId/read" -Headers $buyerHeaders -ExpectedStatus 200 -Description "Mark Notification as Read" | Out-Null
} else {
    Write-Host "  [SKIP] Mark Notification as Read (No active notification records found)" -ForegroundColor Cyan
}

# -------------------------------------------------------------
# 12. AI Chat
# -------------------------------------------------------------
Write-Host "`n[12] Testing AI Chat Assistant Threads..." -ForegroundColor Yellow
$createdConvoJson = Invoke-TestRequest -Method Post -Uri "$baseUrl/api/ai/conversations?title=LandQueryHelp" -Headers $buyerHeaders -ExpectedStatus 200 -Description "Start AI Chat Thread"
$convoId = ""
if ($createdConvoJson) {
    $convoObj = $createdConvoJson | ConvertFrom-Json
    $convoId = $convoObj.id
}

Invoke-TestRequest -Method Get -Uri "$baseUrl/api/ai/conversations" -Headers $buyerHeaders -ExpectedStatus 200 -Description "Get AI Conversation Threads" | Out-Null

# Send message (plain text body)
Invoke-TestRequest -Method Post -Uri "$baseUrl/api/ai/conversations/$convoId/messages" -Headers $buyerHeaders -Body "Explain how the patta check works" -ContentType "text/plain" -ExpectedStatus 200 -Description "Send Message to AI Assistant" | Out-Null
Invoke-TestRequest -Method Get -Uri "$baseUrl/api/ai/conversations/$convoId/messages" -Headers $buyerHeaders -ExpectedStatus 200 -Description "Get messages in AI Conversation" | Out-Null

# -------------------------------------------------------------
# 13. Developer API Keys & External Verification
# -------------------------------------------------------------
Write-Host "`n[13] Testing Developer Portal API Keys & External API access..." -ForegroundColor Yellow
$createdKeyJson = Invoke-TestRequest -Method Post -Uri "$baseUrl/api/developer/keys?name=PartnerPortal" -Headers $providerHeaders -ExpectedStatus 200 -Description "Create API Key"
$apiKeyId = ""
$rawApiKey = ""
if ($createdKeyJson) {
    $keyObj = $createdKeyJson | ConvertFrom-Json
    $apiKeyId = $keyObj.apiKeyId
    $rawApiKey = $keyObj.rawApiKey
}

Invoke-TestRequest -Method Get -Uri "$baseUrl/api/developer/keys" -Headers $providerHeaders -ExpectedStatus 200 -Description "Get My API Keys" | Out-Null

# Verify using External API header "x-api-key"
$extHeaders = @{ "x-api-key" = $rawApiKey }
Invoke-TestRequest -Method Get -Uri "$baseUrl/api/v1/external/properties/$propertyCode/verify" -Headers $extHeaders -ExpectedStatus 200 -Description "Query External API (using x-api-key)" | Out-Null

# Key Logs & Revocation
Invoke-TestRequest -Method Get -Uri "$baseUrl/api/developer/keys/$apiKeyId/logs" -Headers $providerHeaders -ExpectedStatus 200 -Description "Get API Key Usage Logs" | Out-Null
Invoke-TestRequest -Method Delete -Uri "$baseUrl/api/developer/keys/$apiKeyId" -Headers $providerHeaders -ExpectedStatus 200 -Description "Revoke API Key" | Out-Null

# -------------------------------------------------------------
# 14. Analytics
# -------------------------------------------------------------
Write-Host "`n[14] Testing Dashboard Analytics..." -ForegroundColor Yellow
Invoke-TestRequest -Method Get -Uri "$baseUrl/api/analytics/dashboard" -Headers $adminHeaders -ExpectedStatus 200 -Description "Get Admin Dashboard Metrics" | Out-Null

# -------------------------------------------------------------
# 15. Property Listing Cleanup / Delete
# -------------------------------------------------------------
Write-Host "`n[15] Cleaning up created property listing..." -ForegroundColor Yellow
Invoke-TestRequest -Method Delete -Uri "$baseUrl/api/properties/$propertyId" -Headers $providerHeaders -ExpectedStatus 200 -Description "Delete Property Listing" | Out-Null

# -------------------------------------------------------------
# 16. Final Report Summary
# -------------------------------------------------------------
$passedCount = ($script:results | Where-Object { $_.Passed -eq $true }).Count
$failedCount = ($script:results | Where-Object { $_.Passed -eq $false }).Count

Write-Host "`n=======================================================" -ForegroundColor Cyan
Write-Host "             LandLens Verification Report             " -ForegroundColor Cyan
Write-Host "=======================================================" -ForegroundColor Cyan

foreach ($res in $script:results) {
    $dots = "." * [Math]::Max(1, 80 - $res.Description.Length)
    if ($res.Passed) {
        Write-Host "$($res.Description) $dots PASS (HTTP $($res.Status))" -ForegroundColor Green
    } else {
        Write-Host "$($res.Description) $dots FAIL (HTTP $($res.Status))" -ForegroundColor Red
    }
}

Write-Host "=======================================================" -ForegroundColor Cyan
Write-Host " Total Passed : $passedCount" -ForegroundColor Green
if ($failedCount -gt 0) {
    Write-Host " Total Failed : $failedCount" -ForegroundColor Red
} else {
    Write-Host " Total Failed : $failedCount" -ForegroundColor Green
}
Write-Host "=======================================================" -ForegroundColor Cyan

if ($failedCount -gt 0) {
    exit 1
} else {
    exit 0
}
