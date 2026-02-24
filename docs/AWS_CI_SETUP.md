# AWS CI/CD Setup — cv-builder Screenshot Pipeline

Sets up S3 storage for the Playwright screenshot pipeline and the draw.io canvas
auto-update workflow. Uses OIDC federation — **no static access keys** stored anywhere.

## Account context

- **AWS account**: `<YOUR_ACCOUNT_ID>`
- **Region**: `us-east-1`
- **GitHub repo**: `ojfbot/cv-builder`
- **Bucket name**: `ojfbot-cv-builder-<YOUR_ACCOUNT_ID>-us-east-1`

---

## Step 1 — Create the S3 bucket

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

In **IAM → Identity providers → Add provider**:

| Field | Value |
|-------|-------|
| Provider type | OpenID Connect |
| Provider URL | `https://token.actions.githubusercontent.com` |
| Audience | `sts.amazonaws.com` |

Click **Get thumbprint** then **Add provider**.

This only needs to be done once per AWS account.

---

## Step 3 — Create the IAM role

In **IAM → Roles → Create role**:

- **Trusted entity type**: Web identity
- **Identity provider**: `token.actions.githubusercontent.com`
- **Audience**: `sts.amazonaws.com`
- **Role name**: `GithubActionsS3ImagesRole`

### Trust policy

Replace the generated one with this (note `StringLike` on `sub` — covers both
`push` to main AND `pull_request` events, which have different `sub` claim shapes):

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

### Permissions policy

Create a new inline policy named `GithubActionsS3ImagesPolicy`:

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

## Step 5 — GitHub repository variables

In **GitHub → repo → Settings → Secrets and variables → Actions → Variables**:

| Name | Value |
|------|-------|
| `S3_BUCKET` | `ojfbot-cv-builder-<YOUR_ACCOUNT_ID>-us-east-1` |
| `AWS_REGION` | `us-east-1` |
| `AWS_ROLE_ARN` | `arn:aws:iam::<YOUR_ACCOUNT_ID>:role/GithubActionsS3ImagesRole` |

No secrets needed — OIDC uses the role ARN directly.

---

## Step 6 — Verify

Trigger the workflow manually (`workflow_dispatch`) on any branch. In the Actions log you
should see:

```
Configure AWS credentials (OIDC)   ✅
Run screenshot pipeline            ✅
  Uploading dashboard-initial-desktop.png → s3://ojfbot-cv-builder-.../cv-builder/run-42/...
  ...
  Updated draw.io written to: templates/drawio/cvBuilder.drawio.xml
Commit updated draw.io canvas      ✅  (skipped on PR, runs on main push)
```

The committed `cvBuilder.drawio.xml` will shrink from ~6MB (base64) to ~5KB (S3 URLs).
Open it in draw.io — all 14 screenshot slots should render live screenshots.

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
