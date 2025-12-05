# V2 (LangGraph) Production Roadmap

**Generated**: 2025-12-05
**Epic**: [Issue #46 - V2 LangGraph Implementation](https://github.com/ojfbot/cv-builder/issues/46)

This roadmap tracks the journey from V2 MVP (completed in PR #50) to production-ready deployment and eventual V1 sunset.

---

## Current Status: Phase 1 Complete ✅

**V2 MVP Shipped** (PR #50):
- ✅ Core LangGraph architecture with multi-agent orchestration
- ✅ Thread persistence with SQLite checkpointing
- ✅ Streaming SSE endpoints with rate limiting
- ✅ Browser UI with conversation sidebar and V1/V2 toggle
- ✅ RAG implementation with memory vector store
- ✅ State management and type safety
- ✅ Developer documentation

**Completion**: ~70-75% of production requirements
**Blocker Count**: 4 critical P0 issues preventing production deployment

---

## Phase 2: Critical Production Blockers (P0) 🚨

**Timeline**: 6-8 weeks
**Status**: Ready to start
**Goal**: Resolve all production-blocking issues

### Issues

| Issue | Title | Effort | Priority |
|-------|-------|--------|----------|
| [#52](https://github.com/ojfbot/cv-builder/issues/52) | Automated testing for V2 | 2-3 weeks | P0 |
| [#53](https://github.com/ojfbot/cv-builder/issues/53) | Persistent vector storage for production RAG | 1-2 weeks | P0 |
| [#54](https://github.com/ojfbot/cv-builder/issues/54) | Authentication and thread ownership | 2-3 weeks | P0 |
| [#55](https://github.com/ojfbot/cv-builder/issues/55) | Monitoring, observability, and health checks | 2 weeks | P0 |

### Deliverables

- [ ] **Testing Infrastructure** (#52)
  - Unit tests for agents and graph nodes
  - Integration tests for API endpoints
  - E2E tests for critical user flows
  - CI/CD pipeline with automated testing
  - Target: >80% code coverage

- [ ] **Production Database** (#53)
  - Migrate from SQLite to PostgreSQL for checkpointing
  - Migrate from MemoryVectorStore to pgvector or Pinecone
  - Database migration scripts and documentation
  - Connection pooling and error handling
  - Backup and recovery procedures

- [ ] **Authentication & Authorization** (#54)
  - User authentication (JWT or session-based)
  - Thread ownership and access control
  - API key management
  - Rate limiting per user (not per IP)
  - User data isolation

- [ ] **Observability** (#55)
  - Health check endpoints (`/health`, `/health/ready`, `/health/live`)
  - Sentry error tracking with context
  - Prometheus metrics (streams, API calls, latency)
  - Alerting rules for critical failures
  - Grafana dashboards

### Success Criteria

- ✅ All 4 P0 issues closed
- ✅ Automated test suite passing in CI
- ✅ PostgreSQL + pgvector running in staging
- ✅ Authentication working with test users
- ✅ Health checks passing, metrics visible in dashboard
- ✅ Zero known production blockers remaining

### Dependencies

- PostgreSQL database (cloud or self-hosted)
- Sentry account for error tracking
- Prometheus + Grafana for metrics (or managed service)
- CI/CD platform (GitHub Actions recommended)

---

## Phase 3: Beta Launch 🚀

**Timeline**: 3-4 weeks
**Status**: Blocked by Phase 2
**Goal**: Deploy to production with limited user base

### High-Priority Features (P1)

| Feature | Description | Effort |
|---------|-------------|--------|
| Enhanced RAG | Production knowledge base, document ingestion | 2 weeks |
| Error Recovery | Retry logic, graceful degradation, fallbacks | 1 week |
| Performance | Caching, optimizations, load testing | 1-2 weeks |
| User Feedback | Feedback widget, analytics, session replay | 1 week |

### Deliverables

- [ ] Production deployment (AWS/GCP/Azure)
- [ ] Enhanced RAG with real resume templates and best practices
- [ ] Robust error handling with automatic retries
- [ ] Performance optimizations (target: <3s for 95% of requests)
- [ ] User feedback collection mechanism
- [ ] Beta user documentation and onboarding

### Success Criteria

- ✅ 100 beta users successfully onboarded
- ✅ <1% error rate over 7 days
- ✅ 95th percentile response time <3s
- ✅ Positive user feedback (>4.0/5.0 average)
- ✅ Zero data loss incidents
- ✅ Health checks passing consistently

### Metrics to Track

- Daily active users (DAU)
- Conversation completion rate
- Error rate by endpoint
- API latency (p50, p95, p99)
- User satisfaction scores
- Feature adoption rates

---

## Phase 4: General Availability (GA) 🎯

**Timeline**: 4-6 weeks
**Status**: Blocked by Phase 3
**Goal**: Full production release with all features

### Medium-Priority Features (P2)

| Feature | Description | Effort |
|---------|-------------|--------|
| Advanced Workflows | Multi-job comparison, bulk operations | 2-3 weeks |
| Export & Integration | PDF export, LinkedIn integration, ATS compatibility | 2 weeks |
| Collaboration | Shared threads, team workspaces | 2-3 weeks |
| Advanced Analytics | Usage dashboards, insights, recommendations | 1-2 weeks |

### Deliverables

- [ ] Advanced workflow features (job comparison, bulk tailoring)
- [ ] Export functionality (PDF, DOCX, ATS-optimized formats)
- [ ] Third-party integrations (LinkedIn, job boards)
- [ ] Collaboration features for team/enterprise users
- [ ] Advanced analytics and insights dashboard
- [ ] Comprehensive user documentation
- [ ] Admin dashboard for operations

### Success Criteria

- ✅ 1,000+ active users
- ✅ Feature parity with V1 (or migration plan)
- ✅ <0.5% error rate sustained over 30 days
- ✅ 99.9% uptime (excluding planned maintenance)
- ✅ All P1 and P2 features shipped
- ✅ User satisfaction >4.5/5.0

### Infrastructure Requirements

- Auto-scaling for API servers
- CDN for static assets
- Database read replicas
- Automated backups (daily + point-in-time recovery)
- Disaster recovery plan tested quarterly

---

## Phase 5: V1 Sunset 🌅

**Timeline**: 3-6 months after GA
**Status**: Blocked by Phase 4
**Goal**: Deprecate V1 system, migrate all users to V2

### Migration Plan

- [ ] **Month 1-2: Parallel Operation**
  - V1 and V2 both available
  - Encourage V2 adoption with feature highlights
  - Monitor V2 stability and user feedback
  - Fix critical V2 issues immediately

- [ ] **Month 3-4: Migration Push**
  - Automated migration tools for V1 data
  - In-app notifications encouraging V2 switch
  - V1 marked as "legacy" with sunset date announced
  - Support team trained on V2

- [ ] **Month 5: V1 Read-Only**
  - V1 endpoints switched to read-only mode
  - All new operations forced to V2
  - Data migration assistance for remaining users
  - Final migration deadline communicated

- [ ] **Month 6: V1 Removal**
  - V1 code archived
  - V1 endpoints return 410 Gone
  - Database cleanup (retain backups)
  - Documentation updated to remove V1 references

### Deliverables

- [ ] Data migration scripts (V1 → V2)
- [ ] Migration documentation and runbooks
- [ ] User communication plan (email, in-app, docs)
- [ ] V1 deprecation notices in UI
- [ ] V1 codebase archived (not deleted)
- [ ] Post-sunset monitoring (30 days)

### Success Criteria

- ✅ 100% of active users migrated to V2
- ✅ Zero V1 API calls for 30 consecutive days
- ✅ V1 codebase removed from main branch
- ✅ No regression in user satisfaction during migration
- ✅ All V1 data successfully migrated or archived

---

## Risk Management

### High-Risk Items

1. **Database Migration** (Phase 2)
   - **Risk**: Data loss or corruption during SQLite → PostgreSQL migration
   - **Mitigation**: Thorough testing in staging, rollback plan, backups
   - **Contingency**: Keep SQLite for development, only PostgreSQL in production

2. **Authentication Implementation** (Phase 2)
   - **Risk**: Security vulnerabilities in auth system
   - **Mitigation**: Use battle-tested libraries (Passport.js, Auth0), security audit
   - **Contingency**: Rate limiting + IP blocking as temporary measure

3. **RAG Vector Store Migration** (Phase 2)
   - **Risk**: Poor performance or accuracy after switching from memory store
   - **Mitigation**: A/B testing, quality benchmarks before full rollout
   - **Contingency**: Hybrid approach (memory cache + persistent store)

4. **User Adoption** (Phase 3-4)
   - **Risk**: Users prefer V1, resist V2 migration
   - **Mitigation**: Clear communication, V2-exclusive features, smooth UX
   - **Contingency**: Extended parallel operation period

5. **Performance at Scale** (Phase 3-4)
   - **Risk**: System doesn't scale to 1,000+ concurrent users
   - **Mitigation**: Load testing, horizontal scaling, caching strategies
   - **Contingency**: User quotas, queueing for expensive operations

### Medium-Risk Items

- **Third-Party API Reliability**: Anthropic API downtime or rate limits
  - Mitigation: Retry logic, exponential backoff, fallback models
- **Cost Overruns**: LLM API costs higher than budgeted
  - Mitigation: Usage monitoring, caching, tiered pricing for users
- **Regulatory Compliance**: GDPR/CCPA requirements for user data
  - Mitigation: Legal review, data retention policies, export/delete features

---

## Resource Requirements

### Engineering

- **Phase 2**: 2-3 full-time engineers for 6-8 weeks
- **Phase 3**: 1-2 engineers + 1 QA for 3-4 weeks
- **Phase 4**: 2-3 engineers for 4-6 weeks
- **Phase 5**: 1 engineer for migration support over 6 months

### Infrastructure

- **Phase 2**: Staging environment (PostgreSQL, Sentry, Prometheus)
- **Phase 3**: Production environment (load balancers, auto-scaling)
- **Phase 4**: Multi-region deployment (optional but recommended)
- **Phase 5**: Parallel V1/V2 operation during migration

### Budget Estimates

- **Compute**: $200-500/month (varies by user count)
- **Database**: $50-150/month (PostgreSQL managed service)
- **LLM API**: $500-2000/month (depends on usage)
- **Monitoring**: $100-300/month (Sentry + metrics)
- **Total**: ~$1,000-3,000/month for production

---

## Success Metrics (Overall)

### Technical Metrics

- ✅ **Uptime**: 99.9% (excluding maintenance windows)
- ✅ **Error Rate**: <0.5% of all requests
- ✅ **Latency**: p95 <3s, p99 <10s
- ✅ **Test Coverage**: >80% (unit + integration)
- ✅ **Security**: Zero critical vulnerabilities in production

### Product Metrics

- ✅ **User Adoption**: 1,000+ active users within 6 months of GA
- ✅ **Engagement**: >50% of users complete full workflow (bio → job → resume)
- ✅ **Satisfaction**: >4.5/5.0 average user rating
- ✅ **Retention**: >60% of users return within 30 days
- ✅ **NPS**: >40 (promoters - detractors)

### Business Metrics

- ✅ **Cost per User**: <$5/month per active user
- ✅ **Migration Success**: 100% of V1 users migrated to V2
- ✅ **Support Tickets**: <5% of users require support intervention
- ✅ **Feature Velocity**: Ship 1-2 major features per month post-GA

---

## Open Questions

1. **Authentication Provider**: Build custom or use Auth0/Supabase?
   - Decision needed by: Start of Phase 2
   - Owner: Engineering lead

2. **Vector Database**: pgvector (self-hosted) or Pinecone (managed)?
   - Decision needed by: Start of Phase 2
   - Owner: Engineering + DevOps

3. **Deployment Platform**: AWS, GCP, Azure, or Vercel/Railway?
   - Decision needed by: Start of Phase 3
   - Owner: DevOps + Finance

4. **Pricing Model**: Free tier + paid plans or fully free?
   - Decision needed by: Before Phase 3 (beta)
   - Owner: Product + Business

5. **Multi-tenancy**: Single-tenant or multi-tenant architecture?
   - Decision needed by: Start of Phase 2 (impacts auth design)
   - Owner: Engineering + Product

---

## Next Steps (Immediate)

1. **Week 1-2**: Start Issue #52 (Automated Testing)
   - Set up Jest + Supertest for API tests
   - Write unit tests for critical agents
   - Configure GitHub Actions CI pipeline

2. **Week 3-4**: Start Issue #53 (Database Migration)
   - Decide on PostgreSQL hosting (AWS RDS vs Supabase vs self-hosted)
   - Set up staging database
   - Test SQLiteCheckpointer → PostgresCheckpointer migration

3. **Week 5-6**: Start Issue #54 (Authentication)
   - Choose auth provider (custom vs Auth0)
   - Design user/thread ownership model
   - Implement auth middleware

4. **Week 7-8**: Start Issue #55 (Monitoring)
   - Set up Sentry error tracking
   - Implement health check endpoints
   - Configure Prometheus metrics

**Goal**: Complete Phase 2 within 8 weeks, ready for beta launch.

---

## References

- [V2 Architecture Documentation](docs/ARCHITECTURE_V2.md)
- [V2 Quick Start Guide](V2_QUICKSTART.md)
- [Issue #46: V2 Implementation Epic](https://github.com/ojfbot/cv-builder/issues/46)
- [PR #50: V2 MVP Implementation](https://github.com/ojfbot/cv-builder/pull/50)
- Critical Blockers:
  - [Issue #52: Automated Testing](https://github.com/ojfbot/cv-builder/issues/52)
  - [Issue #53: Persistent Vector Storage](https://github.com/ojfbot/cv-builder/issues/53)
  - [Issue #54: Authentication](https://github.com/ojfbot/cv-builder/issues/54)
  - [Issue #55: Monitoring & Observability](https://github.com/ojfbot/cv-builder/issues/55)

---

**Last Updated**: 2025-12-05
**Status**: Phase 2 ready to start (4 P0 issues created)
**Next Review**: After Phase 2 completion
