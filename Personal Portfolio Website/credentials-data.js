/* =========================================================================
   CREDENTIAL WALLET — DATA
   =========================================================================

   This is the ONLY file you edit when you earn a new credential.
   credentials.html and credentials.js read from here and rebuild the whole
   page automatically: the counters, the category filters and their counts,
   the status filters, the search index, the timeline and the JSON-LD that
   Google reads. Nothing else needs to change.

   ---------------------------------------------------------------------
   HOW TO ADD A CREDENTIAL
   ---------------------------------------------------------------------
   Copy any entry below, paste it into the CREDENTIALS array and edit it.
   Order does not matter — the page sorts by date.

   FIELD REFERENCE
     id              Short slug, must be unique. Used for deep links.
     name            Credential name exactly as the issuer writes it.
     issuer          Organization that awarded it.
     issuerShort     Optional. Short label used on the card badge.
     categories      One or more of the KEYS in CATEGORIES below.
     credentialCategory
                     Optional. What the credential IS, for schema.org.
                     "degree" for a conferred university degree, otherwise
                     it defaults to "certificate".
     status          "lifetime"    never expires
                     "active"      current, has an expiration date
                     "in-progress" studying for it now
     issued          "YYYY-MM-DD". The award / earned date.
     coursePeriod    Optional. Human-readable study window, e.g. "Jun 8–9, 2026".
     expires         "YYYY-MM-DD" or null. Drives the EXPIRES badge.
     credentialId    The issuer's ID. Shown in mono, one-click copy.
     credentialNo    Optional second identifier (Microsoft prints two).
     verifyUrl       Issuer verification page. This is what recruiters click.
     verifyLabel     Optional. Button text, defaults to "Verify".
     certificate     Optional. Local PDF or image of the certificate.
     thumb           Card image. Use credentials/thumbs/… (small + fast).
     skills          Skills demonstrated. These become clickable filters.
     summary         One or two sentences. What this credential actually covers.
     credits         Optional, e.g. "10 CEUs" or "10 hours".
     featured        true pins the card to the top of the grid.

   NOTES
   • A credential can belong to several categories. The UT Austin cloud
     program is both "cloud" and "academic", and it appears under both.
   • Leaving expires as null makes the badge read LIFETIME.
   • For an "in-progress" entry, set issued to your target date and omit
     credentialId / verifyUrl. The card renders as a goal instead of a link.
   ========================================================================= */

/* Category taxonomy. Add a category here and its filter chip appears.
   Chips with zero credentials still render (dimmed, count 0) so the page
   shows the full career map — set SHOW_EMPTY_CATEGORIES to false to hide
   them instead. */
const CATEGORIES = {
  education: {
    label: "Degrees",
    full: "Formal Academic Education",
    blurb: "Degrees conferred by accredited, degree-granting universities."
  },
  cloud: {
    label: "Cloud",
    full: "Cloud &amp; Infrastructure",
    blurb: "Cloud architecture, platform services and infrastructure engineering."
  },
  aiml: {
    label: "AI/ML",
    full: "Artificial Intelligence &amp; Machine Learning",
    blurb: "Machine learning, deep learning, NLP and applied AI systems."
  },
  datasci: {
    label: "Data Science",
    full: "Data Science &amp; Data Analytics",
    blurb: "Applied data science, analytics and evidence-based decision making."
  },
  agentic: {
    label: "Agentic AI",
    full: "Agentic AI",
    blurb: "Autonomous and tool-using AI agents, and the platforms they run on."
  },
  cyber: {
    label: "Cybersecurity",
    full: "Cybersecurity",
    blurb: "Security, identity, networking and defensive operations."
  },
  software: {
    label: "Software",
    full: "Software &amp; Systems",
    blurb: "Software engineering, systems engineering and DevOps practice."
  },
  academic: {
    label: "Academic",
    full: "Academic &amp; Professional Certificates",
    blurb: "University-issued programs and professional certificate tracks."
  }
};

const SHOW_EMPTY_CATEGORIES = true;

const CREDENTIALS = [
  /* ---------------------------------------------------------------------
     NATIONAL UNIVERSITY — CONFERRED DEGREES
     --------------------------------------------------------------------- */
  {
    id: "nu-ms-computer-science",
    name: "Master of Science in Computer Science",
    issuer: "National University",
    issuerShort: "National University",
    categories: ["education", "software"],
    credentialCategory: "degree",
    status: "lifetime",
    issued: "2026-07-31",
    expires: null,
    /* The diploma carries no credential number printed on its face. The
       identifier below is the Parchment award ID from the verification link,
       which is what Parchment looks the record up by. */
    credentialId: "4cc065dd-e7f7-4874-aa10-ea082bf985a9",
    verifyUrl: "https://www.parchment.com/lp/award/4cc065dd-e7f7-4874-aa10-ea082bf985a9",
    verifyLabel: "Verify via Parchment",
    certificate: "credentials/Master_of_Science_in_Computer_Science.pdf",
    thumb: "credentials/thumbs/Master_of_Science_in_Computer_Science.jpg",
    skills: [
      "Computer Science", "Software Engineering", "Algorithms & Data Structures",
      "Systems Design", "Database Systems", "Applied Machine Learning"
    ],
    summary:
      "A graduate degree in computer science conferred by the Board of Trustees of National University, San Diego, California. Issued as a certified digital credential through Parchment, with the university's digital signature embedded in the diploma PDF.",
    featured: true
  },

  /* ---------------------------------------------------------------------
     MIT PROFESSIONAL EDUCATION
     --------------------------------------------------------------------- */
  {
    id: "mit-pcp-mlai",
    name: "Professional Certificate Program in Machine Learning & Artificial Intelligence",
    issuer: "MIT Professional Education",
    issuerShort: "MIT",
    categories: ["aiml", "academic"],
    status: "lifetime",
    issued: "2026-06-12",
    expires: null,
    credentialId: "d1a600c9-3751-4de4-ac28-6f4277c758f3",
    verifyUrl: "https://credentials.professional.mit.edu/d1a600c9-3751-4de4-ac28-6f4277c758f3#acc.C7Dkzo8Y",
    certificate: "credentials/MIT_Professional_Certificate_in_Machine_Learning_and_Artificial_Intelligence.pdf",
    thumb: "credentials/thumbs/MIT_Professional_Certificate_in_Machine_Learning_and_Artificial_Intelligence.jpg",
    skills: [
      "Machine Learning", "Deep Learning", "Natural Language Processing",
      "Reinforcement Learning", "AI Strategy", "Python", "Predictive Modeling"
    ],
    summary:
      "MIT Professional Education's umbrella certificate, awarded on completion of the required course track in machine learning and artificial intelligence. The individual MIT course credentials that count toward it are listed separately in this wallet.",
    featured: true
  },
  {
    id: "mit-ml-bigdata-advanced",
    name: "Machine Learning for Big Data and Text Processing: Advanced",
    issuer: "MIT Professional Education",
    issuerShort: "MIT",
    categories: ["aiml"],
    status: "lifetime",
    issued: "2026-06-12",
    coursePeriod: "June 10 – 12, 2026",
    expires: null,
    credentialId: "5ebc584e-b560-41e0-a750-e136a70bca7c",
    verifyUrl: "https://credentials.professional.mit.edu/5ebc584e-b560-41e0-a750-e136a70bca7c#acc.I52x0pDi",
    certificate: "credentials/MIT_Machine_Learning_for_Big_Data_and_Text_Processing_Advanced.pdf",
    thumb: "credentials/thumbs/MIT_Machine_Learning_for_Big_Data_and_Text_Processing_Advanced.jpg",
    credits: "1.9 CEUs",
    skills: [
      "Natural Language Processing", "Text Processing", "Large-Scale ML",
      "Language Models", "Feature Engineering", "Model Evaluation"
    ],
    summary:
      "Advanced methods for learning from large text corpora, directed by MIT faculty Regina Barzilay and Tommi Jaakkola. 19 contact hours."
  },
  {
    id: "mit-ml-bigdata-foundations",
    name: "Machine Learning for Big Data and Text Processing: Foundations",
    issuer: "MIT Professional Education",
    issuerShort: "MIT",
    categories: ["aiml"],
    status: "lifetime",
    issued: "2026-06-09",
    coursePeriod: "June 8 – 9, 2026",
    expires: null,
    credentialId: "e22f7876-2639-463e-b876-64eee3b32ed5",
    verifyUrl: "https://credentials.professional.mit.edu/e22f7876-2639-463e-b876-64eee3b32ed5#acc.YDEORQl2",
    certificate: "credentials/MIT_Machine_Learning_for_Big_Data_and_Text_Processing_Foundations.pdf",
    thumb: "credentials/thumbs/MIT_Machine_Learning_for_Big_Data_and_Text_Processing_Foundations.jpg",
    credits: "1.2 CEUs",
    skills: [
      "Supervised Learning", "Classification", "Regression",
      "Text Representation", "Big Data Pipelines", "Model Validation"
    ],
    summary:
      "Core statistical learning methods behind large-scale data and text systems, directed by MIT faculty Regina Barzilay and Tommi Jaakkola. 12 contact hours."
  },
  {
    id: "mit-advanced-rl",
    name: "Advanced Reinforcement Learning",
    issuer: "MIT Professional Education",
    issuerShort: "MIT",
    categories: ["aiml"],
    status: "lifetime",
    issued: "2025-08-01",
    coursePeriod: "July 31 – August 1, 2025",
    expires: null,
    credentialId: "f25e0107-ce72-4aaf-b8f7-f7cc4a6b9f0f",
    verifyUrl: "https://credentials.professional.mit.edu/f25e0107-ce72-4aaf-b8f7-f7cc4a6b9f0f#acc.CArzgZdv",
    certificate: "credentials/Advanced_Reinforcement_Learning.pdf",
    thumb: "credentials/thumbs/Advanced_Reinforcement_Learning.jpg",
    credits: "1.6 CEUs",
    skills: [
      "Reinforcement Learning", "Deep RL", "Markov Decision Processes",
      "Policy Optimization", "Reward Design", "Simulation"
    ],
    summary:
      "Sequential decision-making and policy learning for agents, directed by MIT faculty Cathy Wu and Pulkit Agrawal. 16 contact hours."
  },
  {
    id: "mit-applied-data-science",
    name: "Applied Data Science Program: Leveraging AI for Effective Decision Making",
    issuer: "MIT Professional Education",
    issuerShort: "MIT",
    categories: ["datasci", "aiml", "academic"],
    status: "lifetime",
    issued: "2025-03-09",
    coursePeriod: "November 16, 2024 – March 9, 2025",
    expires: null,
    credentialId: "4362e9a1-01ad-4a75-8e2a-d310f87235c8",
    verifyUrl: "https://credentials.professional.mit.edu/4362e9a1-01ad-4a75-8e2a-d310f87235c8#acc.JOgo6qRr",
    certificate: "credentials/MIT_Applied_Data_Science_Certification.pdf",
    thumb: "credentials/thumbs/MIT_Applied_Data_Science_Certification.jpg",
    credits: "16 CEUs",
    skills: [
      "Data Science", "Exploratory Data Analysis", "Predictive Modeling",
      "Recommendation Systems", "Data Visualization", "Python", "Decision Analytics"
    ],
    summary:
      "A four-month applied program building end-to-end data science workflows for business decision-making, directed by MIT faculty Munther Dahleh. 160 contact hours."
  },
  {
    id: "mit-ai-strategies-roadmap",
    name: "AI Strategies and Roadmap: Systems Engineering Approach to AI Development and Deployment",
    issuer: "MIT Professional Education",
    issuerShort: "MIT",
    categories: ["aiml", "software"],
    status: "lifetime",
    issued: "2025-03-21",
    coursePeriod: "March 17 – 21, 2025",
    expires: null,
    credentialId: "de3219de-ca52-4745-bcb1-baa2a0cef7dd",
    verifyUrl: "https://credentials.professional.mit.edu/de3219de-ca52-4745-bcb1-baa2a0cef7dd#acc.ZTIWkUqy",
    certificate: "credentials/Systems_Engineering_Approach_to_AI_Development_and_Deployment.pdf",
    thumb: "credentials/thumbs/Systems_Engineering_Approach_to_AI_Development_and_Deployment.jpg",
    credits: "3.4 CEUs",
    skills: [
      "AI Strategy", "Systems Engineering", "MLOps", "AI Roadmapping",
      "Requirements Analysis", "Deployment Architecture", "Risk Management"
    ],
    summary:
      "A systems-engineering framework for taking AI from concept to production, directed by MIT faculty David Martinez of MIT Lincoln Laboratory. 34 contact hours."
  },

  /* ---------------------------------------------------------------------
     MICROSOFT
     --------------------------------------------------------------------- */
  {
    id: "ms-az900",
    name: "Microsoft Certified: Azure Fundamentals (AZ-900)",
    issuer: "Microsoft",
    issuerShort: "Microsoft",
    categories: ["cloud"],
    status: "lifetime",
    issued: "2026-03-24",
    expires: null,
    credentialId: "C948F851227B89F3",
    credentialNo: "3ZCAE0-FF7655",
    verifyUrl: "https://learn.microsoft.com/en-us/users/esmeraldacelestecabreraventura-2644/credentials/c948f851227b89f3",
    verifyLabel: "Verify on Microsoft Learn",
    certificate: "credentials/Azure_Fundamentals_Certification.jpg",
    thumb: "credentials/thumbs/Azure_Fundamentals_Certification.jpg",
    skills: [
      "Azure Core Services", "Cloud Concepts", "Identity & Governance",
      "Azure Security", "Cost Management & SLAs", "Resource Management"
    ],
    summary:
      "Microsoft's foundational validation of Azure services, architecture, governance, security and cost models. Fundamentals certifications do not expire.",
    featured: true
  },
  {
    id: "ms-ai900",
    name: "Microsoft Certified: Azure AI Fundamentals (AI-900)",
    issuer: "Microsoft",
    issuerShort: "Microsoft",
    categories: ["cloud", "aiml"],
    status: "lifetime",
    issued: "2026-03-27",
    expires: null,
    credentialId: "15A73F69EA3D6AC9",
    credentialNo: "796482-CDA666",
    verifyUrl: "https://learn.microsoft.com/en-us/users/esmeraldacelestecabreraventura-2644/credentials/15a73f69ea3d6ac9",
    verifyLabel: "Verify on Microsoft Learn",
    certificate: "credentials/Azure_AI_Fundamentals_Certification.jpg",
    thumb: "credentials/thumbs/Azure_AI_Fundamentals_Certification.jpg",
    skills: [
      "Azure AI Services", "Azure Machine Learning", "Computer Vision",
      "Natural Language Processing", "Generative AI", "Responsible AI"
    ],
    summary:
      "Validates working knowledge of AI workloads on Azure, including machine learning, vision, language, generative AI and responsible AI principles.",
    featured: true
  },

  /* ---------------------------------------------------------------------
     UNIVERSITY OF TEXAS AT AUSTIN
     --------------------------------------------------------------------- */
  {
    id: "utaustin-pgp-cloud",
    name: "Post Graduate Program in Cloud Computing",
    issuer: "The University of Texas at Austin — McCombs School of Business",
    issuerShort: "UT Austin",
    categories: ["cloud", "academic"],
    status: "lifetime",
    issued: "2026-03-31",
    coursePeriod: "Awarded March 2026",
    expires: null,
    credentialId: "NpDwH",
    verifyUrl: "https://la.utexas.edu/texasexeced/digitalVerification.html?key=NpDwH",
    verifyLabel: "Verify with UT Austin",
    certificate: "credentials/Postgraduate_Certificate_in_Cloud_Computing.jpg",
    thumb: "credentials/thumbs/Postgraduate_Certificate_in_Cloud_Computing.jpg",
    credits: "10 CEUs",
    skills: [
      "AWS", "Azure", "Cloud Architecture", "Kubernetes", "Containers",
      "DevOps", "Cloud Security", "Infrastructure as Code", "Virtualization"
    ],
    summary:
      "A graduate-level cloud program through Texas Executive Education covering architecture, containers, DevOps and cloud security across AWS and Azure.",
    featured: true
  },

  /* ---------------------------------------------------------------------
     IBM
     --------------------------------------------------------------------- */
  {
    id: "ibm-ai-experiential-lab",
    name: "AI Experiential Learning Lab: Industry Immersion",
    issuer: "IBM SkillsBuild",
    issuerShort: "IBM",
    categories: ["agentic", "aiml", "software"],
    status: "lifetime",
    issued: "2026-06-30",
    expires: null,
    credentialId: "72711942-3743-4be3-82ca-13aa3731a824",
    verifyUrl: "https://www.credly.com/badges/72711942-3743-4be3-82ca-13aa3731a824/linked_in_profile",
    verifyLabel: "Verify on Credly",
    thumb: "credentials/thumbs/IBM_AI_Experiential_Learning_Lab.png",
    thumbFit: "contain",
    credits: "10 hours",
    skills: [
      "AI Agents", "IBM watsonx", "Enterprise AI Solutions",
      "Design Thinking", "Agile Planning"
    ],
    summary:
      "Applied IBM technologies and AI agent development against real industry use cases, with design thinking and agile planning alongside industry mentors."
  },

  /* ---------------------------------------------------------------------
     FORAGE JOB SIMULATIONS
     Employer-authored practical task sets. Each verification link opens the
     completion certificate Forage hosts, which carries the enrolment and
     user verification codes printed on the certificate itself.
     --------------------------------------------------------------------- */
  {
    id: "forage-aws-solutions-architecture",
    name: "AWS Solutions Architecture Job Simulation",
    issuer: "Forage",
    issuerShort: "AWS",
    categories: ["cloud"],
    status: "lifetime",
    issued: "2026-02-01",
    coursePeriod: "December 2025 \u2013 February 2026",
    expires: null,
    credentialId: "W3FK2JgDMqnKxpheg",
    credentialNo: "6916c1bb803d09e34cf874ef",
    verifyUrl: "https://www.theforage.com/completion-certificates/pmnMSL4QiQ9JCgE3W/kkE9HyeNcw6rwCRGw_pmnMSL4QiQ9JCgE3W_6916c1bb803d09e34cf874ef_1769938763072_completion_certificate.pdf",
    verifyLabel: "Verify on Forage",
    certificate: "credentials/AWS_Solutions_Architecture_Job_Simulation.png",
    thumb: "credentials/thumbs/AWS_Solutions_Architecture_Job_Simulation.jpg",
    skills: [
      "AWS Architecture", "Scalable Hosting Design", "Solution Design",
      "Cost Estimation", "Client Communication"
    ],
    summary:
      "An Amazon Web Services job simulation on Forage. Designed a simple, scalable hosting architecture against a client brief and presented the reasoning behind it."
  },
  {
    id: "forage-verizon-cloud-platform",
    name: "Verizon Cloud Platform Job Simulation",
    issuer: "Forage",
    issuerShort: "Verizon",
    categories: ["cloud"],
    status: "lifetime",
    issued: "2025-11-16",
    coursePeriod: "November 2025",
    expires: null,
    credentialId: "QAFwxcFWXY7NnwgpC",
    credentialNo: "6916c1bb803d09e34cf874ef",
    verifyUrl: "https://www.theforage.com/completion-certificates/uu47f3odrfruEWjKw/aNJGnRtgfiK5fQqcR_uu47f3odrfruEWjKw_6916c1bb803d09e34cf874ef_1763278199190_completion_certificate.pdf",
    verifyLabel: "Verify on Forage",
    certificate: "credentials/Verizon_Cloud_Platform_Job_Simulation.png",
    thumb: "credentials/thumbs/Verizon_Cloud_Platform_Job_Simulation.jpg",
    skills: [
      "Cloud-Native Applications", "Cloud Application Security",
      "Platform Engineering", "Solution Scoping"
    ],
    summary:
      "A Verizon job simulation on Forage, run with the New York Jobs CEO Council. Worked through cloud-native application characteristics and cloud-based application security against a live program scenario."
  }

  /* ---------------------------------------------------------------------
     IN PROGRESS — templates
     ---------------------------------------------------------------------
     Delete the block comment below to publish an in-progress goal. Edit the
     name, target date and skills first. In-progress cards show a dashed
     border and an IN PROGRESS badge, and they are excluded from the
     "verified credentials" counter until you add a verifyUrl.

  ,{
    id: "aws-saa",
    name: "AWS Certified Solutions Architect – Associate",
    issuer: "Amazon Web Services",
    issuerShort: "AWS",
    categories: ["cloud"],
    status: "in-progress",
    issued: "2026-12-01",          // target date
    expires: null,
    skills: ["AWS Architecture", "VPC Networking", "IAM", "High Availability"],
    summary: "Target: Q4 2026."
  },
  {
    id: "comptia-securityplus",
    name: "CompTIA Security+",
    issuer: "CompTIA",
    issuerShort: "CompTIA",
    categories: ["cyber"],
    status: "in-progress",
    issued: "2027-03-01",
    expires: null,
    skills: ["Threat Management", "Cryptography", "Identity & Access", "Risk"],
    summary: "Target: Q1 2027."
  }
  --------------------------------------------------------------------- */
];
