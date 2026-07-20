# LandLens Frontend Design Layout Specification

This document details every role, page, tab, section, and the variables/data points displayed in each component within the LandLens frontend application. This file can be used as a reference to generate design layouts and UI mockups.

## Global Roles
The application is role-based, supporting the following roles:
1. **GUEST** (Unauthenticated)
2. **BUYER**
3. **PROVIDER** (Property listers/sellers)
4. **GOVERNMENT_OFFICER** (Verifiers/Inspectors)
5. **ADMIN** (System Administrators)

---

## 1. Authentication Pages (Role: GUEST)
These are standard entry points to the application.
- **Login Page**: Variables typically include Email, Password, "Forgot Password", and Login Button.
- **Register Page**: Variables typically include First Name, Last Name, Email, Password, Confirm Password, Role Selection, and Register Button.

---

## 2. Property Detail Page
**Path:** `/properties/:id`
**Access:** Accessible to all authenticated roles.

### Sections & Variables:
- **Header Section**
  - Property Title
  - Location Details: Village, District, State
  - Property Code (e.g., #LL-17842)
  - Status Badge (e.g., APPROVED, PENDING)
  - Category Badge (AGRICULTURAL, RESIDENTIAL, etc.)
  - AI Trust Score Badge: Percentage value (e.g., 88.5%)
  - Top Action Buttons: "AI Assistant" Toggle, "Report a Dispute" Button
- **Media Viewer (Left Column)**
  - Tabs: 360° Tour, Photos, Video
  - Variables: Active Image, 360 iframe URL, Video Player URL, Image Thumbnail Grid.
- **Location & Boundary Map (Left Column - Bottom Left)**
  - Variables: Mapbox map instance, Map/Satellite toggle, "Exact Boundary" indicator.
- **Quick Stats & Info (Left Column - Bottom Right)**
  - Quick Stats Grid: Area (acres), Price (₹), Survey No., Category
  - Location Info Box: State, District, Pincode
  - Description Box: Text details (truncated)
- **Schedule Site Visit Card (Middle Column)**
  - Input Variables: Visit Date (Date picker), Visit Time (Time picker)
  - Action: Request Button
- **Verification Timeline (Middle Column)**
  - List Items: Action Title, Date, Remarks string. Status indicator icon.
- **Report Fraud / Dispute Card (Middle Column)**
  - Input Variables: Reason Dropdown (Double Listing, Overlapped Boundary, Name Mismatch), Description Textarea.
  - Action: Submit Button
- **AI Assistant Chat Panel (Right Column - Collapsible)**
  - Header: AI Assistant info, Property context.
  - Messages Area: Chat history (Sender: User/AI), text content, "AI is thinking" loader. Quick action suggestion chips.
  - Chat Input: Text input field, Send button.

---

## 3. Buyer Dashboard (Role: BUYER)
**Path:** `/buyer`
**Tabs:** `explore`, `saved`, `visits`, `chat`, `notifications`

### Tab 1: Explore
- **Search & Filters Bar:**
  - Variables: State input, District input, Category dropdown.
  - Actions: Search button, Reset button.
  - Toggle: List Mode / Map Mode. Total properties count.
- **Property List View (Grid):**
  - **Property Card Variables:** Thumbnail/360 preview, Category chip, Title, Village, District, Status Badge, Area (acres), Price (₹). "View Property" button. Bookmark icon toggle.
- **Property Detail Side-Panel:**
  - Displayed on card selection.
  - Variables: 3D Map/Placeholder, Address, District, State, Pincode, Area, Price, Category, Survey No., Description, Media Gallery (Images, Videos).
  - Actions: "Request Visit", "Ask AI".
- **Map View Mode:** Interactive map with property markers.

### Tab 2: Visits (Scheduled Visits)
- **Visit Card Variables:** Date, Time, Status (CONFIRMED, SCHEDULED, REJECTED), Property Title snippet. "View Property" link.

### Tab 3: Chat (AI Assistant)
- **Sidebar (Conversations):** List of past chats (Chat Title). "New Chat" button.
- **Main Chat Area:** Messages list (Markdown rendering, table support, embedded Property Cards if data returned). Input textbox, Send button.

### Tab 4: Notifications
- **Notification Card Variables:** Title, Message body, Timestamp, Unread highlighting. "Mark Read" action.

---

## 4. Provider Dashboard (Role: PROVIDER)
**Path:** `/provider`
**Tabs:** `listings`, `add`, `visits`, `notifications`

### Tab 1: Listings (Property Catalog)
- **Filter Bar:** Tabs for All, Pending, Approved, Rejected with respective counts.
- **Property Card Variables:** Thumbnail, Status Badge, Title, Village, District, Area, Price, Survey No., Listing Date. "Edit" action button.
- **Detail Management Side-Panel:**
  - Sub-tabs: `AI Check`, `Media`, `Docs`, `Timeline`
  - **AI Check View:** "Run Trust Audit" button. Visuals for AI Trust Score (Circular Bar), Forgery Score (%), Overlap Score (%), Risk Score (%), Owner Match (Match/Mismatch). AI Summary text, AI Reasoning Trace (collapsible). Government Verification status and remarks.
  - **Media View:** Image upload dropzone, thumbnail grid. Video upload dropzone.
  - **Docs View:** Document Type selector (PATTA, SALE_DEED, SURVEY_MAP, EC, NOC), File uploader. List of uploaded docs showing Type, Extracted Text snippet, "Run OCR" action.
  - **Timeline View:** Audit trail list (Action, Remarks, Timestamp).

### Tab 2: Add / Edit Property
- **Form Variables:** Property Title, Category, Survey Number, Area (acres), Price (₹), State, District, Village, Pincode, Street Address, 360° Street View URL, Description, Initial Land Document Upload (Patta/Sale Deed).
- **Map Picker Tool:** Interactive map to select Lat/Lng and draw property boundary polygon.
- **Action:** Submit Property / Save Changes button.

### Tab 3: Visits
- Identical structure to Buyer Visits tab, used to manage/view requested tours.

### Tab 4: Notifications
- Standard alerts interface.

---

## 5. Government Officer Dashboard (Role: GOVERNMENT_OFFICER)
**Path:** `/officer`
**Tabs:** `analytics`, `queue`, `disputes`, `approved`, `api`, `notifications`

### Tab 1: Analytics
- **Stat Cards:** Property Views, Verifications, Fraud Cases, API Calls.

### Tab 2: Queue (Pending Verification)
- **Queue List:** Properties waiting for manual check. Cards show Thumbnail, Status, Title, Location, Area, Price.
- **Inspection Side-Panel:**
  - Quick Info & 3D Map/Map Placeholder. Details Grid (Area, Price, Category, Survey No.). Media Gallery.
  - **AI Verification Report:** Circular Trust Score, metric percentages (Forgery, Duplicate, Risk, Owner). AI Summary text, Collapsible AI Reasoning.
  - **Documents:** List showing Document Type, "View File" link, Extracted OCR Text.
  - **Verification Decision Form:** Approve/Reject toggle buttons. Quick suggestion chips ("Verified successfully", "Ownership mismatch", etc.). Remarks textarea. "Submit Decision" button.

### Tab 3: Disputes (Fraud Reports)
- **Dispute Card Variables:** Reason string, Status Badge (SUBMITTED, UNDER_INVESTIGATION, RESOLVED_FRAUDULENT), Description text, Property ID, Reporter ID.
- **Actions:** "Inspect Property" (opens panel), "Mark Fraudulent", "Dismiss Report".

### Tab 4: Approved Properties
- Grid view of all live verified properties.

### Tab 5: API Integration Hub
- **Sub-tabs:** `API Keys`, `Docs`, `Sandbox`
- **API Keys View:**
  - Create Key Form: Key Name, Scope (READ_ONLY, READ_WRITE, FULL_ADMIN), Rate Limit, Allowed IPs.
  - Active Keys Table: Name, Status, Key Prefix, ID, "Logs" button, "Revoke" button.
  - Logs Viewer Table: Method (GET/POST), Endpoint, Status Code, IP Address, Response Time (ms), Timestamp.
- **Docs View:** List of available REST endpoints with descriptions, methods, and required scopes.
- **Sandbox View:** Interactive tool to test endpoints. Endpoint selector, Method, Payload editor, Response viewer.

### Tab 6: Notifications
- Standard alerts interface.

---

## 6. Admin Dashboard (Role: ADMIN)
**Path:** `/admin`
**Tabs:** `analytics`, `developer`, `notifications`

### Tab 1: Analytics
- **Stat Cards:** Property Views, Total Searches, Verifications, Fraud Cases.
- **API Gateway Panel:** Total API requests processed (large number), API Quota Usage progress bar.
- **Performance Panel:** Progress bars for Verification Rate (%), Search to View Conversion (%), Fraud Detection Rate (%).

### Tab 2: Developer (API Key Management)
- **Create Key Panel:** Key Name input. "Create Key" button. One-time display of generated Raw API Key.
- **Active Keys List:** Shows Key Name, Status, Prefix, ID. Actions: View Logs, Revoke.
- **Logs Table:** Method, Endpoint, Status, IP, Response Time, Timestamp.

### Tab 3: Notifications
- **Notification Cards:** Categorized with styled badges based on type (SYSTEM, PROPERTY_VERIFIED, VISIT_SCHEDULED, FRAUD_ALERT, API_LIMIT_REACHED). Title, Message, Timestamp.
