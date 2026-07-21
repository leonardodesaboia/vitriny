# Graph Report - .  (2026-07-21)

## Corpus Check
- 10 files · ~140,998 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 978 nodes · 1779 edges · 74 communities (60 shown, 14 thin omitted)
- Extraction: 100% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS · INFERRED: 3 edges (avg confidence: 0.85)
- Token cost: 0 input · 0 output

## Community Hubs (Navigation)
- [[_COMMUNITY_Proposal Templates|Proposal Templates]]
- [[_COMMUNITY_Billing & Invoices|Billing & Invoices]]
- [[_COMMUNITY_Request Detail|Request Detail]]
- [[_COMMUNITY_API Route Handlers (imagestripe)|API Route Handlers (image/stripe)]]
- [[_COMMUNITY_Proposal Creation|Proposal Creation]]
- [[_COMMUNITY_Services Admin|Services Admin]]
- [[_COMMUNITY_Landing  Static Pages|Landing / Static Pages]]
- [[_COMMUNITY_Public Proposal|Public Proposal]]
- [[_COMMUNITY_Billing Components|Billing Components]]
- [[_COMMUNITY_Test Helpers|Test Helpers]]
- [[_COMMUNITY_Date Input & Proposal Response|Date Input & Proposal Response]]
- [[_COMMUNITY_Business Hours  Open Now|Business Hours / Open Now]]
- [[_COMMUNITY_TypeScript Config|TypeScript Config]]
- [[_COMMUNITY_Dashboard Activity|Dashboard Activity]]
- [[_COMMUNITY_Architecture Docs|Architecture Docs]]
- [[_COMMUNITY_Email Templates|Email Templates]]
- [[_COMMUNITY_Pix Key  CPF-CNPJ Validation|Pix Key / CPF-CNPJ Validation]]
- [[_COMMUNITY_Profile Validation Schemas|Profile Validation Schemas]]
- [[_COMMUNITY_Runtime Dependencies|Runtime Dependencies]]
- [[_COMMUNITY_Dev Dependencies|Dev Dependencies]]
- [[_COMMUNITY_Onboarding Checklist|Onboarding Checklist]]
- [[_COMMUNITY_Public Profile & Phone|Public Profile & Phone]]
- [[_COMMUNITY_Dashboard Metrics|Dashboard Metrics]]
- [[_COMMUNITY_Package Scripts|Package Scripts]]
- [[_COMMUNITY_Proposal PDF|Proposal PDF]]
- [[_COMMUNITY_Requests List|Requests List]]
- [[_COMMUNITY_AGENTS Docs|AGENTS Docs]]
- [[_COMMUNITY_Credentials Auth Flow|Credentials Auth Flow]]
- [[_COMMUNITY_Dashboard Home|Dashboard Home]]
- [[_COMMUNITY_Data Model Docs|Data Model Docs]]
- [[_COMMUNITY_Registration Flow|Registration Flow]]
- [[_COMMUNITY_Auth Schemas|Auth Schemas]]
- [[_COMMUNITY_Auth Middleware  Rate Limit|Auth Middleware / Rate Limit]]
- [[_COMMUNITY_Forgot Password|Forgot Password]]
- [[_COMMUNITY_Reset Password|Reset Password]]
- [[_COMMUNITY_Login Flow|Login Flow]]
- [[_COMMUNITY_Confirm Email|Confirm Email]]
- [[_COMMUNITY_Status Badges|Status Badges]]
- [[_COMMUNITY_Package Metadata|Package Metadata]]
- [[_COMMUNITY_Root Layout Fonts|Root Layout Fonts]]
- [[_COMMUNITY_Landing Pain|Landing Pain]]
- [[_COMMUNITY_Button Component|Button Component]]
- [[_COMMUNITY_Phone Input|Phone Input]]
- [[_COMMUNITY_Email Verification Tokens|Email Verification Tokens]]
- [[_COMMUNITY_Dashboard Activity Query|Dashboard Activity Query]]
- [[_COMMUNITY_Next Config  Security Headers|Next Config / Security Headers]]
- [[_COMMUNITY_Community 47|Community 47]]
- [[_COMMUNITY_Profile Identity Docs|Profile Identity Docs]]
- [[_COMMUNITY_Community 49|Community 49]]
- [[_COMMUNITY_Community 50|Community 50]]
- [[_COMMUNITY_Community 54|Community 54]]
- [[_COMMUNITY_Community 55|Community 55]]
- [[_COMMUNITY_Community 56|Community 56]]
- [[_COMMUNITY_Community 59|Community 59]]
- [[_COMMUNITY_Community 60|Community 60]]
- [[_COMMUNITY_Community 61|Community 61]]
- [[_COMMUNITY_Community 62|Community 62]]
- [[_COMMUNITY_Community 63|Community 63]]
- [[_COMMUNITY_Community 64|Community 64]]
- [[_COMMUNITY_Community 65|Community 65]]
- [[_COMMUNITY_Community 68|Community 68]]

## God Nodes (most connected - your core abstractions)
1. `compilerOptions` - 18 edges
2. `requireProviderProfile()` - 17 edges
3. `makeFormData()` - 17 edges
4. `Architecture` - 16 edges
5. `getPublicThemePreset()` - 15 edges
6. `formatPhoneBR()` - 15 edges
7. `phoneToWhatsAppNumber()` - 14 edges
8. `scripts` - 14 edges
9. `makePrismaMock()` - 12 edges
10. `createPixPayment()` - 11 edges

## Surprising Connections (you probably didn't know these)
- `BillingPage()` --calls--> `getCurrentMonthRange()`  [EXTRACTED]
  app/(dashboard)/dashboard/billing/page.tsx → lib/plan-limits.ts
- `DashboardPage()` --calls--> `getRecentDashboardActivity()`  [EXTRACTED]
  app/(dashboard)/dashboard/page.tsx → lib/dashboard-activity.ts
- `DashboardPage()` --calls--> `getCurrentMonthRange()`  [EXTRACTED]
  app/(dashboard)/dashboard/page.tsx → lib/plan-limits.ts
- `DashboardPage()` --calls--> `getPlanLimits()`  [EXTRACTED]
  app/(dashboard)/dashboard/page.tsx → lib/plan-limits.ts
- `DashboardPage()` --calls--> `pixPaymentExpiryCutoff()`  [EXTRACTED]
  app/(dashboard)/dashboard/page.tsx → lib/utils/date.ts

## Import Cycles
- 1-file cycle: `lib/stripe.ts -> lib/stripe.ts`

## Communities (74 total, 14 thin omitted)

### Community 0 - "Proposal Templates"
Cohesion: 0.05
Nodes (48): errorMessages, ProposalTemplatesPageProps, TemplateWithItems, ProposalTemplateForm(), ProposalTemplateFormProps, PublicServicesGrid(), requireProviderProfile(), createProposalTemplate() (+40 more)

### Community 1 - "Billing & Invoices"
Cohesion: 0.05
Nodes (48): BillingPage(), DashboardLayout(), errorMessages, formatMoney(), PublicQuoteRequestPage(), PublicQuoteRequestPageProps, AsyncInvoiceList(), InvoiceResponse (+40 more)

### Community 2 - "Request Detail"
Cohesion: 0.08
Nodes (41): RequestDetailPage(), RequestDetailPageProps, actorLabels, formatDate(), formatDateShort(), getInitials(), proposalStatusBadge, proposalStatusLabel (+33 more)

### Community 3 - "API Route Handlers (image/stripe)"
Cohesion: 0.07
Nodes (24): DELETE(), detectImageMimeType(), POST(), resolveService(), RouteContext, handleStripeEvent(), mapStripeStatus(), POST() (+16 more)

### Community 4 - "Proposal Creation"
Cohesion: 0.07
Nodes (34): errorMessages, NewProposalPageProps, PricingMode, ProposalForm(), ProposalFormProps, createEmptyRow(), ProposalItemRow, ProposalItemsFields() (+26 more)

### Community 5 - "Services Admin"
Cohesion: 0.08
Nodes (31): errorMessages, ServicesPage(), ServicesPageProps, formatMoney(), ItemCardPreview(), Props, NewServiceSection(), NewServiceSectionProps (+23 more)

### Community 6 - "Landing / Static Pages"
Cohesion: 0.07
Nodes (20): metadata, sections, metadata, sections, AuthButton(), LandingCta(), container, features (+12 more)

### Community 7 - "Public Proposal"
Cohesion: 0.09
Nodes (28): actorLabels, errorMessages, formatDate(), formatMoney(), PublicProposalPage(), PublicProposalPageProps, responseMessages, statusColors (+20 more)

### Community 8 - "Billing Components"
Cohesion: 0.08
Nodes (24): BillingCardProps, STATUS_LABELS, appearance, elementsOptions, SubscriptionModal(), SubscriptionModalProps, appearance, UpdatePaymentModal() (+16 more)

### Community 9 - "Test Helpers"
Cohesion: 0.19
Nodes (17): validTemplateForm(), validProposalForm(), validProfileForm(), validServiceForm(), makeFormData(), makePrismaMock(), makeProfile(), makeSession() (+9 more)

### Community 10 - "Date Input & Proposal Response"
Cohesion: 0.15
Nodes (20): DateInput(), DateInputProps, formatDisplay(), useDateInput(), appUrl(), respondToProposal(), brDateDigitsToISO(), isISODateBeforeToday() (+12 more)

### Community 11 - "Business Hours / Open Now"
Cohesion: 0.14
Nodes (19): BusinessHoursEditor(), BusinessHoursEditorProps, DEFAULT_DAY, EMPTY_WEEK, parseDefault(), OpenNowBadge(), useIsClient(), BusinessHours (+11 more)

### Community 12 - "TypeScript Config"
Cohesion: 0.09
Nodes (21): compilerOptions, allowJs, esModuleInterop, incremental, isolatedModules, jsx, lib, module (+13 more)

### Community 13 - "Dashboard Activity"
Cohesion: 0.11
Nodes (18): activityDotClasses, DashboardRecentActivity(), DashboardRecentActivityProps, ActivitySourceEvent, DASHBOARD_REQUEST_VIEWS, DashboardActivity, DashboardActivityType, DashboardOnboardingOutcomeStep (+10 more)

### Community 14 - "Architecture Docs"
Cohesion: 0.10
Nodes (20): App Router, Architecture, Arquitetura técnica, Auth.js / NextAuth, Banco de testes, Camadas de teste, Comandos, E2E (+12 more)

### Community 15 - "Email Templates"
Cohesion: 0.23
Nodes (20): emailButton(), emailLayout(), escapeHtml(), paragraph(), PixReservationClientPaidEmailInput, PixReservationReopenedEmailInput, ProposalResponseEmailInput, ProposalSentEmailInput (+12 more)

### Community 16 - "Pix Key / CPF-CNPJ Validation"
Cohesion: 0.17
Nodes (17): CNPJ_DV1_WEIGHTS, CNPJ_DV2_WEIGHTS, cnpjCheckDigit(), cpfCheckDigit(), INFERENCE_ORDER, inferPixKeyType(), isKnownPixKeyType(), isRepeatedChars() (+9 more)

### Community 17 - "Profile Validation Schemas"
Cohesion: 0.14
Nodes (15): NETWORK_HOSTS, normalizeSocialUrl(), SOCIAL_LABELS, SocialNetwork, businessHoursSchema, businessTypeSchema, dayHoursSchema, optionalPhone (+7 more)

### Community 18 - "Runtime Dependencies"
Cohesion: 0.11
Nodes (19): dependencies, @auth/prisma-adapter, @aws-sdk/client-s3, bcryptjs, framer-motion, next, next-auth, pixbrasil (+11 more)

### Community 19 - "Dev Dependencies"
Cohesion: 0.12
Nodes (17): devDependencies, autoprefixer, eslint, eslint-config-next, @eslint/eslintrc, @playwright/test, postcss, prisma (+9 more)

### Community 20 - "Onboarding Checklist"
Cohesion: 0.17
Nodes (10): markPublicLinkUsed(), onboardingStorageKey(), getStoredFlag(), OnboardingChecklist(), OnboardingChecklistProps, OnboardingStep, PublicLinkCard(), PublicLinkCardProps (+2 more)

### Community 21 - "Public Profile & Phone"
Cohesion: 0.36
Nodes (12): generateMetadata(), getProfile, PublicProviderProfilePage(), PublicProviderProfilePageProps, formatPhoneBR(), isValidPhoneBR(), normalizePhoneBR(), onlyPhoneDigits() (+4 more)

### Community 22 - "Dashboard Metrics"
Cohesion: 0.18
Nodes (10): DashboardMetric, DashboardMetricGrid(), DashboardMetricGridProps, DashboardRevenueCard(), DashboardRevenueCardProps, AnimatedCounter(), AnimatedCounterProps, Card() (+2 more)

### Community 23 - "Package Scripts"
Cohesion: 0.14
Nodes (14): scripts, build, dev, lint, playwright:install, prisma:generate, prisma:migrate, prisma:studio (+6 more)

### Community 24 - "Proposal PDF"
Cohesion: 0.22
Nodes (10): RouteContext, actorLabels, C, formatDate(), formatMoney(), formatSchedulingDate(), ProposalPdf(), ProposalPdfData (+2 more)

### Community 25 - "Requests List"
Cohesion: 0.21
Nodes (11): errorMessages, noticeMessages, parseStatusFilter(), RequestsPage(), RequestsPageProps, statusFilters, statusLabel, warningMessages (+3 more)

### Community 26 - "AGENTS Docs"
Cohesion: 0.17
Nodes (11): Antes de alterar arquivos, Após alterar arquivos, Documentação do projeto, Estilo de código, Fora do MVP, MVP, Produto, Regra principal (+3 more)

### Community 27 - "Credentials Auth Flow"
Cohesion: 0.24
Nodes (8): errorMessages, VerifyEmailNoticePageProps, ResendVerificationForm(), loginWithCredentials(), registerUser(), rememberPendingVerificationEmail(), resendEmailVerification(), signInWithCredentials()

### Community 28 - "Dashboard Home"
Cohesion: 0.24
Nodes (9): DashboardPage(), LogoutButton(), LogoutButtonProps, DashboardPendingActions(), DashboardPendingActionsProps, PendingAction, buildMonthlyRevenueSummary(), buildOnboardingOutcomeStep() (+1 more)

### Community 29 - "Data Model Docs"
Cohesion: 0.20
Nodes (11): PostgreSQL Docker Service, Confirmação de e-mail para Credentials, Proposal, ProviderProfile, QuoteRequest, Service, User, Fluxo manual completo do MVP (+3 more)

### Community 30 - "Registration Flow"
Cohesion: 0.24
Nodes (6): RegisterPageProps, GoogleButton(), GoogleButtonProps, errorMessages, RegisterForm(), RegisterFormProps

### Community 31 - "Auth Schemas"
Cohesion: 0.29
Nodes (8): ForgotPasswordInput, forgotPasswordSchema, LoginInput, loginSchema, RegisterInput, registerSchema, ResetPasswordInput, resetPasswordSchema

### Community 32 - "Auth Middleware / Rate Limit"
Cohesion: 0.22
Nodes (5): { auth }, config, RATE_LIMIT_RULES, RateLimitRule, rateLimitStore

### Community 33 - "Forgot Password"
Cohesion: 0.29
Nodes (5): ForgotPasswordPageProps, errorMessages, ForgotPasswordForm(), ForgotPasswordFormProps, requestPasswordReset()

### Community 34 - "Reset Password"
Cohesion: 0.29
Nodes (5): ResetPasswordPageProps, errorMessages, ResetPasswordForm(), ResetPasswordFormProps, resetPassword()

### Community 35 - "Login Flow"
Cohesion: 0.33
Nodes (4): LoginPageProps, errorMessages, LoginForm(), LoginFormProps

### Community 36 - "Confirm Email"
Cohesion: 0.33
Nodes (4): ConfirmEmailPageProps, ConfirmEmailForm(), confirmEmail(), verificationTokenSchema

### Community 37 - "Status Badges"
Cohesion: 0.29
Nodes (3): BadgeStatus, defaultLabels, variantClasses

### Community 38 - "Package Metadata"
Cohesion: 0.29
Nodes (6): name, postcss, overrides, next, private, version

### Community 39 - "Root Layout Fonts"
Cohesion: 0.33
Nodes (4): fraunces, jakarta, metadata, mono

### Community 41 - "Landing Pain"
Cohesion: 0.40
Nodes (3): container, item, pains

### Community 42 - "Button Component"
Cohesion: 0.40
Nodes (4): Button, ButtonProps, ButtonVariant, variantClasses

### Community 43 - "Phone Input"
Cohesion: 0.60
Nodes (3): PhoneInput(), PhoneInputProps, usePhoneInput()

### Community 44 - "Email Verification Tokens"
Cohesion: 0.80
Nodes (3): createEmailVerificationToken(), getEmailVerificationUrl(), hashEmailVerificationToken()

### Community 45 - "Dashboard Activity Query"
Cohesion: 0.60
Nodes (3): getRecentDashboardActivity(), buildRecentDashboardActivity(), mocks

### Community 46 - "Next Config / Security Headers"
Cohesion: 0.50
Nodes (3): nextConfig, projectRoot, securityHeaders

### Community 48 - "Profile Identity Docs"
Cohesion: 0.67
Nodes (3): Business Hours Helper, Provider Profile Identity Fields, Identity Features Are FREE

## Knowledge Gaps
- **342 isolated node(s):** `RegisterPageProps`, `ForgotPasswordPageProps`, `LoginPageProps`, `ResetPasswordPageProps`, `ConfirmEmailPageProps` (+337 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **14 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `devDependencies` connect `Dev Dependencies` to `Package Metadata`?**
  _High betweenness centrality (0.061) - this node is a cross-community bridge._
- **Why does `prisma` connect `Dev Dependencies` to `API Route Handlers (image/stripe)`?**
  _High betweenness centrality (0.061) - this node is a cross-community bridge._
- **Why does `setup()` connect `API Route Handlers (image/stripe)` to `Test Helpers`?**
  _High betweenness centrality (0.056) - this node is a cross-community bridge._
- **What connects `RegisterPageProps`, `ForgotPasswordPageProps`, `LoginPageProps` to the rest of the system?**
  _345 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Proposal Templates` be split into smaller, more focused modules?**
  _Cohesion score 0.05403348554033485 - nodes in this community are weakly interconnected._
- **Should `Billing & Invoices` be split into smaller, more focused modules?**
  _Cohesion score 0.05144230769230769 - nodes in this community are weakly interconnected._
- **Should `Request Detail` be split into smaller, more focused modules?**
  _Cohesion score 0.07541478129713423 - nodes in this community are weakly interconnected._