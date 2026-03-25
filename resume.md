# Ravi Kumar

**Founding Engineer | Backend & Full-Stack | AI/MCP**

hey.ravikovind@gmail.com | +91 8433491441 | ravikovind.github.io | linkedin.com/in/ravikovind | github.com/ravikovind

---

## Summary

Backend-focused full-stack engineer specialising in high-scale Node.js systems, Python, Flutter, real-time infrastructure, cloud deployments and AI/MCP integration. Built production platforms processing 80K+ orders at <200ms P95 latency with 99.9% uptime. Strong bias toward system design, end-to-end ownership, and pragmatic architecture. NIT Allahabad.

---

## Professional Experience

### Voltvave Innovations Pvt Ltd
**Founding Engineer** | Mar 2025 - Present | Bengaluru, Karnataka, India

#### Zoober

[zoober.in](https://zoober.in) | [Play Store](https://play.google.com/store/apps/details?id=com.voltvave.app) | [App Store](https://apps.apple.com/in/app/zoober-buy-book-delivery/id6742256589)

connects you with trusted local businesses for quick deliveries and hassle-free bookings

- Architected Zoober from scratch (0→1) — mobile apps (Play Store/App Store), production-grade servers and cloud infrastructure. Deployed on AWS (EC2, ALB, NGINX, CloudFront, WAF, S3, SES) achieving **99.9% uptime** across restaurant, salon, meat shop, grocery and fruit store segments near Gummanahalli and Kothanur, Bengaluru.

- Designed Monolithic Express.js server, REST API with **optimised MongoDB collections** using 2dsphere geospatial indexes(aggregation pipeline) for **<100ms** radius-based store discovery under concurrent load and built a **real-time WebSocket sync** layer broadcasting order/rider position updates with automatic reconnection.

- Architected **Multiple Flutter apps ecosystem** (Customer, Merchant, Rider, Admin, CRM, Notification Panel, etc) with BLoC state management, Adaptive + Responsive Server Driver UI and go_router deep linking across Android, iOS and Web. Windows/Web panels for handling high-level operations. Full release app cycles across the Play Store and App Store. 

#### Internal Tool: MCPVave
[mcpvave.voltvave.com](https://mcpvave.voltvave.com/public/index.html)

AI Engine — Cross-Platform(Mobile, Desktop and Web) MCP Client | Foundation for AI-Powered Commerce

- Built **Model Context Protocol (MCP) engine** enabling standardised AI/LLM-to-data communication via SSE/STDIO across **6 platforms** (Android, iOS, Windows, macOS, Linux, Web)

- Developed internal packages: **mcp_client** (protocol implementation) and **llm_shared** (unified LLM provider interface for Claude, GPT, Gemini etc)

- Powering AI capabilities: **intelligent inventory management**, reports, demand forecasting, automated customer support, and smart ordering etc. basically an internal tool for making zoober ai powdered.

  

---

### TingTing 
**Founding Engineer** | Aug 2022 - Mar 2025 | Bengaluru, Karnataka, India

[App Store](https://apps.apple.com/in/app/tingting-groceries-in-mins/id6464051281) | [Play Store](https://play.google.com/store/apps/details?id=com.tingtingnow.app)

Groceries Delivery in minutes 

**Stats:** 35+ Stores | 80K+ Orders | 30K+ Users | ₹1.5Cr+ GMV | 99.9% Uptime

- Architected Node.js express.js backend server processing a total of **80K+ orders** with **<200ms P95 latency**; and a **real-time WebSocket sync** layer broadcasting order/rider postion/crm message exchange/alerts and updates with automatic reconnection. Deployed **Cloud infrastructure** on AWS/GCP with CI/CD pipelines

- Build a **Multiple Flutter apps ecosystem** (TingTing, Store, Delivery, Admin, CRM, Notification Panel, Control Panel etc) across Android, iOS and Web. Windows (Admin)/Web (CRM and Control Panel) panels for handling high-level operations & smooth monitoring.

- Built Zoho Gofrugal ERP automated stock sync crons in Dart, deployed on GCP Cloud Run — syncing **35+ stores** × **12K+/store products** to keep physical inventory aligned with TingTing in real-time.
- Integrated Google Maps, Firebase (messaging, analytics, crashlytics), Facebook app events, deep links, MP2 ONDC (on-demand rider provider) and payment gateways (**Juspay, PhonePe, Razorpay, BillDesk**) with webhook signature verification and idempotent order handling.


---

### Workrush
**Software Engineer (Remote)** | Jun 2021 - Aug 2022

[workrush.co.uk](workrush.co.uk)

- Built consumer-facing Flutter apps (**Footbus, Livehappy and more**) with BLoC state management and shipped **15+ releases** across Play Store and App Store
- Developed backend systems (Node.js, PHP) and collaborated across time zones on API design, feature specifications, and production debugging

---

## Technical Skills

| Area | Skills |
|---|---|
| **Backend** | Node.js, Express, Microservices, REST APIs, WebSocket, Event-Driven |
| **Databases** | MongoDB, PostgreSQL, Redis, MongoDB, Query Optimisation |
| **Mobile** | Flutter, Dart, BLoC, iOS, Android, Cross-platform |
| **Infrastructure** | AWS (EC2, S3, CloudFront), GCP, OCI, Docker, NGINX, CI/CD, Linux |
| **Languages** | JavaScript, TypeScript, Dart, Python |
| **System Design** | Distributed Systems, High Availability, Real-Time Sync, Failure Handling |
| **AI/MCP** | Model Context Protocol, LLM Integration, SSE/STDIO, Claude, GPT, Gemini |
| **Tools** | Git, GitHub, Claude Code, GitHub Copilot |

---

## Selected Projects

### Tredye — Voltvave Product
[tredye.com](https://tredye.com)

**Real-Time Monitoring Dashboard | Event-Driven Microservices Architecture**

Stack: Python, FastAPI, Next.js 16, React 19, Kafka, PostgreSQL, Redis, Docker, OCI (Ampere A1)

- Architected **12-service event-driven system** with Kafka-based data pipeline (KRaft mode, Snappy compression) processing live market data from Kite WebSocket API through 4-stage flow (data-ingestion → candle-builder → rsi-calculator → divergence-detector) with **<50ms end-to-end latency**

- Implemented incremental RSI calculation using **Wilder's smoothing** (avoiding 300+ candle recalculation per tick) and **ZigZag peak/trough analysis** for price/RSI divergence detection with Redis pub/sub broadcasting alerts to WebSocket clients and PostgreSQL time-series persistence

- Built **multi-source news aggregation** (Livemint, Moneycontrol, Financial Express etc) with keyword tagging (**150+ terms**), sentiment analysis, and 5-minute Redis caching for real-time financial news delivery
- Developed responsive frontend with **Next.js 16 App Router**, React 19, TypeScript, Tailwind CSS v4, SWR caching, and embedded TradingView charts for live market visualisation

---

### Bhagavad Gita — Side Project
[Play Store](https://play.google.com/store/apps/details?id=com.gita) | [Web](https://bhagavad-gita-india.web.app/)

**Stats:** 40K+ Downloads | 2K DAU

**Offline-First Mobile App | Flutter + BLoC**

- Built cross-platform Flutter app with **offline-first architecture** using **Isolate-based multithreading** for background data processing without blocking UI

- Implemented **Hydrated BLoC with Hive persistence** for offline-first state management, enabling full app functionality without network connectivity

---

## Open Source

### flutter_lucide & flutter_lucide_animated — Featured
[pub.dev/flutter_lucide](https://pub.dev/packages/flutter_lucide) | [pub.dev/flutter_lucide_animated](https://pub.dev/packages/flutter_lucide_animated) | [lucide-animated.com](https://lucide-animated.com) | [pqoqubbw/icons (6.8K ★)](https://github.com/pqoqubbw/icons)

**Stats:** 6.8K Stars | 4K Weekly Downloads | 6 Platforms

**Flutter Icon Libraries | Static + Animated | lucide-animated Ecosystem**

- Published and maintaining two Flutter packages: **flutter_lucide** (1,666+ static icons) and **flutter_lucide_animated** (smooth Lottie-style animations) with tree-shaking optimization

- flutter_lucide_animated officially featured in **pqoqubbw/icons** — the lucide-animated ecosystem alongside Svelte, Vue, and Angular implementations

---

### gen-images — Open Source
[github.com/ravikovind/gen-images](https://github.com/ravikovind/gen-images)

**AI Image Generation Pipeline | E-commerce Product Visuals**

Stack: TypeScript, Node.js, OpenAI API, Google Gemini, Nano Banana

- Built automated pipeline using **OpenAI API** for runtime prompt generation and **Gemini Nano Banana model** for high-quality realistic image generation
- Designed for **e-commerce/website product showcase** generation with optimised prompts for professional product photography

---

## Education

**Bachelor of Technology** — National Institute of Technology, Allahabad
