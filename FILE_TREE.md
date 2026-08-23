# DraftSetu Clean Project File Tree

```text
draftsetu/ (Project Root)
├── alembic/
│   ├── versions/
│   │   ├── 88cdfa21db79_add_dob_mobile_to_user.py
│   │   └── c6930930cf37_initial_schema.py
│   ├── env.py
│   ├── README
│   └── script.py.mako
├── backend/
│   ├── core/
│   │   ├── config.py
│   │   └── constants.py
│   ├── models/
│   │   └── __init__.py
│   ├── routers/
│   │   ├── admin.py
│   │   ├── auth.py
│   │   ├── demo_datasets.py
│   │   ├── documents.py
│   │   ├── menu.py
│   │   ├── pages.py
│   │   ├── templates.py
│   │   └── wallet.py
│   ├── schemas/
│   │   ├── __init__.py
│   │   └── user.py
│   ├── services/
│   │   ├── activity_service.py
│   │   ├── auth_service.py
│   │   ├── document_service.py
│   │   ├── docx_engine.py
│   │   ├── template_service.py
│   │   └── wallet_service.py
│   ├── templates/
│   │   └── master.docx
│   ├── uploads/
│   │   ├── outputs/            # Generated document outputs
│   │   ├── temp_previews/      # Temporary rendered preview files
│   │   └── templates_storage/  # User uploaded DOCX templates
│   ├── utils/
│   │   ├── __init__.py
│   │   ├── date_utils.py
│   │   ├── maintenance.py
│   │   ├── pg_backup.py
│   │   └── sqlite_to_postgres.py
│   ├── database.py
│   ├── main.py
│   └── requirements.txt
├── cypress/
│   └── e2e/
│       └── thelegalsetu_audit.cy.js
├── public/
│   ├── logo.png
│   └── test.docx
├── scripts/
│   ├── check_db.py
│   ├── check_port.py
│   ├── create_template.py
│   ├── seed_db.py
│   ├── test_api.py
│   ├── test_upload_real.py
│   └── test_upload.py
├── src/
│   ├── components/
│   │   ├── A4Page.jsx
│   │   ├── ActivityLogs.jsx
│   │   ├── AdminDashboard.jsx
│   │   ├── AdminPanel.jsx
│   │   ├── AdminSharedModals.jsx
│   │   ├── AdminWalletPanel.jsx
│   │   ├── AuthModal.jsx
│   │   ├── DocumentPreview.jsx
│   │   ├── DocumentServicesPanel.jsx
│   │   ├── DynamicFormRenderer.jsx
│   │   ├── FormPanel.jsx
│   │   ├── GovHeader.jsx
│   │   ├── HybridDropdownField.jsx
│   │   ├── Icons.jsx
│   │   ├── InputField.jsx
│   │   ├── MyDocumentsModal.jsx
│   │   ├── NestedRepeater.jsx
│   │   ├── PartyManager.jsx
│   │   ├── PdfPreviewModal.jsx
│   │   ├── PreviewModal.jsx
│   │   ├── RichTextEditor.jsx
│   │   ├── StorageAnalytics.jsx
│   │   ├── TemplateAnalytics.jsx
│   │   ├── TemplateAnalyticsDetail.jsx
│   │   ├── TemplateEditorModal.jsx
│   │   ├── TemplateHealth.jsx
│   │   ├── UserMenu.jsx
│   │   └── WalletDashboard.jsx
│   ├── pages/
│   │   ├── HomePage.jsx
│   │   └── StaticPageView.jsx
│   ├── services/
│   │   └── sessionManager.js
│   └── utils/
│       ├── draftCacheManager.js
│       ├── formUtils.js
│       ├── gujarati_utils.jsx
│       └── maskAadhaar.js
├── tests/
│   ├── document_services_panel.spec.js
│   ├── extra_paragraphs_textarea.spec.js
│   ├── flatpickr_verification.spec.js
│   ├── playwright_test_suite.spec.js
│   ├── template_switching_isolation.spec.js
│   ├── wallet_readiness_audit.spec.js
│   └── working_sessions.spec.js
├── uploads/
│   ├── outputs/            # Generated document outputs
│   ├── temp_previews/      # Temporary rendered preview files
│   └── templates_storage/  # User uploaded DOCX templates
├── utils/
│   └── maskAadhaar.js
├── alembic.ini
├── app.jsx
├── constants.jsx
├── cypress.config.js
├── DEPLOYMENT.md
├── docker-compose.yml
├── Dockerfile
├── Dockerfile.frontend
├── FILE_TREE.md
├── index.html
├── nginx.conf
├── package-lock.json
├── package.json
├── playwright.config.js
├── PRODUCTION_CUTOVER.md
├── start_backend.bat
├── start_backend.sh
├── start_frontend.bat
├── style.css
├── test.docx
└── test.html
`
