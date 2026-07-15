# LandLens API Verification Script
$baseUrl = "http://landlens-production-alb-1919392235.ap-south-1.elb.amazonaws.com"
$ErrorActionPreference = "Stop"

Write-Host "=============================================" -ForegroundColor Cyan
Write-Host "LandLens API End-to-End Test Suite" -ForegroundColor Cyan
Write-Host "=============================================" -ForegroundColor Cyan

# Define test user emails
$adminEmail = "admin_" + (Get-Date -Format "yyyyMMddHHmmss") + "@landlens.com"
$govtEmail = "officer_" + (Get-Date -Format "yyyyMMddHHmmss") + "@landlens.com"
$providerEmail = "provider_" + (Get-Date -Format "yyyyMMddHHmmss") + "@landlens.com"
$buyerEmail = "buyer_" + (Get-Date -Format "yyyyMMddHHmmss") + "@landlens.com"

# Helper for registration
function Register-User($email, $role, $firstName, $lastName) {
    $body = @{
        email = $email
        password = "Password123"
        firstName = $firstName
        lastName = $lastName
        phoneNumber = "9876543210"
        role = $role
    } | ConvertTo-Json

    $res = Invoke-RestMethod -Uri "$baseUrl/api/auth/register" -Method Post -ContentType "application/json" -Body $body
    Write-Host "Registered $role user ($email): $res" -ForegroundColor Green
}

# Helper for login
function Login-User($email) {
    $body = @{
        email = $email
        password = "Password123"
    } | ConvertTo-Json

    $res = Invoke-RestMethod -Uri "$baseUrl/api/auth/login" -Method Post -ContentType "application/json" -Body $body
    Write-Host "Logged in $email (Role: $($res.role))" -ForegroundColor Green
    return $res
}

try {
    # -------------------------------------------------------------
    # 1. User Registration
    # -------------------------------------------------------------
    Write-Host "`n[1] Registering users..." -ForegroundColor Yellow
    Register-User $adminEmail "ADMIN" "Super" "Admin"
    Register-User $govtEmail "GOVERNMENT_OFFICER" "Inspector" "Rao"
    Register-User $providerEmail "PROVIDER" "Builder" "Prasad"
    Register-User $buyerEmail "BUYER" "Buyer" "Kumar"

    # -------------------------------------------------------------
    # 2. Login
    # -------------------------------------------------------------
    Write-Host "`n[2] Logging in..." -ForegroundColor Yellow
    $adminSession = Login-User $adminEmail
    $govtSession = Login-User $govtEmail
    $providerSession = Login-User $providerEmail
    $buyerSession = Login-User $buyerEmail

    $providerHeaders = @{ Authorization = "Bearer $($providerSession.accessToken)" }
    $govtHeaders = @{ Authorization = "Bearer $($govtSession.accessToken)" }
    $buyerHeaders = @{ Authorization = "Bearer $($buyerSession.accessToken)" }
    $adminHeaders = @{ Authorization = "Bearer $($adminSession.accessToken)" }

    # -------------------------------------------------------------
    # 3. Create Property Listing (Provider)
    # -------------------------------------------------------------
    Write-Host "`n[3] Creating property listing..." -ForegroundColor Yellow
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

    $property = Invoke-RestMethod -Uri "$baseUrl/api/properties" -Method Post -Headers $providerHeaders -ContentType "application/json" -Body $propertyBody
    Write-Host "Created Property ID: $($property.id) with Code: $($property.propertyCode) [Status: $($property.status)]" -ForegroundColor Green

    # -------------------------------------------------------------
    # 4. Upload Image & Video (Provider)
    # -------------------------------------------------------------
    Write-Host "`n[4] Uploading property media..." -ForegroundColor Yellow
    $imageBody = @{
        imageUrl = "http://storage.landlens.com/images/guntur_plot_1.jpg"
        thumbnailUrl = "http://storage.landlens.com/images/guntur_plot_1_thumb.jpg"
        displayOrder = 1
    } | ConvertTo-Json
    $image = Invoke-RestMethod -Uri "$baseUrl/api/properties/$($property.id)/images" -Method Post -Headers $providerHeaders -ContentType "application/json" -Body $imageBody
    Write-Host "Uploaded Image. Image URL: $($image.imageUrl)" -ForegroundColor Green

    $videoBody = @{
        videoUrl = "http://storage.landlens.com/videos/guntur_plot_walkthrough.mp4"
        duration = 120
        thumbnailUrl = "http://storage.landlens.com/videos/guntur_plot_walkthrough_thumb.jpg"
    } | ConvertTo-Json
    $video = Invoke-RestMethod -Uri "$baseUrl/api/properties/$($property.id)/videos" -Method Post -Headers $providerHeaders -ContentType "application/json" -Body $videoBody
    Write-Host "Uploaded Video. Video URL: $($video.videoUrl)" -ForegroundColor Green

    # -------------------------------------------------------------
    # 5. Upload Document & Simulate OCR (Provider)
    # -------------------------------------------------------------
    Write-Host "`n[5] Uploading land document & running OCR..." -ForegroundColor Yellow
    $docBody = @{
        documentType = "PATTA"
        fileUrl = "http://storage.landlens.com/documents/patta_tenali_rural.pdf"
    } | ConvertTo-Json
    $doc = Invoke-RestMethod -Uri "$baseUrl/api/properties/$($property.id)/documents" -Method Post -Headers $providerHeaders -ContentType "application/json" -Body $docBody
    Write-Host "Uploaded Document ID: $($doc.id) [Type: $($doc.documentType)]" -ForegroundColor Green

    $ocrRes = Invoke-RestMethod -Uri "$baseUrl/api/documents/$($doc.id)/ocr" -Method Post -Headers $providerHeaders
    Write-Host "OCR trigger output. OCR Status: $($ocrRes.ocrStatus) [Verification: $($ocrRes.verificationStatus)]" -ForegroundColor Green

    # -------------------------------------------------------------
    # 6. Trigger AI Verification (Provider)
    # -------------------------------------------------------------
    Write-Host "`n[6] Running AI engine checks..." -ForegroundColor Yellow
    $aiVerification = Invoke-RestMethod -Uri "$baseUrl/api/properties/$($property.id)/ai-verify" -Method Post -Headers $providerHeaders
    Write-Host "AI Verification Complete:" -ForegroundColor Green
    Write-Host " - Trust Score: $($aiVerification.aiTrustScore)%" -ForegroundColor Green
    Write-Host " - Forgery Score: $($aiVerification.forgeryScore)%" -ForegroundColor Green
    Write-Host " - Duplicate Score: $($aiVerification.duplicateScore)%" -ForegroundColor Green
    Write-Host " - Summary: $($aiVerification.summary)" -ForegroundColor Green

    # Verify status changed
    $updatedProperty = Invoke-RestMethod -Uri "$baseUrl/api/properties/$($property.id)" -Method Get -Headers $providerHeaders
    Write-Host "Property Status: $($updatedProperty.status) (expected: PENDING_GOVT)" -ForegroundColor Green

    # -------------------------------------------------------------
    # 7. Government Approval & Timeline (Govt Officer)
    # -------------------------------------------------------------
    Write-Host "`n[7] Inspector review and approval..." -ForegroundColor Yellow
    $reviewBody = @{
        status = "APPROVED"
        remarks = "Verified bounds on local land records maps. Matches village survey records. Approved."
    } | ConvertTo-Json
    $review = Invoke-RestMethod -Uri "$baseUrl/api/properties/$($property.id)/government-verify" -Method Post -Headers $govtHeaders -ContentType "application/json" -Body $reviewBody
    Write-Host "Officer review submitted. Approved Status: $($review.status)" -ForegroundColor Green

    # Retrieve timeline
    $timeline = Invoke-RestMethod -Uri "$baseUrl/api/properties/$($property.id)/timeline" -Method Get -Headers $govtHeaders
    Write-Host "Property audit timeline entries count: $($timeline.Count)" -ForegroundColor Green
    foreach ($entry in $timeline) {
        Write-Host " - [$($entry.timestamp)] Action: $($entry.action). Remarks: $($entry.remarks)" -ForegroundColor DarkGreen
    }

    # -------------------------------------------------------------
    # 8. Buyer Bookmark & Visit Tour Scheduling (Buyer)
    # -------------------------------------------------------------
    Write-Host "`n[8] Buyer bookmark & tour scheduling..." -ForegroundColor Yellow
    $bookmark = Invoke-RestMethod -Uri "$baseUrl/api/properties/$($property.id)/save" -Method Post -Headers $buyerHeaders
    Write-Host "Property bookmarked successfully for Buyer." -ForegroundColor Green

    $visitBody = @{
        visitDate = (Get-Date).AddDays(3).ToString("yyyy-MM-dd")
        visitTime = "10:30:00"
    } | ConvertTo-Json
    $visit = Invoke-RestMethod -Uri "$baseUrl/api/properties/$($property.id)/visit" -Method Post -Headers $buyerHeaders -ContentType "application/json" -Body $visitBody
    Write-Host "Visit scheduled on $($visit.visitDate) at $($visit.visitTime) [Status: $($visit.status)]" -ForegroundColor Green

    # -------------------------------------------------------------
    # 9. AI Chat Help Context (Buyer)
    # -------------------------------------------------------------
    Write-Host "`n[9] AI chat assistant support..." -ForegroundColor Yellow
    $convo = Invoke-RestMethod -Uri "$baseUrl/api/ai/conversations?title=Land+Documents" -Method Post -Headers $buyerHeaders
    Write-Host "Started AI conversation thread with ID: $($convo.id)" -ForegroundColor Green

    $msg = Invoke-RestMethod -Uri "$baseUrl/api/ai/conversations/$($convo.id)/messages" -Method Post -Headers $buyerHeaders -ContentType "text/plain" -Body "Explain how the patta check works"
    Write-Host "User: Explain how the patta check works" -ForegroundColor White
    Write-Host "AI Response: $($msg.content)" -ForegroundColor DarkYellow

    # -------------------------------------------------------------
    # 10. Generate API Key & External Validation (Provider/Developer)
    # -------------------------------------------------------------
    Write-Host "`n[10] Generating developer API key and calling external API..." -ForegroundColor Yellow
    $keyInfo = Invoke-RestMethod -Uri "$baseUrl/api/developer/keys?name=ProductionIntegration" -Method Post -Headers $providerHeaders
    $rawApiKey = $keyInfo.rawApiKey
    Write-Host "Generated API Key: $rawApiKey" -ForegroundColor Green

    $externalHeaders = @{ "x-api-key" = $rawApiKey }
    $extDetails = Invoke-RestMethod -Uri "$baseUrl/api/v1/external/properties/$($property.propertyCode)/verify" -Method Get -Headers $externalHeaders
    Write-Host "External verification query returned successfully:" -ForegroundColor Green
    Write-Host " - Title: $($extDetails.title)" -ForegroundColor Green
    Write-Host " - Status: $($extDetails.status)" -ForegroundColor Green
    Write-Host " - AI Trust Score: $($extDetails.aiVerification.aiTrustScore)%" -ForegroundColor Green
    Write-Host " - Timeline length: $($extDetails.timeline.Count)" -ForegroundColor Green

    # -------------------------------------------------------------
    # 11. Dashboard Analytics (Admin)
    # -------------------------------------------------------------
    Write-Host "`n[11] Admin analytics dashboard validation..." -ForegroundColor Yellow
    $dashboard = Invoke-RestMethod -Uri "$baseUrl/api/analytics/dashboard" -Method Get -Headers $adminHeaders
    Write-Host "Dashboard statistics for today ($($dashboard.analyticsDate)):" -ForegroundColor Green
    Write-Host " - Property Views: $($dashboard.propertyViews)" -ForegroundColor Green
    Write-Host " - Search Count: $($dashboard.searchCount)" -ForegroundColor Green
    Write-Host " - Verification Count: $($dashboard.verificationCount)" -ForegroundColor Green
    Write-Host " - Fraud Count: $($dashboard.fraudCount)" -ForegroundColor Green
    Write-Host " - API Calls: $($dashboard.apiCalls)" -ForegroundColor Green

    Write-Host "`n=============================================" -ForegroundColor Cyan
    Write-Host "ALL LANDLENS API TESTS PASSED SUCCESSFULLY!" -ForegroundColor Cyan
    Write-Host "=============================================" -ForegroundColor Cyan
}
catch {
    Write-Host "`n[TEST ERROR]: $($_.Exception.Message)" -ForegroundColor Red
    if ($_.ErrorDetails) { Write-Host "Details: $($_.ErrorDetails)" -ForegroundColor Red }
    exit 1
}
