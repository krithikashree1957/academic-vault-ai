# Academic Vault AI: Secure Cloud Run Application

A secure, user-authenticated academic credential archive and reflective assistant built with **Gemini 3.6 Flash**, **Cloud Firestore**, and **Firebase Authentication**. Features structured multimodal credential extraction (marksheets, degrees, certificates), editable metadata verification, owner-isolated vault persistence, and citation-backed academic dialogue.

---
## 🚀 Live Application

- **Live Cloud Run URL:** [https://academic-kiki-vault-ai.ai.studio](https://academic-kiki-vault-ai.ai.studio)
- **Service Name:** `academic-vault-ai`
- **Verification Label:** `dev-tutorial: cloud-run-ai-challenge`

## 1. System Architecture & Threat Model

The application strictly implements defense-in-depth across the 5 Threat Zones:

| Threat Zone | Identified Risks | Implementation Countermeasures |
| :--- | :--- | :--- |
| **Input Surfaces** | Malformed prompts, oversized file uploads (PDF/images), injection attacks. | Strict 25MB body payload bounds, schema destructuring, MIME validation (`application/pdf`, `image/*`), and zero-crash undefined-stripping sanitization before database persistence. |
| **Planning & Reasoning** | Indirect prompt injection via parsed document text or malicious file payloads. | Unstrusted text in marksheets/degrees treated as plain data. Gemini instructed to adhere to strict JSON `responseSchema` during extraction. Conversational RAG grounded strictly in verified document metadata. |
| **Tool Execution & API** | Secret leakage, SSRF, quota exhaustion. | Server-side route isolation (`/api/gemini/extract-document`, `/api/gemini/reflect`, `/api/gemini/summarize`); `GEMINI_API_KEY` never sent to client; resilient fallback ladder (`gemini-3.6-flash` -> `gemini-3.1-flash-lite` -> `gemini-flash-latest` -> `gemini-3.7-flash`). |
| **Memory & State** | Cross-user data leakage, session tampering. | Owner-bound Firestore security rules (`request.auth.uid == userId`) restricting all read/write operations to `/users/{userId}/interactions` and `/users/{userId}/documents`. |
| **Inter-System Communication** | Token interception, plain-text credential leaks. | Federated Google Sign-In via Firebase Auth (no password storage); Google Secret Manager runtime injection for operational keys. |

---

## 2. Environment & Prerequisites

1. **Google Cloud SDK (`gcloud`)**:
   Ensure `gcloud` CLI is installed and authenticated:
   ```bash
   gcloud auth login
   gcloud config set project YOUR_PROJECT_ID
   ```

2. **Enable Required Google Cloud APIs**:
   ```bash
   gcloud services enable \
     run.googleapis.com \
     secretmanager.googleapis.com \
     firestore.googleapis.com \
     cloudbuild.googleapis.com \
     aiplatform.googleapis.com
   ```

---

## 3. Secret Management Setup (Google Secret Manager)

Store the Gemini API Key securely in Secret Manager and grant the Cloud Run compute service account access:

```bash
# Create and populate the secret
gcloud secrets create GEMINI_API_KEY --replication-policy="automatic"
echo -n "YOUR_API_KEY" | gcloud secrets versions add GEMINI_API_KEY --data-file=-

# Grant the default Cloud Run service account access to read the secret
PROJECT_NUMBER=$(gcloud projects describe YOUR_PROJECT_ID --format="value(projectNumber)")

gcloud secrets add-iam-policy-binding GEMINI_API_KEY \
  --member="serviceAccount:${PROJECT_NUMBER}-compute@developer.gserviceaccount.com" \
  --role="roles/secretmanager.secretAccessor"
```

---

## 4. Firestore Security Rules Configuration

All user data is isolated into subcollections under `/users/{userId}`:
- `/users/{userId}/interactions/{interactionId}`: Multi-turn reflection history and insights.
- `/users/{userId}/documents/{documentId}`: Verified academic credentials (degrees, marksheets, certificates).

Deploy the owner-bound security rules in `firestore.rules`:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /users/{userId}/interactions/{interactionId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
    match /users/{userId}/documents/{documentId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
  }
}
```

Deploy the rules via Firebase CLI:
```bash
firebase deploy --only firestore:rules
```

---

## 5. Google Cloud Run Deployment Flow

Build and deploy the application container to Cloud Run using the standard Google AI Studio Gemini API key setup (with `GOOGLE_GENAI_USE_VERTEXAI=false` and standard Gemini Flash models `gemini-2.5-flash` / `gemini-1.5-flash`):

```bash
# Build and deploy service with Google AI Studio GEMINI_API_KEY
gcloud run deploy academic-vault-ai \
  --source . \
  --platform managed \
  --region us-central1 \
  --allow-unauthenticated \
  --port 3000 \
  --set-env-vars GOOGLE_GENAI_USE_VERTEXAI=false \
  --set-secrets GEMINI_API_KEY=GEMINI_API_KEY:latest
```

---

## 6. Required Campaign Verification Binding

Apply the mandatory verification resource label to register the Cloud Run service for automated challenge verification:

```bash
gcloud run services update academic-vault-ai \
  --update-labels=dev-tutorial=cloud-run-ai-challenge \
  --region=us-central1
```

---

## 7. Functional Stability & Walkthrough Steps

### Test Flow 1: Google Sign-In & Workspace Provisioning
1. Open the landing page. Verify clean Editorial typography and Google Sign-In prompt.
2. Click **"Sign in with Google"**. Complete authentication.
3. Verify immediate redirection to private workspace. Notice the **Firestore Synced** status indicator.

### Test Flow 2: Document Upload & Gemini Structured Extraction
1. Click the **Paperclip / Upload Document** button or drag-and-drop a marksheet or certificate (PDF, PNG, or JPEG).
2. Verify the extraction banner appears: *"Extracting structured academic metadata with Gemini 3.6 Flash..."*
3. Verify the **Review Extracted Credential** confirmation card appears before saving, displaying:
   - Document Classification (`Marksheet`, `Degree`, `Certificate`, `Other`)
   - Issuing Institution
   - Date of Issuance and Location
   - Academic Performance (GPA, Total Score, Honors)
   - Extracted Subjects and Grades table
   - Credential summary
4. Edit or add an additional subject row in the confirmation card.
5. Click **"Confirm & Save to Academic Vault"**.
6. Verify record is archived to Firestore `/users/{userId}/documents/{documentId}`.

### Test Flow 3: Academic Vault & Credential Inspection
1. Click the **Academic Vault** button in the header or sidebar.
2. Verify the vault modal displays all verified documents with search filtering by institution, subject, or credential type.
3. Click **"View Details"** on any credential card to inspect full grade breakdown and markdown citation syntax (`[Doc: ...](#doc:...)`).
4. Click **"Ask Gemini About This"** to formulate an inquiry directly into the reflection workspace.

### Test Flow 4: Grounded Multi-Turn Dialogue & Citation Links
1. Submit an academic question (e.g., *"What is my GPA and which courses did I excel in?"*).
2. Verify Gemini references your vault credentials and produces interactive markdown citations in the form `[Doc: Institution DocType](#doc:ID)`.
3. Click the interactive citation badge inside Gemini's response.
4. Verify the **Document Detail Modal** opens immediately displaying the exact underlying verified record.

### Test Flow 5: Summarization & Reflection Export
1. Click **"Summarize"** in the top toolbar.
2. Verify Gemini 3.6 Flash generates structured takeaways, sentiment analysis, and a recommended academic action.
3. Click the **Download** icon to export the complete multi-turn reflection session as Markdown (`.md`).
4. Sign out and log in with another account; verify complete data isolation.


## 🏆Ideathon Submission

Built for the **Google Cloud Run AI Challenge / Ideathon**, demonstrating full-stack serverless deployment, structured multimodal extraction with Gemini 3.6 Flash, and secure user-authenticated AI workflows.

---

## 👩‍💻 Author

- **Name:** Krithika shree.K
- **GitHub:** [@krithikashree1957](https://github.com/krithikashree1957)
