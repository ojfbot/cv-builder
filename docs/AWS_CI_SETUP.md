# AWS CI/CD Setup — cv-builder Screenshot Pipeline

Sets up S3 storage for the Playwright screenshot pipeline and the draw.io canvas
auto-update workflow. Uses OIDC federation — **no static access keys** stored anywhere.

## Account context

- **AWS account**: `<YOUR_ACCOUNT_ID>`
- **Region**: `us-east-1`
- **GitHub repo**: `ojfbot/cv-builder`
- **Bucket name**: `ojfbot-cv-builder-<YOUR_ACCOUNT_ID>-us-east-1`

---

## Step 0 — AWS CLI + SSO setup (one-time, local machine)

This step sets up your local AWS CLI to authenticate via IAM Identity Center (SSO)
instead of long-lived access keys. Skip to Step 1 if your CLI is already configured.

### 0a — Secure the root account

Before creating any service credentials:

1. Sign in to the AWS Console as root
2. **Top-right → Security credentials → MFA → Assign MFA device** — use an authenticator app
3. Do not use the root account for day-to-day work after this

### 0b — Enable IAM Identity Center

1. Search for **IAM Identity Center** in the console
2. Click **Enable** — accept the recommended settings (creates a free AWS Organization)
3. Note the region it lands in (usually `us-east-1`)

### 0c — Create your admin user

**IAM Identity Center → Users → Add user**

| Field | Value |
|-------|-------|
| Username | your chosen username (e.g. `yuri`) |
| Email | your email address |

Complete the verification email to set a password. Optionally enable MFA on this user too.

**Create a permission set:**
- **Permission sets → Create → Predefined → AdministratorAccess** → accept defaults

**Assign user to the account:**
- **AWS accounts → (your account) → Assign users or groups** → select your user → select `AdministratorAccess`

**Note your SSO start URL** from **IAM Identity Center → Dashboard**
(format: `https://d-xxxxxxxxxx.awsapps.com/start`)

### 0d — Install and configure the AWS CLI

```bash
brew install awscli   # macOS; see https://docs.aws.amazon.com/cli/latest/userguide/getting-started-install.html for other platforms

aws configure sso
```

Answer each prompt:

```
SSO session name:      ojfbot
SSO start URL:         https://d-xxxxxxxxxx.awsapps.com/start   ← paste yours
SSO region:            us-east-1
SSO registration scopes: ← Enter (accept default)

CLI default client Region:  us-east-1
CLI default output format:  json
CLI profile name:           ojfbot-admin
```

A browser window opens — log in as your Identity Center user and click **Allow**.

### 0e — ~/.aws/config structure

After `aws configure sso` completes, `~/.aws/config` should look like this
(the `[default]` profile is added manually so plain `aws` commands work without `--profile`):

```ini
# ── SSO sessions ─────────────────────────────────────────────────────────────
# One session per Identity Center instance (shared across all profiles below).

[sso-session ojfbot]
sso_start_url        = https://d-xxxxxxxxxx.awsapps.com/start
sso_region           = us-east-1
sso_registration_scopes = sso:account:access

# ── Profiles ─────────────────────────────────────────────────────────────────
# Add new profiles here as you create more accounts / permission sets.
# Switch with: export AWS_PROFILE=<profile-name>
# Or use the shell alias: awsuse <profile-name>

[default]
sso_session    = ojfbot
sso_account_id = <YOUR_ACCOUNT_ID>
sso_role_name  = AdministratorAccess
region         = us-east-1
output         = json

[profile ojfbot-admin]
sso_session    = ojfbot
sso_account_id = <YOUR_ACCOUNT_ID>
sso_role_name  = AdministratorAccess
region         = us-east-1
output         = json

# Example: read-only profile for the same account
# [profile ojfbot-readonly]
# sso_session    = ojfbot
# sso_account_id = <YOUR_ACCOUNT_ID>
# sso_role_name  = ReadOnlyAccess
# region         = us-east-1
# output         = json
```

### 0f — Shell helpers (add to ~/.zshrc)

```zsh
# ── AWS CLI helpers ───────────────────────────────────────────────────────────
export AWS_DEFAULT_PROFILE=ojfbot-admin

# awslogin — refresh SSO token for the current/default profile (~8h TTL)
awslogin() {
  local profile="${AWS_PROFILE:-${AWS_DEFAULT_PROFILE:-ojfbot-admin}}"
  aws sso login --profile "$profile" && echo "✅ Logged in as profile: $profile"
}

# awsuse <profile> — switch active profile and show identity
awsuse() {
  if [ -z "$1" ]; then
    echo "Usage: awsuse <profile-name>"
    echo "Profiles:"
    grep '^\[profile ' ~/.aws/config | sed 's/\[profile //;s/\]/  /'
    echo "  default"
    return 1
  fi
  export AWS_PROFILE="$1"
  aws sts get-caller-identity && echo "✅ AWS_PROFILE=$AWS_PROFILE"
}

# awswho — show current identity
awswho() {
  echo "Profile : ${AWS_PROFILE:-${AWS_DEFAULT_PROFILE:-default}}"
  aws sts get-caller-identity
}
# ─────────────────────────────────────────────────────────────────────────────
```

After adding to `~/.zshrc`, run `source ~/.zshrc`.

### 0g — Daily usage

```bash
awslogin        # start of session — opens browser once, token valid ~8 hours
awswho          # check current identity
awsuse ojfbot-admin   # switch profiles
```

---

## Step 1 — Create the S3 bucket

### Via AWS CLI (recommended)

```bash
# Set these once in your shell; all commands below use them
export ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)
export BUCKET="ojfbot-cv-builder-${ACCOUNT_ID}-us-east-1"
export REGION=us-east-1

aws s3api create-bucket \
  --bucket "$BUCKET" \
  --region "$REGION" \
  --create-bucket-configuration LocationConstraint="$REGION"

aws s3api put-public-access-block \
  --bucket "$BUCKET" \
  --public-access-block-configuration \
    BlockPublicAcls=true,IgnorePublicAcls=true,BlockPublicPolicy=false,RestrictPublicBuckets=false

aws s3api put-bucket-tagging \
  --bucket "$BUCKET" \
  --tagging 'TagSet=[{Key=Owner,Value=ojfbot},{Key=Environment,Value=ci},{Key=Purpose,Value=screenshot-artifacts}]'
```

### Via AWS Console

In **AWS Console → S3 → Create bucket**:

| Setting | Value |
|---------|-------|
| Bucket name | `ojfbot-cv-builder-<YOUR_ACCOUNT_ID>-us-east-1` |
| Region | `us-east-1` |
| Block Public Access | See note below |
| Default encryption | SSE-S3 (default) |
| Versioning | Off (screenshots are immutable per run) |

**Block Public Access settings** — this bucket must serve images to draw.io in browsers,
so we need public `GetObject` while still blocking public listing and ACL abuse:

| Checkbox | State |
|----------|-------|
| Block public access granted through *new* ACLs | ✅ ON |
| Block public access granted through *any* ACLs | ✅ ON |
| Block public access granted through *new* bucket policies | ❌ OFF |
| Block public and cross-account access through *any* bucket policies | ❌ OFF |

> **Why not fully private?** The S3 URLs are embedded in `cvBuilder.drawio.xml` and rendered
> by the draw.io desktop app and web viewer — both make plain HTTPS `GET` requests from the
> browser. A private bucket returns 403 and the canvas shows broken image placeholders.
> The screenshots contain no sensitive data (they're pictures of a demo UI).

**Tags**:
```
Owner       = ojfbot
Environment = ci
Purpose     = screenshot-artifacts
```

---

## Step 2 — Create the IAM OIDC identity provider

This only needs to be done once per AWS account.

### Via AWS CLI

```bash
# Check if it already exists first
aws iam list-open-id-connect-providers \
  --query "OpenIDConnectProviderList[?contains(Arn,'token.actions.githubusercontent.com')].Arn" \
  --output text

# If not present, create it:
aws iam create-open-id-connect-provider \
  --url https://token.actions.githubusercontent.com \
  --client-id-list sts.amazonaws.com \
  --thumbprint-list 6938fd4d98bab03faadb97b34396831e3780aea1
```

### Via AWS Console

In **IAM → Identity providers → Add provider**:

| Field | Value |
|-------|-------|
| Provider type | OpenID Connect |
| Provider URL | `https://token.actions.githubusercontent.com` |
| Audience | `sts.amazonaws.com` |

Click **Get thumbprint** then **Add provider**.

---

## Step 3 — Create the IAM role

### Via AWS CLI

```bash
# Trust policy
TRUST=$(cat <<EOF
{
  "Version": "2012-10-17",
  "Statement": [{
    "Effect": "Allow",
    "Principal": {
      "Federated": "arn:aws:iam::${ACCOUNT_ID}:oidc-provider/token.actions.githubusercontent.com"
    },
    "Action": "sts:AssumeRoleWithWebIdentity",
    "Condition": {
      "StringEquals": { "token.actions.githubusercontent.com:aud": "sts.amazonaws.com" },
      "StringLike":   { "token.actions.githubusercontent.com:sub": "repo:ojfbot/cv-builder:*" }
    }
  }]
}
EOF
)

aws iam create-role \
  --role-name GithubActionsS3ImagesRole \
  --assume-role-policy-document "$TRUST"

# Inline permissions policy
POLICY=$(cat <<EOF
{
  "Version": "2012-10-17",
  "Statement": [{
    "Sid": "S3WriteAccess",
    "Effect": "Allow",
    "Action": ["s3:PutObject","s3:GetObject","s3:DeleteObject","s3:ListBucket"],
    "Resource": [
      "arn:aws:s3:::${BUCKET}",
      "arn:aws:s3:::${BUCKET}/*"
    ]
  }]
}
EOF
)

aws iam put-role-policy \
  --role-name GithubActionsS3ImagesRole \
  --policy-name GithubActionsS3ImagesPolicy \
  --policy-document "$POLICY"

# Print the role ARN for use in Step 5
aws iam get-role --role-name GithubActionsS3ImagesRole --query Role.Arn --output text
```

### Via AWS Console

In **IAM → Roles → Create role**:

- **Trusted entity type**: Web identity
- **Identity provider**: `token.actions.githubusercontent.com`
- **Audience**: `sts.amazonaws.com`
- **Role name**: `GithubActionsS3ImagesRole`

**Trust policy** — replace the generated one with:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Principal": {
        "Federated": "arn:aws:iam::<YOUR_ACCOUNT_ID>:oidc-provider/token.actions.githubusercontent.com"
      },
      "Action": "sts:AssumeRoleWithWebIdentity",
      "Condition": {
        "StringEquals": {
          "token.actions.githubusercontent.com:aud": "sts.amazonaws.com"
        },
        "StringLike": {
          "token.actions.githubusercontent.com:sub": "repo:ojfbot/cv-builder:*"
        }
      }
    }
  ]
}
```

> **Why `StringLike` + `*`?** GitHub's `sub` claim takes different forms depending on the
> trigger: `repo:ojfbot/cv-builder:ref:refs/heads/main` (push),
> `repo:ojfbot/cv-builder:pull_request` (PR), and
> `repo:ojfbot/cv-builder:ref:refs/heads/<branch>` (workflow_dispatch).
> Our pipeline runs on all three. Locking to `:ref:refs/heads/main` only would cause the
> screenshot upload to silently skip on every PR run.

**Inline permissions policy** named `GithubActionsS3ImagesPolicy`:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "S3WriteAccess",
      "Effect": "Allow",
      "Action": [
        "s3:PutObject",
        "s3:GetObject",
        "s3:DeleteObject",
        "s3:ListBucket"
      ],
      "Resource": [
        "arn:aws:s3:::ojfbot-cv-builder-<YOUR_ACCOUNT_ID>-us-east-1",
        "arn:aws:s3:::ojfbot-cv-builder-<YOUR_ACCOUNT_ID>-us-east-1/*"
      ]
    }
  ]
}
```

After creating the role, note the full ARN:
```
arn:aws:iam::<YOUR_ACCOUNT_ID>:role/GithubActionsS3ImagesRole
```

---

## Step 4 — Bucket policy

### Via AWS CLI

```bash
BUCKET_POLICY=$(cat <<EOF
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "AllowGithubRoleFullAccess",
      "Effect": "Allow",
      "Principal": {"AWS": "arn:aws:iam::${ACCOUNT_ID}:role/GithubActionsS3ImagesRole"},
      "Action": ["s3:GetObject","s3:PutObject","s3:DeleteObject","s3:ListBucket"],
      "Resource": ["arn:aws:s3:::${BUCKET}", "arn:aws:s3:::${BUCKET}/*"]
    },
    {
      "Sid": "AllowPublicRead",
      "Effect": "Allow",
      "Principal": "*",
      "Action": "s3:GetObject",
      "Resource": "arn:aws:s3:::${BUCKET}/*"
    }
  ]
}
EOF
)

aws s3api put-bucket-policy --bucket "$BUCKET" --policy "$BUCKET_POLICY"
```

### Via AWS Console

In **S3 → bucket → Permissions → Bucket policy**, paste:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "AllowGithubRoleFullAccess",
      "Effect": "Allow",
      "Principal": {
        "AWS": "arn:aws:iam::<YOUR_ACCOUNT_ID>:role/GithubActionsS3ImagesRole"
      },
      "Action": [
        "s3:GetObject",
        "s3:PutObject",
        "s3:DeleteObject",
        "s3:ListBucket"
      ],
      "Resource": [
        "arn:aws:s3:::ojfbot-cv-builder-<YOUR_ACCOUNT_ID>-us-east-1",
        "arn:aws:s3:::ojfbot-cv-builder-<YOUR_ACCOUNT_ID>-us-east-1/*"
      ]
    },
    {
      "Sid": "AllowPublicRead",
      "Effect": "Allow",
      "Principal": "*",
      "Action": "s3:GetObject",
      "Resource": "arn:aws:s3:::ojfbot-cv-builder-<YOUR_ACCOUNT_ID>-us-east-1/*"
    }
  ]
}
```

The public statement allows browsers to `GET` screenshot images (required for draw.io rendering).
It does **not** allow listing the bucket contents.

---

## Step 4b — Bucket CORS configuration

The visual dashboard (`DiagramViewer.tsx`) fetches the draw.io XML directly from S3
in the browser with `fetch(diagramUrl)`. This is a cross-origin request — without a
CORS policy on the bucket the browser will block it and the diagram viewer will show
an error state even though the file is publicly readable.

### Via AWS CLI

```bash
aws s3api put-bucket-cors --bucket "$BUCKET" \
  --cors-configuration '{"CORSRules":[{"AllowedHeaders":[],"AllowedMethods":["GET"],"AllowedOrigins":["*"],"ExposeHeaders":[],"MaxAgeSeconds":3600}]}'
```

### Via AWS Console

In **S3 → bucket → Permissions → Cross-origin resource sharing (CORS)**, paste:

```json
[
  {
    "AllowedHeaders": [],
    "AllowedMethods": ["GET"],
    "AllowedOrigins": ["*"],
    "ExposeHeaders": [],
    "MaxAgeSeconds": 3600
  }
]
```

> **Why `*` for origins?** The dashboard runs on `http://localhost:3000` during
> development and on whatever domain you deploy to in production. The draw.io
> web viewer (`app.diagrams.net`) also fetches diagram files directly. Rather than
> maintaining a list of allowed origins, `*` on `GET`-only is safe because the
> bucket only contains non-sensitive screenshot images (public anyway by the bucket
> policy). If you lock down the bucket to private + CloudFront (see Future
> improvements), restrict `AllowedOrigins` to your specific domains at that point.

---

## Step 5 — GitHub repository variables

### Via GitHub CLI (recommended)

```bash
gh variable set S3_BUCKET    --body "ojfbot-cv-builder-${ACCOUNT_ID}-us-east-1" --repo ojfbot/cv-builder
gh variable set AWS_REGION   --body "us-east-1"                                  --repo ojfbot/cv-builder
gh variable set AWS_ROLE_ARN --body "arn:aws:iam::${ACCOUNT_ID}:role/GithubActionsS3ImagesRole" --repo ojfbot/cv-builder

# Verify
gh variable list --repo ojfbot/cv-builder
```

### Via GitHub Console

In **GitHub → repo → Settings → Secrets and variables → Actions → Variables**:

| Name | Value |
|------|-------|
| `S3_BUCKET` | `ojfbot-cv-builder-<YOUR_ACCOUNT_ID>-us-east-1` |
| `AWS_REGION` | `us-east-1` |
| `AWS_ROLE_ARN` | `arn:aws:iam::<YOUR_ACCOUNT_ID>:role/GithubActionsS3ImagesRole` |

No secrets needed — OIDC uses the role ARN directly.

---

## Step 5b — Enable GitHub Pages

The CI pipeline deploys an interactive draw.io viewer to GitHub Pages on every run.
Enable the feature once in the repository settings:

1. Go to **GitHub → repo → Settings → Pages**
2. Under **Build and deployment → Source**, select **GitHub Actions**
3. Save

That's all. On the next workflow run, `actions/deploy-pages@v4` will publish
`_site/index.html` (a full-viewport iframe pointing at `viewer.diagrams.net`) to
`https://ojfbot.github.io/cv-builder/`.

> **No branch needed.** The `build_type: workflow` setting means GitHub Pages is
> driven entirely by the Actions workflow — no `gh-pages` branch required.

---

## Step 6 — Verify

### Quick CLI audit

```bash
BUCKET="ojfbot-cv-builder-$(aws sts get-caller-identity --query Account --output text)-us-east-1"

aws s3api get-public-access-block --bucket "$BUCKET"
aws s3api get-bucket-policy       --bucket "$BUCKET" | python3 -m json.tool
aws s3api get-bucket-cors         --bucket "$BUCKET"
aws iam get-role                  --role-name GithubActionsS3ImagesRole --query Role.Arn
```

### Trigger a CI run

Trigger the workflow manually (`workflow_dispatch`) on any branch. In the Actions log you
should see:

```
Configure AWS credentials (OIDC)        ✅
Run screenshot pipeline                 ✅
  Uploading dashboard-initial-desktop.png → s3://ojfbot-cv-builder-.../cv-builder/run-42/...
  ...
  Updated draw.io written to: templates/drawio/cvBuilder.drawio.xml
Generate draw.io viewer page            ✅
Upload draw.io viewer to GitHub Pages   ✅
Deploy draw.io viewer to GitHub Pages   ✅  → https://ojfbot.github.io/cv-builder/
Commit updated draw.io canvas           ✅  (skipped on PR, runs on main push)
```

The committed `cvBuilder.drawio.xml` will shrink from ~6 MB (base64) to ~5 KB (S3 URLs).
Open it in draw.io — all screenshot slots should render live screenshots.

The GitHub Pages viewer at `https://ojfbot.github.io/cv-builder/` opens the same canvas in
`viewer.diagrams.net` directly in the browser — no draw.io installation required.

---

## Future improvements

When you're ready to mature the setup:

1. **CloudFront in front of S3** — private bucket + CloudFront distribution with OAC.
   Gives HTTPS custom domain, edge caching, and signed URL support if you ever need it.

2. **Lifecycle rule on the bucket** — expire `*/run-*/` prefixes older than 90 days to
   control storage costs as run numbers accumulate.

3. **AWS Organizations** — move account `<YOUR_ACCOUNT_ID>` under an org with SCPs.
   Replicate the IAM role in separate `dev`/`prod` accounts as you add workloads.

4. **Infrastructure as Code** — template the bucket + IAM role in CDK or CloudFormation
   so the setup is reproducible across accounts.

---

## How the pipeline uses S3

```
CI run
  └─ test:visual runs Playwright
       └─ takes screenshots → test-baselines/cv-builder-visual/*.png
  └─ pipeline:screenshots
       └─ reads templates/drawio/screenshot-manifest.json
       └─ for each cell: uploads {baseline}.png → s3://{bucket}/cv-builder/run-{N}/{baseline}.png
       └─ injects S3 URL into cvBuilder.drawio.xml (replaces base64 or stale URL)
       └─ uploads updated cvBuilder.drawio.xml → s3://{bucket}/cv-builder/run-{N}/cvBuilder.drawio.xml
  └─ commits cvBuilder.drawio.xml back to branch (on main push only)
```

Key file: `packages/browser-automation/templates/drawio/screenshot-manifest.json`
Maps each draw.io `<object>` cell ID → screenshot baseline filename.
