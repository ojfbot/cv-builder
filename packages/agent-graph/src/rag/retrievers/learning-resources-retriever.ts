/**
 * Learning Resources Retriever
 *
 * Retrieves skill development paths and learning resources.
 *
 * CURRENT STATUS: Hardcoded seed data (prototype)
 *
 * TODO (Production): Replace hardcoded documents with dynamic content
 * - Load from structured markdown files or CMS
 * - Integrate with real course platforms (Udemy, Coursera APIs)
 * - Add user progress tracking and personalized recommendations
 * - Implement content freshness checks (courses/resources may become outdated)
 * - Consider industry-specific learning paths
 */

import { Document } from "@langchain/core/documents";
import { BaseRetriever } from "./base-retriever";
import { VectorStoreConfig } from "../vector-store";

export class LearningResourcesRetriever extends BaseRetriever {
  constructor(config: VectorStoreConfig) {
    super("LearningResources", config);
  }

  protected async getSeedDocuments(): Promise<Document[]> {
    return [
      new Document({
        pageContent: `Learning Path for JavaScript/TypeScript:
**Beginner (0-6 months):**
- MDN Web Docs JavaScript Guide
- "You Don't Know JS" book series (free online)
- freeCodeCamp JavaScript course
- Practice: Build small projects (calculator, todo app)

**Intermediate (6-12 months):**
- "Eloquent JavaScript" book
- TypeScript documentation and handbook
- Learn async/await, promises, closures deeply
- Build: REST API with Node.js/Express
- Practice: LeetCode easy problems

**Advanced (12+ months):**
- "JavaScript: The Definitive Guide"
- Advanced TypeScript patterns
- Study popular frameworks' source code
- Build: Full-stack application
- Contribute to open source projects

**Estimated time:** 300-500 hours to intermediate proficiency`,
        metadata: {
          type: "learning_path",
          category: "programming_languages",
          skill: "JavaScript/TypeScript",
          level: "beginner_to_advanced",
        },
      }),

      new Document({
        pageContent: `Learning Path for React:
**Prerequisites:**
- Solid JavaScript/ES6+ knowledge
- Understanding of HTML/CSS
- Basic npm/package management

**Beginner (0-3 months):**
- Official React documentation and tutorial
- "React - The Complete Guide" course (Udemy)
- Learn: Components, Props, State, Hooks
- Build: Simple SPA (weather app, movie browser)

**Intermediate (3-6 months):**
- React Router for navigation
- State management (Context API, then Redux/Zustand)
- API integration and data fetching
- Build: Multi-page application with routing and global state

**Advanced (6+ months):**
- Performance optimization (useMemo, useCallback, React.memo)
- Custom hooks patterns
- Testing with Jest and React Testing Library
- Next.js for SSR/SSG
- Build: Production-ready application with authentication

**Estimated time:** 200-300 hours to job-ready proficiency`,
        metadata: {
          type: "learning_path",
          category: "frontend_frameworks",
          skill: "React",
          level: "beginner_to_advanced",
        },
      }),

      new Document({
        pageContent: `Learning Path for System Design:
**Foundation:**
- Understanding of networking basics (HTTP, DNS, CDN)
- Database fundamentals (SQL, NoSQL, indexing)
- Basic architecture patterns

**Core Concepts to Master:**
1. **Scalability:** Load balancing, horizontal vs vertical scaling, caching
2. **Databases:** Sharding, replication, CAP theorem, SQL vs NoSQL trade-offs
3. **Caching:** Redis, Memcached, CDN, cache invalidation strategies
4. **APIs:** REST principles, GraphQL, API versioning, rate limiting
5. **Microservices:** Service boundaries, inter-service communication, API gateways
6. **Message Queues:** Kafka, RabbitMQ, event-driven architecture
7. **Reliability:** Circuit breakers, retries, graceful degradation
8. **Monitoring:** Logging, metrics, tracing, alerting

**Resources:**
- "Designing Data-Intensive Applications" by Martin Kleppmann
- System Design Interview YouTube channels (ByteByteGo, Gaurav Sen)
- Practice: Design Twitter, URL shortener, chat system

**Estimated time:** 100-200 hours of study, ongoing practice`,
        metadata: {
          type: "learning_path",
          category: "system_design",
          skill: "System Design",
          level: "intermediate_to_advanced",
        },
      }),

      new Document({
        pageContent: `Learning Path for Docker and Kubernetes:
**Docker (1-2 months):**
- Official Docker documentation and tutorials
- Learn: Images, containers, Dockerfile, docker-compose
- Practice: Containerize a Node.js and React application
- Understand: Volumes, networking, multi-stage builds

**Resources:**
- Docker official tutorial
- "Docker Deep Dive" by Nigel Poulton
- Practice on Play with Docker

**Kubernetes (2-4 months after Docker):**
- Official Kubernetes documentation
- Learn: Pods, Deployments, Services, ConfigMaps, Secrets
- Practice: Deploy application to local cluster (minikube)
- Understand: Ingress, persistent volumes, namespaces

**Resources:**
- "Kubernetes Up & Running"
- Kubernetes official tutorials
- Practice on Play with Kubernetes
- Get familiar with kubectl commands

**Advanced Topics:**
- Helm for package management
- StatefulSets for stateful applications
- Service mesh (Istio)
- Monitoring with Prometheus and Grafana

**Estimated time:** 150-250 hours total`,
        metadata: {
          type: "learning_path",
          category: "devops",
          skill: "Docker/Kubernetes",
          level: "beginner_to_advanced",
        },
      }),

      new Document({
        pageContent: `Learning Path for Cloud Platforms (AWS):
**Foundation (1-2 months):**
- Cloud computing concepts
- AWS free tier account setup
- Core services: EC2, S3, RDS, Lambda

**Intermediate (2-4 months):**
- VPC and networking
- IAM (Identity and Access Management)
- CloudFormation or Terraform
- ECS/EKS for container orchestration
- API Gateway and CloudFront
- DynamoDB and other managed services

**Advanced (4+ months):**
- Well-Architected Framework
- Cost optimization strategies
- Multi-region deployments
- Disaster recovery planning
- Security best practices

**Certifications Path:**
1. AWS Certified Cloud Practitioner (foundational)
2. AWS Certified Solutions Architect - Associate
3. AWS Certified Developer - Associate (optional)

**Resources:**
- AWS official documentation and tutorials
- "AWS Certified Solutions Architect Study Guide"
- A Cloud Guru or Linux Academy courses
- AWS hands-on labs

**Estimated time:** 200-300 hours, plus 50-100 hours per certification`,
        metadata: {
          type: "learning_path",
          category: "cloud_platforms",
          skill: "AWS",
          level: "beginner_to_advanced",
        },
      }),

      new Document({
        pageContent: `Free and Paid Learning Resources:
**Free Resources:**
- freeCodeCamp (web development, JavaScript, Python)
- MDN Web Docs (web technologies reference)
- GitHub (open source projects to study)
- YouTube channels: Traversy Media, Net Ninja, Fireship
- Official documentation for frameworks and libraries
- Dev.to, Medium, and tech blogs

**Paid Platforms ($):**
- Udemy ($10-20 per course on sale, one-time purchase)
- Coursera ($39-79/month, university courses)
- Pluralsight ($29/month, tech-focused)
- Frontend Masters ($39/month, web development)
- egghead.io ($40/month, short focused lessons)

**Bootcamps ($$$):**
- Full-time: $10K-20K, 12-16 weeks
- Part-time: $7K-15K, 6-9 months
- Consider: Job placement rates, curriculum, cost

**Books:**
- O'Reilly (subscription or individual purchases)
- Manning Publications
- Pragmatic Bookshelf

**Practice Platforms:**
- LeetCode (free + $35/month premium)
- HackerRank (free)
- Exercism (free, mentor-based)
- CodeWars (free)`,
        metadata: {
          type: "resource_directory",
          category: "learning_platforms",
          skill: "General",
        },
      }),
    ];
  }
}
